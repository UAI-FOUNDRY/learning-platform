from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import StaticPool
from sqlalchemy.exc import SQLAlchemyError
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)

# Declarative base for SQLAlchemy models
Base = declarative_base()

def create_db_engine():
    """
    Creates and configures the SQLAlchemy engine.
    Supports PostgreSQL (Supabase direct / pooled) as well as SQLite for testing.
    Returns None if DATABASE_URL is not configured.
    """
    url = settings.sync_database_url
    if not url:
        logger.warning("DATABASE_URL is not configured. Database engine initialization is pending.")
        return None

    if url.startswith("sqlite"):
        return create_engine(
            url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool if ":memory:" in url else None,
            echo=settings.DB_ECHO,
        )

    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_recycle=settings.DB_POOL_RECYCLE,
        echo=settings.DB_ECHO,
    )

engine = create_db_engine()

def get_database_status(timeout_seconds: float = 2.0) -> str:
    """
    Probes the database connection status.
    Returns:
      - 'not_configured': If DATABASE_URL is missing or empty.
      - 'connected': If connection and probe query succeed.
      - 'pending': If database is not reachable yet (e.g. Supabase is still being created).
    Never throws.
    """
    if engine is None or not settings.DATABASE_URL:
        return "not_configured"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            return "connected"
    except Exception as e:
        logger.info(f"Database probe failed ({e.__class__.__name__}). Supabase PostgreSQL connection is pending.")
        return "pending"

def check_database_connection(timeout_seconds: float = 2.0) -> bool:
    """
    Returns True if database connection is active, False otherwise.
    """
    return get_database_status(timeout_seconds) == "connected"
