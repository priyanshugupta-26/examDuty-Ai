import os
import json
import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from ..config import settings
from .tools import (
    get_faculty_duties,
    list_conflicts,
    mark_faculty_unavailable,
    reallocate_minimal_tool,
    explain_assignment,
    find_replacement,
    send_notifications_tool,
    get_fairness_stats,
    _PENDING_CONFIRMATIONS,
    _UNDO_STACK,
)
from .fallback_parser import handle_rule_based_query

SYSTEM_PROMPT = (
    "You are the exam-cell assistant for VFSTR (Vignan's Foundation for Science, Technology & Research). "
    "Use tools; never invent data; confirm before applying bulk changes; keep replies short and clear. "
    "Always check hard constraints (no overlaps, no own-department invigilation, no leave violations)."
)


def run_assistant_agent(
    db: Session,
    user_prompt: str,
    history: Optional[List[Dict[str, str]]] = None,
    actor_user_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Executes the Exam Cell AI Assistant via Gemini function calling.
    Falls back gracefully to the deterministic rule-based parser if GEMINI_API_KEY is not set or fails.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        print("[AI ASSISTANT] GEMINI_API_KEY not set. Using deterministic rule-based parser.")
        return handle_rule_based_query(db, user_prompt, actor_user_id)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        actions_taken = []
        accumulated_diff = []

        # Tool definitions
        def tool_get_faculty_duties(faculty_name_or_id: str) -> str:
            res = get_faculty_duties(db, faculty_name_or_id, actor_user_id)
            actions_taken.append({
                "tool": "get_faculty_duties",
                "params": {"faculty": faculty_name_or_id},
                "summary": f"Retrieved {res.get('duty_count', 0)} duties for {faculty_name_or_id}"
            })
            return json.dumps(res)

        def tool_list_conflicts(date: Optional[str] = None) -> str:
            res = list_conflicts(db, date, actor_user_id)
            actions_taken.append({
                "tool": "list_conflicts",
                "params": {"date": date},
                "summary": f"Found {res.get('conflict_count', 0)} conflicts and {res.get('warning_count', 0)} warnings"
            })
            return json.dumps(res)

        def tool_mark_faculty_unavailable(faculty: str, date: str, session: str = "BOTH", reason: str = "Leave") -> str:
            res = mark_faculty_unavailable(db, faculty, date, session, reason, actor_user_id)
            actions_taken.append({
                "tool": "mark_faculty_unavailable",
                "params": {"faculty": faculty, "date": date, "session": session},
                "summary": f"Marked {faculty} unavailable on {date} ({session})"
            })
            return json.dumps(res)

        def tool_reallocate_minimal(date: Optional[str] = None, session: Optional[str] = None) -> str:
            res = reallocate_minimal_tool(db, date_str=date, session=session, actor_user_id=actor_user_id)
            actions_taken.append({
                "tool": "reallocate_minimal",
                "params": {"date": date, "session": session},
                "summary": f"CP-SAT solver: {res.get('affected_slots_count', 0)} assignment(s) changed"
            })
            if res.get("diff"):
                accumulated_diff.extend(res["diff"])
            return json.dumps(res)

        def tool_explain_assignment(allocation_id: Optional[int] = None, faculty: Optional[str] = None, date: Optional[str] = None) -> str:
            res = explain_assignment(db, allocation_id=allocation_id, faculty_name_or_id=faculty, date_str=date, actor_user_id=actor_user_id)
            actions_taken.append({
                "tool": "explain_assignment",
                "params": {"allocation_id": allocation_id, "faculty": faculty},
                "summary": "Generated fairness and constraint explanation"
            })
            return json.dumps(res)

        def tool_find_replacement(faculty: str, date: str, session: str = "FN") -> str:
            res = find_replacement(db, faculty, date, session, actor_user_id)
            actions_taken.append({
                "tool": "find_replacement",
                "params": {"faculty": faculty, "date": date, "session": session},
                "summary": f"Found {len(res.get('candidates', []))} replacement candidates"
            })
            return json.dumps(res)

        def tool_send_notifications(allocation_ids: Optional[List[int]] = None, message: Optional[str] = None) -> str:
            res = send_notifications_tool(db, allocation_ids=allocation_ids, message=message, actor_user_id=actor_user_id)
            actions_taken.append({
                "tool": "send_notifications",
                "params": {"allocation_ids": allocation_ids},
                "summary": f"Dispatched {res.get('notifications_sent', 0)} notifications"
            })
            return json.dumps(res)

        def tool_get_fairness_stats() -> str:
            res = get_fairness_stats(db, actor_user_id)
            actions_taken.append({
                "tool": "get_fairness_stats",
                "params": {},
                "summary": f"Fairness index: {res.get('fairness_score')}/100"
            })
            return json.dumps(res)

        # Call Gemini model with automatic function calling
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                tools=[
                    tool_get_faculty_duties,
                    tool_list_conflicts,
                    tool_mark_faculty_unavailable,
                    tool_reallocate_minimal,
                    tool_explain_assignment,
                    tool_find_replacement,
                    tool_send_notifications,
                    tool_get_fairness_stats,
                ],
                temperature=0.2,
            )
        )

        reply_text = response.text or "Operation completed successfully."

        # If reallocate generated a diff, trigger confirmation step
        needs_confirmation = False
        pending_action_id = None
        if accumulated_diff:
            needs_confirmation = True
            token = str(uuid.uuid4())[:8]
            _PENDING_CONFIRMATIONS[token] = {
                "diff": accumulated_diff,
                "actor_user_id": actor_user_id,
                "summary": f"Reallocate {len(accumulated_diff)} slot(s)",
            }
            pending_action_id = token

        return {
            "message": reply_text,
            "actions_taken": actions_taken,
            "diff": accumulated_diff,
            "needs_confirmation": needs_confirmation,
            "pending_action_id": pending_action_id,
            "can_undo": len(_UNDO_STACK) > 0,
        }

    except Exception as e:
        print(f"[AI ASSISTANT WARNING] Gemini call failed ({e}). Falling back to rule-based engine.")
        return handle_rule_based_query(db, user_prompt, actor_user_id)
