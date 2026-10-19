"""
Personalized learning (PROJECT.md section 24): topics/skills, mastery tracking for
weak-topic detection, learning goals, learning paths, recommendations and daily
activity (learning time, streak source data).
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Date, Text, DateTime, ForeignKey,
    CheckConstraint, UniqueConstraint, Index, Table,
)
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Topic(Base):
    """A skill or concept ("Python loops", "SQL joins"). Topics can nest via parent_id."""
    __tablename__ = "topics"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(128), nullable=False)
    slug = Column(String(128), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    parent_id = Column(String(64), ForeignKey("topics.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    parent = relationship("Topic", remote_side=[id])


# Many-to-many tag tables. Tagging quiz questions and coding exercises with topics is
# what lets the platform say "you are weak at SQL joins".
course_topics = Table(
    "course_topics", Base.metadata,
    Column("course_id", String(64), ForeignKey("courses.id", ondelete="CASCADE"), primary_key=True),
    Column("topic_id", String(64), ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True, index=True),
)

question_topics = Table(
    "question_topics", Base.metadata,
    Column("question_id", String(64), ForeignKey("questions.id", ondelete="CASCADE"), primary_key=True),
    Column("topic_id", String(64), ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True, index=True),
)

coding_exercise_topics = Table(
    "coding_exercise_topics", Base.metadata,
    Column("exercise_id", String(64), ForeignKey("coding_exercises.id", ondelete="CASCADE"), primary_key=True),
    Column("topic_id", String(64), ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True, index=True),
)


class UserTopicMastery(Base):
    """Rolling per-learner performance on a topic; low mastery_score = weak topic."""
    __tablename__ = "user_topic_mastery"
    __table_args__ = (
        UniqueConstraint("user_id", "topic_id", name="uq_user_topic_mastery"),
        CheckConstraint("mastery_score >= 0 AND mastery_score <= 100", name="ck_user_topic_mastery_score"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(String(64), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    attempts = Column(Integer, nullable=False, default=0, server_default="0")
    correct = Column(Integer, nullable=False, default=0, server_default="0")
    mastery_score = Column(Float, nullable=False, default=0.0, server_default="0")
    last_practiced_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    topic = relationship("Topic")


class LearningGoal(Base):
    __tablename__ = "learning_goals"
    __table_args__ = (
        CheckConstraint(
            "goal_type IN ('weekly_minutes', 'complete_course', 'master_topic', 'custom')",
            name="ck_learning_goals_goal_type",
        ),
        CheckConstraint("status IN ('active', 'completed', 'abandoned')", name="ck_learning_goals_status"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    goal_type = Column(String(32), nullable=False, default="custom", server_default="custom")
    title = Column(String(255), nullable=False)
    target_value = Column(Integer, nullable=True)  # e.g. 120 minutes per week
    course_id = Column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), nullable=True)
    topic_id = Column(String(64), ForeignKey("topics.id", ondelete="CASCADE"), nullable=True)
    target_date = Column(Date, nullable=True)
    status = Column(String(16), nullable=False, default="active", server_default="active")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class LearningPath(Base):
    """An ordered sequence of courses ("Become a Data Analyst")."""
    __tablename__ = "learning_paths"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'published', 'archived')", name="ck_learning_paths_status"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    slug = Column(String(128), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    level = Column(String(32), nullable=True)
    created_by = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(16), nullable=False, default="draft", server_default="draft")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    courses = relationship(
        "LearningPathCourse", back_populates="path", cascade="all, delete-orphan",
        order_by="LearningPathCourse.order_index",
    )


class LearningPathCourse(Base):
    __tablename__ = "learning_path_courses"
    __table_args__ = (UniqueConstraint("path_id", "course_id", name="uq_learning_path_course"),)

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    path_id = Column(String(64), ForeignKey("learning_paths.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    order_index = Column(Integer, nullable=False, default=0, server_default="0")

    path = relationship("LearningPath", back_populates="courses")
    course = relationship("Course")


class LearningPathEnrollment(Base):
    __tablename__ = "learning_path_enrollments"
    __table_args__ = (UniqueConstraint("user_id", "path_id", name="uq_learning_path_enrollment"),)

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    path_id = Column(String(64), ForeignKey("learning_paths.id", ondelete="CASCADE"), nullable=False, index=True)
    enrolled_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class Recommendation(Base):
    """
    A suggestion shown to a learner (next course, next lecture, practice exercise...).
    Generated by rules or AI; tracking clicks/dismissals lets us measure quality.
    """
    __tablename__ = "recommendations"
    __table_args__ = (
        CheckConstraint(
            "item_type IN ('course', 'lecture', 'quiz', 'coding_exercise', 'learning_path', 'topic')",
            name="ck_recommendations_item_type",
        ),
        CheckConstraint("source IN ('rules', 'ai', 'admin')", name="ck_recommendations_source"),
        Index("ix_recommendations_user_created", "user_id", "created_at"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    item_type = Column(String(32), nullable=False)
    item_id = Column(String(64), nullable=False)
    reason = Column(String(255), nullable=True)  # "Because you struggled with loops"
    score = Column(Float, nullable=True)
    source = Column(String(16), nullable=False, default="rules", server_default="rules")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    clicked_at = Column(DateTime(timezone=True), nullable=True)
    dismissed_at = Column(DateTime(timezone=True), nullable=True)


class LearningActivityDaily(Base):
    """
    One row per learner per day. Feeds learning-time analytics, activity charts and streaks
    without scanning raw event tables.
    """
    __tablename__ = "learning_activity_daily"
    __table_args__ = (UniqueConstraint("user_id", "activity_date", name="uq_learning_activity_user_date"),)

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_date = Column(Date, nullable=False, index=True)
    minutes_learned = Column(Integer, nullable=False, default=0, server_default="0")
    lectures_completed = Column(Integer, nullable=False, default=0, server_default="0")
    quizzes_taken = Column(Integer, nullable=False, default=0, server_default="0")
    coding_submissions = Column(Integer, nullable=False, default=0, server_default="0")
    exercises_solved = Column(Integer, nullable=False, default=0, server_default="0")
    points_earned = Column(Integer, nullable=False, default=0, server_default="0")
