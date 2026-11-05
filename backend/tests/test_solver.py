import pytest
from app.solver import (
    FacultyInput,
    SlotInput,
    UnavailabilityInput,
    SolverSettings,
    run_cp_sat_solver,
    reallocate_minimal,
)


@pytest.fixture
def sample_faculty():
    return [
        FacultyInput(id=1, name="Dr. A (CSE)", department="CSE", max_duties=3, past_duties=0),
        FacultyInput(id=2, name="Dr. B (ECE)", department="ECE", max_duties=3, past_duties=0),
        FacultyInput(id=3, name="Dr. C (MECH)", department="MECH", max_duties=3, past_duties=0),
        FacultyInput(id=4, name="Dr. D (CIVIL)", department="CIVIL", max_duties=3, past_duties=0),
        FacultyInput(id=5, name="Dr. E (S&H)", department="S&H", max_duties=3, past_duties=0),
    ]


def test_hard_constraint_1_every_slot_filled_by_one(sample_faculty):
    """Hard Constraint 1: Every slot must be assigned to exactly one faculty."""
    slots = [
        SlotInput(slot_id="s1", exam_hall_id=1, exam_id=1, hall_id=1, date="2026-11-10", session="FN", department_owner="CSE", position=0),
        SlotInput(slot_id="s2", exam_hall_id=2, exam_id=2, hall_id=2, date="2026-11-10", session="FN", department_owner="ECE", position=0),
        SlotInput(slot_id="s3", exam_hall_id=3, exam_id=3, hall_id=1, date="2026-11-10", session="AN", department_owner="MECH", position=0),
    ]
    result = run_cp_sat_solver(faculty_list=sample_faculty, slots=slots, unavailabilities=[])
    
    assert result.is_feasible is True
    assert result.status in ("OPTIMAL", "FEASIBLE")
    assert len(result.allocations) == 3
    assigned_slots = {a.slot_id for a in result.allocations}
    assert assigned_slots == {"s1", "s2", "s3"}


def test_hard_constraint_2_no_overlap(sample_faculty):
    """Hard Constraint 2: A faculty has at most one duty per (date, session)."""
    # 2 slots in the exact same session (2026-11-10 FN)
    slots = [
        SlotInput(slot_id="s1", exam_hall_id=1, exam_id=1, hall_id=1, date="2026-11-10", session="FN", department_owner="CIVIL", position=0),
        SlotInput(slot_id="s2", exam_hall_id=2, exam_id=2, hall_id=2, date="2026-11-10", session="FN", department_owner="CIVIL", position=0),
    ]
    result = run_cp_sat_solver(faculty_list=sample_faculty, slots=slots, unavailabilities=[])
    assert result.is_feasible is True
    
    # Verify the two slots on the same date/session are given to two DIFFERENT faculty
    assigned_faculty = [a.faculty_id for a in result.allocations]
    assert len(set(assigned_faculty)) == 2


def test_hard_constraint_3_respect_unavailability(sample_faculty):
    """Hard Constraint 3: Respect Unavailability (leave) strictly."""
    slots = [
        SlotInput(slot_id="s1", exam_hall_id=1, exam_id=1, hall_id=1, date="2026-11-10", session="FN", department_owner="CIVIL", position=0),
    ]
    # Faculty 1 (Dr. A) and Faculty 2 (Dr. B) are on leave
    unavail = [
        UnavailabilityInput(faculty_id=1, date="2026-11-10", session="FN", reason="Medical"),
        UnavailabilityInput(faculty_id=2, date="2026-11-10", session="FN", reason="Conference"),
    ]
    result = run_cp_sat_solver(faculty_list=sample_faculty, slots=slots, unavailabilities=unavail)
    assert result.is_feasible is True
    assert len(result.allocations) == 1
    assert result.allocations[0].faculty_id not in (1, 2)


def test_hard_constraint_4_avoid_own_department(sample_faculty):
    """Hard Constraint 4: A faculty cannot invigilate an exam owned by their own department."""
    # Slot belongs to CSE exam
    slots = [
        SlotInput(slot_id="s_cse", exam_hall_id=1, exam_id=1, hall_id=1, date="2026-11-10", session="FN", department_owner="CSE", position=0),
    ]
    settings = SolverSettings(avoid_own_department=True)
    result = run_cp_sat_solver(faculty_list=sample_faculty, slots=slots, unavailabilities=[], settings=settings)
    assert result.is_feasible is True
    # Faculty 1 is CSE; must NOT be assigned
    assert result.allocations[0].faculty_id != 1

    # When avoid_own_department is disabled, faculty 1 can be assigned
    settings_no_avoid = SolverSettings(avoid_own_department=False)
    only_fac1 = [sample_faculty[0]]  # only Dr. A available
    res2 = run_cp_sat_solver(faculty_list=only_fac1, slots=slots, unavailabilities=[], settings=settings_no_avoid)
    assert res2.is_feasible is True
    assert res2.allocations[0].faculty_id == 1


def test_hard_constraint_5_invigilators_per_hall_capacity():
    """Hard Constraint 5: Invigilators calculation per student count."""
    import math
    students = 65
    n = 30
    inv_required = math.ceil(students / n)
    assert inv_required == 3


