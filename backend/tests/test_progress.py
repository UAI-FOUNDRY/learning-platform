import pytest
from datetime import datetime, timezone
from pydantic import ValidationError

from app.schemas.progress import (
    ProgressBase,
    ProgressCreate,
    LectureProgressUpdate,
    ProgressResponse,
    CourseProgressResponse,
    LearnerCourseProgressSummary,
    LearnerProgressOverviewResponse,
)
import app.schemas as schemas


# ---------------------------------------------------------
# Existing Router Mount Test
# ---------------------------------------------------------

def test_progress_router_placeholder_intact(client):
    """Verify that existing /api/v1/progress endpoint continues working."""
    response = client.get("/api/v1/progress/")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "progress"
    assert "description" in data


# ---------------------------------------------------------
# Schema Export & BaseSchema Conventions Tests
# ---------------------------------------------------------

def test_progress_schemas_exported_in_package():
    """Verify that all progress schemas are exported in app.schemas."""
    assert hasattr(schemas, "ProgressBase")
    assert hasattr(schemas, "ProgressCreate")
    assert hasattr(schemas, "LectureProgressUpdate")
    assert hasattr(schemas, "ProgressResponse")
    assert hasattr(schemas, "CourseProgressResponse")
    assert hasattr(schemas, "LearnerCourseProgressSummary")
    assert hasattr(schemas, "LearnerProgressOverviewResponse")
    assert "ProgressResponse" in schemas.__all__
    assert "CourseProgressResponse" in schemas.__all__
    assert "LectureProgressUpdate" in schemas.__all__
    assert "LearnerCourseProgressSummary" in schemas.__all__


# ---------------------------------------------------------
# LectureProgressUpdate Tests
# ---------------------------------------------------------

def test_lecture_progress_update_default():
    """Default payload should mark lecture as completed."""
    update = LectureProgressUpdate()
    assert update.is_completed is True


def test_lecture_progress_update_explicit_true():
    update = LectureProgressUpdate(is_completed=True)
    assert update.is_completed is True


def test_lecture_progress_update_explicit_false():
    update = LectureProgressUpdate(is_completed=False)
    assert update.is_completed is False


def test_lecture_progress_update_from_dict():
    data = {"is_completed": False}
    update = LectureProgressUpdate.model_validate(data)
    assert update.is_completed is False


# ---------------------------------------------------------
# ProgressCreate Tests
# ---------------------------------------------------------

def test_progress_create_valid():
    create_payload = ProgressCreate(
        enrollment_id="enr-101",
        lecture_id="lec-202",
        is_completed=True,
    )
    assert create_payload.enrollment_id == "enr-101"
    assert create_payload.lecture_id == "lec-202"
    assert create_payload.is_completed is True


def test_progress_create_whitespace_stripped():
    create_payload = ProgressCreate(
        enrollment_id="  enr-101  ",
        lecture_id="  lec-202  ",
    )
    assert create_payload.enrollment_id == "enr-101"
    assert create_payload.lecture_id == "lec-202"


def test_progress_create_empty_id_raises():
    with pytest.raises(ValidationError):
        ProgressCreate(enrollment_id="   ", lecture_id="lec-1")

    with pytest.raises(ValidationError):
        ProgressCreate(enrollment_id="enr-1", lecture_id="")


def test_progress_create_missing_fields_raises():
    with pytest.raises(ValidationError):
        ProgressCreate(enrollment_id="enr-1")

    with pytest.raises(ValidationError):
        ProgressCreate(lecture_id="lec-1")


# ---------------------------------------------------------
# ProgressResponse Serialization & Model Attribute Tests
# ---------------------------------------------------------

def test_progress_response_from_dict():
    now = datetime.now(timezone.utc)
    data = {
        "id": "prog-uuid-1234",
        "enrollment_id": "enr-5678",
        "lecture_id": "lec-9012",
        "is_completed": True,
        "updated_at": now,
    }
    resp = ProgressResponse.model_validate(data)
    assert resp.id == "prog-uuid-1234"
    assert resp.enrollment_id == "enr-5678"
    assert resp.lecture_id == "lec-9012"
    assert resp.is_completed is True
    assert resp.updated_at == now


def test_progress_response_from_orm_object():
    """Verify ORM compatibility via from_attributes=True."""
    now = datetime.now(timezone.utc)

    class MockProgressORM:
        id = "prog-orm-1"
        enrollment_id = "enr-orm-2"
        lecture_id = "lec-orm-3"
        is_completed = True
        updated_at = now

    resp = ProgressResponse.model_validate(MockProgressORM())
    assert resp.id == "prog-orm-1"
    assert resp.enrollment_id == "enr-orm-2"
    assert resp.lecture_id == "lec-orm-3"
    assert resp.is_completed is True
    assert resp.updated_at == now


def test_progress_response_updated_at_optional():
    """updated_at is optional (None before flush/assignment)."""
    data = {
        "id": "prog-1",
        "enrollment_id": "enr-1",
        "lecture_id": "lec-1",
        "is_completed": False,
        "updated_at": None,
    }
    resp = ProgressResponse.model_validate(data)
    assert resp.updated_at is None
    assert resp.is_completed is False


def test_progress_response_missing_required_fields():
    """id, enrollment_id, lecture_id are required in response."""
    with pytest.raises(ValidationError):
        ProgressResponse(enrollment_id="enr-1", lecture_id="lec-1")

    with pytest.raises(ValidationError):
        ProgressResponse(id="p-1", lecture_id="lec-1")

    with pytest.raises(ValidationError):
        ProgressResponse(id="p-1", enrollment_id="enr-1")


# ---------------------------------------------------------
# CourseProgressResponse Tests
# ---------------------------------------------------------

def test_course_progress_response_valid():
    prog = CourseProgressResponse(
        course_id="crs-python",
        enrollment_id="enr-101",
        total_lectures=10,
        completed_lectures=4,
        completion_percentage=40.0,
        completed_lecture_ids=["lec-1", "lec-2", "lec-3", "lec-4"],
        next_lecture_id="lec-5",
        is_completed=False,
    )
    assert prog.course_id == "crs-python"
    assert prog.enrollment_id == "enr-101"
    assert prog.total_lectures == 10
    assert prog.completed_lectures == 4
    assert prog.completion_percentage == 40.0
    assert len(prog.completed_lecture_ids) == 4
    assert prog.next_lecture_id == "lec-5"
    assert prog.is_completed is False


