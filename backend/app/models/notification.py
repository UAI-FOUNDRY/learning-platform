import uuid
from datetime import datetime
from sqlalchemy import text, Column, String, Boolean, Text, DateTime, ForeignKey, JSON, Index, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.connection import Base

# Types from PROJECT.md section 22 (in-app notifications).
NOTIFICATION_TYPES = (
    "welcome", "course_enrollment", "course_approved", "course_rejected", "changes_requested",
    "assignment_deadline", "assignment_graded", "quiz_result", "course_completed",
    "certificate_issued", "qa_reply", "instructor_announcement", "admin_announcement",
)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        # Fast "my unread notifications" lookups.
        Index("ix_notifications_user_unread", "user_id", "is_read"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(64), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    link_url = Column(Text, nullable=True)  # where the frontend should navigate on click
    data = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)  # e.g. {"course_id": "..."}
    is_read = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    read_at = Column(DateTime(timezone=True), nullable=True)
    email_sent_at = Column(DateTime(timezone=True), nullable=True)  # NULL = not emailed (or in-app only)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class NotificationPreference(Base):
    """Per-user opt-in/out for each notification type and channel. Missing row = platform default."""
    __tablename__ = "notification_preferences"
    __table_args__ = (UniqueConstraint("user_id", "notification_type", name="uq_notification_preference"),)

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    notification_type = Column(String(64), nullable=False)
    in_app_enabled = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    email_enabled = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class Announcement(Base):
    """Instructor announcement to a course (course_id set) or Super Admin announcement (course_id NULL)."""
    __tablename__ = "announcements"
    __table_args__ = (
        CheckConstraint("audience IN ('all', 'learners', 'instructors', 'course')", name="ck_announcements_audience"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), nullable=True, index=True)
    author_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    audience = Column(String(16), nullable=False, default="course", server_default="course")
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    course = relationship("Course")
    author = relationship("User")
