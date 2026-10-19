from datetime import datetime, timedelta

from app.models import Question, Quiz, Section
from app.models.gamification import Badge, PointTransaction, UserBadge, UserStreak
from tests.factories import auth, enroll, make_course, make_user

API = "/api/v1"
G = f"{API}/gamification"


def _seed_badges(db):
    rows = [
        Badge(code="first_lecture", name="First Step", category="learning", points=10, criteria={"event": "lecture_completed", "count": 1}),
        Badge(code="first_course", name="Course Finisher", category="milestone", points=100, criteria={"event": "course_completed", "count": 1}),
        Badge(code="first_quiz_passed", name="Quiz Taker", category="quiz", points=20, criteria={"event": "quiz_passed", "count": 1}),
        Badge(code="perfect_quiz", name="Perfectionist", category="quiz", points=50, criteria={"event": "quiz_score", "min_score": 100}),
        Badge(code="streak_3", name="On a Roll", category="learning", points=30, criteria={"event": "learning_streak", "days": 3}),
        Badge(code="first_certificate", name="Certified", category="milestone", points=100, criteria={"event": "certificate_issued", "count": 1}),
    ]
    db.add_all(rows)
    db.commit()


def _setup(db):
    teacher, learner = make_user(db, "instructor"), make_user(db)
    course, lectures = make_course(db, teacher, lectures=2)
    enroll(db, learner, course)
    return teacher, learner, course, lectures


def _complete(client, user, lecture):
    return client.post(f"{API}/progress/lecture/{lecture.id}", headers=auth(user), json={"is_completed": True})


def test_completing_lectures_earns_points_once(client, db_session):
    _seed_badges(db_session)
    teacher, learner, course, lectures = _setup(db_session)
    assert client.get(f"{G}/me", headers=auth(learner)).json()["total_points"] == 0
    assert _complete(client, learner, lectures[0]).status_code == 200
    me = client.get(f"{G}/me", headers=auth(learner)).json()
    assert me["total_points"] == 10 + 10      # lecture + "First Step" badge bonus
    assert me["badges_earned"] == 1 and me["learning_streak"]["current"] == 1 and me["learning_streak"]["active_today"]
    _complete(client, learner, lectures[0])    # same lecture again: nothing new
    assert client.get(f"{G}/me", headers=auth(learner)).json()["total_points"] == 20
    history = client.get(f"{G}/me/points", headers=auth(learner)).json()
    assert {h["reason"] for h in history} == {"lecture_completed", "badge"}


def test_finishing_a_course_awards_course_certificate_and_badges(client, db_session):
    _seed_badges(db_session)
    teacher, learner, course, lectures = _setup(db_session)
    for lec in lectures:
        _complete(client, learner, lec)
    badges = {b["code"] for b in client.get(f"{G}/me/badges?earned_only=true", headers=auth(learner)).json()}
    assert {"first_lecture", "first_course"} <= badges
    reasons = {h["reason"] for h in client.get(f"{G}/me/points?limit=100", headers=auth(learner)).json()}
    assert "course_completed" in reasons
    # certificate auto-issue is on by default in tests when the setting row is absent
    assert ("certificate_issued" in reasons) == ("first_certificate" in badges)
    notes = client.get(f"{API}/notifications", headers=auth(learner)).json()
    assert any(n["type"] == "badge_earned" for n in notes)


