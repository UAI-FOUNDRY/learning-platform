import pytest
from datetime import datetime
from pydantic import ValidationError

from app.schemas.quiz import (
    QuizBase,
    QuizCreate,
    QuizUpdate,
    QuizResponse,
    QuizDetailResponse,
    QuizLearnerDetailResponse,
    QuestionBase,
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    QuestionLearnerResponse,
    QuizAnswerItem,
    QuizSubmitRequest,
    QuizAttemptResponse,
)


# ---------------------------------------------------------
# Existing Router Mount Test
# ---------------------------------------------------------

def test_quizzes_router_mounted(client):
    response = client.get("/api/v1/quizzes/")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "quizzes"
    assert "description" in data


# ---------------------------------------------------------
# Quiz Schema Tests
# ---------------------------------------------------------

def test_quiz_create_valid():
    quiz = QuizCreate(title="Python Basics Quiz", passing_score=80, section_id="sec-123")
    assert quiz.title == "Python Basics Quiz"
    assert quiz.passing_score == 80
    assert quiz.section_id == "sec-123"

    # Default passing score
    quiz_default = QuizCreate(title="Python Defaults Quiz")
    assert quiz_default.passing_score == 70
    assert quiz_default.section_id is None


def test_quiz_create_validation_errors():
    # Empty / whitespace title
    with pytest.raises(ValidationError) as exc:
        QuizCreate(title="   ")
    assert "Quiz title cannot be empty" in str(exc.value)

    # Missing title
    with pytest.raises(ValidationError):
        QuizCreate()

    # Invalid passing score: negative
    with pytest.raises(ValidationError) as exc:
        QuizCreate(title="Valid Title", passing_score=-5)
    assert "passing_score must be between 0 and 100" in str(exc.value)

    # Invalid passing score: above 100
    with pytest.raises(ValidationError) as exc:
        QuizCreate(title="Valid Title", passing_score=101)
    assert "passing_score must be between 0 and 100" in str(exc.value)

    # Boundary passing scores
    quiz_min = QuizCreate(title="Zero Pass", passing_score=0)
    assert quiz_min.passing_score == 0

    quiz_max = QuizCreate(title="Perfect Pass", passing_score=100)
    assert quiz_max.passing_score == 100


def test_quiz_update_validation():
    # Partial update: title only
    update_title = QuizUpdate(title="Updated Title")
    assert update_title.title == "Updated Title"
    assert update_title.passing_score is None

    # Partial update: passing_score only
    update_score = QuizUpdate(passing_score=85)
    assert update_score.title is None
    assert update_score.passing_score == 85

    # Empty update object
    empty_update = QuizUpdate()
    assert empty_update.title is None
    assert empty_update.passing_score is None

    # Invalid title update
    with pytest.raises(ValidationError) as exc:
        QuizUpdate(title="   ")
    assert "Quiz title cannot be empty" in str(exc.value)

    # Invalid passing_score update
    with pytest.raises(ValidationError) as exc:
        QuizUpdate(passing_score=150)
    assert "passing_score must be between 0 and 100" in str(exc.value)


def test_quiz_response_serialization():
    now = datetime.utcnow()
    resp = QuizResponse(
        id="q-1",
        section_id="sec-1",
        title="Intro Quiz",
        passing_score=75,
        created_at=now,
        question_count=5
    )
    dumped = resp.model_dump()
    assert dumped["id"] == "q-1"
    assert dumped["section_id"] == "sec-1"
    assert dumped["title"] == "Intro Quiz"
    assert dumped["passing_score"] == 75
    assert dumped["question_count"] == 5


# ---------------------------------------------------------
# Question Schema Tests
# ---------------------------------------------------------

def test_question_create_valid_list_options():
    q = QuestionCreate(
        prompt="What is the capital of France?",
        options=["Paris", "London", "Berlin", "Madrid"],
        correct_option="Paris",
        quiz_id="quiz-10"
    )
    assert q.prompt == "What is the capital of France?"
    assert len(q.options) == 4
    assert q.correct_option == "Paris"
    assert q.quiz_id == "quiz-10"


def test_question_create_valid_dict_options():
    # Matching option key
    q1 = QuestionCreate(
        prompt="Is Python dynamically typed?",
        options={"A": "True", "B": "False"},
        correct_option="A"
    )
    assert q1.correct_option == "A"

    # Matching option value
    q2 = QuestionCreate(
        prompt="Is Python dynamically typed?",
        options={"A": "True", "B": "False"},
        correct_option="True"
    )
    assert q2.correct_option == "True"


def test_question_create_validation_errors():
    # Empty prompt
    with pytest.raises(ValidationError) as exc:
        QuestionCreate(
            prompt="   ",
            options=["A", "B"],
            correct_option="A"
        )
    assert "Question prompt cannot be empty" in str(exc.value)

    # Less than 2 options (list)
    with pytest.raises(ValidationError) as exc:
        QuestionCreate(
            prompt="Valid prompt?",
            options=["Solo Option"],
            correct_option="Solo Option"
        )
    assert "At least two answer options are required" in str(exc.value)

    # Less than 2 options (dict)
    with pytest.raises(ValidationError) as exc:
        QuestionCreate(
            prompt="Valid prompt?",
            options={"A": "Only Option"},
            correct_option="A"
        )
    assert "At least two answer options are required" in str(exc.value)

    # Empty option string in list
    with pytest.raises(ValidationError) as exc:
        QuestionCreate(
            prompt="Valid prompt?",
            options=["Option 1", "   "],
            correct_option="Option 1"
        )
    assert "Each answer option must be a non-empty string" in str(exc.value)

    # Empty option value in dict
    with pytest.raises(ValidationError) as exc:
        QuestionCreate(
            prompt="Valid prompt?",
            options={"A": "Option 1", "B": "  "},
            correct_option="A"
        )
    assert "Option values must be non-empty strings" in str(exc.value)

    # correct_option not in options
    with pytest.raises(ValidationError) as exc:
        QuestionCreate(
            prompt="What is 2 + 2?",
            options=["1", "2", "3", "4"],
            correct_option="5"
        )
    assert "must match one of the provided options" in str(exc.value)


