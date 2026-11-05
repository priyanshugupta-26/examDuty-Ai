import io
import re
from typing import Dict, Any, List, Tuple
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
import pandas as pd


HEADER_FILL = PatternFill(start_color="3B5BDB", end_color="3B5BDB", fill_type="solid")
HEADER_FONT = Font(name="Arial", size=10, bold=True, color="FFFFFF")
EXAMPLE_FILL = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
THIN_BORDER = Border(
    left=Side(style="thin", color="E2E8F0"),
    right=Side(style="thin", color="E2E8F0"),
    top=Side(style="thin", color="E2E8F0"),
    bottom=Side(style="thin", color="E2E8F0"),
)

TEMPLATES_SPEC = {
    "faculty": {
        "columns": [
            "faculty_code", "name", "department", "designation", "email", "phone", "max_duties", "past_duties"
        ],
        "example_rows": [
            ["VF-CSE-101", "Dr. A. Sharma", "CSE", "Associate Professor", "a.sharma@vfstr.ac.in", "+91 98480 11999", 5, 1],
            ["VF-ECE-102", "Dr. B. Verma", "ECE", "Assistant Professor", "b.verma@vfstr.ac.in", "+91 98480 12999", 5, 0],
            ["VF-MEC-103", "Prof. C. Reddy", "MECH", "Professor", "c.reddy@vfstr.ac.in", "+91 98480 13999", 4, 2],
        ]
    },
    "halls": {
        "columns": [
            "name", "block", "floor", "capacity"
        ],
        "example_rows": [
            ["A-103", "A-Block", 1, 60],
            ["B-301", "B-Block", 3, 40],
            ["C-202", "C-Block", 2, 50],
        ]
    },
    "exams": {
        "columns": [
            "date", "session", "start_time", "end_time", "subject_name", "subject_code", "branch", "year", "semester", "department_owner", "hall_name", "student_count"
        ],
        "example_rows": [
            ["2026-11-15", "FN", "09:30 AM", "12:30 PM", "Cyber Security & Ethics", "21CS405", "CSE", 4, 7, "CSE", "A-101", 55],
            ["2026-11-15", "AN", "02:00 PM", "05:00 PM", "Automobile Engineering", "21ME405", "MECH", 4, 7, "MECH", "B-101", 45],
        ]
    },
    "leave": {
        "columns": [
            "faculty_code", "date", "session", "reason"
        ],
        "example_rows": [
            ["VF-CSE-001", "2026-11-13", "FN", "Attending National Conference"],
            ["VF-ECE-002", "2026-11-14", "BOTH", "Medical consultation"],
        ]
    }
}


