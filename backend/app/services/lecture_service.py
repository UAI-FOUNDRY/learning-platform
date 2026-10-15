from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.lecture import Lecture
from app.models.section import Section
from app.models.course import Course
from app.models.progress import Progress
from app.models.user import User
from app.schemas.lecture import LectureCreate, LectureUpdate

class LectureService:
    def get_by_id(self, db: Session, lecture_id: str) -> Optional[Lecture]:
        if not lecture_id:
            return None
        return db.query(Lecture).filter(Lecture.id == lecture_id).first()

    def get_lecture(self, db: Session, lecture_id: str, current_user: User) -> Lecture:
        lecture = self.get_by_id(db, lecture_id)
        if not lecture:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lecture not found"
            )
        return lecture

    def list_lectures_for_section(
        self,
        db: Session,
        section_id: str,
        current_user: User
    ) -> List[Lecture]:
        section = db.query(Section).filter(Section.id == section_id).first()
        if not section:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Section with id '{section_id}' not found"
            )

        return (
            db.query(Lecture)
            .filter(Lecture.section_id == section_id)
            .order_by(Lecture.order_index.asc(), Lecture.created_at.asc())
            .all()
        )

    def create_lecture(
        self,
        db: Session,
        section_id: str,
        lecture_in: LectureCreate,
        current_user: User
    ) -> Lecture:
        section = db.query(Section).filter(Section.id == section_id).first()
        if not section:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Section with id '{section_id}' not found"
            )

        course = db.query(Course).filter(Course.id == section.course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent course not found"
            )

        # Role and ownership checks
        if current_user.role == "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Learners are not permitted to create lectures"
            )
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only create lectures in their own courses"
                )
            if course.status.lower() == "pending_review":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot modify lectures while course is pending review"
                )
        elif current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create lecture"
            )

        # Automatic order_index handling
        if lecture_in.order_index is not None:
            order_idx = lecture_in.order_index
        else:
            max_order = (
                db.query(func.max(Lecture.order_index))
                .filter(Lecture.section_id == section_id)
                .scalar()
            )
            order_idx = 0 if max_order is None else max_order + 1

        lecture = Lecture(
            section_id=section.id,
            title=lecture_in.title.strip(),
            content_url=lecture_in.content_url.strip() if lecture_in.content_url else None,
            duration=lecture_in.duration if lecture_in.duration is not None else 0,
            order_index=order_idx,
        )

        try:
            db.add(lecture)
            db.commit()
            db.refresh(lecture)
            return lecture
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    def update_lecture(
        self,
        db: Session,
        lecture_id: str,
        lecture_in: LectureUpdate,
        current_user: User
    ) -> Lecture:
        lecture = self.get_lecture(db, lecture_id, current_user)
        section = db.query(Section).filter(Section.id == lecture.section_id).first()
        course = db.query(Course).filter(Course.id == section.course_id).first() if section else None

        # Role and ownership checks
        if current_user.role == "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Learners cannot update lectures"
            )
        elif current_user.role == "instructor":
            if not course or course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only update lectures in their own courses"
                )
            if course and course.status.lower() == "pending_review":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot modify lectures while course is pending review"
                )
        elif current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update lecture"
            )

        if lecture_in.title is not None:
            lecture.title = lecture_in.title.strip()

        if lecture_in.content_url is not None:
            lecture.content_url = lecture_in.content_url.strip() if lecture_in.content_url else None

        if lecture_in.duration is not None:
            lecture.duration = lecture_in.duration

        if lecture_in.order_index is not None:
            lecture.order_index = lecture_in.order_index

        try:
            db.commit()
            db.refresh(lecture)
            return lecture
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    def delete_lecture(
        self,
        db: Session,
        lecture_id: str,
        current_user: User
    ) -> None:
        lecture = self.get_lecture(db, lecture_id, current_user)
        section = db.query(Section).filter(Section.id == lecture.section_id).first()
        course = db.query(Course).filter(Course.id == section.course_id).first() if section else None

        # Role and ownership checks
        if current_user.role == "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Learners cannot delete lectures"
            )
        elif current_user.role == "instructor":
            if not course or course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only delete lectures in their own courses"
                )
            if course and course.status.lower() == "pending_review":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot modify lectures while course is pending review"
                )
        elif current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to delete lecture"
            )

        # Safe Deletion: Check if learner progress records exist for this lecture
        progress_count = db.query(Progress).filter(Progress.lecture_id == lecture.id).count()
        if progress_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete lecture '{lecture.title}' because learner progress records exist for this lecture."
            )

        try:
            db.delete(lecture)
            db.commit()
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

lecture_service = LectureService()
