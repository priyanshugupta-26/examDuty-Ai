import math
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import (
    User, Faculty, Hall, Exam, ExamHall, Unavailability, Allocation, Setting, AuditLog, Notification
)
from ..deps import require_admin
from ..services.email_service import send_duty_allocation_email
from ..solver import (
    FacultyInput,
    SlotInput,
    UnavailabilityInput,
    SolverSettings,
    SolverResult,
    run_cp_sat_solver,
    reallocate_minimal,
    calculate_fairness_score,
    compute_allocation_fairness,
)
from pydantic import BaseModel

router = APIRouter(prefix="/allocation", tags=["allocation"])


class SolveRequest(BaseModel):
    students_per_invigilator: int = 30
    avoid_own_department: bool = True
    avoid_back_to_back: bool = True
    fairness_weight: float = 0.5
    keep_locked: bool = True


class ManualSwapRequest(BaseModel):
    allocation_id: int
    target_faculty_id: int


class LockRequest(BaseModel):
    allocation_id: int
    is_locked: bool


@router.get("")
def get_allocations(db: Session = Depends(get_db)):
    """Fetch all allocations with exam, hall, and faculty details."""
    allocations = (
        db.query(Allocation)
        .join(ExamHall, Allocation.exam_hall_id == ExamHall.id)
        .join(Exam, ExamHall.exam_id == Exam.id)
        .join(Hall, ExamHall.hall_id == Hall.id)
        .join(Faculty, Allocation.faculty_id == Faculty.id)
        .all()
    )

    result = []
    for a in allocations:
        eh = a.exam_hall
        exam = eh.exam
        hall = eh.hall
        fac = a.faculty
        result.append({
            "id": a.id,
            "exam_hall_id": eh.id,
            "exam_id": exam.id,
            "hall_id": hall.id,
            "faculty_id": fac.id,
            "faculty_name": fac.name,
            "faculty_code": fac.faculty_code,
            "faculty_dept": fac.department,
            "subject_name": exam.subject_name,
            "subject_code": exam.subject_code,
            "department_owner": exam.department_owner,
            "date": exam.date,
            "session": exam.session,
            "start_time": exam.start_time,
            "end_time": exam.end_time,
            "hall_name": hall.name,
            "hall_block": hall.block,
            "student_count": eh.student_count,
            "status": a.status,
            "is_locked": a.is_locked,
            "created_by": a.created_by,
        })

    is_published = any(a.status == "published" for a in allocations) if allocations else False

    # Calculate live fairness score using canonical shared function
    fairness_data = compute_allocation_fairness(db)
    fairness = fairness_data["fairness_score"] if allocations else 100

    return {
        "allocations": result,
        "is_published": is_published,
        "total_allocations": len(result),
        "fairness_score": fairness,
    }


