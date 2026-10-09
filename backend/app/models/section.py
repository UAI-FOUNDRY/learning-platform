from sqlalchemy import Column, String, DateTime
from datetime import datetime
from app.database.connection import Base

class Section(Base):
    __tablename__ = "sections"

    id = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
