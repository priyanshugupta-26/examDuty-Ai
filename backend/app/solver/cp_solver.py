import math
import time
import os
from typing import List, Dict, Any, Optional, Set, Tuple
from pydantic import BaseModel
from ortools.sat.python import cp_model


class FacultyInput(BaseModel):
    id: int
    name: str
    department: str
    max_duties: int = 5
    past_duties: int = 0
    faculty_code: Optional[str] = None


class SlotInput(BaseModel):
    slot_id: str  # e.g. "examhall_1_pos_0"
    exam_hall_id: int
    exam_id: int
    hall_id: int
    date: str  # YYYY-MM-DD
    session: str  # FN | AN
    department_owner: str
    position: int = 0
    is_locked: bool = False
    locked_faculty_id: Optional[int] = None
    previous_faculty_id: Optional[int] = None


class UnavailabilityInput(BaseModel):
    faculty_id: int
    date: str
    session: str  # FN | AN | BOTH
    reason: Optional[str] = None


class SolverSettings(BaseModel):
    students_per_invigilator: int = 30
    avoid_own_department: bool = True
    avoid_back_to_back: bool = True
    fairness_weight: float = 0.5
    back_to_back_penalty: int = 15
    change_penalty: int = 80
    time_limit_seconds: float = 20.0
    num_workers: int = 8


class SlotAssignment(BaseModel):
    slot_id: str
    exam_hall_id: int
    exam_id: int
    hall_id: int
    position: int
    faculty_id: int
    is_locked: bool = False


class SolverResult(BaseModel):
    status: str  # OPTIMAL | FEASIBLE | INFEASIBLE | UNKNOWN
    is_feasible: bool
    objective_value: Optional[float] = None
    execution_time_ms: int
    allocations: List[SlotAssignment] = []
    faculty_duty_counts: Dict[int, Dict[str, int]] = {}
    fairness_score: int = 100  # 0 to 100
    conflicts_count: int = 0
    unfilled_slots: List[str] = []
    reasons: List[str] = []


def calculate_fairness_score(duty_totals: List[int]) -> int:
    """Calculates a 0-100 fairness score where 100 is perfectly balanced."""
    if not duty_totals or len(duty_totals) <= 1:
        return 100
    min_d = min(duty_totals)
    max_d = max(duty_totals)
    spread = max_d - min_d
    if spread == 0:
        return 100
    if spread == 1:
        return 95
    if spread == 2:
        return 88
    if spread == 3:
        return 78
    return max(0, 100 - spread * 12)


def compute_allocation_fairness(db: Any) -> Dict[str, Any]:
    """
    Canonical, single shared function to compute official institutional fairness metrics
    and score from the database. Ensures identical values across Allocation page,
    Assistant agent, Validation panel, Reports, and System Stats.
    """
    from ..models import Faculty, Allocation

    faculties = db.query(Faculty).all()
    allocations = db.query(Allocation).all()

    if not faculties:
        return {
            "success": True,
            "fairness_score": 100,
            "total_faculty": 0,
            "total_allocations": 0,
            "average_duties": 0.0,
            "min_duties": 0,
            "max_duties": 0,
            "std_dev": 0.0,
            "least_busy_faculty": [],
            "most_busy_faculty": [],
        }

    counts = {f.id: 0 for f in faculties}
    for a in allocations:
        counts[a.faculty_id] = counts.get(a.faculty_id, 0) + 1

    duty_totals = [counts[f.id] + f.past_duties for f in faculties]

    fairness_score = calculate_fairness_score(duty_totals) if allocations else 100

    min_d = min(duty_totals)
    max_d = max(duty_totals)
    avg_d = sum(duty_totals) / len(duty_totals)
    variance = sum((x - avg_d) ** 2 for x in duty_totals) / len(duty_totals)
    std_dev = variance ** 0.5

    sorted_fac = sorted(faculties, key=lambda f: counts[f.id] + f.past_duties)
    least_busy = [
        {
            "id": f.id,
            "name": f.name,
            "department": f.department,
            "code": f.faculty_code,
            "duties": counts[f.id],
            "total_workload": counts[f.id] + f.past_duties,
        }
        for f in sorted_fac[:4]
    ]
    most_busy = [
        {
            "id": f.id,
            "name": f.name,
            "department": f.department,
            "code": f.faculty_code,
            "duties": counts[f.id],
            "total_workload": counts[f.id] + f.past_duties,
        }
        for f in reversed(sorted_fac[-4:])
    ]

    return {
        "success": True,
        "fairness_score": fairness_score,
        "total_faculty": len(faculties),
        "total_allocations": len(allocations),
        "average_duties": round(avg_d, 2),
        "min_duties": min_d,
        "max_duties": max_d,
        "std_dev": round(std_dev, 2),
        "least_busy_faculty": least_busy,
        "most_busy_faculty": most_busy,
    }


