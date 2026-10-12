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
    """
    url = settings.sync_database_url
    
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

def check_database_connection(timeout_seconds: float = 3.0) -> bool:
    """
    Probes the database connection using a lightweight SELECT 1 query.
    Returns True if reachable, False otherwise. Never throws.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            return True
    except Exception as e:
        logger.warning(f"Database connection probe failed: {e}")
        return False
