from typing import Optional, List
from datetime import datetime
from pydantic import field_validator
from app.schemas.common import BaseSchema

class CourseInstructorSummary(BaseSchema):
    """
    Safe public summary of course instructor without sensitive credentials.
    """
    id: str
    full_name: str
    email: str

class CourseCategorySummary(BaseSchema):
    """
    Summary of category associated with a course.
    """
    id: str
    name: str
    slug: str

class CourseBase(BaseSchema):
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    category_id: str

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Course title cannot be empty")
        if len(cleaned) > 255:
            raise ValueError("Course title cannot exceed 255 characters")
        return cleaned

    @field_validator("subtitle")
    @classmethod
    def validate_subtitle(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if len(cleaned) > 255:
                raise ValueError("Course subtitle cannot exceed 255 characters")
            return cleaned or None
        return None

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return v.strip() or None
        return None

    @field_validator("category_id")
    @classmethod
    def validate_category_id(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("category_id cannot be empty")
        return cleaned

class CourseCreate(CourseBase):
    instructor_id: Optional[str] = None

class CourseUpdate(BaseSchema):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    instructor_id: Optional[str] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("Course title cannot be empty")
            if len(cleaned) > 255:
                raise ValueError("Course title cannot exceed 255 characters")
            return cleaned
        return v

    @field_validator("subtitle")
    @classmethod
    def validate_subtitle(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if len(cleaned) > 255:
                raise ValueError("Course subtitle cannot exceed 255 characters")
            return cleaned or None
        return None

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return v.strip() or None
        return None

    @field_validator("category_id")
    @classmethod
    def validate_category_id(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("category_id cannot be empty")
            return cleaned
        return v

class CourseResponse(BaseSchema):
    id: str
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    instructor_id: Optional[str] = None
    category_id: Optional[str] = None
    status: str = "draft"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    instructor: Optional[CourseInstructorSummary] = None
    category: Optional[CourseCategorySummary] = None

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v: Optional[str]) -> str:
        if v is None:
            return "draft"
        return str(v).lower()

class CourseListResponse(BaseSchema):
    courses: List[CourseResponse]
    total: int
    page: int
    limit: int
    total_pages: int
