import io
import time
from urllib.parse import urlparse

import httpx
import pytest

from app.config.settings import settings
from app.models import Assignment, Lecture, Section, Submission
from app.services.storage_service import StorageError, StorageService, storage_service
from tests.factories import auth, enroll, make_course, make_user

API = "/api/v1"
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64
PDF = b"%PDF-1.4\n" + b"0" * 64


def _upload(client, user, purpose, filename, data, target_id=None, **extra):
    form = {"purpose": purpose, **({"target_id": target_id} if target_id else {}), **extra}
    return client.post(f"{API}/uploads", headers=auth(user), data=form, files={"file": (filename, io.BytesIO(data))})


def _path(url):
    parsed = urlparse(url)
    return parsed.path + (("?" + parsed.query) if parsed.query else "")


@pytest.fixture
def world(db_session):
    teacher, other_teacher, admin = make_user(db_session, "instructor"), make_user(db_session, "instructor"), make_user(db_session, "super_admin")
    learner, stranger = make_user(db_session), make_user(db_session)
    course, lectures = make_course(db_session, teacher, lectures=2)
    enroll(db_session, learner, course)
    return dict(teacher=teacher, other=other_teacher, admin=admin, learner=learner, stranger=stranger, course=course, lectures=lectures)


def test_thumbnail_upload_is_public_and_served(client, world):
    w = world
    r = _upload(client, w["teacher"], "course_thumbnail", "cover.png", PNG, w["course"].id)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["ref"].startswith("storage://public/course_thumbnail/")
    assert body["applied"] == {"course_id": w["course"].id}
    course = client.get(f"{API}/courses/{w['course'].id}").json()          # anonymous
    assert course["thumbnail_url"] == body["url"]
    served = client.get(_path(body["url"]))                                  # public: no signature
    assert served.status_code == 200 and served.content == PNG
    assert served.headers["x-content-type-options"] == "nosniff"


def test_upload_permissions_and_validation(client, world):
    w = world
    cid = w["course"].id
    assert _upload(client, w["other"], "course_thumbnail", "x.png", PNG, cid).status_code == 403
    assert _upload(client, w["learner"], "course_thumbnail", "x.png", PNG, cid).status_code == 403
    assert _upload(client, w["admin"], "course_thumbnail", "x.png", PNG, cid).status_code == 201
    assert client.post(f"{API}/uploads", data={"purpose": "avatar"}, files={"file": ("a.png", io.BytesIO(PNG))}).status_code == 401
    assert _upload(client, w["teacher"], "course_thumbnail", "x.exe", PNG, cid).status_code == 400          # type not allowed
    assert _upload(client, w["teacher"], "course_thumbnail", "x.png", b"not a png at all", cid).status_code == 400  # content mismatch
    assert _upload(client, w["teacher"], "course_thumbnail", "x.png", b"", cid).status_code == 400
    assert _upload(client, w["teacher"], "course_thumbnail", "x.png", PNG).status_code == 400            # target missing
    assert _upload(client, w["teacher"], "course_thumbnail", "x.png", PNG, "nope").status_code == 404
    assert _upload(client, w["teacher"], "nonsense", "x.png", PNG, cid).status_code == 400


def test_size_limit(client, world, monkeypatch):
    monkeypatch.setattr(settings, "MAX_UPLOAD_MB", 1)
    big = PDF + b"0" * (1024 * 1024)
    r = _upload(client, world["teacher"], "lecture_resource", "big.pdf", big, world["lectures"][0].id)
    assert r.status_code == 413


def test_avatar(client, world):
    w = world
    r = _upload(client, w["learner"], "avatar", "me.png", PNG)
    assert r.status_code == 201
    me = client.get(f"{API}/auth/me", headers=auth(w["learner"]))
    first = r.json()["ref"]
    assert me.status_code == 200 and me.json()["avatar_url"] == r.json()["url"]
    second = _upload(client, w["learner"], "avatar", "me2.png", PNG).json()["ref"]
    assert first != second and not storage_service.exists(first)     # the old picture is removed


