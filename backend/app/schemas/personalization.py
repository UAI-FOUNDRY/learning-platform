from datetime import date, datetime
from typing import List, Optional

from pydantic import field_validator

from app.schemas.common import BaseSchema, StorageUrl


def _name(v: str, label: str, n: int = 128) -> str:
    v = (v or "").strip()
    if not v or len(v) > n:
        raise ValueError(f"{label} is required (max {n} characters)")
    return v


# ------------------------------------------------------------------ topics
class TopicCreate(BaseSchema):
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None

    @field_validator("name")
    @classmethod
    def v_name(cls, v):
        return _name(v, "name")


class TopicUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None

    @field_validator("name")
    @classmethod
    def v_name(cls, v):
        return _name(v, "name") if v is not None else v


class TopicResponse(BaseSchema):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    parent_id: Optional[str] = None


class TopicTagRequest(BaseSchema):
    topic_ids: List[str]

    @field_validator("topic_ids")
    @classmethod
    def v_ids(cls, v):
        if len(set(v)) > 20:
            raise ValueError("at most 20 topics")
        return list(dict.fromkeys(v))


class MasteryResponse(BaseSchema):
    topic_id: str
    topic_name: str
    attempts: int
    correct: int
    mastery_score: float
    last_practiced_at: Optional[datetime] = None
    is_weak: bool = False


# ------------------------------------------------------------------ goals
GOAL_TYPES = ("weekly_minutes", "complete_course", "master_topic", "custom")


class GoalCreate(BaseSchema):
    goal_type: str = "custom"
    title: Optional[str] = None
    target_value: Optional[int] = None
    course_id: Optional[str] = None
    topic_id: Optional[str] = None
    target_date: Optional[date] = None

    @field_validator("goal_type")
    @classmethod
    def v_type(cls, v):
        if v not in GOAL_TYPES:
            raise ValueError("goal_type must be one of: " + ", ".join(GOAL_TYPES))
        return v

    @field_validator("title")
    @classmethod
    def v_title(cls, v):
        return _name(v, "title", 255) if v is not None else v

    @field_validator("target_value")
    @classmethod
    def v_target(cls, v):
        if v is not None and not 1 <= v <= 100000:
            raise ValueError("target_value must be between 1 and 100000")
        return v


class GoalUpdate(BaseSchema):
    title: Optional[str] = None
    target_value: Optional[int] = None
    target_date: Optional[date] = None
    status: Optional[str] = None

    @field_validator("title")
    @classmethod
    def v_title(cls, v):
        return _name(v, "title", 255) if v is not None else v

    @field_validator("target_value")
    @classmethod
    def v_target(cls, v):
        return GoalCreate.v_target(v)

    @field_validator("status")
    @classmethod
    def v_status(cls, v):
        if v is not None and v not in ("active", "completed", "abandoned"):
            raise ValueError("status must be active, completed or abandoned")
        return v


class GoalResponse(BaseSchema):
    id: str
    goal_type: str
    title: str
    target_value: Optional[int] = None
    course_id: Optional[str] = None
    topic_id: Optional[str] = None
    target_date: Optional[date] = None
    status: str
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    current_value: Optional[int] = None
    progress_percent: int = 0


# ------------------------------------------------------------------ learning paths
class PathCreate(BaseSchema):
    title: str
    description: Optional[str] = None
    level: Optional[str] = None
    course_ids: List[str] = []

    @field_validator("title")
    @classmethod
    def v_title(cls, v):
        return _name(v, "title", 255)


class PathUpdate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    level: Optional[str] = None
    course_ids: Optional[List[str]] = None
    status: Optional[str] = None

    @field_validator("title")
    @classmethod
    def v_title(cls, v):
        return _name(v, "title", 255) if v is not None else v

    @field_validator("status")
    @classmethod
    def v_status(cls, v):
        if v is not None and v not in ("draft", "published", "archived"):
            raise ValueError("status must be draft, published or archived")
        return v


class PathCourse(BaseSchema):
    course_id: str
    title: str
    thumbnail_url: StorageUrl = None
    order_index: int
    status: str                                  # course status
    enrolled: bool = False
    completed: bool = False
    progress_percent: int = 0


class PathResponse(BaseSchema):
    id: str
    title: str
    slug: str
    description: Optional[str] = None
    level: Optional[str] = None
    status: str
    course_count: int = 0
    enrolled: bool = False
    progress_percent: int = 0
    completed_at: Optional[datetime] = None
    courses: List[PathCourse] = []


# ------------------------------------------------------------------ recommendations
class RecommendationResponse(BaseSchema):
    id: str
    item_type: str
    item_id: str
    title: str
    thumbnail_url: StorageUrl = None
    reason: Optional[str] = None
    score: Optional[float] = None
    source: str
    created_at: Optional[datetime] = None