def test_course_progress_response_empty_course_safely():
    """An empty course (0 lectures) must default safely without errors."""
    prog = CourseProgressResponse(course_id="crs-empty")
    assert prog.course_id == "crs-empty"
    assert prog.enrollment_id is None
    assert prog.total_lectures == 0
    assert prog.completed_lectures == 0
    assert prog.completion_percentage == 0.0
    assert prog.completed_lecture_ids == []
    assert prog.next_lecture_id is None
    assert prog.is_completed is False


def test_course_progress_response_fully_completed():
    prog = CourseProgressResponse(
        course_id="crs-done",
        total_lectures=5,
        completed_lectures=5,
        completion_percentage=100.0,
        completed_lecture_ids=["l1", "l2", "l3", "l4", "l5"],
        next_lecture_id=None,
        is_completed=True,
    )
    assert prog.completion_percentage == 100.0
    assert prog.is_completed is True
    assert prog.next_lecture_id is None


def test_course_progress_response_invalid_percentages():
    """Percentage must be strictly between 0 and 100."""
    with pytest.raises(ValidationError):
        CourseProgressResponse(course_id="c1", completion_percentage=-0.1)

    with pytest.raises(ValidationError):
        CourseProgressResponse(course_id="c1", completion_percentage=-25.0)

    with pytest.raises(ValidationError):
        CourseProgressResponse(course_id="c1", completion_percentage=100.1)

    with pytest.raises(ValidationError):
        CourseProgressResponse(course_id="c1", completion_percentage=150.0)


def test_course_progress_response_percentage_rounding():
    prog = CourseProgressResponse(
        course_id="c1",
        total_lectures=3,
        completed_lectures=1,
        completion_percentage=33.3333333,
    )
    assert prog.completion_percentage == 33.33


def test_course_progress_response_completed_exceeds_total_invalid():
    with pytest.raises(ValidationError):
        CourseProgressResponse(
            course_id="c1",
            total_lectures=3,
            completed_lectures=4,
            completion_percentage=100.0,
        )


def test_course_progress_response_negative_counts_invalid():
    with pytest.raises(ValidationError):
        CourseProgressResponse(course_id="c1", total_lectures=-1)

    with pytest.raises(ValidationError):
        CourseProgressResponse(course_id="c1", completed_lectures=-1)


def test_course_progress_response_empty_course_id_invalid():
    with pytest.raises(ValidationError):
        CourseProgressResponse(course_id="   ")


# ---------------------------------------------------------
# LearnerCourseProgressSummary Tests
# ---------------------------------------------------------

def test_learner_course_progress_summary_valid():
    now = datetime.now(timezone.utc)
    summary = LearnerCourseProgressSummary(
        course_id="crs-fastapi",
        course_title="FastAPI Mastery",
        enrollment_id="enr-88",
        total_lectures=12,
        completed_lectures=9,
        completion_percentage=75.0,
        is_completed=False,
        next_lecture_id="lec-10",
        enrolled_at=now,
        completed_at=None,
    )
    assert summary.course_id == "crs-fastapi"
    assert summary.course_title == "FastAPI Mastery"
    assert summary.completion_percentage == 75.0
    assert summary.next_lecture_id == "lec-10"
    assert summary.enrolled_at == now
    assert summary.completed_at is None


def test_learner_course_progress_summary_invalid_percentage():
    with pytest.raises(ValidationError):
        LearnerCourseProgressSummary(
            course_id="c1",
            completion_percentage=110.0,
        )

    with pytest.raises(ValidationError):
        LearnerCourseProgressSummary(
            course_id="c1",
            completion_percentage=-5.0,
        )


def test_learner_course_progress_summary_completed_exceeds_total():
    with pytest.raises(ValidationError):
        LearnerCourseProgressSummary(
            course_id="c1",
            total_lectures=5,
            completed_lectures=8,
        )


# ---------------------------------------------------------
# LearnerProgressOverviewResponse Tests
# ---------------------------------------------------------

def test_learner_progress_overview_response():
    item1 = LearnerCourseProgressSummary(
        course_id="c1",
        course_title="Course One",
        total_lectures=10,
        completed_lectures=10,
        completion_percentage=100.0,
        is_completed=True,
    )
    item2 = LearnerCourseProgressSummary(
        course_id="c2",
        course_title="Course Two",
        total_lectures=8,
        completed_lectures=4,
        completion_percentage=50.0,
        is_completed=False,
    )
    overview = LearnerProgressOverviewResponse(
        courses=[item1, item2],
        total_enrolled_courses=2,
        completed_courses=1,
        in_progress_courses=1,
    )
    assert len(overview.courses) == 2
    assert overview.total_enrolled_courses == 2
    assert overview.completed_courses == 1
    assert overview.in_progress_courses == 1


# =========================================================
# Stage 2: ProgressService Business Logic Tests
# =========================================================

from fastapi import HTTPException
from app.models.user import User
from app.models.category import Category
from app.models.course import Course
from app.models.section import Section
from app.models.lecture import Lecture
from app.models.enrollment import Enrollment
from app.models.progress import Progress
from app.services.progress_service import progress_service
from app.utils.security import get_password_hash


