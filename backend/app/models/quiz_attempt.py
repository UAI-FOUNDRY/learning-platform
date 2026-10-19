import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON, CheckConstraint, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.connection import Base


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    __table_args__ = (
        CheckConstraint("status IN ('in_progress', 'submitted')", name="ck_quiz_attempts_status"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    quiz_id = Column(String(64), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Integer, nullable=False)
    passed = Column(Boolean, nullable=False, default=False)
    # 'in_progress' while a timed quiz is open; 'submitted' once graded.
    status = Column(String(16), nullable=False, default="submitted", server_default="submitted")
    attempt_number = Column(Integer, nullable=True)  # 1, 2, 3 ... per learner per quiz
    started_at = Column(DateTime(timezone=True), nullable=True)
    correct_count = Column(Integer, nullable=True)
    total_questions = Column(Integer, nullable=True)
    time_taken_seconds = Column(Integer, nullable=True)
    attempted_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    quiz = relationship("Quiz", back_populates="attempts")
    user = relationship("User", back_populates="quiz_attempts")
    answers = relationship("QuizAttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")


class QuizAttemptAnswer(Base):
    """One row per question per attempt: powers quiz review, per-question stats and weak-topic detection."""
    __tablename__ = "quiz_attempt_answers"
    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_quiz_attempt_answer"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    attempt_id = Column(String(64), ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(64), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    selected_options = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)  # list[str]
    is_correct = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    points_awarded = Column(Integer, nullable=False, default=0, server_default="0")

    attempt = relationship("QuizAttempt", back_populates="answers")
    question = relationship("Question")