def test_lecture_video_is_signed_and_only_for_entitled_users(client, world):
    w = world
    lecture = w["lectures"][0]
    r = _upload(client, w["teacher"], "lecture_video", "intro.mp4", b"\x00\x00\x00\x18ftypmp42" + b"0" * 50, lecture.id)
    assert r.status_code == 201 and r.json()["ref"].startswith("storage://private/lecture_video/")
    url = client.get(f"{API}/lectures/{lecture.id}", headers=auth(w["learner"])).json()["content_url"]
    assert "sig=" in url and "exp=" in url
    assert client.get(_path(url)).status_code == 200                        # valid signed link
    assert client.get(_path(url).split("?")[0]).status_code == 403          # no signature
    tampered = _path(url).replace("sig=", "sig=00")
    assert client.get(tampered).status_code == 403
    assert client.get(f"{API}/lectures/{lecture.id}", headers=auth(w["stranger"])).json()["content_url"] is None
    # expired link
    path = urlparse(url).path.split("/files/private/")[1]
    old = int(time.time()) - 10
    assert client.get(f"{API}/files/private/{path}?exp={old}&sig={storage_service._signature(path, old)}").status_code == 403


def test_sending_back_a_signed_url_stores_the_reference(client, world):
    w = world
    lecture = w["lectures"][0]
    _upload(client, w["teacher"], "lecture_video", "intro.mp4", b"0" * 50, lecture.id)
    url = client.get(f"{API}/lectures/{lecture.id}", headers=auth(w["teacher"])).json()["content_url"]
    r = client.put(f"{API}/lectures/{lecture.id}", headers=auth(w["teacher"]), json={"title": "Renamed", "content_url": url})
    assert r.status_code == 200
    from app.database.session import get_db
    db = client.app.dependency_overrides[get_db]().__next__()
    db.expire_all()
    assert db.get(Lecture, lecture.id).content_url.startswith("storage://private/")


def test_resources_links_and_downloads(client, world):
    w = world
    lec = w["lectures"][0]
    up = _upload(client, w["teacher"], "lecture_resource", "slides.pdf", PDF, lec.id, title="Slides")
    assert up.status_code == 201 and up.json()["applied"]["lecture_id"] == lec.id
    link = client.post(f"{API}/lectures/{lec.id}/resources/link", headers=auth(w["teacher"]),
                       json={"title": "Docs", "url": "https://docs.python.org"})
    assert link.status_code == 201
    assert client.post(f"{API}/lectures/{lec.id}/resources/link", headers=auth(w["teacher"]), json={"title": "x", "url": "javascript:1"}).status_code == 422
    assert client.post(f"{API}/lectures/{lec.id}/resources/link", headers=auth(w["learner"]),
                       json={"title": "x", "url": "https://x.dev"}).status_code == 403

    rows = client.get(f"{API}/lectures/{lec.id}/resources", headers=auth(w["learner"])).json()
    assert {r["title"] for r in rows} == {"Slides", "Docs"} and all(r["url"] for r in rows)
    hidden = client.get(f"{API}/lectures/{lec.id}/resources", headers=auth(w["stranger"])).json()
    assert len(hidden) == 2 and all(r["url"] is None for r in hidden)
    file_row = next(r for r in rows if r["title"] == "Slides")
    assert client.get(_path(file_row["url"])).content == PDF

    assert client.delete(f"{API}/lectures/{lec.id}/resources/{file_row['id']}", headers=auth(w["other"])).status_code == 403
    assert client.delete(f"{API}/lectures/{lec.id}/resources/{file_row['id']}", headers=auth(w["teacher"])).status_code == 200
    assert client.get(_path(file_row["url"])).status_code in (403, 404)
    assert len(client.get(f"{API}/lectures/{lec.id}/resources", headers=auth(w["learner"])).json()) == 1


