"""extend the 16 core tables: fixes, integrity rules and fields PROJECT.md needs

- users: account status (active/inactive/suspended), profile fields
- progress: UNIQUE (enrollment_id, lecture_id) + resume position
- one row per learner for reviews, certificates, submissions, org memberships
- course metadata, subcategories, organizations, lecture types, quiz/question upgrades,
  assignment feedback and grading fields

Every new UNIQUE rule first removes existing duplicates (keeping the most useful row),
so this migration is safe to run on a database that already holds data.

Revision ID: 0002
Revises: 0001
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, Sequence[str], None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

JSONB = sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql")

# (name, table, condition) for CHECK constraints on existing tables.
CHECKS = [
    ("ck_users_status", "users", "status IN ('active', 'inactive', 'suspended')"),
    ("ck_organizations_org_type", "organizations",
     "org_type IN ('university', 'college', 'school', 'training_institute', 'company', 'other')"),
    ("ck_organizations_status", "organizations", "status IN ('active', 'inactive')"),
    ("ck_organization_members_member_role", "organization_members",
     "member_role IN ('admin', 'instructor', 'learner', 'member')"),
    ("ck_lectures_lecture_type", "lectures", "lecture_type IN ('video', 'article', 'pdf', 'document', 'link')"),
    ("ck_quizzes_quiz_type", "quizzes", "quiz_type IN ('quiz', 'practice_test')"),
    ("ck_quizzes_passing_score", "quizzes", "passing_score >= 0 AND passing_score <= 100"),
    ("ck_questions_question_type", "questions",
     "question_type IN ('single_choice', 'multiple_select', 'true_false')"),
    ("ck_quiz_attempts_status", "quiz_attempts", "status IN ('in_progress', 'submitted')"),
    ("ck_submissions_status", "submissions", "status IN ('submitted', 'graded', 'returned')"),
    ("ck_certificates_status", "certificates", "status IN ('issued', 'revoked')"),
    ("ck_reviews_status", "reviews", "status IN ('visible', 'hidden', 'removed')"),
]


def _dedupe(table: str, group_cols: str, keep_order: str) -> None:
    """Delete duplicate rows per group, keeping the first row by keep_order."""
    op.execute(
        f"DELETE FROM {table} WHERE id IN ("
        f"  SELECT id FROM ("
        f"    SELECT id, ROW_NUMBER() OVER (PARTITION BY {group_cols} ORDER BY {keep_order}) AS rn"
        f"    FROM {table}"
        f"  ) ranked WHERE rn > 1"
        f")"
    )


def upgrade() -> None:
    # ---- users -------------------------------------------------------------
    op.add_column("users", sa.Column("status", sa.String(16), server_default="active", nullable=False))
    op.add_column("users", sa.Column("is_email_verified", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("users", sa.Column("headline", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("bio", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_users_status"), "users", ["status"], unique=False)

    # ---- categories: subcategories -----------------------------------------
    op.add_column("categories", sa.Column("parent_id", sa.String(64), nullable=True))
    op.create_index(op.f("ix_categories_parent_id"), "categories", ["parent_id"], unique=False)
    op.create_foreign_key("fk_categories_parent_id", "categories", "categories",
                          ["parent_id"], ["id"], ondelete="SET NULL")

    # ---- organizations -----------------------------------------------------
    op.add_column("organizations", sa.Column("slug", sa.String(128), nullable=True))
    op.add_column("organizations", sa.Column("org_type", sa.String(32), server_default="other", nullable=False))
    op.add_column("organizations", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("organizations", sa.Column("logo_url", sa.Text(), nullable=True))
    op.add_column("organizations", sa.Column("status", sa.String(16), server_default="active", nullable=False))
    op.create_index(op.f("ix_organizations_slug"), "organizations", ["slug"], unique=True)

    op.add_column("organization_members",
                  sa.Column("member_role", sa.String(32), server_default="member", nullable=False))
    _dedupe("organization_members", "organization_id, user_id", "created_at ASC NULLS LAST, id")
    op.create_unique_constraint("uq_organization_member", "organization_members", ["organization_id", "user_id"])

    # ---- courses -----------------------------------------------------------
    op.add_column("courses", sa.Column("organization_id", sa.String(64), nullable=True))
    op.add_column("courses", sa.Column("thumbnail_url", sa.Text(), nullable=True))
    op.add_column("courses", sa.Column("level", sa.String(32), nullable=True))
    op.add_column("courses", sa.Column("language", sa.String(32), nullable=True))
    op.add_column("courses", sa.Column("learning_objectives", JSONB, nullable=True))
    op.add_column("courses", sa.Column("prerequisites", JSONB, nullable=True))
    op.add_column("courses", sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_courses_organization_id"), "courses", ["organization_id"], unique=False)
    op.create_foreign_key("fk_courses_organization_id", "courses", "organizations",
                          ["organization_id"], ["id"], ondelete="SET NULL")
    # Courses that are already live get a published_at so "newest" sorting works.
    op.execute("UPDATE courses SET published_at = COALESCE(reviewed_at, updated_at, created_at) "
               "WHERE lower(status) = 'published' AND published_at IS NULL")

    # ---- sections & lectures -----------------------------------------------
    op.add_column("sections", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("lectures", sa.Column("lecture_type", sa.String(16), server_default="video", nullable=False))
    op.add_column("lectures", sa.Column("article_content", sa.Text(), nullable=True))
    op.add_column("lectures", sa.Column("is_preview", sa.Boolean(), server_default=sa.text("false"), nullable=False))

    # ---- enrollments: continue learning -------------------------------------
    op.add_column("enrollments", sa.Column("last_lecture_id", sa.String(64), nullable=True))
    op.add_column("enrollments", sa.Column("last_accessed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key("fk_enrollments_last_lecture_id", "enrollments", "lectures",
                          ["last_lecture_id"], ["id"], ondelete="SET NULL")

    # ---- progress: the race-condition fix ----------------------------------
    op.add_column("progress", sa.Column("last_position_seconds", sa.Integer(), server_default="0", nullable=False))
    op.add_column("progress", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    # Keep the completed row if there is one, otherwise the most recently updated.
    _dedupe("progress", "enrollment_id, lecture_id", "is_completed DESC, updated_at DESC NULLS LAST, id")
    op.execute("UPDATE progress SET completed_at = updated_at WHERE is_completed AND completed_at IS NULL")
    op.create_unique_constraint("uq_progress_enrollment_lecture", "progress", ["enrollment_id", "lecture_id"])

    # ---- quizzes, questions, attempts ---------------------------------------
    op.add_column("quizzes", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("quizzes", sa.Column("quiz_type", sa.String(16), server_default="quiz", nullable=False))
    op.add_column("quizzes", sa.Column("time_limit_minutes", sa.Integer(), nullable=True))
    op.add_column("quizzes", sa.Column("max_attempts", sa.Integer(), nullable=True))
    op.add_column("quizzes", sa.Column("shuffle_questions", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("quizzes", sa.Column("show_explanations", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    op.add_column("questions", sa.Column("question_type", sa.String(24), server_default="single_choice", nullable=False))
    op.add_column("questions", sa.Column("correct_options", JSONB, nullable=True))
    op.add_column("questions", sa.Column("explanation", sa.Text(), nullable=True))
    op.add_column("questions", sa.Column("points", sa.Integer(), server_default="1", nullable=False))
    op.add_column("questions", sa.Column("order_index", sa.Integer(), server_default="0", nullable=False))

    op.add_column("quiz_attempts", sa.Column("status", sa.String(16), server_default="submitted", nullable=False))
    op.add_column("quiz_attempts", sa.Column("attempt_number", sa.Integer(), nullable=True))
    op.add_column("quiz_attempts", sa.Column("started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("quiz_attempts", sa.Column("correct_count", sa.Integer(), nullable=True))
    op.add_column("quiz_attempts", sa.Column("total_questions", sa.Integer(), nullable=True))
    op.add_column("quiz_attempts", sa.Column("time_taken_seconds", sa.Integer(), nullable=True))

    # ---- assignments & submissions -----------------------------------------
    op.add_column("assignments", sa.Column("max_score", sa.Integer(), nullable=True))
    op.add_column("assignments", sa.Column("allow_resubmission", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    op.add_column("submissions", sa.Column("submission_text", sa.Text(), nullable=True))
    op.add_column("submissions", sa.Column("status", sa.String(16), server_default="submitted", nullable=False))
    op.add_column("submissions", sa.Column("feedback", sa.Text(), nullable=True))
    op.add_column("submissions", sa.Column("graded_by", sa.String(64), nullable=True))
    op.add_column("submissions", sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("submissions", sa.Column("resubmission_count", sa.Integer(), server_default="0", nullable=False))
    op.create_foreign_key("fk_submissions_graded_by", "submissions", "users",
                          ["graded_by"], ["id"], ondelete="SET NULL")
    op.execute("UPDATE submissions SET status = 'graded' WHERE grade IS NOT NULL")
    _dedupe("submissions", "assignment_id, user_id", "submitted_at DESC NULLS LAST, id")
    op.create_unique_constraint("uq_submission_assignment_user", "submissions", ["assignment_id", "user_id"])

    # ---- certificates ------------------------------------------------------
    op.add_column("certificates", sa.Column("learner_name", sa.String(255), nullable=True))
    op.add_column("certificates", sa.Column("course_title", sa.String(255), nullable=True))
    op.add_column("certificates", sa.Column("status", sa.String(16), server_default="issued", nullable=False))
    op.add_column("certificates", sa.Column("pdf_url", sa.Text(), nullable=True))
    op.add_column("certificates", sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("certificates", sa.Column("revoked_reason", sa.Text(), nullable=True))
    _dedupe("certificates", "user_id, course_id", "issued_at ASC NULLS LAST, id")  # keep the original
    op.create_unique_constraint("uq_certificate_user_course", "certificates", ["user_id", "course_id"])

    # ---- reviews -----------------------------------------------------------
    op.add_column("reviews", sa.Column("status", sa.String(16), server_default="visible", nullable=False))
    op.add_column("reviews", sa.Column("moderated_by", sa.String(64), nullable=True))
    op.add_column("reviews", sa.Column("moderated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("reviews", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key("fk_reviews_moderated_by", "reviews", "users",
                          ["moderated_by"], ["id"], ondelete="SET NULL")
    _dedupe("reviews", "user_id, course_id", "created_at DESC NULLS LAST, id")  # keep the latest
    op.create_unique_constraint("uq_review_user_course", "reviews", ["user_id", "course_id"])

    # ---- CHECK constraints (allowed values) ---------------------------------
    for name, table, condition in CHECKS:
        op.create_check_constraint(name, table, condition)


def downgrade() -> None:
    for name, table, _ in reversed(CHECKS):
        op.drop_constraint(name, table, type_="check")

    op.drop_constraint("uq_review_user_course", "reviews", type_="unique")
    op.drop_constraint("fk_reviews_moderated_by", "reviews", type_="foreignkey")
    for col in ("updated_at", "moderated_at", "moderated_by", "status"):
        op.drop_column("reviews", col)

    op.drop_constraint("uq_certificate_user_course", "certificates", type_="unique")
    for col in ("revoked_reason", "revoked_at", "pdf_url", "status", "course_title", "learner_name"):
        op.drop_column("certificates", col)

    op.drop_constraint("uq_submission_assignment_user", "submissions", type_="unique")
    op.drop_constraint("fk_submissions_graded_by", "submissions", type_="foreignkey")
    for col in ("resubmission_count", "graded_at", "graded_by", "feedback", "status", "submission_text"):
        op.drop_column("submissions", col)
    for col in ("allow_resubmission", "max_score"):
        op.drop_column("assignments", col)

    for col in ("time_taken_seconds", "total_questions", "correct_count", "started_at", "attempt_number", "status"):
        op.drop_column("quiz_attempts", col)
    for col in ("order_index", "points", "explanation", "correct_options", "question_type"):
        op.drop_column("questions", col)
    for col in ("show_explanations", "shuffle_questions", "max_attempts", "time_limit_minutes", "quiz_type", "description"):
        op.drop_column("quizzes", col)

    op.drop_constraint("uq_progress_enrollment_lecture", "progress", type_="unique")
    for col in ("completed_at", "last_position_seconds"):
        op.drop_column("progress", col)

    op.drop_constraint("fk_enrollments_last_lecture_id", "enrollments", type_="foreignkey")
    for col in ("last_accessed_at", "last_lecture_id"):
        op.drop_column("enrollments", col)

    for col in ("is_preview", "article_content", "lecture_type"):
        op.drop_column("lectures", col)
    op.drop_column("sections", "description")

    op.drop_constraint("fk_courses_organization_id", "courses", type_="foreignkey")
    op.drop_index(op.f("ix_courses_organization_id"), table_name="courses")
    for col in ("published_at", "prerequisites", "learning_objectives", "language", "level", "thumbnail_url", "organization_id"):
        op.drop_column("courses", col)

    op.drop_constraint("uq_organization_member", "organization_members", type_="unique")
    op.drop_column("organization_members", "member_role")
    op.drop_index(op.f("ix_organizations_slug"), table_name="organizations")
    for col in ("status", "logo_url", "description", "org_type", "slug"):
        op.drop_column("organizations", col)

    op.drop_constraint("fk_categories_parent_id", "categories", type_="foreignkey")
    op.drop_index(op.f("ix_categories_parent_id"), table_name="categories")
    op.drop_column("categories", "parent_id")

    op.drop_index(op.f("ix_users_status"), table_name="users")
    for col in ("last_login_at", "bio", "avatar_url", "headline", "is_email_verified", "status"):
        op.drop_column("users", col)
