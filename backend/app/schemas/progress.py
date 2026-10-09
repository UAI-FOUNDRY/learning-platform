from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProgressBase(BaseModel):
    pass

class ProgressCreate(ProgressBase):
    pass

class ProgressResponse(ProgressBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
