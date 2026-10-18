from datetime import datetime, timezone
from typing import Optional, List, Tuple, Union, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.assignment import Assignment
from app.models.submission import Submission
from app.models.section import Section
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import User
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentUpdate,
    AssignmentResponse,
    AssignmentDetailResponse,
    AssignmentLearnerDetailResponse,
    SubmissionCreate,
    SubmissionGrade,
    SubmissionUpdate,
    SubmissionResponse,
    SubmissionDetailResponse,
)


class AssignmentService:
    # ---------------------------------------------------------
    # Helper & Validation Methods
    # ---------------------------------------------------------

    def get_by_id(self, db: Session, assignment_id: str) -> Optional[Assignment]:
        if not assignment_id:
            return None
        return db.query(Assignment).filter(Assignment.id == assignment_id).first()

    def get_submission_by_id(self, db: Session, submission_id: str) -> Optional[Submission]:
        if not submission_id:
            return None
        return db.query(Submission).filter(Submission.id == submission_id).first()

    def _get_section_and_course(self, db: Session, section_id: str) -> Tuple[Section, Course]:
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
        return section, course

    def _get_assignment_section_and_course(self, db: Session, assignment_id: str) -> Tuple[Assignment, Section, Course]:
        assignment = self.get_by_id(db, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        section = db.query(Section).filter(Section.id == assignment.section_id).first()
        if not section:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Section not found"
            )
        course = db.query(Course).filter(Course.id == section.course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent course not found"
            )
        return assignment, section, course

    @staticmethod
    def _normalize_deadline(deadline: Optional[datetime]) -> Optional[datetime]:
        """
        Normalizes deadlines:
        - None returns None.
        - Timezone-aware datetimes are converted to UTC.
        - Naive datetimes are assumed to be in UTC according to platform conventions.
        """
        if deadline is None:
            return None
        if deadline.tzinfo is not None:
            return deadline.astimezone(timezone.utc)
        return deadline.replace(tzinfo=timezone.utc)

    def _check_author_permission(self, course: Course, current_user: User) -> None:
        """
        Enforces authoring access control:
        - Super Admin: global access
        - Instructor: only owned courses, blocked if course is pending review
        - Learner: forbidden
        """
        if current_user.role == "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Learners are not permitted to manage assignment content"
            )
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only manage assignments in their own courses"
                )
            if course.status and course.status.lower() == "pending_review":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot modify assignment content while course is pending review"
                )
        elif current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to manage assignment content"
            )

    def _check_learner_access(self, db: Session, course: Course, current_user: User) -> None:
        """
        Validates learner access:
        - Course must be published
        - Learner must be actively enrolled
        """
        if current_user.role == "learner":
            if not course.status or course.status.lower() != "published":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot access assignments for an unpublished course"
                )
            enrollment = (
                db.query(Enrollment)
                .filter(
                    Enrollment.user_id == current_user.id,
                    Enrollment.course_id == course.id,
                    Enrollment.status == "ACTIVE"
                )
                .first()
            )
            if not enrollment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Learner must be actively enrolled in the course to access assignments"
                )

    # ---------------------------------------------------------
    # Assignment CRUD Operations
    # ---------------------------------------------------------

    def create_assignment(
        self,
        db: Session,
        section_id: str,
        assignment_in: AssignmentCreate,
        current_user: User
    ) -> Assignment:
        section, course = self._get_section_and_course(db, section_id)
        self._check_author_permission(course, current_user)

        cleaned_title = assignment_in.title.strip()
        if not cleaned_title:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignment title cannot be empty"
            )

        assignment = Assignment(
            section_id=section.id,
            title=cleaned_title,
            instructions=assignment_in.instructions,
            deadline=self._normalize_deadline(assignment_in.deadline),
        )

        try:
            db.add(assignment)
            db.commit()
            db.refresh(assignment)
            return assignment
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    def get_assignment(self, db: Session, assignment_id: str, current_user: User) -> Assignment:
        assignment, _, course = self._get_assignment_section_and_course(db, assignment_id)

        if current_user.role == "learner":
            self._check_learner_access(db, course, current_user)
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only view assignments in their own courses"
                )

        return assignment

    def get_assignment_detail(
        self,
        db: Session,
        assignment_id: str,
        current_user: User
    ) -> Union[AssignmentDetailResponse, AssignmentLearnerDetailResponse]:
        assignment = self.get_assignment(db, assignment_id, current_user)

        if current_user.role == "learner":
            sub = (
                db.query(Submission)
                .filter(
                    Submission.assignment_id == assignment.id,
                    Submission.user_id == current_user.id
                )
                .first()
            )
            return AssignmentLearnerDetailResponse(
                id=assignment.id,
                section_id=assignment.section_id,
                title=assignment.title,
                instructions=assignment.instructions,
                deadline=assignment.deadline,
                created_at=assignment.created_at,
                my_submission=SubmissionResponse.model_validate(sub) if sub else None
            )
        else:
            submissions = (
                db.query(Submission)
                .filter(Submission.assignment_id == assignment.id)
                .order_by(Submission.submitted_at.desc())
                .all()
            )
            return AssignmentDetailResponse(
                id=assignment.id,
                section_id=assignment.section_id,
                title=assignment.title,
                instructions=assignment.instructions,
                deadline=assignment.deadline,
                created_at=assignment.created_at,
                submissions=[SubmissionResponse.model_validate(s) for s in submissions]
            )

    def list_assignments_for_section(
        self,
        db: Session,
        section_id: str,
        current_user: User
    ) -> List[Assignment]:
        section, course = self._get_section_and_course(db, section_id)

        if current_user.role == "learner":
            self._check_learner_access(db, course, current_user)
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only list assignments in their own courses"
                )

        return (
            db.query(Assignment)
            .filter(Assignment.section_id == section.id)
            .order_by(Assignment.created_at.asc())
            .all()
        )

    def update_assignment(
        self,
        db: Session,
        assignment_id: str,
        assignment_in: AssignmentUpdate,
        current_user: User
    ) -> Assignment:
        assignment, _, course = self._get_assignment_section_and_course(db, assignment_id)
        self._check_author_permission(course, current_user)

        if assignment_in.title is not None:
            cleaned = assignment_in.title.strip()
            if not cleaned:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assignment title cannot be empty"
                )
            assignment.title = cleaned

        if assignment_in.instructions is not None:
            assignment.instructions = assignment_in.instructions

        if assignment_in.deadline is not None:
            assignment.deadline = self._normalize_deadline(assignment_in.deadline)

        try:
            db.commit()
            db.refresh(assignment)
            return assignment
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    def delete_assignment(self, db: Session, assignment_id: str, current_user: User) -> None:
        assignment, _, course = self._get_assignment_section_and_course(db, assignment_id)
        self._check_author_permission(course, current_user)

        # Integrity check: Prevent accidental permanent deletion if student submissions exist
        submission_count = (
            db.query(Submission)
            .filter(Submission.assignment_id == assignment.id)
            .count()
        )
        if submission_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete assignment with existing learner submissions"
            )

        try:
            db.delete(assignment)
            db.commit()
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    # ---------------------------------------------------------
    # Submission Operations
    # ---------------------------------------------------------

    def submit_assignment(
        self,
        db: Session,
        assignment_id: str,
        submission_in: SubmissionCreate,
        current_user: User
    ) -> Submission:
        if current_user.role != "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only learners can submit assignments"
            )

        assignment, _, course = self._get_assignment_section_and_course(db, assignment_id)
        self._check_learner_access(db, course, current_user)

        # Timezone-aware deadline enforcement
        if assignment.deadline is not None:
            now_utc = datetime.now(timezone.utc)
            deadline = self._normalize_deadline(assignment.deadline)
            if now_utc > deadline:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assignment deadline has passed. Submissions are no longer accepted."
                )

        cleaned_url = submission_in.submission_url.strip()

        # Prevent duplicate submissions: If resubmission, update existing record safely
        existing_sub = (
            db.query(Submission)
            .filter(
                Submission.assignment_id == assignment.id,
                Submission.user_id == current_user.id
            )
            .first()
        )

        try:
            if existing_sub:
                existing_sub.submission_url = cleaned_url
                existing_sub.submitted_at = datetime.utcnow()
                existing_sub.grade = None  # Reset grade upon resubmission
                db.commit()
                db.refresh(existing_sub)
                return existing_sub
            else:
                new_sub = Submission(
                    assignment_id=assignment.id,
                    user_id=current_user.id,
                    submission_url=cleaned_url,
                    grade=None,
                    submitted_at=datetime.utcnow()
                )
                db.add(new_sub)
                db.commit()
                db.refresh(new_sub)
                return new_sub
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    def get_learner_submission(
        self,
        db: Session,
        assignment_id: str,
        current_user: User
    ) -> Optional[Submission]:
        assignment, _, course = self._get_assignment_section_and_course(db, assignment_id)
        self._check_learner_access(db, course, current_user)

        submission = (
            db.query(Submission)
            .filter(
                Submission.assignment_id == assignment.id,
                Submission.user_id == current_user.id
            )
            .first()
        )
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No submission found for this assignment"
            )
        return submission

    def get_submission(
        self,
        db: Session,
        submission_id: str,
        current_user: User
    ) -> Submission:
        submission = self.get_submission_by_id(db, submission_id)
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )

        assignment, _, course = self._get_assignment_section_and_course(db, submission.assignment_id)

        if current_user.role == "learner":
            if submission.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Learners can only view their own submissions"
                )
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only view submissions for their own courses"
                )
        elif current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view this submission"
            )

        return submission

    def get_assignment_submission(
        self,
        db: Session,
        assignment_id: str,
        submission_id: str,
        current_user: User
    ) -> Submission:
        submission = self.get_submission(db, submission_id, current_user)
        if submission.assignment_id != assignment_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Submission '{submission_id}' does not belong to assignment '{assignment_id}'"
            )
        return submission

    def list_submissions_for_assignment(
        self,
        db: Session,
        assignment_id: str,
        current_user: User
    ) -> List[Submission]:
        assignment, _, course = self._get_assignment_section_and_course(db, assignment_id)

        if current_user.role == "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Learners are not permitted to list all submissions"
            )
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only view submissions for their own courses"
                )
        elif current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to list submissions"
            )

        return (
            db.query(Submission)
            .filter(Submission.assignment_id == assignment.id)
            .order_by(Submission.submitted_at.desc())
            .all()
        )

    # ---------------------------------------------------------
    # Grading Operations
    # ---------------------------------------------------------

    def grade_submission(
        self,
        db: Session,
        submission_id: str,
        grade_in: SubmissionGrade,
        current_user: User
    ) -> Submission:
        submission = self.get_submission_by_id(db, submission_id)
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )

        assignment, _, course = self._get_assignment_section_and_course(db, submission.assignment_id)
        self._check_author_permission(course, current_user)

        cleaned_grade = grade_in.grade.strip()
        if not cleaned_grade:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Grade cannot be empty"
            )
        if len(cleaned_grade) > 32:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Grade cannot exceed 32 characters"
            )

        submission.grade = cleaned_grade

        try:
            db.commit()
            db.refresh(submission)
            return submission
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise


assignment_service = AssignmentService()
