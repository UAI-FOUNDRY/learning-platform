from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict

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