def test_subtitles_replace_per_language(client, world):
    w = world
    lec = w["lectures"][0]
    vtt = b"WEBVTT\n\n00:00.000 --> 00:01.000\nHi\n"
    assert _upload(client, w["teacher"], "subtitle", "en.vtt", vtt, lec.id).status_code == 400   # language missing
    assert _upload(client, w["teacher"], "subtitle", "en.vtt", vtt, lec.id, language_code="en", title="English").status_code == 201
    assert _upload(client, w["teacher"], "subtitle", "en2.vtt", vtt, lec.id, language_code="en").status_code == 201
    assert _upload(client, w["teacher"], "subtitle", "hi.vtt", vtt, lec.id, language_code="hi").status_code == 201
    rows = client.get(f"{API}/lectures/{lec.id}/subtitles", headers=auth(w["learner"])).json()
    assert [r["language_code"] for r in rows] == ["en", "hi"]
    assert client.get(f"{API}/lectures/{lec.id}/subtitles", headers=auth(w["stranger"])).json() == []
    assert client.delete(f"{API}/lectures/{lec.id}/subtitles/{rows[0]['id']}", headers=auth(w["teacher"])).status_code == 200


def test_assignment_files_belong_to_the_submitter(client, world, db_session):
    w = world
    section = db_session.query(Section).filter_by(course_id=w["course"].id).first()
    assignment = Assignment(section_id=section.id, title="A")
    db_session.add(assignment)
    db_session.commit()
    sub = Submission(assignment_id=assignment.id, user_id=w["learner"].id, submission_text="done")
    db_session.add(sub)
    db_session.commit()

    assert _upload(client, w["stranger"], "assignment_file", "a.pdf", PDF, sub.id).status_code == 404
    r = _upload(client, w["learner"], "assignment_file", "answer.pdf", PDF, sub.id)
    assert r.status_code == 201
    files = client.get(f"{API}/submissions/{sub.id}/files", headers=auth(w["learner"])).json()
    assert files[0]["file_name"] == "answer.pdf" and client.get(_path(files[0]["file_url"])).content == PDF
    assert client.get(f"{API}/submissions/{sub.id}/files", headers=auth(w["teacher"])).status_code == 200
    assert client.get(f"{API}/submissions/{sub.id}/files", headers=auth(w["admin"])).status_code == 200
    assert client.get(f"{API}/submissions/{sub.id}/files", headers=auth(w["stranger"])).status_code == 403
    assert client.get(f"{API}/submissions/{sub.id}/files", headers=auth(w["other"])).status_code == 403
    assert client.delete(f"{API}/submissions/{sub.id}/files/{files[0]['id']}", headers=auth(w["teacher"])).status_code == 404
    assert client.delete(f"{API}/submissions/{sub.id}/files/{files[0]['id']}", headers=auth(w["learner"])).status_code == 200


def test_published_course_video_upload_needs_reopen_when_reapproval_is_on(client, world, db_session):
    from app.models.platform_setting import PlatformSetting
    row = db_session.get(PlatformSetting, "courses.reapproval_on_published_edit")
    row.value = True
    db_session.commit()
    r = _upload(client, world["teacher"], "lecture_video", "v.mp4", b"0" * 20, world["lectures"][0].id)
    assert r.status_code == 409
    assert not [k for k in storage_service._memory if "lecture_video" in k]   # nothing left behind


