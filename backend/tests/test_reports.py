from app.models import QAAnswer, QAQuestion, Review
from app.models.platform_setting import PlatformSetting
from tests.factories import auth, enroll, make_course, make_user

API = "/api/v1"


def world(db, client):
    admin, inst = make_user(db, "super_admin"), make_user(db, "instructor")
    a, b = make_user(db), make_user(db)
    course, _ = make_course(db, inst)
    enroll(db, a, course)
    enroll(db, b, course)
    q = client.post(f"{API}/qa/courses/{course.id}/questions", headers=auth(a), json={"title": "Q", "body": "question text"}).json()
    ans = client.post(f"{API}/qa/questions/{q['id']}/answers", headers=auth(b), json={"body": "spammy answer"}).json()["answers"][0]
    rev = client.post(f"{API}/reviews", headers=auth(a), json={"course_id": course.id, "rating": 1, "review_text": "awful"}).json()
    return admin, inst, a, b, course, q, ans, rev


def report(client, user, ttype, tid, reason="spam", **extra):
    return client.post(f"{API}/reports", headers=auth(user), json={"target_type": ttype, "target_id": tid, "reason": reason, **extra})


def test_report_rules(client, db_session):
    admin, inst, a, b, course, q, ans, rev = world(db_session, client)
    r = report(client, a, "qa_answer", ans["id"], details="  advertising  ")
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "open" and body["details"] == "advertising" and body["target_preview"] == "spammy answer"
    assert body["reporter_name"] == a.full_name and body["target_status"] == "visible"

    assert report(client, a, "qa_answer", ans["id"]).status_code == 409                 # already open
    assert report(client, b, "qa_answer", ans["id"]).status_code == 400                 # own content
    assert report(client, b, "qa_question", q["id"]).status_code == 201                 # someone else's is fine
    assert report(client, a, "review", rev["id"]).status_code == 400                    # own review
    assert report(client, a, "user", a.id).status_code == 400
    assert report(client, a, "user", b.id, "abuse").status_code == 201
    assert report(client, a, "course", course.id, "copyright").status_code == 201
    assert report(client, inst, "course", course.id).status_code == 400                 # instructor's own course
    assert report(client, a, "qa_answer", "missing").status_code == 404
    assert report(client, a, "qa_answer", ans["id"], "boring").status_code == 422
    assert report(client, a, "banana", ans["id"]).status_code == 422
    assert client.post(f"{API}/reports", json={}).status_code == 401
    assert len(client.get(f"{API}/reports/my", headers=auth(a)).json()) == 3


def test_admin_queue_filters_and_permissions(client, db_session):
    admin, inst, a, b, course, q, ans, rev = world(db_session, client)
    report(client, a, "qa_answer", ans["id"], "spam")
    report(client, b, "review", rev["id"], "abuse")
    assert client.get(f"{API}/reports", headers=auth(a)).status_code == 403
    assert client.get(f"{API}/reports", headers=auth(inst)).status_code == 403
    allr = client.get(f"{API}/reports", headers=auth(admin)).json()
    assert len(allr) == 2
    assert [r["target_type"] for r in client.get(f"{API}/reports", headers=auth(admin), params={"target_type": "review"}).json()] == ["review"]
    assert [r["reason"] for r in client.get(f"{API}/reports", headers=auth(admin), params={"reason": "spam"}).json()] == ["spam"]
    assert client.get(f"{API}/reports/{allr[0]['id']}", headers=auth(admin)).status_code == 200
    assert client.get(f"{API}/reports/nope", headers=auth(admin)).status_code == 404
    assert client.get(f"{API}/admin/overview", headers=auth(admin)).json()["open_reports"] == 2


def test_resolve_with_hide_closes_sibling_reports_and_can_restore(client, db_session):
    admin, inst, a, b, course, q, ans, rev = world(db_session, client)
    third = make_user(db_session)
    enroll(db_session, third, course)
    r1 = report(client, a, "qa_answer", ans["id"]).json()
    report(client, third, "qa_answer", ans["id"], "abuse")

    assert client.patch(f"{API}/reports/{r1['id']}", headers=auth(admin), json={"status": "reviewing"}).json()["status"] == "reviewing"
    done = client.patch(f"{API}/reports/{r1['id']}", headers=auth(admin),
                        json={"status": "resolved", "action": "hide", "resolution_note": "Spam, hidden"})
    assert done.status_code == 200 and done.json()["resolved_by"] == admin.id and done.json()["target_status"] == "hidden"
    db_session.expire_all()
    assert db_session.get(QAAnswer, ans["id"]).status == "hidden"
    assert db_session.get(QAQuestion, q["id"]).answer_count == 0
    statuses = {r["status"] for r in client.get(f"{API}/reports", headers=auth(admin)).json()}
    assert statuses == {"resolved"}                                             # sibling closed too
    assert client.patch(f"{API}/reports/{r1['id']}", headers=auth(admin), json={"status": "reviewing"}).status_code == 409

    again = report(client, a, "qa_answer", ans["id"]).json()                   # a new report after closure is allowed
    back = client.patch(f"{API}/reports/{again['id']}", headers=auth(admin), json={"status": "dismissed", "action": "restore"})
    assert back.json()["target_status"] == "visible"
    db_session.expire_all()
    assert db_session.get(QAQuestion, q["id"]).answer_count == 1


def test_remove_review_and_action_validation(client, db_session):
    admin, inst, a, b, course, q, ans, rev = world(db_session, client)
    r = report(client, b, "review", rev["id"], "abuse").json()
    out = client.patch(f"{API}/reports/{r['id']}", headers=auth(admin), json={"status": "resolved", "action": "remove"})
    assert out.json()["target_status"] == "removed"
    db_session.expire_all()
    assert db_session.get(Review, rev["id"]).status == "removed"
    assert client.get(f"{API}/reviews/courses/{course.id}/summary").json()["review_count"] == 0

    rc = report(client, a, "course", course.id, "copyright").json()
    assert client.patch(f"{API}/reports/{rc['id']}", headers=auth(admin), json={"status": "resolved", "action": "hide"}).status_code == 400
    assert client.patch(f"{API}/reports/{rc['id']}", headers=auth(admin), json={"status": "resolved"}).status_code == 200
    assert client.patch(f"{API}/reports/{rc['id']}", headers=auth(admin), json={"status": "closed"}).status_code == 422


def test_auto_hide_after_threshold_of_distinct_reporters(client, db_session):
    admin, inst, a, b, course, q, ans, rev = world(db_session, client)
    db_session.add(PlatformSetting(key="content.auto_hide_report_threshold", value=2, category="content"))
    db_session.commit()
    c = make_user(db_session)
    enroll(db_session, c, course)
    report(client, a, "qa_answer", ans["id"])
    db_session.expire_all()
    assert db_session.get(QAAnswer, ans["id"]).status == "visible"
    report(client, c, "qa_answer", ans["id"])
    db_session.expire_all()
    assert db_session.get(QAAnswer, ans["id"]).status == "hidden"
    logs = client.get(f"{API}/admin/audit-logs", headers=auth(admin), params={"action": "content.auto_hidden"}).json()
    assert len(logs) == 1 and logs[0]["entity_id"] == ans["id"] and logs[0]["actor_id"] is None
