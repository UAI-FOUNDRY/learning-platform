from datetime import datetime
from typing import Optional

from pydantic import field_validator

from app.schemas.common import BaseSchema


class NoteCreate(BaseSchema):
    content: str
    timestamp_seconds: Optional[int] = None

    @field_validator("content")
    @classmethod
    def check_content(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("Note cannot be empty")
        if len(v) > 10000:
            raise ValueError("Note cannot exceed 10000 characters")
        return v

    @field_validator("timestamp_seconds")
    @classmethod
    def check_ts(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("timestamp_seconds must be 0 or more")
        return v


class NoteUpdate(BaseSchema):
    content: Optional[str] = None
    timestamp_seconds: Optional[int] = None

    @field_validator("content")
    @classmethod
    def check_content(cls, v: Optional[str]) -> Optional[str]:
        return NoteCreate.check_content(v) if v is not None else v

    @field_validator("timestamp_seconds")
    @classmethod
    def check_ts(cls, v: Optional[int]) -> Optional[int]:
        return NoteCreate.check_ts(v) if v is not None else v


class NoteResponse(BaseSchema):
    id: str
    lecture_id: str
    course_id: Optional[str] = None
    lecture_title: Optional[str] = None
    content: str
    timestamp_seconds: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class BookmarkCreate(BaseSchema):
    timestamp_seconds: int = 0
    label: Optional[str] = None

    @field_validator("timestamp_seconds")
    @classmethod
    def check_ts(cls, v: int) -> int:
        if v < 0:
            raise ValueError("timestamp_seconds must be 0 or more")
        return v

    @field_validator("label")
    @classmethod
    def check_label(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if len(v) > 255:
            raise ValueError("Label cannot exceed 255 characters")
        return v or None


class BookmarkResponse(BaseSchema):
    id: str
    lecture_id: str
    course_id: Optional[str] = None
    lecture_title: Optional[str] = None
    timestamp_seconds: int = 0
    label: Optional[str] = None
    created_at: Optional[datetime] = None


class WishlistCourse(BaseSchema):
    id: str
    title: str
    subtitle: Optional[str] = None
    thumbnail_url: Optional[str] = None
    level: Optional[str] = None
    status: str
    instructor_id: Optional[str] = None


class WishlistItemResponse(BaseSchema):
    id: str
    course_id: str
    created_at: Optional[datetime] = None
    course: Optional[WishlistCourse] = None
