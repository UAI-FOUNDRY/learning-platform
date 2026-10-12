import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, HTTPException
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Handles standard HTTP exceptions (401, 403, 404, 400, etc.).
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_type": "http_error"
        },
        headers=exc.headers,
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handles request body and parameter validation errors cleanly.
    """
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "error_type": "validation_error"
        }
    )

async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """
    Catches database exceptions and returns a safe response without leaking internal SQL.
    """
    logger.error(f"Database error on path {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "A database error occurred. Please try again later.",
            "error_type": "database_error"
        }
    )

async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catches any unexpected Python runtime errors.
    """
    logger.critical(f"Unhandled exception on path {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected internal server error occurred.",
            "error_type": "internal_server_error"
        }
    )

def register_error_handlers(app: FastAPI) -> None:
    """
    Registers all exception handlers on the FastAPI application instance.
    """
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    app.add_exception_handler(Exception, global_exception_handler)
