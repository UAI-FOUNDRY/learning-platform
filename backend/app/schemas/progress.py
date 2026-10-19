from datetime import datetime
from typing import Optional, List
from pydantic import Field, field_validator, model_validator
from app.schemas.common import BaseSchema


# ---------------------------------------------------------
# Progress Schemas
# ---------------------------------------------------------

class ProgressBase(BaseSchema):
    """
    Base schema for individual lecture progress.
    """
    is_completed: bool = False


class ProgressCreate(ProgressBase):
    """
    Schema for creating a lecture progress record.
    """
    enrollment_id: str
    lecture_id: str
    is_completed: bool = True

    @field_validator("enrollment_id", "lecture_id")
    @classmethod
    def validate_ids(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("ID cannot be empty")
        return cleaned


class LectureProgressUpdate(BaseSchema):
    """
    Schema for updating lecture progress (marking completed/incomplete).
    Defaults to marking completed (True).
    """
    is_completed: Optional[bool] = None  # None + last_position_seconds = just save the position
    last_position_seconds: Optional[int] = Field(None, ge=0, description="Seconds into the video, for resume")

    @model_validator(mode="after")
    def default_to_completed(self):
        # An empty body means "completed"; a body with only a position just saves the position.
        if self.is_completed is None and self.last_position_seconds is None:
            self.is_completed = True
        return self


class ProgressResponse(BaseSchema):
    """
    Schema representing a single lecture progress database record.
    Matches app.models.progress.Progress fields exactly.
    """
    id: str
    enrollment_id: str
    lecture_id: str
    is_completed: bool = False
    last_position_seconds: int = 0
    completed_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CourseProgressResponse(BaseSchema):
    """
    Schema representing a learner's overall progress in a specific course.
    """
    course_id: str
    enrollment_id: Optional[str] = None
    total_lectures: int = Field(default=0, ge=0)
    completed_lectures: int = Field(default=0, ge=0)
    completion_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    completed_lecture_ids: List[str] = Field(default_factory=list)
    next_lecture_id: Optional[str] = None
    is_completed: bool = False

    @field_validator("course_id")
    @classmethod
    def validate_course_id(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Course ID cannot be empty")
        return cleaned

    @field_validator("completion_percentage")
    @classmethod
    def validate_percentage(cls, v: float) -> float:
        if v < 0.0 or v > 100.0:
            raise ValueError("Completion percentage must be between 0.0 and 100.0")
        return round(float(v), 2)

    @model_validator(mode="after")
    def validate_lecture_counts(self):
        if self.completed_lectures > self.total_lectures:
            raise ValueError("Completed lectures cannot exceed total lectures")
        return self


class LearnerCourseProgressSummary(BaseSchema):
    """
    Summary of progress for a single course in a learner's dashboard / overview.
    """
    course_id: str
    course_title: Optional[str] = None
    enrollment_id: Optional[str] = None
    total_lectures: int = Field(default=0, ge=0)
    completed_lectures: int = Field(default=0, ge=0)
    completion_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    is_completed: bool = False
    next_lecture_id: Optional[str] = None
    enrolled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    @field_validator("course_id")
    @classmethod
    def validate_course_id(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Course ID cannot be empty")
        return cleaned

    @field_validator("completion_percentage")
    @classmethod
    def validate_percentage(cls, v: float) -> float:
        if v < 0.0 or v > 100.0:
            raise ValueError("Completion percentage must be between 0.0 and 100.0")
        return round(float(v), 2)

    @model_validator(mode="after")
    def validate_lecture_counts(self):
        if self.completed_lectures > self.total_lectures:
            raise ValueError("Completed lectures cannot exceed total lectures")
        return self


class LearnerProgressOverviewResponse(BaseSchema):
    """
    Aggregated progress overview across all courses for a learner.
    """
    courses: List[LearnerCourseProgressSummary] = Field(default_factory=list)
    total_enrolled_courses: int = Field(default=0, ge=0)
    completed_courses: int = Field(default=0, ge=0)
    in_progress_courses: int = Field(default=0, ge=0)


class ResumeProgressResponse(BaseSchema):
    """
    Response schema indicating the next incomplete lecture for resuming learning in a course.
    """
    course_id: str
    next_lecture_id: Optional[str] = None
