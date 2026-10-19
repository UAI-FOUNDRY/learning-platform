import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import JSONB
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
    # Optional owning organization (university, company, ...). NULL = open platform course.
    organization_id = Column(String(64), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(32), nullable=False, default="DRAFT")
    thumbnail_url = Column(Text, nullable=True)
    level = Column(String(32), nullable=True)  # beginner | intermediate | advanced | all_levels
    language = Column(String(32), nullable=True)
    learning_objectives = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)  # list[str]
    prerequisites = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)  # list[str]
    reviewer_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    review_feedback = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    instructor = relationship("User", foreign_keys=[instructor_id], back_populates="courses")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    category = relationship("Category", back_populates="courses")
    organization = relationship("Organization", back_populates="courses")
    sections = relationship("Section", back_populates="course", cascade="all, delete-orphan", order_by="Section.order_index")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="course", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="course", cascade="all, delete-orphan")
    approval_logs = relationship(
        "CourseApprovalLog", back_populates="course", cascade="all, delete-orphan",
        order_by="CourseApprovalLog.created_at",
    )
    qa_questions = relationship("QAQuestion", back_populates="course", cascade="all, delete-orphan")