def test_question_update_partial_and_full():
    # Prompt only update
    u_prompt = QuestionUpdate(prompt="Updated prompt?")
    assert u_prompt.prompt == "Updated prompt?"
    assert u_prompt.options is None
    assert u_prompt.correct_option is None

    # Options only update
    u_options = QuestionUpdate(options=["New A", "New B"])
    assert u_options.options == ["New A", "New B"]
    assert u_options.prompt is None
    assert u_options.correct_option is None

    # Correct option only update
    u_correct = QuestionUpdate(correct_option="New A")
    assert u_correct.correct_option == "New A"

    # Both options and matching correct_option
    u_both_valid = QuestionUpdate(options=["X", "Y"], correct_option="X")
    assert u_both_valid.options == ["X", "Y"]
    assert u_both_valid.correct_option == "X"

    # Both options and mismatched correct_option raises error
    with pytest.raises(ValidationError) as exc:
        QuestionUpdate(options=["X", "Y"], correct_option="Z")
    assert "must match one of the provided options" in str(exc.value)

    # Empty prompt update raises error
    with pytest.raises(ValidationError) as exc:
        QuestionUpdate(prompt="   ")
    assert "Question prompt cannot be empty" in str(exc.value)

    # Less than 2 options raises error
    with pytest.raises(ValidationError) as exc:
        QuestionUpdate(options=["Single"])
    assert "At least two answer options are required" in str(exc.value)


# ---------------------------------------------------------
# Security & Sanitization Tests
# ---------------------------------------------------------

def test_question_learner_response_security_sanitization():
    # Raw source payload containing correct answer (e.g. from ORM model or internal DB query)
    raw_question_data = {
        "id": "question-uuid-99",
        "quiz_id": "quiz-uuid-01",
        "prompt": "What is the result of 3 * 3?",
        "options": ["6", "9", "12"],
        "correct_option": "9",
        "created_at": datetime.utcnow()
    }

    # Instructor response DOES include correct_option
    instructor_resp = QuestionResponse(**raw_question_data)
    assert instructor_resp.correct_option == "9"
    assert "correct_option" in instructor_resp.model_dump()

    # Learner response MUST NOT expose correct_option
    learner_resp = QuestionLearnerResponse(**raw_question_data)
    dumped = learner_resp.model_dump()
    assert "correct_option" not in dumped
    assert not hasattr(learner_resp, "correct_option")
    assert "correct_option" not in QuestionLearnerResponse.model_fields


# ---------------------------------------------------------
# Quiz Submission & Attempt Tests
# ---------------------------------------------------------

def test_quiz_submission_and_attempt_schemas():
    # Valid answer item
    item = QuizAnswerItem(question_id="q-1", selected_option="Option A")
    assert item.question_id == "q-1"
    assert item.selected_option == "Option A"

    # Empty question_id in answer
    with pytest.raises(ValidationError) as exc:
        QuizAnswerItem(question_id="  ", selected_option="Option A")
    assert "question_id cannot be empty" in str(exc.value)

    # Empty selected_option in answer
    with pytest.raises(ValidationError) as exc:
        QuizAnswerItem(question_id="q-1", selected_option="  ")
    assert "selected_option cannot be empty" in str(exc.value)

    # Valid submit request
    req = QuizSubmitRequest(
        answers=[
            QuizAnswerItem(question_id="q-1", selected_option="A"),
            {"question_id": "q-2", "selected_option": "B"}
        ]
    )
    assert len(req.answers) == 2

    # Empty answers list in submit request
    with pytest.raises(ValidationError) as exc:
        QuizSubmitRequest(answers=[])
    assert "At least one answer must be submitted" in str(exc.value)

    # SECURITY: Trusted fields injection (score/passed) must be strictly rejected
    with pytest.raises(ValidationError):
        QuizSubmitRequest(
            answers=[{"question_id": "q-1", "selected_option": "A"}],
            score=100,
            passed=True
        )

    # Attempt response
    now = datetime.utcnow()
    attempt = QuizAttemptResponse(
        id="att-1",
        quiz_id="quiz-1",
        user_id="user-1",
        score=90,
        passed=True,
        attempted_at=now,
        total_questions=10,
        correct_count=9
    )
    assert attempt.score == 90
    assert attempt.passed is True
    assert attempt.total_questions == 10
    assert attempt.correct_count == 9


def test_quiz_detail_responses():
    now = datetime.utcnow()
    q_inst = QuestionResponse(
        id="q-1",
        quiz_id="qz-1",
        prompt="Prompt 1",
        options=["A", "B"],
        correct_option="A",
        created_at=now
    )
    detail_inst = QuizDetailResponse(
        id="qz-1",
        section_id="sec-1",
        title="Admin Quiz",
        passing_score=70,
        questions=[q_inst]
    )
    assert len(detail_inst.questions) == 1
    assert detail_inst.questions[0].correct_option == "A"

    q_learner = QuestionLearnerResponse(
        id="q-1",
        quiz_id="qz-1",
        prompt="Prompt 1",
        options=["A", "B"],
        created_at=now
    )
    detail_learner = QuizLearnerDetailResponse(
        id="qz-1",
        section_id="sec-1",
        title="Learner Quiz",
        passing_score=70,
        questions=[q_learner]
    )
    assert len(detail_learner.questions) == 1
    dumped = detail_learner.model_dump()
    assert "correct_option" not in dumped["questions"][0]


# ---------------------------------------------------------
# Stage 2: QuizService Business Logic Tests
# ---------------------------------------------------------

from unittest.mock import patch
from fastapi import HTTPException
from app.utils.security import get_password_hash
from app.models.user import User
from app.models.category import Category
from app.models.course import Course
from app.models.section import Section
from app.models.enrollment import Enrollment
from app.models.quiz import Quiz
from app.models.question import Question
from app.models.quiz_attempt import QuizAttempt
from app.services.quiz_service import quiz_service


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


def create_test_course(db, instructor_id, title="Quiz Test Course", status="PUBLISHED"):
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


