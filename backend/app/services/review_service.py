"""
Course reviews and ratings.

Rules
- Only learners enrolled in a published course can review it (one review per course;
  editing updates the same review).
- Public listings and the rating summary only count reviews with status 'visible'.
- Super Admin moderates: visible -> hidden (pending a look) or removed.
  A removed review cannot be edited back by its author.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.review import Review
from app.models.user import User
from app.schemas.review import CourseRatingSummary, ReviewCreate, ReviewResponse, ReviewUpdate


def to_response(review: Review) -> ReviewResponse:
    return ReviewResponse(
        id=review.id,
        course_id=review.course_id,
        user_id=review.user_id,
        reviewer_name=review.user.full_name if review.user else None,
        rating=review.rating,
        review_text=review.review_text,
        status=review.status,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


class ReviewService:
    def _get_or_404(self, db: Session, review_id: str) -> Review:
        review = db.query(Review).filter(Review.id == review_id).first()
        if review is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
        return review

    def _published_course_or_404(self, db: Session, course_id: str) -> Course:
        course = db.query(Course).filter(Course.id == course_id).first()
        if course is None or (course.status or "").lower() != "published":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
        return course

    # ------------------------------------------------------------ learner actions
    def create_review(self, db: Session, review_in: ReviewCreate, current_user: User) -> Review:
        course = self._published_course_or_404(db, review_in.course_id)
        enrolled = (
            db.query(Enrollment)
            .filter(Enrollment.user_id == current_user.id, Enrollment.course_id == course.id)
            .first()
        )
        if enrolled is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Only learners enrolled in this course can review it")
        existing = (
            db.query(Review)
            .filter(Review.user_id == current_user.id, Review.course_id == course.id)
            .first()
        )
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="You have already reviewed this course. Edit your existing review instead.")
        review = Review(
            course_id=course.id, user_id=current_user.id, rating=review_in.rating,
            review_text=review_in.review_text, status="visible",
            created_at=datetime.utcnow(), updated_at=datetime.utcnow(),
        )
        try:
            db.add(review)
            db.commit()
        except IntegrityError:  # concurrent duplicate
            db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="You have already reviewed this course")
        db.refresh(review)
        return review

    def update_review(self, db: Session, review_id: str, update_in: ReviewUpdate, current_user: User) -> Review:
        review = self._get_or_404(db, review_id)
        if review.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own review")
        if review.status == "removed":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="This review was removed by a moderator and can no longer be edited")
        fields = update_in.model_dump(exclude_unset=True)
        if "rating" in fields and fields["rating"] is not None:
            review.rating = fields["rating"]
        if "review_text" in fields:
            review.review_text = fields["review_text"]
        review.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(review)
        return review

    def delete_review(self, db: Session, review_id: str, current_user: User) -> None:
        review = self._get_or_404(db, review_id)
        if review.user_id != current_user.id and current_user.role != "super_admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own review")
        db.delete(review)
        db.commit()

    def list_my_reviews(self, db: Session, current_user: User) -> List[Review]:
        return (
            db.query(Review).filter(Review.user_id == current_user.id)
            .order_by(Review.created_at.desc()).all()
        )

    # ------------------------------------------------------------ public reads
    def list_course_reviews(self, db: Session, course_id: str, skip: int = 0, limit: int = 20,
                            rating: Optional[int] = None) -> List[Review]:
        self._published_course_or_404(db, course_id)
        query = db.query(Review).filter(Review.course_id == course_id, Review.status == "visible")
        if rating is not None:
            query = query.filter(Review.rating == rating)
        return query.order_by(Review.created_at.desc()).offset(skip).limit(limit).all()

    def course_summary(self, db: Session, course_id: str) -> CourseRatingSummary:
        self._published_course_or_404(db, course_id)
        rows = (
            db.query(Review.rating, func.count(Review.id))
            .filter(Review.course_id == course_id, Review.status == "visible")
            .group_by(Review.rating).all()
        )
        distribution = {star: 0 for star in range(5, 0, -1)}
        for rating, count in rows:
            distribution[int(rating)] = int(count)
        total = sum(distribution.values())
        average = round(sum(r * c for r, c in distribution.items()) / total, 2) if total else None
        return CourseRatingSummary(course_id=course_id, average_rating=average,
                                   review_count=total, distribution=distribution)

    # ------------------------------------------------------------ moderation
    def list_all(self, db: Session, status_filter: Optional[str] = None, course_id: Optional[str] = None,
                 skip: int = 0, limit: int = 50) -> List[Review]:
        query = db.query(Review)
        if status_filter:
            query = query.filter(Review.status == status_filter.strip().lower())
        if course_id:
            query = query.filter(Review.course_id == course_id)
        return query.order_by(Review.created_at.desc()).offset(skip).limit(limit).all()

    def moderate(self, db: Session, review_id: str, new_status: str, current_user: User) -> Review:
        review = self._get_or_404(db, review_id)
        review.status = new_status
        review.moderated_by = current_user.id
        review.moderated_at = datetime.utcnow()
        db.commit()
        db.refresh(review)
        return review


review_service = ReviewService()
