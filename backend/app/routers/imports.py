import json
import math
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models import User, Faculty, Hall, Exam, ExamHall, Unavailability, AuditLog
from ..deps import require_admin
from ..services.excel_service import generate_excel_template, parse_and_validate_excel
from ..auth import hash_password

router = APIRouter(prefix="", tags=["excel_imports"])


class CommitRequest(BaseModel):
    rows: List[Dict[str, Any]]


@router.get("/templates/{entity}")
def download_template(entity: str):
    """Download an Excel template with proper column headers and examples."""
    try:
        stream = generate_excel_template(entity.lower())
        content = stream.getvalue()
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=VFSTR_{entity.capitalize()}_Template.xlsx"}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/import/{entity}/preview")
async def preview_import(
    entity: str,
    file: UploadFile = File(...),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Parses uploaded Excel workbook, checks business rules, and returns preview."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are supported.")

    file_bytes = await file.read()

    # Build DB context for reference checks
    db_context = {
        "faculty_codes": {f.faculty_code for f in db.query(Faculty.faculty_code).all()},
        "faculty_emails": {f.email for f in db.query(Faculty.email).all()},
        "hall_names": {h.name for h in db.query(Hall.name).all()},
    }

    try:
        preview_data = parse_and_validate_excel(file_bytes, entity.lower(), db_context)
        return preview_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process Excel: {str(e)}")


@router.post("/import/{entity}/commit")
def commit_import(
    entity: str,
    payload: CommitRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Commits validated rows to the database."""
    entity = entity.lower()
    rows = payload.rows
    if not rows:
        raise HTTPException(status_code=400, detail="No rows provided for import.")

    inserted_count = 0
    default_pass = hash_password("faculty123")

    if entity == "faculty":
        for r in rows:
            code = r.get("faculty_code", "").strip()
            email = r.get("email", "").strip().lower()
            if not code or not email:
                continue
            fac = Faculty(
                faculty_code=code,
                name=r.get("name", "").strip(),
                department=r.get("department", "").strip(),
                designation=r.get("designation", "").strip(),
                email=email,
                phone=r.get("phone", "").strip() or None,
                max_duties=int(r.get("max_duties", 5) or 5),
                past_duties=int(r.get("past_duties", 0) or 0),
            )
            db.add(fac)
            db.flush()

            user = User(
                email=email,
                password_hash=default_pass,
                role="faculty",
                faculty_id=fac.id,
                is_active=True
            )
            db.add(user)
            inserted_count += 1

    elif entity == "halls":
        for r in rows:
            name = r.get("name", "").strip()
            if not name:
                continue
            hall = Hall(
                name=name,
                block=r.get("block", "").strip(),
                floor=int(r.get("floor", 1) or 1),
                capacity=int(r.get("capacity", 40) or 40),
                is_active=True,
            )
            db.add(hall)
            inserted_count += 1

    elif entity == "exams":
        halls_by_name = {h.name: h for h in db.query(Hall).all()}
        for r in rows:
            exam = Exam(
                date=r.get("date", "").strip(),
                session=r.get("session", "").strip().upper(),
                start_time=r.get("start_time", "09:30 AM").strip(),
                end_time=r.get("end_time", "12:30 PM").strip(),
                subject_name=r.get("subject_name", "").strip(),
                subject_code=r.get("subject_code", "").strip().upper(),
                branch=r.get("branch", "General").strip(),
                year=int(r.get("year", 2) or 2),
                semester=int(r.get("semester", 3) or 3),
                department_owner=r.get("department_owner", "CSE").strip(),
            )
            db.add(exam)
            db.flush()

            hall_name = r.get("hall_name", "").strip()
            target_hall = halls_by_name.get(hall_name)
            if not target_hall:
                target_hall = db.query(Hall).first()

            std_count = int(r.get("student_count", 30) or 30)
            inv_req = max(1, math.ceil(std_count / 30))
            eh = ExamHall(
                exam_id=exam.id,
                hall_id=target_hall.id,
                student_count=std_count,
                invigilators_required=inv_req,
            )
            db.add(eh)
            inserted_count += 1

    elif entity == "leave":
        fac_by_code = {f.faculty_code: f for f in db.query(Faculty).all()}
        for r in rows:
            code = r.get("faculty_code", "").strip()
            fac = fac_by_code.get(code)
            if not fac:
                continue
            u = Unavailability(
                faculty_id=fac.id,
                date=r.get("date", "").strip(),
                session=r.get("session", "BOTH").strip().upper(),
                reason=r.get("reason", "Marked via import").strip() or None,
            )
            db.add(u)
            inserted_count += 1

    audit = AuditLog(
        actor_user_id=admin_user.id,
        action=f"IMPORT_{entity.upper()}",
        details_json=json.dumps({"committed_rows": inserted_count})
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "inserted_count": inserted_count,
        "message": f"Successfully imported and committed {inserted_count} {entity} records."
    }

