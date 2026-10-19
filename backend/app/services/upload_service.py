"""Validates uploads and attaches them to the right record (course thumbnail, lecture video, ...)."""
import os
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.assignment import Assignment
from app.models.course import Course
from app.models.lecture import Lecture, LectureResource
from app.models.learning import LectureSubtitle
from app.models.section import Section
from app.models.submission import Submission, SubmissionFile
from app.models.user import User
from app.schemas.uploads import (
    ConfirmUploadRequest, ResourceLinkCreate, SignedUploadRequest, SignedUploadResponse, UploadResponse,
)
from app.services import course_policy
from app.services.platform_settings_service import get_setting
from app.services.storage_service import PRIVATE, PUBLIC, StorageError, is_ref, split_ref, storage_service

IMAGE_EXT = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp"}
VIDEO_EXT = {".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".m4v": "video/x-m4v"}
DOC_EXT = {
    ".pdf": "application/pdf", ".zip": "application/zip", ".txt": "text/plain", ".md": "text/markdown",
    ".csv": "text/csv", ".json": "application/json", ".ipynb": "application/x-ipynb+json",
    ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".ppt": "application/vnd.ms-powerpoint", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".py": "text/x-python", ".js": "text/javascript", ".java": "text/x-java", ".c": "text/x-c", ".cpp": "text/x-c++",
    ".sql": "application/sql", **IMAGE_EXT,
}
SUBTITLE_EXT = {".vtt": "text/vtt", ".srt": "application/x-subrip"}

# purpose -> (bucket kind, allowed extensions, size class)
PURPOSES = {
    "avatar": (PUBLIC, IMAGE_EXT, "small"),
    "course_thumbnail": (PUBLIC, IMAGE_EXT, "small"),
    "lecture_video": (PRIVATE, VIDEO_EXT, "video"),
    "lecture_resource": (PRIVATE, DOC_EXT, "small"),
    "subtitle": (PRIVATE, SUBTITLE_EXT, "small"),
    "assignment_file": (PRIVATE, DOC_EXT, "small"),
}
MAGIC = {
    ".png": [b"\x89PNG\r\n\x1a\n"], ".jpg": [b"\xff\xd8\xff"], ".jpeg": [b"\xff\xd8\xff"],
    ".gif": [b"GIF87a", b"GIF89a"], ".webp": [b"RIFF"], ".pdf": [b"%PDF"], ".zip": [b"PK\x03\x04"],
}


def _bad(detail: str, code: int = status.HTTP_400_BAD_REQUEST) -> HTTPException:
    return HTTPException(status_code=code, detail=detail)


class UploadService:
    # ------------------------------------------------------------------ rules
    def _rules(self, purpose: str):
        if purpose not in PURPOSES:
            raise _bad("Unknown purpose. Use one of: " + ", ".join(sorted(PURPOSES)))
        return PURPOSES[purpose]

    def max_bytes(self, db: Session, size_class: str) -> int:
        if size_class == "video":
            return int(get_setting(db, "courses.max_upload_size_mb", 1024)) * 1024 * 1024
        return int(settings.MAX_UPLOAD_MB) * 1024 * 1024

    def _check_name(self, purpose: str, file_name: str):
        kind, allowed, size_class = self._rules(purpose)
        ext = os.path.splitext(file_name or "")[1].lower()
        if ext not in allowed:
            raise _bad(f"File type '{ext or 'unknown'}' is not allowed for {purpose}. Allowed: {', '.join(sorted(allowed))}")
        return kind, ext, allowed[ext], size_class

    # ------------------------------------------------------------------ targets
    def _lecture_course(self, db: Session, lecture_id: str):
        lecture = db.get(Lecture, lecture_id)
        section = db.get(Section, lecture.section_id) if lecture else None
        course = db.get(Course, section.course_id) if section else None
        if not lecture or not course:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Lecture not found")
        return lecture, course

    def _require_manager(self, course: Course, user: User) -> None:
        if not course_policy.is_course_manager(user, course):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the course instructor or a Super Admin can do this")

    def _target_folder(self, db: Session, purpose: str, target_id: Optional[str], user: User) -> str:
        """Checks the caller may attach a file to the target and returns the storage folder (also used to validate refs)."""
        if purpose == "avatar":
            return f"avatar/{user.id}"
        if not target_id:
            raise _bad("target_id is required for this purpose")
        if purpose == "course_thumbnail":
            course = db.get(Course, target_id)
            if not course:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found")
            self._require_manager(course, user)
        elif purpose in ("lecture_video", "lecture_resource", "subtitle"):
            _, course = self._lecture_course(db, target_id)
            self._require_manager(course, user)
        elif purpose == "assignment_file":
            submission = db.get(Submission, target_id)
            if not submission or submission.user_id != user.id:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Submission not found")
        return f"{purpose}/{target_id}"

    # ------------------------------------------------------------------ direct upload
    async def upload(self, db: Session, user: User, purpose: str, target_id: Optional[str], file: UploadFile,
                     title: Optional[str], language_code: Optional[str]) -> UploadResponse:
        kind, ext, content_type, size_class = self._check_name(purpose, file.filename or "")
        folder = self._target_folder(db, purpose, target_id, user)
        limit = self.max_bytes(db, size_class)
        data = bytearray()
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            data.extend(chunk)
            if len(data) > limit:
                raise _bad(f"File is larger than the {limit // (1024 * 1024)} MB limit", status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        if not data:
            raise _bad("The file is empty")
        signatures = MAGIC.get(ext)
        if signatures and not any(bytes(data[:12]).startswith(sig) for sig in signatures):
            raise _bad("The file content does not match its extension")
        if ext == ".webp" and bytes(data[8:12]) != b"WEBP":
            raise _bad("The file content does not match its extension")
        try:
            stored = storage_service.save(bytes(data), kind=kind, path=storage_service.new_path(folder, file.filename or ""),
                                          content_type=content_type)
        except StorageError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))
        applied = self._apply(db, user, purpose, target_id, stored.ref, file.filename or "file", stored.size,
                              content_type, title, language_code)
        return UploadResponse(ref=stored.ref, url=storage_service.resolve(stored.ref), file_name=file.filename or "file",
                              size=stored.size, content_type=content_type, purpose=purpose, applied=applied)

    # ------------------------------------------------------------------ direct-to-storage (big videos)
    def signed_upload(self, db: Session, user: User, body: SignedUploadRequest) -> SignedUploadResponse:
        kind, ext, _, size_class = self._check_name(body.purpose, body.file_name)
        folder = self._target_folder(db, body.purpose, body.target_id, user)
        path = storage_service.new_path(folder, body.file_name)
        try:
            data = storage_service.signed_upload(kind, path)
        except StorageError as exc:
            raise _bad(str(exc))
        return SignedUploadResponse(upload_url=data["upload_url"], method=data["method"], ref=data["ref"],
                                    max_size_mb=self.max_bytes(db, size_class) // (1024 * 1024), expires_in_seconds=7200)

    def confirm(self, db: Session, user: User, body: ConfirmUploadRequest) -> UploadResponse:
        """Called after the browser finished a direct upload: checks the file is really there, then attaches it."""
        kind, ext, content_type, _ = self._check_name(body.purpose, body.ref)
        folder = self._target_folder(db, body.purpose, body.target_id, user)
        if not is_ref(body.ref):
            raise _bad("ref must be a storage reference returned by /uploads/signed-upload")
        try:
            ref_kind, path = split_ref(body.ref)
        except ValueError:
            raise _bad("Invalid ref")
        if ref_kind != kind or not path.startswith(folder + "/"):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "That file does not belong to this upload target")
        if not storage_service.exists(body.ref):
            raise _bad("The file has not been uploaded yet")
        size = body.size or 0
        applied = self._apply(db, user, body.purpose, body.target_id, body.ref, body.file_name or os.path.basename(path),
                              size, content_type, body.title, body.language_code)
        return UploadResponse(ref=body.ref, url=storage_service.resolve(body.ref), file_name=body.file_name or os.path.basename(path),
                              size=size, content_type=content_type, purpose=body.purpose, applied=applied)

    # ------------------------------------------------------------------ attach
    def _apply(self, db: Session, user: User, purpose: str, target_id: Optional[str], ref: str, file_name: str,
               size: int, content_type: str, title: Optional[str], language_code: Optional[str]) -> dict:
        try:
            if purpose == "avatar":
                old, user.avatar_url = user.avatar_url, ref
                db.commit()
                storage_service.delete(old)
                return {"user_id": user.id}
            if purpose == "course_thumbnail":
                course = db.get(Course, target_id)
                old, course.thumbnail_url = course.thumbnail_url, ref
                db.commit()
                storage_service.delete(old)
                return {"course_id": course.id}
            if purpose == "lecture_video":
                lecture, course = self._lecture_course(db, target_id)
                course_policy.apply_published_edit_policy(db, course, user)
                old, lecture.content_url = lecture.content_url, ref
                db.commit()
                storage_service.delete(old)
                return {"lecture_id": lecture.id}
            if purpose == "lecture_resource":
                resource = LectureResource(lecture_id=target_id, title=(title or file_name)[:255], resource_type="file",
                                           url=ref, file_size_bytes=size)
                db.add(resource)
                db.commit()
                return {"lecture_id": target_id, "resource_id": resource.id}
            if purpose == "subtitle":
                language = (language_code or "").strip().lower()
                if not language or len(language) > 16:
                    raise _bad("language_code is required for subtitles (e.g. 'en')")
                row = (db.query(LectureSubtitle)
                       .filter(LectureSubtitle.lecture_id == target_id, LectureSubtitle.language_code == language).first())
                old = row.url if row else None
                if row:
                    row.url, row.label = ref, title or row.label
                else:
                    row = LectureSubtitle(lecture_id=target_id, language_code=language, label=title, url=ref)
                    db.add(row)
                db.commit()
                storage_service.delete(old)
                return {"lecture_id": target_id, "subtitle_id": row.id}
            if purpose == "assignment_file":
                count = db.query(SubmissionFile).filter(SubmissionFile.submission_id == target_id).count()
                if count >= 10:
                    raise _bad("A submission can have at most 10 files")
                row = SubmissionFile(submission_id=target_id, file_name=file_name[:255], file_url=ref,
                                     mime_type=content_type, file_size_bytes=size)
                db.add(row)
                db.commit()
                return {"submission_id": target_id, "file_id": row.id}
        except HTTPException:
            storage_service.delete(ref)   # validation failed before anything was written to the database
            raise
        except Exception:
            db.rollback()
            storage_service.delete(ref)
            raise
        return {}

    # ------------------------------------------------------------------ resources & subtitles
    def can_see_downloads(self, db: Session, user: User, course: Course) -> bool:
        return course_policy.is_course_manager(user, course) or course_policy.has_course_access(db, user, course)

    def list_resources(self, db: Session, lecture_id: str, user: User):
        lecture, course = self._lecture_course(db, lecture_id)
        course_policy.require_structure_access(db, user, course)
        rows = db.query(LectureResource).filter(LectureResource.lecture_id == lecture_id).order_by(LectureResource.created_at).all()
        if self.can_see_downloads(db, user, course):
            return rows
        # Visitors of the public outline see the titles, but not the download links.
        return [self._hide_url(r) for r in rows]

    def _hide_url(self, row):
        from app.schemas.uploads import ResourceResponse
        data = ResourceResponse.model_validate(row)
        data.url = None
        return data

    def add_link(self, db: Session, lecture_id: str, body: ResourceLinkCreate, user: User) -> LectureResource:
        _, course = self._lecture_course(db, lecture_id)
        self._require_manager(course, user)
        resource = LectureResource(lecture_id=lecture_id, title=body.title, resource_type="link", url=body.url)
        db.add(resource)
        db.commit()
        db.refresh(resource)
        return resource

    def delete_resource(self, db: Session, lecture_id: str, resource_id: str, user: User) -> None:
        _, course = self._lecture_course(db, lecture_id)
        self._require_manager(course, user)
        row = db.get(LectureResource, resource_id)
        if not row or row.lecture_id != lecture_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Resource not found")
        ref = row.url
        db.delete(row)
        db.commit()
        storage_service.delete(ref)

    def list_subtitles(self, db: Session, lecture_id: str, user: User):
        lecture, course = self._lecture_course(db, lecture_id)
        course_policy.require_structure_access(db, user, course)
        rows = db.query(LectureSubtitle).filter(LectureSubtitle.lecture_id == lecture_id).order_by(LectureSubtitle.language_code).all()
        if course_policy.can_view_lecture_content(db, user, course, lecture.is_preview):
            return rows
        return []

    def delete_subtitle(self, db: Session, lecture_id: str, subtitle_id: str, user: User) -> None:
        _, course = self._lecture_course(db, lecture_id)
        self._require_manager(course, user)
        row = db.get(LectureSubtitle, subtitle_id)
        if not row or row.lecture_id != lecture_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Subtitle not found")
        ref = row.url
        db.delete(row)
        db.commit()
        storage_service.delete(ref)

    # ------------------------------------------------------------------ submission files
    def list_submission_files(self, db: Session, submission_id: str, user: User):
        submission = db.get(Submission, submission_id)
        if not submission:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Submission not found")
        assignment = db.get(Assignment, submission.assignment_id)
        section = db.get(Section, assignment.section_id) if assignment else None
        course = db.get(Course, section.course_id) if section else None
        owner = submission.user_id == user.id
        if not owner and not (course and course_policy.is_course_manager(user, course)):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot see these files")
        return db.query(SubmissionFile).filter(SubmissionFile.submission_id == submission_id).order_by(SubmissionFile.uploaded_at).all()

    def delete_submission_file(self, db: Session, submission_id: str, file_id: str, user: User) -> None:
        submission = db.get(Submission, submission_id)
        if not submission or submission.user_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Submission not found")
        row = db.get(SubmissionFile, file_id)
        if not row or row.submission_id != submission_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
        ref = row.file_url
        db.delete(row)
        db.commit()
        storage_service.delete(ref)


upload_service = UploadService()
