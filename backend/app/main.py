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
from app.api.quizzes import router as quizzes_router
from app.api.assignments import router as assignments_router
from app.api.certificates import router as certificates_router
from app.api.reviews import router as reviews_router
from app.api.admin import router as admin_router

app = FastAPI(
    title="Learning Platform API",
    description="Modular backend API for the Learning Platform",
    version="0.1.0"
)

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
    return {"status": "healthy", "service": "learning-platform-api"}

# Include Routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users_router, prefix="/api/v1/users", tags=["Users"])
app.include_router(organizations_router, prefix="/api/v1/organizations", tags=["Organizations"])
app.include_router(courses_router, prefix="/api/v1/courses", tags=["Courses"])
app.include_router(categories_router, prefix="/api/v1/categories", tags=["Categories"])
app.include_router(enrollments_router, prefix="/api/v1/enrollments", tags=["Enrollments"])
app.include_router(progress_router, prefix="/api/v1/progress", tags=["Progress"])
app.include_router(quizzes_router, prefix="/api/v1/quizzes", tags=["Quizzes"])
app.include_router(assignments_router, prefix="/api/v1/assignments", tags=["Assignments"])
app.include_router(certificates_router, prefix="/api/v1/certificates", tags=["Certificates"])
app.include_router(reviews_router, prefix="/api/v1/reviews", tags=["Reviews"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])
