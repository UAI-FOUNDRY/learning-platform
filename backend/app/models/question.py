import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Question(Base):
    __tablename__ = "questions"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    quiz_id = Column(String(64), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    prompt = Column(Text, nullable=False)
    options = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    correct_option = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    quiz = relationship("Quiz", back_populates="questions")
