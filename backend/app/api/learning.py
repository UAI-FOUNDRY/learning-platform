from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.learning import (
    BookmarkCreate, BookmarkResponse, NoteCreate, NoteResponse, NoteUpdate, WishlistItemResponse,
)
from app.services.learning_service import learning_service

router = APIRouter()


# ------------------------------------------------------------------ notes
@router.post("/lectures/{lecture_id}/notes", response_model=NoteResponse, status_code=201)
def add_note(lecture_id: str, body: NoteCreate, db: Session = Depends(get_db),
             current_user: User = Depends(get_current_user)):
    """Write a private note on a lecture, optionally pinned to a video timestamp (enrolled learners)."""
    return learning_service.add_note(db, lecture_id, body, current_user)


@router.get("/notes", response_model=List[NoteResponse])
def list_my_notes(
    lecture_id: Optional[str] = None, course_id: Optional[str] = None, search: Optional[str] = None,
    limit: int = Query(100, ge=1, le=200), skip: int = Query(0, ge=0),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    """All of my notes, optionally for one lecture or course, or searched by text."""
    return learning_service.list_notes(db, current_user, lecture_id, course_id, search, skip, limit)


@router.put("/notes/{note_id}", response_model=NoteResponse)
def update_note(note_id: str, body: NoteUpdate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    return learning_service.update_note(db, note_id, body, current_user)


@router.delete("/notes/{note_id}", response_model=MessageResponse)
def delete_note(note_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    learning_service.delete_note(db, note_id, current_user)
    return MessageResponse(message="Note deleted")


# ------------------------------------------------------------------ bookmarks
@router.post("/lectures/{lecture_id}/bookmarks", response_model=BookmarkResponse, status_code=201)
def add_bookmark(lecture_id: str, body: BookmarkCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    """Bookmark a moment in a lecture. Bookmarking the same second again just updates the label."""
    return learning_service.add_bookmark(db, lecture_id, body, current_user)


@router.get("/bookmarks", response_model=List[BookmarkResponse])
def list_my_bookmarks(
    lecture_id: Optional[str] = None, course_id: Optional[str] = None,
    limit: int = Query(100, ge=1, le=200), skip: int = Query(0, ge=0),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    return learning_service.list_bookmarks(db, current_user, lecture_id, course_id, skip, limit)


@router.delete("/bookmarks/{bookmark_id}", response_model=MessageResponse)
def delete_bookmark(bookmark_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    learning_service.delete_bookmark(db, bookmark_id, current_user)
    return MessageResponse(message="Bookmark deleted")


# ------------------------------------------------------------------ wishlist
@router.get("/wishlist", response_model=List[WishlistItemResponse])
def my_wishlist(limit: int = Query(100, ge=1, le=200), skip: int = Query(0, ge=0),
                db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return learning_service.list_wishlist(db, current_user, skip, limit)


@router.post("/wishlist/{course_id}", response_model=WishlistItemResponse)
def add_to_wishlist(course_id: str, response: Response, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    """Save a published course for later. 201 when added, 200 if it was already saved."""
    item, created = learning_service.add_to_wishlist(db, course_id, current_user)
    response.status_code = 201 if created else 200
    return item


@router.delete("/wishlist/{course_id}", response_model=MessageResponse)
def remove_from_wishlist(course_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    learning_service.remove_from_wishlist(db, course_id, current_user)
    return MessageResponse(message="Removed from wishlist")
