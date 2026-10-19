import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Section(Base):
    __tablename__ = "sections"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    course_id = Column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="sections")
    lectures = relationship("Lecture", back_populates="section", cascade="all, delete-orphan", order_by="Lecture.order_index")
    quizzes = relationship("Quiz", back_populates="section", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="section", cascade="all, delete-orphan")
