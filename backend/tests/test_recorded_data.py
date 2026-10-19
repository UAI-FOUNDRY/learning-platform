"""The columns added in migrations 0002/0003 are actually written by the API."""
from datetime import datetime

from app.models import Enrollment, Progress, Question, Quiz, QuizAttempt, Section, Submission
from app.models.assignment import Assignment
from tests.factories import auth, enroll, make_course, make_user

API = "/api/v1"


def _quiz(db, course, passing=50):
    section = db.query(Section).filter(Section.course_id == course.id).first()
    quiz = Quiz(section_id=section.id, title="Quiz", passing_score=passing)
    db.add(quiz)
    db.flush()
    qs = [
        Question(quiz_id=quiz.id, prompt="2+2?", options=["3", "4"], correct_option="4", points=2, order_index=0),
        Question(quiz_id=quiz.id, prompt="Sky?", options=["blue", "green"], correct_option="blue", points=1, order_index=1),
    ]
    db.add_all(qs)
    db.commit()
    return quiz, qs


def test_quiz_attempt_stores_counts_numbers_and_each_answer(client, db_session):
    inst = make_user(db_session, "instructor")
    learner = make_user(db_session)
    course, _ = make_course(db_session, inst)
    enroll(db_session, learner, course)
    quiz, qs = _quiz(db_session, course)

    body = {"answers": [{"question_id": qs[0].id, "selected_option": "4"},
                        {"question_id": qs[1].id, "selected_option": "green"}]}
    r1 = client.post(f"{API}/quizzes/{quiz.id}/attempt", headers=auth(learner), json=body)
    assert r1.status_code == 201, r1.text
    r2 = client.post(f"{API}/quizzes/{quiz.id}/attempt", headers=auth(learner), json=body)
    assert r2.status_code == 201

    db_session.expire_all()
    attempts = db_session.query(QuizAttempt).filter_by(quiz_id=quiz.id).order_by(QuizAttempt.attempt_number).all()
    assert [a.attempt_number for a in attempts] == [1, 2]
    a = attempts[0]
    assert (a.correct_count, a.total_questions, a.status) == (1, 2, "submitted")
    assert a.started_at is not None
    by_q = {x.question_id: x for x in a.answers}
    assert by_q[qs[0].id].is_correct and by_q[qs[0].id].points_awarded == 2
    assert by_q[qs[0].id].selected_options == ["4"]
    assert not by_q[qs[1].id].is_correct and by_q[qs[1].id].points_awarded == 0


def test_unanswered_question_is_recorded_as_wrong(client, db_session):
    inst = make_user(db_session, "instructor")
    learner = make_user(db_session)
    course, _ = make_course(db_session, inst)
    enroll(db_session, learner, course)
    quiz, qs = _quiz(db_session, course)
    r = client.post(f"{API}/quizzes/{quiz.id}/attempt", headers=auth(learner),
                    json={"answers": [{"question_id": qs[1].id, "selected_option": "blue"}]})
    assert r.status_code == 201
    attempt = db_session.query(QuizAttempt).filter_by(quiz_id=quiz.id).one()
    assert len(attempt.answers) == 2 and attempt.correct_count == 1


def _assignment(db, course):
    section = db.query(Section).filter(Section.course_id == course.id).first()
    a = Assignment(section_id=section.id, title="Essay")
    db.add(a)
    db.commit()
    return a


def test_assignment_grading_and_resubmission_fields(client, db_session):
    inst = make_user(db_session, "instructor")
    learner = make_user(db_session)
    course, _ = make_course(db_session, inst)
    enroll(db_session, learner, course)
    asg = _assignment(db_session, course)

    sub = client.post(f"{API}/assignments/{asg.id}/submit", headers=auth(learner),
                      json={"submission_url": "https://example.com/v1"})
    assert sub.status_code == 201 and sub.json()["status"] == "submitted" and sub.json()["resubmission_count"] == 0
    sid = sub.json()["id"]

    g = client.put(f"{API}/assignments/{asg.id}/submissions/{sid}/grade", headers=auth(inst),
                   json={"grade": "A", "feedback": "  Great structure  "})
    assert g.status_code == 200, g.text
    body = g.json()
    assert body["status"] == "graded" and body["feedback"] == "Great structure" and body["graded_at"]
    row = db_session.get(Submission, sid)
    db_session.refresh(row)
    assert row.graded_by == inst.id

    again = client.post(f"{API}/assignments/{asg.id}/submit", headers=auth(learner),
                        json={"submission_url": "https://example.com/v2"})
    assert again.status_code in (200, 201)
    assert again.json()["status"] == "submitted" and again.json()["resubmission_count"] == 1
    assert again.json()["grade"] is None and again.json()["feedback"] is None
    db_session.refresh(row)
    assert row.graded_by is None and row.graded_at is None


def test_progress_records_completion_time_position_and_resume_point(client, db_session):
    inst = make_user(db_session, "instructor")
    learner = make_user(db_session)
    course, lectures = make_course(db_session, inst, lectures=3)
    enrollment = enroll(db_session, learner, course)

    # position-only heartbeat does not complete the lecture
    r = client.post(f"{API}/progress/lecture/{lectures[0].id}", headers=auth(learner),
                    json={"last_position_seconds": 42})
    assert r.status_code == 200
    assert r.json()["is_completed"] is False and r.json()["last_position_seconds"] == 42
    assert r.json()["completed_at"] is None

    # empty body still means "completed" (old behaviour)
    r = client.post(f"{API}/progress/lecture/{lectures[0].id}", headers=auth(learner))
    assert r.json()["is_completed"] is True and r.json()["completed_at"] is not None
    assert r.json()["last_position_seconds"] == 42  # not wiped

    # un-completing clears completed_at
    r = client.post(f"{API}/progress/lecture/{lectures[0].id}", headers=auth(learner), json={"is_completed": False})
    assert r.json()["is_completed"] is False and r.json()["completed_at"] is None

    client.post(f"{API}/progress/lecture/{lectures[1].id}", headers=auth(learner), json={"last_position_seconds": 5})
    db_session.expire_all()
    e = db_session.get(Enrollment, enrollment.id)
    assert e.last_lecture_id == lectures[1].id and e.last_accessed_at is not None


def test_negative_position_rejected(client, db_session):
    inst = make_user(db_session, "instructor")
    learner = make_user(db_session)
    course, lectures = make_course(db_session, inst)
    enroll(db_session, learner, course)
    r = client.post(f"{API}/progress/lecture/{lectures[0].id}", headers=auth(learner), json={"last_position_seconds": -1})
    assert r.status_code == 422
