from datetime import timedelta
import pytest
from fastapi import HTTPException
from app.utils.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
)
from app.api.deps import get_current_user, require_role
from app.models.user import User

# 1. Password hashing works
def test_1_password_hashing_works():
    raw_password = "SecurePassword123!"
    hashed = get_password_hash(raw_password)
    assert hashed != raw_password
    assert len(hashed) > 20
    assert hashed.startswith("$2b$")

# 2. Password verification works
def test_2_password_verification_works():
    raw_password = "SecurePassword123!"
    hashed = get_password_hash(raw_password)
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False

# 3. Registration succeeds
def test_3_registration_succeeds(client):
    payload = {
        "email": "student1@example.com",
        "password": "Password123",
        "full_name": "Student One",
        "role": "learner",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "student1@example.com"
    assert data["full_name"] == "Student One"
    assert data["role"] == "learner"
    assert "id" in data

# 4. Duplicate email registration fails
def test_4_duplicate_email_registration_fails(client):
    payload = {
        "email": "dup_test@example.com",
        "password": "Password123",
        "full_name": "Original Student",
    }
    reg_res = client.post("/api/v1/auth/register", json=payload)
    assert reg_res.status_code == 201

    dup_payload = {
        "email": "dup_test@example.com",
        "password": "AnotherPassword123",
        "full_name": "Duplicate Student",
    }
    response = client.post("/api/v1/auth/register", json=dup_payload)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"].lower()

# 5. Password is not returned in response
def test_5_password_is_not_returned_in_response(client):
    payload = {
        "email": "student2@example.com",
        "password": "Password123",
        "full_name": "Student Two",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "password" not in data
    assert "hashed_password" not in data

# 6. Password hash is stored instead of plain password
def test_6_password_hash_is_stored_instead_of_plain_password(db_session, client):
    payload = {
        "email": "student3@example.com",
        "password": "PlainTextPassword999",
        "full_name": "Student Three",
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    user_in_db = db_session.query(User).filter(User.email == "student3@example.com").first()
    assert user_in_db is not None
    assert user_in_db.hashed_password != "PlainTextPassword999"
    assert user_in_db.hashed_password.startswith("$2b$")
    assert verify_password("PlainTextPassword999", user_in_db.hashed_password) is True

# 7. Login succeeds with correct credentials
def test_7_login_succeeds_with_correct_credentials(client):
    client.post("/api/v1/auth/register", json={
        "email": "login_user@example.com",
        "password": "Password123",
        "full_name": "Login User",
    })
    login_payload = {
        "email": "login_user@example.com",
        "password": "Password123",
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["access_token"]) > 20

# 8. Login fails with incorrect password
def test_8_login_fails_with_incorrect_password(client):
    client.post("/api/v1/auth/register", json={
        "email": "wrong_pw_user@example.com",
        "password": "CorrectPassword123",
        "full_name": "Wrong Pw User",
    })
    login_payload = {
        "email": "wrong_pw_user@example.com",
        "password": "WrongPassword!",
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"

# 9. Login fails with invalid email
def test_9_login_fails_with_invalid_email(client):
    login_payload = {
        "email": "nonexistent@example.com",
        "password": "Password123",
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401
    # Must use generic message, not reveal whether email exists
    assert response.json()["detail"] == "Incorrect email or password"

# 10. JWT token is generated
def test_10_jwt_token_is_generated():
    token = create_access_token({"sub": "user-abc-123", "role": "learner"})
    assert isinstance(token, str)
    assert len(token) > 20

# 11. JWT token can be decoded
def test_11_jwt_token_can_be_decoded():
    token = create_access_token({"sub": "user-abc-123", "role": "learner"})
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "user-abc-123"
    assert payload["role"] == "learner"
    assert "exp" in payload

# 12. Expired JWT is rejected
def test_12_expired_jwt_is_rejected(db_session):
    expired_token = create_access_token({"sub": "user-123"}, expires_delta=timedelta(seconds=-10))
    payload = decode_access_token(expired_token)
    assert payload is None
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=expired_token, db=db_session)
    assert exc_info.value.status_code == 401

# 13. Invalid JWT is rejected
def test_13_invalid_jwt_is_rejected(db_session):
    assert decode_access_token("invalid.token.signature") is None
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token="invalid.token.signature", db=db_session)
    assert exc_info.value.status_code == 401

# 14. /auth/me rejects unauthenticated requests
def test_14_auth_me_rejects_unauthenticated_requests(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401

# 15. /auth/me works with a valid token
def test_15_auth_me_works_with_valid_token(client):
    client.post("/api/v1/auth/register", json={
        "email": "me_user@example.com",
        "password": "Password123",
        "full_name": "Me User",
    })
    login_res = client.post("/api/v1/auth/login", json={
        "email": "me_user@example.com",
        "password": "Password123",
    })
    token = login_res.json()["access_token"]
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me_user@example.com"
    assert data["full_name"] == "Me User"
    assert "password" not in data

# 16. Nonexistent user token is rejected
def test_16_nonexistent_user_token_is_rejected(client, db_session):
    ghost_token = create_access_token({"sub": "ghost-user-id-999"})
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {ghost_token}"}
    )
    assert response.status_code == 401

# 17. Role dependency correctly allows permitted roles
def test_17_role_dependency_allows_permitted_roles():
    super_admin_user = User(
        id="sup-1",
        email="superadmin@platform.com",
        full_name="Super Admin User",
        role="super_admin"
    )
    checker = require_role("super_admin")
    permitted_user = checker(current_user=super_admin_user)
    assert permitted_user.id == super_admin_user.id

# 18. Unauthorized roles are rejected
def test_18_unauthorized_roles_are_rejected():
    learner_user = User(
        id="lrn-1",
        email="learner@platform.com",
        full_name="Learner User",
        role="learner"
    )
    admin_user = User(
        id="adm-legacy-1",
        email="legacy_admin@platform.com",
        full_name="Legacy Admin User",
        role="admin"
    )
    checker = require_role("super_admin")
    with pytest.raises(HTTPException) as exc_info:
        checker(current_user=learner_user)
    assert exc_info.value.status_code == 403
    assert "Insufficient permissions" in exc_info.value.detail

    with pytest.raises(HTTPException) as exc_info_admin:
        checker(current_user=admin_user)
    assert exc_info_admin.value.status_code == 403
    assert "Insufficient permissions" in exc_info_admin.value.detail

# 19. Public registration cannot create Super Admin
def test_19_public_registration_cannot_create_super_admin(client, db_session):
    payload_super = {
        "email": "hacker@example.com",
        "password": "Password123",
        "full_name": "Privilege Escalation Attempt",
        "role": "super_admin",
    }
    res_super = client.post("/api/v1/auth/register", json=payload_super)
    assert res_super.status_code in [400, 403, 422]

    payload_admin = {
        "email": "hacker2@example.com",
        "password": "Password123",
        "full_name": "Admin Escalation Attempt",
        "role": "admin",
    }
    res_admin = client.post("/api/v1/auth/register", json=payload_admin)
    assert res_admin.status_code in [400, 403, 422]

    # Verify no admin user was created
    assert db_session.query(User).filter(User.email == "hacker@example.com").first() is None
    assert db_session.query(User).filter(User.email == "hacker2@example.com").first() is None

# 20. Public registration allows instructor role
def test_20_public_registration_allows_instructor(client, db_session):
    payload_instructor = {
        "email": "professor_reg@example.com",
        "password": "Password123",
        "full_name": "Professor Register",
        "role": "instructor",
    }
    res_inst = client.post("/api/v1/auth/register", json=payload_instructor)
    assert res_inst.status_code == 201
    data = res_inst.json()
    assert data["role"] == "instructor"
    assert data["email"] == "professor_reg@example.com"
