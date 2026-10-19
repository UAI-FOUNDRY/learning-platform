"""Append-only audit trail: who did what to which record (table: audit_logs)."""
from typing import Any, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.security import AuditLog
from app.models.user import User


class AuditService:
    def log(
        self,
        db: Session,
        actor: Optional[User],
        action: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        changes: Optional[dict] = None,
        request: Optional[Request] = None,
    ) -> None:
        """Best effort: an audit failure must never break the action being audited.

        The row is added to the caller's session and committed with it, so call this
        *before* the caller's final commit (or follow it with db.commit()).
        """
        try:
            db.add(
                AuditLog(
                    actor_id=actor.id if actor else None,
                    action=action,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    changes=changes,
                    ip_address=request.client.host if request is not None and request.client else None,
                    user_agent=(request.headers.get("user-agent") or "")[:500] or None if request is not None else None,
                )
            )
        except Exception:
            pass

    def list(
        self,
        db: Session,
        action: Optional[str] = None,
        actor_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ):
        q = db.query(AuditLog)
        if action:
            q = q.filter(AuditLog.action.like(action.strip() + "%"))
        if actor_id:
            q = q.filter(AuditLog.actor_id == actor_id)
        if entity_type:
            q = q.filter(AuditLog.entity_type == entity_type)
        if entity_id:
            q = q.filter(AuditLog.entity_id == entity_id)
        return q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()


audit_service = AuditService()
