"""Permission matrix: who may call what.

* Every route that is not on the PUBLIC allow-list must refuse anonymous callers with 401.
* The allow-list is explicit, so a new route that forgets its auth dependency fails this test.
* Admin-only routes refuse learners and instructors.
* Course content (draft structure, lecture URLs) only reaches the people who may see it.
"""
import re

import pytest
from fastapi.routing import APIRoute

from app.main import app
from app.models import Question, Quiz, Section
from app.models.assignment import Assignment
from tests.factories import auth, enroll, make_course, make_user

API = "/api/v1"

# (method, path template) of every endpoint that anonymous visitors may call.
PUBLIC = {
    ("GET", "/api/health"),
    ("GET", f"{API}/assignments/"),
    ("GET", f"{API}/quizzes/"),
    ("GET", f"{API}/progress/"),
    ("GET", f"{API}/auth"),
    ("POST", f"{API}/auth/register"),
    ("POST", f"{API}/auth/resend-verification"),
    ("POST", f"{API}/auth/login"),
    ("POST", f"{API}/auth/token"),
    ("POST", f"{API}/auth/refresh"),
    ("POST", f"{API}/auth/logout"),
    ("POST", f"{API}/auth/forgot-password"),
    ("POST", f"{API}/auth/reset-password"),
    ("POST", f"{API}/auth/verify-email"),
    ("GET", f"{API}/certificates/verify/{{code}}"),
    ("GET", f"{API}/reviews/courses/{{course_id}}"),
    ("GET", f"{API}/reviews/courses/{{course_id}}/summary"),
    ("GET", f"{API}/settings/public"),
    ("GET", f"{API}/courses"),
    ("GET", f"{API}/courses/{{course_id}}"),
}


def _routes():
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        for method in route.methods - {"HEAD", "OPTIONS"}:
            yield method, route.path.rstrip("/") or "/"


def _fill(path: str) -> str:
    return re.sub(r"\{[^}]+\}", "x", path)


def _norm(path: str) -> str:
    return path.rstrip("/") or "/"


PUBLIC_NORMALISED = {(m, _norm(p)) for m, p in PUBLIC}


def test_anonymous_callers_are_refused_everywhere_except_the_allow_list(client):
    unexpectedly_open, unexpectedly_closed = [], []
    for method, path in sorted(set(_routes())):
        response = client.request(method, _fill(path), json={})
        is_public = (method, path) in PUBLIC_NORMALISED
        if response.status_code in (401, 403):
            if is_public and response.status_code == 401:
                unexpectedly_closed.append((method, path))
        elif not is_public:
            unexpectedly_open.append((method, path, response.status_code))
    assert not unexpectedly_open, f"Routes open to anonymous callers but not on PUBLIC: {unexpectedly_open}"
    assert not unexpectedly_closed, f"Routes on PUBLIC that actually require login: {unexpectedly_closed}"


ADMIN_ONLY = [
    ("GET", "/users"),
    ("GET", "/users/x"),
    ("GET", "/organizations"),
    ("GET", "/admin/overview"),
    ("GET", "/admin/audit-logs"),
    ("GET", "/admin/login-history"),
    ("GET", "/settings"),
    ("PUT", "/settings"),
    ("GET", "/analytics/platform"),
]


@pytest.mark.parametrize("method,path", ADMIN_ONLY)
def test_admin_only_routes_refuse_learners_and_instructors(client, db_session, method, path):
    for role in ("learner", "instructor"):
        user = make_user(db_session, role)
        response = client.request(method, API + path, headers=auth(user), json={})
        assert response.status_code == 403, f"{role} -> {method} {path}: {response.status_code}"


