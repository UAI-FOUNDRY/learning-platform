"""Re-review of published courses, public catalog, approval history."""
from app.models import Course
from tests.factories import auth, enroll, make_course, make_user

API = "/api/v1"


def _section_payload():
    return {"title": "New section"}


# ---------------------------------------------------------------- public catalog
def test_catalog_is_public_but_only_published(client, db_session):
    inst = make_user(db_session, "instructor")
    pub, _ = make_course(db_session, inst, status="published")
    make_course(db_session, inst, status="draft")
    r = client.get(f"{API}/courses")
    assert r.status_code == 200
    assert [c["id"] for c in r.json()] == [pub.id]
    assert client.get(f"{API}/courses/{pub.id}").status_code == 200


def test_anonymous_cannot_see_draft_course_or_filter_by_status(client, db_session):
    inst = make_user(db_session, "instructor")
    draft, _ = make_course(db_session, inst, status="draft")
    assert client.get(f"{API}/courses/{draft.id}").status_code == 404
    assert client.get(f"{API}/courses", params={"status": "draft"}).json() == []


def test_stale_token_is_treated_as_anonymous(client, db_session):
    inst = make_user(db_session, "instructor")
    pub, _ = make_course(db_session, inst)
    r = client.get(f"{API}/courses", headers={"Authorization": "Bearer not-a-token"})
    assert r.status_code == 200 and len(r.json()) == 1


def test_instructor_still_sees_own_drafts(client, db_session):
    inst = make_user(db_session, "instructor")
    draft, _ = make_course(db_session, inst, status="draft")
    r = client.get(f"{API}/courses", headers=auth(inst), params={"status": "draft"})
    assert [c["id"] for c in r.json()] == [draft.id]


# ---------------------------------------------------------------- editing published courses
def test_instructor_cannot_edit_published_course_in_place(client, db_session):
    inst = make_user(db_session, "instructor")
    course, _ = make_course(db_session, inst, status="published")
    r = client.put(f"{API}/courses/{course.id}", headers=auth(inst), json={"title": "Sneaky"})
    assert r.status_code == 409 and "reopen" in r.json()["detail"].lower()
    r = client.post(f"{API}/courses/{course.id}/sections", headers=auth(inst), json=_section_payload())
    assert r.status_code == 409


def test_reopen_edit_resubmit_approve_flow_keeps_learner_access(client, db_session):
    inst = make_user(db_session, "instructor")
    admin = make_user(db_session, "super_admin")
    learner = make_user(db_session)
    course, lectures = make_course(db_session, inst, status="published")
    enroll(db_session, learner, course)

    r = client.post(f"{API}/courses/{course.id}/reopen", headers=auth(inst))
    assert r.status_code == 200 and r.json()["status"] == "draft"
    # gone from the public catalog, but the enrolled learner can still learn
    assert client.get(f"{API}/courses").json() == []
    done = client.post(f"{API}/progress/lecture/{lectures[0].id}", headers=auth(learner), json={"is_completed": True})
    assert done.status_code in (200, 201)

    assert client.put(f"{API}/courses/{course.id}", headers=auth(inst), json={"title": "Better title"}).status_code == 200
    assert client.post(f"{API}/courses/{course.id}/submit", headers=auth(inst)).status_code == 200
    assert client.post(f"{API}/admin/courses/{course.id}/approve", headers=auth(admin)).json()["status"] == "published"

    history = client.get(f"{API}/courses/{course.id}/approval-history", headers=auth(admin)).json()
    assert [h["action"] for h in history] == ["unpublished", "submitted", "approved"]
    assert history[2]["actor_name"] == admin.full_name


def test_reopen_rules(client, db_session):
    inst = make_user(db_session, "instructor")
    other = make_user(db_session, "instructor")
    draft, _ = make_course(db_session, inst, status="draft")
    pub, _ = make_course(db_session, inst, status="published")
    assert client.post(f"{API}/courses/{draft.id}/reopen", headers=auth(inst)).status_code == 400
    assert client.post(f"{API}/courses/{pub.id}/reopen", headers=auth(other)).status_code == 403
    assert client.post(f"{API}/courses/{pub.id}/reopen", headers=auth(make_user(db_session))).status_code == 403


def test_super_admin_can_edit_published_directly(client, db_session):
    inst = make_user(db_session, "instructor")
    admin = make_user(db_session, "super_admin")
    course, _ = make_course(db_session, inst, status="published")
    r = client.put(f"{API}/courses/{course.id}", headers=auth(admin), json={"title": "Fixed typo"})
    assert r.status_code == 200 and r.json()["status"] == "published"


def test_setting_off_allows_in_place_edits(client, db_session):
    from app.models.platform_setting import PlatformSetting
    inst = make_user(db_session, "instructor")
    course, _ = make_course(db_session, inst, status="published")
    db_session.add(PlatformSetting(key="courses.reapproval_on_published_edit", value=False, category="courses"))
    db_session.commit()
    assert client.put(f"{API}/courses/{course.id}", headers=auth(inst), json={"title": "Edit"}).status_code == 200


def test_approval_log_records_changes_requested_and_reject(client, db_session):
    inst = make_user(db_session, "instructor")
    admin = make_user(db_session, "super_admin")
    course, _ = make_course(db_session, inst, status="draft")
    client.post(f"{API}/courses/{course.id}/submit", headers=auth(inst))
    client.post(f"{API}/admin/courses/{course.id}/request-changes", headers=auth(admin), json={"feedback": "Add outcomes"})
    client.post(f"{API}/courses/{course.id}/submit", headers=auth(inst))
    client.post(f"{API}/admin/courses/{course.id}/reject", headers=auth(admin), json={"reason": "Off topic"})
    h = client.get(f"{API}/courses/{course.id}/approval-history", headers=auth(inst)).json()
    assert [x["action"] for x in h] == ["submitted", "changes_requested", "submitted", "rejected"]
    assert h[1]["comment"] == "Add outcomes" and h[3]["comment"] == "Off topic"
    assert client.get(f"{API}/courses/{course.id}/approval-history", headers=auth(make_user(db_session, "instructor"))).status_code == 404


def test_approval_sets_published_at(client, db_session):
    inst = make_user(db_session, "instructor")
    admin = make_user(db_session, "super_admin")
    course, _ = make_course(db_session, inst, status="draft")
    client.post(f"{API}/courses/{course.id}/submit", headers=auth(inst))
    r = client.post(f"{API}/admin/courses/{course.id}/approve", headers=auth(admin))
    assert r.json()["published_at"] is not None
    db_session.expire_all()
    assert db_session.get(Course, course.id).published_at is not None


# ---------------------------------------------------------------- error format
def test_errors_carry_a_readable_message_and_keep_detail(client, db_session):
    r = client.get(f"{API}/courses/does-not-exist")
    assert r.status_code == 404
    assert r.json()["message"] == r.json()["detail"] == "Course not found"

    r = client.post(f"{API}/auth/login", json={"email": "not-an-email", "password": ""})
    assert r.status_code == 422
    body = r.json()
    assert isinstance(body["detail"], list)  # unchanged for existing clients
    assert "email" in body["message"] and body["error_type"] == "validation_error"
