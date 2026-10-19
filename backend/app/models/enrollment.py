import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_user_course_enrollment"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(32), nullable=False, default="ACTIVE")
    enrolled_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    # "Continue learning": where the learner left off.
    last_lecture_id = Column(String(64), ForeignKey("lectures.id", ondelete="SET NULL"), nullable=True)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
    last_lecture = relationship("Lecture", foreign_keys=[last_lecture_id])
    progress_records = relationship("Progress", back_populates="enrollment", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="enrollment", cascade="all, delete-orphan")
