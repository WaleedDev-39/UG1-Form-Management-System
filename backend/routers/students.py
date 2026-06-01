import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from utils.auth_utils import get_current_user, require_staff_or_admin
from utils.barcode_utils import generate_barcode_b64, decode_barcode_image

router = APIRouter(prefix="/api/students", tags=["Students"])


@router.get("/", response_model=List[schemas.StudentResponse])
def list_students(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    q = db.query(models.Student)
    if search:
        like = f"%{search}%"
        q = q.filter(
            models.Student.name.ilike(like)
            | models.Student.ag_number.ilike(like)
            | models.Student.cnic.ilike(like)
        )
    return q.offset(skip).limit(limit).all()


@router.get("/{ag_number}/lookup", response_model=schemas.StudentResponse)
def lookup_by_ag(
    ag_number: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Used by the form-processing page to fetch a student by scanned barcode or manual AG entry."""
    student = db.query(models.Student).filter(models.Student.ag_number == ag_number).first()
    if not student:
        raise HTTPException(404, f"No student found with AG number: {ag_number}")
    return student


@router.post("/", response_model=schemas.StudentResponse, status_code=201)
def create_student(
    payload: schemas.StudentCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff_or_admin),
):
    if db.query(models.Student).filter(models.Student.ag_number == payload.ag_number).first():
        raise HTTPException(400, "AG number already registered")
    if db.query(models.Student).filter(models.Student.cnic == payload.cnic).first():
        raise HTTPException(400, "CNIC already registered")

    student = models.Student(**payload.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.put("/{student_id}", response_model=schemas.StudentResponse)
def update_student(
    student_id: int,
    payload: schemas.StudentUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff_or_admin),
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}", status_code=204)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff_or_admin),
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    db.delete(student)
    db.commit()


@router.get("/{student_id}/barcode")
def get_barcode(
    student_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    student_data = {
        "ag_number": student.ag_number,
        "name": student.name,
        "father_name": student.father_name,
        "cnic": student.cnic,
        "semester": student.semester,
        "boarder_status": student.boarder_status.value if hasattr(student.boarder_status, 'value') else student.boarder_status,
        "department": student.department,
        "program": student.program
    }
    return {"barcode": generate_barcode_b64(student_data), "ag_number": student.ag_number}


@router.post("/decode-barcode")
async def decode_barcode(
    file: UploadFile = File(...),
    _: models.User = Depends(get_current_user),
):
    """Upload a barcode image → returns the decoded AG number."""
    contents = await file.read()
    try:
        ag_number = decode_barcode_image(contents)
        return {"ag_number": ag_number}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/import-excel")
async def import_students_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff_or_admin),
):
    """
    Import students from an Excel/CSV file.
    Expected columns (case-insensitive):
      ag_number, cnic, name, father_name, boarder_status, semester, department, program
    """
    import pandas as pd

    contents = await file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception:
        raise HTTPException(400, "Invalid file format. Please upload .xlsx or .csv")

    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    required = {"ag_number", "cnic", "name", "father_name", "boarder_status", "semester"}
    missing = required - set(df.columns)
    if missing:
        raise HTTPException(400, f"Missing columns: {', '.join(missing)}")

    added, skipped = 0, 0
    for _, row in df.iterrows():
        ag = str(row["ag_number"]).strip()
        cnic = str(row["cnic"]).strip()
        if (
            db.query(models.Student).filter(models.Student.ag_number == ag).first()
            or db.query(models.Student).filter(models.Student.cnic == cnic).first()
        ):
            skipped += 1
            continue
        try:
            bs_raw = str(row["boarder_status"]).strip()
            boarder = models.BoarderStatus.boarder if bs_raw.lower() in ("boarder", "yes", "true", "1") else models.BoarderStatus.non_boarder
            student = models.Student(
                ag_number=ag,
                cnic=cnic,
                name=str(row["name"]).strip(),
                father_name=str(row["father_name"]).strip(),
                boarder_status=boarder,
                semester=int(row["semester"]),
                department=str(row.get("department", "")).strip() or None,
                program=str(row.get("program", "")).strip() or None,
            )
            db.add(student)
            added += 1
        except Exception:
            skipped += 1

    db.commit()
    return {"added": added, "skipped": skipped, "total_rows": len(df)}
