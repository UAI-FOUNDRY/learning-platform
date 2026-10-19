from app.models import Notification, Question, Quiz, Section
from app.models.assignment import Assignment
from app.models.platform_setting import PlatformSetting
from app.services.email_service import email_service
from tests.factories import auth, enroll, make_course, make_user, uid

API = "/api/v1"


def notes(client, user, **params):
    return client.get(f"{API}/notifications", headers=auth(user), params=params).json()


def types(client, user):
    return [n["type"] for n in notes(client, user)]


# ---------------------------------------------------------------- listing / reading
def test_list_count_read_and_delete(client, db_session):
    user, other = make_user(db_session), make_user(db_session)
    for i in range(3):
        db_session.add(Notification(user_id=user.id, type="welcome", title=f"n{i}"))
    db_session.add(Notification(user_id=other.id, type="welcome", title="not mine"))
    db_session.commit()

    assert client.get(f"{API}/notifications/unread-count", headers=auth(user)).json() == {"unread": 3}
    items = notes(client, user)
    assert len(items) == 3 and all(n["title"] != "not mine" for n in items)

    r = client.post(f"{API}/notifications/{items[0]['id']}/read", headers=auth(user))
    assert r.json()["is_read"] is True and r.json()["read_at"]
    assert len(notes(client, user, unread_only=True)) == 2
    assert client.post(f"{API}/notifications/read-all", headers=auth(user)).status_code == 200
    assert client.get(f"{API}/notifications/unread-count", headers=auth(user)).json() == {"unread": 0}

    assert client.delete(f"{API}/notifications/{items[1]['id']}", headers=auth(user)).status_code == 200
    assert len(notes(client, user)) == 2


def test_cannot_touch_someone_elses_notification(client, db_session):
    user, other = make_user(db_session), make_user(db_session)
    note = Notification(user_id=other.id, type="welcome", title="private")
    db_session.add(note)
    db_session.commit()
    assert client.post(f"{API}/notifications/{note.id}/read", headers=auth(user)).status_code == 404
    assert client.delete(f"{API}/notifications/{note.id}", headers=auth(user)).status_code == 404
    assert client.get(f"{API}/notifications").status_code == 401


# ---------------------------------------------------------------- automatic notifications
def test_welcome_on_register(client, db_session):
    email = f"w-{uid()}@example.com"
    client.post(f"{API}/auth/register", json={"email": email, "full_name": "W", "password": "Password123"})
    login = client.post(f"{API}/auth/login", json={"email": email, "password": "Password123"}).json()
    items = client.get(f"{API}/notifications", headers={"Authorization": f"Bearer {login['access_token']}"}).json()
    assert [n["type"] for n in items] == ["welcome"]


def test_enrollment_completion_and_certificate_notifications(client, db_session):
    inst, learner = make_user(db_session, "instructor"), make_user(db_session)
    course, lectures = make_course(db_session, inst, lectures=1)
    assert client.post(f"{API}/courses/{course.id}/enroll", headers=auth(learner)).status_code == 201
    client.post(f"{API}/progress/lecture/{lectures[0].id}", headers=auth(learner), json={"is_completed": True})
    assert set(types(client, learner)) == {"course_enrollment", "course_completed", "certificate_issued"}


def test_course_review_decisions_notify_the_instructor(client, db_session):
    inst, admin = make_user(db_session, "instructor"), make_user(db_session, "super_admin")
    course, _ = make_course(db_session, inst, status="draft")
    client.post(f"{API}/courses/{course.id}/submit", headers=auth(inst))
    client.post(f"{API}/admin/courses/{course.id}/request-changes", headers=auth(admin), json={"feedback": "Add outcomes"})
    client.post(f"{API}/courses/{course.id}/submit", headers=auth(inst))
    client.post(f"{API}/admin/courses/{course.id}/approve", headers=auth(admin))
    got = notes(client, inst)
    assert [n["type"] for n in got] == ["course_approved", "changes_requested"]
    assert "Add outcomes" in got[1]["message"]


def test_quiz_result_and_assignment_graded_notifications(client, db_session):
    inst, learner = make_user(db_session, "instructor"), make_user(db_session)
    course, _ = make_course(db_session, inst)
    enroll(db_session, learner, course)
    section = db_session.query(Section).filter_by(course_id=course.id).first()
    quiz = Quiz(section_id=section.id, title="Q", passing_score=50)
    asg = Assignment(section_id=section.id, title="Essay")
    db_session.add_all([quiz, asg])
    db_session.flush()
    q = Question(quiz_id=quiz.id, prompt="?", options=["a", "b"], correct_option="a", order_index=0)
    db_session.add(q)
    db_session.commit()

    client.post(f"{API}/quizzes/{quiz.id}/attempt", headers=auth(learner),
                json={"answers": [{"question_id": q.id, "selected_option": "a"}]})
    sub = client.post(f"{API}/assignments/{asg.id}/submit", headers=auth(learner), json={"submission_url": "https://x.example/1"}).json()
    client.put(f"{API}/assignments/{asg.id}/submissions/{sub['id']}/grade", headers=auth(inst), json={"grade": "A", "feedback": "Nice"})

    got = {n["type"]: n for n in notes(client, learner)}
    assert "Passed" in got["quiz_result"]["message"] and got["quiz_result"]["data"]["score"] == 100
    assert "Grade: A" in got["assignment_graded"]["message"] and "Nice" in got["assignment_graded"]["message"]


