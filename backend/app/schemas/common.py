from datetime import datetime
from typing import Optional, Any
from typing import Annotated
from pydantic import AfterValidator, BaseModel, ConfigDict

class BaseSchema(BaseModel):
    """
    Common foundation base schema for all Pydantic models.
    Enables ORM attribute loading and serialization.
    """
    model_config = ConfigDict(from_attributes=True)

class IDSchema(BaseSchema):
    """
    Base schema for entities with a primary key identifier.
    """
    id: str

class TimestampSchema(BaseSchema):
    """
    Base schema for entities tracking creation and update timestamps.
    """
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class HealthResponse(BaseSchema):
    """
    Schema for system health probe responses.
    """
    status: str
    service: str
    database: str
    environment: Optional[str] = None

class MessageResponse(BaseSchema):
    """
    Generic message response schema.
    """
    message: str
    detail: Optional[str] = None

class ErrorResponse(BaseSchema):
    """
    Standardized API error response format.
    """
    detail: Any
    error_type: Optional[str] = None


def _resolve_storage_url(value: Optional[str]) -> Optional[str]:
    from app.services.storage_service import storage_service
    return storage_service.resolve(value)


# A stored file reference (storage://...) shown to clients as a usable, possibly signed, URL.
StorageUrl = Annotated[Optional[str], AfterValidator(_resolve_storage_url)]
