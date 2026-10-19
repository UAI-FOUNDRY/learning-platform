"""The form-based /auth/token endpoint that powers the Authorize button in /docs."""
from tests.factories import PASSWORD, make_user


def test_token_endpoint_accepts_form_login_with_email_as_username(client, db_session):
    user = make_user(db_session, "super_admin")
    r = client.post("/api/v1/auth/token", data={"username": user.email, "password": PASSWORD})
    assert r.status_code == 200
    token = r.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200 and me.json()["role"] == "super_admin"


def test_token_endpoint_rejects_bad_password(client, db_session):
    user = make_user(db_session)
    r = client.post("/api/v1/auth/token", data={"username": user.email, "password": "wrong-password"})
    assert r.status_code == 401


def test_token_endpoint_blocks_suspended_user(client, db_session):
    user = make_user(db_session, status="suspended")
    r = client.post("/api/v1/auth/token", data={"username": user.email, "password": PASSWORD})
    assert r.status_code == 403


def test_openapi_points_authorize_button_at_token_endpoint(client):
    schema = client.get("/openapi.json").json()
    flows = schema["components"]["securitySchemes"]["OAuth2PasswordBearer"]["flows"]
    assert flows["password"]["tokenUrl"] == "/api/v1/auth/token"


def test_json_login_still_works(client, db_session):
    user = make_user(db_session)
    r = client.post("/api/v1/auth/login", json={"email": user.email, "password": PASSWORD})
    assert r.status_code == 200