# ---------------------------------------------------------------- preferences
def test_preferences_default_on_and_can_be_switched_off(client, db_session):
    inst, learner = make_user(db_session, "instructor"), make_user(db_session)
    prefs = client.get(f"{API}/notifications/preferences", headers=auth(learner)).json()
    assert all(p["in_app_enabled"] and p["email_enabled"] for p in prefs) and len(prefs) == 13

    r = client.put(f"{API}/notifications/preferences", headers=auth(learner),
                   json={"preferences": [{"notification_type": "course_enrollment", "in_app_enabled": False}]})
    assert r.status_code == 200
    assert next(p for p in r.json() if p["notification_type"] == "course_enrollment")["in_app_enabled"] is False

    course, _ = make_course(db_session, inst)
    client.post(f"{API}/courses/{course.id}/enroll", headers=auth(learner))
    assert types(client, learner) == []  # muted

    bad = client.put(f"{API}/notifications/preferences", headers=auth(learner),
                     json={"preferences": [{"notification_type": "made_up"}]})
    assert bad.status_code == 422


def test_email_only_when_platform_and_user_allow_it(client, db_session):
    email_service.outbox.clear()
    inst, learner = make_user(db_session, "instructor"), make_user(db_session)
    db_session.add(PlatformSetting(key="notifications.email_enabled", value=True, category="notifications"))
    db_session.commit()
    course, _ = make_course(db_session, inst)
    client.post(f"{API}/courses/{course.id}/enroll", headers=auth(learner))
    assert [m["to"] for m in email_service.outbox] == [learner.email]
    assert notes(client, learner)[0]["type"] == "course_enrollment"
    db_session.expire_all()
    assert db_session.query(Notification).filter_by(user_id=learner.id).one().email_sent_at is not None


# ---------------------------------------------------------------- announcements
def test_instructor_announces_to_own_course_learners(client, db_session):
    inst, other_inst = make_user(db_session, "instructor"), make_user(db_session, "instructor")
    a, b, outsider = make_user(db_session), make_user(db_session), make_user(db_session)
    course, _ = make_course(db_session, inst)
    enroll(db_session, a, course)
    enroll(db_session, b, course, status="COMPLETED")

    r = client.post(f"{API}/announcements", headers=auth(inst),
                    json={"title": "Exam moved", "body": "Friday instead of Thursday", "course_id": course.id})
    assert r.status_code == 201 and r.json()["audience"] == "course"
    assert types(client, a) == ["instructor_announcement"] and types(client, b) == ["instructor_announcement"]
    assert types(client, outsider) == [] and types(client, inst) == []

    assert [x["title"] for x in client.get(f"{API}/announcements", headers=auth(a)).json()] == ["Exam moved"]
    assert client.get(f"{API}/announcements", headers=auth(outsider)).json() == []
    assert len(client.get(f"{API}/announcements", headers=auth(inst), params={"course_id": course.id}).json()) == 1
    # another instructor can't announce to this course
    assert client.post(f"{API}/announcements", headers=auth(other_inst),
                       json={"title": "Hi", "body": "x", "course_id": course.id}).status_code == 403
    # learners can't create announcements at all
    assert client.post(f"{API}/announcements", headers=auth(a),
                       json={"title": "Hi", "body": "x", "course_id": course.id}).status_code == 403


def test_super_admin_platform_announcements_by_audience(client, db_session):
    admin = make_user(db_session, "super_admin")
    inst, learner = make_user(db_session, "instructor"), make_user(db_session)
    make_user(db_session, status="suspended")

    r = client.post(f"{API}/announcements", headers=auth(admin),
                    json={"title": "Maintenance", "body": "Sunday 2am", "audience": "all"})
    assert r.status_code == 201
    client.post(f"{API}/announcements", headers=auth(admin),
                json={"title": "For instructors", "body": "Upload guidelines", "audience": "instructors"})

    assert types(client, learner) == ["admin_announcement"]
    assert types(client, inst) == ["admin_announcement", "admin_announcement"]
    assert [x["title"] for x in client.get(f"{API}/announcements", headers=auth(learner)).json()] == ["Maintenance"]
    assert len(client.get(f"{API}/announcements", headers=auth(admin)).json()) == 2
    # an instructor can't broadcast platform-wide
    assert client.post(f"{API}/announcements", headers=auth(inst),
                       json={"title": "x", "body": "y", "audience": "all"}).status_code == 403


def test_announcement_validation_and_delete(client, db_session):
    admin, inst = make_user(db_session, "super_admin"), make_user(db_session, "instructor")
    course, _ = make_course(db_session, inst)
    post = lambda body: client.post(f"{API}/announcements", headers=auth(inst), json=body)
    assert post({"title": "  ", "body": "x", "course_id": course.id}).status_code == 422
    assert post({"title": "t", "body": "x"}).status_code == 422                       # course audience needs course_id
    assert post({"title": "t", "body": "x", "audience": "all", "course_id": course.id}).status_code == 422
    assert post({"title": "t", "body": "x", "audience": "nobody"}).status_code == 422
    assert post({"title": "t", "body": "x", "course_id": "missing"}).status_code == 404

    ann = post({"title": "t", "body": "x", "course_id": course.id}).json()
    stranger = make_user(db_session, "instructor")
    assert client.delete(f"{API}/announcements/{ann['id']}", headers=auth(stranger)).status_code == 404
    assert client.delete(f"{API}/announcements/{ann['id']}", headers=auth(admin)).status_code == 200
