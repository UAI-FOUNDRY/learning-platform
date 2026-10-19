import pytest
from unittest.mock import patch
from app.main import app
from app.config.settings import Settings, settings
from app.database.connection import Base, get_database_status, check_database_connection
from app.database.session import get_db
import app.models as models

EXPECTED_TABLES = [
    "users",
    "organizations",
    "organization_members",
    "categories",
    "courses",
    "sections",
    "lectures",
    "enrollments",
    "progress",
    "quizzes",
    "questions",
    "quiz_attempts",
    "assignments",
    "submissions",
    "certificates",
    "reviews",
]

def test_1_application_starts_successfully(client):
    """Verify FastAPI application starts and registers core routes."""
    assert app.title == "Learning Platform API"
    route_paths = [r.path for r in app.routes if hasattr(r, "path")]
    assert "/api/health" in route_paths
    assert "/api/v1/auth/" in route_paths
    assert "/api/v1/users/" in route_paths
    assert "/api/v1/courses/" in route_paths
    assert "/api/v1/admin/overview" in route_paths

def test_2_health_endpoint_works(client):
    """Verify health endpoint responds with safe status without leaking credentials."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "learning-platform-api"
    assert "database" in data
    assert data["database"] in ["connected", "pending", "not_configured"]
    # Secrets must NEVER be leaked
    assert "password" not in str(data).lower()
    assert "secret" not in str(data).lower()
    assert "DATABASE_URL" not in data

def test_3_models_can_be_imported_cleanly():
    """Verify every exported model / association table imports cleanly without circular imports."""
    from sqlalchemy import Table
    assert len(models.__all__) >= 16
    for model_name in models.__all__:
        assert hasattr(models, model_name)
        model_cls = getattr(models, model_name)
        assert hasattr(model_cls, "__tablename__") or isinstance(model_cls, Table)

def test_4_database_session_dependency_structure(db_session):
    """Verify database session dependency yields session and handles commit/rollback."""
    generator = get_db()
    session = next(generator)
    assert session is not None
    assert hasattr(session, "query")
    assert hasattr(session, "commit")
    assert hasattr(session, "rollback")
    # Clean up generator
    try:
        next(generator)
    except StopIteration:
        pass

def test_5_basic_model_metadata_is_valid():
    """Verify the 16 core tables are still registered and every table has a primary key."""
    registered_tables = list(Base.metadata.tables.keys())
    assert len(registered_tables) >= 16
    for table in Base.metadata.tables.values():
        assert table.primary_key.columns, f"Table {table.name} has no primary key"
    for table_name in EXPECTED_TABLES:
        assert table_name in registered_tables, f"Missing table {table_name} in metadata"
        table = Base.metadata.tables[table_name]
        assert "id" in table.columns, f"Table {table_name} missing 'id' column"

def test_6_configuration_loads_correctly():
    """Verify environment-based Settings loads and normalizes Supabase URLs."""
    custom_settings = Settings(
        ENVIRONMENT="staging",
        PORT=9000,
        DATABASE_URL="postgres://postgres.abc:pwd123@db.supabase.co:5432/postgres",
        SECRET_KEY="custom_secret_key",
    )
    assert custom_settings.ENVIRONMENT == "staging"
    assert custom_settings.PORT == 9000
    assert custom_settings.sync_database_url.startswith("postgresql://")
    assert "postgres://" not in custom_settings.sync_database_url

def test_database_status_unconfigured_and_pending_safety():
    """Verify database status handles missing or unreachable databases safely."""
    # When unconfigured / empty
    with patch.object(settings, "DATABASE_URL", None):
        assert get_database_status() == "not_configured"

    # When unreachable / pending Supabase creation
    with patch("app.database.connection.engine.connect", side_effect=Exception("Connection refused")):
        assert get_database_status() == "pending"
        assert check_database_connection() is False
