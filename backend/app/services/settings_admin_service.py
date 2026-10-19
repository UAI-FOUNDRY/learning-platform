"""Super Admin editing of platform settings (read access for code lives in platform_settings_service)."""
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.platform_setting import PlatformSetting
from app.models.user import User
from app.services.audit_service import audit_service


def _int_between(lo: int, hi: int):
    def check(v):
        if isinstance(v, bool) or not isinstance(v, int) or not lo <= v <= hi:
            raise ValueError(f"must be a whole number from {lo} to {hi}")
    return check


def _string_list(v):
    if not isinstance(v, list) or not all(isinstance(x, str) and x.strip() for x in v):
        raise ValueError("must be a list of non-empty strings")


# Extra rules for keys where a wrong value would break the platform.
RULES = {
    "security.password_min_length": _int_between(6, 128),
    "security.max_failed_logins": _int_between(0, 100),   # 0 = lockout off
    "security.lockout_minutes": _int_between(0, 1440),
    "courses.max_upload_size_mb": _int_between(1, 10240),
    "content.auto_hide_report_threshold": _int_between(1, 1000),
    "general.supported_languages": _string_list,
    "courses.coding_languages_enabled": _string_list,
}


def _check_value(key: str, current: Any, new: Any) -> None:
    # Keep the type of the seeded default (a boolean switch stays a boolean, a number a number)
    if isinstance(current, bool) and not isinstance(new, bool):
        raise ValueError("must be true or false")
    if isinstance(current, int) and not isinstance(current, bool) and (isinstance(new, bool) or not isinstance(new, int)):
        raise ValueError("must be a whole number")
    if isinstance(current, list) and not isinstance(new, list):
        raise ValueError("must be a list")
    if isinstance(current, str) and new is not None and not isinstance(new, str):
        raise ValueError("must be text")
    if key in RULES and new is not None:
        RULES[key](new)


class SettingsAdminService:
    def list(self, db: Session, category: Optional[str] = None) -> List[PlatformSetting]:
        q = db.query(PlatformSetting)
        if category:
            q = q.filter(PlatformSetting.category == category.strip().lower())
        return q.order_by(PlatformSetting.category, PlatformSetting.key).all()

    def public(self, db: Session) -> Dict[str, Any]:
        rows = db.query(PlatformSetting).filter(PlatformSetting.is_public.is_(True)).all()
        return {r.key: r.value for r in rows}

    def update_many(self, db: Session, values: Dict[str, Any], actor: User, request=None) -> List[PlatformSetting]:
        """All-or-nothing: every key must exist and every value must be valid."""
        rows: Dict[str, PlatformSetting] = {}
        errors: Dict[str, str] = {}
        for key, new in values.items():
            row = db.get(PlatformSetting, key)
            if row is None:
                errors[key] = "unknown setting"
                continue
            try:
                _check_value(key, row.value, new)
            except ValueError as exc:
                errors[key] = str(exc)
                continue
            rows[key] = row
        if errors:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "; ".join(f"{k}: {v}" for k, v in errors.items()),
            )
        changes = {}
        for key, row in rows.items():
            new = values[key]
            if row.value != new:
                changes[key] = [row.value, new]
                row.value = new
                row.updated_by = actor.id
        if changes:
            audit_service.log(db, actor, "settings.updated", "platform_settings", None, changes, request)
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise
        for row in rows.values():
            db.refresh(row)
        return list(rows.values())


settings_admin_service = SettingsAdminService()
