import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    quiz_id = Column(String(64), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Integer, nullable=False)
    passed = Column(Boolean, nullable=False, default=False)
    attempted_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    quiz = relationship("Quiz", back_populates="attempts")
    user = relationship("User", back_populates="quiz_attempts")
