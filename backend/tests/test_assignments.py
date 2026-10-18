import pytest
from datetime import datetime, timezone
from pydantic import ValidationError

from app.schemas.assignment import (
    AssignmentBase,
    AssignmentCreate,
    AssignmentUpdate,
    AssignmentResponse,
    AssignmentDetailResponse,
    AssignmentLearnerDetailResponse,
    SubmissionBase,
    SubmissionCreate,
    SubmissionGrade,
    SubmissionUpdate,
    SubmissionResponse,
    SubmissionDetailResponse,
)


# ---------------------------------------------------------
# Existing Router Mount Test
# ---------------------------------------------------------

def test_assignments_router_mounted(client):
    response = client.get("/api/v1/assignments/")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "assignments"
    assert "description" in data


# ---------------------------------------------------------
# Assignment Schema Tests
# ---------------------------------------------------------

def test_assignment_create_valid_all_fields():
    now = datetime.now(timezone.utc)
    assignment = AssignmentCreate(
        title="  Build a REST API  ",
        instructions="Create a FastAPI project with authentication.",
        deadline=now,
        section_id="sec-101",
    )
    assert assignment.title == "Build a REST API"
    assert assignment.instructions == "Create a FastAPI project with authentication."
    assert assignment.deadline == now
    assert assignment.section_id == "sec-101"


def test_assignment_create_valid_minimal():
    assignment = AssignmentCreate(title="Introductory Exercise")
    assert assignment.title == "Introductory Exercise"
    assert assignment.instructions is None
    assert assignment.deadline is None
    assert assignment.section_id is None


def test_assignment_create_missing_required_title():
    with pytest.raises(ValidationError):
        AssignmentCreate()


def test_assignment_create_empty_or_whitespace_title():
    with pytest.raises(ValidationError) as exc:
        AssignmentCreate(title="")
    assert "Assignment title cannot be empty" in str(exc.value)

    with pytest.raises(ValidationError) as exc:
        AssignmentCreate(title="    ")
    assert "Assignment title cannot be empty" in str(exc.value)


def test_assignment_create_title_too_long():
    long_title = "A" * 256
    with pytest.raises(ValidationError) as exc:
        AssignmentCreate(title=long_title)
    assert "Assignment title cannot exceed 255 characters" in str(exc.value)


def test_assignment_create_instructions_and_section_id_handling():
    # Whitespace instructions stripped, or empty becomes None
    assignment = AssignmentCreate(title="Task", instructions="   Some guide   ", section_id="   sec-202   ")
    assert assignment.instructions == "Some guide"
    assert assignment.section_id == "sec-202"

    assignment_empty = AssignmentCreate(title="Task", instructions="   ", section_id="   ")
    assert assignment_empty.instructions is None
    assert assignment_empty.section_id is None


def test_assignment_update_valid_partial():
    # Update title only
    up_title = AssignmentUpdate(title="Revised Title")
    assert up_title.title == "Revised Title"
    assert up_title.instructions is None
    assert up_title.deadline is None

    # Update instructions only
    up_inst = AssignmentUpdate(instructions="New instructions here")
    assert up_inst.title is None
    assert up_inst.instructions == "New instructions here"

    # Update deadline only
    now = datetime.now(timezone.utc)
    up_deadline = AssignmentUpdate(deadline=now)
    assert up_deadline.deadline == now
    assert up_deadline.title is None

    # Empty update object
    up_empty = AssignmentUpdate()
    assert up_empty.title is None
    assert up_empty.instructions is None
    assert up_empty.deadline is None


def test_assignment_update_invalid_fields():
    with pytest.raises(ValidationError) as exc:
        AssignmentUpdate(title="")
    assert "Assignment title cannot be empty" in str(exc.value)

    with pytest.raises(ValidationError) as exc:
        AssignmentUpdate(title="   ")
    assert "Assignment title cannot be empty" in str(exc.value)

    with pytest.raises(ValidationError) as exc:
        AssignmentUpdate(title="B" * 256)
    assert "Assignment title cannot exceed 255 characters" in str(exc.value)


# ---------------------------------------------------------
# Submission Schema Tests
# ---------------------------------------------------------

def test_submission_create_valid_urls():
    valid_urls = [
        "https://github.com/student/udemy-project",
        "http://example.com/deliverables/solution.zip",
        "https://drive.google.com/file/d/12345/view?usp=sharing",
        "https://gitlab.com/group/repo/-/archive/main/repo.tar.gz#readme",
        "  https://sub.domain.org/path/to/submission  ",
    ]
    for url in valid_urls:
        sub = SubmissionCreate(submission_url=url, assignment_id="asg-555")
        assert sub.submission_url == url.strip()
        assert sub.assignment_id == "asg-555"

    # Without assignment_id
    sub_no_asg = SubmissionCreate(submission_url="https://github.com/code")
    assert sub_no_asg.assignment_id is None


def test_submission_create_invalid_urls():
    invalid_urls = [
        "",
        "   ",
        "not-a-url",
        "ftp://ftp.example.com/file.zip",
        "mailto:student@example.com",
        "javascript:alert('xss')",
        "https://",
        "http://",
        "://missing-scheme.com",
    ]
    for url in invalid_urls:
        with pytest.raises(ValidationError):
            SubmissionCreate(submission_url=url)

    # Missing submission_url entirely
    with pytest.raises(ValidationError):
        SubmissionCreate()


def test_submission_grade_valid():
    valid_grades = [
        "A+",
        "A",
        "B-",
        "Pass",
        "Fail",
        "100",
        "85/100",
        "92.5%",
        "Satisfactory",
        "X" * 32,  # Exactly 32 characters
        "  A  ",   # Strips whitespace
    ]
    for g in valid_grades:
        grade_obj = SubmissionGrade(grade=g)
        assert grade_obj.grade == g.strip()


def test_submission_grade_invalid():
    # Empty / whitespace
    with pytest.raises(ValidationError) as exc:
        SubmissionGrade(grade="")
    assert "Grade cannot be empty" in str(exc.value)

    with pytest.raises(ValidationError) as exc:
        SubmissionGrade(grade="   ")
    assert "Grade cannot be empty" in str(exc.value)

    # Too long (> 32 characters)
    with pytest.raises(ValidationError) as exc:
        SubmissionGrade(grade="G" * 33)
    assert "Grade cannot exceed 32 characters" in str(exc.value)

    # Missing grade
    with pytest.raises(ValidationError):
        SubmissionGrade()


