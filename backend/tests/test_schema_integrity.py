"""
Database-level rules from the new schema: uniqueness and allowed values.
These run on SQLite in CI; tests/test_migrations.py covers PostgreSQL.
"""
import uuid
import pytest
from sqlalchemy.exc import IntegrityError

from app.models import (
    User, Category, Course, Section, Lecture, Enrollment, Progress, Review, WishlistItem,
    CodingExercise, CodingSubmission, PlatformSetting, Badge, UserBadge,
)


def _id():
    return str(uuid.uuid4())


@pytest.fixture
def graph(db_session):
    """A learner enrolled in a course with one lecture."""
    learner = User(email=f"{_id()}@x.com", full_name="L", role="learner", hashed_password="h")
    instructor = User(email=f"{_id()}@x.com", full_name="I", role="instructor", hashed_password="h")
    cat = Category(name="C", slug=_id())
    db_session.add_all([learner, instructor, cat])
    db_session.flush()
    course = Course(title="T", instructor_id=instructor.id, category_id=cat.id, status="published")
    db_session.add(course)
    db_session.flush()
    section = Section(course_id=course.id, title="S")
    db_session.add(section)
    db_session.flush()
    lecture = Lecture(section_id=section.id, title="L")
    enrollment = Enrollment(user_id=learner.id, course_id=course.id)
    db_session.add_all([lecture, enrollment])
    db_session.flush()
    return {"learner": learner, "instructor": instructor, "course": course,
            "lecture": lecture, "enrollment": enrollment}


def _expect_integrity_error(db_session, *objs):
    db_session.add_all(objs)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_progress_is_unique_per_enrollment_and_lecture(db_session, graph):
    db_session.add(Progress(enrollment_id=graph["enrollment"].id, lecture_id=graph["lecture"].id))
    db_session.flush()
    _expect_integrity_error(
        db_session, Progress(enrollment_id=graph["enrollment"].id, lecture_id=graph["lecture"].id)
    )


def test_one_review_per_learner_per_course(db_session, graph):
    db_session.add(Review(course_id=graph["course"].id, user_id=graph["learner"].id, rating=4))
    db_session.flush()
    _expect_integrity_error(
        db_session, Review(course_id=graph["course"].id, user_id=graph["learner"].id, rating=5)
    )


def test_review_rating_must_be_1_to_5(db_session, graph):
    _expect_integrity_error(
        db_session, Review(course_id=graph["course"].id, user_id=graph["learner"].id, rating=6)
    )


def test_wishlist_has_no_duplicates(db_session, graph):
    db_session.add(WishlistItem(user_id=graph["learner"].id, course_id=graph["course"].id))
    db_session.flush()
    _expect_integrity_error(db_session, WishlistItem(user_id=graph["learner"].id, course_id=graph["course"].id))


def test_user_status_must_be_known_value(db_session):
    _expect_integrity_error(
        db_session, User(email=f"{_id()}@x.com", full_name="X", hashed_password="h", status="banned")
    )


def test_coding_exercise_language_and_submission_status_are_checked(db_session, graph):
    _expect_integrity_error(
        db_session, CodingExercise(course_id=graph["course"].id, title="E", problem_statement="P", language="cobol")
    )
    ex = CodingExercise(course_id=graph["course"].id, title="E", problem_statement="P", language="python")
    db_session.add(ex)
    db_session.flush()
    _expect_integrity_error(
        db_session,
        CodingSubmission(exercise_id=ex.id, user_id=graph["learner"].id, language="python",
                         source_code="print(1)", status="maybe"),
    )


def test_badge_awarded_once(db_session, graph):
    badge = Badge(code=_id(), name="B")
    db_session.add(badge)
    db_session.flush()
    db_session.add(UserBadge(user_id=graph["learner"].id, badge_id=badge.id))
    db_session.flush()
    _expect_integrity_error(db_session, UserBadge(user_id=graph["learner"].id, badge_id=badge.id))


def test_platform_setting_stores_json_values(db_session):
    db_session.add(PlatformSetting(key="test.languages", value=["python", "sql"], category="courses"))
    db_session.flush()
    assert db_session.get(PlatformSetting, "test.languages").value == ["python", "sql"]
