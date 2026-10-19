from typing import Optional
from datetime import datetime
from pydantic import field_validator
from app.schemas.common import BaseSchema

class LectureBase(BaseSchema):
    title: str
    content_url: Optional[str] = None
    duration: Optional[int] = 0
    order_index: Optional[int] = None
    is_preview: bool = False

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Lecture title cannot be empty")
        if len(cleaned) > 255:
            raise ValueError("Lecture title cannot exceed 255 characters")
        return cleaned

    @field_validator("content_url")
    @classmethod
    def validate_content_url(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            return cleaned or None
        return None

    @field_validator("duration")
    @classmethod
    def validate_duration(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("duration must be greater than or equal to 0")
        return v if v is not None else 0

    @field_validator("order_index")
    @classmethod
    def validate_order_index(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("order_index must be greater than or equal to 0")
        return v

class LectureCreate(LectureBase):
    pass

class LectureUpdate(BaseSchema):
    title: Optional[str] = None
    content_url: Optional[str] = None
    duration: Optional[int] = None
    order_index: Optional[int] = None
    is_preview: Optional[bool] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("Lecture title cannot be empty")
            if len(cleaned) > 255:
                raise ValueError("Lecture title cannot exceed 255 characters")
            return cleaned
        return v

    @field_validator("content_url")
    @classmethod
    def validate_content_url(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            return cleaned or None
        return None

    @field_validator("duration")
    @classmethod
    def validate_duration(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("duration must be greater than or equal to 0")
        return v

    @field_validator("order_index")
    @classmethod
    def validate_order_index(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("order_index must be greater than or equal to 0")
        return v

class LectureResponse(BaseSchema):
    id: str
    section_id: str
    title: str
    content_url: Optional[str] = None
    duration: int = 0
    order_index: int
    is_preview: bool = False
    created_at: Optional[datetime] = None
