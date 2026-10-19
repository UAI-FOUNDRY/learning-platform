"""baseline schema: the 16 core tables as they existed before Alembic was introduced

Revision ID: 0001
Revises: 
Create Date: 2026-10-18 20:06:08.965710

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Fresh database  -> create all 16 tables.
    Legacy database -> the tables were created earlier from
    database/schema/database-schema.sql; reconcile them to match this baseline
    instead of failing with "table already exists".
    """
    bind = op.get_bind()
    if sa.inspect(bind).has_table("users"):
        _reconcile_legacy()
    else:
        _create_all()


# Indexes defined by the SQLAlchemy models (name, table, column, unique).
BASELINE_INDEXES = [
    ('ix_categories_id', 'categories', 'id', False),
    ('ix_categories_slug', 'categories', 'slug', True),
    ('ix_organizations_id', 'organizations', 'id', False),
    ('ix_users_email', 'users', 'email', True),
    ('ix_users_id', 'users', 'id', False),
    ('ix_courses_category_id', 'courses', 'category_id', False),
    ('ix_courses_id', 'courses', 'id', False),
    ('ix_courses_instructor_id', 'courses', 'instructor_id', False),
    ('ix_courses_reviewer_id', 'courses', 'reviewer_id', False),
    ('ix_organization_members_id', 'organization_members', 'id', False),
    ('ix_organization_members_organization_id', 'organization_members', 'organization_id', False),
    ('ix_organization_members_user_id', 'organization_members', 'user_id', False),
    ('ix_enrollments_course_id', 'enrollments', 'course_id', False),
    ('ix_enrollments_id', 'enrollments', 'id', False),
    ('ix_enrollments_user_id', 'enrollments', 'user_id', False),
    ('ix_reviews_course_id', 'reviews', 'course_id', False),
    ('ix_reviews_id', 'reviews', 'id', False),
    ('ix_reviews_user_id', 'reviews', 'user_id', False),
    ('ix_sections_course_id', 'sections', 'course_id', False),
    ('ix_sections_id', 'sections', 'id', False),
    ('ix_assignments_id', 'assignments', 'id', False),
    ('ix_assignments_section_id', 'assignments', 'section_id', False),
    ('ix_certificates_course_id', 'certificates', 'course_id', False),
    ('ix_certificates_enrollment_id', 'certificates', 'enrollment_id', False),
    ('ix_certificates_id', 'certificates', 'id', False),
    ('ix_certificates_user_id', 'certificates', 'user_id', False),
    ('ix_certificates_verification_code', 'certificates', 'verification_code', True),
    ('ix_lectures_id', 'lectures', 'id', False),
    ('ix_lectures_section_id', 'lectures', 'section_id', False),
    ('ix_quizzes_id', 'quizzes', 'id', False),
    ('ix_quizzes_section_id', 'quizzes', 'section_id', False),
    ('ix_progress_enrollment_id', 'progress', 'enrollment_id', False),
    ('ix_progress_id', 'progress', 'id', False),
    ('ix_progress_lecture_id', 'progress', 'lecture_id', False),
    ('ix_questions_id', 'questions', 'id', False),
    ('ix_questions_quiz_id', 'questions', 'quiz_id', False),
    ('ix_quiz_attempts_id', 'quiz_attempts', 'id', False),
    ('ix_quiz_attempts_quiz_id', 'quiz_attempts', 'quiz_id', False),
    ('ix_quiz_attempts_user_id', 'quiz_attempts', 'user_id', False),
    ('ix_submissions_assignment_id', 'submissions', 'assignment_id', False),
    ('ix_submissions_id', 'submissions', 'id', False),
    ('ix_submissions_user_id', 'submissions', 'user_id', False)
]

# Foreign-key columns the models declare NOT NULL but the legacy SQL left nullable.
LEGACY_NOT_NULL = [
    ("assignments", "section_id"), ("certificates", "enrollment_id"),
    ("certificates", "user_id"), ("certificates", "course_id"),
    ("enrollments", "user_id"), ("enrollments", "course_id"),
    ("lectures", "section_id"), ("lectures", "duration"),
    ("organization_members", "organization_id"), ("organization_members", "user_id"),
    ("progress", "enrollment_id"), ("progress", "lecture_id"),
    ("questions", "quiz_id"), ("quiz_attempts", "quiz_id"), ("quiz_attempts", "user_id"),
    ("quizzes", "section_id"), ("quizzes", "passing_score"),
    ("reviews", "course_id"), ("reviews", "user_id"),
    ("sections", "course_id"),
    ("submissions", "assignment_id"), ("submissions", "user_id"),
]

