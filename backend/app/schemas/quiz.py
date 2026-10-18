from datetime import datetime
from typing import Optional, List, Dict, Union, Any
from pydantic import ConfigDict, field_validator, model_validator
from app.schemas.common import BaseSchema


def validate_options_structure(v: Any) -> Any:
    """
    Validates that answer options is either:
    1. A list of at least 2 non-empty strings.
    2. A dictionary of at least 2 non-empty key-value string pairs.
    """
    if isinstance(v, list):
        if len(v) < 2:
            raise ValueError("At least two answer options are required")
        cleaned_list: List[str] = []
        for opt in v:
            if not isinstance(opt, str) or not opt.strip():
                raise ValueError("Each answer option must be a non-empty string")
            cleaned_list.append(opt.strip())
        return cleaned_list
    elif isinstance(v, dict):
        if len(v) < 2:
            raise ValueError("At least two answer options are required")
        cleaned_dict: Dict[str, str] = {}
        for key, val in v.items():
            if not isinstance(key, str) or not key.strip():
                raise ValueError("Option keys must be non-empty strings")
            if not isinstance(val, str) or not val.strip():
                raise ValueError("Option values must be non-empty strings")
            cleaned_dict[key.strip()] = val.strip()
        return cleaned_dict
    else:
        raise ValueError("Options must be a list of strings or a dictionary of options")


def check_option_match(correct_opt: str, options: Any) -> bool:
    """
    Checks if the correct_option matches any provided option:
    - If list: checks if correct_option is in the list of options.
    - If dict: checks if correct_option matches either an option key or an option value.
    """
    cleaned = correct_opt.strip()
    if isinstance(options, list):
        return cleaned in options
    elif isinstance(options, dict):
        return cleaned in options.keys() or cleaned in options.values()
    return False


# ---------------------------------------------------------
# Question Schemas
# ---------------------------------------------------------

class QuestionBase(BaseSchema):
    prompt: str
    options: Union[List[str], Dict[str, str]]

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Question prompt cannot be empty")
        return cleaned

    @field_validator("options")
    @classmethod
    def validate_options(cls, v: Any) -> Any:
        return validate_options_structure(v)


class QuestionCreate(QuestionBase):
    correct_option: str
    quiz_id: Optional[str] = None

    @field_validator("correct_option")
    @classmethod
    def validate_correct_option(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("correct_option cannot be empty")
        return cleaned

    @field_validator("quiz_id")
    @classmethod
    def validate_quiz_id(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            return cleaned or None
        return None

    @model_validator(mode="after")
    def validate_correct_option_in_options(self) -> "QuestionCreate":
        if not check_option_match(self.correct_option, self.options):
            raise ValueError(
                f"correct_option '{self.correct_option}' must match one of the provided options"
            )
        return self


class QuestionUpdate(BaseSchema):
    prompt: Optional[str] = None
    options: Optional[Union[List[str], Dict[str, str]]] = None
    correct_option: Optional[str] = None

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("Question prompt cannot be empty")
            return cleaned
        return None

    @field_validator("options")
    @classmethod
    def validate_options(cls, v: Optional[Any]) -> Optional[Any]:
        if v is not None:
            return validate_options_structure(v)
        return None

    @field_validator("correct_option")
    @classmethod
    def validate_correct_option(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("correct_option cannot be empty")
            return cleaned
        return None

    @model_validator(mode="after")
    def validate_partial_or_full(self) -> "QuestionUpdate":
        if self.options is not None and self.correct_option is not None:
            if not check_option_match(self.correct_option, self.options):
                raise ValueError(
                    f"correct_option '{self.correct_option}' must match one of the provided options"
                )
        return self


class QuestionResponse(BaseSchema):
    """
    Full question response for instructors and super admins, including the correct answer.
    """
    id: str
    quiz_id: str
    prompt: str
    options: Union[List[str], Dict[str, str], Any]
    correct_option: str
    created_at: Optional[datetime] = None


class QuestionLearnerResponse(BaseSchema):
    """
    Sanitized question response for learners.
    SECURITY REQUIREMENT: Must never expose correct_option.
    """
    id: str
    quiz_id: str
    prompt: str
    options: Union[List[str], Dict[str, str], Any]
    created_at: Optional[datetime] = None


# ---------------------------------------------------------
# Quiz Schemas
# ---------------------------------------------------------

class QuizBase(BaseSchema):
    title: str
    passing_score: Optional[int] = 70

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Quiz title cannot be empty")
        if len(cleaned) > 255:
            raise ValueError("Quiz title cannot exceed 255 characters")
        return cleaned

    @field_validator("passing_score")
    @classmethod
    def validate_passing_score(cls, v: Optional[int]) -> Optional[int]:
        if v is not None:
            if v < 0 or v > 100:
                raise ValueError("passing_score must be between 0 and 100")
            return v
        return 70


class QuizCreate(QuizBase):
    section_id: Optional[str] = None

    @field_validator("section_id")
    @classmethod
    def validate_section_id(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            return cleaned or None
        return None


class QuizUpdate(BaseSchema):
    title: Optional[str] = None
    passing_score: Optional[int] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("Quiz title cannot be empty")
            if len(cleaned) > 255:
                raise ValueError("Quiz title cannot exceed 255 characters")
            return cleaned
        return None

    @field_validator("passing_score")
    @classmethod
    def validate_passing_score(cls, v: Optional[int]) -> Optional[int]:
        if v is not None:
            if v < 0 or v > 100:
                raise ValueError("passing_score must be between 0 and 100")
            return v
        return None


class QuizResponse(BaseSchema):
    id: str
    section_id: str
    title: str
    passing_score: int = 70
    created_at: Optional[datetime] = None
    question_count: Optional[int] = None


class QuizDetailResponse(QuizResponse):
    """
    Detailed quiz response with questions for instructor / super_admin authoring.
    """
    questions: List[QuestionResponse] = []


class QuizLearnerDetailResponse(QuizResponse):
    """
    Detailed quiz response with sanitized questions for learners.
    """
    questions: List[QuestionLearnerResponse] = []


# ---------------------------------------------------------
# Quiz Submission & Attempt Schemas
# ---------------------------------------------------------

class QuizAnswerItem(BaseSchema):
    question_id: str
    selected_option: str

    @field_validator("question_id")
    @classmethod
    def validate_question_id(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("question_id cannot be empty")
        return cleaned

    @field_validator("selected_option")
    @classmethod
    def validate_selected_option(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("selected_option cannot be empty")
        return cleaned


class QuizSubmitRequest(BaseSchema):
    """
    Learner quiz submission payload.
    SECURITY REQUIREMENT: Extra fields like 'score' and 'passed' are strictly forbidden.
    """
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    answers: List[QuizAnswerItem]

    @field_validator("answers")
    @classmethod
    def validate_answers(cls, v: List[QuizAnswerItem]) -> List[QuizAnswerItem]:
        if not v:
            raise ValueError("At least one answer must be submitted")
        return v


class QuizAttemptResponse(BaseSchema):
    id: str
    quiz_id: str
    user_id: str
    score: int
    passed: bool
    attempted_at: Optional[datetime] = None
    total_questions: Optional[int] = None
    correct_count: Optional[int] = None