# 1. Quiz creation and retrieval
def test_service_quiz_creation_and_retrieval(db_session):
    instructor = create_test_user(db_session, "inst_cr@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "Create Course")
    section = create_test_section(db_session, course.id, "Create Section")

    quiz = quiz_service.create_quiz(
        db_session,
        section.id,
        QuizCreate(title="Intro Quiz", passing_score=75),
        instructor
    )
    assert quiz.id is not None
    assert quiz.title == "Intro Quiz"
    assert quiz.passing_score == 75
    assert quiz.section_id == section.id

    fetched = quiz_service.get_quiz(db_session, quiz.id, instructor)
    assert fetched.id == quiz.id
    assert fetched.title == "Intro Quiz"

    quizzes = quiz_service.list_quizzes_for_section(db_session, section.id, instructor)
    assert len(quizzes) == 1
    assert quizzes[0].id == quiz.id


# 2. Quiz update and deletion
def test_service_quiz_update_and_deletion(db_session):
    instructor = create_test_user(db_session, "inst_updel@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "UpDel Course")
    section = create_test_section(db_session, course.id, "UpDel Section")

    quiz = quiz_service.create_quiz(
        db_session,
        section.id,
        QuizCreate(title="Original Quiz", passing_score=70),
        instructor
    )

    updated = quiz_service.update_quiz(
        db_session,
        quiz.id,
        QuizUpdate(title="Advanced Quiz", passing_score=85),
        instructor
    )
    assert updated.title == "Advanced Quiz"
    assert updated.passing_score == 85

    quiz_service.delete_quiz(db_session, quiz.id, instructor)
    assert quiz_service.get_by_id(db_session, quiz.id) is None

    with pytest.raises(HTTPException) as exc:
        quiz_service.get_quiz(db_session, quiz.id, instructor)
    assert exc.value.status_code == 404


# 3. Question creation and validation
def test_service_question_creation_and_validation(db_session):
    instructor = create_test_user(db_session, "inst_qcr@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "Q Create Course")
    section = create_test_section(db_session, course.id, "Q Create Section")
    quiz = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="Q Quiz"), instructor)

    # Valid list question
    q_list = quiz_service.add_question(
        db_session,
        quiz.id,
        QuestionCreate(prompt="What is 2 + 2?", options=["3", "4", "5"], correct_option="4"),
        instructor
    )
    assert q_list.id is not None
    assert q_list.prompt == "What is 2 + 2?"
    assert q_list.correct_option == "4"

    # Valid dict question
    q_dict = quiz_service.add_question(
        db_session,
        quiz.id,
        QuestionCreate(
            prompt="Which language?",
            options={"A": "Python", "B": "JavaScript"},
            correct_option="A"
        ),
        instructor
    )
    assert q_dict.id is not None
    assert q_dict.correct_option == "A"

    # Update question
    updated_q = quiz_service.update_question(
        db_session,
        q_list.id,
        QuestionUpdate(prompt="What is 2 + 2 equal to?"),
        instructor
    )
    assert updated_q.prompt == "What is 2 + 2 equal to?"

    # Delete question
    quiz_service.delete_question(db_session, q_dict.id, instructor)
    with pytest.raises(HTTPException) as exc:
        quiz_service.get_question(db_session, q_dict.id, instructor)
    assert exc.value.status_code == 404


# 4. Instructor ownership restrictions
def test_service_instructor_ownership_restrictions(db_session):
    inst1 = create_test_user(db_session, "inst1_perm@test.com", role="instructor")
    inst2 = create_test_user(db_session, "inst2_perm@test.com", role="instructor")
    admin = create_test_user(db_session, "admin_perm@test.com", role="super_admin")

    course1 = create_test_course(db_session, inst1.id, "Inst1 Course")
    sec1 = create_test_section(db_session, course1.id, "Sec 1")
    quiz1 = quiz_service.create_quiz(db_session, sec1.id, QuizCreate(title="Quiz 1"), inst1)
    q1 = quiz_service.add_question(
        db_session, quiz1.id,
        QuestionCreate(prompt="Q1?", options=["A", "B"], correct_option="A"),
        inst1
    )

    # Inst2 cannot update quiz1
    with pytest.raises(HTTPException) as exc1:
        quiz_service.update_quiz(db_session, quiz1.id, QuizUpdate(title="Hijacked"), inst2)
    assert exc1.value.status_code == 403

    # Inst2 cannot delete quiz1
    with pytest.raises(HTTPException) as exc2:
        quiz_service.delete_quiz(db_session, quiz1.id, inst2)
    assert exc2.value.status_code == 403

    # Inst2 cannot create quiz in course1
    with pytest.raises(HTTPException) as exc3:
        quiz_service.create_quiz(db_session, sec1.id, QuizCreate(title="Inst2 Quiz"), inst2)
    assert exc3.value.status_code == 403

    # Inst2 cannot add question to quiz1
    with pytest.raises(HTTPException) as exc4:
        quiz_service.add_question(
            db_session, quiz1.id,
            QuestionCreate(prompt="Inst2 Q?", options=["X", "Y"], correct_option="X"),
            inst2
        )
    assert exc4.value.status_code == 403

    # Course in PENDING_REVIEW: instructor cannot modify
    course1.status = "PENDING_REVIEW"
    db_session.commit()

    with pytest.raises(HTTPException) as exc5:
        quiz_service.update_quiz(db_session, quiz1.id, QuizUpdate(title="Pending Update"), inst1)
    assert exc5.value.status_code == 409
    assert "pending review" in exc5.value.detail.lower()

    # Super Admin CAN update quiz regardless of course ownership
    updated_admin = quiz_service.update_quiz(
        db_session, quiz1.id,
        QuizUpdate(title="Admin Updated Quiz"),
        admin
    )
    assert updated_admin.title == "Admin Updated Quiz"


# 5. Learner read-only restrictions
def test_service_learner_read_only_restrictions(db_session):
    instructor = create_test_user(db_session, "inst_ro@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "RO Course")
    section = create_test_section(db_session, course.id, "RO Section")
    quiz = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="RO Quiz"), instructor)
    q1 = quiz_service.add_question(
        db_session, quiz.id,
        QuestionCreate(prompt="Prompt", options=["A", "B"], correct_option="A"),
        instructor
    )

    learner = create_test_user(db_session, "learner_ro@test.com", role="learner")
    enroll_test_user(db_session, learner.id, course.id)

    with pytest.raises(HTTPException) as exc1:
        quiz_service.create_quiz(db_session, section.id, QuizCreate(title="Learner Created"), learner)
    assert exc1.value.status_code == 403

    with pytest.raises(HTTPException) as exc2:
        quiz_service.update_quiz(db_session, quiz.id, QuizUpdate(title="Learner Updated"), learner)
    assert exc2.value.status_code == 403

    with pytest.raises(HTTPException) as exc3:
        quiz_service.delete_quiz(db_session, quiz.id, learner)
    assert exc3.value.status_code == 403

    with pytest.raises(HTTPException) as exc4:
        quiz_service.add_question(
            db_session, quiz.id,
            QuestionCreate(prompt="Learner Q", options=["A", "B"], correct_option="A"),
            learner
        )
    assert exc4.value.status_code == 403

    with pytest.raises(HTTPException) as exc5:
        quiz_service.delete_question(db_session, q1.id, learner)
    assert exc5.value.status_code == 403


