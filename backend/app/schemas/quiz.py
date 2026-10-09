from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class QuizBase(BaseModel):
    pass

class QuizCreate(QuizBase):
    pass

class QuizResponse(QuizBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
