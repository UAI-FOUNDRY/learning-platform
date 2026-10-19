"""feature tables: everything in PROJECT.md that had no table yet

Learning extras, approval history, coding workspace, Q&A, moderation, notifications,
security/audit, platform settings, personalization, gamification and AI assistants.

Revision ID: 0003
Revises: 0002
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, Sequence[str], None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('badges',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('code', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=128), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('icon_url', sa.Text(), nullable=True),
    sa.Column('category', sa.String(length=16), server_default='milestone', nullable=False),
    sa.Column('criteria', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('points', sa.Integer(), server_default='0', nullable=False),
    sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("category IN ('learning', 'coding', 'quiz', 'community', 'milestone', 'skill')", name='ck_badges_category'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_badges_code'), 'badges', ['code'], unique=True)
    op.create_table('topics',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=128), nullable=False),
    sa.Column('slug', sa.String(length=128), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('parent_id', sa.String(length=64), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['parent_id'], ['topics.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_topics_parent_id'), 'topics', ['parent_id'], unique=False)
    op.create_index(op.f('ix_topics_slug'), 'topics', ['slug'], unique=True)
    op.create_table('ai_conversations',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('assistant_type', sa.String(length=16), server_default='learning', nullable=False),
    sa.Column('context_type', sa.String(length=32), server_default='none', nullable=False),
    sa.Column('context_id', sa.String(length=64), nullable=True),
    sa.Column('title', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("assistant_type IN ('learning', 'coding', 'instructor')", name='ck_ai_conversations_assistant_type'),
    sa.CheckConstraint("context_type IN ('none', 'course', 'lecture', 'coding_exercise', 'coding_submission', 'quiz')", name='ck_ai_conversations_context_type'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ai_conversations_user_updated', 'ai_conversations', ['user_id', 'updated_at'], unique=False)
    op.create_table('audit_logs',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('actor_id', sa.String(length=64), nullable=True),
    sa.Column('action', sa.String(length=64), nullable=False),
    sa.Column('entity_type', sa.String(length=64), nullable=True),
    sa.Column('entity_id', sa.String(length=64), nullable=True),
    sa.Column('changes', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('ip_address', sa.String(length=45), nullable=True),
    sa.Column('user_agent', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index('ix_audit_logs_actor_created', 'audit_logs', ['actor_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)
    op.create_index('ix_audit_logs_entity', 'audit_logs', ['entity_type', 'entity_id'], unique=False)
    op.create_table('auth_tokens',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('purpose', sa.String(length=32), nullable=False),
    sa.Column('token_hash', sa.String(length=128), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_ip', sa.String(length=45), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("purpose IN ('email_verification', 'password_reset', 'refresh')", name='ck_auth_tokens_purpose'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('token_hash')
    )
    op.create_index('ix_auth_tokens_user_purpose', 'auth_tokens', ['user_id', 'purpose'], unique=False)
    op.create_table('content_reports',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('reporter_id', sa.String(length=64), nullable=True),
    sa.Column('target_type', sa.String(length=32), nullable=False),
    sa.Column('target_id', sa.String(length=64), nullable=False),
    sa.Column('reason', sa.String(length=64), nullable=False),
    sa.Column('details', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=16), server_default='open', nullable=False),
    sa.Column('resolved_by', sa.String(length=64), nullable=True),
    sa.Column('resolution_note', sa.Text(), nullable=True),
    sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("status IN ('open', 'reviewing', 'resolved', 'dismissed')", name='ck_content_reports_status'),
    sa.CheckConstraint("target_type IN ('course', 'review', 'qa_question', 'qa_answer', 'user')", name='ck_content_reports_target_type'),
    sa.ForeignKeyConstraint(['reporter_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['resolved_by'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_content_reports_reporter_id'), 'content_reports', ['reporter_id'], unique=False)
    op.create_index(op.f('ix_content_reports_status'), 'content_reports', ['status'], unique=False)
    op.create_index('ix_content_reports_target', 'content_reports', ['target_type', 'target_id'], unique=False)
    op.create_table('learning_activity_daily',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('activity_date', sa.Date(), nullable=False),
    sa.Column('minutes_learned', sa.Integer(), server_default='0', nullable=False),
    sa.Column('lectures_completed', sa.Integer(), server_default='0', nullable=False),
    sa.Column('quizzes_taken', sa.Integer(), server_default='0', nullable=False),
    sa.Column('coding_submissions', sa.Integer(), server_default='0', nullable=False),
    sa.Column('exercises_solved', sa.Integer(), server_default='0', nullable=False),
    sa.Column('points_earned', sa.Integer(), server_default='0', nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'activity_date', name='uq_learning_activity_user_date')
    )
    op.create_index(op.f('ix_learning_activity_daily_activity_date'), 'learning_activity_daily', ['activity_date'], unique=False)
    op.create_index(op.f('ix_learning_activity_daily_user_id'), 'learning_activity_daily', ['user_id'], unique=False)
    op.create_table('learning_paths',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('slug', sa.String(length=128), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('level', sa.String(length=32), nullable=True),
    sa.Column('created_by', sa.String(length=64), nullable=True),
    sa.Column('status', sa.String(length=16), server_default='draft', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("status IN ('draft', 'published', 'archived')", name='ck_learning_paths_status'),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_learning_paths_slug'), 'learning_paths', ['slug'], unique=True)
    op.create_table('login_history',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=True),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('success', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('failure_reason', sa.String(length=64), nullable=True),
    sa.Column('ip_address', sa.String(length=45), nullable=True),
    sa.Column('user_agent', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_login_history_created_at'), 'login_history', ['created_at'], unique=False)
    op.create_index('ix_login_history_user_created', 'login_history', ['user_id', 'created_at'], unique=False)
    op.create_table('notification_preferences',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('notification_type', sa.String(length=64), nullable=False),
    sa.Column('in_app_enabled', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    sa.Column('email_enabled', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'notification_type', name='uq_notification_preference')
    )
    op.create_index(op.f('ix_notification_preferences_user_id'), 'notification_preferences', ['user_id'], unique=False)
    op.create_table('notifications',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('type', sa.String(length=64), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('message', sa.Text(), nullable=True),
    sa.Column('link_url', sa.Text(), nullable=True),
    sa.Column('data', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('is_read', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('email_sent_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)
    op.create_index('ix_notifications_user_unread', 'notifications', ['user_id', 'is_read'], unique=False)
    op.create_table('platform_settings',
    sa.Column('key', sa.String(length=128), nullable=False),
    sa.Column('value', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('category', sa.String(length=32), server_default='general', nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('is_public', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('updated_by', sa.String(length=64), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("category IN ('general', 'users', 'courses', 'certificates', 'notifications', 'security', 'content')", name='ck_platform_settings_category'),
    sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('key')
    )
    op.create_table('point_transactions',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('points', sa.Integer(), nullable=False),
    sa.Column('reason', sa.String(length=64), nullable=False),
    sa.Column('source_type', sa.String(length=32), nullable=True),
    sa.Column('source_id', sa.String(length=64), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_point_transactions_user_created', 'point_transactions', ['user_id', 'created_at'], unique=False)
    op.create_table('recommendations',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('item_type', sa.String(length=32), nullable=False),
    sa.Column('item_id', sa.String(length=64), nullable=False),
    sa.Column('reason', sa.String(length=255), nullable=True),
    sa.Column('score', sa.Float(), nullable=True),
    sa.Column('source', sa.String(length=16), server_default='rules', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('clicked_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('dismissed_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("item_type IN ('course', 'lecture', 'quiz', 'coding_exercise', 'learning_path', 'topic')", name='ck_recommendations_item_type'),
    sa.CheckConstraint("source IN ('rules', 'ai', 'admin')", name='ck_recommendations_source'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_recommendations_user_created', 'recommendations', ['user_id', 'created_at'], unique=False)
    op.create_table('user_badges',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('badge_id', sa.String(length=64), nullable=False),
    sa.Column('awarded_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['badge_id'], ['badges.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'badge_id', name='uq_user_badge')
    )
    op.create_index(op.f('ix_user_badges_badge_id'), 'user_badges', ['badge_id'], unique=False)
    op.create_index(op.f('ix_user_badges_user_id'), 'user_badges', ['user_id'], unique=False)
    op.create_table('user_streaks',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('streak_type', sa.String(length=16), nullable=False),
    sa.Column('current_length', sa.Integer(), server_default='0', nullable=False),
    sa.Column('longest_length', sa.Integer(), server_default='0', nullable=False),
    sa.Column('last_activity_date', sa.Date(), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("streak_type IN ('learning', 'coding')", name='ck_user_streaks_streak_type'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'streak_type', name='uq_user_streak_type')
    )
    op.create_index(op.f('ix_user_streaks_user_id'), 'user_streaks', ['user_id'], unique=False)
    op.create_table('user_topic_mastery',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('topic_id', sa.String(length=64), nullable=False),
    sa.Column('attempts', sa.Integer(), server_default='0', nullable=False),
    sa.Column('correct', sa.Integer(), server_default='0', nullable=False),
    sa.Column('mastery_score', sa.Float(), server_default='0', nullable=False),
    sa.Column('last_practiced_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint('mastery_score >= 0 AND mastery_score <= 100', name='ck_user_topic_mastery_score'),
    sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'topic_id', name='uq_user_topic_mastery')
    )
    op.create_index(op.f('ix_user_topic_mastery_topic_id'), 'user_topic_mastery', ['topic_id'], unique=False)
    op.create_index(op.f('ix_user_topic_mastery_user_id'), 'user_topic_mastery', ['user_id'], unique=False)
    op.create_table('ai_messages',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('conversation_id', sa.String(length=64), nullable=False),
    sa.Column('role', sa.String(length=16), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('model', sa.String(length=64), nullable=True),
    sa.Column('input_tokens', sa.Integer(), nullable=True),
    sa.Column('output_tokens', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("role IN ('user', 'assistant', 'system')", name='ck_ai_messages_role'),
    sa.ForeignKeyConstraint(['conversation_id'], ['ai_conversations.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_messages_conversation_id'), 'ai_messages', ['conversation_id'], unique=False)
    op.create_table('announcements',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('course_id', sa.String(length=64), nullable=True),
    sa.Column('author_id', sa.String(length=64), nullable=True),
    sa.Column('audience', sa.String(length=16), server_default='course', nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("audience IN ('all', 'learners', 'instructors', 'course')", name='ck_announcements_audience'),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_announcements_author_id'), 'announcements', ['author_id'], unique=False)
    op.create_index(op.f('ix_announcements_course_id'), 'announcements', ['course_id'], unique=False)
    op.create_index(op.f('ix_announcements_created_at'), 'announcements', ['created_at'], unique=False)
    op.create_table('course_approval_logs',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('course_id', sa.String(length=64), nullable=False),
    sa.Column('actor_id', sa.String(length=64), nullable=True),
    sa.Column('action', sa.String(length=32), nullable=False),
    sa.Column('from_status', sa.String(length=32), nullable=True),
    sa.Column('to_status', sa.String(length=32), nullable=False),
    sa.Column('comment', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("action IN ('submitted', 'approved', 'changes_requested', 'rejected', 'unpublished', 'archived')", name='ck_course_approval_logs_action'),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_course_approval_logs_actor_id'), 'course_approval_logs', ['actor_id'], unique=False)
    op.create_index(op.f('ix_course_approval_logs_course_id'), 'course_approval_logs', ['course_id'], unique=False)
    op.create_table('course_topics',
    sa.Column('course_id', sa.String(length=64), nullable=False),
    sa.Column('topic_id', sa.String(length=64), nullable=False),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('course_id', 'topic_id')
    )
    op.create_index(op.f('ix_course_topics_topic_id'), 'course_topics', ['topic_id'], unique=False)
    op.create_table('learning_goals',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('goal_type', sa.String(length=32), server_default='custom', nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('target_value', sa.Integer(), nullable=True),
    sa.Column('course_id', sa.String(length=64), nullable=True),
    sa.Column('topic_id', sa.String(length=64), nullable=True),
    sa.Column('target_date', sa.Date(), nullable=True),
    sa.Column('status', sa.String(length=16), server_default='active', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("goal_type IN ('weekly_minutes', 'complete_course', 'master_topic', 'custom')", name='ck_learning_goals_goal_type'),
    sa.CheckConstraint("status IN ('active', 'completed', 'abandoned')", name='ck_learning_goals_status'),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_learning_goals_user_id'), 'learning_goals', ['user_id'], unique=False)
    op.create_table('learning_path_courses',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('path_id', sa.String(length=64), nullable=False),
    sa.Column('course_id', sa.String(length=64), nullable=False),
    sa.Column('order_index', sa.Integer(), server_default='0', nullable=False),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['path_id'], ['learning_paths.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('path_id', 'course_id', name='uq_learning_path_course')
    )
    op.create_index(op.f('ix_learning_path_courses_course_id'), 'learning_path_courses', ['course_id'], unique=False)
    op.create_index(op.f('ix_learning_path_courses_path_id'), 'learning_path_courses', ['path_id'], unique=False)
    op.create_table('learning_path_enrollments',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('path_id', sa.String(length=64), nullable=False),
    sa.Column('enrolled_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['path_id'], ['learning_paths.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'path_id', name='uq_learning_path_enrollment')
    )
    op.create_index(op.f('ix_learning_path_enrollments_path_id'), 'learning_path_enrollments', ['path_id'], unique=False)
    op.create_index(op.f('ix_learning_path_enrollments_user_id'), 'learning_path_enrollments', ['user_id'], unique=False)
    op.create_table('wishlist_items',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('course_id', sa.String(length=64), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'course_id', name='uq_wishlist_user_course')
    )
    op.create_index(op.f('ix_wishlist_items_course_id'), 'wishlist_items', ['course_id'], unique=False)
    op.create_index(op.f('ix_wishlist_items_user_id'), 'wishlist_items', ['user_id'], unique=False)
    op.create_table('coding_exercises',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('course_id', sa.String(length=64), nullable=False),
    sa.Column('lecture_id', sa.String(length=64), nullable=True),
    sa.Column('created_by', sa.String(length=64), nullable=True),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('problem_statement', sa.Text(), nullable=False),
    sa.Column('language', sa.String(length=16), server_default='python', nullable=False),
    sa.Column('starter_code', sa.Text(), nullable=True),
    sa.Column('solution_code', sa.Text(), nullable=True),
    sa.Column('sample_input', sa.Text(), nullable=True),
    sa.Column('sample_output', sa.Text(), nullable=True),
    sa.Column('difficulty', sa.String(length=16), server_default='easy', nullable=False),
    sa.Column('hints', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('explanation', sa.Text(), nullable=True),
    sa.Column('time_limit_ms', sa.Integer(), server_default='2000', nullable=False),
    sa.Column('memory_limit_mb', sa.Integer(), server_default='256', nullable=False),
    sa.Column('max_score', sa.Integer(), server_default='100', nullable=False),
    sa.Column('order_index', sa.Integer(), server_default='0', nullable=False),
    sa.Column('status', sa.String(length=16), server_default='draft', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("difficulty IN ('easy', 'medium', 'hard')", name='ck_coding_exercises_difficulty'),
    sa.CheckConstraint("language IN ('python', 'c', 'cpp', 'javascript', 'java', 'sql')", name='ck_coding_exercises_language'),
    sa.CheckConstraint("status IN ('draft', 'published', 'archived')", name='ck_coding_exercises_status'),
    sa.CheckConstraint('time_limit_ms > 0 AND memory_limit_mb > 0', name='ck_coding_exercises_limits'),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['lecture_id'], ['lectures.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_coding_exercises_course_id'), 'coding_exercises', ['course_id'], unique=False)
    op.create_index(op.f('ix_coding_exercises_lecture_id'), 'coding_exercises', ['lecture_id'], unique=False)
    op.create_table('lecture_bookmarks',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('lecture_id', sa.String(length=64), nullable=False),
    sa.Column('timestamp_seconds', sa.Integer(), server_default='0', nullable=False),
    sa.Column('label', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['lecture_id'], ['lectures.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lecture_bookmarks_lecture_id'), 'lecture_bookmarks', ['lecture_id'], unique=False)
    op.create_index('ix_lecture_bookmarks_user_lecture', 'lecture_bookmarks', ['user_id', 'lecture_id'], unique=False)
    op.create_table('lecture_notes',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('lecture_id', sa.String(length=64), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('timestamp_seconds', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['lecture_id'], ['lectures.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lecture_notes_lecture_id'), 'lecture_notes', ['lecture_id'], unique=False)
    op.create_index('ix_lecture_notes_user_lecture', 'lecture_notes', ['user_id', 'lecture_id'], unique=False)
    op.create_table('lecture_resources',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('lecture_id', sa.String(length=64), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('resource_type', sa.String(length=16), server_default='file', nullable=False),
    sa.Column('url', sa.Text(), nullable=False),
    sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("resource_type IN ('file', 'link')", name='ck_lecture_resources_resource_type'),
    sa.ForeignKeyConstraint(['lecture_id'], ['lectures.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lecture_resources_lecture_id'), 'lecture_resources', ['lecture_id'], unique=False)
    op.create_table('lecture_subtitles',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('lecture_id', sa.String(length=64), nullable=False),
    sa.Column('language_code', sa.String(length=16), nullable=False),
    sa.Column('label', sa.String(length=64), nullable=True),
    sa.Column('url', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['lecture_id'], ['lectures.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('lecture_id', 'language_code', name='uq_lecture_subtitle_language')
    )
    op.create_index(op.f('ix_lecture_subtitles_lecture_id'), 'lecture_subtitles', ['lecture_id'], unique=False)
    op.create_table('qa_questions',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('course_id', sa.String(length=64), nullable=False),
    sa.Column('lecture_id', sa.String(length=64), nullable=True),
    sa.Column('user_id', sa.String(length=64), nullable=True),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('is_resolved', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('status', sa.String(length=16), server_default='visible', nullable=False),
    sa.Column('answer_count', sa.Integer(), server_default='0', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("status IN ('visible', 'hidden', 'removed')", name='ck_qa_questions_status'),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['lecture_id'], ['lectures.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_qa_questions_course_id'), 'qa_questions', ['course_id'], unique=False)
    op.create_index(op.f('ix_qa_questions_created_at'), 'qa_questions', ['created_at'], unique=False)
    op.create_index(op.f('ix_qa_questions_lecture_id'), 'qa_questions', ['lecture_id'], unique=False)
    op.create_index(op.f('ix_qa_questions_user_id'), 'qa_questions', ['user_id'], unique=False)
    op.create_table('coding_drafts',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('exercise_id', sa.String(length=64), nullable=False),
    sa.Column('language', sa.String(length=16), nullable=False),
    sa.Column('source_code', sa.Text(), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("language IN ('python', 'c', 'cpp', 'javascript', 'java', 'sql')", name='ck_coding_drafts_language'),
    sa.ForeignKeyConstraint(['exercise_id'], ['coding_exercises.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'exercise_id', name='uq_coding_draft_user_exercise')
    )
    op.create_index(op.f('ix_coding_drafts_exercise_id'), 'coding_drafts', ['exercise_id'], unique=False)
    op.create_index(op.f('ix_coding_drafts_user_id'), 'coding_drafts', ['user_id'], unique=False)
    op.create_table('coding_exercise_topics',
    sa.Column('exercise_id', sa.String(length=64), nullable=False),
    sa.Column('topic_id', sa.String(length=64), nullable=False),
    sa.ForeignKeyConstraint(['exercise_id'], ['coding_exercises.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('exercise_id', 'topic_id')
    )
    op.create_index(op.f('ix_coding_exercise_topics_topic_id'), 'coding_exercise_topics', ['topic_id'], unique=False)
    op.create_table('coding_submissions',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('exercise_id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('kind', sa.String(length=8), server_default='submit', nullable=False),
    sa.Column('language', sa.String(length=16), nullable=False),
    sa.Column('source_code', sa.Text(), nullable=False),
    sa.Column('custom_input', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=32), server_default='queued', nullable=False),
    sa.Column('score', sa.Integer(), nullable=True),
    sa.Column('passed_count', sa.Integer(), nullable=True),
    sa.Column('failed_count', sa.Integer(), nullable=True),
    sa.Column('total_count', sa.Integer(), nullable=True),
    sa.Column('execution_time_ms', sa.Integer(), nullable=True),
    sa.Column('memory_kb', sa.Integer(), nullable=True),
    sa.Column('stdout', sa.Text(), nullable=True),
    sa.Column('stderr', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('evaluated_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("kind IN ('run', 'submit')", name='ck_coding_submissions_kind'),
    sa.CheckConstraint("language IN ('python', 'c', 'cpp', 'javascript', 'java', 'sql')", name='ck_coding_submissions_language'),
    sa.CheckConstraint("status IN ('queued', 'running', 'accepted', 'wrong_answer', 'runtime_error', 'compile_error', 'time_limit_exceeded', 'memory_limit_exceeded', 'internal_error')", name='ck_coding_submissions_status'),
    sa.ForeignKeyConstraint(['exercise_id'], ['coding_exercises.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_coding_submissions_exercise_id'), 'coding_submissions', ['exercise_id'], unique=False)
    op.create_index('ix_coding_submissions_status', 'coding_submissions', ['status'], unique=False)
    op.create_index('ix_coding_submissions_user_exercise', 'coding_submissions', ['user_id', 'exercise_id', 'created_at'], unique=False)
    op.create_table('coding_test_cases',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('exercise_id', sa.String(length=64), nullable=False),
    sa.Column('input', sa.Text(), server_default='', nullable=False),
    sa.Column('expected_output', sa.Text(), nullable=False),
    sa.Column('is_hidden', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    sa.Column('weight', sa.Integer(), server_default='1', nullable=False),
    sa.Column('order_index', sa.Integer(), server_default='0', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['exercise_id'], ['coding_exercises.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_coding_test_cases_exercise_id'), 'coding_test_cases', ['exercise_id'], unique=False)
    op.create_table('qa_answers',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('question_id', sa.String(length=64), nullable=False),
    sa.Column('parent_answer_id', sa.String(length=64), nullable=True),
    sa.Column('user_id', sa.String(length=64), nullable=True),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('is_instructor_answer', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('is_highlighted', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('status', sa.String(length=16), server_default='visible', nullable=False),
    sa.Column('upvote_count', sa.Integer(), server_default='0', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("status IN ('visible', 'hidden', 'removed')", name='ck_qa_answers_status'),
    sa.ForeignKeyConstraint(['parent_answer_id'], ['qa_answers.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['question_id'], ['qa_questions.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_qa_answers_parent_answer_id'), 'qa_answers', ['parent_answer_id'], unique=False)
    op.create_index(op.f('ix_qa_answers_question_id'), 'qa_answers', ['question_id'], unique=False)
    op.create_index(op.f('ix_qa_answers_user_id'), 'qa_answers', ['user_id'], unique=False)
    op.create_table('qa_question_follows',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('question_id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['question_id'], ['qa_questions.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('question_id', 'user_id', name='uq_qa_question_follow')
    )
    op.create_index(op.f('ix_qa_question_follows_question_id'), 'qa_question_follows', ['question_id'], unique=False)
    op.create_index(op.f('ix_qa_question_follows_user_id'), 'qa_question_follows', ['user_id'], unique=False)
    op.create_table('question_topics',
    sa.Column('question_id', sa.String(length=64), nullable=False),
    sa.Column('topic_id', sa.String(length=64), nullable=False),
    sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('question_id', 'topic_id')
    )
    op.create_index(op.f('ix_question_topics_topic_id'), 'question_topics', ['topic_id'], unique=False)
    op.create_table('quiz_attempt_answers',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('attempt_id', sa.String(length=64), nullable=False),
    sa.Column('question_id', sa.String(length=64), nullable=False),
    sa.Column('selected_options', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('is_correct', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('points_awarded', sa.Integer(), server_default='0', nullable=False),
    sa.ForeignKeyConstraint(['attempt_id'], ['quiz_attempts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('attempt_id', 'question_id', name='uq_quiz_attempt_answer')
    )
    op.create_index(op.f('ix_quiz_attempt_answers_attempt_id'), 'quiz_attempt_answers', ['attempt_id'], unique=False)
    op.create_index(op.f('ix_quiz_attempt_answers_question_id'), 'quiz_attempt_answers', ['question_id'], unique=False)
    op.create_table('submission_files',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('submission_id', sa.String(length=64), nullable=False),
    sa.Column('file_name', sa.String(length=255), nullable=False),
    sa.Column('file_url', sa.Text(), nullable=False),
    sa.Column('mime_type', sa.String(length=128), nullable=True),
    sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
    sa.Column('uploaded_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_submission_files_submission_id'), 'submission_files', ['submission_id'], unique=False)
    op.create_table('coding_submission_results',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('submission_id', sa.String(length=64), nullable=False),
    sa.Column('test_case_id', sa.String(length=64), nullable=False),
    sa.Column('status', sa.String(length=32), nullable=False),
    sa.Column('actual_output', sa.Text(), nullable=True),
    sa.Column('execution_time_ms', sa.Integer(), nullable=True),
    sa.Column('memory_kb', sa.Integer(), nullable=True),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.CheckConstraint("status IN ('queued', 'running', 'accepted', 'wrong_answer', 'runtime_error', 'compile_error', 'time_limit_exceeded', 'memory_limit_exceeded', 'internal_error')", name='ck_coding_submission_results_status'),
    sa.ForeignKeyConstraint(['submission_id'], ['coding_submissions.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['test_case_id'], ['coding_test_cases.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('submission_id', 'test_case_id', name='uq_coding_result_submission_case')
    )
    op.create_index(op.f('ix_coding_submission_results_submission_id'), 'coding_submission_results', ['submission_id'], unique=False)
    op.create_index(op.f('ix_coding_submission_results_test_case_id'), 'coding_submission_results', ['test_case_id'], unique=False)
    op.create_table('qa_answer_votes',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('answer_id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['answer_id'], ['qa_answers.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('answer_id', 'user_id', name='uq_qa_answer_vote')
    )
    op.create_index(op.f('ix_qa_answer_votes_answer_id'), 'qa_answer_votes', ['answer_id'], unique=False)
    op.create_index(op.f('ix_qa_answer_votes_user_id'), 'qa_answer_votes', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_qa_answer_votes_user_id'), table_name='qa_answer_votes')
    op.drop_index(op.f('ix_qa_answer_votes_answer_id'), table_name='qa_answer_votes')
    op.drop_table('qa_answer_votes')
    op.drop_index(op.f('ix_coding_submission_results_test_case_id'), table_name='coding_submission_results')
    op.drop_index(op.f('ix_coding_submission_results_submission_id'), table_name='coding_submission_results')
    op.drop_table('coding_submission_results')
    op.drop_index(op.f('ix_submission_files_submission_id'), table_name='submission_files')
    op.drop_table('submission_files')
    op.drop_index(op.f('ix_quiz_attempt_answers_question_id'), table_name='quiz_attempt_answers')
    op.drop_index(op.f('ix_quiz_attempt_answers_attempt_id'), table_name='quiz_attempt_answers')
    op.drop_table('quiz_attempt_answers')
    op.drop_index(op.f('ix_question_topics_topic_id'), table_name='question_topics')
    op.drop_table('question_topics')
    op.drop_index(op.f('ix_qa_question_follows_user_id'), table_name='qa_question_follows')
    op.drop_index(op.f('ix_qa_question_follows_question_id'), table_name='qa_question_follows')
    op.drop_table('qa_question_follows')
    op.drop_index(op.f('ix_qa_answers_user_id'), table_name='qa_answers')
    op.drop_index(op.f('ix_qa_answers_question_id'), table_name='qa_answers')
    op.drop_index(op.f('ix_qa_answers_parent_answer_id'), table_name='qa_answers')
    op.drop_table('qa_answers')
    op.drop_index(op.f('ix_coding_test_cases_exercise_id'), table_name='coding_test_cases')
    op.drop_table('coding_test_cases')
    op.drop_index('ix_coding_submissions_user_exercise', table_name='coding_submissions')
    op.drop_index('ix_coding_submissions_status', table_name='coding_submissions')
    op.drop_index(op.f('ix_coding_submissions_exercise_id'), table_name='coding_submissions')
    op.drop_table('coding_submissions')
    op.drop_index(op.f('ix_coding_exercise_topics_topic_id'), table_name='coding_exercise_topics')
    op.drop_table('coding_exercise_topics')
    op.drop_index(op.f('ix_coding_drafts_user_id'), table_name='coding_drafts')
    op.drop_index(op.f('ix_coding_drafts_exercise_id'), table_name='coding_drafts')
    op.drop_table('coding_drafts')
    op.drop_index(op.f('ix_qa_questions_user_id'), table_name='qa_questions')
    op.drop_index(op.f('ix_qa_questions_lecture_id'), table_name='qa_questions')
    op.drop_index(op.f('ix_qa_questions_created_at'), table_name='qa_questions')
    op.drop_index(op.f('ix_qa_questions_course_id'), table_name='qa_questions')
    op.drop_table('qa_questions')
    op.drop_index(op.f('ix_lecture_subtitles_lecture_id'), table_name='lecture_subtitles')
    op.drop_table('lecture_subtitles')
    op.drop_index(op.f('ix_lecture_resources_lecture_id'), table_name='lecture_resources')
    op.drop_table('lecture_resources')
    op.drop_index('ix_lecture_notes_user_lecture', table_name='lecture_notes')
    op.drop_index(op.f('ix_lecture_notes_lecture_id'), table_name='lecture_notes')
    op.drop_table('lecture_notes')
    op.drop_index('ix_lecture_bookmarks_user_lecture', table_name='lecture_bookmarks')
    op.drop_index(op.f('ix_lecture_bookmarks_lecture_id'), table_name='lecture_bookmarks')
    op.drop_table('lecture_bookmarks')
    op.drop_index(op.f('ix_coding_exercises_lecture_id'), table_name='coding_exercises')
    op.drop_index(op.f('ix_coding_exercises_course_id'), table_name='coding_exercises')
    op.drop_table('coding_exercises')
    op.drop_index(op.f('ix_wishlist_items_user_id'), table_name='wishlist_items')
    op.drop_index(op.f('ix_wishlist_items_course_id'), table_name='wishlist_items')
    op.drop_table('wishlist_items')
    op.drop_index(op.f('ix_learning_path_enrollments_user_id'), table_name='learning_path_enrollments')
    op.drop_index(op.f('ix_learning_path_enrollments_path_id'), table_name='learning_path_enrollments')
    op.drop_table('learning_path_enrollments')
    op.drop_index(op.f('ix_learning_path_courses_path_id'), table_name='learning_path_courses')
    op.drop_index(op.f('ix_learning_path_courses_course_id'), table_name='learning_path_courses')
    op.drop_table('learning_path_courses')
    op.drop_index(op.f('ix_learning_goals_user_id'), table_name='learning_goals')
    op.drop_table('learning_goals')
    op.drop_index(op.f('ix_course_topics_topic_id'), table_name='course_topics')
    op.drop_table('course_topics')
    op.drop_index(op.f('ix_course_approval_logs_course_id'), table_name='course_approval_logs')
    op.drop_index(op.f('ix_course_approval_logs_actor_id'), table_name='course_approval_logs')
    op.drop_table('course_approval_logs')
    op.drop_index(op.f('ix_announcements_created_at'), table_name='announcements')
    op.drop_index(op.f('ix_announcements_course_id'), table_name='announcements')
    op.drop_index(op.f('ix_announcements_author_id'), table_name='announcements')
    op.drop_table('announcements')
    op.drop_index(op.f('ix_ai_messages_conversation_id'), table_name='ai_messages')
    op.drop_table('ai_messages')
    op.drop_index(op.f('ix_user_topic_mastery_user_id'), table_name='user_topic_mastery')
    op.drop_index(op.f('ix_user_topic_mastery_topic_id'), table_name='user_topic_mastery')
    op.drop_table('user_topic_mastery')
    op.drop_index(op.f('ix_user_streaks_user_id'), table_name='user_streaks')
    op.drop_table('user_streaks')
    op.drop_index(op.f('ix_user_badges_user_id'), table_name='user_badges')
    op.drop_index(op.f('ix_user_badges_badge_id'), table_name='user_badges')
    op.drop_table('user_badges')
    op.drop_index('ix_recommendations_user_created', table_name='recommendations')
    op.drop_table('recommendations')
    op.drop_index('ix_point_transactions_user_created', table_name='point_transactions')
    op.drop_table('point_transactions')
    op.drop_table('platform_settings')
    op.drop_index('ix_notifications_user_unread', table_name='notifications')
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_table('notifications')
    op.drop_index(op.f('ix_notification_preferences_user_id'), table_name='notification_preferences')
    op.drop_table('notification_preferences')
    op.drop_index('ix_login_history_user_created', table_name='login_history')
    op.drop_index(op.f('ix_login_history_created_at'), table_name='login_history')
    op.drop_table('login_history')
    op.drop_index(op.f('ix_learning_paths_slug'), table_name='learning_paths')
    op.drop_table('learning_paths')
    op.drop_index(op.f('ix_learning_activity_daily_user_id'), table_name='learning_activity_daily')
    op.drop_index(op.f('ix_learning_activity_daily_activity_date'), table_name='learning_activity_daily')
    op.drop_table('learning_activity_daily')
    op.drop_index('ix_content_reports_target', table_name='content_reports')
    op.drop_index(op.f('ix_content_reports_status'), table_name='content_reports')
    op.drop_index(op.f('ix_content_reports_reporter_id'), table_name='content_reports')
    op.drop_table('content_reports')
    op.drop_index('ix_auth_tokens_user_purpose', table_name='auth_tokens')
    op.drop_table('auth_tokens')
    op.drop_index('ix_audit_logs_entity', table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_created_at'), table_name='audit_logs')
    op.drop_index('ix_audit_logs_actor_created', table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_table('audit_logs')
    op.drop_index('ix_ai_conversations_user_updated', table_name='ai_conversations')
    op.drop_table('ai_conversations')
    op.drop_index(op.f('ix_topics_slug'), table_name='topics')
    op.drop_index(op.f('ix_topics_parent_id'), table_name='topics')
    op.drop_table('topics')
    op.drop_index(op.f('ix_badges_code'), table_name='badges')
    op.drop_table('badges')
