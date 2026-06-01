import enum
from sqlalchemy import Column, Integer, String, Enum, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    staff = "staff"
    faculty = "faculty"


class FeeStatus(str, enum.Enum):
    paid = "Paid"
    installment = "Installment"
    deferred = "Deferred"


class BoarderStatus(str, enum.Enum):
    boarder = "Boarder"
    non_boarder = "Non-Boarder"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.staff)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    forms_processed = relationship("UG1Form", back_populates="processed_by_user")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    ag_number = Column(String(20), unique=True, nullable=False, index=True)
    cnic = Column(String(15), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    father_name = Column(String(100), nullable=False)
    boarder_status = Column(Enum(BoarderStatus), nullable=False)
    semester = Column(Integer, nullable=False)
    department = Column(String(100), nullable=True)
    program = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    forms = relationship("UG1Form", back_populates="student")


class UG1Form(Base):
    __tablename__ = "ug1_forms"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    voucher_id = Column(String(50), nullable=False)
    fee_status = Column(Enum(FeeStatus), nullable=False)
    submission_date = Column(DateTime, server_default=func.now())
    processed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    notes = Column(Text, nullable=True)

    student = relationship("Student", back_populates="forms")
    processed_by_user = relationship("User", back_populates="forms_processed")
