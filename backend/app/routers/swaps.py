import json
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel

from ..database import get_db
from ..models import User, Faculty, Allocation, ExamHall, Exam, Hall, Unavailability, SwapRequest, Notification, AuditLog
from ..deps import get_current_user, require_admin

router = APIRouter(prefix="/swaps", tags=["swaps"])


class SwapCreateRequest(BaseModel):
    allocation_id: int
    to_faculty_id: Optional[int] = None
    reason: str


class SwapActionRequest(BaseModel):
    feedback: Optional[str] = None


def validate_swap_rules(
    db: Session,
    allocation: Allocation,
    target_faculty_id: Optional[int]
) -> Tuple[bool, str]:
    """
    Validates all hard rules for a duty swap:
    1. Target faculty on leave
    2. Overlap in the same session
    3. Own department conflict
    4. Max duties limit
    """
    if target_faculty_id is None:
        return True, "Valid ✓ (Open Reassignment Request)"

    target_faculty = db.query(Faculty).filter(Faculty.id == target_faculty_id).first()
    if not target_faculty:
        return False, "Target faculty does not exist."

    exam = allocation.exam_hall.exam

    # 1. Check Unavailability
    leave = db.query(Unavailability).filter(
        Unavailability.faculty_id == target_faculty_id,
        Unavailability.date == exam.date,
        (Unavailability.session == exam.session) | (Unavailability.session == "BOTH")
    ).first()
    if leave:
        return False, f"Rule Broken: {target_faculty.name} is on leave on {exam.date} {exam.session} ({leave.reason or 'Leave'})."

    # 2. Check Overlap
    overlap = (
        db.query(Allocation)
        .join(ExamHall)
        .join(Exam)
        .filter(
            Allocation.faculty_id == target_faculty_id,
            Exam.date == exam.date,
            Exam.session == exam.session,
            Allocation.id != allocation.id
        )
        .first()
    )
    if overlap:
        return False, f"Rule Broken: {target_faculty.name} already has a duty in this session ({overlap.exam_hall.exam.subject_name} in {overlap.exam_hall.hall.name})."

    # 3. Check Own Department Conflict
    if target_faculty.department == exam.department_owner:
        return False, f"Rule Broken: Department conflict. {target_faculty.name} is in {target_faculty.department}, which owns {exam.subject_code}."

    # 4. Check Max Duties
    assigned_count = db.query(Allocation).filter(Allocation.faculty_id == target_faculty_id).count()
    if assigned_count >= target_faculty.max_duties:
        return False, f"Rule Broken: {target_faculty.name} has already reached maximum duty capacity ({target_faculty.max_duties} duties)."

    return True, "Valid ✓"


