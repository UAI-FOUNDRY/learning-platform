from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class EnrollmentBase(BaseModel):
    pass

class EnrollmentCreate(EnrollmentBase):
    pass

class EnrollmentResponse(EnrollmentBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
