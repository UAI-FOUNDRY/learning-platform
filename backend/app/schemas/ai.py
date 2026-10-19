from datetime import datetime
from typing import List, Optional

from pydantic import field_validator

from app.schemas.common import BaseSchema

ASSISTANTS = ("learning", "coding", "instructor")
CONTEXTS = ("none", "course", "lecture", "coding_exercise", "coding_submission", "quiz")


class ConversationCreate(BaseSchema):
    assistant_type: str = "learning"
    context_type: str = "none"
    context_id: Optional[str] = None
    title: Optional[str] = None

    @field_validator("assistant_type")
    @classmethod
    def v_assistant(cls, v: str) -> str:
        if v not in ASSISTANTS:
            raise ValueError("assistant_type must be learning, coding or instructor")
        return v

    @field_validator("context_type")
    @classmethod
    def v_context(cls, v: str) -> str:
        if v not in CONTEXTS:
            raise ValueError("context_type must be one of: " + ", ".join(CONTEXTS))
        return v

    @field_validator("title")
    @classmethod
    def v_title(cls, v: Optional[str]) -> Optional[str]:
        return (v.strip()[:255] or None) if v else None


class MessageCreate(BaseSchema):
    content: str

    @field_validator("content")
    @classmethod
    def v_content(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > 4000:
            raise ValueError("Message cannot exceed 4000 characters")
        return v


class MessageResponse_(BaseSchema):
    id: str
    role: str
    content: str
    created_at: Optional[datetime] = None


class ConversationResponse(BaseSchema):
    id: str
    assistant_type: str
    context_type: str
    context_id: Optional[str] = None
    title: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ConversationDetail(ConversationResponse):
    messages: List[MessageResponse_] = []


class ExchangeResponse(BaseSchema):
    user_message: MessageResponse_
    assistant_message: MessageResponse_
    messages_left_today: int


class AIStatus(BaseSchema):
    enabled: bool
    provider: str
    daily_limit: int
    used_today: int
    reason: Optional[str] = None
