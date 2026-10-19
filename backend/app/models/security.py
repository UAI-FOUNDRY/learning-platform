"""
Account security and accountability: one-time auth tokens, login history and the audit log.
(PROJECT.md sections 22 and 27.)
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Text, DateTime, ForeignKey, JSON, CheckConstraint, Index, text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.connection import Base


class AuthToken(Base):
    """
    Single-use tokens for email verification, password reset and refresh tokens.
    Store only a SHA-256 hash of the token, never the raw value.
    """
    __tablename__ = "auth_tokens"
    __table_args__ = (
        CheckConstraint(
            "purpose IN ('email_verification', 'password_reset', 'refresh')",
            name="ck_auth_tokens_purpose",
        ),
        Index("ix_auth_tokens_user_purpose", "user_id", "purpose"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    purpose = Column(String(32), nullable=False)
    token_hash = Column(String(128), nullable=False, unique=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)      # set when consumed or revoked
    created_ip = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User")


class LoginHistory(Base):
    """Every login attempt, successful or not (security monitoring, 'Login History')."""
    __tablename__ = "login_history"
    __table_args__ = (Index("ix_login_history_user_created", "user_id", "created_at"),)

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # NULL if email unknown
    email = Column(String(255), nullable=False)
    success = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    failure_reason = Column(String(64), nullable=True)  # bad_password | unknown_email | suspended ...
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)


class AuditLog(Base):
    """
    Append-only record of important actions (who did what to which record).
    action examples: 'user.suspended', 'course.approved', 'review.removed', 'settings.updated'.
    """
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
        Index("ix_audit_logs_actor_created", "actor_id", "created_at"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(64), nullable=False, index=True)
    entity_type = Column(String(64), nullable=True)
    entity_id = Column(String(64), nullable=True)
    changes = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)  # {"field": [old, new]}
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    actor = relationship("User")
