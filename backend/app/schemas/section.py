from typing import Optional
from datetime import datetime
from pydantic import field_validator
from app.schemas.common import BaseSchema

class SectionBase(BaseSchema):
    title: str
    order_index: Optional[int] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Section title cannot be empty")
        if len(cleaned) > 255:
            raise ValueError("Section title cannot exceed 255 characters")
        return cleaned

    @field_validator("order_index")
    @classmethod
    def validate_order_index(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("order_index must be greater than or equal to 0")
        return v

class SectionCreate(SectionBase):
    pass

class SectionUpdate(BaseSchema):
    title: Optional[str] = None
    order_index: Optional[int] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("Section title cannot be empty")
            if len(cleaned) > 255:
                raise ValueError("Section title cannot exceed 255 characters")
            return cleaned
        return v

    @field_validator("order_index")
    @classmethod
    def validate_order_index(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("order_index must be greater than or equal to 0")
        return v

class SectionResponse(BaseSchema):
    id: str
    course_id: str
    title: str
    order_index: int
    created_at: Optional[datetime] = None
