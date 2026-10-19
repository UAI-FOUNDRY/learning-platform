from app.models import Certificate, PlatformSetting, Quiz, QuizAttempt
from tests.factories import auth, enroll, make_course, make_user

BASE = "/api/v1/certificates"


def complete_course(client, learner, lectures):
    for lecture in lectures:
        r = client.post(f"/api/v1/progress/lecture/{lecture.id}", headers=auth(learner), json={"is_completed": True})
        assert r.status_code == 200


def setup_completed(client, db):
    instructor = make_user(db, "instructor")
    learner = make_user(db, "learner", full_name="Asha Learner")
    course, lectures = make_course(db, instructor, title="Python Basics")
    enroll(db, learner, course)
    complete_course(client, learner, lectures)
    return instructor, learner, course


# ---------------------------------------------------------------- issuing
def test_certificate_auto_issued_when_last_lecture_completed(client, db_session):
    _, learner, course = setup_completed(client, db_session)
    r = client.get(f"{BASE}/my", headers=auth(learner))
    assert r.status_code == 200
    certs = r.json()
    assert len(certs) == 1
    assert certs[0]["course_id"] == course.id
    assert certs[0]["learner_name"] == "Asha Learner"
    assert certs[0]["course_title"] == "Python Basics"
    assert certs[0]["status"] == "issued"
    assert certs[0]["verification_code"].startswith("LP-")


def test_no_certificate_before_completion(client, db_session):
    instructor = make_user(db_session, "instructor")
    learner = make_user(db_session)
    course, lectures = make_course(db_session, instructor, lectures=2)
    enroll(db_session, learner, course)
    complete_course(client, learner, lectures[:1])
    assert client.get(f"{BASE}/my", headers=auth(learner)).json() == []
    r = client.post(f"{BASE}/courses/{course.id}/claim", headers=auth(learner))
    assert r.status_code == 400


def test_claim_is_idempotent(client, db_session):
    _, learner, course = setup_completed(client, db_session)
    first = client.post(f"{BASE}/courses/{course.id}/claim", headers=auth(learner)).json()
    second = client.post(f"{BASE}/courses/{course.id}/claim", headers=auth(learner)).json()
    assert first["id"] == second["id"]
    assert db_session.query(Certificate).filter(Certificate.user_id == learner.id).count() == 1


def test_claim_when_not_enrolled_is_404(client, db_session):
    instructor = make_user(db_session, "instructor")
    learner = make_user(db_session)
    course, _ = make_course(db_session, instructor)
    assert client.post(f"{BASE}/courses/{course.id}/claim", headers=auth(learner)).status_code == 404


def test_auto_issue_can_be_disabled_by_setting(client, db_session):
    db_session.add(PlatformSetting(key="certificates.auto_issue_on_completion", value=False, category="certificates"))
    db_session.commit()
    _, learner, course = setup_completed(client, db_session)
    assert client.get(f"{BASE}/my", headers=auth(learner)).json() == []
    assert client.post(f"{BASE}/courses/{course.id}/claim", headers=auth(learner)).status_code == 200


def test_quiz_requirement_setting(client, db_session):
    db_session.add(PlatformSetting(key="certificates.require_all_quizzes_passed", value=True, category="certificates"))
    db_session.commit()
    instructor = make_user(db_session, "instructor")
    learner = make_user(db_session)
    course, lectures = make_course(db_session, instructor, lectures=1)
    quiz = Quiz(section_id=lectures[0].section_id, title="Final quiz", passing_score=50)
    db_session.add(quiz)
    db_session.commit()
    enroll(db_session, learner, course)
    complete_course(client, learner, lectures)

    r = client.post(f"{BASE}/courses/{course.id}/claim", headers=auth(learner))
    assert r.status_code == 400
    assert "Final quiz" in r.json()["detail"]

    db_session.add(QuizAttempt(quiz_id=quiz.id, user_id=learner.id, score=80, passed=True))
    db_session.commit()
    assert client.post(f"{BASE}/courses/{course.id}/claim", headers=auth(learner)).status_code == 200


