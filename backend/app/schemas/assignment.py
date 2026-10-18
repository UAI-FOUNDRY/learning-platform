from datetime import datetime
from typing import Optional, List
from urllib.parse import urlparse
from pydantic import field_validator
from app.schemas.common import BaseSchema


# ---------------------------------------------------------
# Assignment Schemas
# ---------------------------------------------------------

class AssignmentBase(BaseSchema):
    title: str
    instructions: Optional[str] = None
    deadline: Optional[datetime] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Assignment title cannot be empty")
        if len(cleaned) > 255:
            raise ValueError("Assignment title cannot exceed 255 characters")
        return cleaned

    @field_validator("instructions")
    @classmethod
    def validate_instructions(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            return cleaned or None
        return None


class AssignmentCreate(AssignmentBase):
    section_id: Optional[str] = None

    @field_validator("section_id")
    @classmethod
    def validate_section_id(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            return cleaned or None
        return None


class AssignmentUpdate(BaseSchema):
    title: Optional[str] = None
    instructions: Optional[str] = None
    deadline: Optional[datetime] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("Assignment title cannot be empty")
            if len(cleaned) > 255:
                raise ValueError("Assignment title cannot exceed 255 characters")
            return cleaned
        return None

    @field_validator("instructions")
    @classmethod
    def validate_instructions(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            return cleaned or None
        return None


class AssignmentResponse(BaseSchema):
    id: str
    section_id: str
    title: str
    instructions: Optional[str] = None
    deadline: Optional[datetime] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------
# Submission Schemas
# ---------------------------------------------------------

class SubmissionBase(BaseSchema):
    submission_url: str

    @field_validator("submission_url")
    @classmethod
    def validate_submission_url(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("submission_url cannot be empty")
        parsed = urlparse(cleaned)
        if parsed.scheme.lower() not in ("http", "https") or not parsed.netloc:
            raise ValueError("submission_url must be a valid HTTP or HTTPS URL")
        return cleaned


class SubmissionCreate(SubmissionBase):
    assignment_id: Optional[str] = None

    @field_validator("assignment_id")
    @classmethod
    def validate_assignment_id(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            return cleaned or None
        return None


class SubmissionGrade(BaseSchema):
    grade: str

    @field_validator("grade")
    @classmethod
    def validate_grade(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Grade cannot be empty")
        if len(cleaned) > 32:
            raise ValueError("Grade cannot exceed 32 characters")
        return cleaned


class SubmissionUpdate(BaseSchema):
    submission_url: Optional[str] = None
    grade: Optional[str] = None

    @field_validator("submission_url")
    @classmethod
    def validate_submission_url(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("submission_url cannot be empty")
            parsed = urlparse(cleaned)
            if parsed.scheme.lower() not in ("http", "https") or not parsed.netloc:
                raise ValueError("submission_url must be a valid HTTP or HTTPS URL")
            return cleaned
        return None

    @field_validator("grade")
    @classmethod
    def validate_grade(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("Grade cannot be empty")
            if len(cleaned) > 32:
                raise ValueError("Grade cannot exceed 32 characters")
            return cleaned
        return None


class SubmissionResponse(BaseSchema):
    id: str
    assignment_id: str
    user_id: str
    submission_url: Optional[str] = None
    grade: Optional[str] = None
    submitted_at: Optional[datetime] = None


class SubmissionDetailResponse(SubmissionResponse):
    user_name: Optional[str] = None
    user_email: Optional[str] = None


# ---------------------------------------------------------
# Assignment Detail Response Schemas
# ---------------------------------------------------------

class AssignmentDetailResponse(AssignmentResponse):
    submissions: List[SubmissionResponse] = []


class AssignmentLearnerDetailResponse(AssignmentResponse):
    my_submission: Optional[SubmissionResponse] = None
