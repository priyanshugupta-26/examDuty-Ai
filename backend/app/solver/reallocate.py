from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from .cp_solver import (
    FacultyInput,
    SlotInput,
    UnavailabilityInput,
    SolverSettings,
    SolverResult,
    run_cp_sat_solver,
)


class ChangeDiff(BaseModel):
    slot_id: str
    exam_hall_id: int
    exam_id: int
    hall_id: int
    date: str
    session: str
    old_faculty_id: Optional[int] = None
    new_faculty_id: int
    old_faculty_name: Optional[str] = None
    new_faculty_name: str
    reason: str


class ReallocateResult(BaseModel):
    success: bool
    status: str
    diff: List[ChangeDiff] = []
    affected_slots_count: int = 0
    solver_result: SolverResult


def reallocate_minimal(
    faculty_list: List[FacultyInput],
    slots: List[SlotInput],
    unavailabilities: List[UnavailabilityInput],
    vacated_faculty_id: Optional[int] = None,
    affected_date: Optional[str] = None,
    affected_session: Optional[str] = None,
    settings: Optional[SolverSettings] = None,
) -> ReallocateResult:
    """
    Minimally re-solves duty allocations by freezing all unaffected slots
    and only allocating the affected slots (e.g. vacated due to illness/leave).
    """
    if settings is None:
        settings = SolverSettings()

    faculty_map = {f.id: f for f in faculty_list}

    # Step 1: Identify affected slots and freeze all unaffected slots
    realloc_slots: List[SlotInput] = []
    affected_slots_ids = set()

    for s in slots:
        is_affected = False
        
        # Check if slot was assigned to the vacated faculty
        if vacated_faculty_id is not None and s.previous_faculty_id == vacated_faculty_id:
            if affected_date is None or s.date == affected_date:
                if affected_session is None or s.session == affected_session or affected_session == "BOTH":
                    is_affected = True

        # Check if slot falls in affected date & session without assigned faculty
        if s.previous_faculty_id is None:
            is_affected = True

        new_slot = s.model_copy()
        if is_affected:
            affected_slots_ids.add(s.slot_id)
            new_slot.is_locked = False
            new_slot.locked_faculty_id = None
        else:
            # Lock unaffected slots to their previous faculty
            if s.previous_faculty_id is not None:
                new_slot.is_locked = True
                new_slot.locked_faculty_id = s.previous_faculty_id

        realloc_slots.append(new_slot)

    # Step 2: Solve CP-SAT with frozen slots
    # Increase change penalty to strongly preserve original state
    settings_minimal = settings.model_copy()
    settings_minimal.change_penalty = 150

    result = run_cp_sat_solver(
        faculty_list=faculty_list,
        slots=realloc_slots,
        unavailabilities=unavailabilities,
        settings=settings_minimal,
    )

    if not result.is_feasible:
        # If strict freezing was infeasible (e.g. no single faculty can take it without a 2-hop swap),
        # unlock other slots only on that same date/session so a cascade swap can occur
        relaxed_slots: List[SlotInput] = []
        for s in realloc_slots:
            r = s.model_copy()
            if affected_date and s.date == affected_date:
                r.is_locked = False
                r.locked_faculty_id = None
            relaxed_slots.append(r)

        result = run_cp_sat_solver(
            faculty_list=faculty_list,
            slots=relaxed_slots,
            unavailabilities=unavailabilities,
            settings=settings_minimal,
        )

    if not result.is_feasible:
        return ReallocateResult(
            success=False,
            status=result.status,
            diff=[],
            affected_slots_count=len(affected_slots_ids),
            solver_result=result,
        )

    # Step 3: Compute exact assignment diff
    diff_list: List[ChangeDiff] = []
    new_alloc_map = {a.slot_id: a.faculty_id for a in result.allocations}
    orig_slots_map = {s.slot_id: s for s in slots}

    for slot_id, new_f_id in new_alloc_map.items():
        orig_s = orig_slots_map.get(slot_id)
        if not orig_s:
            continue
        
        old_f_id = orig_s.previous_faculty_id
        if old_f_id != new_f_id:
            old_name = faculty_map[old_f_id].name if old_f_id in faculty_map else None
            new_name = faculty_map[new_f_id].name if new_f_id in faculty_map else f"Faculty #{new_f_id}"
            
            reason = "Replaced unavailable faculty"
            if old_f_id == vacated_faculty_id:
                reason = f"Replaced {old_name} on leave with balanced candidate {new_name}"
            elif old_f_id is not None:
                reason = f"Cascade swap to accommodate leave"

            diff_list.append(
                ChangeDiff(
                    slot_id=slot_id,
                    exam_hall_id=orig_s.exam_hall_id,
                    exam_id=orig_s.exam_id,
                    hall_id=orig_s.hall_id,
                    date=orig_s.date,
                    session=orig_s.session,
                    old_faculty_id=old_f_id,
                    new_faculty_id=new_f_id,
                    old_faculty_name=old_name,
                    new_faculty_name=new_name,
                    reason=reason,
                )
            )

    return ReallocateResult(
        success=True,
        status=result.status,
        diff=diff_list,
        affected_slots_count=len(diff_list),
        solver_result=result,
    )

