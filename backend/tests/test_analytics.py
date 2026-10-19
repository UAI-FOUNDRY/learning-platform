from app.models import Question, Quiz, Section
from app.models.assignment import Assignment
from tests.factories import auth, enroll, make_course, make_user

API = "/api/v1"


def build(client, db):
    """1 instructor, 1 published course with 3 lectures, learners A (finishes), B (1 lecture), C (nothing)."""
    admin, inst = make_user(db, "super_admin"), make_user(db, "instructor", full_name="Ina Instructor")
    a, b, c = make_user(db), make_user(db), make_user(db)
    course, lecs = make_course(db, inst, lectures=3, title="Python 101")
    for u in (a, b, c):
        enroll(db, u, course)
    for lec in lecs:
        client.post(f"{API}/progress/lecture/{lec.id}", headers=auth(a), json={"is_completed": True})
    client.post(f"{API}/progress/lecture/{lecs[0].id}", headers=auth(b), json={"is_completed": True})

    section = db.query(Section).filter_by(course_id=course.id).first()
    quiz = Quiz(section_id=section.id, title="Loops", passing_score=50)
    asg = Assignment(section_id=section.id, title="Essay")
    db.add_all([quiz, asg])
    db.flush()
    q1 = Question(quiz_id=quiz.id, prompt="Q1", options=["x", "y"], correct_option="x", order_index=0)
    q2 = Question(quiz_id=quiz.id, prompt="Q2", options=["x", "y"], correct_option="x", order_index=1)
    db.add_all([q1, q2])
    db.commit()
    # A answers both right (100), B gets one right (50, passes), C gets none right (0)
    def attempt(u, ans1, ans2):
        client.post(f"{API}/quizzes/{quiz.id}/attempt", headers=auth(u),
                    json={"answers": [{"question_id": q1.id, "selected_option": ans1},
                                      {"question_id": q2.id, "selected_option": ans2}]})
    attempt(a, "x", "x"); attempt(b, "x", "y"); attempt(c, "y", "y")

    sub = client.post(f"{API}/assignments/{asg.id}/submit", headers=auth(a), json={"submission_url": "https://e.example/1"}).json()
    client.post(f"{API}/assignments/{asg.id}/submit", headers=auth(b), json={"submission_url": "https://e.example/2"})
    client.put(f"{API}/assignments/{asg.id}/submissions/{sub['id']}/grade", headers=auth(inst), json={"grade": "A"})

    client.post(f"{API}/reviews", headers=auth(a), json={"course_id": course.id, "rating": 5})
    client.post(f"{API}/reviews", headers=auth(b), json={"course_id": course.id, "rating": 3})
    return admin, inst, course, lecs, quiz


def test_course_analytics(client, db_session):
    admin, inst, course, lecs, quiz = build(client, db_session)
    d = client.get(f"{API}/analytics/courses/{course.id}", headers=auth(inst)).json()

    s = d["summary"]
    assert (s["enrollments"], s["completed"], s["active"]) == (3, 1, 2)
    assert s["completion_rate"] == 33.3
    assert s["average_progress_percent"] == 44.4          # (3 + 1 + 0) / (3 learners * 3 lectures)
    assert s["average_rating"] == 4.0 and s["review_count"] == 2 and s["certificates_issued"] == 1

    assert [l["completed_by"] for l in d["lectures"]] == [2, 1, 1]
    assert d["lectures"][0]["completion_rate"] == 66.7 and d["lectures"][0]["section_title"] == "Section 1"

    qz = d["quizzes"][0]
    assert (qz["attempts"], qz["learners"], qz["average_score"], qz["pass_rate"]) == (3, 3, 50.0, 66.7)
    assert [(q["answered"], q["correct_rate"]) for q in qz["questions"]] == [(3, 66.7), (3, 33.3)]

    asg = d["assignments"][0]
    assert (asg["submissions"], asg["graded"], asg["pending_grading"]) == (2, 1, 1)
    assert d["rating_distribution"] == {"1": 0, "2": 0, "3": 1, "4": 0, "5": 1}


