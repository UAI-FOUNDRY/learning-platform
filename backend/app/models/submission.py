import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, BigInteger, Text, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from app.database.connection import Base

SUBMISSION_STATUSES = ("submitted", "graded", "returned")


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (
        # A learner has one submission per assignment; resubmitting updates it.
        UniqueConstraint("assignment_id", "user_id", name="uq_submission_assignment_user"),
        CheckConstraint("status IN ('submitted', 'graded', 'returned')", name="ck_submissions_status"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    assignment_id = Column(String(64), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    submission_url = Column(Text, nullable=True)
    submission_text = Column(Text, nullable=True)
    status = Column(String(16), nullable=False, default="submitted", server_default="submitted")
    grade = Column(String(32), nullable=True)
    feedback = Column(Text, nullable=True)
    graded_by = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    graded_at = Column(DateTime(timezone=True), nullable=True)
    resubmission_count = Column(Integer, nullable=False, default=0, server_default="0")
    submitted_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    assignment = relationship("Assignment", back_populates="submissions")
    user = relationship("User", foreign_keys=[user_id], back_populates="submissions")
    grader = relationship("User", foreign_keys=[graded_by])
    files = relationship("SubmissionFile", back_populates="submission", cascade="all, delete-orphan")


class SubmissionFile(Base):
    """Files uploaded with an assignment submission (stored in object storage; we keep the URL)."""
    __tablename__ = "submission_files"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id = Column(String(64), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_url = Column(Text, nullable=False)
    mime_type = Column(String(128), nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    submission = relationship("Submission", back_populates="files")
