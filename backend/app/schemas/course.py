from typing import Optional, List
from datetime import datetime
from pydantic import field_validator
from app.schemas.common import BaseSchema, StorageUrl

COURSE_LEVELS = ("beginner", "intermediate", "advanced", "all_levels")


def _clean_level(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    cleaned = v.strip().lower().replace(" ", "_").replace("-", "_")
    if not cleaned:
        return None
    if cleaned not in COURSE_LEVELS:
        raise ValueError("level must be one of: " + ", ".join(COURSE_LEVELS))
    return cleaned


def _clean_text_list(v: Optional[List[str]], label: str) -> Optional[List[str]]:
    if v is None:
        return None
    items = [str(x).strip() for x in v if str(x).strip()]
    if len(items) > 20:
        raise ValueError(f"{label} cannot have more than 20 items")
    if any(len(x) > 255 for x in items):
        raise ValueError(f"Each item in {label} must be at most 255 characters")
    return items


class CourseMetaMixin(BaseSchema):
    """Catalog details shown on the course page."""
    level: Optional[str] = None
    language: Optional[str] = None
    learning_objectives: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None

    @field_validator("level")
    @classmethod
    def validate_level(cls, v: Optional[str]) -> Optional[str]:
        return _clean_level(v)

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if len(cleaned) > 32:
            raise ValueError("language cannot exceed 32 characters")
        return cleaned or None

    @field_validator("learning_objectives")
    @classmethod
    def validate_objectives(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        return _clean_text_list(v, "learning_objectives")

    @field_validator("prerequisites")
    @classmethod
    def validate_prerequisites(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        return _clean_text_list(v, "prerequisites")

class CourseInstructorSummary(BaseSchema):
    """
    Public summary of a course's instructor. Deliberately has no email address: the catalog is public.
    """
    id: str
    full_name: str
    avatar_url: StorageUrl = None

class CourseCategorySummary(BaseSchema):
    """
    Summary of category associated with a course.
    """
    id: str
    name: str
    slug: str

class CourseBase(CourseMetaMixin):
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

class CourseUpdate(CourseMetaMixin):
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

class CourseStatus:
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    PUBLISHED = "published"
    CHANGES_REQUESTED = "changes_requested"
    REJECTED = "rejected"

    ALL_STATUSES = {DRAFT, PENDING_REVIEW, PUBLISHED, CHANGES_REQUESTED, REJECTED}

class CourseReviewRequest(BaseSchema):
    feedback: str

    @field_validator("feedback")
    @classmethod
    def validate_feedback(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Feedback cannot be empty")
        if len(cleaned) > 2000:
            raise ValueError("Feedback cannot exceed 2000 characters")
        return cleaned

class CourseRejectRequest(BaseSchema):
    reason: str

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Reason cannot be empty")
        if len(cleaned) > 2000:
            raise ValueError("Reason cannot exceed 2000 characters")
        return cleaned

class CourseResponse(BaseSchema):
    id: str
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    instructor_id: Optional[str] = None
    category_id: Optional[str] = None
    organization_id: Optional[str] = None
    thumbnail_url: StorageUrl = None
    level: Optional[str] = None
    language: Optional[str] = None
    learning_objectives: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None
    status: str = "draft"
    reviewer_id: Optional[str] = None
    review_feedback: Optional[str] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    instructor: Optional[CourseInstructorSummary] = None
    reviewer: Optional[CourseInstructorSummary] = None
    category: Optional[CourseCategorySummary] = None

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v: Optional[str]) -> str:
        if v is None:
            return "draft"
        return str(v).lower()

class CourseApprovalLogResponse(BaseSchema):
    id: str
    course_id: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    action: str
    from_status: Optional[str] = None
    to_status: str
    comment: Optional[str] = None
    created_at: Optional[datetime] = None


class CourseListResponse(BaseSchema):
    courses: List[CourseResponse]
    total: int
    page: int
    limit: int
    total_pages: int
