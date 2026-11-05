from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from .database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="faculty")  # "admin" | "faculty"
    faculty_id = Column(Integer, ForeignKey("faculties.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    faculty = relationship("Faculty", back_populates="user")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="actor_user")


class Faculty(Base):
    __tablename__ = "faculties"

    id = Column(Integer, primary_key=True, index=True)
    faculty_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    department = Column(String(100), nullable=False, index=True)
    designation = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    max_duties = Column(Integer, default=5, nullable=False)
    past_duties = Column(Integer, default=0, nullable=False)

    user = relationship("User", back_populates="faculty", uselist=False)
    unavailabilities = relationship("Unavailability", back_populates="faculty", cascade="all, delete-orphan")
    allocations = relationship("Allocation", back_populates="faculty")
    swap_requests_received = relationship("SwapRequest", back_populates="to_faculty", foreign_keys="SwapRequest.to_faculty_id")


class Hall(Base):
    __tablename__ = "halls"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    block = Column(String(50), nullable=False)
    floor = Column(Integer, default=1, nullable=False)
    capacity = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    exam_halls = relationship("ExamHall", back_populates="hall", cascade="all, delete-orphan")


class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(20), nullable=False, index=True)  # YYYY-MM-DD
    session = Column(String(10), nullable=False, index=True)  # FN | AN
    start_time = Column(String(10), nullable=False)  # e.g., "09:30 AM"
    end_time = Column(String(10), nullable=False)  # e.g., "12:30 PM"
    subject_name = Column(String(255), nullable=False)
    subject_code = Column(String(50), nullable=False, index=True)
    branch = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    semester = Column(Integer, nullable=False)
    department_owner = Column(String(100), nullable=False, index=True)

    exam_halls = relationship("ExamHall", back_populates="exam", cascade="all, delete-orphan")


class ExamHall(Base):
    __tablename__ = "exam_halls"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    hall_id = Column(Integer, ForeignKey("halls.id", ondelete="CASCADE"), nullable=False, index=True)
    student_count = Column(Integer, nullable=False)
    invigilators_required = Column(Integer, nullable=False, default=1)

    exam = relationship("Exam", back_populates="exam_halls")
    hall = relationship("Hall", back_populates="exam_halls")
    allocations = relationship("Allocation", back_populates="exam_hall", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("exam_id", "hall_id", name="uq_exam_hall"),
    )


class Unavailability(Base):
    __tablename__ = "unavailabilities"

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculties.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(20), nullable=False, index=True)
    session = Column(String(10), nullable=False)  # FN | AN | BOTH
    reason = Column(String(255), nullable=True)

    faculty = relationship("Faculty", back_populates="unavailabilities")

    __table_args__ = (
        Index("ix_unavail_faculty_date", "faculty_id", "date"),
    )


class Allocation(Base):
    __tablename__ = "allocations"

    id = Column(Integer, primary_key=True, index=True)
    exam_hall_id = Column(Integer, ForeignKey("exam_halls.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id = Column(Integer, ForeignKey("faculties.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="draft", nullable=False)  # draft | published | swapped
    is_locked = Column(Boolean, default=False, nullable=False)
    created_by = Column(String(50), default="solver", nullable=False)  # solver | admin | agent
    created_at = Column(DateTime, default=utc_now, nullable=False)

    exam_hall = relationship("ExamHall", back_populates="allocations")
    faculty = relationship("Faculty", back_populates="allocations")
    swap_requests = relationship("SwapRequest", back_populates="from_allocation", foreign_keys="SwapRequest.from_allocation_id", cascade="all, delete-orphan")


class SwapRequest(Base):
    __tablename__ = "swap_requests"

    id = Column(Integer, primary_key=True, index=True)
    from_allocation_id = Column(Integer, ForeignKey("allocations.id", ondelete="CASCADE"), nullable=False, index=True)
    to_faculty_id = Column(Integer, ForeignKey("faculties.id", ondelete="SET NULL"), nullable=True, index=True)
    reason = Column(String(500), nullable=False)
    status = Column(String(20), default="pending", nullable=False)  # pending | approved | rejected
    validation_message = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    from_allocation = relationship("Allocation", back_populates="swap_requests", foreign_keys=[from_allocation_id])
    to_faculty = relationship("Faculty", back_populates="swap_requests_received", foreign_keys=[to_faculty_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # assigned | changed | swapped | reminder | system
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    related_allocation_id = Column(Integer, ForeignKey("allocations.id", ondelete="SET NULL"), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    user = relationship("User", back_populates="notifications")
    related_allocation = relationship("Allocation")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    actor_user = relationship("User", back_populates="audit_logs")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True, index=True)
    value_json = Column(Text, nullable=False)