def test_quiz_pass_and_perfect_score(client, db_session):
    _seed_badges(db_session)
    teacher, learner, course, lectures = _setup(db_session)
    section = db_session.query(Section).filter_by(course_id=course.id).first()
    quiz = Quiz(section_id=section.id, title="Q", passing_score=60)
    db_session.add(quiz)
    db_session.flush()
    db_session.add(Question(quiz_id=quiz.id, prompt="?", options=["a", "b"], correct_option="a"))
    db_session.commit()
    q = db_session.query(Question).filter_by(quiz_id=quiz.id).first()
    r = client.post(f"{API}/quizzes/{quiz.id}/attempts", headers=auth(learner), json={"answers": [{"question_id": q.id, "selected_option": "b"}]})
    assert r.status_code in (200, 201) and r.json()["passed"] is False
    assert client.get(f"{G}/me", headers=auth(learner)).json()["total_points"] == 0
    r = client.post(f"{API}/quizzes/{quiz.id}/attempts", headers=auth(learner), json={"answers": [{"question_id": q.id, "selected_option": "a"}]})
    assert r.json()["passed"] is True
    codes = {b["code"] for b in client.get(f"{G}/me/badges?earned_only=true", headers=auth(learner)).json()}
    assert {"first_quiz_passed", "perfect_quiz"} <= codes
    r = client.post(f"{API}/quizzes/{quiz.id}/attempts", headers=auth(learner), json={"answers": [{"question_id": q.id, "selected_option": "a"}]})
    pts = [h for h in client.get(f"{G}/me/points?limit=100", headers=auth(learner)).json() if h["reason"] == "quiz_passed"]
    assert len(pts) == 1                       # passing the same quiz again earns nothing more
    acts = client.get(f"{G}/me/activity?days=7", headers=auth(learner)).json()
    assert len(acts) == 7 and acts[-1]["quizzes_taken"] == 3


def test_streak_grows_resets_and_awards_badge(client, db_session):
    _seed_badges(db_session)
    teacher, learner, course, lectures = _setup(db_session)
    yesterday = datetime.utcnow().date() - timedelta(days=1)
    db_session.add(UserStreak(user_id=learner.id, streak_type="learning", current_length=2, longest_length=2, last_activity_date=yesterday))
    db_session.commit()
    _complete(client, learner, lectures[0])
    me = client.get(f"{G}/me", headers=auth(learner)).json()
    assert me["learning_streak"]["current"] == 3 and me["learning_streak"]["longest"] == 3
    assert "streak_3" in {b["code"] for b in client.get(f"{G}/me/badges?earned_only=true", headers=auth(learner)).json()}

    other = make_user(db_session)
    enroll(db_session, other, course)
    db_session.add(UserStreak(user_id=other.id, streak_type="learning", current_length=9, longest_length=9,
                              last_activity_date=datetime.utcnow().date() - timedelta(days=3)))
    db_session.commit()
    assert client.get(f"{G}/me", headers=auth(other)).json()["learning_streak"]["current"] == 0   # broken streak shows 0
    _complete(client, other, lectures[0])
    s = client.get(f"{G}/me", headers=auth(other)).json()["learning_streak"]
    assert s["current"] == 1 and s["longest"] == 9


def test_level_math(client, db_session):
    learner = make_user(db_session)
    db_session.add(PointTransaction(user_id=learner.id, points=450, reason="admin_adjustment"))
    db_session.commit()
    me = client.get(f"{G}/me", headers=auth(learner)).json()
    assert me["level"] == 3 and me["level_start_points"] == 400 and me["next_level_points"] == 900
    assert me["points_to_next_level"] == 450 and me["level_progress_percent"] == 10 and me["rank"] == 1


def test_leaderboard(client, db_session):
    a, b, c = make_user(db_session, full_name="Ann"), make_user(db_session, full_name="Bob"), make_user(db_session, full_name="Cy")
    teacher = make_user(db_session, "instructor")
    for user, pts in ((a, 300), (b, 500), (teacher, 9999)):
        db_session.add(PointTransaction(user_id=user.id, points=pts, reason="admin_adjustment"))
    db_session.add(PointTransaction(user_id=c.id, points=40, reason="admin_adjustment",
                                    created_at=datetime.utcnow() - timedelta(days=20)))
    db_session.commit()
    board = client.get(f"{G}/leaderboard", headers=auth(a)).json()
    assert [e["full_name"] for e in board["entries"]] == ["Bob", "Ann", "Cy"]           # instructors are not ranked
    assert board["me"] == {"rank": 2, "points": 300, "level": 2}
    assert [e["is_me"] for e in board["entries"]] == [False, True, False]
    week = client.get(f"{G}/leaderboard?period=week", headers=auth(c)).json()
    assert [e["full_name"] for e in week["entries"]] == ["Bob", "Ann"] and week["me"] is None
    month = client.get(f"{G}/leaderboard?period=month&limit=1", headers=auth(c)).json()
    assert len(month["entries"]) == 1 and month["me"]["rank"] == 3
    assert client.get(f"{G}/leaderboard?period=year", headers=auth(a)).status_code == 422
    assert "email" not in str(board)


