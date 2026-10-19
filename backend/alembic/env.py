"""
Alembic environment for the Learning Platform.

The database URL comes from the application settings (DATABASE_URL in .env or
the environment), so Alembic always targets the same database as the API.
Never hard-code credentials in alembic.ini.
"""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config.settings import settings
from app.database.connection import Base
import app.models  # noqa: F401  (registers every model on Base.metadata)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

database_url = settings.sync_database_url
if not database_url:
    raise RuntimeError("DATABASE_URL is not set. Add it to backend/.env before running Alembic.")
# ConfigParser treats '%' as interpolation, so escape it (passwords often contain %).
config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))

target_metadata = Base.metadata


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


def run_migrations_offline() -> None:
    """Emit SQL to stdout instead of executing it (alembic upgrade head --sql)."""
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        render_as_batch=_is_sqlite(database_url),
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=_is_sqlite(database_url),
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
