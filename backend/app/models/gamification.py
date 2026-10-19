"""
Gamification (PROJECT.md section 26): points ledger, badges and streaks.
Leaderboards are computed from point_transactions, so they need no table of their own.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, Date, Text, DateTime, ForeignKey, JSON,
    CheckConstraint, UniqueConstraint, Index, text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Badge(Base):
    __tablename__ = "badges"
    __table_args__ = (
        CheckConstraint(
            "category IN ('learning', 'coding', 'quiz', 'community', 'milestone', 'skill')",
            name="ck_badges_category",
        ),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(64), nullable=False, unique=True, index=True)  # stable key, e.g. "first_course_completed"
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    icon_url = Column(Text, nullable=True)
    category = Column(String(16), nullable=False, default="milestone", server_default="milestone")
    # Machine-readable rule, e.g. {"event": "course_completed", "count": 1}
    criteria = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    points = Column(Integer, nullable=False, default=0, server_default="0")
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class UserBadge(Base):
    __tablename__ = "user_badges"
    __table_args__ = (UniqueConstraint("user_id", "badge_id", name="uq_user_badge"),)

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_id = Column(String(64), ForeignKey("badges.id", ondelete="CASCADE"), nullable=False, index=True)
    awarded_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    badge = relationship("Badge")


class PointTransaction(Base):
    """Append-only points ledger. A user's total = SUM(points)."""
    __tablename__ = "point_transactions"
    __table_args__ = (Index("ix_point_transactions_user_created", "user_id", "created_at"),)

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    points = Column(Integer, nullable=False)  # negative for corrections
    reason = Column(String(64), nullable=False)  # lecture_completed | quiz_passed | exercise_solved | badge ...
    source_type = Column(String(32), nullable=True)
    source_id = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class UserStreak(Base):
    __tablename__ = "user_streaks"
    __table_args__ = (
        UniqueConstraint("user_id", "streak_type", name="uq_user_streak_type"),
        CheckConstraint("streak_type IN ('learning', 'coding')", name="ck_user_streaks_streak_type"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    streak_type = Column(String(16), nullable=False)
    current_length = Column(Integer, nullable=False, default=0, server_default="0")
    longest_length = Column(Integer, nullable=False, default=0, server_default="0")
    last_activity_date = Column(Date, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
