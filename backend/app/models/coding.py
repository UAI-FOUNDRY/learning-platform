"""
Integrated coding workspace, coding exercises and automatic evaluation.
(PROJECT.md sections 11, 12 and 13.)

The database only stores exercises, code and results. Student code must be executed
by a separate sandboxed runner (e.g. a Judge0 instance or isolated containers),
never inside the FastAPI process. The runner reads 'queued' submissions and writes
results back.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, Text, DateTime, ForeignKey, JSON,
    CheckConstraint, UniqueConstraint, Index, text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.connection import Base

CODING_LANGUAGES = ("python", "c", "cpp", "javascript", "java", "sql")
_LANG_CHECK = "language IN ('python', 'c', 'cpp', 'javascript', 'java', 'sql')"

SUBMISSION_STATUSES = (
    "queued", "running", "accepted", "wrong_answer", "runtime_error", "compile_error",
    "time_limit_exceeded", "memory_limit_exceeded", "internal_error",
)
_STATUS_CHECK = (
    "status IN ('queued', 'running', 'accepted', 'wrong_answer', 'runtime_error', 'compile_error', "
    "'time_limit_exceeded', 'memory_limit_exceeded', 'internal_error')"
)


class CodingExercise(Base):
    """A coding problem created by an instructor, optionally linked to a lecture ("lecture-linked coding")."""
    __tablename__ = "coding_exercises"
    __table_args__ = (
        CheckConstraint(_LANG_CHECK, name="ck_coding_exercises_language"),
        CheckConstraint("difficulty IN ('easy', 'medium', 'hard')", name="ck_coding_exercises_difficulty"),
        CheckConstraint("status IN ('draft', 'published', 'archived')", name="ck_coding_exercises_status"),
        CheckConstraint("time_limit_ms > 0 AND memory_limit_mb > 0", name="ck_coding_exercises_limits"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    lecture_id = Column(String(64), ForeignKey("lectures.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    problem_statement = Column(Text, nullable=False)  # markdown
    language = Column(String(16), nullable=False, default="python", server_default="python")
    starter_code = Column(Text, nullable=True)
    solution_code = Column(Text, nullable=True)  # never sent to learners
    sample_input = Column(Text, nullable=True)
    sample_output = Column(Text, nullable=True)
    difficulty = Column(String(16), nullable=False, default="easy", server_default="easy")
    hints = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)  # list[str], revealed one by one
    explanation = Column(Text, nullable=True)  # shown after solving
    time_limit_ms = Column(Integer, nullable=False, default=2000, server_default="2000")
    memory_limit_mb = Column(Integer, nullable=False, default=256, server_default="256")
    max_score = Column(Integer, nullable=False, default=100, server_default="100")
    order_index = Column(Integer, nullable=False, default=0, server_default="0")
    status = Column(String(16), nullable=False, default="draft", server_default="draft")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    course = relationship("Course")
    lecture = relationship("Lecture")
    author = relationship("User")
    test_cases = relationship(
        "CodingTestCase", back_populates="exercise", cascade="all, delete-orphan",
        order_by="CodingTestCase.order_index",
    )
    submissions = relationship("CodingSubmission", back_populates="exercise", cascade="all, delete-orphan")


class CodingTestCase(Base):
    """Input / expected output pair. Hidden cases are used for grading but never shown to learners."""
    __tablename__ = "coding_test_cases"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    exercise_id = Column(String(64), ForeignKey("coding_exercises.id", ondelete="CASCADE"), nullable=False, index=True)
    input = Column(Text, nullable=False, default="", server_default="")
    expected_output = Column(Text, nullable=False)
    is_hidden = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    weight = Column(Integer, nullable=False, default=1, server_default="1")  # share of max_score
    order_index = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    exercise = relationship("CodingExercise", back_populates="test_cases")


class CodingSubmission(Base):
    """
    One execution request. kind='run' = learner pressed Run (custom input, not scored);
    kind='submit' = graded against all test cases. Together they form the submission history.
    """
    __tablename__ = "coding_submissions"
    __table_args__ = (
        CheckConstraint(_LANG_CHECK, name="ck_coding_submissions_language"),
        CheckConstraint(_STATUS_CHECK, name="ck_coding_submissions_status"),
        CheckConstraint("kind IN ('run', 'submit')", name="ck_coding_submissions_kind"),
        Index("ix_coding_submissions_user_exercise", "user_id", "exercise_id", "created_at"),
        Index("ix_coding_submissions_status", "status"),  # runner polls for 'queued'
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    exercise_id = Column(String(64), ForeignKey("coding_exercises.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    kind = Column(String(8), nullable=False, default="submit", server_default="submit")
    language = Column(String(16), nullable=False)
    source_code = Column(Text, nullable=False)
    custom_input = Column(Text, nullable=True)  # only for kind='run'
    status = Column(String(32), nullable=False, default="queued", server_default="queued")
    score = Column(Integer, nullable=True)
    passed_count = Column(Integer, nullable=True)
    failed_count = Column(Integer, nullable=True)
    total_count = Column(Integer, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)  # max across test cases
    memory_kb = Column(Integer, nullable=True)
    stdout = Column(Text, nullable=True)   # for 'run'
    stderr = Column(Text, nullable=True)   # compiler / runtime error shown to the learner
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    evaluated_at = Column(DateTime(timezone=True), nullable=True)

    exercise = relationship("CodingExercise", back_populates="submissions")
    user = relationship("User")
    results = relationship("CodingSubmissionResult", back_populates="submission", cascade="all, delete-orphan")


class CodingSubmissionResult(Base):
    """Per-test-case outcome ("Test Case 1 → Passed")."""
    __tablename__ = "coding_submission_results"
    __table_args__ = (
        CheckConstraint(_STATUS_CHECK, name="ck_coding_submission_results_status"),
        UniqueConstraint("submission_id", "test_case_id", name="uq_coding_result_submission_case"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id = Column(String(64), ForeignKey("coding_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    test_case_id = Column(String(64), ForeignKey("coding_test_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(32), nullable=False)
    actual_output = Column(Text, nullable=True)  # hide for hidden test cases in the API
    execution_time_ms = Column(Integer, nullable=True)
    memory_kb = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)

    submission = relationship("CodingSubmission", back_populates="results")
    test_case = relationship("CodingTestCase")


class CodingDraft(Base):
    """Autosaved editor contents ("Save Code"), one per learner per exercise."""
    __tablename__ = "coding_drafts"
    __table_args__ = (
        UniqueConstraint("user_id", "exercise_id", name="uq_coding_draft_user_exercise"),
        CheckConstraint(_LANG_CHECK, name="ck_coding_drafts_language"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_id = Column(String(64), ForeignKey("coding_exercises.id", ondelete="CASCADE"), nullable=False, index=True)
    language = Column(String(16), nullable=False)
    source_code = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