def create_test_user(db, email, role="learner", full_name="Test User"):
    user = User(
        email=email.lower().strip(),
        full_name=full_name,
        role=role,
        hashed_password=get_password_hash("Secret123!"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_test_course(db, instructor_id, title="Progress Course", status="PUBLISHED"):
    cat = Category(name=f"Cat-{title}", slug=f"slug-{title.lower().replace(' ', '-')[:30]}")
    db.add(cat)
    db.commit()
    db.refresh(cat)

    course = Course(
        title=title,
        instructor_id=instructor_id,
        category_id=cat.id,
        status=status,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def create_test_section(db, course_id, title="Test Section", order_index=0):
    sec = Section(course_id=course_id, title=title, order_index=order_index)
    db.add(sec)
    db.commit()
    db.refresh(sec)
    return sec


def create_test_lecture(db, section_id, title="Test Lecture", order_index=0, duration=300):
    lec = Lecture(
        section_id=section_id,
        title=title,
        order_index=order_index,
        duration=duration,
    )
    db.add(lec)
    db.commit()
    db.refresh(lec)
    return lec


def enroll_test_user(db, user_id, course_id, status="ACTIVE"):
    enr = Enrollment(user_id=user_id, course_id=course_id, status=status)
    db.add(enr)
    db.commit()
    db.refresh(enr)
    return enr


# ---------------------------------------------------------
# 1. Marking Lectures & Idempotency
# ---------------------------------------------------------

def test_service_mark_lecture_completed_success(db_session):
    instructor = create_test_user(db_session, "prog_inst_1@test.com", role="instructor")
    learner = create_test_user(db_session, "prog_lrn_1@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Course Progress 1")
    section = create_test_section(db_session, course.id, "Section 1", order_index=0)
    lecture = create_test_lecture(db_session, section.id, "Lecture 1", order_index=0)
    enrollment = enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    resp = progress_service.mark_lecture_completed(db_session, lecture.id, learner)
    assert resp.is_completed is True
    assert resp.lecture_id == lecture.id
    assert resp.enrollment_id == enrollment.id
    assert resp.updated_at is not None

    # Verify directly in database
    records = db_session.query(Progress).filter(
        Progress.enrollment_id == enrollment.id,
        Progress.lecture_id == lecture.id,
    ).all()
    assert len(records) == 1
    assert records[0].is_completed is True


def test_service_mark_lecture_repeated_is_idempotent(db_session):
    instructor = create_test_user(db_session, "prog_inst_2@test.com", role="instructor")
    learner = create_test_user(db_session, "prog_lrn_2@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Course Progress 2")
    section = create_test_section(db_session, course.id, "Section 1", order_index=0)
    lecture = create_test_lecture(db_session, section.id, "Lecture 1", order_index=0)
    enrollment = enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    resp1 = progress_service.mark_lecture_completed(db_session, lecture.id, learner)
    resp2 = progress_service.mark_lecture_completed(db_session, lecture.id, learner)
    resp3 = progress_service.update_lecture_progress(db_session, lecture.id, learner, is_completed=True)

    assert resp1.id == resp2.id == resp3.id
    assert resp2.is_completed is True

    # Critical data integrity check: exactly 1 row exists
    records = db_session.query(Progress).filter(
        Progress.enrollment_id == enrollment.id,
        Progress.lecture_id == lecture.id,
    ).all()
    assert len(records) == 1


def test_service_mark_lecture_incomplete(db_session):
    instructor = create_test_user(db_session, "prog_inst_3@test.com", role="instructor")
    learner = create_test_user(db_session, "prog_lrn_3@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Course Progress 3")
    section = create_test_section(db_session, course.id, "Section 1", order_index=0)
    lecture = create_test_lecture(db_session, section.id, "Lecture 1", order_index=0)
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    # Complete then un-complete
    progress_service.mark_lecture_completed(db_session, lecture.id, learner)
    resp = progress_service.mark_lecture_incomplete(db_session, lecture.id, learner)
    assert resp.is_completed is False

    course_prog = progress_service.get_course_progress(db_session, course.id, learner)
    assert course_prog.completed_lectures == 0
    assert course_prog.completion_percentage == 0.0
    assert course_prog.is_completed is False


# ---------------------------------------------------------
# 2. Progress Percentage & Multiple Lectures
# ---------------------------------------------------------

def test_service_progress_percentage_calculation(db_session):
    instructor = create_test_user(db_session, "prog_inst_4@test.com", role="instructor")
    learner = create_test_user(db_session, "prog_lrn_4@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Percentage Course")
    section = create_test_section(db_session, course.id, "Section 1")

    lec1 = create_test_lecture(db_session, section.id, "L1", order_index=0)
    lec2 = create_test_lecture(db_session, section.id, "L2", order_index=1)
    lec3 = create_test_lecture(db_session, section.id, "L3", order_index=2)
    lec4 = create_test_lecture(db_session, section.id, "L4", order_index=3)
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    # 0 / 4 -> 0.0%
    p0 = progress_service.get_course_progress(db_session, course.id, learner)
    assert p0.total_lectures == 4
    assert p0.completed_lectures == 0
    assert p0.completion_percentage == 0.0

    # 1 / 4 -> 25.0%
    progress_service.mark_lecture_completed(db_session, lec1.id, learner)
    p1 = progress_service.get_course_progress(db_session, course.id, learner)
    assert p1.completed_lectures == 1
    assert p1.completion_percentage == 25.0

    # 2 / 4 -> 50.0%
    progress_service.mark_lecture_completed(db_session, lec2.id, learner)
    p2 = progress_service.get_course_progress(db_session, course.id, learner)
    assert p2.completed_lectures == 2
    assert p2.completion_percentage == 50.0

    # 3 / 4 -> 75.0%
    progress_service.mark_lecture_completed(db_session, lec3.id, learner)
    p3 = progress_service.get_course_progress(db_session, course.id, learner)
    assert p3.completed_lectures == 3
    assert p3.completion_percentage == 75.0

    # 4 / 4 -> 100.0%
    progress_service.mark_lecture_completed(db_session, lec4.id, learner)
    p4 = progress_service.get_course_progress(db_session, course.id, learner)
    assert p4.completed_lectures == 4
    assert p4.completion_percentage == 100.0
    assert p4.is_completed is True


# ---------------------------------------------------------
# 3. Multiple Sections & Chronological Curriculum Ordering
# ---------------------------------------------------------

def test_service_multiple_sections_and_lecture_ordering(db_session):
    instructor = create_test_user(db_session, "prog_inst_5@test.com", role="instructor")
    learner = create_test_user(db_session, "prog_lrn_5@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Multi Section Course")

    sec1 = create_test_section(db_session, course.id, "Section 1", order_index=1)
    sec2 = create_test_section(db_session, course.id, "Section 2", order_index=2)

    lec1_1 = create_test_lecture(db_session, sec1.id, "L1.1", order_index=1)
    lec1_2 = create_test_lecture(db_session, sec1.id, "L1.2", order_index=2)
    lec2_1 = create_test_lecture(db_session, sec2.id, "L2.1", order_index=1)
    lec2_2 = create_test_lecture(db_session, sec2.id, "L2.2", order_index=2)

    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    # Mark L1.1 and L2.1 complete (skipping L1.2)
    progress_service.mark_lecture_completed(db_session, lec1_1.id, learner)
    progress_service.mark_lecture_completed(db_session, lec2_1.id, learner)

    progress = progress_service.get_course_progress(db_session, course.id, learner)
    assert progress.total_lectures == 4
    assert progress.completed_lectures == 2
    assert progress.completion_percentage == 50.0

    # Next incomplete lecture must be L1.2 (because Section 1 precedes Section 2)
    assert progress.next_lecture_id == lec1_2.id


def test_service_identifying_next_incomplete_lecture_progression(db_session):
    instructor = create_test_user(db_session, "prog_inst_6@test.com", role="instructor")
    learner = create_test_user(db_session, "prog_lrn_6@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Resume Course")
    sec = create_test_section(db_session, course.id, "Section A", order_index=0)

    l1 = create_test_lecture(db_session, sec.id, "First", order_index=0)
    l2 = create_test_lecture(db_session, sec.id, "Second", order_index=1)
    l3 = create_test_lecture(db_session, sec.id, "Third", order_index=2)

    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    # Initial next lecture is l1
    assert progress_service.get_next_incomplete_lecture(db_session, course.id, learner) == l1.id

    progress_service.mark_lecture_completed(db_session, l1.id, learner)
    assert progress_service.get_next_incomplete_lecture(db_session, course.id, learner) == l2.id

    progress_service.mark_lecture_completed(db_session, l2.id, learner)
    assert progress_service.get_next_incomplete_lecture(db_session, course.id, learner) == l3.id

    progress_service.mark_lecture_completed(db_session, l3.id, learner)
    assert progress_service.get_next_incomplete_lecture(db_session, course.id, learner) is None


# ---------------------------------------------------------
# 4. Course Completion & Enrollment Status Sync
# ---------------------------------------------------------

def test_service_course_completion_updates_enrollment_status(db_session):
    instructor = create_test_user(db_session, "prog_inst_7@test.com", role="instructor")
    learner = create_test_user(db_session, "prog_lrn_7@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Completion Course")
    sec = create_test_section(db_session, course.id, "Section 1", order_index=0)
    l1 = create_test_lecture(db_session, sec.id, "L1", order_index=0)
    l2 = create_test_lecture(db_session, sec.id, "L2", order_index=1)
    enrollment = enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    assert enrollment.status == "ACTIVE"
    assert enrollment.completed_at is None

    # Complete first lecture -> still ACTIVE
    progress_service.mark_lecture_completed(db_session, l1.id, learner)
    db_session.refresh(enrollment)
    assert enrollment.status == "ACTIVE"
    assert enrollment.completed_at is None

    # Complete all lectures -> status becomes COMPLETED, completed_at set
    progress_service.mark_lecture_completed(db_session, l2.id, learner)
    db_session.refresh(enrollment)
    assert enrollment.status == "COMPLETED"
    assert enrollment.completed_at is not None

    # Unmark a lecture -> status reverts to ACTIVE, completed_at cleared
    progress_service.mark_lecture_incomplete(db_session, l1.id, learner)
    db_session.refresh(enrollment)
    assert enrollment.status == "ACTIVE"
    assert enrollment.completed_at is None


# ---------------------------------------------------------
# 5. Edge Cases: Courses with Zero Lectures
# ---------------------------------------------------------

def test_service_course_with_zero_lectures_safe(db_session):
    instructor = create_test_user(db_session, "prog_inst_8@test.com", role="instructor")
    learner = create_test_user(db_session, "prog_lrn_8@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Empty Course")
    create_test_section(db_session, course.id, "Empty Section")
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    prog = progress_service.get_course_progress(db_session, course.id, learner)
    assert prog.total_lectures == 0
    assert prog.completed_lectures == 0
    assert prog.completion_percentage == 0.0
    assert prog.completed_lecture_ids == []
    assert prog.next_lecture_id is None
    assert prog.is_completed is False


# ---------------------------------------------------------
# 6. Security: Non-Enrolled & Inactive Enrollments
# ---------------------------------------------------------

def test_service_learner_without_enrollment_rejected(db_session):
    instructor = create_test_user(db_session, "prog_inst_9@test.com", role="instructor")
    learner = create_test_user(db_session, "prog_lrn_9@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Unenrolled Course")
    sec = create_test_section(db_session, course.id, "Sec")
    lec = create_test_lecture(db_session, sec.id, "Lec")

    # Marking progress without enrollment raises 403
    with pytest.raises(HTTPException) as exc:
        progress_service.mark_lecture_completed(db_session, lec.id, learner)
    assert exc.value.status_code == 403
    assert "not enrolled" in exc.value.detail.lower()

    # Retrieving progress without enrollment raises 404
    with pytest.raises(HTTPException) as exc2:
        progress_service.get_course_progress(db_session, course.id, learner)
    assert exc2.value.status_code == 404
    assert "enrollment not found" in exc2.value.detail.lower()


def test_service_inactive_enrollment_rejected(db_session):
    instructor = create_test_user(db_session, "prog_inst_10@test.com", role="instructor")
    learner = create_test_user(db_session, "prog_lrn_10@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Dropped Course")
    sec = create_test_section(db_session, course.id, "Sec")
    lec = create_test_lecture(db_session, sec.id, "Lec")
    enroll_test_user(db_session, learner.id, course.id, status="DROPPED")

    with pytest.raises(HTTPException) as exc:
        progress_service.mark_lecture_completed(db_session, lec.id, learner)
    assert exc.value.status_code == 403
    assert "not eligible" in exc.value.detail.lower()

    with pytest.raises(HTTPException) as exc2:
        progress_service.get_course_progress(db_session, course.id, learner)
    assert exc2.value.status_code == 403
    assert "not eligible" in exc2.value.detail.lower()


# ---------------------------------------------------------
# 7. Cross-Course & Cross-Learner Isolation
# ---------------------------------------------------------

def test_service_lecture_belonging_to_another_course_rejected(db_session):
    instructor = create_test_user(db_session, "prog_inst_11@test.com", role="instructor")
    learner = create_test_user(db_session, "prog_lrn_11@test.com", role="learner")

    course_a = create_test_course(db_session, instructor.id, "Course A")
    sec_a = create_test_section(db_session, course_a.id, "Sec A")
    lec_a = create_test_lecture(db_session, sec_a.id, "Lec A")

    course_b = create_test_course(db_session, instructor.id, "Course B")
    sec_b = create_test_section(db_session, course_b.id, "Sec B")
    lec_b = create_test_lecture(db_session, sec_b.id, "Lec B")

    # Learner enrolls ONLY in Course A
    enroll_test_user(db_session, learner.id, course_a.id, status="ACTIVE")

    # Attempting to mark Lec B (belongs to Course B) raises 403
    with pytest.raises(HTTPException) as exc:
        progress_service.mark_lecture_completed(db_session, lec_b.id, learner)
    assert exc.value.status_code == 403

    # Direct validation helper raises 400
    with pytest.raises(HTTPException) as exc2:
        progress_service.validate_lecture_in_course(db_session, lec_b.id, course_a.id)
    assert exc2.value.status_code == 400
    assert "does not belong to course" in exc2.value.detail.lower()


def test_service_learner_cannot_access_another_learner_progress(db_session):
    instructor = create_test_user(db_session, "prog_inst_12@test.com", role="instructor")
    learner1 = create_test_user(db_session, "prog_lrn_12a@test.com", role="learner")
    learner2 = create_test_user(db_session, "prog_lrn_12b@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Shared Course")
    enroll_test_user(db_session, learner1.id, course.id, status="ACTIVE")
    enroll_test_user(db_session, learner2.id, course.id, status="ACTIVE")

    with pytest.raises(HTTPException) as exc:
        progress_service.get_course_progress(
            db_session,
            course.id,
            current_user=learner1,
            target_user_id=learner2.id,
        )
    assert exc.value.status_code == 403
    assert "cannot view another learner's progress" in exc.value.detail.lower()


def test_service_instructor_and_super_admin_access_rules(db_session):
    instructor1 = create_test_user(db_session, "prog_inst_13a@test.com", role="instructor")
    instructor2 = create_test_user(db_session, "prog_inst_13b@test.com", role="instructor")
    super_admin = create_test_user(db_session, "prog_admin_13@test.com", role="super_admin")
    learner = create_test_user(db_session, "prog_lrn_13@test.com", role="learner")

    course = create_test_course(db_session, instructor1.id, "Instructor Course")
    sec = create_test_section(db_session, course.id, "Sec")
    create_test_lecture(db_session, sec.id, "Lec")
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    # Unassigned instructor cannot view learner's progress -> 403
    with pytest.raises(HTTPException) as exc:
        progress_service.get_course_progress(
            db_session,
            course.id,
            current_user=instructor2,
            target_user_id=learner.id,
        )
    assert exc.value.status_code == 403
    assert "only view progress for their own courses" in exc.value.detail.lower()

    # Course owner instructor CAN view learner's progress
    inst_prog = progress_service.get_course_progress(
        db_session,
        course.id,
        current_user=instructor1,
        target_user_id=learner.id,
    )
    assert inst_prog.course_id == course.id

    # Super Admin CAN view learner's progress
    admin_prog = progress_service.get_course_progress(
        db_session,
        course.id,
        current_user=super_admin,
        target_user_id=learner.id,
    )
    assert admin_prog.course_id == course.id

    # Instructor without target_user_id raises 400
    with pytest.raises(HTTPException) as exc2:
        progress_service.get_course_progress(
            db_session,
            course.id,
            current_user=instructor1,
            target_user_id=None,
        )
    assert exc2.value.status_code == 400


def test_service_non_learner_cannot_modify_progress(db_session):
    instructor = create_test_user(db_session, "prog_inst_14@test.com", role="instructor")
    super_admin = create_test_user(db_session, "prog_admin_14@test.com", role="super_admin")
    course = create_test_course(db_session, instructor.id, "Role Course")
    sec = create_test_section(db_session, course.id, "Sec")
    lec = create_test_lecture(db_session, sec.id, "Lec")

    # Instructor cannot modify progress
    with pytest.raises(HTTPException) as exc:
        progress_service.mark_lecture_completed(db_session, lec.id, instructor)
    assert exc.value.status_code == 403
    assert "only learners can track learning progress" in exc.value.detail.lower()

    # Super Admin cannot modify progress
    with pytest.raises(HTTPException) as exc2:
        progress_service.mark_lecture_completed(db_session, lec.id, super_admin)
    assert exc2.value.status_code == 403


# ---------------------------------------------------------
# 8. Unrelated Courses Isolation (Req K)
# ---------------------------------------------------------

def test_service_avoid_counting_lectures_from_unrelated_courses(db_session):
    instructor = create_test_user(db_session, "prog_inst_15@test.com", role="instructor")
    learner = create_test_user(db_session, "prog_lrn_15@test.com", role="learner")

    course_a = create_test_course(db_session, instructor.id, "Course Alpha")
    sec_a = create_test_section(db_session, course_a.id, "Sec A")
    lec_a = create_test_lecture(db_session, sec_a.id, "Lec A")

    course_b = create_test_course(db_session, instructor.id, "Course Beta")
    sec_b = create_test_section(db_session, course_b.id, "Sec B")
    lec_b1 = create_test_lecture(db_session, sec_b.id, "Lec B1", order_index=0)
    lec_b2 = create_test_lecture(db_session, sec_b.id, "Lec B2", order_index=1)

    enroll_test_user(db_session, learner.id, course_a.id, status="ACTIVE")
    enroll_test_user(db_session, learner.id, course_b.id, status="ACTIVE")

    # Complete Course B's lectures
    progress_service.mark_lecture_completed(db_session, lec_b1.id, learner)
    progress_service.mark_lecture_completed(db_session, lec_b2.id, learner)

    # Progress on Course A must remain 0 / 1 (0.0%)
    prog_a = progress_service.get_course_progress(db_session, course_a.id, learner)
    assert prog_a.total_lectures == 1
    assert prog_a.completed_lectures == 0
    assert prog_a.completion_percentage == 0.0
    assert prog_a.completed_lecture_ids == []
    assert prog_a.next_lecture_id == lec_a.id


# ---------------------------------------------------------
# 9. Multi-Course Learner Progress Overview Summary
# ---------------------------------------------------------

def test_service_multiple_enrolled_courses_summary(db_session):
    instructor = create_test_user(db_session, "prog_inst_16@test.com", role="instructor")
    learner = create_test_user(db_session, "prog_lrn_16@test.com", role="learner")

    # Course 1: 2 lectures, 1 completed -> 50%
    c1 = create_test_course(db_session, instructor.id, "Python Foundation")
    s1 = create_test_section(db_session, c1.id, "S1")
    l1_1 = create_test_lecture(db_session, s1.id, "L1.1", order_index=0)
    create_test_lecture(db_session, s1.id, "L1.2", order_index=1)
    enroll_test_user(db_session, learner.id, c1.id, status="ACTIVE")
    progress_service.mark_lecture_completed(db_session, l1_1.id, learner)

    # Course 2: 1 lecture, 1 completed -> 100%
    c2 = create_test_course(db_session, instructor.id, "FastAPI Essentials")
    s2 = create_test_section(db_session, c2.id, "S2")
    l2_1 = create_test_lecture(db_session, s2.id, "L2.1", order_index=0)
    enroll_test_user(db_session, learner.id, c2.id, status="ACTIVE")
    progress_service.mark_lecture_completed(db_session, l2_1.id, learner)

    overview = progress_service.get_learner_progress_summary(db_session, learner)
    assert overview.total_enrolled_courses == 2
    assert overview.completed_courses == 1
    assert overview.in_progress_courses == 1

    course_map = {item.course_id: item for item in overview.courses}
    assert course_map[c1.id].completion_percentage == 50.0
    assert course_map[c1.id].is_completed is False
    assert course_map[c2.id].completion_percentage == 100.0
    assert course_map[c2.id].is_completed is True


def test_service_get_completed_lectures_convenience(db_session):
    instructor = create_test_user(db_session, "prog_inst_17@test.com", role="instructor")
    learner = create_test_user(db_session, "prog_lrn_17@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Convenience Course")
    sec = create_test_section(db_session, course.id, "Sec")
    l1 = create_test_lecture(db_session, sec.id, "L1", order_index=0)
    l2 = create_test_lecture(db_session, sec.id, "L2", order_index=1)
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    progress_service.mark_lecture_completed(db_session, l2.id, learner)
    progress_service.mark_lecture_completed(db_session, l1.id, learner)

    completed = progress_service.get_completed_lectures(db_session, course.id, learner)
    # Check curriculum order preserved
    assert completed == [l1.id, l2.id]


# =========================================================
# Stage 3: FastAPI API Endpoints Integration Tests
# =========================================================

from app.utils.security import create_access_token


def auth_header(user: User) -> dict:
    """Helper returning authorization header for authenticated user."""
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------
# 1. Lecture Completion & Progress Update via API
# ---------------------------------------------------------

def test_api_lecture_completion_success(client, db_session):
    instructor = create_test_user(db_session, "api_prog_inst_1@test.com", role="instructor")
    learner = create_test_user(db_session, "api_prog_lrn_1@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "API Course 1")
    sec = create_test_section(db_session, course.id, "API Section 1")
    lec = create_test_lecture(db_session, sec.id, "API Lecture 1")
    enrollment = enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    # Singular path without body (defaults to is_completed=True)
    resp = client.post(f"/api/v1/progress/lecture/{lec.id}", headers=auth_header(learner))
    assert resp.status_code == 200
    data = resp.json()
    assert data["lecture_id"] == lec.id
    assert data["enrollment_id"] == enrollment.id
    assert data["is_completed"] is True
    assert data["updated_at"] is not None

    # Plural path works identically
    resp_plural = client.post(f"/api/v1/progress/lectures/{lec.id}", headers=auth_header(learner))
    assert resp_plural.status_code == 200
    assert resp_plural.json()["is_completed"] is True

    # Trailing slash route
    resp_slash = client.post(f"/api/v1/progress/lecture/{lec.id}/", headers=auth_header(learner))
    assert resp_slash.status_code == 200


def test_api_mark_lecture_incomplete(client, db_session):
    instructor = create_test_user(db_session, "api_prog_inst_2@test.com", role="instructor")
    learner = create_test_user(db_session, "api_prog_lrn_2@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "API Course 2")
    sec = create_test_section(db_session, course.id, "Sec")
    lec = create_test_lecture(db_session, sec.id, "Lec")
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    # Mark completed
    client.post(f"/api/v1/progress/lecture/{lec.id}", headers=auth_header(learner))

    # Mark incomplete
    resp = client.post(
        f"/api/v1/progress/lecture/{lec.id}",
        json={"is_completed": False},
        headers=auth_header(learner),
    )
    assert resp.status_code == 200
    assert resp.json()["is_completed"] is False

    # Check course progress
    prog_resp = client.get(f"/api/v1/progress/{course.id}", headers=auth_header(learner))
    assert prog_resp.status_code == 200
    assert prog_resp.json()["completed_lectures"] == 0
    assert prog_resp.json()["completion_percentage"] == 0.0


def test_api_repeated_completion_requests_idempotent(client, db_session):
    instructor = create_test_user(db_session, "api_prog_inst_3@test.com", role="instructor")
    learner = create_test_user(db_session, "api_prog_lrn_3@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "API Course 3")
    sec = create_test_section(db_session, course.id, "Sec")
    lec = create_test_lecture(db_session, sec.id, "Lec")
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    resp1 = client.post(f"/api/v1/progress/lecture/{lec.id}", headers=auth_header(learner))
    resp2 = client.post(f"/api/v1/progress/lecture/{lec.id}", headers=auth_header(learner))
    resp3 = client.post(f"/api/v1/progress/lectures/{lec.id}", headers=auth_header(learner))

    assert resp1.status_code == resp2.status_code == resp3.status_code == 200
    assert resp1.json()["id"] == resp2.json()["id"] == resp3.json()["id"]

    # Verify directly in DB: only 1 record
    count = db_session.query(Progress).filter(Progress.lecture_id == lec.id).count()
    assert count == 1


# ---------------------------------------------------------
# 2. Retrieving Course Progress via API
# ---------------------------------------------------------

def test_api_get_course_progress_learner(client, db_session):
    instructor = create_test_user(db_session, "api_prog_inst_4@test.com", role="instructor")
    learner = create_test_user(db_session, "api_prog_lrn_4@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "API Course 4")
    sec = create_test_section(db_session, course.id, "Sec")
    l1 = create_test_lecture(db_session, sec.id, "L1", order_index=0)
    l2 = create_test_lecture(db_session, sec.id, "L2", order_index=1)
    l3 = create_test_lecture(db_session, sec.id, "L3", order_index=2)
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    # Complete l1 and l2
    client.post(f"/api/v1/progress/lecture/{l1.id}", headers=auth_header(learner))
    client.post(f"/api/v1/progress/lecture/{l2.id}", headers=auth_header(learner))

    resp = client.get(f"/api/v1/progress/{course.id}", headers=auth_header(learner))
    assert resp.status_code == 200
    data = resp.json()
    assert data["course_id"] == course.id
    assert data["total_lectures"] == 3
    assert data["completed_lectures"] == 2
    assert data["completion_percentage"] == 66.67
    assert data["next_lecture_id"] == l3.id
    assert data["is_completed"] is False
    assert set(data["completed_lecture_ids"]) == {l1.id, l2.id}

    # Trailing slash route
    resp_slash = client.get(f"/api/v1/progress/{course.id}/", headers=auth_header(learner))
    assert resp_slash.status_code == 200


# ---------------------------------------------------------
# 3. Learner Progress Overview (/my)
# ---------------------------------------------------------

def test_api_get_my_progress_overview(client, db_session):
    instructor = create_test_user(db_session, "api_prog_inst_5@test.com", role="instructor")
    learner = create_test_user(db_session, "api_prog_lrn_5@test.com", role="learner")

    # Course A: 1 lecture, completed (100%)
    cA = create_test_course(db_session, instructor.id, "API Overview Course A")
    sA = create_test_section(db_session, cA.id, "Sec A")
    lA = create_test_lecture(db_session, sA.id, "Lec A")
    enroll_test_user(db_session, learner.id, cA.id, status="ACTIVE")
    client.post(f"/api/v1/progress/lecture/{lA.id}", headers=auth_header(learner))

    # Course B: 2 lectures, 1 completed (50%)
    cB = create_test_course(db_session, instructor.id, "API Overview Course B")
    sB = create_test_section(db_session, cB.id, "Sec B")
    lB1 = create_test_lecture(db_session, sB.id, "Lec B1", order_index=0)
    create_test_lecture(db_session, sB.id, "Lec B2", order_index=1)
    enroll_test_user(db_session, learner.id, cB.id, status="ACTIVE")
    client.post(f"/api/v1/progress/lecture/{lB1.id}", headers=auth_header(learner))

    resp = client.get("/api/v1/progress/my", headers=auth_header(learner))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_enrolled_courses"] == 2
    assert data["completed_courses"] == 1
    assert data["in_progress_courses"] == 1
    assert len(data["courses"]) == 2

    # Trailing slash route
    resp_slash = client.get("/api/v1/progress/my/", headers=auth_header(learner))
    assert resp_slash.status_code == 200


# ---------------------------------------------------------
# 4. Resume Learning Navigation (/{course_id}/resume)
# ---------------------------------------------------------

def test_api_get_next_incomplete_lecture_resume(client, db_session):
    instructor = create_test_user(db_session, "api_prog_inst_6@test.com", role="instructor")
    learner = create_test_user(db_session, "api_prog_lrn_6@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "API Resume Course")
    sec = create_test_section(db_session, course.id, "Sec")
    l1 = create_test_lecture(db_session, sec.id, "L1", order_index=0)
    l2 = create_test_lecture(db_session, sec.id, "L2", order_index=1)
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    # Initial state: next is l1
    r1 = client.get(f"/api/v1/progress/{course.id}/resume", headers=auth_header(learner))
    assert r1.status_code == 200
    assert r1.json()["course_id"] == course.id
    assert r1.json()["next_lecture_id"] == l1.id

    # Complete l1: next is l2
    client.post(f"/api/v1/progress/lecture/{l1.id}", headers=auth_header(learner))
    r2 = client.get(f"/api/v1/progress/{course.id}/resume", headers=auth_header(learner))
    assert r2.status_code == 200
    assert r2.json()["next_lecture_id"] == l2.id

    # Complete l2: next is null
    client.post(f"/api/v1/progress/lecture/{l2.id}", headers=auth_header(learner))
    r3 = client.get(f"/api/v1/progress/{course.id}/resume", headers=auth_header(learner))
    assert r3.status_code == 200
    assert r3.json()["next_lecture_id"] is None

    # Trailing slash route
    r_slash = client.get(f"/api/v1/progress/{course.id}/resume/", headers=auth_header(learner))
    assert r_slash.status_code == 200


# ---------------------------------------------------------
# 5. Security: Authentication & Role Rejections
# ---------------------------------------------------------

def test_api_unauthenticated_requests_rejected(client):
    # No auth header -> 401 Unauthorized
    assert client.post("/api/v1/progress/lecture/dummy-id").status_code == 401
    assert client.get("/api/v1/progress/my").status_code == 401
    assert client.get("/api/v1/progress/dummy-course").status_code == 401
    assert client.get("/api/v1/progress/dummy-course/resume").status_code == 401


def test_api_invalid_user_roles(client, db_session):
    instructor = create_test_user(db_session, "api_prog_inst_7@test.com", role="instructor")
    super_admin = create_test_user(db_session, "api_prog_admin_7@test.com", role="super_admin")
    course = create_test_course(db_session, instructor.id, "API Role Course")
    sec = create_test_section(db_session, course.id, "Sec")
    lec = create_test_lecture(db_session, sec.id, "Lec")

    # Instructors cannot modify progress -> 403
    resp_inst = client.post(f"/api/v1/progress/lecture/{lec.id}", headers=auth_header(instructor))
    assert resp_inst.status_code == 403
    assert "only learners can track learning progress" in resp_inst.json()["detail"].lower()

    # Super admin cannot modify progress -> 403
    resp_admin = client.post(f"/api/v1/progress/lecture/{lec.id}", headers=auth_header(super_admin))
    assert resp_admin.status_code == 403

    # Instructor calling /my overview -> 403
    assert client.get("/api/v1/progress/my", headers=auth_header(instructor)).status_code == 403


def test_api_learner_cannot_access_other_learner_progress(client, db_session):
    instructor = create_test_user(db_session, "api_prog_inst_8@test.com", role="instructor")
    l1 = create_test_user(db_session, "api_prog_lrn_8a@test.com", role="learner")
    l2 = create_test_user(db_session, "api_prog_lrn_8b@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Shared Course API")
    enroll_test_user(db_session, l1.id, course.id, status="ACTIVE")
    enroll_test_user(db_session, l2.id, course.id, status="ACTIVE")

    # Learner 1 specifies l2's user_id -> 403 Forbidden
    resp = client.get(
        f"/api/v1/progress/{course.id}?user_id={l2.id}",
        headers=auth_header(l1),
    )
    assert resp.status_code == 403
    assert "cannot view another learner's progress" in resp.json()["detail"].lower()


def test_api_instructor_cross_course_access_rejected(client, db_session):
    inst1 = create_test_user(db_session, "api_prog_inst_9a@test.com", role="instructor")
    inst2 = create_test_user(db_session, "api_prog_inst_9b@test.com", role="instructor")
    learner = create_test_user(db_session, "api_prog_lrn_9@test.com", role="learner")

    course1 = create_test_course(db_session, inst1.id, "Course 1 Managed by Inst1")
    sec = create_test_section(db_session, course1.id, "Sec")
    create_test_lecture(db_session, sec.id, "Lec")
    enroll_test_user(db_session, learner.id, course1.id, status="ACTIVE")

    # Inst2 does NOT own Course 1 -> 403 Forbidden
    resp_forbidden = client.get(
        f"/api/v1/progress/{course1.id}?user_id={learner.id}",
        headers=auth_header(inst2),
    )
    assert resp_forbidden.status_code == 403
    assert "only view progress for their own courses" in resp_forbidden.json()["detail"].lower()

    # Inst1 owns Course 1 -> 200 OK
    resp_ok = client.get(
        f"/api/v1/progress/{course1.id}?user_id={learner.id}",
        headers=auth_header(inst1),
    )
    assert resp_ok.status_code == 200
    assert resp_ok.json()["course_id"] == course1.id


# ---------------------------------------------------------
# 6. Missing Resources & Zero-Lecture Edge Cases
# ---------------------------------------------------------

def test_api_missing_course_or_lecture_returns_404(client, db_session):
    learner = create_test_user(db_session, "api_prog_lrn_10@test.com", role="learner")

    # Non-existent lecture -> 404
    resp_lec = client.post("/api/v1/progress/lecture/fake-lecture-uuid", headers=auth_header(learner))
    assert resp_lec.status_code == 404

    # Non-existent course -> 404
    resp_crs = client.get("/api/v1/progress/fake-course-uuid", headers=auth_header(learner))
    assert resp_crs.status_code == 404

    # Non-existent course resume -> 404
    resp_res = client.get("/api/v1/progress/fake-course-uuid/resume", headers=auth_header(learner))
    assert resp_res.status_code == 404


def test_api_course_with_zero_lectures(client, db_session):
    instructor = create_test_user(db_session, "api_prog_inst_11@test.com", role="instructor")
    learner = create_test_user(db_session, "api_prog_lrn_11@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "API Zero Lecture Course")
    create_test_section(db_session, course.id, "Empty Sec")
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    # Course progress returns 0.0% safely
    resp = client.get(f"/api/v1/progress/{course.id}", headers=auth_header(learner))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_lectures"] == 0
    assert data["completed_lectures"] == 0
    assert data["completion_percentage"] == 0.0
    assert data["is_completed"] is False
    assert data["next_lecture_id"] is None

    # Resume endpoint returns null next_lecture_id
    resp_res = client.get(f"/api/v1/progress/{course.id}/resume", headers=auth_header(learner))
    assert resp_res.status_code == 200
    assert resp_res.json()["next_lecture_id"] is None


# ---------------------------------------------------------
# 7. Routing Conflict Resolution & Payload Validation
# ---------------------------------------------------------

def test_api_route_conflict_resolution(client, db_session):
    """
    Ensure /my does NOT match /{course_id} where course_id='my'.
    """
    instructor = create_test_user(db_session, "api_prog_inst_12@test.com", role="instructor")
    learner = create_test_user(db_session, "api_prog_lrn_12@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Route Course")
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    # /my returns summary overview (200), not a 404 Course not found
    resp_my = client.get("/api/v1/progress/my", headers=auth_header(learner))
    assert resp_my.status_code == 200
    assert "total_enrolled_courses" in resp_my.json()

    # /{course_id}/resume resolves to resume endpoint, not {course_id}
    resp_res = client.get(f"/api/v1/progress/{course.id}/resume", headers=auth_header(learner))
    assert resp_res.status_code == 200
    assert "next_lecture_id" in resp_res.json()


def test_api_invalid_payload_validation_error(client, db_session):
    learner = create_test_user(db_session, "api_prog_lrn_13@test.com", role="learner")

    # Sending invalid boolean type in payload returns 422 Unprocessable Entity
    resp = client.post(
        "/api/v1/progress/lecture/some-id",
        json={"is_completed": "not-a-bool"},
        headers=auth_header(learner),
    )
    assert resp.status_code == 422