def test_switches_and_privacy(client, db_session):
    from app.models.platform_setting import PlatformSetting
    _seed_badges(db_session)
    teacher, learner, course, lectures = _setup(db_session)
    db_session.add(PlatformSetting(key="gamification.leaderboard_enabled", value=False, category="gamification"))
    db_session.commit()
    assert client.get(f"{G}/leaderboard", headers=auth(learner)).status_code == 403
    admin = make_user(db_session, "super_admin")
    assert client.get(f"{G}/leaderboard", headers=auth(admin)).status_code == 200
    db_session.add(PlatformSetting(key="gamification.enabled", value=False, category="gamification"))
    db_session.commit()
    _complete(client, learner, lectures[0])
    assert client.get(f"{G}/me", headers=auth(learner)).json()["total_points"] == 0        # switched off: nothing awarded


def test_admin_badges_adjust_and_backfill(client, db_session):
    admin, learner = make_user(db_session, "super_admin"), make_user(db_session)
    teacher, student, course, lectures = _setup(db_session)
    body = {"code": "Three-Courses", "name": "Triple", "category": "milestone", "points": 5,
            "criteria": {"event": "course_completed", "count": 3}}
    assert client.post(f"{G}/badges", headers=auth(learner), json=body).status_code == 403
    r = client.post(f"{G}/badges", headers=auth(admin), json=body)
    assert r.status_code == 201 and r.json()["code"] == "three-courses"
    assert client.post(f"{G}/badges", headers=auth(admin), json=body).status_code == 409
    assert client.post(f"{G}/badges", headers=auth(admin), json={**body, "code": "x", "criteria": {"event": "dance"}}).status_code == 422
    assert client.post(f"{G}/badges", headers=auth(admin), json={**body, "code": "y", "criteria": {"event": "quiz_passed", "count": 0}}).status_code == 422
    assert client.post(f"{G}/badges", headers=auth(admin), json={**body, "code": "z", "category": "fun"}).status_code == 422
    bid = r.json()["id"]
    assert client.put(f"{G}/badges/{bid}", headers=auth(admin), json={"points": 50}).json()["points"] == 50
    assert client.delete(f"{G}/badges/{bid}", headers=auth(admin)).status_code == 200
    assert len(client.get(f"{G}/badges", headers=auth(admin)).json()) == 0

    adj = client.post(f"{G}/adjust", headers=auth(admin), json={"user_id": learner.id, "points": 75, "reason": "Hackathon winner"})
    assert adj.status_code == 200 and adj.json()["total_points"] == 75
    assert client.post(f"{G}/adjust", headers=auth(admin), json={"user_id": learner.id, "points": -25, "reason": "oops"}).json()["total_points"] == 50
    assert client.post(f"{G}/adjust", headers=auth(admin), json={"user_id": learner.id, "points": 0, "reason": "x"}).status_code == 422
    assert client.post(f"{G}/adjust", headers=auth(admin), json={"user_id": learner.id, "points": 5, "reason": " "}).status_code == 422
    assert client.post(f"{G}/adjust", headers=auth(learner), json={"user_id": learner.id, "points": 5, "reason": "me"}).status_code == 403
    logs = client.get(f"{API}/admin/audit-logs?action=gamification", headers=auth(admin)).json()
    assert len(logs) == 2

    # backfill: progress made while gamification was off is rewarded afterwards
    from app.models import Progress, Enrollment
    enr = db_session.query(Enrollment).filter_by(user_id=student.id).first()
    db_session.add(Progress(enrollment_id=enr.id, lecture_id=lectures[0].id, is_completed=True))
    db_session.commit()
    assert client.get(f"{G}/me", headers=auth(student)).json()["total_points"] == 0
    out = client.post(f"{G}/backfill", headers=auth(admin)).json()
    assert out["lecture_completed"] == 1
    assert client.get(f"{G}/me", headers=auth(student)).json()["total_points"] == 10
    assert client.post(f"{G}/backfill", headers=auth(admin)).json()["lecture_completed"] == 0
    assert client.post(f"{G}/backfill", headers=auth(learner)).status_code == 403
