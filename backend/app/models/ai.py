"""
AI learning / coding / instructor assistants (PROJECT.md section 25).
Stores conversations so learners can revisit them and so usage can be monitored.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from app.database.connection import Base


class AIConversation(Base):
    __tablename__ = "ai_conversations"
    __table_args__ = (
        CheckConstraint(
            "assistant_type IN ('learning', 'coding', 'instructor')",
            name="ck_ai_conversations_assistant_type",
        ),
        CheckConstraint(
            "context_type IN ('none', 'course', 'lecture', 'coding_exercise', 'coding_submission', 'quiz')",
            name="ck_ai_conversations_context_type",
        ),
        Index("ix_ai_conversations_user_updated", "user_id", "updated_at"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assistant_type = Column(String(16), nullable=False, default="learning", server_default="learning")
    # What the conversation is about, e.g. the lecture being watched or the failing submission.
    context_type = Column(String(32), nullable=False, default="none", server_default="none")
    context_id = Column(String(64), nullable=True)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = relationship(
        "AIMessage", back_populates="conversation", cascade="all, delete-orphan",
        order_by="AIMessage.created_at",
    )


class AIMessage(Base):
    __tablename__ = "ai_messages"
    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant', 'system')", name="ck_ai_messages_role"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(64), ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(16), nullable=False)
    content = Column(Text, nullable=False)
    model = Column(String(64), nullable=True)
    input_tokens = Column(Integer, nullable=True)
    output_tokens = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    conversation = relationship("AIConversation", back_populates="messages")
