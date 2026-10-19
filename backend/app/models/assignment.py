import uuid
from datetime import datetime
from sqlalchemy import text, Column, String, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    section_id = Column(String(64), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    instructions = Column(Text, nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    max_score = Column(Integer, nullable=True)
    allow_resubmission = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    section = relationship("Section", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment", cascade="all, delete-orphan")
