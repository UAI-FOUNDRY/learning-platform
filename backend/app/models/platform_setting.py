"""
Key/value platform settings managed by Super Admin (PROJECT.md section 28).
Defaults are inserted by migration 0004.
"""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey, JSON, CheckConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from app.database.connection import Base

SETTING_CATEGORIES = (
    "general", "users", "courses", "certificates", "notifications", "security", "content",
)


class PlatformSetting(Base):
    __tablename__ = "platform_settings"
    __table_args__ = (
        CheckConstraint(
            "category IN ('general', 'users', 'courses', 'certificates', 'notifications', 'security', 'content')",
            name="ck_platform_settings_category",
        ),
    )

    key = Column(String(128), primary_key=True)  # e.g. "general.platform_name"
    value = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    category = Column(String(32), nullable=False, default="general", server_default="general")
    description = Column(Text, nullable=True)
    # Public settings (name, logo, languages) may be served to logged-out visitors.
    is_public = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    updated_by = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