# 6. Learner answer sanitization
def test_service_learner_answer_sanitization(db_session):
    instructor = create_test_user(db_session, "inst_sanit@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "Sanit Course", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Sanit Section")
    quiz = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="Sanit Quiz"), instructor)
    quiz_service.add_question(
        db_session, quiz.id,
        QuestionCreate(prompt="Q1?", options=["A", "B"], correct_option="A"),
        instructor
    )
    quiz_service.add_question(
        db_session, quiz.id,
        QuestionCreate(prompt="Q2?", options=["X", "Y"], correct_option="Y"),
        instructor
    )

    learner = create_test_user(db_session, "learner_sanit@test.com", role="learner")
    enroll_test_user(db_session, learner.id, course.id)

    # Learner view: must not expose correct_option
    learner_detail = quiz_service.get_quiz_detail(db_session, quiz.id, learner)
    assert isinstance(learner_detail, QuizLearnerDetailResponse)
    assert len(learner_detail.questions) == 2
    for q in learner_detail.questions:
        assert isinstance(q, QuestionLearnerResponse)
        assert not hasattr(q, "correct_option")
        assert "correct_option" not in q.model_dump()

    # Instructor view: contains correct_option
    instructor_detail = quiz_service.get_quiz_detail(db_session, quiz.id, instructor)
    assert isinstance(instructor_detail, QuizDetailResponse)
    assert len(instructor_detail.questions) == 2
    for q in instructor_detail.questions:
        assert isinstance(q, QuestionResponse)
        assert hasattr(q, "correct_option")
        assert q.correct_option in ["A", "Y"]


# 7. Unauthorized learner attempts
def test_service_unauthorized_learner_attempts(db_session):
    instructor = create_test_user(db_session, "inst_unauth@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "Unauth Course", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Unauth Section")
    quiz = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="Unauth Quiz"), instructor)
    q1 = quiz_service.add_question(
        db_session, quiz.id,
        QuestionCreate(prompt="Prompt", options=["A", "B"], correct_option="A"),
        instructor
    )

    # 1. Learner not enrolled
    unenrolled_learner = create_test_user(db_session, "learner_unenrolled@test.com", role="learner")
    with pytest.raises(HTTPException) as exc1:
        quiz_service.submit_quiz_attempt(
            db_session, quiz.id,
            QuizSubmitRequest(answers=[{"question_id": q1.id, "selected_option": "A"}]),
            unenrolled_learner
        )
    assert exc1.value.status_code == 403
    assert "actively enrolled" in exc1.value.detail.lower()

    # 2. Inactive enrollment
    inactive_learner = create_test_user(db_session, "learner_inactive@test.com", role="learner")
    enroll_test_user(db_session, inactive_learner.id, course.id, status="CANCELLED")
    with pytest.raises(HTTPException) as exc2:
        quiz_service.submit_quiz_attempt(
            db_session, quiz.id,
            QuizSubmitRequest(answers=[{"question_id": q1.id, "selected_option": "A"}]),
            inactive_learner
        )
    assert exc2.value.status_code == 403

    # 3. Unpublished course
    draft_course = create_test_course(db_session, instructor.id, "Draft Course", status="DRAFT")
    draft_sec = create_test_section(db_session, draft_course.id, "Draft Section")
    draft_quiz = quiz_service.create_quiz(db_session, draft_sec.id, QuizCreate(title="Draft Quiz"), instructor)
    q_draft = quiz_service.add_question(
        db_session, draft_quiz.id,
        QuestionCreate(prompt="Draft Q", options=["A", "B"], correct_option="A"),
        instructor
    )
    enrolled_learner = create_test_user(db_session, "learner_draft@test.com", role="learner")
    enroll_test_user(db_session, enrolled_learner.id, draft_course.id, status="ACTIVE")

    with pytest.raises(HTTPException) as exc3:
        quiz_service.submit_quiz_attempt(
            db_session, draft_quiz.id,
            QuizSubmitRequest(answers=[{"question_id": q_draft.id, "selected_option": "A"}]),
            enrolled_learner
        )
    assert exc3.value.status_code == 400
    assert "unpublished" in exc3.value.detail.lower()

    # 4. Instructor cannot submit quiz attempt
    with pytest.raises(HTTPException) as exc4:
        quiz_service.submit_quiz_attempt(
            db_session, quiz.id,
            QuizSubmitRequest(answers=[{"question_id": q1.id, "selected_option": "A"}]),
            instructor
        )
    assert exc4.value.status_code == 403
    assert "only learners" in exc4.value.detail.lower()


# 8. Correct score calculation
def test_service_correct_score_calculation(db_session):
    instructor = create_test_user(db_session, "inst_score@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "Score Course")
    section = create_test_section(db_session, course.id, "Score Section")
    quiz = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="Score Quiz", passing_score=70), instructor)

    q1 = quiz_service.add_question(db_session, quiz.id, QuestionCreate(prompt="Q1", options=["A", "B"], correct_option="A"), instructor)
    q2 = quiz_service.add_question(db_session, quiz.id, QuestionCreate(prompt="Q2", options=["A", "B"], correct_option="B"), instructor)
    q3 = quiz_service.add_question(db_session, quiz.id, QuestionCreate(prompt="Q3", options=["A", "B"], correct_option="A"), instructor)
    q4 = quiz_service.add_question(db_session, quiz.id, QuestionCreate(prompt="Q4", options=["A", "B"], correct_option="B"), instructor)

    learner = create_test_user(db_session, "learner_score@test.com", role="learner")
    enroll_test_user(db_session, learner.id, course.id)

    # 4/4 correct = 100%
    att_100 = quiz_service.submit_quiz_attempt(
        db_session, quiz.id,
        QuizSubmitRequest(answers=[
            {"question_id": q1.id, "selected_option": "A"},
            {"question_id": q2.id, "selected_option": "B"},
            {"question_id": q3.id, "selected_option": "A"},
            {"question_id": q4.id, "selected_option": "B"},
        ]),
        learner
    )
    assert att_100.score == 100
    assert att_100.correct_count == 4
    assert att_100.total_questions == 4
    assert att_100.passed is True

    # 3/4 correct = 75%
    att_75 = quiz_service.submit_quiz_attempt(
        db_session, quiz.id,
        QuizSubmitRequest(answers=[
            {"question_id": q1.id, "selected_option": "A"},
            {"question_id": q2.id, "selected_option": "B"},
            {"question_id": q3.id, "selected_option": "A"},
            {"question_id": q4.id, "selected_option": "A"},  # wrong
        ]),
        learner
    )
    assert att_75.score == 75
    assert att_75.correct_count == 3
    assert att_75.passed is True

    # 1/4 correct = 25%
    att_25 = quiz_service.submit_quiz_attempt(
        db_session, quiz.id,
        QuizSubmitRequest(answers=[
            {"question_id": q1.id, "selected_option": "A"},
            {"question_id": q2.id, "selected_option": "A"},  # wrong
            {"question_id": q3.id, "selected_option": "B"},  # wrong
            {"question_id": q4.id, "selected_option": "A"},  # wrong
        ]),
        learner
    )
    assert att_25.score == 25
    assert att_25.correct_count == 1
    assert att_25.passed is False


