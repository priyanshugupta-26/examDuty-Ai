from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field

# ----------------- Auth & User Schemas -----------------
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class FacultyBrief(BaseModel):
    id: int
    faculty_code: str
    name: str
    department: str
    designation: str
    email: str
    phone: Optional[str] = None
    max_duties: int
    past_duties: int

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    faculty_id: Optional[int] = None
    is_active: bool
    faculty: Optional[FacultyBrief] = None

    class Config:
        from_attributes = True

# Resolve circular reference for Token
Token.model_rebuild()

# ----------------- Base Entity Schemas -----------------
class HallOut(BaseModel):
    id: int
    name: str
    block: str
    floor: int
    capacity: int
    is_active: bool

    class Config:
        from_attributes = True

class ExamOut(BaseModel):
    id: int
    date: str
    session: str
    start_time: str
    end_time: str
    subject_name: str
    subject_code: str
    branch: str
    year: int
    semester: int
    department_owner: str

    class Config:
        from_attributes = True

class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    body: str
    related_allocation_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SystemStats(BaseModel):
    total_faculty: int
    total_halls: int
    total_exams: int
    total_allocations: int
    is_sample_data: bool
    fairness_score: int = 100

# ----------------- Standard Error Schema -----------------
class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Any] = None

