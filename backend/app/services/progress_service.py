from datetime import datetime
from typing import Optional, List, Tuple, Set
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.progress import Progress
from app.models.lecture import Lecture
from app.models.section import Section
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import User
from app.schemas.progress import (
    ProgressResponse,
    CourseProgressResponse,
    LearnerCourseProgressSummary,
    LearnerProgressOverviewResponse,
)


class ProgressService:
    """
    Business logic service for tracking learner lecture and course progress.

    PRODUCTION DATABASE REQUIREMENT (For Vidhyank):
    -------------------------------------------------
    To guarantee race-condition concurrency safety at the database engine level,
    a unique constraint:
        CONSTRAINT uq_enrollment_lecture UNIQUE (enrollment_id, lecture_id)
    should be added via a migration (e.g. 003_add_progress_unique_constraint.sql).
    The service layer below implements idempotent queries and handles IntegrityError
    rollbacks to remain safe across SQLite and PostgreSQL environments.
    """

    # ---------------------------------------------------------
    # Internal Helpers
    # ---------------------------------------------------------

    def _get_lecture_hierarchy(self, db: Session, lecture_id: str) -> Tuple[Lecture, Section, Course]:
        """
        Retrieves a lecture and its parent section and course.
        Raises 404 if any entity in the hierarchy does not exist.
        """
        lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
        if not lecture:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lecture with id '{lecture_id}' not found"
            )

        section = db.query(Section).filter(Section.id == lecture.section_id).first()
        if not section:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent section not found for lecture"
            )

        course = db.query(Course).filter(Course.id == section.course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent course not found for lecture"
            )

        return lecture, section, course

    def _get_active_learner_enrollment(
        self,
        db: Session,
        user_id: str,
        course_id: str
    ) -> Enrollment:
        """
        Retrieves an active enrollment for the learner in the specified course.
        Raises 403 if learner is not enrolled or if enrollment is not active.
        """
        enrollment = (
            db.query(Enrollment)
            .filter(
                Enrollment.user_id == user_id,
                Enrollment.course_id == course_id,
            )
            .first()
        )
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Learner is not enrolled in this course"
            )

        if enrollment.status.upper() not in ("ACTIVE", "COMPLETED"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Enrollment status is '{enrollment.status}', not eligible for progress tracking"
            )

        return enrollment

    def _get_all_ordered_lectures_in_course(self, db: Session, course_id: str) -> List[Lecture]:
        """
        Returns all lectures in a course ordered by Section.order_index, then Lecture.order_index.
        """
        return (
            db.query(Lecture)
            .join(Section, Lecture.section_id == Section.id)
            .filter(Section.course_id == course_id)
            .order_by(
                Section.order_index.asc(),
                Lecture.order_index.asc(),
                Lecture.created_at.asc(),
            )
            .all()
        )

    def _calculate_progress_data(
        self,
        db: Session,
        course_id: str,
        enrollment: Enrollment,
    ) -> Tuple[int, int, float, List[str], Optional[str], bool]:
        """
        Calculates granular progress metrics for an enrollment in a course:
        Returns:
            (total_lectures, completed_lectures, completion_percentage,
             completed_lecture_ids, next_lecture_id, is_completed)
        """
        ordered_lectures = self._get_all_ordered_lectures_in_course(db, course_id)
        total_lectures = len(ordered_lectures)
        course_lecture_ids: Set[str] = {lec.id for lec in ordered_lectures}

        # Query all completed progress records for this enrollment
        progress_records = (
            db.query(Progress)
            .filter(
                Progress.enrollment_id == enrollment.id,
                Progress.is_completed == True,
            )
            .all()
        )

        # Strictly isolate lectures belonging to this course
        completed_ids_set = {
            p.lecture_id for p in progress_records
            if p.lecture_id in course_lecture_ids
        }
        completed_lectures = len(completed_ids_set)

        # Percentage calculation (safe against zero division)
        if total_lectures > 0:
            percentage = round((completed_lectures / total_lectures) * 100.0, 2)
            completion_percentage = max(0.0, min(100.0, percentage))
            is_course_completed = completed_lectures >= total_lectures
        else:
            completion_percentage = 0.0
            is_course_completed = False

        # Identify next incomplete lecture in chronological curriculum order
        next_lecture_id: Optional[str] = None
        for lec in ordered_lectures:
            if lec.id not in completed_ids_set:
                next_lecture_id = lec.id
                break

        # Completed lecture IDs preserved in curriculum order
        ordered_completed_ids = [
            lec.id for lec in ordered_lectures
            if lec.id in completed_ids_set
        ]

        return (
            total_lectures,
            completed_lectures,
            completion_percentage,
            ordered_completed_ids,
            next_lecture_id,
            is_course_completed,
        )

    def _sync_enrollment_status(
        self,
        db: Session,
        enrollment: Enrollment,
        is_course_completed: bool,
    ) -> None:
        """
        Synchronizes enrollment status and completed_at timestamp with course completion.
        """
        modified = False
        if is_course_completed:
            if enrollment.status != "COMPLETED":
                enrollment.status = "COMPLETED"
                enrollment.completed_at = datetime.utcnow()
                modified = True
        else:
            if enrollment.status == "COMPLETED":
                enrollment.status = "ACTIVE"
                enrollment.completed_at = None
                modified = True

        if modified:
            try:
                db.add(enrollment)
                db.commit()
                db.refresh(enrollment)
            except Exception:
                db.rollback()
                raise
            if enrollment.status == "COMPLETED":
                from app.services.notification_service import notification_service
                done_course = db.get(Course, enrollment.course_id)
                notification_service.notify(
                    db, enrollment.user_id, "course_completed", "Course completed",
                    f"Congratulations! You completed {done_course.title if done_course else 'the course'}.",
                    f"/courses/{enrollment.course_id}", {"course_id": enrollment.course_id},
                )
                from app.services.gamification_service import gamification_service
                gamification_service.record(db, enrollment.user_id, "course_completed", enrollment.course_id, "course")
                # Imported here to avoid a circular import; never raises.
                from app.services.certificate_service import certificate_service
                certificate_service.auto_issue_if_enabled(db, enrollment)

    # ---------------------------------------------------------
    # Public Service API
    # ---------------------------------------------------------

    def validate_lecture_in_course(
        self,
        db: Session,
        lecture_id: str,
        course_id: str,
    ) -> Lecture:
        """
        Validates that a lecture exists and belongs to the specified course.
        """
        lecture, section, course = self._get_lecture_hierarchy(db, lecture_id)
        if course.id != course_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Lecture '{lecture_id}' does not belong to course '{course_id}'"
            )
        return lecture

    def update_lecture_progress(
        self,
        db: Session,
        lecture_id: str,
        current_user: User,
        is_completed: Optional[bool] = None,
        last_position_seconds: Optional[int] = None,
    ) -> ProgressResponse:
        """
        Idempotently updates progress for a lecture.
        Only learners may modify their own progress.
        `is_completed=None` means "don't change completion" when a playback position is sent,
        and "mark completed" when nothing else is sent (backwards compatible default).
        Also records completed_at, the resume position and the enrollment's last lecture.
        """
        if current_user.role != "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only learners can track learning progress"
            )

        lecture, section, course = self._get_lecture_hierarchy(db, lecture_id)
        enrollment = self._get_active_learner_enrollment(db, current_user.id, course.id)

        if is_completed is None and last_position_seconds is None:
            is_completed = True

        def find():
            return (
                db.query(Progress)
                .filter(Progress.enrollment_id == enrollment.id, Progress.lecture_id == lecture.id)
                .first()
            )

        def apply(row: Progress) -> None:
            now = datetime.utcnow()
            if is_completed is not None and row.is_completed != is_completed:
                row.is_completed = is_completed
                row.completed_at = now if is_completed else None
            if last_position_seconds is not None:
                row.last_position_seconds = last_position_seconds
            row.updated_at = now
            enrollment.last_lecture_id = lecture.id
            enrollment.last_accessed_at = now

        progress = find()
        was_done = bool(progress and progress.is_completed)
        try:
            if progress:
                apply(progress)
                db.commit()
                db.refresh(progress)
            else:
                progress = Progress(enrollment_id=enrollment.id, lecture_id=lecture.id, is_completed=False)
                apply(progress)
                db.add(progress)
                db.commit()
                db.refresh(progress)
        except IntegrityError:
            db.rollback()
            # Handle concurrent insert race condition gracefully
            progress = find()
            if not progress:
                raise
            apply(progress)
            db.commit()
            db.refresh(progress)
        except Exception:
            db.rollback()
            raise

        from app.services.gamification_service import gamification_service
        if progress.is_completed and not was_done:
            gamification_service.touch_activity(db, current_user.id, "learning",
                                                minutes=max((lecture.duration or 0) // 60, 1), lectures=1)
            gamification_service.record(db, current_user.id, "lecture_completed", lecture.id, "lecture")
        else:
            gamification_service.touch_activity(db, current_user.id, "learning")   # watching counts towards the streak

        # Check course completion and synchronize enrollment status
        _, _, _, _, _, is_course_completed = self._calculate_progress_data(db, course.id, enrollment)
        self._sync_enrollment_status(db, enrollment, is_course_completed)

        return ProgressResponse(
            id=progress.id,
            enrollment_id=progress.enrollment_id,
            lecture_id=progress.lecture_id,
            is_completed=progress.is_completed,
            last_position_seconds=progress.last_position_seconds or 0,
            completed_at=progress.completed_at,
            updated_at=progress.updated_at,
        )

    def mark_lecture_completed(
        self,
        db: Session,
        lecture_id: str,
        current_user: User,
    ) -> ProgressResponse:
        """
        Marks a lecture as completed for the authenticated learner.
        """
        return self.update_lecture_progress(db, lecture_id, current_user, is_completed=True)

    def mark_lecture_incomplete(
        self,
        db: Session,
        lecture_id: str,
        current_user: User,
    ) -> ProgressResponse:
        """
        Unmarks a lecture as completed (sets is_completed=False).
        """
        return self.update_lecture_progress(db, lecture_id, current_user, is_completed=False)

    def get_course_progress(
        self,
        db: Session,
        course_id: str,
        current_user: User,
        target_user_id: Optional[str] = None,
    ) -> CourseProgressResponse:
        """
        Retrieves course progress for a learner.
        - Learners can retrieve only their own progress.
        - Instructors can retrieve progress for learners enrolled in their courses.
        - Super admins can retrieve progress for any enrolled learner.
        """
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with id '{course_id}' not found"
            )

        # Resolve learner identity and enforce authorization boundaries
        if current_user.role == "learner":
            if target_user_id and target_user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Learners cannot view another learner's progress"
                )
            learner_id = current_user.id
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only view progress for their own courses"
                )
            if not target_user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="target_user_id is required for instructor to view course progress"
                )
            learner_id = target_user_id
        elif current_user.role == "super_admin":
            if not target_user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="target_user_id is required for super_admin to view course progress"
                )
            learner_id = target_user_id
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )

        # Check enrollment
        enrollment = (
            db.query(Enrollment)
            .filter(
                Enrollment.user_id == learner_id,
                Enrollment.course_id == course_id,
            )
            .first()
        )
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Enrollment not found for this course"
            )

        if enrollment.status.upper() not in ("ACTIVE", "COMPLETED"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Enrollment status is '{enrollment.status}', not eligible for progress retrieval"
            )

        (
            total_lectures,
            completed_lectures,
            completion_percentage,
            completed_lecture_ids,
            next_lecture_id,
            is_completed,
        ) = self._calculate_progress_data(db, course_id, enrollment)

        return CourseProgressResponse(
            course_id=course.id,
            enrollment_id=enrollment.id,
            total_lectures=total_lectures,
            completed_lectures=completed_lectures,
            completion_percentage=completion_percentage,
            completed_lecture_ids=completed_lecture_ids,
            next_lecture_id=next_lecture_id,
            is_completed=is_completed,
        )

    def get_next_incomplete_lecture(
        self,
        db: Session,
        course_id: str,
        current_user: User,
    ) -> Optional[str]:
        """
        Convenience method to retrieve the next incomplete lecture ID for resuming learning.
        """
        progress = self.get_course_progress(db, course_id, current_user)
        return progress.next_lecture_id

    def get_completed_lectures(
        self,
        db: Session,
        course_id: str,
        current_user: User,
    ) -> List[str]:
        """
        Convenience method to retrieve all completed lecture IDs in curriculum order.
        """
        progress = self.get_course_progress(db, course_id, current_user)
        return progress.completed_lecture_ids

    def get_learner_progress_summary(
        self,
        db: Session,
        current_user: User,
    ) -> LearnerProgressOverviewResponse:
        """
        Generates an overview of progress across all active/completed enrolled courses for a learner.
        """
        if current_user.role != "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only learners have enrolled course progress summaries"
            )

        enrollments = (
            db.query(Enrollment)
            .filter(
                Enrollment.user_id == current_user.id,
                Enrollment.status.in_(["ACTIVE", "COMPLETED"]),
            )
            .order_by(Enrollment.enrolled_at.desc())
            .all()
        )

        summaries: List[LearnerCourseProgressSummary] = []
        for enr in enrollments:
            course = db.query(Course).filter(Course.id == enr.course_id).first()
            course_title = course.title if course else None

            (
                total_lectures,
                completed_lectures,
                completion_percentage,
                _,
                next_lecture_id,
                is_completed,
            ) = self._calculate_progress_data(db, enr.course_id, enr)

            summaries.append(
                LearnerCourseProgressSummary(
                    course_id=enr.course_id,
                    course_title=course_title,
                    enrollment_id=enr.id,
                    total_lectures=total_lectures,
                    completed_lectures=completed_lectures,
                    completion_percentage=completion_percentage,
                    is_completed=is_completed,
                    next_lecture_id=next_lecture_id,
                    enrolled_at=enr.enrolled_at,
                    completed_at=enr.completed_at,
                )
            )

        total_enrolled = len(summaries)
        completed_count = sum(1 for s in summaries if s.is_completed)
        in_progress_count = total_enrolled - completed_count

        return LearnerProgressOverviewResponse(
            courses=summaries,
            total_enrolled_courses=total_enrolled,
            completed_courses=completed_count,
            in_progress_courses=in_progress_count,
        )


progress_service = ProgressService()
