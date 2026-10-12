from datetime import timedelta
import pytest
from fastapi import HTTPException
from app.utils.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
)
from app.api.deps import get_current_user
from app.models.user import User

def test_password_hashing_and_verification():
    raw_password = "SuperSecretPassword123!"
    hashed = get_password_hash(raw_password)

    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_lifecycle():
    data = {"sub": "user-test-123", "role": "learner", "email": "test@example.com"}
    token = create_access_token(data, expires_delta=timedelta(minutes=15))

    assert isinstance(token, str)
    assert len(token) > 20

    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "user-test-123"
    assert payload["role"] == "learner"
    assert payload["email"] == "test@example.com"
    assert "exp" in payload

def test_expired_token_handling():
    data = {"sub": "user-expired"}
    expired_token = create_access_token(data, expires_delta=timedelta(seconds=-10))

    payload = decode_access_token(expired_token)
    assert payload is None

def test_invalid_token_handling():
    assert decode_access_token("not.a.valid.jwt.token") is None
    assert decode_access_token("") is None

def test_get_current_user_dependency(db_session):
    # Create test user
    user = User(
        id="usr-dep-1",
        email="dep_test@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Dependency Tester",
        role="learner",
    )
    db_session.add(user)
    db_session.commit()

    # Valid token
    valid_token = create_access_token({"sub": user.id})
    resolved_user = get_current_user(token=valid_token, db=db_session)
    assert resolved_user.id == user.id
    assert resolved_user.email == user.email

    # Non-existent user in token
    fake_token = create_access_token({"sub": "non-existent-user-id"})
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=fake_token, db=db_session)
    assert exc_info.value.status_code == 401

    # Missing token
    with pytest.raises(HTTPException) as exc_missing:
        get_current_user(token=None, db=db_session)
    assert exc_missing.value.status_code == 401

def test_register_and_login_api_flow(client):
    # 1. Register
    reg_payload = {
        "email": "learner@learningplatform.com",
        "password": "SecurePassword123",
        "full_name": "Alice Learner",
        "role": "learner",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    assert user_data["email"] == "learner@learningplatform.com"
    assert user_data["full_name"] == "Alice Learner"
    assert user_data["role"] == "learner"
    assert "id" in user_data

    # 2. Duplicate registration fails
    dup_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # 3. Login with correct credentials
    login_payload = {
        "email": "learner@learningplatform.com",
        "password": "SecurePassword123",
    }
    login_res = client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

    # 4. Login with incorrect password
    bad_login = {
        "email": "learner@learningplatform.com",
        "password": "IncorrectPassword999",
    }
    bad_res = client.post("/api/v1/auth/login", json=bad_login)
    assert bad_res.status_code == 401
    assert "Incorrect email or password" in bad_res.json()["detail"]

    # 5. Get current user profile with token
    auth_header = {"Authorization": f"Bearer {token_data['access_token']}"}
    me_res = client.get("/api/v1/auth/me", headers=auth_header)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["id"] == user_data["id"]
    assert me_data["email"] == "learner@learningplatform.com"

    # 6. Get current user profile without token fails
    unauth_res = client.get("/api/v1/auth/me")
    assert unauth_res.status_code == 401