def run_cp_sat_solver(
    faculty_list: List[FacultyInput],
    slots: List[SlotInput],
    unavailabilities: List[UnavailabilityInput],
    settings: Optional[SolverSettings] = None,
) -> SolverResult:
    start_time = time.time()
    if settings is None:
        settings = SolverSettings()

    if not slots:
        return SolverResult(
            status="FEASIBLE",
            is_feasible=True,
            execution_time_ms=int((time.time() - start_time) * 1000),
            allocations=[],
            faculty_duty_counts={f.id: {"assigned": 0, "past": f.past_duties, "total": f.past_duties, "max": f.max_duties} for f in faculty_list},
            fairness_score=100,
            conflicts_count=0
        )

    # 1. Feasibility Pre-checks for diagnostics
    unavail_map: Set[Tuple[int, str, str]] = set()
    for u in unavailabilities:
        if u.session == "BOTH":
            unavail_map.add((u.faculty_id, u.date, "FN"))
            unavail_map.add((u.faculty_id, u.date, "AN"))
        else:
            unavail_map.add((u.faculty_id, u.date, u.session))

    faculty_by_id = {f.id: f for f in faculty_list}

    # Group slots by (date, session)
    slots_by_session: Dict[Tuple[str, str], List[SlotInput]] = {}
    for s in slots:
        slots_by_session.setdefault((s.date, s.session), []).append(s)

    # Diagnostic checks
    reasons: List[str] = []
    unfilled: List[str] = []

    # Check total slots vs total max duties capacity
    total_slots = len(slots)
    total_capacity = sum(f.max_duties for f in faculty_list)
    if total_slots > total_capacity:
        reasons.append(
            f"Total slots required ({total_slots}) exceeds total faculty max capacity ({total_capacity})."
        )

    # Check each session for faculty shortage
    for (d, sess), session_slots in slots_by_session.items():
        needed = len(session_slots)
        available_count = 0
        for f in faculty_list:
            if (f.id, d, sess) in unavail_map:
                continue
            if settings.avoid_own_department:
                # Can this faculty invigilate AT LEAST ONE slot in this session?
                can_invigilate_any = any(s.department_owner != f.department for s in session_slots)
                if not can_invigilate_any:
                    continue
            available_count += 1
        
        if available_count < needed:
            msg = (
                f"Session shortage on {d} {sess}: {needed} invigilators required, "
                f"but only {available_count} faculty are available "
                f"(considering leave and department conflict rules)."
            )
            reasons.append(msg)
            unfilled.extend([s.slot_id for s in session_slots])

    if reasons:
        elapsed_ms = int((time.time() - start_time) * 1000)
        return SolverResult(
            status="INFEASIBLE",
            is_feasible=False,
            execution_time_ms=elapsed_ms,
            allocations=[],
            faculty_duty_counts={f.id: {"assigned": 0, "past": f.past_duties, "total": f.past_duties, "max": f.max_duties} for f in faculty_list},
            fairness_score=0,
            conflicts_count=len(unfilled),
            unfilled_slots=unfilled,
            reasons=reasons,
        )

    # 2. Build OR-Tools CP-SAT Model
    model = cp_model.CpModel()

    # Decision variables: x[(faculty_id, slot_id)] -> BoolVar
    x: Dict[Tuple[int, str], cp_model.IntVar] = {}
    for f in faculty_list:
        for s in slots:
            var_name = f"x_f{f.id}_s{s.slot_id}"
            x[(f.id, s.slot_id)] = model.NewBoolVar(var_name)

    # HARD CONSTRAINT 1: Every slot must be filled by exactly one faculty
    for s in slots:
        model.AddExactlyOne(x[(f.id, s.slot_id)] for f in faculty_list)

    # HARD CONSTRAINT 2: No faculty overlap in the same (date, session)
    for (d, sess), session_slots in slots_by_session.items():
        for f in faculty_list:
            model.Add(sum(x[(f.id, s.slot_id)] for s in session_slots) <= 1)

    # HARD CONSTRAINT 3: Respect Unavailability strictly
    for s in slots:
        for f in faculty_list:
            if (f.id, s.date, s.session) in unavail_map:
                model.Add(x[(f.id, s.slot_id)] == 0)

    # HARD CONSTRAINT 4: Avoid own department (configurable)
    if settings.avoid_own_department:
        for s in slots:
            for f in faculty_list:
                if f.department == s.department_owner:
                    model.Add(x[(f.id, s.slot_id)] == 0)

    # HARD CONSTRAINT 6: Max duties per faculty
    for f in faculty_list:
        model.Add(sum(x[(f.id, s.slot_id)] for s in slots) <= f.max_duties)

    # HARD CONSTRAINT 7: Locked allocations stay fixed
    for s in slots:
        if s.is_locked and s.locked_faculty_id is not None:
            if s.locked_faculty_id in faculty_by_id:
                model.Add(x[(s.locked_faculty_id, s.slot_id)] == 1)
                for f in faculty_list:
                    if f.id != s.locked_faculty_id:
                        model.Add(x[(f.id, s.slot_id)] == 0)

    # 3. SOFT OBJECTIVES (Weighted Optimization)
    objective_terms = []

    # Objective A: Fairness (Minimize max_duty - min_duty with past duties carry-over)
    faculty_duties: Dict[int, cp_model.LinearExpr] = {}
    for f in faculty_list:
        assigned_duties = sum(x[(f.id, s.slot_id)] for s in slots)
        faculty_duties[f.id] = assigned_duties + f.past_duties

    max_duty_var = model.NewIntVar(0, 50, "max_duty")
    min_duty_var = model.NewIntVar(0, 50, "min_duty")

    for f in faculty_list:
        model.Add(max_duty_var >= faculty_duties[f.id])
        model.Add(min_duty_var <= faculty_duties[f.id])

    duty_spread = model.NewIntVar(0, 50, "duty_spread")
    model.Add(duty_spread == max_duty_var - min_duty_var)

    # Average duty calculation for quadratic/deviation smoothing
    total_slots_and_past = total_slots + sum(f.past_duties for f in faculty_list)
    avg_duty_float = total_slots_and_past / len(faculty_list)
    avg_target = round(avg_duty_float)

    deviation_vars = []
    for f in faculty_list:
        dev = model.NewIntVar(-50, 50, f"dev_{f.id}")
        model.Add(dev == faculty_duties[f.id] - avg_target)
        abs_dev = model.NewIntVar(0, 50, f"abs_dev_{f.id}")
        model.AddAbsEquality(abs_dev, dev)
        deviation_vars.append(abs_dev)

    fairness_scale = int(settings.fairness_weight * 100)
    # Weight on spread and deviations
    objective_terms.append(duty_spread * (fairness_scale * 4))
    objective_terms.append(sum(deviation_vars) * (fairness_scale * 2))

    # Objective B: Penalize Back-to-Back sessions on the same day (configurable)
    if settings.avoid_back_to_back:
        # Group dates that have both FN and AN
        dates_with_both: Set[str] = set()
        for (d, sess) in slots_by_session.keys():
            if sess == "FN" and (d, "AN") in slots_by_session:
                dates_with_both.add(d)

        b2b_penalty_vars = []
        for d in dates_with_both:
            fn_slots = slots_by_session.get((d, "FN"), [])
            an_slots = slots_by_session.get((d, "AN"), [])
            for f in faculty_list:
                has_fn = sum(x[(f.id, s.slot_id)] for s in fn_slots)
                has_an = sum(x[(f.id, s.slot_id)] for s in an_slots)
                is_b2b = model.NewBoolVar(f"b2b_{f.id}_{d}")
                # is_b2b is 1 if both has_fn and has_an are 1
                model.Add(has_fn + has_an - 1 <= is_b2b)
                b2b_penalty_vars.append(is_b2b)

        if b2b_penalty_vars:
            objective_terms.append(sum(b2b_penalty_vars) * settings.back_to_back_penalty)

    # Objective C: Minimal Change vs previous allocation
    change_vars = []
    for s in slots:
        if s.previous_faculty_id is not None and not s.is_locked:
            prev_f = s.previous_faculty_id
            if prev_f in faculty_by_id:
                # was_kept is 1 if faculty stays prev_f
                was_kept = x[(prev_f, s.slot_id)]
                is_changed = model.NewBoolVar(f"change_{s.slot_id}")
                model.Add(is_changed == 1 - was_kept)
                change_vars.append(is_changed)

    if change_vars:
        objective_terms.append(sum(change_vars) * settings.change_penalty)

    # Minimize all objective terms
    if objective_terms:
        model.Minimize(sum(objective_terms))

    # 4. Solve with CP-SAT
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = settings.time_limit_seconds
    solver.parameters.num_workers = min(settings.num_workers, os.cpu_count() or 4)

    solve_status = solver.Solve(model)
    elapsed_ms = int((time.time() - start_time) * 1000)

    status_name = solver.StatusName(solve_status)
    if solve_status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return SolverResult(
            status=status_name,
            is_feasible=False,
            execution_time_ms=elapsed_ms,
            allocations=[],
            faculty_duty_counts={f.id: {"assigned": 0, "past": f.past_duties, "total": f.past_duties, "max": f.max_duties} for f in faculty_list},
            fairness_score=0,
            conflicts_count=len(slots),
            unfilled_slots=[s.slot_id for s in slots],
            reasons=[f"Solver returned {status_name}. The constraints could not be simultaneously satisfied."]
        )

    # 5. Extract Allocations and Statistics
    allocations_result: List[SlotAssignment] = []
    counts: Dict[int, int] = {f.id: 0 for f in faculty_list}

    for s in slots:
        assigned_faculty_id: Optional[int] = None
        for f in faculty_list:
            if solver.Value(x[(f.id, s.slot_id)]) == 1:
                assigned_faculty_id = f.id
                counts[f.id] += 1
                break
        
        if assigned_faculty_id is not None:
            allocations_result.append(
                SlotAssignment(
                    slot_id=s.slot_id,
                    exam_hall_id=s.exam_hall_id,
                    exam_id=s.exam_id,
                    hall_id=s.hall_id,
                    position=s.position,
                    faculty_id=assigned_faculty_id,
                    is_locked=s.is_locked
                )
            )

    faculty_duty_summary = {}
    total_duties_list = []
    for f in faculty_list:
        assigned = counts[f.id]
        total = assigned + f.past_duties
        total_duties_list.append(total)
        faculty_duty_summary[f.id] = {
            "assigned": assigned,
            "past": f.past_duties,
            "total": total,
            "max": f.max_duties,
        }

    fairness = calculate_fairness_score(total_duties_list)

    return SolverResult(
        status=status_name,
        is_feasible=True,
        objective_value=float(solver.ObjectiveValue()),
        execution_time_ms=elapsed_ms,
        allocations=allocations_result,
        faculty_duty_counts=faculty_duty_summary,
        fairness_score=fairness,
        conflicts_count=0,
        unfilled_slots=[],
        reasons=[],
    )

