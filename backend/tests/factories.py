"""Small helpers that build test data directly in the database."""
import uuid

from app.models import Category, Course, Enrollment, Lecture, Section, User
from app.utils.security import create_access_token, get_password_hash

PASSWORD = "Password123"


def uid() -> str:
    return uuid.uuid4().hex[:10]


def make_user(db, role="learner", full_name=None, email=None, status="active"):
    user = User(
        email=email or f"{role}-{uid()}@example.com",
        full_name=full_name or f"{role.title()} {uid()}",
        role=role,
        status=status,
        hashed_password=get_password_hash(PASSWORD),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def auth(user) -> dict:
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


def make_course(db, instructor, status="published", lectures=2, title=None):
    """A course with one section and `lectures` lectures. Returns (course, [lectures])."""
    category = Category(name="Cat", slug=f"cat-{uid()}")
    db.add(category)
    db.flush()
    course = Course(
        title=title or f"Course {uid()}", instructor_id=instructor.id, category_id=category.id, status=status,
    )
    db.add(course)
    db.flush()
    section = Section(course_id=course.id, title="Section 1", order_index=0)
    db.add(section)
    db.flush()
    lecture_rows = [
        Lecture(section_id=section.id, title=f"Lecture {i + 1}", order_index=i, duration=60)
        for i in range(lectures)
    ]
    db.add_all(lecture_rows)
    db.commit()
    db.refresh(course)
    return course, lecture_rows


def enroll(db, user, course, status="ACTIVE"):
    enrollment = Enrollment(user_id=user.id, course_id=course.id, status=status)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment
