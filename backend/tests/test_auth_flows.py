"""Refresh tokens, logout, password reset/change, email verification, login history, lockout."""
import re

import pytest

from app.models import LoginHistory
from app.models.platform_setting import PlatformSetting
from app.services.email_service import email_service
from tests.factories import PASSWORD, auth, make_user, uid

API = "/api/v1/auth"


@pytest.fixture(autouse=True)
def clean_outbox():
    email_service.outbox.clear()
    yield


def login(client, email, password=PASSWORD):
    return client.post(f"{API}/login", json={"email": email, "password": password})


def token_from_outbox(index=-1):
    return re.search(r"token=([\w-]+)", email_service.outbox[index]["body"]).group(1)


def set_setting(db, key, value, category):
    db.add(PlatformSetting(key=key, value=value, category=category))
    db.commit()


# ---------------------------------------------------------------- refresh / logout
def test_login_returns_refresh_token_and_expiry(client, db_session):
    user = make_user(db_session)
    body = login(client, user.email).json()
    assert body["refresh_token"] and body["expires_in"] == 3600 and body["access_token"]


def test_refresh_rotates_tokens_and_old_one_stops_working(client, db_session):
    user = make_user(db_session)
    first = login(client, user.email).json()
    r = client.post(f"{API}/refresh", json={"refresh_token": first["refresh_token"]})
    assert r.status_code == 200
    second = r.json()
    assert second["refresh_token"] != first["refresh_token"]
    me = client.get(f"{API}/me", headers={"Authorization": f"Bearer {second['access_token']}"})
    assert me.status_code == 200
    # replaying the old token fails AND revokes the whole family
    assert client.post(f"{API}/refresh", json={"refresh_token": first["refresh_token"]}).status_code == 401
    assert client.post(f"{API}/refresh", json={"refresh_token": second["refresh_token"]}).status_code == 401