@router.get("")
def list_swap_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists swap requests. Admin sees all; faculty sees their own and received requests."""
    query = (
        db.query(SwapRequest)
        .join(Allocation, SwapRequest.from_allocation_id == Allocation.id)
        .join(ExamHall, Allocation.exam_hall_id == ExamHall.id)
        .join(Exam, ExamHall.exam_id == Exam.id)
        .join(Hall, ExamHall.hall_id == Hall.id)
    )

    if current_user.role == "faculty":
        fac_id = current_user.faculty_id
        query = query.filter(
            (Allocation.faculty_id == fac_id) | (SwapRequest.to_faculty_id == fac_id)
        )

    requests = query.order_by(desc(SwapRequest.created_at)).all()

    result = []
    for r in requests:
        a = r.from_allocation
        exam = a.exam_hall.exam
        hall = a.exam_hall.hall
        from_fac = a.faculty
        to_fac = r.to_faculty

        # Dynamically verify rule status
        is_valid, validation_msg = validate_swap_rules(db, a, r.to_faculty_id)

        result.append({
            "id": r.id,
            "allocation_id": a.id,
            "status": r.status,
            "reason": r.reason,
            "validation_message": validation_msg,
            "is_valid": is_valid,
            "created_at": r.created_at.isoformat(),
            "from_faculty": {
                "id": from_fac.id,
                "name": from_fac.name,
                "code": from_fac.faculty_code,
                "department": from_fac.department,
            },
            "to_faculty": {
                "id": to_fac.id,
                "name": to_fac.name,
                "code": to_fac.faculty_code,
                "department": to_fac.department,
            } if to_fac else None,
            "exam": {
                "subject_name": exam.subject_name,
                "subject_code": exam.subject_code,
                "department_owner": exam.department_owner,
                "date": exam.date,
                "session": exam.session,
                "start_time": exam.start_time,
                "end_time": exam.end_time,
                "hall_name": hall.name,
                "hall_block": hall.block,
            }
        })

    return result


@router.post("", status_code=status.HTTP_201_CREATED)
def create_swap_request(
    data: SwapCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    allocation = db.query(Allocation).filter(Allocation.id == data.allocation_id).first()
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")

    # Faculty can only request swaps for their own duties
    if current_user.role == "faculty" and current_user.faculty_id != allocation.faculty_id:
        raise HTTPException(status_code=403, detail="You can only request swaps for your own duties")

    # Automatic rule validation
    is_valid, validation_msg = validate_swap_rules(db, allocation, data.to_faculty_id)

    swap = SwapRequest(
        from_allocation_id=allocation.id,
        to_faculty_id=data.to_faculty_id,
        reason=data.reason.strip(),
        status="pending",
        validation_message=validation_msg,
    )
    db.add(swap)
    db.flush()

    # Create notification for admin
    admins = db.query(User).filter(User.role == "admin").all()
    for adm in admins:
        notif = Notification(
            user_id=adm.id,
            type="swapped",
            title="New Duty Swap Request Submitted",
            body=f"{allocation.faculty.name} submitted a swap request for {allocation.exam_hall.exam.subject_code} on {allocation.exam_hall.exam.date}. Status: {validation_msg}",
            related_allocation_id=allocation.id,
            is_read=False,
        )
        db.add(notif)

    # If target faculty specified, notify them as well
    if data.to_faculty_id:
        target_user = db.query(User).filter(User.faculty_id == data.to_faculty_id).first()
        if target_user:
            notif_colleague = Notification(
                user_id=target_user.id,
                type="swapped",
                title="Duty Swap Request Proposed by Colleague",
                body=f"{allocation.faculty.name} proposed exchanging duty for {allocation.exam_hall.exam.subject_code} ({allocation.exam_hall.exam.date} {allocation.exam_hall.exam.session}).",
                related_allocation_id=allocation.id,
                is_read=False,
            )
            db.add(notif_colleague)

    db.commit()

    return {
        "success": True,
        "id": swap.id,
        "is_valid": is_valid,
        "validation_message": validation_msg,
        "message": "Swap request submitted successfully.",
    }


@router.post("/{swap_id}/approve")
def approve_swap(
    swap_id: int,
    action: SwapActionRequest = SwapActionRequest(),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    swap = db.query(SwapRequest).filter(SwapRequest.id == swap_id).first()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")

    if swap.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending requests can be approved")

    allocation = swap.from_allocation

    # Re-verify rules
    is_valid, validation_msg = validate_swap_rules(db, allocation, swap.to_faculty_id)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail={"error": "RuleViolation", "message": f"Cannot approve swap: {validation_msg}", "details": None}
        )

    # Execute swap
    old_faculty = allocation.faculty
    if swap.to_faculty_id:
        new_faculty = db.query(Faculty).filter(Faculty.id == swap.to_faculty_id).first()
        allocation.faculty_id = swap.to_faculty_id
        allocation.status = "swapped"
        allocation.created_by = "admin"

        # Notify old faculty
        if old_faculty and old_faculty.user:
            db.add(Notification(
                user_id=old_faculty.user.id,
                type="changed",
                title="Duty Swap Request Approved",
                body=f"Your duty swap request for {allocation.exam_hall.exam.subject_code} on {allocation.exam_hall.exam.date} has been approved. Transferred to {new_faculty.name}.",
                related_allocation_id=allocation.id,
                is_read=False,
            ))

        # Notify new faculty
        if new_faculty and new_faculty.user:
            db.add(Notification(
                user_id=new_faculty.user.id,
                type="assigned",
                title="New Duty Assigned via Approved Swap",
                body=f"You have been assigned invigilation duty for {allocation.exam_hall.exam.subject_name} ({allocation.exam_hall.hall.name}) on {allocation.exam_hall.exam.date} {allocation.exam_hall.exam.session}.",
                related_allocation_id=allocation.id,
                is_read=False,
            ))

    swap.status = "approved"
    swap.validation_message = "Approved by Exam Cell"

    # Audit log
    audit = AuditLog(
        actor_user_id=admin_user.id,
        action="APPROVE_SWAP",
        details_json=json.dumps({
            "swap_id": swap.id,
            "allocation_id": allocation.id,
            "from_faculty": old_faculty.name if old_faculty else None,
            "to_faculty_id": swap.to_faculty_id,
        })
    )
    db.add(audit)
    db.commit()

    return {"success": True, "message": "Swap request approved and duty reassigned successfully."}


@router.post("/{swap_id}/reject")
def reject_swap(
    swap_id: int,
    action: SwapActionRequest = SwapActionRequest(),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    swap = db.query(SwapRequest).filter(SwapRequest.id == swap_id).first()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")

    if swap.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending requests can be rejected")

    swap.status = "rejected"
    swap.validation_message = f"Rejected: {action.feedback or 'Rejected by Admin'}"

    # Notify requesting faculty
    from_fac = swap.from_allocation.faculty
    if from_fac and from_fac.user:
        db.add(Notification(
            user_id=from_fac.user.id,
            type="swapped",
            title="Duty Swap Request Rejected",
            body=f"Your swap request for {swap.from_allocation.exam_hall.exam.subject_code} was rejected. Reason: {action.feedback or 'Duty exchange not permissible.'}",
            related_allocation_id=swap.from_allocation_id,
            is_read=False,
        ))

    db.commit()
    return {"success": True, "message": "Swap request rejected."}