# 9. Passing and failing attempts
def test_service_passing_and_failing_attempts(db_session):
    instructor = create_test_user(db_session, "inst_passfail@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "PassFail Course")
    section = create_test_section(db_session, course.id, "PassFail Section")

    # Quiz with passing_score = 70
    quiz70 = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="PassFail 70", passing_score=70), instructor)
    q1 = quiz_service.add_question(db_session, quiz70.id, QuestionCreate(prompt="Q1", options=["T", "F"], correct_option="T"), instructor)
    q2 = quiz_service.add_question(db_session, quiz70.id, QuestionCreate(prompt="Q2", options=["T", "F"], correct_option="T"), instructor)

    learner = create_test_user(db_session, "learner_pf@test.com", role="learner")
    enroll_test_user(db_session, learner.id, course.id)

    # 1/2 = 50% -> fails 70 threshold
    res_fail = quiz_service.submit_quiz_attempt(
        db_session, quiz70.id,
        QuizSubmitRequest(answers=[
            {"question_id": q1.id, "selected_option": "T"},
            {"question_id": q2.id, "selected_option": "F"},
        ]),
        learner
    )
    assert res_fail.score == 50
    assert res_fail.passed is False

    # 2/2 = 100% -> passes 70 threshold
    res_pass = quiz_service.submit_quiz_attempt(
        db_session, quiz70.id,
        QuizSubmitRequest(answers=[
            {"question_id": q1.id, "selected_option": "T"},
            {"question_id": q2.id, "selected_option": "T"},
        ]),
        learner
    )
    assert res_pass.score == 100
    assert res_pass.passed is True


# 10. Empty quizzes
def test_service_empty_quiz_attempt_rejected(db_session):
    instructor = create_test_user(db_session, "inst_empty@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "Empty Course")
    section = create_test_section(db_session, course.id, "Empty Section")
    quiz = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="Empty Quiz"), instructor)

    learner = create_test_user(db_session, "learner_empty@test.com", role="learner")
    enroll_test_user(db_session, learner.id, course.id)

    with pytest.raises(HTTPException) as exc:
        quiz_service.submit_quiz_attempt(
            db_session,
            quiz.id,
            QuizSubmitRequest(answers=[{"question_id": "any-id", "selected_option": "A"}]),
            learner
        )
    assert exc.value.status_code == 400
    assert "no questions" in exc.value.detail.lower()


# 11. Invalid question IDs and answer options
def test_service_invalid_questions_and_options_rejected(db_session):
    instructor = create_test_user(db_session, "inst_invalid@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "Invalid Course")
    section = create_test_section(db_session, course.id, "Invalid Section")

    quiz_a = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="Quiz A"), instructor)
    q_a1 = quiz_service.add_question(
        db_session, quiz_a.id,
        QuestionCreate(prompt="Q A1", options=["Opt 1", "Opt 2"], correct_option="Opt 1"),
        instructor
    )

    quiz_b = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="Quiz B"), instructor)
    q_b1 = quiz_service.add_question(
        db_session, quiz_b.id,
        QuestionCreate(prompt="Q B1", options=["Opt X", "Opt Y"], correct_option="Opt X"),
        instructor
    )

    learner = create_test_user(db_session, "learner_inv@test.com", role="learner")
    enroll_test_user(db_session, learner.id, course.id)

    # 1. Foreign question ID from another quiz
    with pytest.raises(HTTPException) as exc1:
        quiz_service.submit_quiz_attempt(
            db_session,
            quiz_a.id,
            QuizSubmitRequest(answers=[{"question_id": q_b1.id, "selected_option": "Opt X"}]),
            learner
        )
    assert exc1.value.status_code == 400
    assert "does not belong to this quiz" in exc1.value.detail

    # 2. Duplicate question IDs in single attempt
    with pytest.raises(HTTPException) as exc2:
        quiz_service.submit_quiz_attempt(
            db_session,
            quiz_a.id,
            QuizSubmitRequest(answers=[
                {"question_id": q_a1.id, "selected_option": "Opt 1"},
                {"question_id": q_a1.id, "selected_option": "Opt 2"}
            ]),
            learner
        )
    assert exc2.value.status_code == 400
    assert "duplicate" in exc2.value.detail.lower()

    # 3. Invalid selected_option (not in question options)
    with pytest.raises(HTTPException) as exc3:
        quiz_service.submit_quiz_attempt(
            db_session,
            quiz_a.id,
            QuizSubmitRequest(answers=[{"question_id": q_a1.id, "selected_option": "Invalid Option"}]),
            learner
        )
    assert exc3.value.status_code == 400
    assert "not a valid option" in exc3.value.detail


# 12. Attempt persistence and ownership
def test_service_attempt_persistence_and_ownership(db_session):
    instructor = create_test_user(db_session, "inst_attown@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "AttOwn Course")
    section = create_test_section(db_session, course.id, "AttOwn Section")
    quiz = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="AttOwn Quiz"), instructor)
    q1 = quiz_service.add_question(db_session, quiz.id, QuestionCreate(prompt="Q1", options=["A", "B"], correct_option="A"), instructor)

    learner1 = create_test_user(db_session, "l1_att@test.com", role="learner")
    learner2 = create_test_user(db_session, "l2_att@test.com", role="learner")
    enroll_test_user(db_session, learner1.id, course.id)
    enroll_test_user(db_session, learner2.id, course.id)

    att1 = quiz_service.submit_quiz_attempt(
        db_session, quiz.id,
        QuizSubmitRequest(answers=[{"question_id": q1.id, "selected_option": "A"}]),
        learner1
    )

    # 1. Learner 1 lists attempts -> sees att1
    l1_attempts = quiz_service.list_quiz_attempts(db_session, quiz.id, learner1)
    assert len(l1_attempts) == 1
    assert l1_attempts[0].id == att1.id

    # 2. Learner 2 lists attempts -> empty
    l2_attempts = quiz_service.list_quiz_attempts(db_session, quiz.id, learner2)
    assert len(l2_attempts) == 0

    # 3. Learner 2 tries to get att1 -> raises 403
    with pytest.raises(HTTPException) as exc:
        quiz_service.get_quiz_attempt(db_session, att1.id, learner2)
    assert exc.value.status_code == 403
    assert "only view their own" in exc.value.detail.lower()

    # 4. Instructor lists attempts -> sees att1
    inst_attempts = quiz_service.list_quiz_attempts(db_session, quiz.id, instructor)
    assert len(inst_attempts) == 1
    assert inst_attempts[0].id == att1.id

    # 5. Instructor gets att1 -> succeeds
    fetched = quiz_service.get_quiz_attempt(db_session, att1.id, instructor)
    assert fetched.id == att1.id


