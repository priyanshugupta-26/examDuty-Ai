import json
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import User, Faculty, Allocation, ExamHall, Exam, Hall, Setting
from ..deps import get_current_user
from ..services.pdf_service import generate_duty_letter_pdf

router = APIRouter(prefix="", tags=["faculty_portal"])


@router.get("/faculty-portal/me/duties")
def get_my_duties(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    faculty = current_user.faculty
    if not faculty:
        # If admin without faculty profile, take first faculty for preview
        faculty = db.query(Faculty).first()
        if not faculty:
            return {"duties": [], "next_duty": None, "total": 0, "upcoming": 0, "past": 0}

    allocations = (
        db.query(Allocation)
        .join(ExamHall, Allocation.exam_hall_id == ExamHall.id)
        .join(Exam, ExamHall.exam_id == Exam.id)
        .join(Hall, ExamHall.hall_id == Hall.id)
        .filter(Allocation.faculty_id == faculty.id)
        .order_by(Exam.date, Exam.session)
        .all()
    )

    duties_list = []
    today_str = date.today().isoformat()
    upcoming_count = 0
    past_count = 0

    for a in allocations:
        exam = a.exam_hall.exam
        hall = a.exam_hall.hall
        is_past = exam.date < today_str
        if is_past:
            past_count += 1
        else:
            upcoming_count += 1

        duties_list.append({
            "id": a.id,
            "exam_hall_id": a.exam_hall_id,
            "date": exam.date,
            "session": exam.session,
            "start_time": exam.start_time,
            "end_time": exam.end_time,
            "subject_name": exam.subject_name,
            "subject_code": exam.subject_code,
            "branch": exam.branch,
            "year": exam.year,
            "semester": exam.semester,
            "hall_name": hall.name,
            "hall_block": hall.block,
            "hall_floor": hall.floor,
            "student_count": a.exam_hall.student_count,
            "status": a.status,
            "is_locked": a.is_locked,
            "is_past": is_past,
        })

    # Identify next upcoming duty
    upcoming_duties = [d for d in duties_list if not d["is_past"]]
    next_duty = upcoming_duties[0] if upcoming_duties else (duties_list[0] if duties_list else None)

    return {
        "faculty": {
            "id": faculty.id,
            "name": faculty.name,
            "faculty_code": faculty.faculty_code,
            "department": faculty.department,
            "designation": faculty.designation,
            "email": faculty.email,
            "max_duties": faculty.max_duties,
            "past_duties": faculty.past_duties,
        },
        "duties": duties_list,
        "next_duty": next_duty,
        "total": len(duties_list),
        "upcoming": upcoming_count,
        "past": past_count,
    }


@router.get("/faculty-portal/me/duty-letter")
def download_my_duty_letter(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    faculty = current_user.faculty
    if not faculty:
        faculty = db.query(Faculty).first()
        if not faculty:
            raise HTTPException(status_code=404, detail="Faculty profile not found")

    allocations = (
        db.query(Allocation)
        .join(ExamHall, Allocation.exam_hall_id == ExamHall.id)
        .join(Exam, ExamHall.exam_id == Exam.id)
        .join(Hall, ExamHall.hall_id == Hall.id)
        .filter(Allocation.faculty_id == faculty.id)
        .order_by(Exam.date, Exam.session)
        .all()
    )

    duties_data = [
        {
            "subject_name": a.exam_hall.exam.subject_name,
            "subject_code": a.exam_hall.exam.subject_code,
            "date": a.exam_hall.exam.date,
            "session": a.exam_hall.exam.session,
            "start_time": a.exam_hall.exam.start_time,
            "end_time": a.exam_hall.exam.end_time,
            "hall_name": a.exam_hall.hall.name,
            "hall_block": f"{a.exam_hall.hall.block}, Floor {a.exam_hall.hall.floor}",
            "student_count": a.exam_hall.student_count,
        }
        for a in allocations
    ]

    pdf_buffer = generate_duty_letter_pdf(faculty, duties_data)
    filename = f"VFSTR_Duty_Order_{faculty.faculty_code}.pdf"

    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/faculty-portal/{faculty_id}/duty-letter")
def download_faculty_duty_letter(
    faculty_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    allocations = (
        db.query(Allocation)
        .join(ExamHall, Allocation.exam_hall_id == ExamHall.id)
        .join(Exam, ExamHall.exam_id == Exam.id)
        .join(Hall, ExamHall.hall_id == Hall.id)
        .filter(Allocation.faculty_id == faculty.id)
        .order_by(Exam.date, Exam.session)
        .all()
    )

    duties_data = [
        {
            "subject_name": a.exam_hall.exam.subject_name,
            "subject_code": a.exam_hall.exam.subject_code,
            "date": a.exam_hall.exam.date,
            "session": a.exam_hall.exam.session,
            "start_time": a.exam_hall.exam.start_time,
            "end_time": a.exam_hall.exam.end_time,
            "hall_name": a.exam_hall.hall.name,
            "hall_block": f"{a.exam_hall.hall.block}, Floor {a.exam_hall.hall.floor}",
            "student_count": a.exam_hall.student_count,
        }
        for a in allocations
    ]

    pdf_buffer = generate_duty_letter_pdf(faculty, duties_data)
    filename = f"VFSTR_Duty_Order_{faculty.faculty_code}.pdf"

    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/instructions")
def get_exam_instructions(db: Session = Depends(get_db)):
    setting = db.query(Setting).filter(Setting.key == "instructions").first()
    if setting:
        try:
            return json.loads(setting.value_json)
        except Exception:
            pass

    return {
        "before_exam": "Report to the Exam Cell Control Room 30 minutes prior to session start. Collect answer booklets, question papers, and student attendance sheets in person.",
        "during_exam": "Verify student ID cards, hall tickets, and ensure no unauthorized electronic devices, smart watches, or chits are present in the examination hall.",
        "malpractice": "Immediately seize unauthorized material, mark the answer script in red ink, record student details on the Malpractice Form and alert the Chief Superintendent.",
        "after_exam": "Count all answer booklets, verify sequential arrangement against the attendance sheet, bundle and seal in tamper-evident envelopes, and submit to the Control Room.",
        "emergency_contacts": "Exam Cell Helpline: +91 863 2344700 | Chief Controller: Ext 101 | Chief Superintendent: Ext 102",
    }

