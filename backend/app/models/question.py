import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, JSON, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.connection import Base

QUESTION_TYPES = ("single_choice", "multiple_select", "true_false")


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (
        CheckConstraint(
            "question_type IN ('single_choice', 'multiple_select', 'true_false')",
            name="ck_questions_question_type",
        ),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    quiz_id = Column(String(64), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    question_type = Column(String(24), nullable=False, default="single_choice", server_default="single_choice")
    prompt = Column(Text, nullable=False)
    options = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    # single_choice / true_false use correct_option; multiple_select uses correct_options (list).
    correct_option = Column(String(255), nullable=False)
    correct_options = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    explanation = Column(Text, nullable=True)
    points = Column(Integer, nullable=False, default=1, server_default="1")
    order_index = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    quiz = relationship("Quiz", back_populates="questions")
