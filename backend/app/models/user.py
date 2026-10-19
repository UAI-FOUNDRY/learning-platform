import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, CheckConstraint, text
from sqlalchemy.orm import relationship
from app.database.connection import Base

USER_ROLES = ("learner", "instructor", "super_admin")
USER_STATUSES = ("active", "inactive", "suspended")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'inactive', 'suspended')", name="ck_users_status"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="learner")
    # Account state: only 'active' users can log in or use their tokens.
    status = Column(String(16), nullable=False, default="active", server_default="active", index=True)
    is_email_verified = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    headline = Column(String(255), nullable=True)  # e.g. "Assistant Professor, CSE"
    avatar_url = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    courses = relationship("Course", foreign_keys="Course.instructor_id", back_populates="instructor")
    organization_memberships = relationship("OrganizationMember", back_populates="user", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="user", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")
    submissions = relationship("Submission", foreign_keys="Submission.user_id", back_populates="user", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="user", cascade="all, delete-orphan")
    reviews = relationship("Review", foreign_keys="Review.user_id", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    @property
    def is_active(self) -> bool:
        return (self.status or "active") == "active"