# ---------------------------------------------------------------- viewing
def test_owner_instructor_and_admin_can_view_others_cannot(client, db_session):
    instructor, learner, _ = setup_completed(client, db_session)
    cert_id = client.get(f"{BASE}/my", headers=auth(learner)).json()[0]["id"]
    admin = make_user(db_session, "super_admin")
    stranger = make_user(db_session)
    other_instructor = make_user(db_session, "instructor")
    for user, code in [(learner, 200), (instructor, 200), (admin, 200), (stranger, 404), (other_instructor, 404)]:
        assert client.get(f"{BASE}/{cert_id}", headers=auth(user)).status_code == code


def test_pdf_download(client, db_session):
    _, learner, _ = setup_completed(client, db_session)
    cert_id = client.get(f"{BASE}/my", headers=auth(learner)).json()[0]["id"]
    r = client.get(f"{BASE}/{cert_id}/pdf", headers=auth(learner))
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")


# ---------------------------------------------------------------- verification
def test_public_verification_without_login(client, db_session):
    _, learner, _ = setup_completed(client, db_session)
    code = client.get(f"{BASE}/my", headers=auth(learner)).json()[0]["verification_code"]
    r = client.get(f"{BASE}/verify/{code.lower()}")  # case-insensitive, no auth header
    assert r.status_code == 200
    body = r.json()
    assert body["valid"] is True
    assert body["learner_name"] == "Asha Learner"
    assert "user_id" not in body and "email" not in str(body)


def test_verify_unknown_code_is_404(client):
    assert client.get(f"{BASE}/verify/LP-NOPE-NOPE-NOPE").status_code == 404


# ---------------------------------------------------------------- revocation
def test_admin_revokes_and_it_stays_revoked(client, db_session):
    _, learner, course = setup_completed(client, db_session)
    cert = client.get(f"{BASE}/my", headers=auth(learner)).json()[0]
    admin = make_user(db_session, "super_admin")

    assert client.post(f"{BASE}/{cert['id']}/revoke", headers=auth(learner), json={"reason": "x"}).status_code == 403
    r = client.post(f"{BASE}/{cert['id']}/revoke", headers=auth(admin), json={"reason": "Plagiarism"})
    assert r.status_code == 200 and r.json()["status"] == "revoked"

    verify = client.get(f"{BASE}/verify/{cert['verification_code']}").json()
    assert verify["valid"] is False and verify["status"] == "revoked"
    assert client.post(f"{BASE}/courses/{course.id}/claim", headers=auth(learner)).status_code == 409
    assert client.get(f"{BASE}/{cert['id']}/pdf", headers=auth(learner)).status_code == 409
    assert client.post(f"{BASE}/{cert['id']}/revoke", headers=auth(admin), json={"reason": "again"}).status_code == 409


def test_revoke_requires_reason(client, db_session):
    _, learner, _ = setup_completed(client, db_session)
    cert_id = client.get(f"{BASE}/my", headers=auth(learner)).json()[0]["id"]
    admin = make_user(db_session, "super_admin")
    assert client.post(f"{BASE}/{cert_id}/revoke", headers=auth(admin), json={"reason": "  "}).status_code == 422


# ---------------------------------------------------------------- listing
def test_admin_lists_and_instructor_lists_own_course_only(client, db_session):
    instructor, _, course = setup_completed(client, db_session)
    admin = make_user(db_session, "super_admin")
    other_instructor = make_user(db_session, "instructor")

    r = client.get(BASE, headers=auth(admin), params={"course_id": course.id})
    assert r.status_code == 200 and len(r.json()) == 1
    assert client.get(BASE, headers=auth(instructor), params={"course_id": course.id}).status_code == 200
    assert client.get(BASE, headers=auth(instructor)).status_code == 400
    assert client.get(BASE, headers=auth(other_instructor), params={"course_id": course.id}).status_code == 403
    learner = make_user(db_session)
    assert client.get(BASE, headers=auth(learner)).status_code == 403
