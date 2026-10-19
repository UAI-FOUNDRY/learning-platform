from datetime import datetime
from typing import Any, Dict, Optional

from app.schemas.common import BaseSchema


class SettingResponse(BaseSchema):
    key: str
    value: Any = None
    category: str
    description: Optional[str] = None
    is_public: bool = False
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None


class SettingUpdate(BaseSchema):
    value: Any = None


class SettingsBulkUpdate(BaseSchema):
    values: Dict[str, Any]


class AuditLogResponse(BaseSchema):
    id: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    changes: Optional[Any] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None


class LoginHistoryResponse(BaseSchema):
    id: str
    user_id: Optional[str] = None
    email: str
    success: bool
    failure_reason: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: Optional[datetime] = None
