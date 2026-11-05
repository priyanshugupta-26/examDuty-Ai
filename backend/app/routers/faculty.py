from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from ..database import get_db
from ..models import User, Faculty, Unavailability, Allocation, ExamHall, Exam, Hall
from ..deps import require_admin
from ..auth import hash_password

router = APIRouter(prefix="/faculty", tags=["faculty"])


class FacultyCreate(BaseModel):
    faculty_code: str
    name: str
    department: str
    designation: str
    email: EmailStr
    phone: Optional[str] = None
    max_duties: int = 5
    past_duties: int = 0


class FacultyUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    max_duties: Optional[int] = None
    past_duties: Optional[int] = None


class UnavailabilityCreate(BaseModel):
    date: str
    session: str  # FN | AN | BOTH
    reason: Optional[str] = None


@router.get("")
def list_faculty(db: Session = Depends(get_db)):
    faculties = db.query(Faculty).all()
    result = []
    
    # Calculate allocated count
    alloc_counts = {}
    for a in db.query(Allocation).all():
        alloc_counts[a.faculty_id] = alloc_counts.get(a.faculty_id, 0) + 1

    for f in faculties:
        unavails = [
            {"id": u.id, "date": u.date, "session": u.session, "reason": u.reason}
            for u in f.unavailabilities
        ]
        result.append({
            "id": f.id,
            "faculty_code": f.faculty_code,
            "name": f.name,
            "department": f.department,
            "designation": f.designation,
            "email": f.email,
            "phone": f.phone,
            "max_duties": f.max_duties,
            "past_duties": f.past_duties,
            "assigned_duties": alloc_counts.get(f.id, 0),
            "unavailabilities": unavails,
            "is_active": f.user.is_active if f.user else True,
        })
    return result


@router.post("", status_code=status.HTTP_201_CREATED)
def create_faculty(data: FacultyCreate, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    # Check duplicate code or email
    if db.query(Faculty).filter(Faculty.faculty_code == data.faculty_code).first():
        raise HTTPException(status_code=400, detail="Faculty code already exists")
    if db.query(Faculty).filter(Faculty.email == data.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    faculty = Faculty(
        faculty_code=data.faculty_code.strip(),
        name=data.name.strip(),
        department=data.department.strip(),
        designation=data.designation.strip(),
        email=data.email.lower().strip(),
        phone=data.phone.strip() if data.phone else None,
        max_duties=data.max_duties,
        past_duties=data.past_duties,
    )
    db.add(faculty)
    db.flush()

    # Create associated user account
    user = User(
        email=faculty.email,
        password_hash=hash_password("faculty123"),
        role="faculty",
        faculty_id=faculty.id,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(faculty)
    return {"success": True, "id": faculty.id, "message": "Faculty profile and login created successfully."}


@router.put("/{faculty_id}")
def update_faculty(
    faculty_id: int,
    data: FacultyUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    if data.name is not None:
        faculty.name = data.name.strip()
    if data.department is not None:
        faculty.department = data.department.strip()
    if data.designation is not None:
        faculty.designation = data.designation.strip()
    if data.phone is not None:
        faculty.phone = data.phone.strip()
    if data.max_duties is not None:
        faculty.max_duties = data.max_duties
    if data.past_duties is not None:
        faculty.past_duties = data.past_duties

    db.commit()
    return {"success": True, "message": "Faculty details updated."}


@router.delete("/{faculty_id}")
def delete_faculty(faculty_id: int, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    # Cascade deletes unavailabilities, nullifies user link
    if faculty.user:
        db.delete(faculty.user)
    db.delete(faculty)
    db.commit()
    return {"success": True, "message": "Faculty member deleted."}


@router.post("/{faculty_id}/unavailability")
def add_unavailability(
    faculty_id: int,
    data: UnavailabilityCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    unavail = Unavailability(
        faculty_id=faculty.id,
        date=data.date,
        session=data.session.upper(),
        reason=data.reason,
    )
    db.add(unavail)
    db.commit()
    return {"success": True, "id": unavail.id, "message": f"Leave marked for {faculty.name} on {data.date} {data.session}."}


@router.delete("/unavailability/{unavail_id}")
def delete_unavailability(unavail_id: int, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.query(Unavailability).filter(Unavailability.id == unavail_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Unavailability record not found")
    db.delete(u)
    db.commit()
    return {"success": True, "message": "Leave record removed."}


@router.get("/{faculty_id}/duties")
def get_faculty_duties(faculty_id: int, db: Session = Depends(get_db)):
    allocations = (
        db.query(Allocation)
        .join(ExamHall)
        .join(Exam)
        .join(Hall)
        .filter(Allocation.faculty_id == faculty_id)
        .all()
    )
    return [
        {
            "id": a.id,
            "subject_name": a.exam_hall.exam.subject_name,
            "subject_code": a.exam_hall.exam.subject_code,
            "date": a.exam_hall.exam.date,
            "session": a.exam_hall.exam.session,
            "start_time": a.exam_hall.exam.start_time,
            "end_time": a.exam_hall.exam.end_time,
            "hall_name": a.exam_hall.hall.name,
            "hall_block": a.exam_hall.hall.block,
            "status": a.status,
            "is_locked": a.is_locked,
        }
        for a in allocations
    ]

