import uuid
from datetime import datetime
from sqlalchemy import text, Column, String, Integer, Boolean, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.database.connection import Base

QUIZ_TYPES = ("quiz", "practice_test")


class Quiz(Base):
    """A graded quiz or an ungraded practice test (quiz_type = 'practice_test')."""
    __tablename__ = "quizzes"
    __table_args__ = (
        CheckConstraint("quiz_type IN ('quiz', 'practice_test')", name="ck_quizzes_quiz_type"),
        CheckConstraint("passing_score >= 0 AND passing_score <= 100", name="ck_quizzes_passing_score"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    section_id = Column(String(64), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    quiz_type = Column(String(16), nullable=False, default="quiz", server_default="quiz")
    passing_score = Column(Integer, nullable=False, default=70)
    time_limit_minutes = Column(Integer, nullable=True)   # NULL = untimed
    max_attempts = Column(Integer, nullable=True)          # NULL = unlimited
    shuffle_questions = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    show_explanations = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    section = relationship("Section", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")
