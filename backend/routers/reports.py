from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
import io

from database import get_db
import models, schemas
from utils.auth_utils import get_current_user
from utils.excel_utils import generate_ug1_report

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def _build_query(db: Session, date_from: Optional[date], date_to: Optional[date], fee_status: Optional[str]):
    q = db.query(models.UG1Form).join(models.Student).join(
        models.User, models.UG1Form.processed_by == models.User.id
    )
    if fee_status:
        q = q.filter(models.UG1Form.fee_status == fee_status)
    if date_from:
        q = q.filter(func.date(models.UG1Form.submission_date) >= date_from)
    if date_to:
        q = q.filter(func.date(models.UG1Form.submission_date) <= date_to)
    return q


@router.get("/dashboard", response_model=schemas.DashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    total_students = db.query(models.Student).count()
    total_forms = db.query(models.UG1Form).count()
    paid = db.query(models.UG1Form).filter(models.UG1Form.fee_status == "Paid").count()
    installment = db.query(models.UG1Form).filter(models.UG1Form.fee_status == "Installment").count()
    deferred = db.query(models.UG1Form).filter(models.UG1Form.fee_status == "Deferred").count()
    today = db.query(models.UG1Form).filter(
        func.date(models.UG1Form.submission_date) == date.today()
    ).count()
    return schemas.DashboardStats(
        total_students=total_students,
        total_forms=total_forms,
        paid_count=paid,
        installment_count=installment,
        deferred_count=deferred,
        today_forms=today,
    )


@router.get("/export")
def export_excel(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    fee_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    forms = _build_query(db, date_from, date_to, fee_status).order_by(
        models.UG1Form.submission_date.desc()
    ).all()

    data = [
        {
            "ag_number": f.student.ag_number,
            "student_name": f.student.name,
            "father_name": f.student.father_name,
            "cnic": f.student.cnic,
            "boarder_status": f.student.boarder_status.value,
            "semester": f.student.semester,
            "voucher_id": f.voucher_id,
            "fee_status": f.fee_status.value,
            "submission_date": f.submission_date.strftime("%Y-%m-%d %H:%M") if f.submission_date else "",
            "processed_by": f.processed_by_user.full_name,
            "notes": f.notes or "",
        }
        for f in forms
    ]

    excel_bytes = generate_ug1_report(data)
    filename = f"UG1_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
