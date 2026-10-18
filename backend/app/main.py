from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings

from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.organizations import router as organizations_router
from app.api.courses import router as courses_router
from app.api.categories import router as categories_router
from app.api.enrollments import router as enrollments_router
from app.api.progress import router as progress_router
from app.api.quizzes import router as quizzes_router, section_quizzes_router
from app.api.assignments import router as assignments_router, section_assignments_router
from app.api.certificates import router as certificates_router
from app.api.reviews import router as reviews_router
from app.api.admin import router as admin_router
from app.api.sections import router as sections_router
from app.api.lectures import router as lectures_router

from app.database.connection import get_database_status
from app.middleware.error_handler import register_error_handlers

app = FastAPI(
    title="Learning Platform API",
    description="Modular backend API for the Learning Platform",
    version="0.1.0"
)

# Register global error handlers
register_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check
@app.get("/api/health", tags=["Health"])
def health_check():
    db_status = get_database_status(timeout_seconds=2.0)
    return {
        "status": "ok",
        "service": "learning-platform-api",
        "environment": settings.ENVIRONMENT,
        "database": db_status
    }

# Include Routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users_router, prefix="/api/v1/users", tags=["Users"])
app.include_router(organizations_router, prefix="/api/v1/organizations", tags=["Organizations"])
app.include_router(courses_router, prefix="/api/v1/courses", tags=["Courses"])
app.include_router(sections_router, prefix="/api/v1", tags=["Sections"])
app.include_router(lectures_router, prefix="/api/v1", tags=["Lectures"])
app.include_router(categories_router, prefix="/api/v1/categories", tags=["Categories"])
app.include_router(enrollments_router, prefix="/api/v1/enrollments", tags=["Enrollments"])
app.include_router(progress_router, prefix="/api/v1/progress", tags=["Progress"])
app.include_router(quizzes_router, prefix="/api/v1/quizzes", tags=["Quizzes"])
app.include_router(section_quizzes_router, prefix="/api/v1", tags=["Quizzes"])
app.include_router(assignments_router, prefix="/api/v1/assignments", tags=["Assignments"])
app.include_router(section_assignments_router, prefix="/api/v1", tags=["Assignments"])
app.include_router(certificates_router, prefix="/api/v1/certificates", tags=["Certificates"])
app.include_router(reviews_router, prefix="/api/v1/reviews", tags=["Reviews"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])
