from datetime import datetime
from typing import Dict, Optional

from pydantic import Field, field_validator

from app.schemas.common import BaseSchema

MAX_REVIEW_LENGTH = 5000


def _clean_text(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    cleaned = v.strip()
    if len(cleaned) > MAX_REVIEW_LENGTH:
        raise ValueError(f"Review text must be at most {MAX_REVIEW_LENGTH} characters")
    return cleaned or None


class ReviewCreate(BaseSchema):
    course_id: str
    rating: int = Field(..., ge=1, le=5)
    review_text: Optional[str] = None

    @field_validator("review_text")
    @classmethod
    def validate_text(cls, v):
        return _clean_text(v)


class ReviewUpdate(BaseSchema):
    rating: Optional[int] = Field(None, ge=1, le=5)
    review_text: Optional[str] = None

    @field_validator("review_text")
    @classmethod
    def validate_text(cls, v):
        return _clean_text(v)


class ReviewModerate(BaseSchema):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if cleaned not in ("visible", "hidden", "removed"):
            raise ValueError("Status must be one of: visible, hidden, removed")
        return cleaned


class ReviewResponse(BaseSchema):
    id: str
    course_id: str
    user_id: str
    reviewer_name: Optional[str] = None
    rating: int
    review_text: Optional[str] = None
    status: str = "visible"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CourseRatingSummary(BaseSchema):
    course_id: str
    average_rating: Optional[float] = None  # None when there are no reviews yet
    review_count: int = 0
    distribution: Dict[int, int] = Field(default_factory=dict)  # {5: 10, 4: 3, ...}
