from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.database.session import get_db
from app.models.user import User
from app.schemas.settings import SettingResponse, SettingsBulkUpdate, SettingUpdate
from app.services.settings_admin_service import settings_admin_service

router = APIRouter()


@router.get("/public")
def public_settings(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """**Public**: settings safe for visitors (platform name, logo, languages, registration open...)."""
    return settings_admin_service.public(db)


@router.get("", response_model=List[SettingResponse])
@router.get("/", response_model=List[SettingResponse], include_in_schema=False)
def list_settings(
    category: Optional[str] = Query(None, description="general, users, courses, certificates, notifications, security, content"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """All platform settings (Super Admin), optionally one category."""
    return settings_admin_service.list(db, category)


@router.put("", response_model=List[SettingResponse])
def update_settings(
    body: SettingsBulkUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """Change several settings at once, e.g. `{"values": {"security.lockout_minutes": 30}}`. All or nothing."""
    return settings_admin_service.update_many(db, body.values, current_user, request)


@router.put("/{key}", response_model=SettingResponse)
def update_setting(
    key: str,
    body: SettingUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """Change one setting (the value keeps the type of its default: switch, number, list or text)."""
    return settings_admin_service.update_many(db, {key: body.value}, current_user, request)[0]
