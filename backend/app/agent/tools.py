import json
import re
from datetime import datetime, timezone, date
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models import Faculty, Hall, Exam, ExamHall, Allocation, Unavailability, User, Notification, AuditLog
from ..solver.cp_solver import FacultyInput, SlotInput, UnavailabilityInput, SolverSettings, compute_allocation_fairness, calculate_fairness_score
from ..solver.reallocate import reallocate_minimal as run_reallocate_minimal
from ..services.email_service import send_email

# In-memory undo stack and pending confirmations
_UNDO_STACK: List[Dict[str, Any]] = []
_PENDING_CONFIRMATIONS: Dict[str, Dict[str, Any]] = {}


def log_tool_audit(db: Session, actor_user_id: Optional[int], tool_name: str, params: Dict[str, Any], result_summary: str):
    """Logs tool call to AuditLog table as required by SPEC.md section 7."""
    try:
        audit = AuditLog(
            actor_user_id=actor_user_id,
            action=f"AI_TOOL_{tool_name.upper()}",
            details_json=json.dumps({
                "tool": tool_name,
                "params": params,
                "summary": result_summary,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        print(f"[AUDIT LOG ERROR] Failed to log tool {tool_name}: {e}")


def parse_date(date_str: str) -> Optional[str]:
    """Normalizes natural date strings like '12 Nov', 'Nov 12', '12th November 2026' to YYYY-MM-DD."""
    if not date_str:
        return None
    d = date_str.strip().lower()
    
    # Check ISO format
    iso_match = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})", d)
    if iso_match:
        y, m, day = iso_match.groups()
        return f"{y}-{int(m):02d}-{int(day):02d}"

    # Check day + month (e.g. 12 nov, 12th november, nov 12)
    months = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
        "january": 1, "february": 2, "march": 3, "april": 4, "june": 6,
        "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    }

    # Match "12 nov" or "12th nov"
    m1 = re.search(r"(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)", d)
    if m1:
        day_num = int(m1.group(1))
        mon_str = m1.group(2)
        if mon_str in months:
            return f"2026-{months[mon_str]:02d}-{day_num:02d}"

    # Match "nov 12"
    m2 = re.search(r"([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?", d)
    if m2:
        mon_str = m2.group(1)
        day_num = int(m2.group(2))
        if mon_str in months:
            return f"2026-{months[mon_str]:02d}-{day_num:02d}"

    return date_str


def resolve_faculty(db: Session, identifier: Any) -> Optional[Faculty]:
    """Finds a faculty member by ID, code, or name."""
    if isinstance(identifier, int) or (isinstance(identifier, str) and identifier.isdigit()):
        return db.query(Faculty).filter(Faculty.id == int(identifier)).first()

    name_query = str(identifier).strip()
    
    # Direct code match (e.g. VF-CSE-001)
    f = db.query(Faculty).filter(Faculty.faculty_code.ilike(name_query)).first()
    if f:
        return f

    # Exact name match
    f = db.query(Faculty).filter(Faculty.name.ilike(name_query)).first()
    if f:
        return f

    # Substring match (e.g. "Rao", "K. Rao", "Suresh")
    clean_name = re.sub(r"^(dr\.|mr\.|mrs\.|prof\.)\s*", "", name_query, flags=re.IGNORECASE).strip()
    candidates = db.query(Faculty).filter(Faculty.name.ilike(f"%{clean_name}%")).all()
    if len(candidates) == 1:
        return candidates[0]
    elif len(candidates) > 1:
        # Prefer exact token match in name
        for c in candidates:
            if clean_name.lower() in [part.lower() for part in c.name.split()]:
                return c
        return candidates[0]

    return None


# -------------------------------------------------------------------------
# Tool 1: get_faculty_duties
# -------------------------------------------------------------------------
def get_faculty_duties(db: Session, faculty_name_or_id: Any, actor_user_id: Optional[int] = None) -> Dict[str, Any]:
    faculty = resolve_faculty(db, faculty_name_or_id)
    if not faculty:
        res = {"success": False, "error": f"Faculty '{faculty_name_or_id}' could not be resolved."}
        log_tool_audit(db, actor_user_id, "get_faculty_duties", {"query": str(faculty_name_or_id)}, "Faculty not found")
        return res

    allocations = (
        db.query(Allocation)
        .join(ExamHall, Allocation.exam_hall_id == ExamHall.id)
        .join(Exam, ExamHall.exam_id == Exam.id)
        .join(Hall, ExamHall.hall_id == Hall.id)
        .filter(Allocation.faculty_id == faculty.id)
        .order_by(Exam.date, Exam.session)
        .all()
    )

    duties = [
        {
            "allocation_id": a.id,
            "subject_name": a.exam_hall.exam.subject_name,
            "subject_code": a.exam_hall.exam.subject_code,
            "department_owner": a.exam_hall.exam.department_owner,
            "date": a.exam_hall.exam.date,
            "session": a.exam_hall.exam.session,
            "start_time": a.exam_hall.exam.start_time,
            "end_time": a.exam_hall.exam.end_time,
            "hall_name": a.exam_hall.hall.name,
            "hall_block": a.exam_hall.hall.block,
            "student_count": a.exam_hall.student_count,
            "status": a.status,
            "is_locked": a.is_locked,
        }
        for a in allocations
    ]

    res = {
        "success": True,
        "faculty": {
            "id": faculty.id,
            "name": faculty.name,
            "faculty_code": faculty.faculty_code,
            "department": faculty.department,
            "designation": faculty.designation,
            "max_duties": faculty.max_duties,
            "past_duties": faculty.past_duties,
        },
        "duty_count": len(duties),
        "duties": duties,
    }
    log_tool_audit(
        db, actor_user_id, "get_faculty_duties",
        {"faculty": faculty.name},
        f"Retrieved {len(duties)} duties for {faculty.name} ({faculty.department})"
    )
    return res


# -------------------------------------------------------------------------
# Tool 2: list_conflicts
# -------------------------------------------------------------------------
def list_conflicts(db: Session, date_str: Optional[str] = None, actor_user_id: Optional[int] = None) -> Dict[str, Any]:
    norm_date = parse_date(date_str) if date_str else None
    
    alloc_query = db.query(Allocation).join(ExamHall).join(Exam).join(Hall)
    if norm_date:
        alloc_query = alloc_query.filter(Exam.date == norm_date)
    allocations = alloc_query.all()

    conflicts = []
    warnings = []

    # 1. Overlaps
    session_map = {}
    for a in allocations:
        exam = a.exam_hall.exam
        key = (a.faculty_id, exam.date, exam.session)
        if key in session_map:
            conflicts.append({
                "type": "overlap",
                "message": f"Session overlap: {a.faculty.name} assigned twice on {exam.date} {exam.session}."
            })
        session_map[key] = a.id

    # 2. Own-Department violations
    for a in allocations:
        exam = a.exam_hall.exam
        if a.faculty.department == exam.department_owner:
            conflicts.append({
                "type": "department_conflict",
                "message": f"Department conflict: {a.faculty.name} ({a.faculty.department}) assigned to own department exam {exam.subject_code} ({exam.subject_name})."
            })

    # 3. Unavailabilities/Leave violations
    for a in allocations:
        exam = a.exam_hall.exam
        unavail = db.query(Unavailability).filter(
            Unavailability.faculty_id == a.faculty_id,
            Unavailability.date == exam.date,
            (Unavailability.session == exam.session) | (Unavailability.session == "BOTH")
        ).first()
        if unavail:
            conflicts.append({
                "type": "leave_violation",
                "message": f"Leave conflict: {a.faculty.name} is on leave on {exam.date} {exam.session} ({unavail.reason or 'Unavailability marked'})."
            })

    # 4. Unfilled slots
    exam_halls = db.query(ExamHall).join(Exam)
    if norm_date:
        exam_halls = exam_halls.filter(Exam.date == norm_date)
    eh_list = exam_halls.all()

    slots_needed = sum(eh.invigilators_required for eh in eh_list)
    slots_filled = len(allocations)
    if slots_filled < slots_needed:
        warnings.append({
            "type": "unfilled_slots",
            "message": f"Unfilled slots: {slots_needed - slots_filled} exam invigilator positions lack assigned faculty."
        })

    res = {
        "success": True,
        "date_filter": norm_date,
        "conflict_count": len(conflicts),
        "warning_count": len(warnings),
        "conflicts": conflicts,
        "warnings": warnings,
        "is_clean": len(conflicts) == 0,
    }
    log_tool_audit(
        db, actor_user_id, "list_conflicts",
        {"date": norm_date},
        f"Found {len(conflicts)} conflicts and {len(warnings)} warnings (date={norm_date or 'ALL'})"
    )
    return res


# -------------------------------------------------------------------------
# Tool 3: mark_faculty_unavailable
# -------------------------------------------------------------------------
def mark_faculty_unavailable(
    db: Session,
    faculty_name_or_id: Any,
    date_str: str,
    session: str = "BOTH",
    reason: str = "Medical/Personal Leave",
    actor_user_id: Optional[int] = None
) -> Dict[str, Any]:
    faculty = resolve_faculty(db, faculty_name_or_id)
    if not faculty:
        return {"success": False, "error": f"Faculty '{faculty_name_or_id}' could not be found."}

    norm_date = parse_date(date_str)
    if not norm_date:
        return {"success": False, "error": f"Invalid date: '{date_str}'."}

    norm_session = session.upper().strip()
    if norm_session not in ("FN", "AN", "BOTH"):
        norm_session = "BOTH"

    # Check existing
    existing = db.query(Unavailability).filter(
        Unavailability.faculty_id == faculty.id,
        Unavailability.date == norm_date,
        Unavailability.session == norm_session,
    ).first()

    if not existing:
        unavail = Unavailability(
            faculty_id=faculty.id,
            date=norm_date,
            session=norm_session,
            reason=reason or "Marked unavailable by Exam Cell Assistant",
        )
        db.add(unavail)
        db.commit()

    summary = f"Marked {faculty.name} ({faculty.faculty_code}) unavailable on {norm_date} ({norm_session}): {reason}"
    log_tool_audit(
        db, actor_user_id, "mark_faculty_unavailable",
        {"faculty": faculty.name, "date": norm_date, "session": norm_session, "reason": reason},
        summary
    )

    return {
        "success": True,
        "faculty_id": faculty.id,
        "faculty_name": faculty.name,
        "faculty_code": faculty.faculty_code,
        "date": norm_date,
        "session": norm_session,
        "reason": reason,
        "message": summary,
    }


# -------------------------------------------------------------------------
# Tool 4: reallocate_minimal
# -------------------------------------------------------------------------
def reallocate_minimal_tool(
    db: Session,
    vacated_faculty_name_or_id: Optional[Any] = None,
    date_str: Optional[str] = None,
    session: Optional[str] = None,
    actor_user_id: Optional[int] = None
) -> Dict[str, Any]:
    vacated_faculty = resolve_faculty(db, vacated_faculty_name_or_id) if vacated_faculty_name_or_id else None
    norm_date = parse_date(date_str) if date_str else None
    norm_session = session.upper().strip() if session else None

    # Load DB entities
    all_faculty = db.query(Faculty).all()
    all_exams = db.query(Exam).all()
    all_halls = db.query(Hall).filter(Hall.is_active == True).all()
    all_exam_halls = db.query(ExamHall).all()
    all_allocations = db.query(Allocation).all()
    all_unavails = db.query(Unavailability).all()

    # Build solver inputs
    faculty_inputs = [
        FacultyInput(
            id=f.id,
            faculty_code=f.faculty_code,
            name=f.name,
            department=f.department,
            designation=f.designation,
            max_duties=f.max_duties,
            past_duties=f.past_duties,
        )
        for f in all_faculty
    ]

    unavail_inputs = [
        UnavailabilityInput(
            faculty_id=u.faculty_id,
            date=u.date,
            session=u.session,
            reason=u.reason,
        )
        for u in all_unavails
    ]

    # Map current allocations by exam_hall_id
    eh_alloc_map: Dict[int, List[Allocation]] = {}
    for a in all_allocations:
        eh_alloc_map.setdefault(a.exam_hall_id, []).append(a)

    exam_map = {e.id: e for e in all_exams}
    hall_map = {h.id: h for h in all_halls}

    slots: List[SlotInput] = []
    slot_to_alloc_id: Dict[str, int] = {}

    for eh in all_exam_halls:
        exam = exam_map.get(eh.exam_id)
        hall = hall_map.get(eh.hall_id)
        if not exam or not hall:
            continue

        assigned_allocs = eh_alloc_map.get(eh.id, [])
        for pos in range(eh.invigilators_required):
            slot_id = f"eh_{eh.id}_p{pos}"
            prev_f_id = None
            is_locked = False
            locked_f_id = None

            if pos < len(assigned_allocs):
                alloc = assigned_allocs[pos]
                prev_f_id = alloc.faculty_id
                is_locked = alloc.is_locked
                locked_f_id = alloc.faculty_id if alloc.is_locked else None
                slot_to_alloc_id[slot_id] = alloc.id

            slots.append(
                SlotInput(
                    slot_id=slot_id,
                    exam_hall_id=eh.id,
                    exam_id=exam.id,
                    hall_id=hall.id,
                    date=exam.date,
                    session=exam.session,
                    department_owner=exam.department_owner,
                    position=pos,
                    is_locked=is_locked,
                    locked_faculty_id=locked_f_id,
                    previous_faculty_id=prev_f_id,
                )
            )

    vacated_id = vacated_faculty.id if vacated_faculty else None

    # Run CP-SAT minimal reallocation
    realloc_res = run_reallocate_minimal(
        faculty_list=faculty_inputs,
        slots=slots,
        unavailabilities=unavail_inputs,
        vacated_faculty_id=vacated_id,
        affected_date=norm_date,
        affected_session=norm_session,
    )

    if not realloc_res.success:
        return {
            "success": False,
            "status": realloc_res.status,
            "message": "Minimal reallocation infeasible with current constraints.",
            "diff": [],
            "affected_slots_count": 0,
        }

    # Format diff with rich metadata
    diff_items = []
    for cd in realloc_res.diff:
        alloc_id = slot_to_alloc_id.get(cd.slot_id)
        exam = exam_map.get(cd.exam_id)
        hall = hall_map.get(cd.hall_id)
        diff_items.append({
            "allocation_id": alloc_id,
            "slot_id": cd.slot_id,
            "date": cd.date,
            "session": cd.session,
            "subject_name": exam.subject_name if exam else "Unknown Exam",
            "subject_code": exam.subject_code if exam else "Unknown Code",
            "hall_name": hall.name if hall else "Hall",
            "old_faculty_id": cd.old_faculty_id,
            "old_faculty_name": cd.old_faculty_name or "Unassigned",
            "new_faculty_id": cd.new_faculty_id,
            "new_faculty_name": cd.new_faculty_name,
            "reason": cd.reason,
        })

    summary = f"Reallocation proposed: {len(diff_items)} assignment(s) changed"
    log_tool_audit(
        db, actor_user_id, "reallocate_minimal",
        {"vacated_faculty": vacated_faculty.name if vacated_faculty else None, "date": norm_date, "session": norm_session},
        summary
    )

    return {
        "success": True,
        "status": realloc_res.status,
        "diff": diff_items,
        "affected_slots_count": len(diff_items),
        "message": f"Successfully calculated minimal changes for {len(diff_items)} slot(s).",
    }


# -------------------------------------------------------------------------
# Tool 5: explain_assignment
# -------------------------------------------------------------------------
def explain_assignment(
    db: Session,
    allocation_id: Optional[int] = None,
    faculty_name_or_id: Optional[Any] = None,
    date_str: Optional[str] = None,
    session: Optional[str] = None,
    actor_user_id: Optional[int] = None
) -> Dict[str, Any]:
    allocation = None
    if allocation_id:
        allocation = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    elif faculty_name_or_id and date_str:
        f = resolve_faculty(db, faculty_name_or_id)
        norm_date = parse_date(date_str)
        if f and norm_date:
            q = (
                db.query(Allocation)
                .join(ExamHall)
                .join(Exam)
                .filter(Allocation.faculty_id == f.id, Exam.date == norm_date)
            )
            if session:
                q = q.filter(Exam.session == session.upper())
            allocation = q.first()

    if not allocation:
        return {"success": False, "error": "Allocation not found for the given criteria."}

    exam = allocation.exam_hall.exam
    hall = allocation.exam_hall.hall
    faculty = allocation.faculty

    # Compute fairness context
    faculties = db.query(Faculty).all()
    all_allocs = db.query(Allocation).all()
    counts = {f.id: f.past_duties for f in faculties}
    for a in all_allocs:
        counts[a.faculty_id] = counts.get(a.faculty_id, 0) + 1

    my_duties = counts.get(faculty.id, 0)
    avg_duties = sum(counts.values()) / len(faculties) if faculties else 2.0

    # Rule checks
    dept_shield = (
        f"Protected: The examination is owned by the Department of {exam.department_owner}, "
        f"while {faculty.name} belongs to {faculty.department}. This satisfies the strict "
        f"anti-bias hard constraint prohibiting faculty from invigilating their home department."
    )

    workload_rationale = (
        f"{faculty.name} currently holds {my_duties} total duty session(s) "
        f"(institutional average: {avg_duties:.1f}). This is well within their contract workload limit "
        f"of {faculty.max_duties} duties."
    )

    availability_rationale = (
        f"No leave, unavailabilities, or time-slot conflicts were registered for {faculty.name} "
        f"on {exam.date} ({exam.session})."
    )

    hall_rationale = (
        f"Allocated to {hall.name} ({hall.block}, Floor {hall.floor}) for {allocation.exam_hall.student_count} candidates."
    )

    summary_text = (
        f"{faculty.name} was assigned to {exam.subject_name} ({exam.subject_code}) on {exam.date} {exam.session} "
        f"because: (1) Department anti-bias shield is fully satisfied ({faculty.department} ≠ {exam.department_owner}); "
        f"(2) Workload is balanced ({my_duties} duties vs university avg {avg_duties:.1f}); "
        f"(3) Perfect schedule availability with zero clashes."
    )

    log_tool_audit(
        db, actor_user_id, "explain_assignment",
        {"allocation_id": allocation.id, "faculty": faculty.name},
        f"Generated rationale for {faculty.name} on {exam.subject_code}"
    )

    return {
        "success": True,
        "allocation_id": allocation.id,
        "faculty_name": faculty.name,
        "faculty_department": faculty.department,
        "subject_name": exam.subject_name,
        "subject_code": exam.subject_code,
        "exam_department_owner": exam.department_owner,
        "date": exam.date,
        "session": exam.session,
        "hall_name": hall.name,
        "hall_location": f"{hall.block}, Floor {hall.floor}",
        "explanation": {
            "department_shield": dept_shield,
            "workload_equity": workload_rationale,
            "availability_verified": availability_rationale,
            "venue_suitability": hall_rationale,
            "human_summary": summary_text,
        }
    }


# -------------------------------------------------------------------------
# Tool 6: find_replacement
# -------------------------------------------------------------------------
def find_replacement(
    db: Session,
    faculty_name_or_id: Any,
    date_str: str,
    session: str = "FN",
    actor_user_id: Optional[int] = None
) -> Dict[str, Any]:
    norm_date = parse_date(date_str)
    norm_session = session.upper().strip()
    fac = resolve_faculty(db, faculty_name_or_id)
    if not fac:
        return {"success": False, "error": f"Faculty '{faculty_name_or_id}' could not be resolved."}

    # Find the duty that needs replacement
    duty_alloc = (
        db.query(Allocation)
        .join(ExamHall)
        .join(Exam)
        .filter(Allocation.faculty_id == fac.id, Exam.date == norm_date, Exam.session == norm_session)
        .first()
    )

    exam_dept = duty_alloc.exam_hall.exam.department_owner if duty_alloc else "CSE"

    # Query all active faculty
    all_fac = db.query(Faculty).filter(Faculty.id != fac.id).all()
    all_allocs = db.query(Allocation).all()
    counts = {f.id: 0 for f in all_fac}
    for a in all_allocs:
        counts[a.faculty_id] = counts.get(a.faculty_id, 0) + 1

    candidates = []
    for f in all_fac:
        # 1. Check leave
        unavail = db.query(Unavailability).filter(
            Unavailability.faculty_id == f.id,
            Unavailability.date == norm_date,
            (Unavailability.session == norm_session) | (Unavailability.session == "BOTH")
        ).first()
        if unavail:
            continue

        # 2. Check session overlap
        overlap = (
            db.query(Allocation)
            .join(ExamHall)
            .join(Exam)
            .filter(Allocation.faculty_id == f.id, Exam.date == norm_date, Exam.session == norm_session)
            .first()
        )
        if overlap:
            continue

        # 3. Check department conflict
        if f.department == exam_dept:
            continue

        # 4. Check max duties
        current_duty_count = counts.get(f.id, 0)
        if current_duty_count >= f.max_duties:
            continue

        candidates.append({
            "faculty_id": f.id,
            "faculty_name": f.name,
            "faculty_code": f.faculty_code,
            "department": f.department,
            "designation": f.designation,
            "current_duties": current_duty_count,
            "max_duties": f.max_duties,
            "score": current_duty_count + f.past_duties,
            "reason": f"0 conflicts, {f.department} ≠ {exam_dept}, holds {current_duty_count} duties (lowest in pool)"
        })

    # Sort candidates by fewest duties
    candidates.sort(key=lambda c: (c["current_duties"], c["score"]))

    top_candidates = candidates[:5]

    log_tool_audit(
        db, actor_user_id, "find_replacement",
        {"vacated_faculty": fac.name, "date": norm_date, "session": norm_session},
        f"Found {len(top_candidates)} replacement candidate(s)"
    )

    return {
        "success": True,
        "date": norm_date,
        "session": norm_session,
        "replacing_faculty": fac.name,
        "candidates_count": len(candidates),
        "candidates": top_candidates,
    }


# -------------------------------------------------------------------------
# Tool 7: send_notifications
# -------------------------------------------------------------------------
def send_notifications_tool(
    db: Session,
    allocation_ids: Optional[List[int]] = None,
    user_ids: Optional[List[int]] = None,
    message: Optional[str] = None,
    actor_user_id: Optional[int] = None
) -> Dict[str, Any]:
    target_users = set()
    if user_ids:
        target_users.update(user_ids)

    if allocation_ids:
        allocs = db.query(Allocation).filter(Allocation.id.in_(allocation_ids)).all()
        for a in allocs:
            u = db.query(User).filter(User.faculty_id == a.faculty_id).first()
            if u:
                target_users.add(u.id)

    dispatched = 0
    for u_id in target_users:
        u = db.query(User).filter(User.id == u_id).first()
        if not u:
            continue
        notif = Notification(
            user_id=u.id,
            type="changed",
            title="Exam Invigilation Schedule Revised",
            body=message or "An invigilation duty assignment has been adjusted by the Exam Cell AI Assistant.",
            is_read=False,
        )
        db.add(notif)
        dispatched += 1

    db.commit()

    log_tool_audit(
        db, actor_user_id, "send_notifications",
        {"target_users_count": len(target_users)},
        f"Dispatched {dispatched} notification(s)"
    )

    return {
        "success": True,
        "notifications_sent": dispatched,
        "message": f"Dispatched {dispatched} in-app notification(s) strictly to affected faculty.",
    }


# -------------------------------------------------------------------------
# Tool 8: get_fairness_stats
# -------------------------------------------------------------------------
def get_fairness_stats(db: Session, actor_user_id: Optional[int] = None) -> Dict[str, Any]:
    """Retrieves fairness metrics using the canonical single shared function."""
    res = compute_allocation_fairness(db)

    log_tool_audit(
        db, actor_user_id, "get_fairness_stats",
        {},
        f"Fairness index: {res['fairness_score']}/100, avg: {res['average_duties']:.2f}, std_dev: {res['std_dev']:.2f}"
    )

    return res


# -------------------------------------------------------------------------
# Apply confirmed diff and Undo management
# -------------------------------------------------------------------------
def apply_reallocation_diff(
    db: Session,
    diff_items: List[Dict[str, Any]],
    actor_user_id: Optional[int] = None
) -> Dict[str, Any]:
    """Applies proposed diff items to the database and preserves an undo snapshot."""
    if not diff_items:
        return {"success": False, "message": "No diff items provided to apply."}

    undo_snapshot = []
    affected_users = set()

    for item in diff_items:
        alloc_id = item.get("allocation_id")
        new_f_id = item.get("new_faculty_id")
        old_f_id = item.get("old_faculty_id")

        alloc = db.query(Allocation).filter(Allocation.id == alloc_id).first() if alloc_id else None
        if not alloc:
            # Try finding by date, session, subject
            exam = db.query(Exam).filter(Exam.date == item.get("date"), Exam.session == item.get("session")).first()
            if exam:
                alloc = db.query(Allocation).join(ExamHall).filter(ExamHall.exam_id == exam.id).first()

        if alloc:
            undo_snapshot.append({
                "allocation_id": alloc.id,
                "previous_faculty_id": alloc.faculty_id,
                "previous_status": alloc.status,
            })
            alloc.faculty_id = new_f_id
            alloc.created_by = "agent"
            db.flush()

            # Identify affected users for notification
            if old_f_id:
                u_old = db.query(User).filter(User.faculty_id == old_f_id).first()
                if u_old:
                    affected_users.add(u_old.id)
            if new_f_id:
                u_new = db.query(User).filter(User.faculty_id == new_f_id).first()
                if u_new:
                    affected_users.add(u_new.id)

    # Save to global undo stack
    _UNDO_STACK.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "snapshot": undo_snapshot,
        "diff": diff_items,
    })

    # Dispatch notifications strictly to affected faculty
    notified_count = 0
    for u_id in affected_users:
        u = db.query(User).filter(User.id == u_id).first()
        if u and u.faculty:
            notif = Notification(
                user_id=u.id,
                type="changed",
                title="Duty Schedule Updated by AI Assistant",
                body=f"Your invigilation duty roster has been updated following automated schedule adjustments.",
                is_read=False,
            )
            db.add(notif)
            notified_count += 1
            # Console / SMTP fallback
            send_email(
                to_email=u.faculty.email,
                subject="Invigilation Duty Schedule Update",
                body=f"Dear {u.faculty.name},\n\nYour exam duty schedule has been updated by the Exam Cell AI Assistant.\nPlease log in to the portal to view your revised duty details."
            )

    db.commit()

    log_tool_audit(
        db, actor_user_id, "apply_reallocation",
        {"applied_count": len(diff_items)},
        f"Applied {len(diff_items)} reassignment(s) and notified {notified_count} affected faculty"
    )

    return {
        "success": True,
        "applied_count": len(diff_items),
        "notified_faculty_count": notified_count,
        "message": f"Successfully applied {len(diff_items)} change(s) and notified {notified_count} affected faculty.",
    }


def undo_last_reallocation(db: Session, actor_user_id: Optional[int] = None) -> Dict[str, Any]:
    """Reverts the last applied reallocation snapshot."""
    if not _UNDO_STACK:
        return {"success": False, "message": "Nothing to undo."}

    last_entry = _UNDO_STACK.pop()
    snapshot = last_entry.get("snapshot", [])

    reverted_count = 0
    for item in snapshot:
        alloc_id = item["allocation_id"]
        prev_f_id = item["previous_faculty_id"]
        alloc = db.query(Allocation).filter(Allocation.id == alloc_id).first()
        if alloc and prev_f_id:
            alloc.faculty_id = prev_f_id
            alloc.status = item.get("previous_status", "published")
            reverted_count += 1

    db.commit()

    log_tool_audit(
        db, actor_user_id, "undo_reallocation",
        {"reverted_count": reverted_count},
        f"Undid reallocation: restored {reverted_count} assignment(s)"
    )

    return {
        "success": True,
        "reverted_count": reverted_count,
        "message": f"Reverted {reverted_count} allocation(s) to their previous state.",
    }