# 13. Safe deletion when attempts exist
def test_service_safe_deletion_when_attempts_exist(db_session):
    instructor = create_test_user(db_session, "inst_del@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "Delete Test Course")
    section = create_test_section(db_session, course.id, "Delete Test Section")
    quiz = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="Delete Quiz"), instructor)
    q1 = quiz_service.add_question(
        db_session, quiz.id,
        QuestionCreate(prompt="Prompt?", options=["A", "B"], correct_option="A"),
        instructor
    )

    learner = create_test_user(db_session, "learner_del@test.com", role="learner")
    enroll_test_user(db_session, learner.id, course.id)

    # Submit valid attempt
    quiz_service.submit_quiz_attempt(
        db_session,
        quiz.id,
        QuizSubmitRequest(answers=[{"question_id": q1.id, "selected_option": "A"}]),
        learner
    )

    # Attempt to delete quiz -> must raise 409 Conflict
    with pytest.raises(HTTPException) as exc_quiz:
        quiz_service.delete_quiz(db_session, quiz.id, instructor)
    assert exc_quiz.value.status_code == 409
    assert "attempts exist" in exc_quiz.value.detail.lower()

    # Attempt to delete question -> must raise 409 Conflict
    with pytest.raises(HTTPException) as exc_q:
        quiz_service.delete_question(db_session, q1.id, instructor)
    assert exc_q.value.status_code == 409
    assert "attempts exist" in exc_q.value.detail.lower()


# 14. Database rollback on errors
def test_service_database_rollback_on_errors(db_session):
    instructor = create_test_user(db_session, "inst_rb@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "Rollback Course")
    section = create_test_section(db_session, course.id, "Rollback Section")

    # Mock commit to fail during create_quiz
    with patch.object(db_session, "commit", side_effect=Exception("DB Failure")):
        with patch.object(db_session, "rollback") as mock_rollback:
            with pytest.raises(Exception) as exc:
                quiz_service.create_quiz(
                    db_session,
                    section.id,
                    QuizCreate(title="Fail Quiz"),
                    instructor
                )
            assert "DB Failure" in str(exc.value)
            mock_rollback.assert_called_once()

    # Create valid quiz & question first
    quiz = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="Good Quiz"), instructor)
    q1 = quiz_service.add_question(
        db_session,
        quiz.id,
        QuestionCreate(prompt="Prompt", options=["A", "B"], correct_option="A"),
        instructor
    )
    learner = create_test_user(db_session, "learner_rb@test.com", role="learner")
    enroll_test_user(db_session, learner.id, course.id)

    # Mock commit to fail during submit_quiz_attempt
    with patch.object(db_session, "commit", side_effect=Exception("Commit Error")):
        with patch.object(db_session, "rollback") as mock_rollback:
            with pytest.raises(Exception) as exc:
                quiz_service.submit_quiz_attempt(
                    db_session,
                    quiz.id,
                    QuizSubmitRequest(answers=[{"question_id": q1.id, "selected_option": "A"}]),
                    learner
                )
            assert "Commit Error" in str(exc.value)
            mock_rollback.assert_called_once()


# ---------------------------------------------------------
# Stage 3: FastAPI Quiz API Endpoint Tests
# ---------------------------------------------------------

from app.utils.security import create_access_token


def auth_header(user):
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