@router.post("/solve")
def run_auto_allocation(
    req: SolveRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Executes OR-Tools CP-SAT auto-allocation and saves draft assignments."""
    # 1. Fetch faculties, halls, exams, exam_halls, unavailabilities
    faculties = db.query(Faculty).all()
    exam_halls = db.query(ExamHall).join(Exam).join(Hall).all()
    unavailabilities = db.query(Unavailability).all()

    # Map previous allocations for locked status / minimal change
    existing_allocations = db.query(Allocation).all()
    existing_map: Dict[Tuple[int, int], Allocation] = {}
    
    # Group existing allocations by exam_hall_id
    eh_alloc_map: Dict[int, List[Allocation]] = {}
    for a in existing_allocations:
        eh_alloc_map.setdefault(a.exam_hall_id, []).append(a)

    faculty_inputs = [
        FacultyInput(
            id=f.id,
            name=f.name,
            department=f.department,
            max_duties=f.max_duties,
            past_duties=f.past_duties,
            faculty_code=f.faculty_code,
        )
        for f in faculties
    ]

    unavail_inputs = [
        UnavailabilityInput(
            faculty_id=u.faculty_id,
            date=u.date,
            session=u.session,
            reason=u.reason,
        )
        for u in unavailabilities
    ]

    # Generate slots based on required invigilators per hall
    slots: List[SlotInput] = []
    for eh in exam_halls:
        exam = eh.exam
        needed = max(1, math.ceil(eh.student_count / req.students_per_invigilator))
        eh_previous = eh_alloc_map.get(eh.id, [])

        for pos in range(needed):
            slot_id = f"eh_{eh.id}_p_{pos}"
            prev_alloc = eh_previous[pos] if pos < len(eh_previous) else None
            
            is_locked = False
            locked_f_id = None
            prev_f_id = None

            if prev_alloc:
                prev_f_id = prev_alloc.faculty_id
                if req.keep_locked and prev_alloc.is_locked:
                    is_locked = True
                    locked_f_id = prev_alloc.faculty_id

            slots.append(
                SlotInput(
                    slot_id=slot_id,
                    exam_hall_id=eh.id,
                    exam_id=exam.id,
                    hall_id=eh.hall_id,
                    date=exam.date,
                    session=exam.session,
                    department_owner=exam.department_owner,
                    position=pos,
                    is_locked=is_locked,
                    locked_faculty_id=locked_f_id,
                    previous_faculty_id=prev_f_id,
                )
            )

    settings = SolverSettings(
        students_per_invigilator=req.students_per_invigilator,
        avoid_own_department=req.avoid_own_department,
        avoid_back_to_back=req.avoid_back_to_back,
        fairness_weight=req.fairness_weight,
    )

    solver_result = run_cp_sat_solver(
        faculty_list=faculty_inputs,
        slots=slots,
        unavailabilities=unavail_inputs,
        settings=settings,
    )

    if not solver_result.is_feasible:
        return {
            "success": False,
            "status": solver_result.status,
            "execution_time_ms": solver_result.execution_time_ms,
            "reasons": solver_result.reasons,
            "unfilled_slots": solver_result.unfilled_slots,
            "message": "Allocation infeasible. Check conflict reasons."
        }

    # If feasible, clear previous non-locked draft allocations and persist new ones
    if not req.keep_locked:
        db.query(Allocation).delete()
    else:
        # Delete only unlocked allocations
        db.query(Allocation).filter(Allocation.is_locked == False).delete()
    
    db.flush()

    for alloc in solver_result.allocations:
        # Check if already exists as locked
        existing = db.query(Allocation).filter(
            Allocation.exam_hall_id == alloc.exam_hall_id,
            Allocation.faculty_id == alloc.faculty_id,
            Allocation.is_locked == True
        ).first()

        if not existing:
            new_alloc = Allocation(
                exam_hall_id=alloc.exam_hall_id,
                faculty_id=alloc.faculty_id,
                status="draft",
                is_locked=alloc.is_locked,
                created_by="solver",
            )
            db.add(new_alloc)

    # Log to AuditLog
    audit = AuditLog(
        actor_user_id=admin_user.id,
        action="RUN_AUTO_ALLOCATION",
        details_json=json.dumps({
            "status": solver_result.status,
            "slots_filled": len(solver_result.allocations),
            "fairness_score": solver_result.fairness_score,
            "time_ms": solver_result.execution_time_ms,
            "settings": req.model_dump(),
        })
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "status": solver_result.status,
        "slots_filled": len(solver_result.allocations),
        "fairness_score": solver_result.fairness_score,
        "execution_time_ms": solver_result.execution_time_ms,
        "message": f"Successfully allocated {len(solver_result.allocations)} invigilation duties with zero hard conflicts."
    }


@router.post("/publish")
def publish_allocations(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Publishes draft allocations and notifies all assigned faculty."""
    allocations = db.query(Allocation).all()
    if not allocations:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "NoAllocations", "message": "No allocations exist to publish.", "details": None}
        )

    # Verify 0 hard conflicts before publishing
    # 1. Check overlap
    session_map = {}
    for a in allocations:
        eh = a.exam_hall
        exam = eh.exam
        key = (a.faculty_id, exam.date, exam.session)
        if key in session_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "ConflictDetected", "message": f"Cannot publish: Faculty #{a.faculty_id} has overlapping duties on {exam.date} {exam.session}.", "details": None}
            )
        session_map[key] = a.id

    # Update to published
    for a in allocations:
        a.status = "published"

    # Create notifications for faculty & send emails (only for assigned faculty)
    fac_alloc_map = {}
    for a in allocations:
        eh = a.exam_hall
        exam = eh.exam
        hall = eh.hall
        fac_alloc_map.setdefault(a.faculty_id, []).append({
            "date": exam.date,
            "session": exam.session,
            "start_time": exam.start_time,
            "end_time": exam.end_time,
            "subject_name": exam.subject_name,
            "subject_code": exam.subject_code,
            "hall_name": hall.name,
            "hall_block": hall.block,
        })

    for f_id, duties in fac_alloc_map.items():
        faculty = db.query(Faculty).filter(Faculty.id == f_id).first()
        user = db.query(User).filter(User.faculty_id == f_id).first()
        if user and faculty:
            notif = Notification(
                user_id=user.id,
                type="assigned",
                title="Official Exam Duty Allocation Published",
                body=f"You have been assigned {len(duties)} invigilation duty session(s) for the upcoming End-Semester Examinations.",
                is_read=False
            )
            db.add(notif)
            # Dispatch email or fallback log
            send_duty_allocation_email(
                faculty_name=faculty.name,
                faculty_email=faculty.email,
                duty_count=len(duties),
                duties=duties
            )

    # Audit log
    audit = AuditLog(
        actor_user_id=admin_user.id,
        action="PUBLISH_ALLOCATION",
        details_json=json.dumps({"total_published": len(allocations), "notified_faculty": len(fac_alloc_map)})
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Published {len(allocations)} allocations and sent notifications to {len(fac_alloc_map)} faculty members."
    }


