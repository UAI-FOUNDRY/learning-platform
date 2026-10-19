from datetime import datetime
from typing import List, Optional

from pydantic import field_validator

from app.schemas.common import BaseSchema

LANGUAGES = ("python", "c", "cpp", "javascript", "java", "sql")
DIFFICULTIES = ("easy", "medium", "hard")


def _text(v: Optional[str], label: str, max_len: int, required: bool = False) -> Optional[str]:
    if v is None:
        if required:
            raise ValueError(f"{label} is required")
        return None
    cleaned = v.strip() if label in ("Title",) else v
    if required and not cleaned.strip():
        raise ValueError(f"{label} cannot be empty")
    if len(cleaned) > max_len:
        raise ValueError(f"{label} cannot exceed {max_len} characters")
    return cleaned


class ExerciseBase(BaseSchema):
    title: Optional[str] = None
    problem_statement: Optional[str] = None
    language: Optional[str] = None
    starter_code: Optional[str] = None
    solution_code: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    difficulty: Optional[str] = None
    hints: Optional[List[str]] = None
    explanation: Optional[str] = None
    time_limit_ms: Optional[int] = None
    memory_limit_mb: Optional[int] = None
    max_score: Optional[int] = None
    order_index: Optional[int] = None
    lecture_id: Optional[str] = None

    @field_validator("title")
    @classmethod
    def v_title(cls, v):
        if v is None:
            return v
        return _text(v, "Title", 255, required=True)

    @field_validator("problem_statement")
    @classmethod
    def v_statement(cls, v):
        return None if v is None else _text(v, "Problem statement", 20000, required=True)

    @field_validator("language")
    @classmethod
    def v_language(cls, v):
        if v is not None and v not in LANGUAGES:
            raise ValueError("language must be one of: " + ", ".join(LANGUAGES))
        return v

    @field_validator("difficulty")
    @classmethod
    def v_difficulty(cls, v):
        if v is not None and v not in DIFFICULTIES:
            raise ValueError("difficulty must be easy, medium or hard")
        return v

    @field_validator("hints")
    @classmethod
    def v_hints(cls, v):
        if v is None:
            return v
        hints = [h.strip() for h in v if h and h.strip()]
        if len(hints) > 10 or any(len(h) > 1000 for h in hints):
            raise ValueError("at most 10 hints of 1000 characters each")
        return hints

    @field_validator("time_limit_ms")
    @classmethod
    def v_time(cls, v):
        if v is not None and not 100 <= v <= 20000:
            raise ValueError("time_limit_ms must be between 100 and 20000")
        return v

    @field_validator("memory_limit_mb")
    @classmethod
    def v_mem(cls, v):
        if v is not None and not 16 <= v <= 1024:
            raise ValueError("memory_limit_mb must be between 16 and 1024")
        return v

    @field_validator("max_score")
    @classmethod
    def v_score(cls, v):
        if v is not None and not 1 <= v <= 10000:
            raise ValueError("max_score must be between 1 and 10000")
        return v

    @field_validator("starter_code", "solution_code", "sample_input", "sample_output", "explanation")
    @classmethod
    def v_long(cls, v):
        return _text(v, "Text", 65536)


class ExerciseCreate(ExerciseBase):
    title: str
    problem_statement: str


class ExerciseUpdate(ExerciseBase):
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def v_status(cls, v):
        if v is not None and v not in ("draft", "published", "archived"):
            raise ValueError("status must be draft, published or archived")
        return v


class CaseCreate(BaseSchema):
    input: str = ""
    expected_output: str
    is_hidden: bool = True
    weight: int = 1
    order_index: Optional[int] = None

    @field_validator("weight")
    @classmethod
    def v_weight(cls, v):
        if not 1 <= v <= 100:
            raise ValueError("weight must be between 1 and 100")
        return v

    @field_validator("input", "expected_output")
    @classmethod
    def v_len(cls, v):
        return _text(v, "Test case text", 20000) or ""


class CaseUpdate(BaseSchema):
    input: Optional[str] = None
    expected_output: Optional[str] = None
    is_hidden: Optional[bool] = None
    weight: Optional[int] = None
    order_index: Optional[int] = None

    @field_validator("weight")
    @classmethod
    def v_weight(cls, v):
        return CaseCreate.v_weight(v) if v is not None else v


class CaseStaffResponse(BaseSchema):
    id: str
    exercise_id: str
    input: str
    expected_output: str
    is_hidden: bool
    weight: int
    order_index: int


class CaseLearnerResponse(BaseSchema):
    id: str
    input: str
    expected_output: str
    order_index: int


class ExerciseSummary(BaseSchema):
    id: str
    course_id: str
    lecture_id: Optional[str] = None
    title: str
    language: str
    difficulty: str
    max_score: int
    order_index: int
    status: str
    solved: Optional[bool] = None            # for learners
    best_score: Optional[int] = None         # for learners
    test_case_count: Optional[int] = None    # for staff


class ExerciseLearnerResponse(BaseSchema):
    id: str
    course_id: str
    lecture_id: Optional[str] = None
    title: str
    problem_statement: str
    language: str
    starter_code: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    difficulty: str
    hints_count: int = 0
    time_limit_ms: int
    memory_limit_mb: int
    max_score: int
    status: str
    solved: bool = False
    best_score: Optional[int] = None
    explanation: Optional[str] = None        # only after solving
    sample_test_cases: List[CaseLearnerResponse] = []


class ExerciseStaffResponse(ExerciseSummary):
    problem_statement: str
    starter_code: Optional[str] = None
    solution_code: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    hints: Optional[List[str]] = None
    explanation: Optional[str] = None
    time_limit_ms: int
    memory_limit_mb: int
    test_cases: List[CaseStaffResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class HintResponse(BaseSchema):
    number: int
    total: int
    hint: str


class DraftSave(BaseSchema):
    source_code: str
    language: Optional[str] = None


class DraftResponse(BaseSchema):
    exercise_id: str
    language: str
    source_code: str
    updated_at: Optional[datetime] = None


class RunRequest(BaseSchema):
    source_code: str
    language: Optional[str] = None
    custom_input: Optional[str] = None


class SubmitRequest(BaseSchema):
    source_code: str
    language: Optional[str] = None


class CaseResultView(BaseSchema):
    test_case_id: str
    number: int
    status: str
    is_hidden: bool
    execution_time_ms: Optional[int] = None
    memory_kb: Optional[int] = None
    error_message: Optional[str] = None
    input: Optional[str] = None             # only for visible cases (or staff)
    expected_output: Optional[str] = None
    actual_output: Optional[str] = None


class SubmissionResponse(BaseSchema):
    id: str
    exercise_id: str
    user_id: str
    kind: str
    language: str
    status: str
    score: Optional[int] = None
    passed_count: Optional[int] = None
    failed_count: Optional[int] = None
    total_count: Optional[int] = None
    execution_time_ms: Optional[int] = None
    memory_kb: Optional[int] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    created_at: Optional[datetime] = None
    evaluated_at: Optional[datetime] = None


class SubmissionDetailResponse(SubmissionResponse):
    source_code: str
    custom_input: Optional[str] = None
    results: List[CaseResultView] = []


class ExerciseStats(BaseSchema):
    exercise_id: str
    submissions: int
    learners_attempted: int
    learners_solved: int
    acceptance_rate_percent: float
    average_best_score: float
    status_breakdown: dict


class RunnerStatus(BaseSchema):
    runner: str
    available: bool
    languages: List[str]
    enabled_in_settings: List[str]