# 1. Successful quiz creation and retrieval via API
def test_api_quiz_creation_and_retrieval(client, db_session):
    instructor = create_test_user(db_session, "api_inst_cr@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "API Create Course")
    section = create_test_section(db_session, course.id, "API Create Section")

    # POST /api/v1/sections/{section_id}/quizzes
    payload = {"title": "API Section Quiz", "passing_score": 75}
    res_post = client.post(
        f"/api/v1/sections/{section.id}/quizzes",
        headers=auth_header(instructor),
        json=payload
    )
    assert res_post.status_code == 201
    created_quiz = res_post.json()
    assert created_quiz["title"] == "API Section Quiz"
    assert created_quiz["passing_score"] == 75
    assert created_quiz["section_id"] == section.id

    quiz_id = created_quiz["id"]

    # GET /api/v1/sections/{section_id}/quizzes
    res_list = client.get(
        f"/api/v1/sections/{section.id}/quizzes",
        headers=auth_header(instructor)
    )
    assert res_list.status_code == 200
    quizzes = res_list.json()
    assert len(quizzes) == 1
    assert quizzes[0]["id"] == quiz_id

    # GET /api/v1/quizzes/{quiz_id}
    res_get = client.get(
        f"/api/v1/quizzes/{quiz_id}",
        headers=auth_header(instructor)
    )
    assert res_get.status_code == 200
    detail = res_get.json()
    assert detail["id"] == quiz_id
    assert detail["title"] == "API Section Quiz"

    # POST /api/v1/quizzes with section_id in body
    res_post_root = client.post(
        "/api/v1/quizzes",
        headers=auth_header(instructor),
        json={"title": "Root Created Quiz", "section_id": section.id, "passing_score": 80}
    )
    assert res_post_root.status_code == 201
    assert res_post_root.json()["title"] == "Root Created Quiz"


# 2. Authentication and authorization failures
def test_api_auth_and_permission_failures(client, db_session):
    instructor = create_test_user(db_session, "api_inst_perm@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "API Perm Course")
    section = create_test_section(db_session, course.id, "API Perm Section")
    quiz = quiz_service.create_quiz(
        db_session, section.id, QuizCreate(title="Auth Quiz"), instructor
    )

    learner = create_test_user(db_session, "api_learner_perm@test.com", role="learner")

    # Missing token -> 401 Unauthorized
    res_no_auth = client.post(
        f"/api/v1/sections/{section.id}/quizzes",
        json={"title": "Unauthorized"}
    )
    assert res_no_auth.status_code == 401

    # Learner forbidden from creating quiz -> 403 Forbidden
    res_learner_post = client.post(
        f"/api/v1/sections/{section.id}/quizzes",
        headers=auth_header(learner),
        json={"title": "Learner Quiz"}
    )
    assert res_learner_post.status_code == 403

    # Learner forbidden from updating quiz -> 403 Forbidden
    res_learner_put = client.put(
        f"/api/v1/quizzes/{quiz.id}",
        headers=auth_header(learner),
        json={"title": "Hacked Title"}
    )
    assert res_learner_put.status_code == 403

    # Learner forbidden from deleting quiz -> 403 Forbidden
    res_learner_del = client.delete(
        f"/api/v1/quizzes/{quiz.id}",
        headers=auth_header(learner)
    )
    assert res_learner_del.status_code == 403


# 3. Instructor ownership restrictions via API
def test_api_instructor_ownership_restrictions(client, db_session):
    inst1 = create_test_user(db_session, "api_inst1@test.com", role="instructor")
    inst2 = create_test_user(db_session, "api_inst2@test.com", role="instructor")
    admin = create_test_user(db_session, "api_admin@test.com", role="super_admin")

    course1 = create_test_course(db_session, inst1.id, "Inst1 Course")
    sec1 = create_test_section(db_session, course1.id, "Sec 1")
    quiz1 = quiz_service.create_quiz(db_session, sec1.id, QuizCreate(title="Inst1 Quiz"), inst1)

    # Inst2 cannot update quiz1 -> 403
    res_up = client.put(
        f"/api/v1/quizzes/{quiz1.id}",
        headers=auth_header(inst2),
        json={"title": "Hijacked"}
    )
    assert res_up.status_code == 403

    # Inst2 cannot delete quiz1 -> 403
    res_del = client.delete(
        f"/api/v1/quizzes/{quiz1.id}",
        headers=auth_header(inst2)
    )
    assert res_del.status_code == 403

    # Inst2 cannot add question to quiz1 -> 403
    res_q = client.post(
        f"/api/v1/quizzes/{quiz1.id}/questions",
        headers=auth_header(inst2),
        json={"prompt": "Hijacked Q?", "options": ["A", "B"], "correct_option": "A"}
    )
    assert res_q.status_code == 403

    # Course in PENDING_REVIEW: Inst1 cannot modify -> 409
    course1.status = "PENDING_REVIEW"
    db_session.commit()

    res_pending = client.put(
        f"/api/v1/quizzes/{quiz1.id}",
        headers=auth_header(inst1),
        json={"title": "Pending Attempt"}
    )
    assert res_pending.status_code == 409

    # Super Admin CAN update -> 200
    res_admin = client.put(
        f"/api/v1/quizzes/{quiz1.id}",
        headers=auth_header(admin),
        json={"title": "Admin Fixed"}
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["title"] == "Admin Fixed"


# 4. Question management via API
def test_api_question_management(client, db_session):
    instructor = create_test_user(db_session, "api_inst_qm@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "QM Course")
    section = create_test_section(db_session, course.id, "QM Section")
    quiz = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="QM Quiz"), instructor)

    # POST question
    res_post_q = client.post(
        f"/api/v1/quizzes/{quiz.id}/questions",
        headers=auth_header(instructor),
        json={"prompt": "What is Python?", "options": ["Snake", "Language"], "correct_option": "Language"}
    )
    assert res_post_q.status_code == 201
    q_data = res_post_q.json()
    assert q_data["prompt"] == "What is Python?"
    assert q_data["correct_option"] == "Language"
    q_id = q_data["id"]

    # GET questions list
    res_list_q = client.get(
        f"/api/v1/quizzes/{quiz.id}/questions",
        headers=auth_header(instructor)
    )
    assert res_list_q.status_code == 200
    assert len(res_list_q.json()) == 1

    # PUT question nested
    res_put_q = client.put(
        f"/api/v1/quizzes/{quiz.id}/questions/{q_id}",
        headers=auth_header(instructor),
        json={"prompt": "What is Python language?"}
    )
    assert res_put_q.status_code == 200
    assert res_put_q.json()["prompt"] == "What is Python language?"

    # Direct PUT /api/v1/questions/{question_id}
    res_put_direct = client.put(
        f"/api/v1/questions/{q_id}",
        headers=auth_header(instructor),
        json={"prompt": "What is Python programming language?"}
    )
    assert res_put_direct.status_code == 200
    assert res_put_direct.json()["prompt"] == "What is Python programming language?"

    # Direct DELETE /api/v1/questions/{question_id}
    res_del_direct = client.delete(
        f"/api/v1/questions/{q_id}",
        headers=auth_header(instructor)
    )
    assert res_del_direct.status_code == 200
    assert "deleted" in res_del_direct.json()["message"].lower()


# 5. Learner answer sanitization via API
def test_api_learner_answer_sanitization(client, db_session):
    instructor = create_test_user(db_session, "api_inst_san@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "San API Course", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "San API Section")
    quiz = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="San API Quiz"), instructor)

    quiz_service.add_question(
        db_session, quiz.id,
        QuestionCreate(prompt="Q1", options=["Alpha", "Beta"], correct_option="Alpha"),
        instructor
    )
    quiz_service.add_question(
        db_session, quiz.id,
        QuestionCreate(prompt="Q2", options=["Gamma", "Delta"], correct_option="Delta"),
        instructor
    )

    learner = create_test_user(db_session, "api_learner_san@test.com", role="learner")
    enroll_test_user(db_session, learner.id, course.id)

    # 1. Learner GET /api/v1/quizzes/{quiz_id} -> correct_option must not appear anywhere
    res_learner = client.get(f"/api/v1/quizzes/{quiz.id}", headers=auth_header(learner))
    assert res_learner.status_code == 200
    data_learner = res_learner.json()
    assert len(data_learner["questions"]) == 2
    for q in data_learner["questions"]:
        assert "correct_option" not in q

    # 2. Learner GET /api/v1/quizzes/{quiz_id}/questions -> correct_option stripped
    res_learner_q = client.get(f"/api/v1/quizzes/{quiz.id}/questions", headers=auth_header(learner))
    assert res_learner_q.status_code == 200
    for q in res_learner_q.json():
        assert "correct_option" not in q

    # 3. Instructor GET /api/v1/quizzes/{quiz_id} -> correct_option IS present
    res_inst = client.get(f"/api/v1/quizzes/{quiz.id}", headers=auth_header(instructor))
    assert res_inst.status_code == 200
    data_inst = res_inst.json()
    assert len(data_inst["questions"]) == 2
    assert data_inst["questions"][0]["correct_option"] == "Alpha"
    assert data_inst["questions"][1]["correct_option"] == "Delta"


# 6. Quiz submission and score calculation via API
def test_api_quiz_submission_and_scoring(client, db_session):
    instructor = create_test_user(db_session, "api_inst_sub@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "Sub API Course", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Sub API Section")
    quiz = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="Sub Quiz", passing_score=70), instructor)

    q1 = quiz_service.add_question(
        db_session, quiz.id,
        QuestionCreate(prompt="Q1", options=["A", "B"], correct_option="A"),
        instructor
    )
    q2 = quiz_service.add_question(
        db_session, quiz.id,
        QuestionCreate(prompt="Q2", options=["C", "D"], correct_option="D"),
        instructor
    )

    learner = create_test_user(db_session, "api_learner_sub@test.com", role="learner")
    enroll_test_user(db_session, learner.id, course.id)

    # Perfect score: 2/2 = 100%
    payload_perfect = {
        "answers": [
            {"question_id": q1.id, "selected_option": "A"},
            {"question_id": q2.id, "selected_option": "D"},
        ]
    }
    res_100 = client.post(
        f"/api/v1/quizzes/{quiz.id}/attempt",
        headers=auth_header(learner),
        json=payload_perfect
    )
    assert res_100.status_code == 201
    attempt_100 = res_100.json()
    assert attempt_100["score"] == 100
    assert attempt_100["passed"] is True
    assert attempt_100["correct_count"] == 2
    assert attempt_100["total_questions"] == 2

    # Failing score: 1/2 = 50%
    payload_fail = {
        "answers": [
            {"question_id": q1.id, "selected_option": "A"},
            {"question_id": q2.id, "selected_option": "C"},  # wrong
        ]
    }
    res_50 = client.post(
        f"/api/v1/quizzes/{quiz.id}/attempt",
        headers=auth_header(learner),
        json=payload_fail
    )
    assert res_50.status_code == 201
    attempt_50 = res_50.json()
    assert attempt_50["score"] == 50
    assert attempt_50["passed"] is False

    # Security: Injected score/passed fields rejected (422)
    payload_hacked = {
        "answers": [{"question_id": q1.id, "selected_option": "A"}],
        "score": 100,
        "passed": True
    }
    res_hacked = client.post(
        f"/api/v1/quizzes/{quiz.id}/attempt",
        headers=auth_header(learner),
        json=payload_hacked
    )
    assert res_hacked.status_code == 422


