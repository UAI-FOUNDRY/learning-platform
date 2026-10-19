import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Progress(Base):
    __tablename__ = "progress"
    __table_args__ = (
        # One progress row per learner enrollment per lecture (prevents race-condition duplicates).
        UniqueConstraint("enrollment_id", "lecture_id", name="uq_progress_enrollment_lecture"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    enrollment_id = Column(String(64), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False, index=True)
    lecture_id = Column(String(64), ForeignKey("lectures.id", ondelete="CASCADE"), nullable=False, index=True)
    is_completed = Column(Boolean, nullable=False, default=False)
    # Resume playback from the last position (seconds into the video).
    last_position_seconds = Column(Integer, nullable=False, default=0, server_default="0")
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    enrollment = relationship("Enrollment", back_populates="progress_records")
    lecture = relationship("Lecture", back_populates="progress")
