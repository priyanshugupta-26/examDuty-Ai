import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models import User, Exam, Hall, ExamHall, Allocation
from ..deps import require_admin

router = APIRouter(prefix="/exams", tags=["exams"])


class ExamCreate(BaseModel):
    date: str  # YYYY-MM-DD
    session: str  # FN | AN
    start_time: str
    end_time: str
    subject_name: str
    subject_code: str
    branch: str
    year: int
    semester: int
    department_owner: str
    hall_id: int
    student_count: int


class ExamUpdate(BaseModel):
    date: Optional[str] = None
    session: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[int] = None
    semester: Optional[int] = None
    department_owner: Optional[str] = None
    hall_id: Optional[int] = None
    student_count: Optional[int] = None


@router.get("")
def list_exams(db: Session = Depends(get_db)):
    exams = db.query(Exam).order_by(Exam.date, Exam.session, Exam.subject_code).all()
    result = []

    for exam in exams:
        halls_info = []
        total_students = 0
        total_invigilators = 0

        for eh in exam.exam_halls:
            total_students += eh.student_count
            total_invigilators += eh.invigilators_required
            halls_info.append({
                "exam_hall_id": eh.id,
                "hall_id": eh.hall.id,
                "hall_name": eh.hall.name,
                "student_count": eh.student_count,
                "invigilators_required": eh.invigilators_required,
                "allocations_count": len(eh.allocations),
            })

        has_published = any(
            any(a.status == "published" for a in eh.allocations)
            for eh in exam.exam_halls
        )
        has_draft = any(
            any(a.status == "draft" for a in eh.allocations)
            for eh in exam.exam_halls
        )

        status_label = "Unassigned"
        if has_published:
            status_label = "Published"
        elif has_draft:
            status_label = "Draft"

        result.append({
            "id": exam.id,
            "date": exam.date,
            "session": exam.session,
            "start_time": exam.start_time,
            "end_time": exam.end_time,
            "subject_name": exam.subject_name,
            "subject_code": exam.subject_code,
            "branch": exam.branch,
            "year": exam.year,
            "semester": exam.semester,
            "department_owner": exam.department_owner,
            "halls": halls_info,
            "total_students": total_students,
            "invigilators_required": total_invigilators,
            "status": status_label,
        })

    return result


@router.post("", status_code=status.HTTP_201_CREATED)
def create_exam(data: ExamCreate, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    hall = db.query(Hall).filter(Hall.id == data.hall_id).first()
    if not hall:
        raise HTTPException(status_code=404, detail="Selected hall not found")

    exam = Exam(
        date=data.date,
        session=data.session.upper(),
        start_time=data.start_time,
        end_time=data.end_time,
        subject_name=data.subject_name.strip(),
        subject_code=data.subject_code.strip().upper(),
        branch=data.branch.strip(),
        year=data.year,
        semester=data.semester,
        department_owner=data.department_owner.strip(),
    )
    db.add(exam)
    db.flush()

    inv_req = max(1, math.ceil(data.student_count / 30))
    eh = ExamHall(
        exam_id=exam.id,
        hall_id=hall.id,
        student_count=data.student_count,
        invigilators_required=inv_req,
    )
    db.add(eh)
    db.commit()

    return {"success": True, "id": exam.id, "message": f"Exam {exam.subject_code} created and mapped to {hall.name}."}


@router.put("/{exam_id}")
def update_exam(exam_id: int, data: ExamUpdate, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if data.date is not None:
        exam.date = data.date
    if data.session is not None:
        exam.session = data.session.upper()
    if data.start_time is not None:
        exam.start_time = data.start_time
    if data.end_time is not None:
        exam.end_time = data.end_time
    if data.subject_name is not None:
        exam.subject_name = data.subject_name.strip()
    if data.subject_code is not None:
        exam.subject_code = data.subject_code.strip().upper()
    if data.branch is not None:
        exam.branch = data.branch.strip()
    if data.year is not None:
        exam.year = data.year
    if data.semester is not None:
        exam.semester = data.semester
    if data.department_owner is not None:
        exam.department_owner = data.department_owner.strip()

    # Update hall mapping if provided
    if data.hall_id is not None or data.student_count is not None:
        first_eh = exam.exam_halls[0] if exam.exam_halls else None
        if first_eh:
            if data.hall_id is not None:
                first_eh.hall_id = data.hall_id
            if data.student_count is not None:
                first_eh.student_count = data.student_count
                first_eh.invigilators_required = max(1, math.ceil(data.student_count / 30))

    db.commit()
    return {"success": True, "message": "Exam timetable session updated."}


@router.delete("/{exam_id}")
def delete_exam(exam_id: int, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    db.delete(exam)
    db.commit()
    return {"success": True, "message": "Exam session deleted."}

