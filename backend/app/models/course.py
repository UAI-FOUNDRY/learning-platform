import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    title = Column(String(255), nullable=False)
    subtitle = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    instructor_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    category_id = Column(String(64), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(32), nullable=False, default="DRAFT")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    instructor = relationship("User", back_populates="courses_instructed")
    category = relationship("Category", back_populates="courses")
    sections = relationship("Section", back_populates="course", cascade="all, delete-orphan", order_by="Section.order_index")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="course", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="course", cascade="all, delete-orphan")
