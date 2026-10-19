"""Settings for gamification, the coding workspace and AI features

Adds three setting categories and their default settings. No tables change:
the tables for these features were created in revision 0003.

Revision ID: 0005
Revises: 0004
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: Union[str, Sequence[str], None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD = "category IN ('general', 'users', 'courses', 'certificates', 'notifications', 'security', 'content')"
NEW = ("category IN ('general', 'users', 'courses', 'certificates', 'notifications', 'security', 'content', "
       "'gamification', 'coding', 'ai')")

NEW_SETTINGS = [
    # key, value, category, is_public, description
    ("gamification.enabled", True, "gamification", True, "Award points, streaks and badges"),
    ("gamification.leaderboard_enabled", True, "gamification", True, "Show the points leaderboard to learners"),
    ("coding.submissions_per_minute", 6, "coding", False, "Maximum code runs/submissions per learner per minute"),
    ("ai.enabled", False, "ai", True, "Enable the AI tutor (needs an AI provider and API key on the server)"),
    ("ai.daily_message_limit", 30, "ai", False, "AI messages each learner may send per day"),
]


def _swap_constraint(new_clause: str) -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("platform_settings") as batch:
            batch.drop_constraint("ck_platform_settings_category", type_="check")
            batch.create_check_constraint("ck_platform_settings_category", new_clause)
    else:
        op.drop_constraint("ck_platform_settings_category", "platform_settings", type_="check")
        op.create_check_constraint("ck_platform_settings_category", "platform_settings", new_clause)


def upgrade() -> None:
    _swap_constraint(NEW)
    json_type = sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql")
    table = sa.table(
        "platform_settings",
        sa.column("key", sa.String), sa.column("value", json_type), sa.column("category", sa.String),
        sa.column("is_public", sa.Boolean), sa.column("description", sa.Text),
    )
    op.bulk_insert(table, [
        {"key": k, "value": v, "category": c, "is_public": p, "description": d} for k, v, c, p, d in NEW_SETTINGS
    ])


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM platform_settings WHERE key IN (%s)" % ", ".join(f"'{k}'" for k, *_ in NEW_SETTINGS)))
    _swap_constraint(OLD)