@router.post("/swap-manual")
def manual_swap(
    req: ManualSwapRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Manually reassigns a faculty to an allocation with live rule validation."""
    allocation = db.query(Allocation).filter(Allocation.id == req.allocation_id).first()
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")

    target_faculty = db.query(Faculty).filter(Faculty.id == req.target_faculty_id).first()
    if not target_faculty:
        raise HTTPException(status_code=404, detail="Target faculty not found")

    exam = allocation.exam_hall.exam

    # RULE VALIDATION 1: Check if target faculty is on leave
    unavail = db.query(Unavailability).filter(
        Unavailability.faculty_id == target_faculty.id,
        Unavailability.date == exam.date,
        (Unavailability.session == exam.session) | (Unavailability.session == "BOTH")
    ).first()
    if unavail:
        return {
            "success": False,
            "broken_rule": f"{target_faculty.name} is on leave on {exam.date} {exam.session} ({unavail.reason or 'Marked Unavailable'})."
        }

    # RULE VALIDATION 2: Check overlap
    existing_duty = (
        db.query(Allocation)
        .join(ExamHall)
        .join(Exam)
        .filter(
            Allocation.faculty_id == target_faculty.id,
            Exam.date == exam.date,
            Exam.session == exam.session,
            Allocation.id != allocation.id
        )
        .first()
    )
    if existing_duty:
        return {
            "success": False,
            "broken_rule": f"{target_faculty.name} already has a duty in this session ({existing_duty.exam_hall.exam.subject_name} in {existing_duty.exam_hall.hall.name})."
        }

    # RULE VALIDATION 3: Department conflict check
    if target_faculty.department == exam.department_owner:
        return {
            "success": False,
            "broken_rule": f"Department conflict: {target_faculty.name} belongs to {target_faculty.department}, which owns this exam."
        }

    # Perform assignment
    old_faculty_name = allocation.faculty.name
    allocation.faculty_id = target_faculty.id
    allocation.created_by = "admin"
    db.commit()

    return {
        "success": True,
        "message": f"Successfully reassigned duty from {old_faculty_name} to {target_faculty.name}."
    }


@router.post("/lock")
def toggle_lock(
    req: LockRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Pins or unpins an allocation so subsequent solver runs preserve it."""
    allocation = db.query(Allocation).filter(Allocation.id == req.allocation_id).first()
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")

    allocation.is_locked = req.is_locked
    db.commit()

    return {
        "success": True,
        "is_locked": allocation.is_locked,
        "message": f"Allocation #{allocation.id} {'pinned (locked)' if allocation.is_locked else 'unpinned'}."
    }


@router.get("/validation")
def get_validation_report(db: Session = Depends(get_db)):
    """Computes live validation checks, conflicts, and unfilled slots."""
    allocations = db.query(Allocation).all()
    faculties = db.query(Faculty).all()
    exam_halls = db.query(ExamHall).all()

    conflicts = []
    warnings = []
    
    # 1. Check overlaps
    session_faculty = {}
    for a in allocations:
        exam = a.exam_hall.exam
        key = (a.faculty_id, exam.date, exam.session)
        if key in session_faculty:
            conflicts.append(f"Overlap: {a.faculty.name} assigned twice on {exam.date} {exam.session}.")
        session_faculty[key] = a.id

    # 2. Check department conflicts
    for a in allocations:
        exam = a.exam_hall.exam
        if a.faculty.department == exam.department_owner:
            conflicts.append(f"Dept Conflict: {a.faculty.name} ({a.faculty.department}) assigned to {exam.subject_code} owned by {exam.department_owner}.")

    # 3. Check unfilled slots
    slots_needed = sum(eh.invigilators_required for eh in exam_halls)
    slots_filled = len(allocations)
    if slots_filled < slots_needed:
        warnings.append(f"Unfilled Slots: {slots_needed - slots_filled} exam hall invigilator positions are vacant.")

    # 4. Fairness score using canonical shared function
    fairness_data = compute_allocation_fairness(db)
    fairness = fairness_data["fairness_score"] if allocations else 100

    return {
        "conflicts": conflicts,
        "warnings": warnings,
        "conflicts_count": len(conflicts),
        "unfilled_count": max(0, slots_needed - slots_filled),
        "fairness_score": fairness,
        "is_valid": len(conflicts) == 0 and slots_filled >= slots_needed,
    }

