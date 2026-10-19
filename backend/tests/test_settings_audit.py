from app.models import AuditLog
from app.models.platform_setting import PlatformSetting
from tests.factories import PASSWORD, auth, make_course, make_user

API = "/api/v1"


def seed(db):
    rows = [
        ("general.platform_name", "Learning Platform", "general", True),
        ("users.allow_public_registration", True, "users", True),
        ("security.max_failed_logins", 5, "security", False),
        ("security.password_min_length", 8, "security", False),
        ("general.supported_languages", ["en"], "general", True),
        ("general.support_email", None, "general", True),
    ]
    for key, value, cat, public in rows:
        db.add(PlatformSetting(key=key, value=value, category=cat, is_public=public))
    db.commit()


def test_public_settings_only_expose_public_keys(client, db_session):
    seed(db_session)
    data = client.get(f"{API}/settings/public").json()
    assert data["general.platform_name"] == "Learning Platform"
    assert "security.max_failed_logins" not in data


def test_settings_are_super_admin_only(client, db_session):
    seed(db_session)
    learner = make_user(db_session)
    assert client.get(f"{API}/settings").status_code == 401
    assert client.get(f"{API}/settings", headers=auth(learner)).status_code == 403
    assert client.put(f"{API}/settings/security.max_failed_logins", headers=auth(learner), json={"value": 3}).status_code == 403


def test_admin_lists_filters_and_updates_settings(client, db_session):
    seed(db_session)
    admin = make_user(db_session, "super_admin")
    keys = {s["key"] for s in client.get(f"{API}/settings", headers=auth(admin)).json()}
    assert {"general.platform_name", "security.max_failed_logins", "general.support_email"} <= keys
    sec = client.get(f"{API}/settings", headers=auth(admin), params={"category": "security"}).json()
    assert {s["key"] for s in sec} == {"security.max_failed_logins", "security.password_min_length"}

    r = client.put(f"{API}/settings/security.max_failed_logins", headers=auth(admin), json={"value": 3})
    assert r.status_code == 200 and r.json()["value"] == 3 and r.json()["updated_by"] == admin.id
    r = client.put(f"{API}/settings/general.support_email", headers=auth(admin), json={"value": "help@uaiu.ac.in"})
    assert r.json()["value"] == "help@uaiu.ac.in"


def test_setting_validation(client, db_session):
    seed(db_session)
    admin = make_user(db_session, "super_admin")
    put = lambda key, value: client.put(f"{API}/settings/{key}", headers=auth(admin), json={"value": value})
    assert put("nope.nothing", 1).status_code == 422
    assert put("users.allow_public_registration", "yes").status_code == 422      # must stay a boolean
    assert put("security.max_failed_logins", "five").status_code == 422          # must stay a number
    assert put("security.password_min_length", 2).status_code == 422             # below the allowed range
    assert put("general.supported_languages", "en").status_code == 422           # must be a list
    assert put("general.supported_languages", ["en", "hi"]).status_code == 200


def test_bulk_update_is_all_or_nothing(client, db_session):
    seed(db_session)
    admin = make_user(db_session, "super_admin")
    bad = client.put(f"{API}/settings", headers=auth(admin),
                     json={"values": {"security.max_failed_logins": 9, "security.password_min_length": 1}})
    assert bad.status_code == 422 and "password_min_length" in bad.json()["message"]
    db_session.expire_all()
    assert db_session.get(PlatformSetting, "security.max_failed_logins").value == 5
    ok = client.put(f"{API}/settings", headers=auth(admin),
                    json={"values": {"security.max_failed_logins": 9, "security.password_min_length": 10}})
    assert ok.status_code == 200 and len(ok.json()) == 2


def test_settings_change_is_enforced_by_the_app(client, db_session):
    seed(db_session)
    admin = make_user(db_session, "super_admin")
    client.put(f"{API}/settings/users.allow_public_registration", headers=auth(admin), json={"value": False})
    r = client.post(f"{API}/auth/register", json={"email": "x@example.com", "full_name": "X", "password": "Password123"})
    assert r.status_code == 403


# ---------------------------------------------------------------- audit log
def test_audit_log_records_admin_actions(client, db_session):
    seed(db_session)
    admin = make_user(db_session, "super_admin")
    inst = make_user(db_session, "instructor")
    learner = make_user(db_session)
    course, _ = make_course(db_session, inst, status="draft")

    client.put(f"{API}/settings/security.max_failed_logins", headers=auth(admin), json={"value": 7})
    client.put(f"{API}/users/{learner.id}", headers=auth(admin), json={"status": "suspended"})
    client.post(f"{API}/courses/{course.id}/submit", headers=auth(inst))
    client.post(f"{API}/admin/courses/{course.id}/approve", headers=auth(admin))

    rows = client.get(f"{API}/admin/audit-logs", headers=auth(admin)).json()
    actions = [r["action"] for r in rows]
    assert {"settings.updated", "user.status_changed", "course.approved"} <= set(actions)
    status_row = next(r for r in rows if r["action"] == "user.status_changed")
    assert status_row["changes"] == {"status": ["active", "suspended"]}
    assert status_row["actor_name"] == admin.full_name and status_row["entity_id"] == learner.id

    only_course = client.get(f"{API}/admin/audit-logs", headers=auth(admin), params={"action": "course."}).json()
    assert [r["action"] for r in only_course] == ["course.approved"]
    assert client.get(f"{API}/admin/audit-logs", headers=auth(inst)).status_code == 403


def test_no_audit_row_when_nothing_changed(client, db_session):
    seed(db_session)
    admin = make_user(db_session, "super_admin")
    client.put(f"{API}/settings/security.max_failed_logins", headers=auth(admin), json={"value": 5})
    assert db_session.query(AuditLog).count() == 0


def test_login_history_endpoint(client, db_session):
    admin = make_user(db_session, "super_admin")
    user = make_user(db_session)
    client.post(f"{API}/auth/login", json={"email": user.email, "password": "wrong"})
    client.post(f"{API}/auth/login", json={"email": user.email, "password": PASSWORD})
    rows = client.get(f"{API}/admin/login-history", headers=auth(admin), params={"email": user.email}).json()
    assert [r["success"] for r in rows] == [True, False]
    failed = client.get(f"{API}/admin/login-history", headers=auth(admin), params={"success": "false"}).json()
    assert len(failed) == 1 and failed[0]["failure_reason"] == "bad_password"
    assert client.get(f"{API}/admin/login-history", headers=auth(user)).status_code == 403