@pytest.fixture
def world(db_session):
    db = db_session
    owner, other_inst, admin = make_user(db, "instructor"), make_user(db, "instructor"), make_user(db, "super_admin")
    enrolled, stranger = make_user(db), make_user(db)
    course, lectures = make_course(db, owner, lectures=2)
    draft, draft_lectures = make_course(db, owner, status="draft", lectures=1)
    lectures[0].content_url = "https://cdn.example/secret-video.mp4"
    lectures[0].is_preview = False
    lectures[1].content_url = "https://cdn.example/free-preview.mp4"
    lectures[1].is_preview = True
    draft_lectures[0].content_url = "https://cdn.example/draft-video.mp4"
    db.commit()
    enroll(db, enrolled, course)
    section = db.query(Section).filter_by(course_id=course.id).first()
    draft_section = db.query(Section).filter_by(course_id=draft.id).first()
    return dict(owner=owner, other=other_inst, admin=admin, enrolled=enrolled, stranger=stranger, course=course,
                draft=draft, lectures=lectures, draft_lectures=draft_lectures, section=section,
                draft_section=draft_section)


def _get(client, user, path):
    return client.get(API + path, headers=auth(user))


def test_draft_course_structure_is_visible_only_to_owner_and_admin(client, world):
    w = world
    for path in (f"/courses/{w['draft'].id}/sections", f"/sections/{w['draft_section'].id}",
                 f"/sections/{w['draft_section'].id}/lectures", f"/lectures/{w['draft_lectures'][0].id}"):
        for who in ("enrolled", "stranger", "other"):
            assert _get(client, w[who], path).status_code == 404, (who, path)
        for who in ("owner", "admin"):
            assert _get(client, w[who], path).status_code == 200, (who, path)


def test_published_course_outline_is_visible_to_every_logged_in_user(client, world):
    w = world
    for who in ("enrolled", "stranger", "other", "owner", "admin"):
        assert _get(client, w[who], f"/courses/{w['course'].id}/sections").status_code == 200
        assert _get(client, w[who], f"/sections/{w['section'].id}/lectures").status_code == 200


def test_lecture_urls_only_reach_people_allowed_to_watch(client, world):
    w = world
    locked, free = w["lectures"][0], w["lectures"][1]

    def urls(user):
        rows = _get(client, user, f"/sections/{w['section'].id}/lectures").json()
        return {row["id"]: row["content_url"] for row in rows}

    for who in ("owner", "admin", "enrolled"):
        got = urls(w[who])
        assert got[locked.id] == locked.content_url, who
        assert got[free.id] == free.content_url, who
        single = _get(client, w[who], f"/lectures/{locked.id}").json()
        assert single["content_url"] == locked.content_url, who

    for who in ("stranger", "other"):
        got = urls(w[who])
        assert got[locked.id] is None, who
        assert got[free.id] == free.content_url, who          # free preview stays open
        assert _get(client, w[who], f"/lectures/{locked.id}").json()["content_url"] is None, who
        assert _get(client, w[who], f"/lectures/{free.id}").json()["content_url"] == free.content_url, who


def test_instructor_can_mark_a_lecture_as_free_preview(client, world):
    w = world
    lecture = w["lectures"][0]
    response = client.put(f"{API}/lectures/{lecture.id}", headers=auth(w["owner"]), json={"is_preview": True})
    assert response.status_code == 200 and response.json()["is_preview"] is True
    assert _get(client, w["stranger"], f"/lectures/{lecture.id}").json()["content_url"] == lecture.content_url
    created = client.post(f"{API}/sections/{w['section'].id}/lectures", headers=auth(w["owner"]),
                          json={"title": "Intro", "content_url": "https://cdn.example/intro.mp4", "is_preview": True})
    assert created.status_code == 201 and created.json()["is_preview"] is True


def test_non_owner_cannot_edit_or_delete_course_content(client, world):
    w = world
    lecture, section = w["lectures"][0], w["section"]
    for who in ("other", "enrolled", "stranger"):
        assert client.put(f"{API}/lectures/{lecture.id}", headers=auth(w[who]), json={"title": "x"}).status_code == 403
        assert client.delete(f"{API}/lectures/{lecture.id}", headers=auth(w[who])).status_code == 403
        assert client.put(f"{API}/sections/{section.id}", headers=auth(w[who]), json={"title": "x"}).status_code == 403
        assert client.delete(f"{API}/sections/{section.id}", headers=auth(w[who])).status_code == 403
        assert client.post(f"{API}/sections/{section.id}/lectures", headers=auth(w[who]),
                           json={"title": "x"}).status_code == 403
