import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.database.connection import Base

APPROVAL_ACTIONS = ("submitted", "approved", "changes_requested", "rejected", "unpublished", "archived")


class CourseApprovalLog(Base):
    """Append-only history of every review decision on a course (approval history)."""
    __tablename__ = "course_approval_logs"
    __table_args__ = (
        CheckConstraint(
            "action IN ('submitted', 'approved', 'changes_requested', 'rejected', 'unpublished', 'archived')",
            name="ck_course_approval_logs_action",
        ),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(32), nullable=False)
    from_status = Column(String(32), nullable=True)
    to_status = Column(String(32), nullable=False)
    comment = Column(Text, nullable=True)  # reviewer feedback / rejection reason
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    course = relationship("Course", back_populates="approval_logs")
    actor = relationship("User")
