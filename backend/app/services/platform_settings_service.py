"""
Read Super Admin-managed platform settings (table: platform_settings).

Defaults are inserted by Alembic revision 0004. Code always passes a fallback, so a
missing row (e.g. in the SQLite test database) never breaks a feature.
"""
from typing import Any
from sqlalchemy.orm import Session

from app.models.platform_setting import PlatformSetting


def get_setting(db: Session, key: str, default: Any = None) -> Any:
    try:
        row = db.get(PlatformSetting, key)
    except Exception:
        return default
    if row is None or row.value is None:
        return default
    return row.value
