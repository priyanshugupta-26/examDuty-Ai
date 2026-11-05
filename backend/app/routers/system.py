import json
from datetime import datetime, timezone, date
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import User, Faculty, Hall, Exam, ExamHall, Allocation, Setting, AuditLog, Unavailability
from ..schemas import SystemStats
from ..deps import require_admin, require_faculty
from ..solver.cp_solver import compute_allocation_fairness
from ..seed import reset_and_seed_demo_data

router = APIRouter(tags=["system"])


@router.get("/system/stats", response_model=SystemStats)
def get_system_stats(db: Session = Depends(get_db)):
    total_faculty = db.query(Faculty).count()
    total_halls = db.query(Hall).count()
    total_exams = db.query(Exam).count()
    total_allocations = db.query(Allocation).count()
    fairness = compute_allocation_fairness(db)["fairness_score"]
    
    sample_setting = db.query(Setting).filter(Setting.key == "sample_data").first()
    is_sample_data = True
    if sample_setting:
        try:
            val = json.loads(sample_setting.value_json)
            is_sample_data = bool(val.get("is_sample", True))
        except Exception:
            is_sample_data = True

    return SystemStats(
        total_faculty=total_faculty,
        total_halls=total_halls,
        total_exams=total_exams,
        total_allocations=total_allocations,
        is_sample_data=is_sample_data,
        fairness_score=fairness,
    )


