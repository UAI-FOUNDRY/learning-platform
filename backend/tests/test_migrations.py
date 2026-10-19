"""
Runs the real Alembic migrations against PostgreSQL.

Skipped unless TEST_POSTGRES_URL points at an EMPTY, throwaway database, e.g.
    TEST_POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/lp_migration_test pytest tests/test_migrations.py
CI sets this automatically (see .github/workflows/ci.yml). Never point it at a real database:
the test downgrades everything at the end.
"""
import os
import pathlib
import pytest
from sqlalchemy import create_engine, inspect, text

TEST_URL = os.environ.get("TEST_POSTGRES_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="TEST_POSTGRES_URL not set")

BACKEND_DIR = pathlib.Path(__file__).resolve().parents[1]


@pytest.fixture
def alembic_cfg(monkeypatch):
    from alembic.config import Config
    from app.config.settings import settings
    monkeypatch.setattr(settings, "DATABASE_URL", TEST_URL)
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    return cfg


def test_upgrade_check_and_downgrade(alembic_cfg):
    from alembic import command
    from app.database.connection import Base
    import app.models  # noqa: F401

    command.upgrade(alembic_cfg, "head")
    engine = create_engine(TEST_URL)
    try:
        tables = set(inspect(engine).get_table_names())
        assert set(Base.metadata.tables) <= tables, "a model has no table after upgrade"

        # Models and migrations must describe exactly the same schema.
        command.check(alembic_cfg)

        with engine.connect() as conn:
            assert conn.execute(text("SELECT count(*) FROM platform_settings")).scalar() > 0
            no_rls = conn.execute(text(
                "SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity"
            )).scalar()
            assert no_rls == 0, "every public table must have Row Level Security enabled"
    finally:
        engine.dispose()
        command.downgrade(alembic_cfg, "base")