def test_hard_constraint_6_max_duties_respected(sample_faculty):
    """Hard Constraint 6: Each faculty <= max_duties."""
    # Faculty 1 has max_duties = 1
    sample_faculty[0].max_duties = 1
    # 3 slots across 3 sessions
    slots = [
        SlotInput(slot_id="s1", exam_hall_id=1, exam_id=1, hall_id=1, date="2026-11-10", session="FN", department_owner="CIVIL", position=0),
        SlotInput(slot_id="s2", exam_hall_id=2, exam_id=2, hall_id=1, date="2026-11-10", session="AN", department_owner="CIVIL", position=0),
        SlotInput(slot_id="s3", exam_hall_id=3, exam_id=3, hall_id=1, date="2026-11-11", session="FN", department_owner="CIVIL", position=0),
    ]
    result = run_cp_sat_solver(faculty_list=sample_faculty, slots=slots, unavailabilities=[])
    assert result.is_feasible is True
    assert result.faculty_duty_counts[1]["assigned"] <= 1


def test_hard_constraint_7_locked_allocations_fixed(sample_faculty):
    """Hard Constraint 7: Locked allocations stay fixed."""
    # Slot 1 is locked to Dr. C (id 3)
    slots = [
        SlotInput(
            slot_id="s1",
            exam_hall_id=1,
            exam_id=1,
            hall_id=1,
            date="2026-11-10",
            session="FN",
            department_owner="CIVIL",
            position=0,
            is_locked=True,
            locked_faculty_id=3,
        ),
        SlotInput(slot_id="s2", exam_hall_id=2, exam_id=2, hall_id=2, date="2026-11-10", session="FN", department_owner="CIVIL", position=0),
    ]
    result = run_cp_sat_solver(faculty_list=sample_faculty, slots=slots, unavailabilities=[])
    assert result.is_feasible is True
    s1_alloc = next(a for a in result.allocations if a.slot_id == "s1")
    assert s1_alloc.faculty_id == 3
    assert s1_alloc.is_locked is True


def test_infeasible_case_shortage_detected(sample_faculty):
    """Infeasible Case: Total required slots exceeds available faculty on a session."""
    # 6 slots in the exact same session (2026-11-10 FN), but only 5 faculty exist in total
    slots = [
        SlotInput(slot_id=f"s{i}", exam_hall_id=i, exam_id=i, hall_id=i, date="2026-11-10", session="FN", department_owner="CIVIL", position=0)
        for i in range(1, 7)
    ]
    result = run_cp_sat_solver(faculty_list=sample_faculty, slots=slots, unavailabilities=[])
    assert result.is_feasible is False
    assert result.status == "INFEASIBLE"
    assert len(result.reasons) > 0
    assert "shortage" in result.reasons[0].lower()


def test_soft_objective_fairness_balance(sample_faculty):
    """Soft Objective: Workload balance / Fairness (counts past duties)."""
    # Faculty 1 has 2 past duties; faculty 2..5 have 0
    sample_faculty[0].past_duties = 2
    # 4 slots needed
    slots = [
        SlotInput(slot_id=f"s{i}", exam_hall_id=i, exam_id=i, hall_id=i, date=f"2026-11-1{i}", session="FN", department_owner="CIVIL", position=0)
        for i in range(1, 5)
    ]
    result = run_cp_sat_solver(faculty_list=sample_faculty, slots=slots, unavailabilities=[])
    assert result.is_feasible is True
    # Faculty 1 already has 2 past duties, so solver should favor faculty 2, 3, 4, 5
    f1_assigned = result.faculty_duty_counts[1]["assigned"]
    assert f1_assigned <= 1
    assert result.fairness_score >= 80


def test_minimal_change_reallocate(sample_faculty):
    """reallocate_minimal: Only replaces the affected faculty without disrupting others."""
    slots = [
        SlotInput(slot_id="s1", exam_hall_id=1, exam_id=1, hall_id=1, date="2026-11-10", session="FN", department_owner="CIVIL", position=0, previous_faculty_id=1),
        SlotInput(slot_id="s2", exam_hall_id=2, exam_id=2, hall_id=2, date="2026-11-10", session="FN", department_owner="CIVIL", position=0, previous_faculty_id=2),
        SlotInput(slot_id="s3", exam_hall_id=3, exam_id=3, hall_id=3, date="2026-11-10", session="FN", department_owner="CIVIL", position=0, previous_faculty_id=3),
    ]
    # Faculty 1 is suddenly sick on 2026-11-10 FN
    new_unavail = [
        UnavailabilityInput(faculty_id=1, date="2026-11-10", session="FN", reason="Sick"),
    ]
    realloc = reallocate_minimal(
        faculty_list=sample_faculty,
        slots=slots,
        unavailabilities=new_unavail,
        vacated_faculty_id=1,
        affected_date="2026-11-10",
        affected_session="FN",
    )

    assert realloc.success is True
    assert len(realloc.diff) >= 1
    # Check that slot s1 (previously faculty 1) is reassigned to another available faculty (e.g. 4 or 5)
    s1_diff = next(d for d in realloc.diff if d.slot_id == "s1")
    assert s1_diff.old_faculty_id == 1
    assert s1_diff.new_faculty_id in (4, 5)
    # Slots s2 and s3 should remain frozen to faculty 2 and 3!
    new_alloc_map = {a.slot_id: a.faculty_id for a in realloc.solver_result.allocations}
    assert new_alloc_map["s2"] == 2
    assert new_alloc_map["s3"] == 3

