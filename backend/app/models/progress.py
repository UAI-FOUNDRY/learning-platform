import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Progress(Base):
    __tablename__ = "progress"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    enrollment_id = Column(String(64), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False, index=True)
    lecture_id = Column(String(64), ForeignKey("lectures.id", ondelete="CASCADE"), nullable=False, index=True)
    is_completed = Column(Boolean, nullable=False, default=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    enrollment = relationship("Enrollment", back_populates="progress_records")
    lecture = relationship("Lecture", back_populates="progress")
