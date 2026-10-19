"""Supabase security (RLS lockdown) and default platform data

WHY: Supabase exposes every table in the `public` schema through its auto-generated
REST/GraphQL API, reachable with the public "anon" key that ships in frontend code.
Without Row Level Security, anyone could read `users` (including password hashes).
Our FastAPI backend is the only thing that should touch these tables, so we:

1. enable RLS on every table with NO policies -> the anon / authenticated API roles
   see nothing. The backend connects as the table owner (postgres), which bypasses RLS.
2. revoke the API roles' privileges on current and future tables (belt and braces).

On plain PostgreSQL (local dev, CI) the Supabase roles don't exist, so step 2 is skipped
and step 1 is harmless.

Also inserts the default platform settings and a starter set of badges.

Revision ID: 0004
Revises: 0003
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, Sequence[str], None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SUPABASE_API_ROLES = ("anon", "authenticated")

DEFAULT_SETTINGS = [
    # key, value, category, is_public, description
    ("general.platform_name", "Learning Platform", "general", True, "Name shown in the header, emails and certificates"),
    ("general.platform_logo_url", None, "general", True, "Logo image URL"),
    ("general.platform_description", "Learn, practice, code and get certified.", "general", True, "Short tagline"),
    ("general.support_email", None, "general", True, "Contact address shown to users"),
    ("general.default_language", "en", "general", True, "Default UI language"),
    ("general.supported_languages", ["en"], "general", True, "UI languages users can choose"),
    ("users.allow_public_registration", True, "users", True, "Anyone can create an account"),
    ("users.allow_instructor_self_signup", True, "users", False, "Users may register directly as instructors"),
    ("users.require_email_verification", False, "users", False, "Block login until the email is verified"),
    ("courses.require_admin_approval", True, "courses", False, "Courses must be approved before publishing"),
    ("courses.reapproval_on_published_edit", True, "courses", False, "Editing a published course sends it back for review"),
    ("courses.max_upload_size_mb", 1024, "courses", False, "Maximum lecture upload size"),
    ("courses.coding_languages_enabled", ["python"], "courses", False, "Languages available in the coding workspace"),
    ("certificates.auto_issue_on_completion", True, "certificates", False, "Issue a certificate when a course is completed"),
    ("certificates.require_all_quizzes_passed", False, "certificates", False, "Also require every quiz to be passed"),
    ("certificates.template", "default", "certificates", False, "Certificate PDF template"),
    ("notifications.email_enabled", False, "notifications", False, "Send email notifications (needs an email provider)"),
    ("security.password_min_length", 8, "security", False, "Minimum password length"),
    ("security.max_failed_logins", 5, "security", False, "Failed attempts before a temporary lockout"),
    ("security.lockout_minutes", 15, "security", False, "Lockout duration after too many failed logins"),
    ("content.guidelines_url", None, "content", True, "Link to the content guidelines"),
    ("content.auto_hide_report_threshold", 5, "content", False, "Open reports before content is auto-hidden for review"),
]

DEFAULT_BADGES = [
    # code, name, description, category, criteria, points
    ("first_lecture", "First Step", "Completed your first lecture", "learning", {"event": "lecture_completed", "count": 1}, 10),
    ("first_course", "Course Finisher", "Completed your first course", "milestone", {"event": "course_completed", "count": 1}, 100),
    ("five_courses", "Dedicated Learner", "Completed five courses", "milestone", {"event": "course_completed", "count": 5}, 300),
    ("first_quiz_passed", "Quiz Taker", "Passed your first quiz", "quiz", {"event": "quiz_passed", "count": 1}, 20),
    ("perfect_quiz", "Perfectionist", "Scored 100% on a quiz", "quiz", {"event": "quiz_score", "min_score": 100}, 50),
    ("first_exercise", "Hello, World", "Solved your first coding exercise", "coding", {"event": "exercise_solved", "count": 1}, 25),
    ("ten_exercises", "Problem Solver", "Solved ten coding exercises", "coding", {"event": "exercise_solved", "count": 10}, 150),
    ("streak_7", "On a Roll", "Learned 7 days in a row", "learning", {"event": "learning_streak", "days": 7}, 70),
    ("streak_30", "Unstoppable", "Learned 30 days in a row", "learning", {"event": "learning_streak", "days": 30}, 300),
    ("helpful_answer", "Helpful Peer", "An answer of yours was highlighted by an instructor", "community", {"event": "answer_highlighted", "count": 1}, 40),
    ("first_certificate", "Certified", "Earned your first certificate", "milestone", {"event": "certificate_issued", "count": 1}, 100),
]


def _public_tables(bind) -> list:
    return [t for t in sa.inspect(bind).get_table_names(schema="public")]


def _existing_roles(bind) -> list:
    rows = bind.execute(sa.text("SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')"))
    return [r[0] for r in rows]


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        for table in _public_tables(bind):
            op.execute(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY')
        roles = _existing_roles(bind)
        if roles:
            role_list = ", ".join(roles)
            op.execute(f"REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {role_list}")
            op.execute(f"REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM {role_list}")
            op.execute(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM {role_list}")
            op.execute(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM {role_list}")

    json_type = sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql")
    settings_table = sa.table(
        "platform_settings",
        sa.column("key", sa.String), sa.column("value", json_type), sa.column("category", sa.String),
        sa.column("is_public", sa.Boolean), sa.column("description", sa.Text),
    )
    op.bulk_insert(settings_table, [
        {"key": k, "value": v, "category": c, "is_public": p, "description": d}
        for k, v, c, p, d in DEFAULT_SETTINGS
    ])

    badges_table = sa.table(
        "badges",
        sa.column("id", sa.String), sa.column("code", sa.String), sa.column("name", sa.String),
        sa.column("description", sa.Text), sa.column("category", sa.String),
        sa.column("criteria", json_type), sa.column("points", sa.Integer), sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(badges_table, [
        {"id": f"badge-{code}", "code": code, "name": name, "description": desc, "category": cat,
         "criteria": criteria, "points": points, "is_active": True}
        for code, name, desc, cat, criteria, points in DEFAULT_BADGES
    ])


def downgrade() -> None:
    codes = ", ".join(f"'{b[0]}'" for b in DEFAULT_BADGES)
    op.execute(f"DELETE FROM user_badges WHERE badge_id IN (SELECT id FROM badges WHERE code IN ({codes}))")
    op.execute(f"DELETE FROM badges WHERE code IN ({codes})")
    keys = ", ".join(f"'{s[0]}'" for s in DEFAULT_SETTINGS)
    op.execute(f"DELETE FROM platform_settings WHERE key IN ({keys})")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # Privileges are not re-granted automatically: on Supabase, keep the API roles locked out.
        for table in _public_tables(bind):
            op.execute(f'ALTER TABLE public."{table}" DISABLE ROW LEVEL SECURITY')
