import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="check_review_rating_range"),
        CheckConstraint("status IN ('visible', 'hidden', 'removed')", name="ck_reviews_status"),
        # One review per learner per course; editing updates the same row.
        UniqueConstraint("user_id", "course_id", name="uq_review_user_course"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    course_id = Column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    review_text = Column(Text, nullable=True)
    # Moderation by Super Admin.
    status = Column(String(16), nullable=False, default="visible", server_default="visible")
    moderated_by = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    moderated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="reviews")
    user = relationship("User", foreign_keys=[user_id], back_populates="reviews")
    moderator = relationship("User", foreign_keys=[moderated_by])
