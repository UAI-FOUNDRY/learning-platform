from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.services.progress_service import progress_service
from app.schemas.progress import (
    LectureProgressUpdate,
    ProgressResponse,
    CourseProgressResponse,
    LearnerProgressOverviewResponse,
    ResumeProgressResponse,
)

router = APIRouter()


# ---------------------------------------------------------
# Module Root Placeholder / Information
# ---------------------------------------------------------

@router.get("/")
def get_progress_root():
    """
    Returns module identification and description.
    """
    return {"module": "progress", "description": "Lecture and course progress tracking endpoints"}


# ---------------------------------------------------------
# Fixed Path Endpoints (Registered before dynamic /{course_id})
# ---------------------------------------------------------

@router.get("/my", response_model=LearnerProgressOverviewResponse)
@router.get("/my/", response_model=LearnerProgressOverviewResponse, include_in_schema=False)
def get_my_progress_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the authenticated learner's progress overview across all enrolled courses.
    Accessible only to learners.
    """
    return progress_service.get_learner_progress_summary(
        db=db,
        current_user=current_user,
    )


# ---------------------------------------------------------
# Lecture Progress Update Endpoints
# ---------------------------------------------------------

@router.post("/lecture/{lecture_id}", response_model=ProgressResponse, status_code=status.HTTP_200_OK)
@router.post("/lecture/{lecture_id}/", response_model=ProgressResponse, status_code=status.HTTP_200_OK, include_in_schema=False)
def update_lecture_progress_single(
    lecture_id: str,
    progress_in: Optional[LectureProgressUpdate] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates progress for a specific lecture for the authenticated learner.
    Payload is optional (defaults to marking the lecture as completed).
    """
    is_completed = progress_in.is_completed if progress_in is not None else True
    return progress_service.update_lecture_progress(
        db=db,
        lecture_id=lecture_id,
        current_user=current_user,
        is_completed=is_completed,
    )


@router.post("/lectures/{lecture_id}", response_model=ProgressResponse, status_code=status.HTTP_200_OK)
@router.post("/lectures/{lecture_id}/", response_model=ProgressResponse, status_code=status.HTTP_200_OK, include_in_schema=False)
def update_lecture_progress_plural(
    lecture_id: str,
    progress_in: Optional[LectureProgressUpdate] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Compatible alternative plural route for updating lecture progress.
    Reuses the exact same business logic and validation.
    """
    return update_lecture_progress_single(
        lecture_id=lecture_id,
        progress_in=progress_in,
        db=db,
        current_user=current_user,
    )


# ---------------------------------------------------------
# Dynamic Course Path Endpoints
# ---------------------------------------------------------

@router.get("/{course_id}/resume", response_model=ResumeProgressResponse)
@router.get("/{course_id}/resume/", response_model=ResumeProgressResponse, include_in_schema=False)
def get_course_resume_lecture(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the next incomplete lecture ID for the course to resume learning.
    Returns null if all lectures are completed or if the course has no lectures.
    """
    next_id = progress_service.get_next_incomplete_lecture(
        db=db,
        course_id=course_id,
        current_user=current_user,
    )
    return ResumeProgressResponse(
        course_id=course_id,
        next_lecture_id=next_id,
    )


@router.get("/{course_id}", response_model=CourseProgressResponse)
@router.get("/{course_id}/", response_model=CourseProgressResponse, include_in_schema=False)
def get_course_progress(
    course_id: str,
    user_id: Optional[str] = Query(None, description="Target learner user ID (for instructor or super_admin)"),
    learner_id: Optional[str] = Query(None, description="Alias for user_id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves progress for a specific enrolled course.
    - Learners retrieve their own progress.
    - Instructors can retrieve progress for courses they manage (passing user_id).
    - Super Admins can retrieve progress for any enrolled learner (passing user_id).
    """
    target = user_id or learner_id
    return progress_service.get_course_progress(
        db=db,
        course_id=course_id,
        current_user=current_user,
        target_user_id=target,
    )
