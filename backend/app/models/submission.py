import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    assignment_id = Column(String(64), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    submission_url = Column(Text, nullable=True)
    grade = Column(String(32), nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    assignment = relationship("Assignment", back_populates="submissions")
    user = relationship("User", back_populates="submissions")
