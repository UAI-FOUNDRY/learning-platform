"""Account status (activate / deactivate / suspend) and last-login tracking."""
from app.models.user import User
from app.utils.security import get_password_hash, create_access_token


def make_user(db, email, role="learner", status="active", password="Password123"):
    user = User(
        email=email, full_name="Status User", role=role, status=status,
        hashed_password=get_password_hash(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def headers(user):
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


def login(client, email, password="Password123"):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_new_users_are_active_by_default(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "fresh@example.com", "password": "Password123", "full_name": "Fresh", "role": "learner",
    })
    assert r.status_code == 201
    assert r.json()["status"] == "active"


def test_login_records_last_login(client, db_session):
    user = make_user(db_session, "lastlogin@example.com")
    assert user.last_login_at is None
    assert login(client, "lastlogin@example.com").status_code == 200
    db_session.refresh(user)
    assert user.last_login_at is not None


def test_suspended_user_cannot_log_in(client, db_session):
    make_user(db_session, "suspended@example.com", status="suspended")
    r = login(client, "suspended@example.com")
    assert r.status_code == 403
    assert "suspended" in r.json()["detail"]


def test_wrong_password_on_suspended_account_stays_generic(client, db_session):
    make_user(db_session, "suspended2@example.com", status="suspended")
    r = login(client, "suspended2@example.com", password="WrongPassword1")
    assert r.status_code == 401  # never reveal account state without the right password


def test_inactive_user_existing_token_is_rejected(client, db_session):
    user = make_user(db_session, "inactive@example.com")
    h = headers(user)
    assert client.get("/api/v1/auth/me", headers=h).status_code == 200
    user.status = "inactive"
    db_session.commit()
    assert client.get("/api/v1/auth/me", headers=h).status_code == 403


def test_admin_can_suspend_and_reactivate_user(client, db_session):
    admin = make_user(db_session, "statusadmin@example.com", role="super_admin")
    target = make_user(db_session, "target@example.com")

    r = client.put(f"/api/v1/users/{target.id}", headers=headers(admin), json={"status": "suspended"})
    assert r.status_code == 200
    assert r.json()["status"] == "suspended"
    assert login(client, "target@example.com").status_code == 403

    r = client.put(f"/api/v1/users/{target.id}", headers=headers(admin), json={"status": "active"})
    assert r.status_code == 200
    assert login(client, "target@example.com").status_code == 200


def test_admin_cannot_change_own_status(client, db_session):
    admin = make_user(db_session, "selfadmin@example.com", role="super_admin")
    r = client.put(f"/api/v1/users/{admin.id}", headers=headers(admin), json={"status": "inactive"})
    assert r.status_code == 400


def test_invalid_status_is_rejected(client, db_session):
    admin = make_user(db_session, "badstatus@example.com", role="super_admin")
    target = make_user(db_session, "badstatus-target@example.com")
    r = client.put(f"/api/v1/users/{target.id}", headers=headers(admin), json={"status": "banned"})
    assert r.status_code == 422


def test_non_admin_cannot_change_status(client, db_session):
    instructor = make_user(db_session, "inst-status@example.com", role="instructor")
    target = make_user(db_session, "victim@example.com")
    r = client.put(f"/api/v1/users/{target.id}", headers=headers(instructor), json={"status": "suspended"})
    assert r.status_code == 403
