import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    section_id = Column(String(64), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    passing_score = Column(Integer, nullable=False, default=70)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    section = relationship("Section", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")
