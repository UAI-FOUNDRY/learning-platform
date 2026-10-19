from typing import Optional
from datetime import datetime
from app.schemas.common import BaseSchema
from app.schemas.course import CourseResponse
from app.schemas.user import UserResponse

class EnrollmentBase(BaseSchema):
    course_id: Optional[str] = None

class EnrollmentCreate(EnrollmentBase):
    pass

class EnrollmentResponse(BaseSchema):
    id: str
    user_id: str
    course_id: str
    status: str = "ACTIVE"
    enrolled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_lecture_id: Optional[str] = None
    last_accessed_at: Optional[datetime] = None

class EnrollmentWithCourseResponse(EnrollmentResponse):
    course: Optional[CourseResponse] = None

class EnrollmentWithUserResponse(EnrollmentResponse):
    user: Optional[UserResponse] = None


class EnrollmentDetailResponse(EnrollmentWithUserResponse):
    course: Optional[CourseResponse] = None