def test_refresh_rejects_garbage_and_suspended_users(client, db_session):
    assert client.post(f"{API}/refresh", json={"refresh_token": "nope"}).status_code == 401
    user = make_user(db_session)
    tokens = login(client, user.email).json()
    user.status = "suspended"
    db_session.commit()
    assert client.post(f"{API}/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 403


def test_logout_revokes_refresh_token(client, db_session):
    user = make_user(db_session)
    tokens = login(client, user.email).json()
    assert client.post(f"{API}/logout", json={"refresh_token": tokens["refresh_token"]}).status_code == 200
    assert client.post(f"{API}/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 401
    # logging out twice, or without a token, is harmless
    assert client.post(f"{API}/logout", json={"refresh_token": tokens["refresh_token"]}).status_code == 200
    assert client.post(f"{API}/logout", json={}).status_code == 200


def test_logout_all_devices(client, db_session):
    user = make_user(db_session)
    a, b = login(client, user.email).json(), login(client, user.email).json()
    r = client.post(f"{API}/logout-all", headers={"Authorization": f"Bearer {a['access_token']}"})
    assert r.status_code == 200
    for t in (a, b):
        assert client.post(f"{API}/refresh", json={"refresh_token": t["refresh_token"]}).status_code == 401
    assert client.post(f"{API}/logout-all").status_code == 401


# ---------------------------------------------------------------- password reset
def test_forgot_password_is_generic_and_sends_one_email(client, db_session):
    user = make_user(db_session)
    known = client.post(f"{API}/forgot-password", json={"email": user.email})
    unknown = client.post(f"{API}/forgot-password", json={"email": f"ghost-{uid()}@example.com"})
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()
    assert len(email_service.outbox) == 1 and email_service.outbox[0]["to"] == user.email


def test_reset_password_flow(client, db_session):
    user = make_user(db_session)
    session = login(client, user.email).json()
    client.post(f"{API}/forgot-password", json={"email": user.email})
    token = token_from_outbox()

    r = client.post(f"{API}/reset-password", json={"token": token, "new_password": "BrandNewPass9"})
    assert r.status_code == 200, r.text
    assert login(client, user.email).status_code == 401  # old password gone
    assert login(client, user.email, "BrandNewPass9").status_code == 200
    # the token is single use, and old sessions are dead
    assert client.post(f"{API}/reset-password", json={"token": token, "new_password": "AnotherPass99"}).status_code == 400
    assert client.post(f"{API}/refresh", json={"refresh_token": session["refresh_token"]}).status_code == 401


def test_reset_password_rejects_bad_token_and_weak_password(client, db_session):
    user = make_user(db_session)
    assert client.post(f"{API}/reset-password", json={"token": "bad", "new_password": "BrandNewPass9"}).status_code == 400
    client.post(f"{API}/forgot-password", json={"email": user.email})
    token = token_from_outbox()
    assert client.post(f"{API}/reset-password", json={"token": token, "new_password": "short"}).status_code == 422
    # the failed attempt did not burn the token
    assert client.post(f"{API}/reset-password", json={"token": token, "new_password": "BrandNewPass9"}).status_code == 200


def test_new_reset_request_invalidates_previous_link(client, db_session):
    user = make_user(db_session)
    client.post(f"{API}/forgot-password", json={"email": user.email})
    client.post(f"{API}/forgot-password", json={"email": user.email})
    old, new = token_from_outbox(0), token_from_outbox(1)
    assert client.post(f"{API}/reset-password", json={"token": old, "new_password": "BrandNewPass9"}).status_code == 400
    assert client.post(f"{API}/reset-password", json={"token": new, "new_password": "BrandNewPass9"}).status_code == 200


def test_expired_reset_token(client, db_session):
    from datetime import datetime, timedelta
    from app.models import AuthToken
    user = make_user(db_session)
    client.post(f"{API}/forgot-password", json={"email": user.email})
    token = token_from_outbox()
    row = db_session.query(AuthToken).filter_by(user_id=user.id, purpose="password_reset").one()
    row.expires_at = datetime.utcnow() - timedelta(minutes=1)
    db_session.commit()
    assert client.post(f"{API}/reset-password", json={"token": token, "new_password": "BrandNewPass9"}).status_code == 400


def test_suspended_user_gets_no_reset_email(client, db_session):
    user = make_user(db_session, status="suspended")
    client.post(f"{API}/forgot-password", json={"email": user.email})
    assert email_service.outbox == []


# ---------------------------------------------------------------- change password
def test_change_password(client, db_session):
    user = make_user(db_session)
    h = auth(user)
    assert client.post(f"{API}/change-password", headers=h,
                       json={"current_password": "wrong", "new_password": "BrandNewPass9"}).status_code == 400
    assert client.post(f"{API}/change-password", headers=h,
                       json={"current_password": PASSWORD, "new_password": PASSWORD}).status_code == 400
    assert client.post(f"{API}/change-password", headers=h,
                       json={"current_password": PASSWORD, "new_password": "short"}).status_code == 422
    ok = client.post(f"{API}/change-password", headers=h,
                     json={"current_password": PASSWORD, "new_password": "BrandNewPass9"})
    assert ok.status_code == 200
    assert login(client, user.email, "BrandNewPass9").status_code == 200
    assert client.post(f"{API}/change-password", json={}).status_code in (401, 422)


# ---------------------------------------------------------------- email verification
def test_register_sends_verification_and_verify_marks_user(client, db_session):
    email = f"new-{uid()}@example.com"
    r = client.post(f"{API}/register", json={"email": email, "full_name": "New Person", "password": "Password123"})
    assert r.status_code == 201
    assert len(email_service.outbox) == 1 and "verify-email" in email_service.outbox[0]["body"]
    token = token_from_outbox()
    assert client.post(f"{API}/verify-email", json={"token": token}).status_code == 200
    assert client.post(f"{API}/verify-email", json={"token": token}).status_code == 400
    from app.models import User
    assert db_session.query(User).filter_by(email=email).one().is_email_verified is True


def test_login_blocked_until_verified_when_setting_on(client, db_session):
    set_setting(db_session, "users.require_email_verification", True, "users")
    email = f"v-{uid()}@example.com"
    client.post(f"{API}/register", json={"email": email, "full_name": "V User", "password": "Password123"})
    blocked = login(client, email)
    assert blocked.status_code == 403 and "verify" in blocked.json()["message"].lower()

    client.post(f"{API}/resend-verification", json={"email": email})
    assert len(email_service.outbox) == 2
    client.post(f"{API}/verify-email", json={"token": token_from_outbox()})
    assert login(client, email).status_code == 200


def test_super_admin_is_exempt_from_verification_gate(client, db_session):
    set_setting(db_session, "users.require_email_verification", True, "users")
    admin = make_user(db_session, "super_admin")
    assert login(client, admin.email).status_code == 200


def test_resend_verification_is_generic(client, db_session):
    r = client.post(f"{API}/resend-verification", json={"email": f"ghost-{uid()}@example.com"})
    assert r.status_code == 200 and email_service.outbox == []


# ---------------------------------------------------------------- registration settings
def test_registration_can_be_closed_or_limited(client, db_session):
    body = lambda role: {"email": f"r-{uid()}@example.com", "full_name": "R", "password": "Password123", "role": role}
    set_setting(db_session, "users.allow_instructor_self_signup", False, "users")
    assert client.post(f"{API}/register", json=body("instructor")).status_code == 403
    assert client.post(f"{API}/register", json=body("learner")).status_code == 201
    db_session.get(PlatformSetting, "users.allow_public_registration") or set_setting(
        db_session, "users.allow_public_registration", False, "users")
    assert client.post(f"{API}/register", json=body("learner")).status_code == 403


# ---------------------------------------------------------------- login history & lockout
def test_login_history_records_success_and_failures(client, db_session):
    user = make_user(db_session)
    login(client, user.email, "wrong")
    login(client, f"ghost-{uid()}@example.com", "wrong")
    login(client, user.email)
    rows = db_session.query(LoginHistory).order_by(LoginHistory.created_at).all()
    assert [(r.success, r.failure_reason) for r in rows] == [(False, "bad_password"), (False, "unknown_email"), (True, None)]
    assert rows[0].user_id == user.id and rows[1].user_id is None


def test_lockout_after_too_many_failures_and_resets_on_success(client, db_session):
    user = make_user(db_session)
    for _ in range(5):
        assert login(client, user.email, "wrong").status_code == 401
    locked = login(client, user.email)  # even the right password is refused while locked
    assert locked.status_code == 429


def test_failures_before_a_success_do_not_count(client, db_session):
    user = make_user(db_session)
    for _ in range(4):
        login(client, user.email, "wrong")
    assert login(client, user.email).status_code == 200
    for _ in range(4):
        login(client, user.email, "wrong")
    assert login(client, user.email).status_code == 200
