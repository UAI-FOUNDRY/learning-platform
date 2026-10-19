from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.services import course_policy
from app.models.section import Section
from app.models.course import Course
from app.models.lecture import Lecture
from app.models.progress import Progress
from app.models.quiz import Quiz
from app.models.quiz_attempt import QuizAttempt
from app.models.assignment import Assignment
from app.models.submission import Submission
from app.models.user import User
from app.schemas.section import SectionCreate, SectionUpdate

class SectionService:
    def get_by_id(self, db: Session, section_id: str) -> Optional[Section]:
        if not section_id:
            return None
        return db.query(Section).filter(Section.id == section_id).first()

    def get_section(self, db: Session, section_id: str, current_user: User) -> Section:
        section = self.get_by_id(db, section_id)
        if not section:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Section not found"
            )
        return section

    def list_sections_for_course(
        self,
        db: Session,
        course_id: str,
        current_user: User
    ) -> List[Section]:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with id '{course_id}' not found"
            )

        return (
            db.query(Section)
            .filter(Section.course_id == course_id)
            .order_by(Section.order_index.asc(), Section.created_at.asc())
            .all()
        )

    def create_section(
        self,
        db: Session,
        course_id: str,
        section_in: SectionCreate,
        current_user: User
    ) -> Section:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with id '{course_id}' not found"
            )

        # Role and ownership checks
        if current_user.role == "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Learners are not permitted to create sections"
            )
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only create sections in their own courses"
                )
            if course.status.lower() == "pending_review":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot modify sections while course is pending review"
                )
            if course:
                course_policy.apply_published_edit_policy(db, course, current_user)
        elif current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create section"
            )

        # Automatic order_index handling
        if section_in.order_index is not None:
            order_idx = section_in.order_index
        else:
            max_order = (
                db.query(func.max(Section.order_index))
                .filter(Section.course_id == course_id)
                .scalar()
            )
            order_idx = 0 if max_order is None else max_order + 1

        section = Section(
            course_id=course.id,
            title=section_in.title.strip(),
            order_index=order_idx,
        )

        try:
            db.add(section)
            db.commit()
            db.refresh(section)
            return section
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    def update_section(
        self,
        db: Session,
        section_id: str,
        section_in: SectionUpdate,
        current_user: User
    ) -> Section:
        section = self.get_section(db, section_id, current_user)
        course = db.query(Course).filter(Course.id == section.course_id).first()

        # Role and ownership checks
        if current_user.role == "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Learners cannot update sections"
            )
        elif current_user.role == "instructor":
            if not course or course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only update sections in their own courses"
                )
            if course and course.status.lower() == "pending_review":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot modify sections while course is pending review"
                )
            if course:
                course_policy.apply_published_edit_policy(db, course, current_user)
        elif current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update section"
            )

        if section_in.title is not None:
            section.title = section_in.title.strip()

        if section_in.order_index is not None:
            section.order_index = section_in.order_index

        try:
            db.commit()
            db.refresh(section)
            return section
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    def delete_section(
        self,
        db: Session,
        section_id: str,
        current_user: User
    ) -> None:
        section = self.get_section(db, section_id, current_user)
        course = db.query(Course).filter(Course.id == section.course_id).first()

        # Role and ownership checks
        if current_user.role == "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Learners cannot delete sections"
            )
        elif current_user.role == "instructor":
            if not course or course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only delete sections in their own courses"
                )
            if course and course.status.lower() == "pending_review":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot modify sections while course is pending review"
                )
            if course:
                course_policy.apply_published_edit_policy(db, course, current_user)
        elif current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to delete section"
            )

        # Safe Deletion: Check for learner learning records connected to this section
        # 1. Lecture progress records
        progress_count = (
            db.query(Progress)
            .join(Lecture, Progress.lecture_id == Lecture.id)
            .filter(Lecture.section_id == section.id)
            .count()
        )
        if progress_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete section '{section.title}' because learner progress records exist for its lectures."
            )

        # 2. Quiz attempts
        quiz_attempt_count = (
            db.query(QuizAttempt)
            .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
            .filter(Quiz.section_id == section.id)
            .count()
        )
        if quiz_attempt_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete section '{section.title}' because quiz attempts exist for its quizzes."
            )

        # 3. Assignment submissions
        submission_count = (
            db.query(Submission)
            .join(Assignment, Submission.assignment_id == Assignment.id)
            .filter(Assignment.section_id == section.id)
            .count()
        )
        if submission_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete section '{section.title}' because assignment submissions exist for its assignments."
            )

        try:
            db.delete(section)
            db.commit()
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

section_service = SectionService()