def test_submission_update_valid_and_invalid():
    # Valid partial update
    up1 = SubmissionUpdate(submission_url="https://github.com/updated")
    assert up1.submission_url == "https://github.com/updated"
    assert up1.grade is None

    up2 = SubmissionUpdate(grade="A")
    assert up2.grade == "A"
    assert up2.submission_url is None

    up_empty = SubmissionUpdate()
    assert up_empty.submission_url is None
    assert up_empty.grade is None

    # Invalid URL in update
    with pytest.raises(ValidationError):
        SubmissionUpdate(submission_url="invalid-url")

    # Invalid Grade in update
    with pytest.raises(ValidationError):
        SubmissionUpdate(grade="G" * 33)


# ---------------------------------------------------------
# Response Schema Serialization Tests
# ---------------------------------------------------------

def test_assignment_response_serialization():
    now = datetime.now(timezone.utc)
    data = {
        "id": "asg-001",
        "section_id": "sec-001",
        "title": "Database Normalization",
        "instructions": "Normalize the given tables to 3NF.",
        "deadline": now,
        "created_at": now,
    }
    resp = AssignmentResponse(**data)
    assert resp.id == "asg-001"
    assert resp.section_id == "sec-001"
    assert resp.title == "Database Normalization"
    assert resp.instructions == "Normalize the given tables to 3NF."
    assert resp.deadline == now
    assert resp.created_at == now

    dumped = resp.model_dump()
    assert dumped["id"] == "asg-001"
    assert dumped["section_id"] == "sec-001"


def test_submission_response_serialization():
    now = datetime.now(timezone.utc)
    data = {
        "id": "sub-001",
        "assignment_id": "asg-001",
        "user_id": "usr-001",
        "submission_url": "https://github.com/student/normalization",
        "grade": "95/100",
        "submitted_at": now,
    }
    resp = SubmissionResponse(**data)
    assert resp.id == "sub-001"
    assert resp.assignment_id == "asg-001"
    assert resp.user_id == "usr-001"
    assert resp.submission_url == "https://github.com/student/normalization"
    assert resp.grade == "95/100"
    assert resp.submitted_at == now


def test_assignment_detail_response_serialization():
    now = datetime.now(timezone.utc)
    asg_data = {
        "id": "asg-100",
        "section_id": "sec-100",
        "title": "Capstone Project",
        "instructions": "Full-stack application.",
        "deadline": now,
        "created_at": now,
        "submissions": [
            {
                "id": "sub-1",
                "assignment_id": "asg-100",
                "user_id": "usr-1",
                "submission_url": "https://github.com/usr1/capstone",
                "grade": "Pass",
                "submitted_at": now,
            },
            {
                "id": "sub-2",
                "assignment_id": "asg-100",
                "user_id": "usr-2",
                "submission_url": "https://github.com/usr2/capstone",
                "grade": None,
                "submitted_at": now,
            },
        ],
    }
    resp = AssignmentDetailResponse(**asg_data)
    assert resp.id == "asg-100"
    assert len(resp.submissions) == 2
    assert resp.submissions[0].grade == "Pass"
    assert resp.submissions[1].grade is None


def test_assignment_learner_detail_response_serialization():
    now = datetime.now(timezone.utc)
    asg_data = {
        "id": "asg-200",
        "section_id": "sec-200",
        "title": "CSS Flexbox Layout",
        "instructions": "Build a responsive grid layout.",
        "deadline": now,
        "created_at": now,
        "my_submission": {
            "id": "sub-201",
            "assignment_id": "asg-200",
            "user_id": "usr-learner",
            "submission_url": "https://codepen.io/demo/pen/xyz",
            "grade": "A+",
            "submitted_at": now,
        },
    }
    resp = AssignmentLearnerDetailResponse(**asg_data)
    assert resp.id == "asg-200"
    assert resp.my_submission is not None
    assert resp.my_submission.grade == "A+"
    assert resp.my_submission.user_id == "usr-learner"

    # Without my_submission
    asg_no_sub = AssignmentLearnerDetailResponse(
        id="asg-201",
        section_id="sec-200",
        title="CSS Grid Layout",
    )
    assert asg_no_sub.my_submission is None


def test_submission_detail_response_serialization():
    now = datetime.now(timezone.utc)
    data = {
        "id": "sub-301",
        "assignment_id": "asg-301",
        "user_id": "usr-301",
        "submission_url": "https://github.com/usr301/task",
        "grade": "B",
        "submitted_at": now,
        "user_name": "Alice Smith",
        "user_email": "alice@example.com",
    }
    resp = SubmissionDetailResponse(**data)
    assert resp.id == "sub-301"
    assert resp.user_name == "Alice Smith"
    assert resp.user_email == "alice@example.com"


# ---------------------------------------------------------
# Stage 2: AssignmentService Business Logic Tests
# ---------------------------------------------------------

from datetime import timedelta
from fastapi import HTTPException
from app.utils.security import get_password_hash
from app.models.user import User
from app.models.category import Category
from app.models.course import Course
from app.models.section import Section
from app.models.enrollment import Enrollment
from app.models.assignment import Assignment
from app.models.submission import Submission
from app.services.assignment_service import assignment_service