# ------------------------------------------------------------------ Supabase backend (HTTP mocked)
def test_supabase_backend_talks_to_the_storage_api(monkeypatch):
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append((request.method, request.url.path, dict(request.headers)))
        if request.method == "POST" and "/object/sign/" in request.url.path:
            return httpx.Response(200, json={"signedURL": "/object/sign/course-files/a/b.mp4?token=T"})
        if request.method == "POST" and "/object/upload/sign/" in request.url.path:
            return httpx.Response(200, json={"url": "/object/upload/sign/course-files/a/b.mp4?token=U"})
        if request.method == "HEAD":
            return httpx.Response(200 if "present" in request.url.path else 404)
        return httpx.Response(200, json={"Key": "ok"})

    monkeypatch.setattr(settings, "STORAGE_BACKEND", "supabase")
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://proj.supabase.co")
    monkeypatch.setattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "service-key")
    svc = StorageService()
    svc._client = lambda: httpx.Client(transport=httpx.MockTransport(handler))

    stored = svc.save(b"data", kind="private", path="a/b.mp4", content_type="video/mp4")
    assert stored.ref == "storage://private/a/b.mp4"
    method, path, headers = calls[-1]
    assert (method, path) == ("POST", "/storage/v1/object/course-files/a/b.mp4")
    assert headers["authorization"] == "Bearer service-key" and headers["content-type"] == "video/mp4"

    assert svc.resolve("storage://public/x/y.png") == "https://proj.supabase.co/storage/v1/object/public/public-assets/x/y.png"
    assert svc.resolve("storage://private/a/b.mp4") == "https://proj.supabase.co/storage/v1/object/sign/course-files/a/b.mp4?token=T"
    n = len(calls)
    svc.resolve("storage://private/a/b.mp4")
    assert len(calls) == n                                   # signed URL is cached
    assert svc.resolve("https://youtube.com/watch?v=1") == "https://youtube.com/watch?v=1"

    up = svc.signed_upload("private", "a/b.mp4")
    assert up["upload_url"].endswith("/object/upload/sign/course-files/a/b.mp4?token=U") and up["method"] == "PUT"
    assert svc.exists("storage://private/present.mp4") and not svc.exists("storage://private/missing.mp4")
    svc.delete("storage://private/a/b.mp4")
    assert calls[-1][0] == "DELETE"
    assert svc.normalize_incoming("https://proj.supabase.co/storage/v1/object/sign/course-files/a/b.mp4?token=T") == "storage://private/a/b.mp4"
    assert svc.normalize_incoming("https://proj.supabase.co/storage/v1/object/public/public-assets/x.png") == "storage://public/x.png"


def test_supabase_failure_surfaces_as_storage_error(monkeypatch):
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "supabase")
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://proj.supabase.co")
    monkeypatch.setattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "k")
    svc = StorageService()
    svc._client = lambda: httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(500, text="boom")))
    with pytest.raises(StorageError):
        svc.save(b"x", kind="private", path="a/b.txt", content_type="text/plain")
    monkeypatch.setattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "")
    with pytest.raises(StorageError):
        StorageService().save(b"x", kind="private", path="a/b.txt", content_type="text/plain")


def test_signed_upload_endpoint_requires_supabase(client, world):
    r = client.post(f"{API}/uploads/signed-upload", headers=auth(world["teacher"]),
                    json={"purpose": "lecture_video", "target_id": world["lectures"][0].id, "file_name": "v.mp4"})
    assert r.status_code == 400 and "supabase" in r.json()["detail"].lower()


def test_confirm_checks_ownership_of_the_ref(client, world):
    w = world
    lec = w["lectures"][0]
    ref = storage_service.save(b"v", kind="private", path=f"lecture_video/{lec.id}/abc.mp4", content_type="video/mp4").ref
    body = {"purpose": "lecture_video", "target_id": lec.id, "ref": ref}
    assert client.post(f"{API}/uploads/confirm", headers=auth(w["other"]), json=body).status_code == 403
    assert client.post(f"{API}/uploads/confirm", headers=auth(w["teacher"]), json=body).status_code == 201
    foreign = storage_service.save(b"v", kind="private", path=f"lecture_video/other-lecture/abc.mp4", content_type="video/mp4").ref
    assert client.post(f"{API}/uploads/confirm", headers=auth(w["teacher"]), json={**body, "ref": foreign}).status_code == 403
    assert client.post(f"{API}/uploads/confirm", headers=auth(w["teacher"]),
                       json={**body, "ref": f"storage://private/lecture_video/{lec.id}/missing.mp4"}).status_code == 400
    assert client.post(f"{API}/uploads/confirm", headers=auth(w["teacher"]), json={**body, "ref": "https://evil.example/v.mp4"}).status_code in (400, 422)


def test_path_traversal_is_rejected(client):
    assert client.get(f"{API}/files/public/..%2f..%2fetc/passwd").status_code in (403, 404)
    with pytest.raises(ValueError):
        from app.services.storage_service import split_ref
        split_ref("storage://private/../secret")
