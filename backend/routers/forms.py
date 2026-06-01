from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date

from database import get_db
import models, schemas
from utils.auth_utils import get_current_user, require_staff_or_admin

router = APIRouter(prefix="/api/forms", tags=["Forms"])


@router.get("/", response_model=List[schemas.UG1FormResponse])
def list_forms(
    skip: int = 0,
    limit: int = 100,
    fee_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    q = db.query(models.UG1Form).join(models.Student).join(
        models.User, models.UG1Form.processed_by == models.User.id
    )
    if fee_status:
        q = q.filter(models.UG1Form.fee_status == fee_status)
    return q.order_by(models.UG1Form.submission_date.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.UG1FormResponse, status_code=201)
def submit_form(
    payload: schemas.UG1FormCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_staff_or_admin),
):
    student = db.query(models.Student).filter(models.Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    form = models.UG1Form(
        student_id=payload.student_id,
        voucher_id=payload.voucher_id,
        fee_status=payload.fee_status,
        processed_by=current_user.id,
        notes=payload.notes,
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return form


@router.get("/{form_id}", response_model=schemas.UG1FormResponse)
def get_form(
    form_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    form = db.query(models.UG1Form).filter(models.UG1Form.id == form_id).first()
    if not form:
        raise HTTPException(404, "Form not found")
    return form


@router.delete("/{form_id}", status_code=204)
def delete_form(
    form_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff_or_admin),
):
    form = db.query(models.UG1Form).filter(models.UG1Form.id == form_id).first()
    if not form:
        raise HTTPException(404, "Form not found")
    db.delete(form)
    db.commit()
