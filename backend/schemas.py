import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    admin = "admin"
    staff = "staff"
    faculty = "faculty"


class FeeStatus(str, Enum):
    paid = "Paid"
    installment = "Installment"
    deferred = "Deferred"


class BoarderStatus(str, Enum):
    boarder = "Boarder"
    non_boarder = "Non-Boarder"


# ── Auth ─────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict


# ── User ─────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.staff


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Student ───────────────────────────────────────────────────────────────────
class StudentCreate(BaseModel):
    ag_number: str
    cnic: str
    name: str
    father_name: str
    boarder_status: BoarderStatus
    semester: int
    department: Optional[str] = None
    program: Optional[str] = None

    @field_validator("ag_number")
    @classmethod
    def validate_ag_number(cls, v: str) -> str:
        if not re.match(r"^\d{4}-AG-\d+$", v):
            raise ValueError("AG number must be in format yyyy-AG-nnnn")
        return v


class StudentUpdate(BaseModel):
    cnic: Optional[str] = None
    name: Optional[str] = None
    father_name: Optional[str] = None
    boarder_status: Optional[BoarderStatus] = None
    semester: Optional[int] = None
    department: Optional[str] = None
    program: Optional[str] = None


class StudentResponse(BaseModel):
    id: int
    ag_number: str
    cnic: str
    name: str
    father_name: str
    boarder_status: BoarderStatus
    semester: int
    department: Optional[str]
    program: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── UG1 Form ──────────────────────────────────────────────────────────────────
class UG1FormCreate(BaseModel):
    student_id: int
    voucher_id: str
    fee_status: FeeStatus
    notes: Optional[str] = None


class UG1FormResponse(BaseModel):
    id: int
    student_id: int
    voucher_id: str
    fee_status: FeeStatus
    submission_date: datetime
    processed_by: int
    notes: Optional[str]
    student: StudentResponse
    processed_by_user: UserResponse

    model_config = {"from_attributes": True}


# ── Dashboard Stats ───────────────────────────────────────────────────────────
class DashboardStats(BaseModel):
    total_students: int
    total_forms: int
    paid_count: int
    installment_count: int
    deferred_count: int
    today_forms: int
