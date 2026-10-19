from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.uploads import (
    ConfirmUploadRequest, ResourceLinkCreate, ResourceResponse, SignedUploadRequest, SignedUploadResponse,
    SubmissionFileResponse, SubtitleResponse, UploadResponse,
)
from app.services.storage_service import storage_service
from app.services.upload_service import upload_service

router = APIRouter()          # /api/v1/uploads
media_router = APIRouter()    # /api/v1 (lecture resources, subtitles, submission files)
files_router = APIRouter()    # /api/v1/files


# ------------------------------------------------------------------ uploads
@router.post("", response_model=UploadResponse, status_code=201)
@router.post("/", response_model=UploadResponse, status_code=201, include_in_schema=False)
async def upload_file(
    purpose: str = Form(..., description="avatar | course_thumbnail | lecture_video | lecture_resource | subtitle | assignment_file"),
    file: UploadFile = File(...),
    target_id: Optional[str] = Form(None, description="Course, lecture or submission id (not needed for avatar)"),
    title: Optional[str] = Form(None, description="Display title for a resource, or label for a subtitle"),
    language_code: Optional[str] = Form(None, description="Required for subtitles, e.g. en"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a file and attach it in one step. Permissions follow the purpose: instructors for their own
    courses, learners for their own avatar and submissions."""
    return await upload_service.upload(db, current_user, purpose, target_id, file, title, language_code)


@router.post("/signed-upload", response_model=SignedUploadResponse)
def create_signed_upload(body: SignedUploadRequest, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    """For big files (lecture videos): get a one-time link, PUT the file there directly, then call /uploads/confirm."""
    return upload_service.signed_upload(db, current_user, body)


@router.post("/confirm", response_model=UploadResponse, status_code=201)
def confirm_upload(body: ConfirmUploadRequest, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    """Attach a file that was uploaded with a signed link."""
    return upload_service.confirm(db, current_user, body)


# ------------------------------------------------------------------ lecture media
@media_router.get("/lectures/{lecture_id}/resources", response_model=List[ResourceResponse])
def list_resources(lecture_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Downloadable files and links of a lecture. Download URLs are only included for enrolled learners and staff."""
    return upload_service.list_resources(db, lecture_id, current_user)


@media_router.post("/lectures/{lecture_id}/resources/link", response_model=ResourceResponse, status_code=201)
def add_resource_link(lecture_id: str, body: ResourceLinkCreate, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    """Attach an external link (article, GitHub repo...) to a lecture (course instructor / Super Admin)."""
    return upload_service.add_link(db, lecture_id, body, current_user)


@media_router.delete("/lectures/{lecture_id}/resources/{resource_id}", response_model=MessageResponse)
def delete_resource(lecture_id: str, resource_id: str, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    upload_service.delete_resource(db, lecture_id, resource_id, current_user)
    return MessageResponse(message="Resource deleted")


@media_router.get("/lectures/{lecture_id}/subtitles", response_model=List[SubtitleResponse])
def list_subtitles(lecture_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return upload_service.list_subtitles(db, lecture_id, current_user)


@media_router.delete("/lectures/{lecture_id}/subtitles/{subtitle_id}", response_model=MessageResponse)
def delete_subtitle(lecture_id: str, subtitle_id: str, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    upload_service.delete_subtitle(db, lecture_id, subtitle_id, current_user)
    return MessageResponse(message="Subtitle deleted")


@media_router.get("/submissions/{submission_id}/files", response_model=List[SubmissionFileResponse])
def list_submission_files(submission_id: str, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    """Files attached to an assignment submission (the learner who sent it, the course instructor, Super Admin)."""
    return upload_service.list_submission_files(db, submission_id, current_user)


@media_router.delete("/submissions/{submission_id}/files/{file_id}", response_model=MessageResponse)
def delete_submission_file(submission_id: str, file_id: str, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    upload_service.delete_submission_file(db, submission_id, file_id, current_user)
    return MessageResponse(message="File deleted")


# ------------------------------------------------------------------ serving files (local / memory backends)
@files_router.get("/{kind}/{path:path}", include_in_schema=False)
def serve_file(kind: str, path: str, exp: int = Query(0), sig: str = Query("")):
    """Serves stored files for the local and memory backends. Private files need a valid signed link
    (created by the API when it returns a lecture, resource or submission); with Supabase this route is unused."""
    if kind not in ("public", "private") or storage_service.backend not in ("local", "memory"):
        raise HTTPException(status_code=404, detail="File not found")
    if kind == "private" and not storage_service.verify_signature(path, exp, sig):
        raise HTTPException(status_code=403, detail="This link is invalid or has expired")
    try:
        found = storage_service.read_local(kind, path)
    except Exception:
        found = None
    if not found:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = found
    return Response(content=data, media_type=content_type, headers={
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=300" if kind == "private" else "public, max-age=3600",
    })
