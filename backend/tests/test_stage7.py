import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, Base, engine, SessionLocal
from app.seed import reset_and_seed_demo_data

client = TestClient(app)


def get_admin_token():
    res = client.post("/api/auth/login", json={"email": "admin@vfstr.ac.in", "password": "admin123"})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def test_admin_dashboard_endpoint():
    token = get_admin_token()
    res = client.get("/api/system/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "stats" in data
    assert data["stats"]["total_faculty"] >= 40
    assert data["stats"]["total_halls"] >= 12
    assert data["stats"]["total_exams"] >= 25
    assert "allocation_health" in data
    assert data["allocation_health"]["conflicts_count"] == 0
    assert data["allocation_health"]["fairness_score"] > 80
    assert "fairness_chart" in data
    assert len(data["fairness_chart"]["bars"]) > 0
    assert "upcoming_sessions" in data
    assert "recent_activity" in data


def test_reports_summary_endpoint():
    token = get_admin_token()
    res = client.get("/api/reports/summary", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "fairness" in data
    assert data["fairness"]["fairness_score"] == 95
    assert data["fairness"]["min_duties"] <= data["fairness"]["max_duties"]
    assert "department_summary" in data
    assert len(data["department_summary"]) >= 5
    assert "faculty_workload" in data
    assert len(data["faculty_workload"]) >= 40


def test_reports_export_excel_endpoint():
    token = get_admin_token()
    res = client.get("/api/reports/export-excel", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert "spreadsheetml.sheet" in res.headers.get("content-type", "")
    assert len(res.content) > 1000  # Valid non-empty Excel workbook


def test_audit_logs_endpoint_and_filters():
    token = get_admin_token()
    # 1. All logs
    res = client.get("/api/audit-logs?limit=50", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["total"] > 0
    assert len(data["logs"]) > 0

    # 2. Filter by category
    res_ai = client.get("/api/audit-logs?action_type=ai", headers={"Authorization": f"Bearer {token}"})
    assert res_ai.status_code == 200
    assert res_ai.json()["success"] is True

    res_alloc = client.get("/api/audit-logs?action_type=allocation", headers={"Authorization": f"Bearer {token}"})
    assert res_alloc.status_code == 200
    assert res_alloc.json()["success"] is True


def test_settings_and_reset_demo_flow():
    token = get_admin_token()
    # 1. Query settings
    res = client.get("/api/system/settings", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    settings = res.json()
    assert "solver_settings" in settings
    assert "instructions" in settings

    # 2. Update setting
    res_up = client.put(
        "/api/system/settings/solver_settings",
        json={"students_per_invigilator": 32, "avoid_own_department": True, "fairness_weight": 0.6},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_up.status_code == 200
    assert res_up.json()["success"] is True

    # 3. Reset demo data
    res_reset = client.post("/api/system/reset-demo", headers={"Authorization": f"Bearer {token}"})
    assert res_reset.status_code == 200
    reset_data = res_reset.json()
    assert reset_data["success"] is True

    # 4. Verify allocations exist in draft state
    res_alloc = client.get("/api/allocation", headers={"Authorization": f"Bearer {token}"})
    assert res_alloc.status_code == 200
    alloc_data = res_alloc.json()
    assert alloc_data["total_allocations"] == 61
    assert alloc_data["is_published"] is False  # Must be unpublished draft
    assert all(a["status"] == "draft" for a in alloc_data["allocations"])
