import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import AuditLog, User
from ..deps import require_admin

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("")
def get_audit_logs(
    action_type: Optional[str] = Query(None, description="Filter by category: all, ai, allocation, swap, system"),
    search: Optional[str] = Query(None, description="Search keyword in action or details"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieves immutable audit trail with category and search filtering."""
    query = db.query(AuditLog).outerjoin(User, AuditLog.actor_user_id == User.id)

    if action_type and action_type != "all":
        if action_type == "ai":
            query = query.filter(AuditLog.action.like("AI_%"))
        elif action_type == "allocation":
            query = query.filter(
                (AuditLog.action.like("%ALLOCATION%")) | (AuditLog.action.like("%SOLVER%"))
            )
        elif action_type == "swap":
            query = query.filter(AuditLog.action.like("%SWAP%"))
        elif action_type == "system":
            query = query.filter(
                (AuditLog.action.like("%SYSTEM%")) | (AuditLog.action.like("%RESET%")) | (AuditLog.action.like("%IMPORT%"))
            )
        else:
            query = query.filter(AuditLog.action.ilike(f"%{action_type}%"))

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (AuditLog.action.ilike(s)) |
            (AuditLog.details_json.ilike(s)) |
            (User.email.ilike(s))
        )

    total = query.count()
    logs = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit).all()

    formatted = []
    for l in logs:
        actor_name = "System / Automated"
        actor_email = "system"
        if l.actor_user:
            actor_email = l.actor_user.email
            actor_name = l.actor_user.faculty.name if l.actor_user.faculty else l.actor_user.email.split("@")[0]

        # Parse details preview
        summary = ""
        if l.details_json:
            try:
                parsed = json.loads(l.details_json)
                if isinstance(parsed, dict):
                    summary = parsed.get("summary") or parsed.get("message") or str(parsed)
                else:
                    summary = str(parsed)
            except Exception:
                summary = l.details_json[:120]

        formatted.append({
            "id": l.id,
            "action": l.action,
            "actor_id": l.actor_user_id,
            "actor_name": actor_name,
            "actor_email": actor_email,
            "details_json": l.details_json,
            "summary": summary,
            "created_at": l.created_at.isoformat(),
        })

    return {
        "success": True,
        "total": total,
        "limit": limit,
        "offset": offset,
        "logs": formatted,
    }

