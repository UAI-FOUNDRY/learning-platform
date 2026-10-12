from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from app.database.connection import engine
import logging

logger = logging.getLogger(__name__)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    FastAPI dependency yielding a database session per request.
    Automatically rolls back on SQLAlchemyError and closes the session.
    """
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error(f"Database transaction error: {exc}")
        raise
    finally:
        db.close()
