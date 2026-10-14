from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from fastapi import HTTPException, status
from app.models.course import Course
from app.models.category import Category
from app.models.user import User
from app.models.enrollment import Enrollment
from app.models.certificate import Certificate
from app.schemas.course import CourseCreate, CourseUpdate

class CourseService:
    def get_by_id(self, db: Session, course_id: str) -> Optional[Course]:
        if not course_id:
            return None
        return db.query(Course).filter(Course.id == course_id).first()

    def get_course(self, db: Session, course_id: str, current_user: User) -> Course:
        course = self.get_by_id(db, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        return course

    def list_courses(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 50,
        category_id: Optional[str] = None,
        instructor_id: Optional[str] = None,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Course]:
        query = db.query(Course)

        if category_id:
            query = query.filter(Course.category_id == category_id.strip())

        if instructor_id:
            query = query.filter(Course.instructor_id == instructor_id.strip())

        if status_filter:
            query = query.filter(func.lower(Course.status) == status_filter.strip().lower())

        if search:
            term = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Course.title).like(term),
                    func.lower(Course.description).like(term)
                )
            )

        return query.order_by(Course.created_at.desc()).offset(skip).limit(limit).all()

    def create_course(self, db: Session, course_in: CourseCreate, current_user: User) -> Course:
        # Role validation
        if current_user.role == "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Learners are not permitted to create courses"
            )

        # Validate category existence
        category = db.query(Category).filter(Category.id == course_in.category_id.strip()).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category with id '{course_in.category_id}' not found"
            )

        # Instructor ownership resolution
        if current_user.role == "instructor":
            # Always assign to authenticated instructor; ignore client attempts to forge instructor_id
            assigned_instructor_id = current_user.id
        elif current_user.role == "super_admin":
            if course_in.instructor_id:
                inst_user = db.query(User).filter(User.id == course_in.instructor_id.strip()).first()
                if not inst_user:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Instructor with id '{course_in.instructor_id}' not found"
                    )
                assigned_instructor_id = inst_user.id
            else:
                assigned_instructor_id = current_user.id
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create courses"
            )

        course = Course(
            title=course_in.title.strip(),
            subtitle=course_in.subtitle.strip() if course_in.subtitle else None,
            description=course_in.description.strip() if course_in.description else None,
            category_id=category.id,
            instructor_id=assigned_instructor_id,
            status="draft",
        )

        try:
            db.add(course)
            db.commit()
            db.refresh(course)
            return course
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    def update_course(
        self,
        db: Session,
        course_id: str,
        course_in: CourseUpdate,
        current_user: User
    ) -> Course:
        course = self.get_course(db, course_id, current_user)

        # Permissions and ownership check
        if current_user.role == "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Learners cannot update courses"
            )
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only update their own courses"
                )
            # Instructors cannot change ownership to another instructor
            if course_in.instructor_id is not None and course_in.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors cannot change course ownership"
                )
        elif current_user.role == "super_admin":
            if course_in.instructor_id is not None:
                inst_user = db.query(User).filter(User.id == course_in.instructor_id.strip()).first()
                if not inst_user:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Instructor with id '{course_in.instructor_id}' not found"
                    )
                course.instructor_id = inst_user.id
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update course"
            )

        # Category validation if updating category
        if course_in.category_id is not None:
            category = db.query(Category).filter(Category.id == course_in.category_id.strip()).first()
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Category with id '{course_in.category_id}' not found"
                )
            course.category_id = category.id

        # Update core fields
        if course_in.title is not None:
            course.title = course_in.title.strip()

        if course_in.subtitle is not None:
            course.subtitle = course_in.subtitle.strip() if course_in.subtitle else None

        if course_in.description is not None:
            course.description = course_in.description.strip() if course_in.description else None

        course.updated_at = datetime.utcnow()

        try:
            db.commit()
            db.refresh(course)
            return course
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    def delete_course(self, db: Session, course_id: str, current_user: User) -> None:
        course = self.get_course(db, course_id, current_user)

        # Permissions and ownership check
        if current_user.role == "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Learners cannot delete courses"
            )
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only delete their own courses"
                )
        elif current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to delete course"
            )

        # Safe deletion checks: prevent deletion if dependent student records exist
        enrollment_count = db.query(Enrollment).filter(Enrollment.course_id == course.id).count()
        if enrollment_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete course '{course.title}' because {enrollment_count} student(s) are enrolled. Please unenroll students first."
            )

        cert_count = db.query(Certificate).filter(Certificate.course_id == course.id).count()
        if cert_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete course '{course.title}' because {cert_count} certificate(s) have been issued."
            )

        try:
            db.delete(course)
            db.commit()
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

course_service = CourseService()
