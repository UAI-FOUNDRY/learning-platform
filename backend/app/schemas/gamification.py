from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import field_validator

from app.schemas.common import BaseSchema, StorageUrl


class StreakView(BaseSchema):
    current: int = 0
    longest: int = 0
    last_activity_date: Optional[date] = None
    active_today: bool = False


class GamificationSummary(BaseSchema):
    user_id: str
    total_points: int
    level: int
    level_start_points: int
    next_level_points: int
    points_to_next_level: int
    level_progress_percent: int
    rank: Optional[int] = None
    badges_earned: int
    learning_streak: StreakView
    coding_streak: StreakView


class PointTransactionResponse(BaseSchema):
    id: str
    points: int
    reason: str
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    created_at: Optional[datetime] = None


class BadgeStatus(BaseSchema):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    icon_url: StorageUrl = None
    category: str
    points: int = 0
    earned: bool = False
    awarded_at: Optional[datetime] = None


class ActivityDay(BaseSchema):
    date: date
    minutes_learned: int = 0
    lectures_completed: int = 0
    quizzes_taken: int = 0
    coding_submissions: int = 0
    exercises_solved: int = 0
    points_earned: int = 0


class LeaderboardEntry(BaseSchema):
    rank: int
    user_id: str
    full_name: str
    avatar_url: StorageUrl = None
    points: int
    level: int
    is_me: bool = False


class LeaderboardMe(BaseSchema):
    rank: int
    points: int
    level: int


class LeaderboardResponse(BaseSchema):
    period: str
    entries: List[LeaderboardEntry]
    me: Optional[LeaderboardMe] = None


class BadgeAdminResponse(BaseSchema):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    category: str
    criteria: Optional[Dict[str, Any]] = None
    points: int = 0
    is_active: bool = True


class BadgeCreate(BaseSchema):
    code: str
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    category: str = "milestone"
    criteria: Dict[str, Any]
    points: int = 0
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def check_code(cls, v: str) -> str:
        v = (v or "").strip().lower()
        if not v or len(v) > 64 or not all(c.isalnum() or c in "_-" for c in v):
            raise ValueError("code must be 1-64 characters: letters, numbers, - and _")
        return v

    @field_validator("name")
    @classmethod
    def check_name(cls, v: str) -> str:
        v = (v or "").strip()
        if not v or len(v) > 128:
            raise ValueError("name is required (max 128 characters)")
        return v

    @field_validator("category")
    @classmethod
    def check_category(cls, v: str) -> str:
        if v not in ("learning", "coding", "quiz", "community", "milestone", "skill"):
            raise ValueError("category must be learning, coding, quiz, community, milestone or skill")
        return v

    @field_validator("points")
    @classmethod
    def check_points(cls, v: int) -> int:
        if v < 0 or v > 100000:
            raise ValueError("points must be between 0 and 100000")
        return v


class BadgeUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    category: Optional[str] = None
    criteria: Optional[Dict[str, Any]] = None
    points: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("category")
    @classmethod
    def check_category(cls, v: Optional[str]) -> Optional[str]:
        return BadgeCreate.check_category(v) if v is not None else v

    @field_validator("points")
    @classmethod
    def check_points(cls, v: Optional[int]) -> Optional[int]:
        return BadgeCreate.check_points(v) if v is not None else v


class PointsAdjustRequest(BaseSchema):
    user_id: str
    points: int
    reason: str
