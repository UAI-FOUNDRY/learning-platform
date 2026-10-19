from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.schemas.lecture import (
    LectureCreate,
    LectureUpdate,
    LectureResponse,
)
from app.schemas.common import MessageResponse
from app.services.lecture_service import lecture_service
from app.api.deps import get_current_user, require_role

router = APIRouter()

@router.post("/sections/{section_id}/lectures", response_model=LectureResponse, status_code=status.HTTP_201_CREATED)
@router.post("/sections/{section_id}/lectures/", response_model=LectureResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_lecture(
    section_id: str,
    lecture_in: LectureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Creates a new lecture within a section.
    Accessible to Super Admin and Course Owner Instructor.
    """
    return lecture_service.create_lecture(db, section_id, lecture_in, current_user)


@router.get("/sections/{section_id}/lectures", response_model=List[LectureResponse])
@router.get("/sections/{section_id}/lectures/", response_model=List[LectureResponse], include_in_schema=False)
def list_lectures_for_section(
    section_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists all lectures for a section, ordered by order_index.
    Accessible to all authenticated users.
    """
    return lecture_service.list_lectures_for_section(db, section_id, current_user)


@router.get("/lectures/{lecture_id}", response_model=LectureResponse)
def get_lecture(
    lecture_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a lecture by ID.
    Accessible to all authenticated users.
    """
    return lecture_service.get_lecture(db, lecture_id, current_user)


@router.put("/lectures/{lecture_id}", response_model=LectureResponse)
def update_lecture(
    lecture_id: str,
    lecture_in: LectureUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Updates a lecture's title, content_url, duration, and/or order_index.
    Accessible to Super Admin and Course Owner Instructor.
    """
    return lecture_service.update_lecture(db, lecture_id, lecture_in, current_user)


@router.delete("/lectures/{lecture_id}", response_model=MessageResponse)
def delete_lecture(
    lecture_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Deletes a lecture if no learner progress records exist.
    Accessible to Super Admin and Course Owner Instructor.
    """
    lecture_service.delete_lecture(db, lecture_id, current_user)
    return MessageResponse(message="Lecture deleted successfully")
