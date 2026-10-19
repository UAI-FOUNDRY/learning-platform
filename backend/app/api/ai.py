from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.database.session import get_db
from app.models.user import User
from app.schemas import ai as s
from app.schemas.common import MessageResponse
from app.services.ai_service import ai_service

router = APIRouter()


@router.get("/status", response_model=s.AIStatus)
def ai_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Is the AI tutor available, and how many messages have I used today?"""
    return ai_service.status_for(db, current_user)


@router.post("/conversations", response_model=s.ConversationResponse, status_code=201)
def create_conversation(body: s.ConversationCreate, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    """Start a conversation. `context_type` + `context_id` tell the tutor what you are looking at
    (a course, lecture, quiz, coding exercise or one of your coding submissions)."""
    return ai_service.create_conversation(db, current_user, body)


@router.get("/conversations", response_model=List[s.ConversationResponse])
def list_conversations(assistant_type: Optional[str] = Query(None, pattern="^(learning|coding|instructor)$"),
                       context_type: Optional[str] = None, context_id: Optional[str] = None,
                       limit: int = Query(30, ge=1, le=100), skip: int = Query(0, ge=0),
                       db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return ai_service.list_conversations(db, current_user, assistant_type, context_type, context_id, skip, limit)


@router.get("/conversations/{conversation_id}", response_model=s.ConversationDetail)
def get_conversation(conversation_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return ai_service.get_conversation(db, conversation_id, current_user)


@router.delete("/conversations/{conversation_id}", response_model=MessageResponse)
def delete_conversation(conversation_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ai_service.delete_conversation(db, conversation_id, current_user)
    return MessageResponse(message="Conversation deleted")


@router.post("/conversations/{conversation_id}/messages", response_model=s.ExchangeResponse)
def send_message(conversation_id: str, body: s.MessageCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    """Ask the tutor something. Returns your message and the answer. Counts towards the daily limit."""
    return ai_service.send(db, conversation_id, current_user, body)


@router.get("/usage")
def ai_usage(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db),
             current_user: User = Depends(require_role("super_admin"))):
    """AI usage for the last N days: answers, tokens, active users (Super Admin)."""
    return ai_service.usage(db, days)
