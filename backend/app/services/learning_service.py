"""Learner extras: notes, bookmarks and the wishlist. Everything here is private to the learner."""
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.learning import LectureBookmark, LectureNote, WishlistItem
from app.models.lecture import Lecture
from app.models.section import Section
from app.models.user import User
from app.schemas.learning import (
    BookmarkCreate, BookmarkResponse, NoteCreate, NoteResponse, NoteUpdate, WishlistItemResponse,
)
from app.services import course_policy


class LearningService:
    # ------------------------------------------------------------------ helpers
    def _lecture_context(self, db: Session, lecture_id: str, user: User):
        lecture = db.get(Lecture, lecture_id)
        section = db.get(Section, lecture.section_id) if lecture else None
        course = db.get(Course, section.course_id) if section else None
        if not lecture or not course:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Lecture not found")
        # Same rule as watching the lecture: owner, super admin or enrolled learner.
        if not (course_policy.is_course_manager(user, course) or course_policy.has_course_access(db, user, course)):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You need to be enrolled in this course")
        return lecture, course

    def _context_map(self, db: Session, lecture_ids: List[str]) -> dict:
        if not lecture_ids:
            return {}
        rows = (
            db.query(Lecture.id, Lecture.title, Section.course_id)
            .join(Section, Section.id == Lecture.section_id)
            .filter(Lecture.id.in_(set(lecture_ids)))
            .all()
        )
        return {r[0]: (r[1], r[2]) for r in rows}

    def _note_out(self, note: LectureNote, ctx: dict) -> NoteResponse:
        title, course_id = ctx.get(note.lecture_id, (None, None))
        data = NoteResponse.model_validate(note)
        data.lecture_title, data.course_id = title, course_id
        return data

    def _bookmark_out(self, bm: LectureBookmark, ctx: dict) -> BookmarkResponse:
        title, course_id = ctx.get(bm.lecture_id, (None, None))
        data = BookmarkResponse.model_validate(bm)
        data.lecture_title, data.course_id = title, course_id
        return data

    def _own(self, db: Session, model, item_id: str, user: User, label: str):
        row = db.get(model, item_id)
        if not row or row.user_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"{label} not found")
        return row

    # ------------------------------------------------------------------ notes
    def add_note(self, db: Session, lecture_id: str, body: NoteCreate, user: User) -> NoteResponse:
        self._lecture_context(db, lecture_id, user)
        note = LectureNote(user_id=user.id, lecture_id=lecture_id, content=body.content,
                           timestamp_seconds=body.timestamp_seconds)
        db.add(note)
        db.commit()
        db.refresh(note)
        return self._note_out(note, self._context_map(db, [lecture_id]))

    def list_notes(self, db: Session, user: User, lecture_id: Optional[str] = None, course_id: Optional[str] = None,
                   search: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[NoteResponse]:
        q = db.query(LectureNote).filter(LectureNote.user_id == user.id)
        if lecture_id:
            q = q.filter(LectureNote.lecture_id == lecture_id)
        if course_id:
            q = (q.join(Lecture, Lecture.id == LectureNote.lecture_id)
                  .join(Section, Section.id == Lecture.section_id).filter(Section.course_id == course_id))
        if search:
            q = q.filter(LectureNote.content.ilike(f"%{search.strip()}%"))
        rows = (q.order_by(LectureNote.lecture_id, LectureNote.timestamp_seconds.asc().nullslast(),
                           LectureNote.created_at.asc()).offset(skip).limit(limit).all())
        ctx = self._context_map(db, [r.lecture_id for r in rows])
        return [self._note_out(r, ctx) for r in rows]

    def update_note(self, db: Session, note_id: str, body: NoteUpdate, user: User) -> NoteResponse:
        note = self._own(db, LectureNote, note_id, user, "Note")
        if body.content is not None:
            note.content = body.content
        if body.timestamp_seconds is not None:
            note.timestamp_seconds = body.timestamp_seconds
        db.commit()
        db.refresh(note)
        return self._note_out(note, self._context_map(db, [note.lecture_id]))

    def delete_note(self, db: Session, note_id: str, user: User) -> None:
        db.delete(self._own(db, LectureNote, note_id, user, "Note"))
        db.commit()

    # ------------------------------------------------------------------ bookmarks
    def add_bookmark(self, db: Session, lecture_id: str, body: BookmarkCreate, user: User) -> BookmarkResponse:
        self._lecture_context(db, lecture_id, user)
        existing = (db.query(LectureBookmark)
                    .filter(LectureBookmark.user_id == user.id, LectureBookmark.lecture_id == lecture_id,
                            LectureBookmark.timestamp_seconds == body.timestamp_seconds).first())
        if existing:  # same moment bookmarked twice: just update the label
            if body.label is not None:
                existing.label = body.label
            bm = existing
        else:
            bm = LectureBookmark(user_id=user.id, lecture_id=lecture_id,
                                 timestamp_seconds=body.timestamp_seconds, label=body.label)
            db.add(bm)
        db.commit()
        db.refresh(bm)
        return self._bookmark_out(bm, self._context_map(db, [lecture_id]))

    def list_bookmarks(self, db: Session, user: User, lecture_id: Optional[str] = None, course_id: Optional[str] = None,
                       skip: int = 0, limit: int = 100) -> List[BookmarkResponse]:
        q = db.query(LectureBookmark).filter(LectureBookmark.user_id == user.id)
        if lecture_id:
            q = q.filter(LectureBookmark.lecture_id == lecture_id)
        if course_id:
            q = (q.join(Lecture, Lecture.id == LectureBookmark.lecture_id)
                  .join(Section, Section.id == Lecture.section_id).filter(Section.course_id == course_id))
        rows = q.order_by(LectureBookmark.lecture_id, LectureBookmark.timestamp_seconds.asc()).offset(skip).limit(limit).all()
        ctx = self._context_map(db, [r.lecture_id for r in rows])
        return [self._bookmark_out(r, ctx) for r in rows]

    def delete_bookmark(self, db: Session, bookmark_id: str, user: User) -> None:
        db.delete(self._own(db, LectureBookmark, bookmark_id, user, "Bookmark"))
        db.commit()

    # ------------------------------------------------------------------ wishlist
    def add_to_wishlist(self, db: Session, course_id: str, user: User):
        """Returns (item, created). Only published courses can be saved; saving twice is harmless."""
        course = db.get(Course, course_id)
        if not course or (course.status or "").lower() != "published":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found")
        item = db.query(WishlistItem).filter(WishlistItem.user_id == user.id, WishlistItem.course_id == course_id).first()
        if item:
            return WishlistItemResponse.model_validate(item), False
        item = WishlistItem(user_id=user.id, course_id=course_id)
        db.add(item)
        db.commit()
        db.refresh(item)
        return WishlistItemResponse.model_validate(item), True

    def list_wishlist(self, db: Session, user: User, skip: int = 0, limit: int = 100) -> List[WishlistItemResponse]:
        rows = (db.query(WishlistItem).filter(WishlistItem.user_id == user.id)
                .order_by(WishlistItem.created_at.desc()).offset(skip).limit(limit).all())
        return [WishlistItemResponse.model_validate(r) for r in rows]

    def remove_from_wishlist(self, db: Session, course_id: str, user: User) -> None:
        item = db.query(WishlistItem).filter(WishlistItem.user_id == user.id, WishlistItem.course_id == course_id).first()
        if not item:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Course is not in your wishlist")
        db.delete(item)
        db.commit()


learning_service = LearningService()