def test_series_has_one_row_per_day_and_counts_today(client, db_session):
    admin, inst, course, *_ = build(client, db_session)
    d = client.get(f"{API}/analytics/courses/{course.id}", headers=auth(inst), params={"days": 14}).json()
    assert len(d["series"]) == 14 and d["period"]["days"] == 14
    today = d["series"][-1]
    assert today["date"] == d["period"]["to"] and today["enrollments"] == 3 and today["completions"] == 1
    assert sum(p["enrollments"] for p in d["series"][:-1]) == 0


def test_course_analytics_permissions(client, db_session):
    admin, inst, course, *_ = build(client, db_session)
    assert client.get(f"{API}/analytics/courses/{course.id}", headers=auth(admin)).status_code == 200
    assert client.get(f"{API}/analytics/courses/{course.id}", headers=auth(make_user(db_session, "instructor"))).status_code == 404
    assert client.get(f"{API}/analytics/courses/{course.id}", headers=auth(make_user(db_session))).status_code == 403
    assert client.get(f"{API}/analytics/courses/nope", headers=auth(admin)).status_code == 404
    assert client.get(f"{API}/analytics/courses/{course.id}").status_code == 401
    assert client.get(f"{API}/analytics/courses/{course.id}", headers=auth(admin), params={"days": 2}).status_code == 422


def test_instructor_analytics(client, db_session):
    admin, inst, course, *_ = build(client, db_session)
    make_course(db_session, inst, status="draft")            # a draft with no learners
    make_course(db_session, make_user(db_session, "instructor"))  # someone else's course: must not count
    d = client.get(f"{API}/analytics/instructor", headers=auth(inst)).json()
    s = d["summary"]
    assert (s["courses"], s["published_courses"], s["total_enrollments"], s["completions"]) == (2, 1, 3, 1)
    assert (s["active_learners"], s["completion_rate"], s["average_rating"], s["review_count"]) == (2, 33.3, 4.0, 2)
    assert s["certificates_issued"] == 1
    row = next(r for r in d["courses"] if r["course_id"] == course.id)
    assert row["average_quiz_score"] == 50.0 and row["enrollments"] == 3
    assert d["series"][-1]["enrollments"] == 3

    # admin must say which instructor
    assert client.get(f"{API}/analytics/instructor", headers=auth(admin)).status_code == 400
    same = client.get(f"{API}/analytics/instructor", headers=auth(admin), params={"instructor_id": inst.id}).json()
    assert same["summary"] == s
    assert client.get(f"{API}/analytics/instructor", headers=auth(make_user(db_session))).status_code == 403


def test_instructor_without_courses_gets_zeros(client, db_session):
    inst = make_user(db_session, "instructor")
    d = client.get(f"{API}/analytics/instructor", headers=auth(inst)).json()
    assert d["summary"]["courses"] == 0 and d["summary"]["completion_rate"] == 0.0
    assert d["summary"]["average_rating"] is None and d["courses"] == []


def test_platform_analytics(client, db_session):
    admin, inst, course, *_ = build(client, db_session)
    other_inst = make_user(db_session, "instructor", full_name="Olly Other")
    c2, _ = make_course(db_session, other_inst, title="Data 101")
    enroll(db_session, make_user(db_session), c2)

    d = client.get(f"{API}/analytics/platform", headers=auth(admin)).json()
    t = d["totals_in_period"]
    assert t["enrollments"] == 4 and t["completions"] == 1 and t["certificates"] == 1
    assert t["new_users"] == 7
    assert [c["title"] for c in d["top_courses"]] == ["Python 101", "Data 101"]
    assert d["top_courses"][0]["enrollments"] == 3 and d["top_courses"][0]["instructor_name"] == "Ina Instructor"
    assert [i["name"] for i in d["top_instructors"]] == ["Ina Instructor", "Olly Other"]
    cat = d["categories"]
    assert sum(c["enrollments"] for c in cat) == 4 and sum(c["courses"] for c in cat) == 2
    assert len(d["series"]) == 30

    assert client.get(f"{API}/analytics/platform", headers=auth(inst)).status_code == 403
