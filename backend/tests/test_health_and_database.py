from unittest.mock import patch
from app.config.settings import Settings
from app.database.connection import create_db_engine, check_database_connection
from app.models.user import User

def test_health_check_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "learning-platform-api"
    assert "environment" in data
    assert "database" in data
    assert data["database"] in ["connected", "disconnected"]

def test_database_session_crud_and_rollback(db_session):
    # Test creation
    test_user = User(
        id="usr-sess-1",
        email="sess_test@example.com",
        hashed_password="hashed_pw_here",
        full_name="Session Tester",
        role="learner",
    )
    db_session.add(test_user)
    db_session.commit()

    # Test query
    retrieved = db_session.query(User).filter(User.id == "usr-sess-1").first()
    assert retrieved is not None
    assert retrieved.email == "sess_test@example.com"

    # Test rollback
    db_session.rollback()
    assert db_session.is_active

def test_supabase_url_normalization():
    # Test standard Supabase postgres:// -> postgresql:// normalization
    supabase_settings = Settings(
        DATABASE_URL="postgres://postgres.demo:secret123@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
    )
    assert supabase_settings.sync_database_url.startswith("postgresql://")
    assert "secret123" in supabase_settings.sync_database_url

def test_database_connection_probe_safe_failure():
    # Verify that check_database_connection handles unreachable DB without crashing
    with patch("app.database.connection.engine.connect", side_effect=Exception("Connection refused")):
        is_connected = check_database_connection(timeout_seconds=0.1)
        assert is_connected is False

def test_error_handlers_format(client):
    # Test 404 error response structure
    res_404 = client.get("/api/v1/non-existent-endpoint")
    assert res_404.status_code == 404
    data_404 = res_404.json()
    assert "detail" in data_404

    # Test 422 validation error response structure
    res_422 = client.post("/api/v1/auth/register", json={"invalid": "payload"})
    assert res_422.status_code == 422
    data_422 = res_422.json()
    assert data_422["error_type"] == "validation_error"