def create_test_user(db, email, role="learner", full_name="Test User"):
    user = User(
        email=email.lower().strip(),
        full_name=full_name,
        role=role,
        hashed_password=get_password_hash("Secret123!")
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_test_course(db, instructor_id, title="Assignment Course", status="PUBLISHED"):
    cat = Category(name=f"Cat-{title}", slug=f"slug-{title.lower().replace(' ', '-')[:30]}")
    db.add(cat)
    db.commit()
    db.refresh(cat)

    course = Course(
        title=title,
        instructor_id=instructor_id,
        category_id=cat.id,
        status=status
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def create_test_section(db, course_id, title="Test Section", order_index=1):
    sec = Section(course_id=course_id, title=title, order_index=order_index)
    db.add(sec)
    db.commit()
    db.refresh(sec)
    return sec


def enroll_test_user(db, user_id, course_id, status="ACTIVE"):
    enr = Enrollment(user_id=user_id, course_id=course_id, status=status)
    db.add(enr)
    db.commit()
    db.refresh(enr)
    return enr


# 1. Assignment Creation & Permissions
def test_service_create_assignment_success(db_session):
    instructor = create_test_user(db_session, "asg_inst_1@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "Course 1")
    section = create_test_section(db_session, course.id, "Section 1")

    now = datetime.now(timezone.utc) + timedelta(days=7)
    asg_in = AssignmentCreate(
        title="  Full Stack Project  ",
        instructions="Build full stack app with FastAPI.",
        deadline=now,
    )
    assignment = assignment_service.create_assignment(db_session, section.id, asg_in, instructor)
    assert assignment.id is not None
    assert assignment.title == "Full Stack Project"
    assert assignment.instructions == "Build full stack app with FastAPI."
    deadline_utc = assignment.deadline.replace(tzinfo=timezone.utc) if assignment.deadline.tzinfo is None else assignment.deadline
    assert deadline_utc == now


def test_service_create_assignment_super_admin_allowed(db_session):
    instructor = create_test_user(db_session, "asg_inst_2@test.com", role="instructor")
    super_admin = create_test_user(db_session, "asg_superadmin@test.com", role="super_admin")
    course = create_test_course(db_session, instructor.id, "Course SuperAdmin Test")
    section = create_test_section(db_session, course.id, "Section SuperAdmin")

    asg_in = AssignmentCreate(title="SuperAdmin Assignment")
    assignment = assignment_service.create_assignment(db_session, section.id, asg_in, super_admin)
    assert assignment.id is not None
    assert assignment.title == "SuperAdmin Assignment"


def test_service_create_assignment_legacy_admin_forbidden(db_session):
    instructor = create_test_user(db_session, "asg_inst_2_leg@test.com", role="instructor")
    legacy_admin = create_test_user(db_session, "asg_legacy_admin@test.com", role="admin")
    course = create_test_course(db_session, instructor.id, "Course Legacy Admin")
    section = create_test_section(db_session, course.id, "Section Legacy")

    asg_in = AssignmentCreate(title="Legacy Admin Assignment")
    with pytest.raises(HTTPException) as exc:
        assignment_service.create_assignment(db_session, section.id, asg_in, legacy_admin)
    assert exc.value.status_code == 403
    assert "Insufficient permissions" in str(exc.value.detail)


def test_service_create_assignment_learner_forbidden(db_session):
    instructor = create_test_user(db_session, "asg_inst_3@test.com", role="instructor")
    learner = create_test_user(db_session, "asg_learner_1@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Course Learner Block")
    section = create_test_section(db_session, course.id, "Section Block")

    asg_in = AssignmentCreate(title="Unauthorized Assignment")
    with pytest.raises(HTTPException) as exc:
        assignment_service.create_assignment(db_session, section.id, asg_in, learner)
    assert exc.value.status_code == 403


def test_service_create_assignment_other_instructor_forbidden(db_session):
    instructor1 = create_test_user(db_session, "asg_inst_4a@test.com", role="instructor")
    instructor2 = create_test_user(db_session, "asg_inst_4b@test.com", role="instructor")
    course = create_test_course(db_session, instructor1.id, "Course Instructor Ownership")
    section = create_test_section(db_session, course.id, "Section Ownership")

    asg_in = AssignmentCreate(title="Instructor 2 Hijack Attempt")
    with pytest.raises(HTTPException) as exc:
        assignment_service.create_assignment(db_session, section.id, asg_in, instructor2)
    assert exc.value.status_code == 403
    assert "their own courses" in str(exc.value.detail)


def test_service_create_assignment_pending_review_conflict(db_session):
    instructor = create_test_user(db_session, "asg_inst_5@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "Pending Course", status="pending_review")
    section = create_test_section(db_session, course.id, "Section Pending")

    asg_in = AssignmentCreate(title="Pending Course Assignment")
    with pytest.raises(HTTPException) as exc:
        assignment_service.create_assignment(db_session, section.id, asg_in, instructor)
    assert exc.value.status_code == 409


def test_service_create_assignment_missing_section(db_session):
    instructor = create_test_user(db_session, "asg_inst_6@test.com", role="instructor")
    asg_in = AssignmentCreate(title="Missing Section Assignment")
    with pytest.raises(HTTPException) as exc:
        assignment_service.create_assignment(db_session, "nonexistent-sec-id", asg_in, instructor)
    assert exc.value.status_code == 404


# 2. Assignment Retrieval & Listing
def test_service_get_and_list_assignments(db_session):
    instructor = create_test_user(db_session, "asg_inst_7@test.com", role="instructor")
    other_instructor = create_test_user(db_session, "asg_inst_7_other@test.com", role="instructor")
    learner = create_test_user(db_session, "asg_learner_7@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Course 7", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Section 7")

    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    asg1 = assignment_service.create_assignment(db_session, section.id, AssignmentCreate(title="Asg 1"), instructor)
    asg2 = assignment_service.create_assignment(db_session, section.id, AssignmentCreate(title="Asg 2"), instructor)

    # Instructor gets own assignment
    retrieved = assignment_service.get_assignment(db_session, asg1.id, instructor)
    assert retrieved.id == asg1.id

    # Other instructor forbidden
    with pytest.raises(HTTPException) as exc:
        assignment_service.get_assignment(db_session, asg1.id, other_instructor)
    assert exc.value.status_code == 403

    # Enrolled learner gets assignment
    learner_asg = assignment_service.get_assignment(db_session, asg1.id, learner)
    assert learner_asg.id == asg1.id

    # List assignments for section (instructor and learner)
    inst_list = assignment_service.list_assignments_for_section(db_session, section.id, instructor)
    assert len(inst_list) == 2

    learner_list = assignment_service.list_assignments_for_section(db_session, section.id, learner)
    assert len(learner_list) == 2


def test_service_learner_enrollment_and_publication_checks(db_session):
    instructor = create_test_user(db_session, "asg_inst_8@test.com", role="instructor")
    draft_course = create_test_course(db_session, instructor.id, "Draft Course", status="DRAFT")
    pub_course = create_test_course(db_session, instructor.id, "Published Course", status="PUBLISHED")

    draft_sec = create_test_section(db_session, draft_course.id, "Draft Sec")
    pub_sec = create_test_section(db_session, pub_course.id, "Pub Sec")

    draft_asg = assignment_service.create_assignment(db_session, draft_sec.id, AssignmentCreate(title="Draft Asg"), instructor)
    pub_asg = assignment_service.create_assignment(db_session, pub_sec.id, AssignmentCreate(title="Pub Asg"), instructor)

    learner = create_test_user(db_session, "asg_learner_8@test.com", role="learner")

    # 1. Enrolled in draft course -> Forbidden because unpublished
    enroll_test_user(db_session, learner.id, draft_course.id, status="ACTIVE")
    with pytest.raises(HTTPException) as exc:
        assignment_service.get_assignment(db_session, draft_asg.id, learner)
    assert exc.value.status_code == 403
    assert "unpublished course" in str(exc.value.detail)

    # 2. Not enrolled in published course -> Forbidden because not enrolled
    with pytest.raises(HTTPException) as exc:
        assignment_service.get_assignment(db_session, pub_asg.id, learner)
    assert exc.value.status_code == 403
    assert "actively enrolled" in str(exc.value.detail)


def test_service_get_assignment_detail_instructor_and_learner(db_session):
    instructor = create_test_user(db_session, "asg_inst_9@test.com", role="instructor")
    learner = create_test_user(db_session, "asg_learner_9@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Course Detail Test", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Section Detail")
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    asg = assignment_service.create_assignment(db_session, section.id, AssignmentCreate(title="Detail Task"), instructor)

    # Before submission: learner detail has my_submission = None
    detail_learner_pre = assignment_service.get_assignment_detail(db_session, asg.id, learner)
    assert detail_learner_pre.my_submission is None

    # Learner submits
    assignment_service.submit_assignment(
        db_session,
        asg.id,
        SubmissionCreate(submission_url="https://github.com/learner/detail-task"),
        learner
    )

    # Learner detail now has my_submission populated
    detail_learner_post = assignment_service.get_assignment_detail(db_session, asg.id, learner)
    assert detail_learner_post.my_submission is not None
    assert detail_learner_post.my_submission.submission_url == "https://github.com/learner/detail-task"

    # Instructor detail returns list of submissions
    detail_inst = assignment_service.get_assignment_detail(db_session, asg.id, instructor)
    assert len(detail_inst.submissions) == 1
    assert detail_inst.submissions[0].user_id == learner.id


# 3. Assignment Updates
def test_service_update_assignment_partial_and_permissions(db_session):
    instructor = create_test_user(db_session, "asg_inst_10@test.com", role="instructor")
    other_instructor = create_test_user(db_session, "asg_inst_10_other@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "Course 10")
    section = create_test_section(db_session, course.id, "Section 10")

    original_deadline = datetime.now(timezone.utc) + timedelta(days=5)
    asg = assignment_service.create_assignment(
        db_session,
        section.id,
        AssignmentCreate(title="Original Title", instructions="Original Instructions", deadline=original_deadline),
        instructor
    )

    # Partial update: title only
    up1 = assignment_service.update_assignment(db_session, asg.id, AssignmentUpdate(title="New Title"), instructor)
    up1_deadline = up1.deadline.replace(tzinfo=timezone.utc) if up1.deadline.tzinfo is None else up1.deadline
    assert up1_deadline == original_deadline

    # Partial update: instructions only
    up2 = assignment_service.update_assignment(db_session, asg.id, AssignmentUpdate(instructions="Updated Guide"), instructor)
    assert up2.title == "New Title"
    assert up2.instructions == "Updated Guide"
    up2_deadline = up2.deadline.replace(tzinfo=timezone.utc) if up2.deadline.tzinfo is None else up2.deadline
    assert up2_deadline == original_deadline

    # Unauthorized instructor blocked
    with pytest.raises(HTTPException) as exc:
        assignment_service.update_assignment(db_session, asg.id, AssignmentUpdate(title="Hijack"), other_instructor)
    assert exc.value.status_code == 403


# 4. Safe Deletion
def test_service_delete_assignment_safe_deletion(db_session):
    instructor = create_test_user(db_session, "asg_inst_11@test.com", role="instructor")
    learner = create_test_user(db_session, "asg_learner_11@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Course Safe Del", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Section Safe Del")
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    # Case A: Assignment without submissions can be safely deleted
    asg_empty = assignment_service.create_assignment(db_session, section.id, AssignmentCreate(title="Empty Asg"), instructor)
    assignment_service.delete_assignment(db_session, asg_empty.id, instructor)
    assert assignment_service.get_by_id(db_session, asg_empty.id) is None

    # Case B: Assignment with existing learner submissions cannot be deleted (HTTP 409 Conflict)
    asg_with_sub = assignment_service.create_assignment(db_session, section.id, AssignmentCreate(title="Active Asg"), instructor)
    assignment_service.submit_assignment(
        db_session,
        asg_with_sub.id,
        SubmissionCreate(submission_url="https://github.com/learner/active"),
        learner
    )

    with pytest.raises(HTTPException) as exc:
        assignment_service.delete_assignment(db_session, asg_with_sub.id, instructor)
    assert exc.value.status_code == 409
    assert "existing learner submissions" in str(exc.value.detail)


# 5. Submission Creation & Resubmission
def test_service_submit_assignment_and_resubmission(db_session):
    instructor = create_test_user(db_session, "asg_inst_12@test.com", role="instructor")
    learner = create_test_user(db_session, "asg_learner_12@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Course Submit", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Section Submit")
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    asg = assignment_service.create_assignment(db_session, section.id, AssignmentCreate(title="Homework 1"), instructor)

    # Initial submission
    sub1 = assignment_service.submit_assignment(
        db_session,
        asg.id,
        SubmissionCreate(submission_url="https://github.com/v1"),
        learner
    )
    assert sub1.id is not None
    assert sub1.submission_url == "https://github.com/v1"
    assert sub1.grade is None
    first_id = sub1.id

    # Instructor grades initial submission
    assignment_service.grade_submission(db_session, sub1.id, SubmissionGrade(grade="85/100"), instructor)
    graded_sub = assignment_service.get_submission(db_session, sub1.id, instructor)
    assert graded_sub.grade == "85/100"

    # Learner resubmits before deadline -> Safe update without duplicate row, resets grade to None
    sub2 = assignment_service.submit_assignment(
        db_session,
        asg.id,
        SubmissionCreate(submission_url="https://github.com/v2-improved"),
        learner
    )
    assert sub2.id == first_id  # Same submission record updated!
    assert sub2.submission_url == "https://github.com/v2-improved"
    assert sub2.grade is None  # Grade reset for fresh evaluation

    # Verify database has exactly 1 submission record
    total_subs = db_session.query(Submission).filter(Submission.assignment_id == asg.id).count()
    assert total_subs == 1


def test_service_submit_assignment_deadline_rules(db_session):
    instructor = create_test_user(db_session, "asg_inst_13@test.com", role="instructor")
    learner = create_test_user(db_session, "asg_learner_13@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Course Deadline", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Section Deadline")
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    # Assignment with past deadline
    past_deadline = datetime.now(timezone.utc) - timedelta(hours=2)
    asg_past = assignment_service.create_assignment(
        db_session,
        section.id,
        AssignmentCreate(title="Late Homework", deadline=past_deadline),
        instructor
    )

    with pytest.raises(HTTPException) as exc:
        assignment_service.submit_assignment(
            db_session,
            asg_past.id,
            SubmissionCreate(submission_url="https://github.com/late"),
            learner
        )
    assert exc.value.status_code == 400
    assert "deadline has passed" in str(exc.value.detail)

    # Assignment with future deadline
    future_deadline = datetime.now(timezone.utc) + timedelta(days=2)
    asg_future = assignment_service.create_assignment(
        db_session,
        section.id,
        AssignmentCreate(title="On-Time Homework", deadline=future_deadline),
        instructor
    )
    sub = assignment_service.submit_assignment(
        db_session,
        asg_future.id,
        SubmissionCreate(submission_url="https://github.com/ontime"),
        learner
    )
    assert sub.id is not None


# 6. Submission Access Control & Retrieval
def test_service_submission_access_control(db_session):
    instructor = create_test_user(db_session, "asg_inst_14@test.com", role="instructor")
    other_instructor = create_test_user(db_session, "asg_inst_14_other@test.com", role="instructor")
    learner1 = create_test_user(db_session, "asg_learner_14a@test.com", role="learner")
    learner2 = create_test_user(db_session, "asg_learner_14b@test.com", role="learner")

    course = create_test_course(db_session, instructor.id, "Course Access", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Section Access")
    enroll_test_user(db_session, learner1.id, course.id, status="ACTIVE")
    enroll_test_user(db_session, learner2.id, course.id, status="ACTIVE")

    asg = assignment_service.create_assignment(db_session, section.id, AssignmentCreate(title="Access Asg"), instructor)
    sub1 = assignment_service.submit_assignment(
        db_session,
        asg.id,
        SubmissionCreate(submission_url="https://github.com/learner1/solution"),
        learner1
    )

    # Learner 1 can view own submission
    retrieved = assignment_service.get_submission(db_session, sub1.id, learner1)
    assert retrieved.id == sub1.id

    # Learner 2 cannot view Learner 1's submission (HTTP 403)
    with pytest.raises(HTTPException) as exc:
        assignment_service.get_submission(db_session, sub1.id, learner2)
    assert exc.value.status_code == 403

    # Course instructor can view submission
    inst_view = assignment_service.get_submission(db_session, sub1.id, instructor)
    assert inst_view.id == sub1.id

    # Other instructor cannot view submission (HTTP 403)
    with pytest.raises(HTTPException) as exc:
        assignment_service.get_submission(db_session, sub1.id, other_instructor)
    assert exc.value.status_code == 403

    # Learner cannot list all submissions (HTTP 403)
    with pytest.raises(HTTPException) as exc:
        assignment_service.list_submissions_for_assignment(db_session, asg.id, learner1)
    assert exc.value.status_code == 403

    # Instructor can list all submissions
    all_subs = assignment_service.list_submissions_for_assignment(db_session, asg.id, instructor)
    assert len(all_subs) == 1

    # Consistency check helper
    matched = assignment_service.get_assignment_submission(db_session, asg.id, sub1.id, instructor)
    assert matched.id == sub1.id

    with pytest.raises(HTTPException) as exc:
        assignment_service.get_assignment_submission(db_session, "wrong-asg-id", sub1.id, instructor)
    assert exc.value.status_code == 404


# 7. Grading & Permissions
def test_service_grade_submission_and_updates(db_session):
    instructor = create_test_user(db_session, "asg_inst_15@test.com", role="instructor")
    other_instructor = create_test_user(db_session, "asg_inst_15_other@test.com", role="instructor")
    learner = create_test_user(db_session, "asg_learner_15@test.com", role="learner")

    course = create_test_course(db_session, instructor.id, "Course Grading", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Section Grading")
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    asg = assignment_service.create_assignment(db_session, section.id, AssignmentCreate(title="Grading Test"), instructor)
    sub = assignment_service.submit_assignment(
        db_session,
        asg.id,
        SubmissionCreate(submission_url="https://github.com/grading-test"),
        learner
    )

    # Learner cannot grade submission (HTTP 403)
    with pytest.raises(HTTPException) as exc:
        assignment_service.grade_submission(db_session, sub.id, SubmissionGrade(grade="A+"), learner)
    assert exc.value.status_code == 403

    # Other instructor cannot grade submission (HTTP 403)
    with pytest.raises(HTTPException) as exc:
        assignment_service.grade_submission(db_session, sub.id, SubmissionGrade(grade="A+"), other_instructor)
    assert exc.value.status_code == 403

    # Authorized instructor assigns grade
    graded = assignment_service.grade_submission(db_session, sub.id, SubmissionGrade(grade="A"), instructor)
    assert graded.grade == "A"

    # Instructor updates grade
    updated_grade = assignment_service.grade_submission(db_session, sub.id, SubmissionGrade(grade="A+"), instructor)
    assert updated_grade.grade == "A+"

    # Learner sees their grade
    learner_view = assignment_service.get_submission(db_session, sub.id, learner)
    assert learner_view.grade == "A+"


# ---------------------------------------------------------
# Stage 3: FastAPI Assignment API Endpoint Tests
# ---------------------------------------------------------

from app.utils.security import create_access_token


def auth_header(user):
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


# 1. Assignment Creation & Listing via API
def test_api_assignment_creation_and_listing(client, db_session):
    instructor = create_test_user(db_session, "api_asg_inst_cr@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "API Asg Course")
    section = create_test_section(db_session, course.id, "API Asg Section")

    # POST /api/v1/sections/{section_id}/assignments
    payload = {
        "title": "Build REST API",
        "instructions": "Implement FastAPI routers.",
    }
    res_post = client.post(
        f"/api/v1/sections/{section.id}/assignments",
        headers=auth_header(instructor),
        json=payload
    )
    assert res_post.status_code == 201
    created_asg = res_post.json()
    assert created_asg["title"] == "Build REST API"
    assert created_asg["section_id"] == section.id
    asg_id = created_asg["id"]

    # GET /api/v1/sections/{section_id}/assignments
    res_list = client.get(
        f"/api/v1/sections/{section.id}/assignments",
        headers=auth_header(instructor)
    )
    assert res_list.status_code == 200
    assignments = res_list.json()
    assert len(assignments) == 1
    assert assignments[0]["id"] == asg_id

    # POST /api/v1/assignments direct with section_id
    res_root = client.post(
        "/api/v1/assignments",
        headers=auth_header(instructor),
        json={"title": "Root Created Assignment", "section_id": section.id}
    )
    assert res_root.status_code == 201
    assert res_root.json()["title"] == "Root Created Assignment"

    # POST /api/v1/assignments missing section_id -> 400
    res_no_sec = client.post(
        "/api/v1/assignments",
        headers=auth_header(instructor),
        json={"title": "No Section"}
    )
    assert res_no_sec.status_code == 400

    # Validation error: empty title -> 422
    res_invalid = client.post(
        f"/api/v1/sections/{section.id}/assignments",
        headers=auth_header(instructor),
        json={"title": "   "}
    )
    assert res_invalid.status_code == 422


# 2. Assignment Retrieval, Update, and Deletion via API
def test_api_assignment_retrieval_update_and_delete(client, db_session):
    instructor = create_test_user(db_session, "api_asg_inst_crud@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "CRUD Course", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "CRUD Section")

    asg = assignment_service.create_assignment(
        db_session,
        section.id,
        AssignmentCreate(title="Initial Assignment", instructions="Initial Instructions"),
        instructor
    )

    # GET /api/v1/assignments/{id}
    res_get = client.get(
        f"/api/v1/assignments/{asg.id}",
        headers=auth_header(instructor)
    )
    assert res_get.status_code == 200
    detail = res_get.json()
    assert detail["id"] == asg.id
    assert detail["title"] == "Initial Assignment"

    # PUT /api/v1/assignments/{id}
    res_put = client.put(
        f"/api/v1/assignments/{asg.id}",
        headers=auth_header(instructor),
        json={"title": "Updated Assignment"}
    )
    assert res_put.status_code == 200
    assert res_put.json()["title"] == "Updated Assignment"

    # DELETE /api/v1/assignments/{id} success
    res_del = client.delete(
        f"/api/v1/assignments/{asg.id}",
        headers=auth_header(instructor)
    )
    assert res_del.status_code == 200
    assert "deleted successfully" in res_del.json()["message"]

    # Verify deleted
    res_get_deleted = client.get(
        f"/api/v1/assignments/{asg.id}",
        headers=auth_header(instructor)
    )
    assert res_get_deleted.status_code == 404


# 3. Authentication & Role Restrictions via API
def test_api_authentication_and_authorization_failures(client, db_session):
    instructor = create_test_user(db_session, "api_inst_auth@test.com", role="instructor")
    other_instructor = create_test_user(db_session, "api_inst_other_auth@test.com", role="instructor")
    learner = create_test_user(db_session, "api_learner_auth@test.com", role="learner")

    course = create_test_course(db_session, instructor.id, "Auth Test Course")
    section = create_test_section(db_session, course.id, "Auth Section")
    asg = assignment_service.create_assignment(
        db_session,
        section.id,
        AssignmentCreate(title="Auth Protected Asg"),
        instructor
    )

    # 1. Missing Authorization header -> 401
    res_unauth = client.post(
        f"/api/v1/sections/{section.id}/assignments",
        json={"title": "No Auth"}
    )
    assert res_unauth.status_code == 401

    # 2. Learner attempting instructor actions -> 403
    res_learner_create = client.post(
        f"/api/v1/sections/{section.id}/assignments",
        headers=auth_header(learner),
        json={"title": "Learner Try"}
    )
    assert res_learner_create.status_code == 403

    res_learner_put = client.put(
        f"/api/v1/assignments/{asg.id}",
        headers=auth_header(learner),
        json={"title": "Learner Edit"}
    )
    assert res_learner_put.status_code == 403

    res_learner_del = client.delete(
        f"/api/v1/assignments/{asg.id}",
        headers=auth_header(learner)
    )
    assert res_learner_del.status_code == 403

    # 3. Other instructor attempting to manage another's assignment -> 403
    res_other_put = client.put(
        f"/api/v1/assignments/{asg.id}",
        headers=auth_header(other_instructor),
        json={"title": "Hijack"}
    )
    assert res_other_put.status_code == 403

    res_other_del = client.delete(
        f"/api/v1/assignments/{asg.id}",
        headers=auth_header(other_instructor)
    )
    assert res_other_del.status_code == 403


# 4. Learner Enrollment & Course Publication Restrictions via API
def test_api_learner_enrollment_and_publication_restrictions(client, db_session):
    instructor = create_test_user(db_session, "api_inst_pub@test.com", role="instructor")
    learner = create_test_user(db_session, "api_learner_pub@test.com", role="learner")

    draft_course = create_test_course(db_session, instructor.id, "Draft API Course", status="DRAFT")
    pub_course = create_test_course(db_session, instructor.id, "Pub API Course", status="PUBLISHED")

    draft_sec = create_test_section(db_session, draft_course.id, "Draft Sec API")
    pub_sec = create_test_section(db_session, pub_course.id, "Pub Sec API")

    draft_asg = assignment_service.create_assignment(db_session, draft_sec.id, AssignmentCreate(title="Draft API Asg"), instructor)
    pub_asg = assignment_service.create_assignment(db_session, pub_sec.id, AssignmentCreate(title="Pub API Asg"), instructor)

    # Learner enrolled in draft course -> Cannot access (403)
    enroll_test_user(db_session, learner.id, draft_course.id, status="ACTIVE")
    res_draft = client.get(
        f"/api/v1/assignments/{draft_asg.id}",
        headers=auth_header(learner)
    )
    assert res_draft.status_code == 403

    # Learner not enrolled in published course -> Cannot access (403)
    res_pub_no_enr = client.get(
        f"/api/v1/assignments/{pub_asg.id}",
        headers=auth_header(learner)
    )
    assert res_pub_no_enr.status_code == 403

    # Learner actively enrolled in published course -> Can access (200)
    enroll_test_user(db_session, learner.id, pub_course.id, status="ACTIVE")
    res_pub_enr = client.get(
        f"/api/v1/assignments/{pub_asg.id}",
        headers=auth_header(learner)
    )
    assert res_pub_enr.status_code == 200
    assert res_pub_enr.json()["id"] == pub_asg.id


# 5. Assignment Submission, Resubmission & Aliases via API
def test_api_assignment_submission_and_resubmission(client, db_session):
    instructor = create_test_user(db_session, "api_inst_sub@test.com", role="instructor")
    learner = create_test_user(db_session, "api_learner_sub@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Submit API Course", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Submit API Section")
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    asg = assignment_service.create_assignment(db_session, section.id, AssignmentCreate(title="Deliverables Task"), instructor)

    # 1. Successful submission via /submit (matches frontend assignmentService.submitAssignment)
    payload_v1 = {"submission_url": "https://github.com/learner/fastapi-app"}
    res_sub1 = client.post(
        f"/api/v1/assignments/{asg.id}/submit",
        headers=auth_header(learner),
        json=payload_v1
    )
    assert res_sub1.status_code == 201
    sub1_data = res_sub1.json()
    assert sub1_data["submission_url"] == "https://github.com/learner/fastapi-app"
    assert sub1_data["grade"] is None
    sub_id = sub1_data["id"]

    # 2. Resubmission via alias /submissions -> Updates existing record safely
    payload_v2 = {"submission_url": "https://github.com/learner/fastapi-app-v2"}
    res_sub2 = client.post(
        f"/api/v1/assignments/{asg.id}/submissions",
        headers=auth_header(learner),
        json=payload_v2
    )
    assert res_sub2.status_code == 201
    sub2_data = res_sub2.json()
    assert sub2_data["id"] == sub_id  # Same submission updated
    assert sub2_data["submission_url"] == "https://github.com/learner/fastapi-app-v2"

    # 3. Invalid URL -> 422 Unprocessable Entity
    res_invalid_url = client.post(
        f"/api/v1/assignments/{asg.id}/submit",
        headers=auth_header(learner),
        json={"submission_url": "not-a-valid-url"}
    )
    assert res_invalid_url.status_code == 422


# 6. Personal Submissions, Listing & Access Control via API
def test_api_personal_submission_and_access_control(client, db_session):
    instructor = create_test_user(db_session, "api_inst_my_sub@test.com", role="instructor")
    learner1 = create_test_user(db_session, "api_l1_acc@test.com", role="learner")
    learner2 = create_test_user(db_session, "api_l2_acc@test.com", role="learner")

    course = create_test_course(db_session, instructor.id, "Access Course API", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Access Sec API")
    enroll_test_user(db_session, learner1.id, course.id, status="ACTIVE")
    enroll_test_user(db_session, learner2.id, course.id, status="ACTIVE")

    asg = assignment_service.create_assignment(db_session, section.id, AssignmentCreate(title="Access Asg API"), instructor)

    # Learner 1 before submitting: GET /my-submission -> 404
    res_none = client.get(
        f"/api/v1/assignments/{asg.id}/my-submission",
        headers=auth_header(learner1)
    )
    assert res_none.status_code == 404

    # Learner 1 submits
    res_sub = client.post(
        f"/api/v1/assignments/{asg.id}/submit",
        headers=auth_header(learner1),
        json={"submission_url": "https://github.com/learner1/repo"}
    )
    assert res_sub.status_code == 201
    sub_id = res_sub.json()["id"]

    # Learner 1 after submitting: GET /my-submission -> 200
    res_my_sub = client.get(
        f"/api/v1/assignments/{asg.id}/my-submission",
        headers=auth_header(learner1)
    )
    assert res_my_sub.status_code == 200
    assert res_my_sub.json()["id"] == sub_id

    # Learner 2 cannot access Learner 1's submission directly -> 403
    res_l2_view = client.get(
        f"/api/v1/assignments/{asg.id}/submissions/{sub_id}",
        headers=auth_header(learner2)
    )
    assert res_l2_view.status_code == 403

    # Learner cannot list all submissions -> 403
    res_l_list = client.get(
        f"/api/v1/assignments/{asg.id}/submissions",
        headers=auth_header(learner1)
    )
    assert res_l_list.status_code == 403

    # Instructor lists all submissions -> 200
    res_inst_list = client.get(
        f"/api/v1/assignments/{asg.id}/submissions",
        headers=auth_header(instructor)
    )
    assert res_inst_list.status_code == 200
    assert len(res_inst_list.json()) == 1


# 7. Grading via API and Aliases
def test_api_grading_and_permissions(client, db_session):
    instructor = create_test_user(db_session, "api_inst_grade@test.com", role="instructor")
    other_instructor = create_test_user(db_session, "api_inst_other_grade@test.com", role="instructor")
    learner = create_test_user(db_session, "api_learner_grade@test.com", role="learner")

    course = create_test_course(db_session, instructor.id, "Grading API Course", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Grading API Sec")
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    asg = assignment_service.create_assignment(db_session, section.id, AssignmentCreate(title="Grading API Asg"), instructor)
    sub = assignment_service.submit_assignment(
        db_session,
        asg.id,
        SubmissionCreate(submission_url="https://github.com/grade-api"),
        learner
    )

    # 1. Course instructor grades submission via nested route
    res_grade = client.put(
        f"/api/v1/assignments/{asg.id}/submissions/{sub.id}/grade",
        headers=auth_header(instructor),
        json={"grade": "88/100"}
    )
    assert res_grade.status_code == 200
    assert res_grade.json()["grade"] == "88/100"

    # 2. Course instructor updates grade via standalone alias route /submissions/{id}/grade
    res_alias_grade = client.put(
        f"/api/v1/submissions/{sub.id}/grade",
        headers=auth_header(instructor),
        json={"grade": "95/100"}
    )
    assert res_alias_grade.status_code == 200
    assert res_alias_grade.json()["grade"] == "95/100"

    # 3. Learner cannot grade submission -> 403
    res_learner_grade = client.put(
        f"/api/v1/assignments/{asg.id}/submissions/{sub.id}/grade",
        headers=auth_header(learner),
        json={"grade": "100"}
    )
    assert res_learner_grade.status_code == 403

    # 4. Other instructor cannot grade submission -> 403
    res_other_grade = client.put(
        f"/api/v1/assignments/{asg.id}/submissions/{sub.id}/grade",
        headers=auth_header(other_instructor),
        json={"grade": "50"}
    )
    assert res_other_grade.status_code == 403

    # 5. Invalid grade (empty string) -> 422 Unprocessable Entity
    res_invalid_grade = client.put(
        f"/api/v1/assignments/{asg.id}/submissions/{sub.id}/grade",
        headers=auth_header(instructor),
        json={"grade": "   "}
    )
    assert res_invalid_grade.status_code == 422


# 8. Missing Resources and Safe Deletion Conflict via API
def test_api_missing_resources_and_edge_cases(client, db_session):
    instructor = create_test_user(db_session, "api_inst_missing@test.com", role="instructor")
    learner = create_test_user(db_session, "api_learner_missing@test.com", role="learner")
    course = create_test_course(db_session, instructor.id, "Missing Course", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Missing Section")
    enroll_test_user(db_session, learner.id, course.id, status="ACTIVE")

    # Missing assignment -> 404
    res_missing_asg = client.get(
        "/api/v1/assignments/non-existent-asg",
        headers=auth_header(instructor)
    )
    assert res_missing_asg.status_code == 404

    # Create assignment & submission
    asg = assignment_service.create_assignment(db_session, section.id, AssignmentCreate(title="Safe Del API"), instructor)
    sub = assignment_service.submit_assignment(
        db_session,
        asg.id,
        SubmissionCreate(submission_url="https://github.com/safe-del"),
        learner
    )

    # Deleting assignment with existing submission returns 409 Conflict
    res_del_conflict = client.delete(
        f"/api/v1/assignments/{asg.id}",
        headers=auth_header(instructor)
    )
    assert res_del_conflict.status_code == 409
    assert "existing learner submissions" in res_del_conflict.json()["detail"]


# 9. FIX 1: Legacy Admin Role Rejected across API endpoints
def test_api_legacy_admin_role_rejected(client, db_session):
    instructor = create_test_user(db_session, "api_inst_leg_rej@test.com", role="instructor")
    legacy_admin = create_test_user(db_session, "api_legacy_admin_rej@test.com", role="admin")
    course = create_test_course(db_session, instructor.id, "Legacy Admin Target Course")
    section = create_test_section(db_session, course.id, "Legacy Admin Target Section")
    asg = assignment_service.create_assignment(db_session, section.id, AssignmentCreate(title="Target Asg"), instructor)

    # 1. POST section assignments -> 403
    res_post = client.post(
        f"/api/v1/sections/{section.id}/assignments",
        headers=auth_header(legacy_admin),
        json={"title": "Legacy Attempt"}
    )
    assert res_post.status_code == 403
    assert "insufficient permissions" in res_post.json()["detail"].lower()

    # 2. PUT assignment -> 403
    res_put = client.put(
        f"/api/v1/assignments/{asg.id}",
        headers=auth_header(legacy_admin),
        json={"title": "Legacy Edit"}
    )
    assert res_put.status_code == 403

    # 3. DELETE assignment -> 403
    res_del = client.delete(
        f"/api/v1/assignments/{asg.id}",
        headers=auth_header(legacy_admin)
    )
    assert res_del.status_code == 403

    # 4. PUT standalone grade -> 403
    res_grade = client.put(
        "/api/v1/submissions/any-sub-id/grade",
        headers=auth_header(legacy_admin),
        json={"grade": "A"}
    )
    assert res_grade.status_code == 403


# 10. FIX 2: UTC Normalization with UTC and Non-UTC Timezone-Aware Deadlines
def test_service_create_assignment_utc_and_non_utc_deadlines(db_session):
    instructor = create_test_user(db_session, "asg_inst_tz@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "TZ Course")
    section = create_test_section(db_session, course.id, "TZ Section")

    # Non-UTC timezone: IST (UTC+05:30)
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    ist_deadline = datetime(2026, 12, 1, 15, 30, 0, tzinfo=ist_tz)
    # Expected UTC: 15:30 - 5:30 = 10:00 UTC
    expected_utc = datetime(2026, 12, 1, 10, 0, 0, tzinfo=timezone.utc)

    asg_ist = assignment_service.create_assignment(
        db_session,
        section.id,
        AssignmentCreate(title="IST Assignment", deadline=ist_deadline),
        instructor
    )
    # Verify deadline in UTC
    persisted_ist = asg_ist.deadline.replace(tzinfo=timezone.utc) if asg_ist.deadline.tzinfo is None else asg_ist.deadline
    assert persisted_ist == expected_utc

    # Non-UTC timezone: EST (UTC-05:00)
    est_tz = timezone(timedelta(hours=-5))
    est_deadline = datetime(2026, 12, 1, 15, 0, 0, tzinfo=est_tz)
    # Expected UTC: 15:00 + 5:00 = 20:00 UTC
    expected_est_utc = datetime(2026, 12, 1, 20, 0, 0, tzinfo=timezone.utc)

    asg_est = assignment_service.create_assignment(
        db_session,
        section.id,
        AssignmentCreate(title="EST Assignment", deadline=est_deadline),
        instructor
    )
    persisted_est = asg_est.deadline.replace(tzinfo=timezone.utc) if asg_est.deadline.tzinfo is None else asg_est.deadline
    assert persisted_est == expected_est_utc

    # Naive deadline: project convention treats as UTC
    naive_deadline = datetime(2026, 12, 1, 12, 0, 0)
    asg_naive = assignment_service.create_assignment(
        db_session,
        section.id,
        AssignmentCreate(title="Naive Assignment", deadline=naive_deadline),
        instructor
    )
    persisted_naive = asg_naive.deadline.replace(tzinfo=timezone.utc) if asg_naive.deadline.tzinfo is None else asg_naive.deadline
    assert persisted_naive == datetime(2026, 12, 1, 12, 0, 0, tzinfo=timezone.utc)


# 11. FIX 3: Standalone Submission Retrieval via GET /api/v1/submissions/{submission_id}
def test_api_standalone_submission_retrieval(client, db_session):
    instructor = create_test_user(db_session, "api_inst_stand@test.com", role="instructor")
    other_instructor = create_test_user(db_session, "api_other_inst_stand@test.com", role="instructor")
    learner1 = create_test_user(db_session, "api_l1_stand@test.com", role="learner")
    learner2 = create_test_user(db_session, "api_l2_stand@test.com", role="learner")

    course = create_test_course(db_session, instructor.id, "Standalone Course", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Standalone Section")
    enroll_test_user(db_session, learner1.id, course.id, status="ACTIVE")
    enroll_test_user(db_session, learner2.id, course.id, status="ACTIVE")

    asg = assignment_service.create_assignment(db_session, section.id, AssignmentCreate(title="Standalone Asg"), instructor)
    sub = assignment_service.submit_assignment(
        db_session,
        asg.id,
        SubmissionCreate(submission_url="https://github.com/stand/demo"),
        learner1
    )

    # 1. Learner 1 retrieves own submission via standalone endpoint -> 200 OK
    res_l1 = client.get(
        f"/api/v1/submissions/{sub.id}",
        headers=auth_header(learner1)
    )
    assert res_l1.status_code == 200
    assert res_l1.json()["id"] == sub.id
    assert res_l1.json()["submission_url"] == "https://github.com/stand/demo"

    # 1b. Trailing slash variant -> 200 OK
    res_l1_slash = client.get(
        f"/api/v1/submissions/{sub.id}/",
        headers=auth_header(learner1)
    )
    assert res_l1_slash.status_code == 200
    assert res_l1_slash.json()["id"] == sub.id

    # 2. Learner 2 cannot retrieve Learner 1's submission -> 403 Forbidden
    res_l2 = client.get(
        f"/api/v1/submissions/{sub.id}",
        headers=auth_header(learner2)
    )
    assert res_l2.status_code == 403
    assert "only view their own submissions" in res_l2.json()["detail"].lower()

    # 3. Course instructor retrieves submission via standalone endpoint -> 200 OK
    res_inst = client.get(
        f"/api/v1/submissions/{sub.id}",
        headers=auth_header(instructor)
    )
    assert res_inst.status_code == 200
    assert res_inst.json()["id"] == sub.id

    # 4. Other instructor cannot retrieve submission -> 403 Forbidden
    res_other = client.get(
        f"/api/v1/submissions/{sub.id}",
        headers=auth_header(other_instructor)
    )
    assert res_other.status_code == 403

    # 5. Non-existent submission -> 404 Not Found
    res_404 = client.get(
        "/api/v1/submissions/non-existent-sub-id",
        headers=auth_header(instructor)
    )
    assert res_404.status_code == 404

    # 6. Existing nested route continues to function normally
    res_nested = client.get(
        f"/api/v1/assignments/{asg.id}/submissions/{sub.id}",
        headers=auth_header(learner1)
    )
    assert res_nested.status_code == 200
    assert res_nested.json()["id"] == sub.id