# Legacy inline UNIQUE constraints that the models express as unique indexes instead.
LEGACY_UNIQUE_CONSTRAINTS = [
    ("users", "users_email_key"),
    ("categories", "categories_slug_key"),
    ("certificates", "certificates_verification_code_key"),
]


def _reconcile_legacy() -> None:
    bind = op.get_bind()
    # Columns added by legacy migration 001 (safe if they already exist).
    op.execute(
        "ALTER TABLE courses "
        "ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL, "
        "ADD COLUMN IF NOT EXISTS review_feedback TEXT, "
        "ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE, "
        "ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE"
    )
    # Defaults the legacy SQL left out, so NOT NULL can be applied safely.
    op.execute("UPDATE lectures SET duration = 0 WHERE duration IS NULL")
    op.execute("UPDATE quizzes SET passing_score = 70 WHERE passing_score IS NULL")
    for table, column in LEGACY_NOT_NULL:
        orphans = bind.execute(sa.text(f"SELECT count(*) FROM {table} WHERE {column} IS NULL")).scalar()
        if orphans:
            raise RuntimeError(
                f"Cannot reconcile: {orphans} row(s) in {table}.{column} are NULL. "
                "Fix or delete those rows, then rerun 'alembic upgrade head'."
            )
        op.alter_column(table, column, nullable=False)
    for name, table, column, unique in BASELINE_INDEXES:
        kind = "UNIQUE INDEX" if unique else "INDEX"
        op.execute(f"CREATE {kind} IF NOT EXISTS {name} ON {table} ({column})")
    for table, constraint in LEGACY_UNIQUE_CONSTRAINTS:
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {constraint}")
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_course_enrollment') THEN "
        "ALTER TABLE enrollments ADD CONSTRAINT uq_user_course_enrollment UNIQUE (user_id, course_id); "
        "END IF; END $$;"
    )


