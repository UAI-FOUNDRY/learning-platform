from datetime import datetime
from typing import List, Optional

from pydantic import field_validator

from app.schemas.common import BaseSchema


def _clean(v: str, label: str, max_len: int) -> str:
    v = (v or "").strip()
    if not v:
        raise ValueError(f"{label} cannot be empty")
    if len(v) > max_len:
        raise ValueError(f"{label} cannot exceed {max_len} characters")
    return v


class QuestionCreate(BaseSchema):
    title: str
    body: str
    lecture_id: Optional[str] = None

    @field_validator("title")
    @classmethod
    def check_title(cls, v: str) -> str:
        return _clean(v, "Title", 255)

    @field_validator("body")
    @classmethod
    def check_body(cls, v: str) -> str:
        return _clean(v, "Question", 5000)


class QuestionUpdate(BaseSchema):
    title: Optional[str] = None
    body: Optional[str] = None

    @field_validator("title")
    @classmethod
    def check_title(cls, v: Optional[str]) -> Optional[str]:
        return None if v is None else _clean(v, "Title", 255)

    @field_validator("body")
    @classmethod
    def check_body(cls, v: Optional[str]) -> Optional[str]:
        return None if v is None else _clean(v, "Question", 5000)


class AnswerCreate(BaseSchema):
    body: str
    parent_answer_id: Optional[str] = None

    @field_validator("body")
    @classmethod
    def check_body(cls, v: str) -> str:
        return _clean(v, "Answer", 5000)


class AnswerUpdate(BaseSchema):
    body: str

    @field_validator("body")
    @classmethod
    def check_body(cls, v: str) -> str:
        return _clean(v, "Answer", 5000)


class ResolveRequest(BaseSchema):
    is_resolved: bool = True


class HighlightRequest(BaseSchema):
    highlighted: bool = True


class ModerateRequest(BaseSchema):
    status: str

    @field_validator("status")
    @classmethod
    def check_status(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in ("visible", "hidden", "removed"):
            raise ValueError("status must be visible, hidden or removed")
        return v


class AnswerResponse(BaseSchema):
    id: str
    question_id: str
    parent_answer_id: Optional[str] = None
    user_id: Optional[str] = None
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    body: str
    is_instructor_answer: bool = False
    is_highlighted: bool = False
    status: str = "visible"
    upvote_count: int = 0
    has_upvoted: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    replies: List["AnswerResponse"] = []


class QuestionResponse(BaseSchema):
    id: str
    course_id: str
    lecture_id: Optional[str] = None
    user_id: Optional[str] = None
    author_name: Optional[str] = None
    title: str
    body: str
    is_resolved: bool = False
    status: str = "visible"
    answer_count: int = 0
    has_instructor_answer: bool = False
    is_following: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class QuestionDetailResponse(QuestionResponse):
    answers: List[AnswerResponse] = []


class UpvoteResponse(BaseSchema):
    upvoted: bool
    upvote_count: int


class ReportCreate(BaseSchema):
    target_type: str
    target_id: str
    reason: str
    details: Optional[str] = None

    @field_validator("target_type")
    @classmethod
    def check_type(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in ("course", "review", "qa_question", "qa_answer", "user"):
            raise ValueError("target_type must be course, review, qa_question, qa_answer or user")
        return v

    @field_validator("reason")
    @classmethod
    def check_reason(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in ("spam", "abuse", "inappropriate", "copyright", "other"):
            raise ValueError("reason must be spam, abuse, inappropriate, copyright or other")
        return v

    @field_validator("details")
    @classmethod
    def check_details(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if len(v) > 2000:
            raise ValueError("details cannot exceed 2000 characters")
        return v or None


class ReportResolve(BaseSchema):
    status: str
    resolution_note: Optional[str] = None
    action: str = "none"  # none | hide | remove | restore  (applied to the reported content)

    @field_validator("status")
    @classmethod
    def check_status(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in ("reviewing", "resolved", "dismissed"):
            raise ValueError("status must be reviewing, resolved or dismissed")
        return v

    @field_validator("action")
    @classmethod
    def check_action(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in ("none", "hide", "remove", "restore"):
            raise ValueError("action must be none, hide, remove or restore")
        return v

    @field_validator("resolution_note")
    @classmethod
    def check_note(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if len(v) > 2000:
            raise ValueError("resolution_note cannot exceed 2000 characters")
        return v or None


class ReportResponse(BaseSchema):
    id: str
    reporter_id: Optional[str] = None
    reporter_name: Optional[str] = None
    target_type: str
    target_id: str
    target_preview: Optional[str] = None
    target_status: Optional[str] = None
    reason: str
    details: Optional[str] = None
    status: str
    resolved_by: Optional[str] = None
    resolution_note: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


AnswerResponse.model_rebuild()