# 7. Attempt history and ownership via API
def test_api_attempt_history_and_ownership(client, db_session):
    instructor = create_test_user(db_session, "api_inst_hist@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "Hist Course", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Hist Section")
    quiz = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="Hist Quiz"), instructor)
    q1 = quiz_service.add_question(
        db_session, quiz.id,
        QuestionCreate(prompt="Prompt", options=["A", "B"], correct_option="A"),
        instructor
    )

    learner1 = create_test_user(db_session, "api_l1_hist@test.com", role="learner")
    learner2 = create_test_user(db_session, "api_l2_hist@test.com", role="learner")
    enroll_test_user(db_session, learner1.id, course.id)
    enroll_test_user(db_session, learner2.id, course.id)

    # Learner 1 submits
    res_sub = client.post(
        f"/api/v1/quizzes/{quiz.id}/attempt",
        headers=auth_header(learner1),
        json={"answers": [{"question_id": q1.id, "selected_option": "A"}]}
    )
    assert res_sub.status_code == 201
    att1_id = res_sub.json()["id"]

    # Learner 1 views history -> has 1 attempt
    res_l1_hist = client.get(f"/api/v1/quizzes/{quiz.id}/attempts", headers=auth_header(learner1))
    assert res_l1_hist.status_code == 200
    assert len(res_l1_hist.json()) == 1
    assert res_l1_hist.json()[0]["id"] == att1_id

    # Learner 2 views history -> empty
    res_l2_hist = client.get(f"/api/v1/quizzes/{quiz.id}/attempts", headers=auth_header(learner2))
    assert res_l2_hist.status_code == 200
    assert len(res_l2_hist.json()) == 0

    # Learner 2 tries to access Learner 1's attempt -> 403 Forbidden
    res_l2_get = client.get(f"/api/v1/quizzes/{quiz.id}/attempts/{att1_id}", headers=auth_header(learner2))
    assert res_l2_get.status_code == 403

    # Instructor views all attempts -> 1 attempt
    res_inst_hist = client.get(f"/api/v1/quizzes/{quiz.id}/attempts", headers=auth_header(instructor))
    assert res_inst_hist.status_code == 200
    assert len(res_inst_hist.json()) == 1


# 8. Invalid request bodies, missing resources, and conflict handling via API
def test_api_invalid_request_bodies_and_errors(client, db_session):
    instructor = create_test_user(db_session, "api_inst_err@test.com", role="instructor")
    course = create_test_course(db_session, instructor.id, "Err Course", status="PUBLISHED")
    section = create_test_section(db_session, course.id, "Err Section")
    quiz = quiz_service.create_quiz(db_session, section.id, QuizCreate(title="Err Quiz"), instructor)
    q1 = quiz_service.add_question(
        db_session, quiz.id,
        QuestionCreate(prompt="Prompt", options=["A", "B"], correct_option="A"),
        instructor
    )

    learner = create_test_user(db_session, "api_learner_err@test.com", role="learner")
    enroll_test_user(db_session, learner.id, course.id)

    # 404 for non-existent quiz
    res_404 = client.get("/api/v1/quizzes/nonexistent-quiz-id", headers=auth_header(instructor))
    assert res_404.status_code == 404

    # 422 for empty title
    res_empty_title = client.post(
        f"/api/v1/sections/{section.id}/quizzes",
        headers=auth_header(instructor),
        json={"title": "   "}
    )
    assert res_empty_title.status_code == 422

    # 422 for invalid passing score
    res_inv_score = client.post(
        f"/api/v1/sections/{section.id}/quizzes",
        headers=auth_header(instructor),
        json={"title": "Score Quiz", "passing_score": 150}
    )
    assert res_inv_score.status_code == 422

    # 422 for question with only 1 option
    res_few_opts = client.post(
        f"/api/v1/quizzes/{quiz.id}/questions",
        headers=auth_header(instructor),
        json={"prompt": "P?", "options": ["Solo"], "correct_option": "Solo"}
    )
    assert res_few_opts.status_code == 422

    # 400 for duplicate question IDs in attempt
    res_dup = client.post(
        f"/api/v1/quizzes/{quiz.id}/attempt",
        headers=auth_header(learner),
        json={
            "answers": [
                {"question_id": q1.id, "selected_option": "A"},
                {"question_id": q1.id, "selected_option": "B"},
            ]
        }
    )
    assert res_dup.status_code == 400
    assert "duplicate" in res_dup.json()["detail"].lower()

    # 400 for invalid selected_option
    res_inv_opt = client.post(
        f"/api/v1/quizzes/{quiz.id}/attempt",
        headers=auth_header(learner),
        json={"answers": [{"question_id": q1.id, "selected_option": "Invalid Option"}]}
    )
    assert res_inv_opt.status_code == 400

    # Submit attempt so quiz has attempts
    client.post(
        f"/api/v1/quizzes/{quiz.id}/attempt",
        headers=auth_header(learner),
        json={"answers": [{"question_id": q1.id, "selected_option": "A"}]}
    )

    # 409 Conflict when deleting quiz with attempts
    res_conflict = client.delete(
        f"/api/v1/quizzes/{quiz.id}",
        headers=auth_header(instructor)
    )
    assert res_conflict.status_code == 409
    assert "attempts exist" in res_conflict.json()["detail"].lower()
