from typing import List, Union, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.api.deps import get_current_user, require_role
from app.schemas.common import MessageResponse
from app.schemas.quiz import (
    QuizCreate,
    QuizUpdate,
    QuizResponse,
    QuizDetailResponse,
    QuizLearnerDetailResponse,
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    QuestionLearnerResponse,
    QuizSubmitRequest,
    QuizAttemptResponse,
)
from app.services.quiz_service import quiz_service

router = APIRouter()
section_quizzes_router = APIRouter()


# =========================================================
# Section-scoped Quiz Endpoints (/api/v1/sections/{section_id}/quizzes)
# =========================================================

@section_quizzes_router.post(
    "/sections/{section_id}/quizzes",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
)
@section_quizzes_router.post(
    "/sections/{section_id}/quizzes/",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_quiz_for_section(
    section_id: str,
    quiz_in: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Creates a new quiz within a section.
    Accessible to Super Admin and Course Owner Instructor.
    """
    return quiz_service.create_quiz(db, section_id, quiz_in, current_user)


@section_quizzes_router.get(
    "/sections/{section_id}/quizzes",
    response_model=List[QuizResponse],
)
@section_quizzes_router.get(
    "/sections/{section_id}/quizzes/",
    response_model=List[QuizResponse],
    include_in_schema=False,
)
def list_quizzes_for_section(
    section_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists all quizzes for a section.
    Accessible to enrolled learners, course owner instructors, and super admins.
    """
    return quiz_service.list_quizzes_for_section(db, section_id, current_user)


@section_quizzes_router.put(
    "/questions/{question_id}",
    response_model=QuestionResponse,
)
@section_quizzes_router.put(
    "/questions/{question_id}/",
    response_model=QuestionResponse,
    include_in_schema=False,
)
def update_question_direct(
    question_id: str,
    question_in: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Updates a question prompt, options, or correct answer.
    Accessible to Super Admin and Course Owner Instructor.
    """
    return quiz_service.update_question(db, question_id, question_in, current_user)


@section_quizzes_router.delete(
    "/questions/{question_id}",
    response_model=MessageResponse,
)
@section_quizzes_router.delete(
    "/questions/{question_id}/",
    response_model=MessageResponse,
    include_in_schema=False,
)
def delete_question_direct(
    question_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Deletes a question if no attempts exist for the parent quiz.
    Accessible to Super Admin and Course Owner Instructor.
    """
    quiz_service.delete_question(db, question_id, current_user)
    return MessageResponse(message="Question deleted successfully")


# =========================================================
# Quiz Resource Endpoints (/api/v1/quizzes/...)
# =========================================================

@router.get("", include_in_schema=False)
@router.get("/")
def get_quizzes_root():
    """
    Status / discovery endpoint for the quizzes module.
    """
    return {"module": "quizzes", "description": "Quiz assessment endpoints"}


@router.post(
    "",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_quiz_root(
    quiz_in: QuizCreate,
    section_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Creates a new quiz, accepting section_id via payload or query parameter.
    Accessible to Super Admin and Course Owner Instructor.
    """
    target_section_id = section_id or quiz_in.section_id
    if not target_section_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="section_id is required to create a quiz"
        )
    return quiz_service.create_quiz(db, target_section_id, quiz_in, current_user)


@router.get(
    "/{quiz_id}",
    response_model=Union[QuizDetailResponse, QuizLearnerDetailResponse],
)
@router.get(
    "/{quiz_id}/",
    response_model=Union[QuizDetailResponse, QuizLearnerDetailResponse],
    include_in_schema=False,
)
def get_quiz_detail(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves quiz metadata and questions.
    SECURITY: Sanitizes questions for learners (omitting correct_option).
    """
    return quiz_service.get_quiz_detail(db, quiz_id, current_user)


@router.put(
    "/{quiz_id}",
    response_model=QuizResponse,
)
@router.put(
    "/{quiz_id}/",
    response_model=QuizResponse,
    include_in_schema=False,
)
def update_quiz(
    quiz_id: str,
    quiz_in: QuizUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Updates quiz title and/or passing score.
    Accessible to Super Admin and Course Owner Instructor.
    """
    return quiz_service.update_quiz(db, quiz_id, quiz_in, current_user)


@router.delete(
    "/{quiz_id}",
    response_model=MessageResponse,
)
@router.delete(
    "/{quiz_id}/",
    response_model=MessageResponse,
    include_in_schema=False,
)
def delete_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Deletes a quiz if no learner attempts exist.
    Accessible to Super Admin and Course Owner Instructor.
    """
    quiz_service.delete_quiz(db, quiz_id, current_user)
    return MessageResponse(message="Quiz deleted successfully")


# =========================================================
# Question Endpoints (/api/v1/quizzes/{quiz_id}/questions/...)
# =========================================================

@router.post(
    "/{quiz_id}/questions",
    response_model=QuestionResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/{quiz_id}/questions/",
    response_model=QuestionResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def add_question_to_quiz(
    quiz_id: str,
    question_in: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Adds a new question to a quiz.
    Accessible to Super Admin and Course Owner Instructor.
    """
    return quiz_service.add_question(db, quiz_id, question_in, current_user)


@router.get(
    "/{quiz_id}/questions",
    response_model=Union[List[QuestionResponse], List[QuestionLearnerResponse]],
)
@router.get(
    "/{quiz_id}/questions/",
    response_model=Union[List[QuestionResponse], List[QuestionLearnerResponse]],
    include_in_schema=False,
)
def list_questions_for_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists questions for a quiz.
    Sanitizes correct answers for learners.
    """
    detail = quiz_service.get_quiz_detail(db, quiz_id, current_user)
    return detail.questions


@router.put(
    "/{quiz_id}/questions/{question_id}",
    response_model=QuestionResponse,
)
@router.put(
    "/{quiz_id}/questions/{question_id}/",
    response_model=QuestionResponse,
    include_in_schema=False,
)
def update_question_nested(
    quiz_id: str,
    question_id: str,
    question_in: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Updates a question prompt, options, or correct answer.
    Accessible to Super Admin and Course Owner Instructor.
    """
    return quiz_service.update_question(db, question_id, question_in, current_user)


@router.delete(
    "/{quiz_id}/questions/{question_id}",
    response_model=MessageResponse,
)
@router.delete(
    "/{quiz_id}/questions/{question_id}/",
    response_model=MessageResponse,
    include_in_schema=False,
)
def delete_question_nested(
    quiz_id: str,
    question_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Deletes a question if no attempts exist for the parent quiz.
    Accessible to Super Admin and Course Owner Instructor.
    """
    quiz_service.delete_question(db, question_id, current_user)
    return MessageResponse(message="Question deleted successfully")


# =========================================================
# Quiz Attempts & Scoring Endpoints (/api/v1/quizzes/{quiz_id}/attempt)
# =========================================================

@router.post(
    "/{quiz_id}/attempt",
    response_model=QuizAttemptResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/{quiz_id}/attempt/",
    response_model=QuizAttemptResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/{quiz_id}/attempts",
    response_model=QuizAttemptResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/{quiz_id}/attempts/",
    response_model=QuizAttemptResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def submit_quiz_attempt(
    quiz_id: str,
    submit_in: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submits quiz answers, evaluates score server-side, records attempt.
    Accessible to actively enrolled learners in published courses.
    Matches frontend quizService.submitQuizAttempt contract.
    """
    return quiz_service.submit_quiz_attempt(db, quiz_id, submit_in, current_user)


@router.get(
    "/{quiz_id}/attempts",
    response_model=List[QuizAttemptResponse],
)
@router.get(
    "/{quiz_id}/attempts/",
    response_model=List[QuizAttemptResponse],
    include_in_schema=False,
)
def list_quiz_attempts(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists attempt history for a quiz.
    Learners can view only their own attempts; instructors can view all attempts for their course.
    """
    return quiz_service.list_quiz_attempts(db, quiz_id, current_user)


@router.get(
    "/{quiz_id}/attempts/{attempt_id}",
    response_model=QuizAttemptResponse,
)
@router.get(
    "/{quiz_id}/attempts/{attempt_id}/",
    response_model=QuizAttemptResponse,
    include_in_schema=False,
)
@router.get(
    "/attempts/{attempt_id}",
    response_model=QuizAttemptResponse,
    include_in_schema=False,
)
def get_quiz_attempt(
    attempt_id: str,
    quiz_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a specific quiz attempt result.
    Learners can view only their own attempt; instructors can view attempts for their courses.
    """
    return quiz_service.get_quiz_attempt(db, attempt_id, current_user)
