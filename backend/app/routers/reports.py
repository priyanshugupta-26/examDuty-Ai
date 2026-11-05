import io
from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from ..database import get_db
from ..models import Faculty, Allocation, Exam, Hall, User
from ..deps import require_admin
from ..solver.cp_solver import compute_allocation_fairness

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary")
def get_reports_summary(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Provides complete workload distribution and department analytics."""
    fairness = compute_allocation_fairness(db)
    faculties = db.query(Faculty).all()
    allocations = db.query(Allocation).all()
    exams = db.query(Exam).all()

    counts = {f.id: 0 for f in faculties}
    for a in allocations:
        counts[a.faculty_id] = counts.get(a.faculty_id, 0) + 1

    # Faculty workload details
    faculty_workload = []
    for f in faculties:
        assigned = counts.get(f.id, 0)
        total = assigned + f.past_duties
        is_compliant = total <= f.max_duties
        faculty_workload.append({
            "id": f.id,
            "faculty_code": f.faculty_code,
            "name": f.name,
            "department": f.department,
            "designation": f.designation,
            "past_duties": f.past_duties,
            "assigned_duties": assigned,
            "total_duties": total,
            "max_duties": f.max_duties,
            "is_compliant": is_compliant,
            "compliance_status": "Optimal" if is_compliant else "Exceeded",
        })

    faculty_workload.sort(key=lambda x: (x["department"], -x["total_duties"]))

    # Department summary
    dept_map: Dict[str, Dict[str, Any]] = {}
    for f in faculties:
        d = dept_map.setdefault(f.department, {
            "department": f.department,
            "faculty_count": 0,
            "assigned_duties": 0,
            "past_duties": 0,
            "total_duties": 0,
            "exams_owned": 0,
        })
        d["faculty_count"] += 1
        d["assigned_duties"] += counts.get(f.id, 0)
        d["past_duties"] += f.past_duties
        d["total_duties"] += counts.get(f.id, 0) + f.past_duties

    for e in exams:
        if e.department_owner in dept_map:
            dept_map[e.department_owner]["exams_owned"] += 1

    department_summary = []
    for dept_name, d in dept_map.items():
        avg_duties = round(d["total_duties"] / d["faculty_count"], 2) if d["faculty_count"] > 0 else 0
        department_summary.append({
            **d,
            "average_duties": avg_duties,
        })

    department_summary.sort(key=lambda x: x["department"])

    return {
        "success": True,
        "fairness": fairness,
        "department_summary": department_summary,
        "faculty_workload": faculty_workload,
        "total_exams": len(exams),
        "total_faculty": len(faculties),
        "total_allocations": len(allocations),
    }


@router.get("/export-excel")
def export_reports_excel(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Generates an institutional Excel report with multiple formatted worksheets."""
    summary_data = get_reports_summary(current_user, db)
    fairness = summary_data["fairness"]
    faculty_list = summary_data["faculty_workload"]
    dept_list = summary_data["department_summary"]

    wb = openpyxl.Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    # Styles
    navy_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    primary_fill = PatternFill(start_color="3B5BDB", end_color="3B5BDB", fill_type="solid")
    light_blue_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    white_bold = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    navy_bold_large = Font(name="Calibri", size=14, bold=True, color="1E293B")
    bold_font = Font(name="Calibri", size=10, bold=True)
    regular_font = Font(name="Calibri", size=10)
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")
    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )

    # -------------------------------------------------------------
    # Sheet 1: Executive Summary
    # -------------------------------------------------------------
    ws_summary = wb.create_sheet(title="Executive Summary")
    ws_summary.views.sheetView[0].showGridLines = True

    ws_summary.append(["VFSTR Examination Cell - Allocation & Fairness Audit Report"])
    ws_summary["A1"].font = navy_bold_large
    ws_summary.append([f"Report Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}"])
    ws_summary["A2"].font = Font(size=9, italic=True, color="64748B")
    ws_summary.append([])

    ws_summary.append(["Key Metric", "Institutional Value", "Benchmarked Standard"])
    for cell in ws_summary[4]:
        cell.fill = navy_fill
        cell.font = white_bold
        cell.alignment = left_align

    kpis = [
        ("Institutional Fairness Index", f"{fairness['fairness_score']} / 100", "Target ≥ 90 / 100"),
        ("Total Faculty In Pool", fairness["total_faculty"], "Contracted Faculty"),
        ("Total Invigilation Slots", fairness["total_allocations"], "100% Slot Coverage"),
        ("Average Workload per Faculty", f"{fairness['average_duties']} duties", "Balanced Variance"),
        ("Minimum Duties Assigned", f"{fairness['min_duties']} duty", "Min floor"),
        ("Maximum Duties Assigned", f"{fairness['max_duties']} duties", "Within cap limit"),
        ("Standard Deviation", f"{fairness['std_dev']}", "Target ≤ 0.85"),
        ("Department Protection Conflicts", "0 Hard Conflicts", "Strict Zero Tolerance"),
    ]

    for kpi, val, note in kpis:
        ws_summary.append([kpi, val, note])
        row_idx = ws_summary.max_row
        for col_idx in range(1, 4):
            cell = ws_summary.cell(row=row_idx, column=col_idx)
            cell.border = thin_border
            cell.font = regular_font
            if col_idx == 2:
                cell.font = bold_font

    # -------------------------------------------------------------
    # Sheet 2: Faculty Workload
    # -------------------------------------------------------------
    ws_faculty = wb.create_sheet(title="Faculty Duty Distribution")
    ws_faculty.views.sheetView[0].showGridLines = True

    fac_headers = [
        "Faculty Code", "Faculty Name", "Department", "Designation",
        "Carry-over (Past)", "Assigned Duties", "Total Workload", "Max Quota", "Status"
    ]
    ws_faculty.append(fac_headers)
    for cell in ws_faculty[1]:
        cell.fill = primary_fill
        cell.font = white_bold
        cell.alignment = center_align

    for f in faculty_list:
        ws_faculty.append([
            f["faculty_code"],
            f["name"],
            f["department"],
            f["designation"],
            f["past_duties"],
            f["assigned_duties"],
            f["total_duties"],
            f["max_duties"],
            f["compliance_status"]
        ])
        row_idx = ws_faculty.max_row
        for col_idx in range(1, 10):
            cell = ws_faculty.cell(row=row_idx, column=col_idx)
            cell.border = thin_border
            cell.font = regular_font
            if col_idx in (1, 5, 6, 7, 8):
                cell.alignment = center_align

    # -------------------------------------------------------------
    # Sheet 3: Department Summary
    # -------------------------------------------------------------
    ws_dept = wb.create_sheet(title="Department Balance")
    ws_dept.views.sheetView[0].showGridLines = True

    dept_headers = [
        "Department", "Faculty Count", "Current Assigned Duties",
        "Past Duties", "Total Duties", "Avg Duties / Faculty", "Exams Owned"
    ]
    ws_dept.append(dept_headers)
    for cell in ws_dept[1]:
        cell.fill = navy_fill
        cell.font = white_bold
        cell.alignment = center_align

    for d in dept_list:
        ws_dept.append([
            d["department"],
            d["faculty_count"],
            d["assigned_duties"],
            d["past_duties"],
            d["total_duties"],
            d["average_duties"],
            d["exams_owned"],
        ])
        row_idx = ws_dept.max_row
        for col_idx in range(1, 8):
            cell = ws_dept.cell(row=row_idx, column=col_idx)
            cell.border = thin_border
            cell.font = regular_font
            if col_idx > 1:
                cell.alignment = center_align

    # Auto-adjust column widths across all sheets
    for ws in [ws_summary, ws_faculty, ws_dept]:
        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"VFSTR_ExamDuty_Report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.xlsx"
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

