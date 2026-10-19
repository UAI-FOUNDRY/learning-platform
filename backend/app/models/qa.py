"""
Course Q&A (discussions).

Named qa_* so they never get confused with quiz `questions`.
Authors are SET NULL on user deletion so a discussion keeps its other answers.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    text,
    Column, String, Integer, Boolean, Text, DateTime, ForeignKey, UniqueConstraint, CheckConstraint,
)
from sqlalchemy.orm import relationship
from app.database.connection import Base

MODERATION_STATUSES = ("visible", "hidden", "removed")


class QAQuestion(Base):
    __tablename__ = "qa_questions"
    __table_args__ = (
        CheckConstraint("status IN ('visible', 'hidden', 'removed')", name="ck_qa_questions_status"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    lecture_id = Column(String(64), ForeignKey("lectures.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    is_resolved = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    status = Column(String(16), nullable=False, default="visible", server_default="visible")
    answer_count = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    course = relationship("Course", back_populates="qa_questions")
    lecture = relationship("Lecture")
    author = relationship("User")
    answers = relationship("QAAnswer", back_populates="question", cascade="all, delete-orphan")
    follows = relationship("QAQuestionFollow", back_populates="question", cascade="all, delete-orphan")


class QAAnswer(Base):
    """An answer to a question, or a reply to another answer (parent_answer_id)."""
    __tablename__ = "qa_answers"
    __table_args__ = (
        CheckConstraint("status IN ('visible', 'hidden', 'removed')", name="ck_qa_answers_status"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id = Column(String(64), ForeignKey("qa_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_answer_id = Column(String(64), ForeignKey("qa_answers.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    body = Column(Text, nullable=False)
    is_instructor_answer = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    is_highlighted = Column(Boolean, nullable=False, default=False, server_default=text("false"))  # marked useful by instructor
    status = Column(String(16), nullable=False, default="visible", server_default="visible")
    upvote_count = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    question = relationship("QAQuestion", back_populates="answers")
    author = relationship("User")
    parent = relationship("QAAnswer", remote_side=[id], back_populates="replies")
    replies = relationship("QAAnswer", back_populates="parent", cascade="all, delete-orphan")
    votes = relationship("QAAnswerVote", back_populates="answer", cascade="all, delete-orphan")


class QAAnswerVote(Base):
    __tablename__ = "qa_answer_votes"
    __table_args__ = (UniqueConstraint("answer_id", "user_id", name="uq_qa_answer_vote"),)

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    answer_id = Column(String(64), ForeignKey("qa_answers.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    answer = relationship("QAAnswer", back_populates="votes")


class QAQuestionFollow(Base):
    __tablename__ = "qa_question_follows"
    __table_args__ = (UniqueConstraint("question_id", "user_id", name="uq_qa_question_follow"),)

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id = Column(String(64), ForeignKey("qa_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    question = relationship("QAQuestion", back_populates="follows")