def _create_all() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('categories',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=128), nullable=False),
    sa.Column('slug', sa.String(length=128), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_categories_id'), 'categories', ['id'], unique=False)
    op.create_index(op.f('ix_categories_slug'), 'categories', ['slug'], unique=True)
    op.create_table('organizations',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('domain', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organizations_id'), 'organizations', ['id'], unique=False)
    op.create_table('users',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('hashed_password', sa.String(length=255), nullable=False),
    sa.Column('full_name', sa.String(length=255), nullable=False),
    sa.Column('role', sa.String(length=32), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_table('courses',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('subtitle', sa.String(length=255), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('instructor_id', sa.String(length=64), nullable=True),
    sa.Column('category_id', sa.String(length=64), nullable=True),
    sa.Column('status', sa.String(length=32), nullable=False),
    sa.Column('reviewer_id', sa.String(length=64), nullable=True),
    sa.Column('review_feedback', sa.Text(), nullable=True),
    sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['instructor_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_courses_category_id'), 'courses', ['category_id'], unique=False)
    op.create_index(op.f('ix_courses_id'), 'courses', ['id'], unique=False)
    op.create_index(op.f('ix_courses_instructor_id'), 'courses', ['instructor_id'], unique=False)
    op.create_index(op.f('ix_courses_reviewer_id'), 'courses', ['reviewer_id'], unique=False)
    op.create_table('organization_members',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('organization_id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('designation', sa.String(length=128), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organization_members_id'), 'organization_members', ['id'], unique=False)
    op.create_index(op.f('ix_organization_members_organization_id'), 'organization_members', ['organization_id'], unique=False)
    op.create_index(op.f('ix_organization_members_user_id'), 'organization_members', ['user_id'], unique=False)
    op.create_table('enrollments',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('course_id', sa.String(length=64), nullable=False),
    sa.Column('status', sa.String(length=32), nullable=False),
    sa.Column('enrolled_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'course_id', name='uq_user_course_enrollment')
    )
    op.create_index(op.f('ix_enrollments_course_id'), 'enrollments', ['course_id'], unique=False)
    op.create_index(op.f('ix_enrollments_id'), 'enrollments', ['id'], unique=False)
    op.create_index(op.f('ix_enrollments_user_id'), 'enrollments', ['user_id'], unique=False)
    op.create_table('reviews',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('course_id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('rating', sa.Integer(), nullable=False),
    sa.Column('review_text', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint('rating >= 1 AND rating <= 5', name='check_review_rating_range'),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reviews_course_id'), 'reviews', ['course_id'], unique=False)
    op.create_index(op.f('ix_reviews_id'), 'reviews', ['id'], unique=False)
    op.create_index(op.f('ix_reviews_user_id'), 'reviews', ['user_id'], unique=False)
    op.create_table('sections',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('course_id', sa.String(length=64), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('order_index', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sections_course_id'), 'sections', ['course_id'], unique=False)
    op.create_index(op.f('ix_sections_id'), 'sections', ['id'], unique=False)
    op.create_table('assignments',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('section_id', sa.String(length=64), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('instructions', sa.Text(), nullable=True),
    sa.Column('deadline', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['section_id'], ['sections.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assignments_id'), 'assignments', ['id'], unique=False)
    op.create_index(op.f('ix_assignments_section_id'), 'assignments', ['section_id'], unique=False)
    op.create_table('certificates',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('enrollment_id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('course_id', sa.String(length=64), nullable=False),
    sa.Column('verification_code', sa.String(length=128), nullable=False),
    sa.Column('issued_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['enrollment_id'], ['enrollments.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_certificates_course_id'), 'certificates', ['course_id'], unique=False)
    op.create_index(op.f('ix_certificates_enrollment_id'), 'certificates', ['enrollment_id'], unique=False)
    op.create_index(op.f('ix_certificates_id'), 'certificates', ['id'], unique=False)
    op.create_index(op.f('ix_certificates_user_id'), 'certificates', ['user_id'], unique=False)
    op.create_index(op.f('ix_certificates_verification_code'), 'certificates', ['verification_code'], unique=True)
    op.create_table('lectures',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('section_id', sa.String(length=64), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('content_url', sa.Text(), nullable=True),
    sa.Column('duration', sa.Integer(), nullable=False),
    sa.Column('order_index', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['section_id'], ['sections.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lectures_id'), 'lectures', ['id'], unique=False)
    op.create_index(op.f('ix_lectures_section_id'), 'lectures', ['section_id'], unique=False)
    op.create_table('quizzes',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('section_id', sa.String(length=64), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('passing_score', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['section_id'], ['sections.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quizzes_id'), 'quizzes', ['id'], unique=False)
    op.create_index(op.f('ix_quizzes_section_id'), 'quizzes', ['section_id'], unique=False)
    op.create_table('progress',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('enrollment_id', sa.String(length=64), nullable=False),
    sa.Column('lecture_id', sa.String(length=64), nullable=False),
    sa.Column('is_completed', sa.Boolean(), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['enrollment_id'], ['enrollments.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['lecture_id'], ['lectures.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_progress_enrollment_id'), 'progress', ['enrollment_id'], unique=False)
    op.create_index(op.f('ix_progress_id'), 'progress', ['id'], unique=False)
    op.create_index(op.f('ix_progress_lecture_id'), 'progress', ['lecture_id'], unique=False)
    op.create_table('questions',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('quiz_id', sa.String(length=64), nullable=False),
    sa.Column('prompt', sa.Text(), nullable=False),
    sa.Column('options', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('correct_option', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_questions_id'), 'questions', ['id'], unique=False)
    op.create_index(op.f('ix_questions_quiz_id'), 'questions', ['quiz_id'], unique=False)
    op.create_table('quiz_attempts',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('quiz_id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('score', sa.Integer(), nullable=False),
    sa.Column('passed', sa.Boolean(), nullable=False),
    sa.Column('attempted_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quiz_attempts_id'), 'quiz_attempts', ['id'], unique=False)
    op.create_index(op.f('ix_quiz_attempts_quiz_id'), 'quiz_attempts', ['quiz_id'], unique=False)
    op.create_index(op.f('ix_quiz_attempts_user_id'), 'quiz_attempts', ['user_id'], unique=False)
    op.create_table('submissions',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('assignment_id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('submission_url', sa.Text(), nullable=True),
    sa.Column('grade', sa.String(length=32), nullable=True),
    sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_submissions_assignment_id'), 'submissions', ['assignment_id'], unique=False)
    op.create_index(op.f('ix_submissions_id'), 'submissions', ['id'], unique=False)
    op.create_index(op.f('ix_submissions_user_id'), 'submissions', ['user_id'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_submissions_user_id'), table_name='submissions')
    op.drop_index(op.f('ix_submissions_id'), table_name='submissions')
    op.drop_index(op.f('ix_submissions_assignment_id'), table_name='submissions')
    op.drop_table('submissions')
    op.drop_index(op.f('ix_quiz_attempts_user_id'), table_name='quiz_attempts')
    op.drop_index(op.f('ix_quiz_attempts_quiz_id'), table_name='quiz_attempts')
    op.drop_index(op.f('ix_quiz_attempts_id'), table_name='quiz_attempts')
    op.drop_table('quiz_attempts')
    op.drop_index(op.f('ix_questions_quiz_id'), table_name='questions')
    op.drop_index(op.f('ix_questions_id'), table_name='questions')
    op.drop_table('questions')
    op.drop_index(op.f('ix_progress_lecture_id'), table_name='progress')
    op.drop_index(op.f('ix_progress_id'), table_name='progress')
    op.drop_index(op.f('ix_progress_enrollment_id'), table_name='progress')
    op.drop_table('progress')
    op.drop_index(op.f('ix_quizzes_section_id'), table_name='quizzes')
    op.drop_index(op.f('ix_quizzes_id'), table_name='quizzes')
    op.drop_table('quizzes')
    op.drop_index(op.f('ix_lectures_section_id'), table_name='lectures')
    op.drop_index(op.f('ix_lectures_id'), table_name='lectures')
    op.drop_table('lectures')
    op.drop_index(op.f('ix_certificates_verification_code'), table_name='certificates')
    op.drop_index(op.f('ix_certificates_user_id'), table_name='certificates')
    op.drop_index(op.f('ix_certificates_id'), table_name='certificates')
    op.drop_index(op.f('ix_certificates_enrollment_id'), table_name='certificates')
    op.drop_index(op.f('ix_certificates_course_id'), table_name='certificates')
    op.drop_table('certificates')
    op.drop_index(op.f('ix_assignments_section_id'), table_name='assignments')
    op.drop_index(op.f('ix_assignments_id'), table_name='assignments')
    op.drop_table('assignments')
    op.drop_index(op.f('ix_sections_id'), table_name='sections')
    op.drop_index(op.f('ix_sections_course_id'), table_name='sections')
    op.drop_table('sections')
    op.drop_index(op.f('ix_reviews_user_id'), table_name='reviews')
    op.drop_index(op.f('ix_reviews_id'), table_name='reviews')
    op.drop_index(op.f('ix_reviews_course_id'), table_name='reviews')
    op.drop_table('reviews')
    op.drop_index(op.f('ix_enrollments_user_id'), table_name='enrollments')
    op.drop_index(op.f('ix_enrollments_id'), table_name='enrollments')
    op.drop_index(op.f('ix_enrollments_course_id'), table_name='enrollments')
    op.drop_table('enrollments')
    op.drop_index(op.f('ix_organization_members_user_id'), table_name='organization_members')
    op.drop_index(op.f('ix_organization_members_organization_id'), table_name='organization_members')
    op.drop_index(op.f('ix_organization_members_id'), table_name='organization_members')
    op.drop_table('organization_members')
    op.drop_index(op.f('ix_courses_reviewer_id'), table_name='courses')
    op.drop_index(op.f('ix_courses_instructor_id'), table_name='courses')
    op.drop_index(op.f('ix_courses_id'), table_name='courses')
    op.drop_index(op.f('ix_courses_category_id'), table_name='courses')
    op.drop_table('courses')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_organizations_id'), table_name='organizations')
    op.drop_table('organizations')
    op.drop_index(op.f('ix_categories_slug'), table_name='categories')
    op.drop_index(op.f('ix_categories_id'), table_name='categories')
    op.drop_table('categories')
    # ### end Alembic commands ###