@router.post("/system/reset-demo")
def reset_demo(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Restores official VFSTR sample dataset with 40 faculty, 12 halls, 25 exams,
    and regenerates unpublished draft allocations so the full demo can be re-run cleanly.
    """
    res = reset_and_seed_demo_data(db, actor_user_id=current_user.id)
    return res


@router.get("/system/dashboard")
def get_admin_dashboard_data(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Returns aggregated data for the Admin Dashboard."""
    # 1. System stats & fairness
    fairness_data = compute_allocation_fairness(db)
    total_faculty = len(db.query(Faculty).all())
    total_halls = db.query(Hall).count()
    total_exams = db.query(Exam).count()
    allocations = db.query(Allocation).all()
    exam_halls = db.query(ExamHall).all()

    total_slots_needed = sum(eh.invigilators_required for eh in exam_halls)
    slots_filled = len(allocations)
    unfilled_count = max(0, total_slots_needed - slots_filled)
    coverage_pct = round((slots_filled / total_slots_needed * 100), 1) if total_slots_needed > 0 else 0

    # 2. Hard conflicts check
    conflicts_count = 0
    # Overlap check
    session_map = {}
    for a in allocations:
        exam = a.exam_hall.exam
        key = (a.faculty_id, exam.date, exam.session)
        if key in session_map:
            conflicts_count += 1
        session_map[key] = a.id

    # Department conflicts
    for a in allocations:
        if a.faculty.department == a.exam_hall.exam.department_owner:
            conflicts_count += 1

    # 3. Fairness chart data: duties per faculty
    faculties = db.query(Faculty).all()
    fac_counts = {f.id: 0 for f in faculties}
    for a in allocations:
        fac_counts[a.faculty_id] = fac_counts.get(a.faculty_id, 0) + 1

    chart_bars = [
        {
            "id": f.id,
            "code": f.faculty_code,
            "name": f.name,
            "department": f.department,
            "duties": fac_counts.get(f.id, 0),
            "past_duties": f.past_duties,
            "total_duties": fac_counts.get(f.id, 0) + f.past_duties,
            "max_duties": f.max_duties,
        }
        for f in faculties
    ]
    # Sort for smooth visualization
    chart_bars.sort(key=lambda x: (x["department"], x["total_duties"]))

    # 4. Upcoming sessions (next 5 distinct date/session combinations)
    exams_ordered = db.query(Exam).order_by(Exam.date, Exam.session).all()
    upcoming_sessions = []
    seen_sessions = set()
    for e in exams_ordered:
        s_key = (e.date, e.session)
        if s_key not in seen_sessions:
            seen_sessions.add(s_key)
            eh_for_exam = [eh for eh in exam_halls if eh.exam_id == e.id]
            h_count = len(eh_for_exam) or 1
            s_count = sum(eh.student_count for eh in eh_for_exam) or 40
            
            # Check allocation status for this session
            session_allocs = [a for a in allocations if a.exam_hall.exam.date == e.date and a.exam_hall.exam.session == e.session]
            is_pub = any(a.status == "published" for a in session_allocs) if session_allocs else False
            
            upcoming_sessions.append({
                "date": e.date,
                "session": e.session,
                "time": f"{e.start_time} – {e.end_time}",
                "subject_name": e.subject_name,
                "subject_code": e.subject_code,
                "branch": e.branch,
                "halls_count": h_count,
                "student_count": s_count,
                "status": "Published" if is_pub else ("Draft" if session_allocs else "Unassigned"),
            })
            if len(upcoming_sessions) >= 5:
                break

    # 5. Recent activity from AuditLog
    recent_logs = (
        db.query(AuditLog)
        .outerjoin(User, AuditLog.actor_user_id == User.id)
        .order_by(desc(AuditLog.created_at))
        .limit(6)
        .all()
    )
    activity_feed = []
    for l in recent_logs:
        actor_label = "System"
        if l.actor_user:
            actor_label = l.actor_user.faculty.name if l.actor_user.faculty else l.actor_user.email
        
        detail_msg = ""
        if l.details_json:
            try:
                parsed = json.loads(l.details_json)
                detail_msg = parsed.get("summary") or parsed.get("message") or str(parsed)
            except Exception:
                detail_msg = l.details_json[:80]

        activity_feed.append({
            "id": l.id,
            "action": l.action,
            "actor": actor_label,
            "summary": detail_msg,
            "timestamp": l.created_at.isoformat(),
        })

    return {
        "success": True,
        "stats": {
            "total_exams": total_exams,
            "total_halls": total_halls,
            "total_faculty": total_faculty,
            "total_allocations": slots_filled,
            "total_slots_needed": total_slots_needed,
            "coverage_pct": coverage_pct,
            "fairness_score": fairness_data["fairness_score"],
        },
        "allocation_health": {
            "conflicts_count": conflicts_count,
            "unfilled_count": unfilled_count,
            "fairness_score": fairness_data["fairness_score"],
            "average_duties": fairness_data["average_duties"],
        },
        "fairness_chart": {
            "bars": chart_bars,
            "average_duties": fairness_data["average_duties"],
            "min_duties": fairness_data["min_duties"],
            "max_duties": fairness_data["max_duties"],
        },
        "upcoming_sessions": upcoming_sessions,
        "recent_activity": activity_feed,
    }


@router.get("/system/settings")
def get_all_settings(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    settings = db.query(Setting).all()
    res = {}
    for s in settings:
        try:
            res[s.key] = json.loads(s.value_json)
        except Exception:
            res[s.key] = s.value_json
    return res


@router.put("/system/settings/{key}")
def update_setting(
    key: str,
    payload: Dict[str, Any] = Body(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        setting = Setting(key=key, value_json=json.dumps(payload))
        db.add(setting)
    else:
        setting.value_json = json.dumps(payload)
    db.commit()
    return {"success": True, "key": key, "message": f"Setting '{key}' successfully saved."}


@router.get("/admin/check")
def admin_guard_check(admin_user: User = Depends(require_admin)):
    return {"status": "ok", "message": f"Welcome Admin: {admin_user.email}", "role": admin_user.role}


@router.get("/faculty/check")
def faculty_guard_check(faculty_user: User = Depends(require_faculty)):
    return {"status": "ok", "message": f"Welcome Faculty: {faculty_user.email}", "role": faculty_user.role}
