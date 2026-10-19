import os

os.environ["EMAIL_BACKEND"] = "memory"  # emails are captured in email_service.outbox
os.environ["STORAGE_BACKEND"] = "memory"  # uploaded files are kept in RAM

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database.connection import Base
from app.database.session import get_db
from app.main import app

# In-memory SQLite engine for isolated automated testing
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    if transaction.is_active:
        transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _legacy_tests_edit_published_courses(request):
    """Older suites build content on already-published courses, so they run with the
    "re-review on published edit" rule off. tests/test_course_lifecycle.py exercises the rule itself."""
    if "db_session" not in request.fixturenames or request.module.__name__.endswith("test_course_lifecycle"):
        yield
        return
    from app.models.platform_setting import PlatformSetting
    db = request.getfixturevalue("db_session")
    db.add(PlatformSetting(key="courses.reapproval_on_published_edit", value=False, category="courses"))
    db.commit()
    yield


@pytest.fixture(autouse=True)
def _empty_file_storage():
    """Each test starts with no uploaded files (STORAGE_BACKEND=memory)."""
    from app.services.storage_service import storage_service
    storage_service._memory.clear()
    yield


@pytest.fixture(autouse=True)
def _coding_background_uses_test_session(request, monkeypatch):
    """Coding runs are evaluated after the response; give that work the same in-memory test database."""
    if "db_session" not in request.fixturenames:
        yield
        return
    from contextlib import contextmanager
    from app.services import coding_service as module
    db = request.getfixturevalue("db_session")

    @contextmanager
    def shared_session():
        yield db

    monkeypatch.setattr(module, "background_session", shared_session)
    yield
