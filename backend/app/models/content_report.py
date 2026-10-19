import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from app.database.connection import Base

REPORT_TARGET_TYPES = ("course", "review", "qa_question", "qa_answer", "user")
REPORT_STATUSES = ("open", "reviewing", "resolved", "dismissed")


class ContentReport(Base):
    """
    A user report about any piece of content, reviewed by Super Admin.
    target_type + target_id point at the reported row (polymorphic, so no FK on target_id).
    """
    __tablename__ = "content_reports"
    __table_args__ = (
        CheckConstraint(
            "target_type IN ('course', 'review', 'qa_question', 'qa_answer', 'user')",
            name="ck_content_reports_target_type",
        ),
        CheckConstraint(
            "status IN ('open', 'reviewing', 'resolved', 'dismissed')",
            name="ck_content_reports_status",
        ),
        Index("ix_content_reports_target", "target_type", "target_id"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    reporter_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    target_type = Column(String(32), nullable=False)
    target_id = Column(String(64), nullable=False)
    reason = Column(String(64), nullable=False)  # spam | abuse | inappropriate | copyright | other
    details = Column(Text, nullable=True)
    status = Column(String(16), nullable=False, default="open", server_default="open", index=True)
    resolved_by = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_note = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    reporter = relationship("User", foreign_keys=[reporter_id])
    resolver = relationship("User", foreign_keys=[resolved_by])
