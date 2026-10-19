from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.database.session import get_db
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.review import CourseRatingSummary, ReviewCreate, ReviewModerate, ReviewResponse, ReviewUpdate
from app.services.review_service import review_service, to_response

router = APIRouter()


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_review(
    review_in: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("learner")),
):
    """Rate (1-5) and optionally review a published course you are enrolled in. One review per course."""
    return to_response(review_service.create_review(db, review_in, current_user))


@router.get("/my", response_model=List[ReviewResponse])
def list_my_reviews(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [to_response(r) for r in review_service.list_my_reviews(db, current_user)]


@router.get("/courses/{course_id}", response_model=List[ReviewResponse])
def list_course_reviews(
    course_id: str,
    rating: Optional[int] = Query(None, ge=1, le=5, description="Only show reviews with this star rating"),
    page: Optional[int] = Query(None, ge=1),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """**Public**: visible reviews for a published course, newest first."""
    offset = (page - 1) * limit if page is not None else skip
    return [to_response(r) for r in review_service.list_course_reviews(db, course_id, offset, limit, rating)]


@router.get("/courses/{course_id}/summary", response_model=CourseRatingSummary)
def course_rating_summary(course_id: str, db: Session = Depends(get_db)):
    """**Public**: average rating, number of reviews and the 5-to-1 star breakdown."""
    return review_service.course_summary(db, course_id)


@router.get("", response_model=List[ReviewResponse])
@router.get("/", response_model=List[ReviewResponse], include_in_schema=False)
def list_all_reviews(
    status: Optional[str] = Query(None, description="visible | hidden | removed"),
    course_id: Optional[str] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """Super Admin: every review, including hidden and removed ones, for moderation."""
    offset = (page - 1) * limit if page is not None else skip
    return [to_response(r) for r in review_service.list_all(db, status, course_id, offset, limit)]


@router.put("/{review_id}", response_model=ReviewResponse)
def update_review(
    review_id: str,
    update_in: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edit your own review."""
    return to_response(review_service.update_review(db, review_id, update_in, current_user))


@router.delete("/{review_id}", response_model=MessageResponse)
def delete_review(review_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete your own review (or any review, as Super Admin)."""
    review_service.delete_review(db, review_id, current_user)
    return MessageResponse(message="Review deleted")


@router.patch("/{review_id}/moderate", response_model=ReviewResponse)
def moderate_review(
    review_id: str,
    body: ReviewModerate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """Super Admin: set a review to visible, hidden or removed. Only visible reviews count toward ratings."""
    return to_response(review_service.moderate(db, review_id, body.status, current_user))
