from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Allocation
from ..deps import get_current_user, require_admin
from ..agent.gemini_agent import run_assistant_agent
from ..agent.tools import (
    apply_reallocation_diff,
    undo_last_reallocation,
    explain_assignment,
    _PENDING_CONFIRMATIONS,
    _UNDO_STACK,
)

router = APIRouter(prefix="/assistant", tags=["ai_assistant"])


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None


class ConfirmRequest(BaseModel):
    pending_action_id: str


class ExplainRequest(BaseModel):
    allocation_id: int


@router.post("/chat")
def chat_with_assistant(
    req: ChatRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    if not req.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "EmptyMessage", "message": "Message cannot be empty."}
        )

    result = run_assistant_agent(
        db=db,
        user_prompt=req.message,
        history=req.history,
        actor_user_id=current_user.id
    )

    return result


@router.post("/confirm")
def confirm_pending_action(
    req: ConfirmRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    pending = _PENDING_CONFIRMATIONS.get(req.pending_action_id)
    if not pending:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NotFound", "message": "Pending action expired or not found."}
        )

    diff = pending.get("diff", [])
    res = apply_reallocation_diff(db, diff, actor_user_id=current_user.id)
    del _PENDING_CONFIRMATIONS[req.pending_action_id]

    return {
        "success": True,
        "message": res.get("message", "Changes successfully applied to schedule."),
        "applied_count": res.get("applied_count", 0),
        "can_undo": len(_UNDO_STACK) > 0,
    }


@router.post("/cancel")
def cancel_pending_action(
    req: ConfirmRequest,
    current_user: User = Depends(require_admin)
):
    if req.pending_action_id in _PENDING_CONFIRMATIONS:
        del _PENDING_CONFIRMATIONS[req.pending_action_id]
    return {"success": True, "message": "Pending changes discarded."}


@router.post("/undo")
def undo_action(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    res = undo_last_reallocation(db, actor_user_id=current_user.id)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "UndoFailed", "message": res.get("message", "Nothing to undo.")}
        )

    return {
        "success": True,
        "message": res.get("message"),
        "can_undo": len(_UNDO_STACK) > 0,
    }


@router.get("/explain-duty/{allocation_id}")
def explain_duty(
    allocation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Faculty-facing endpoint for 'Why did I get this duty?'."""
    alloc = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not alloc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NotFound", "message": "Duty allocation not found."}
        )

    # Faculty can only inspect their own duties, admin can inspect any
    if current_user.role == "faculty" and current_user.faculty_id != alloc.faculty_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Forbidden", "message": "You can only inspect your own assigned duties."}
        )

    res = explain_assignment(db, allocation_id=allocation_id, actor_user_id=current_user.id)
    return res
