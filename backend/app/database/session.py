from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status
from app.database.connection import engine
import logging

logger = logging.getLogger(__name__)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine is not None else None

def get_db():
    """
    FastAPI dependency yielding a database session per request.
    Automatically rolls back on SQLAlchemyError and closes the session.
    If engine is not configured, raises a clear 503 HTTP exception.
    """
    if SessionLocal is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not configured yet. Database connection is pending."
        )
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error(f"Database transaction error: {exc}")
        raise
    finally:
        db.close()
