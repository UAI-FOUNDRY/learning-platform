from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.models.user import User
from app.models.certificate import Certificate

class EnrollmentService:
    def enroll_in_course(self, db: Session, course_id: str, current_user: User) -> Enrollment:
        if current_user.role != "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only learners are permitted to enroll in courses"
            )

        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with id '{course_id}' not found"
            )

        if course.status.lower() != "published":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot enroll in an unpublished course"
            )

        # Check existing enrollment
        existing = (
            db.query(Enrollment)
            .filter(
                Enrollment.user_id == current_user.id,
                Enrollment.course_id == course.id
            )
            .first()
        )
        if existing:
            if existing.status == "ACTIVE":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Already enrolled in this course"
                )
            else:
                existing.status = "ACTIVE"
                existing.enrolled_at = datetime.utcnow()
                existing.completed_at = None
                try:
                    db.commit()
                    db.refresh(existing)
                    return existing
                except Exception:
                    db.rollback()
                    raise

        enrollment = Enrollment(
            user_id=current_user.id,
            course_id=course.id,
            status="ACTIVE",
            enrolled_at=datetime.utcnow()
        )

        try:
            db.add(enrollment)
            db.commit()
            db.refresh(enrollment)
            return enrollment
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    def get_my_enrollments(
        self,
        db: Session,
        current_user: User,
        skip: int = 0,
        limit: int = 50,
        status_filter: Optional[str] = None
    ) -> List[Enrollment]:
        if current_user.role != "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only learners have personal course enrollments"
            )

        query = db.query(Enrollment).filter(Enrollment.user_id == current_user.id)
        if status_filter:
            query = query.filter(func.lower(Enrollment.status) == status_filter.strip().lower())

        enrollments = (
            query.order_by(Enrollment.enrolled_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        # Mask internal review feedback on courses for learners
        for e in enrollments:
            if e.course:
                e.course.review_feedback = None
        return enrollments

    def get_course_enrollments(
        self,
        db: Session,
        course_id: str,
        current_user: User,
        skip: int = 0,
        limit: int = 50
    ) -> List[Enrollment]:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with id '{course_id}' not found"
            )

        if current_user.role == "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Learners cannot view course enrollment rosters"
            )
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only view enrollments for their own courses"
                )
        elif current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )

        return (
            db.query(Enrollment)
            .filter(Enrollment.course_id == course.id)
            .order_by(Enrollment.enrolled_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def list_enrollments(
        self,
        db: Session,
        current_user: User,
        course_id: Optional[str] = None,
        user_id: Optional[str] = None,
        status_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Enrollment]:
        """All enrollments: Super Admin sees everything, an instructor only their own courses."""
        if current_user.role not in ("super_admin", "instructor"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admins and Instructors can list enrollments",
            )
        query = db.query(Enrollment)
        if current_user.role == "instructor":
            query = query.join(Course, Course.id == Enrollment.course_id).filter(
                Course.instructor_id == current_user.id
            )
        if course_id:
            query = query.filter(Enrollment.course_id == course_id.strip())
        if user_id:
            query = query.filter(Enrollment.user_id == user_id.strip())
        if status_filter:
            query = query.filter(func.upper(Enrollment.status) == status_filter.strip().upper())
        return query.order_by(Enrollment.enrolled_at.desc()).offset(skip).limit(limit).all()

    def get_enrollment_by_id(self, db: Session, enrollment_id: str, current_user: User) -> Enrollment:
        enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Enrollment with id '{enrollment_id}' not found"
            )

        if current_user.role == "super_admin":
            pass
        elif current_user.role == "learner":
            if enrollment.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this enrollment record"
                )
            if enrollment.course:
                enrollment.course.review_feedback = None
        elif current_user.role == "instructor":
            course = db.query(Course).filter(Course.id == enrollment.course_id).first()
            if not course or course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only view enrollments for their own courses"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )

        return enrollment

    def unenroll_course(self, db: Session, enrollment_id: str, current_user: User) -> None:
        enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Enrollment with id '{enrollment_id}' not found"
            )

        if current_user.role == "learner":
            if enrollment.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Learners can only unenroll themselves"
                )
        elif current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to unenroll student"
            )

        # Check if certificate has already been issued
        cert_count = db.query(Certificate).filter(Certificate.enrollment_id == enrollment.id).count()
        if cert_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot unenroll from course: a certificate has already been issued for this enrollment"
            )

        try:
            db.delete(enrollment)
            db.commit()
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

enrollment_service = EnrollmentService()