def generate_excel_template(entity: str) -> io.BytesIO:
    """Generates a downloadable Excel template with formatting and example rows."""
    spec = TEMPLATES_SPEC.get(entity)
    if not spec:
        raise ValueError(f"Unknown entity type for template: {entity}")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"{entity.capitalize()} Template"

    columns = spec["columns"]
    examples = spec["example_rows"]

    # Write Header
    for col_idx, col_name in enumerate(columns, start=1):
        cell = ws.cell(row=1, column=col_idx, value=col_name)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = THIN_BORDER

    # Write Example Rows
    for row_idx, row_data in enumerate(examples, start=2):
        for col_idx, val in enumerate(row_data, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.fill = EXAMPLE_FILL
            cell.font = Font(name="Arial", size=9, italic=True)
            cell.border = THIN_BORDER

    # Adjust column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = col[0].column_letter
        ws.column_dimensions[col_letter].width = max(max_len + 4, 14)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


def parse_and_validate_excel(
    file_bytes: bytes,
    entity: str,
    db_context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Parses uploaded Excel workbook, verifies column layout,
    validates data rules, and returns preview rows with error reasons.
    """
    spec = TEMPLATES_SPEC.get(entity)
    if not spec:
        raise ValueError(f"Unknown entity: {entity}")

    try:
        df = pd.read_excel(io.BytesIO(file_bytes), dtype=str).fillna("")
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to parse Excel file: {str(e)}",
            "total_rows": 0,
            "valid_rows_count": 0,
            "invalid_rows_count": 0,
            "rows": []
        }

    # Normalize columns
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    expected_cols = spec["columns"]

    missing_cols = [c for c in expected_cols if c not in df.columns]
    if missing_cols:
        return {
            "success": False,
            "error": f"Missing required columns in Excel sheet: {', '.join(missing_cols)}",
            "total_rows": 0,
            "valid_rows_count": 0,
            "invalid_rows_count": 0,
            "rows": []
        }

    rows_preview = []
    valid_count = 0
    invalid_count = 0

    existing_faculty_codes = db_context.get("faculty_codes", set())
    existing_faculty_emails = db_context.get("faculty_emails", set())
    existing_hall_names = db_context.get("hall_names", set())

    seen_in_sheet: Set[str] = set()

    for idx, row in df.iterrows():
        row_num = idx + 2  # Excel 1-based, plus header row
        row_data = {c: str(row[c]).strip() for c in expected_cols}
        errors: List[str] = []

        # Validate by entity type
        if entity == "faculty":
            code = row_data.get("faculty_code", "")
            email = row_data.get("email", "")
            name = row_data.get("name", "")
            dept = row_data.get("department", "")

            if not code:
                errors.append("Faculty code is required.")
            elif code in existing_faculty_codes:
                errors.append(f"Faculty code '{code}' already exists in database.")
            elif code in seen_in_sheet:
                errors.append(f"Duplicate faculty code '{code}' in upload file.")
            seen_in_sheet.add(code)

            if not email:
                errors.append("Email is required.")
            elif not re.match(r"[^@]+@[^@]+\.[^@]+", email):
                errors.append("Invalid email format.")
            elif email in existing_faculty_emails:
                errors.append(f"Email '{email}' already registered.")

            if not name:
                errors.append("Faculty name is required.")
            if not dept:
                errors.append("Department is required.")

        elif entity == "halls":
            name = row_data.get("name", "")
            cap = row_data.get("capacity", "")
            if not name:
                errors.append("Hall name is required.")
            elif name in existing_hall_names:
                errors.append(f"Hall '{name}' already exists.")
            elif name in seen_in_sheet:
                errors.append(f"Duplicate hall name '{name}' in upload.")
            seen_in_sheet.add(name)

            try:
                c_val = int(cap)
                if c_val <= 0:
                    errors.append("Capacity must be greater than 0.")
            except ValueError:
                errors.append("Capacity must be a valid integer.")

        elif entity == "exams":
            date = row_data.get("date", "")
            sess = row_data.get("session", "").upper()
            code = row_data.get("subject_code", "")
            hall_name = row_data.get("hall_name", "")
            student_count = row_data.get("student_count", "")

            if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
                errors.append("Date must be in YYYY-MM-DD format.")
            if sess not in ("FN", "AN"):
                errors.append("Session must be either 'FN' or 'AN'.")
            if not code:
                errors.append("Subject code is required.")
            if hall_name and hall_name not in existing_hall_names:
                errors.append(f"Referenced hall '{hall_name}' does not exist in database.")
            try:
                cnt = int(student_count)
                if cnt <= 0:
                    errors.append("Student count must be greater than 0.")
            except ValueError:
                errors.append("Student count must be a number.")

        elif entity == "leave":
            code = row_data.get("faculty_code", "")
            date = row_data.get("date", "")
            sess = row_data.get("session", "").upper()

            if not code or code not in existing_faculty_codes:
                errors.append(f"Faculty code '{code}' not found in active faculty database.")
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
                errors.append("Date must be in YYYY-MM-DD format.")
            if sess not in ("FN", "AN", "BOTH"):
                errors.append("Session must be 'FN', 'AN', or 'BOTH'.")

        is_valid = len(errors) == 0
        if is_valid:
            valid_count += 1
        else:
            invalid_count += 1

        rows_preview.append({
            "row_number": row_num,
            "data": row_data,
            "is_valid": is_valid,
            "errors": errors,
        })

    return {
        "success": True,
        "total_rows": len(rows_preview),
        "valid_rows_count": valid_count,
        "invalid_rows_count": invalid_count,
        "rows": rows_preview,
    }

