from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.qa import (
    AnswerCreate, AnswerUpdate, HighlightRequest, ModerateRequest, QuestionCreate, QuestionDetailResponse,
    QuestionResponse, QuestionUpdate, ResolveRequest, UpvoteResponse,
)
from app.services.qa_service import qa_service

router = APIRouter()


# ------------------------------------------------------------------ questions
@router.post("/courses/{course_id}/questions", response_model=QuestionResponse, status_code=201)
def ask_question(course_id: str, body: QuestionCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    """Ask a question in a course (enrolled learners, the course instructor, Super Admin). Optionally tied to a lecture."""
    return qa_service.create_question(db, course_id, body, current_user)


@router.get("/courses/{course_id}/questions", response_model=List[QuestionResponse])
def list_questions(
    course_id: str,
    lecture_id: Optional[str] = None,
    resolved: Optional[bool] = None,
    search: Optional[str] = None,
    mine: bool = False,
    sort: str = Query("recent", pattern="^(recent|popular|unanswered)$"),
    status: Optional[str] = Query(None, pattern="^(visible|hidden|removed)$", description="Instructor / Super Admin only"),
    page: Optional[int] = Query(None, ge=1),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """The course discussion. Hidden/removed questions are visible only to staff, via `status`."""
    offset = (page - 1) * limit if page is not None else skip
    return qa_service.list_questions(db, course_id, current_user, lecture_id, resolved, search, mine, sort, status, offset, limit)


@router.get("/my/questions", response_model=List[QuestionResponse])
def my_questions(limit: int = Query(50, ge=1, le=100), skip: int = Query(0, ge=0),
                 db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return qa_service.my_questions(db, current_user, skip, limit)


@router.get("/questions/{question_id}", response_model=QuestionDetailResponse)
def get_question(question_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """A question with its answers. Replies are nested under their answer; best answers come first."""
    return qa_service.get_question(db, question_id, current_user)


@router.put("/questions/{question_id}", response_model=QuestionResponse)
def edit_question(question_id: str, body: QuestionUpdate, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    return qa_service.update_question(db, question_id, body, current_user)


@router.delete("/questions/{question_id}", response_model=MessageResponse)
def delete_question(question_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Author, the course instructor or a Super Admin."""
    qa_service.delete_question(db, question_id, current_user)
    return MessageResponse(message="Question deleted")


@router.post("/questions/{question_id}/resolve", response_model=QuestionResponse)
def resolve_question(question_id: str, body: ResolveRequest = ResolveRequest(), db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    return qa_service.set_resolved(db, question_id, body.is_resolved, current_user)


@router.post("/questions/{question_id}/follow", response_model=QuestionResponse)
def follow_question(question_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get notified about new replies."""
    return qa_service.follow(db, question_id, True, current_user)


@router.delete("/questions/{question_id}/follow", response_model=QuestionResponse)
def unfollow_question(question_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return qa_service.follow(db, question_id, False, current_user)


@router.patch("/questions/{question_id}/moderate", response_model=QuestionResponse)
def moderate_question(question_id: str, body: ModerateRequest, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    """Course instructor or Super Admin: hide, remove or restore (`visible`) a question."""
    return qa_service.moderate_question(db, question_id, body.status, current_user)


# ------------------------------------------------------------------ answers
@router.post("/questions/{question_id}/answers", response_model=QuestionDetailResponse, status_code=201)
def answer_question(question_id: str, body: AnswerCreate, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    """Answer a question, or reply to an answer with `parent_answer_id`. Returns the whole thread."""
    return qa_service.create_answer(db, question_id, body, current_user)


@router.put("/answers/{answer_id}", response_model=QuestionDetailResponse)
def edit_answer(answer_id: str, body: AnswerUpdate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    return qa_service.update_answer(db, answer_id, body.body, current_user)


@router.delete("/answers/{answer_id}", response_model=MessageResponse)
def delete_answer(answer_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    qa_service.delete_answer(db, answer_id, current_user)
    return MessageResponse(message="Answer deleted")


@router.post("/answers/{answer_id}/upvote", response_model=UpvoteResponse)
def upvote_answer(answer_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Toggle: calling it again removes your upvote."""
    return qa_service.toggle_upvote(db, answer_id, current_user)


@router.post("/answers/{answer_id}/highlight", response_model=QuestionDetailResponse)
def highlight_answer(answer_id: str, body: HighlightRequest = HighlightRequest(), db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    """Course instructor / Super Admin: mark an answer as the useful one (shown first)."""
    return qa_service.set_highlight(db, answer_id, body.highlighted, current_user)


@router.patch("/answers/{answer_id}/moderate", response_model=QuestionDetailResponse)
def moderate_answer(answer_id: str, body: ModerateRequest, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    return qa_service.moderate_answer(db, answer_id, body.status, current_user)
