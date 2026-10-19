"""File storage behind one small interface.

STORAGE_BACKEND=local     files live in UPLOAD_DIR on the server's disk (development)
STORAGE_BACKEND=supabase  Supabase Storage (production): a public bucket for thumbnails/avatars and a
                          private bucket for videos, resources and submissions
STORAGE_BACKEND=memory    kept in RAM (automated tests)

The database stores a *reference* such as ``storage://private/lecture_video/<lecture id>/<uuid>.mp4``,
never a link that expires. The API turns references into browser URLs when it answers
(`resolve`): public files get a permanent URL, private files get a short-lived signed URL.
Values that are not references (an external YouTube link, say) pass through unchanged.
"""
import hashlib
import hmac
import logging
import os
import re
import time
import uuid
from dataclasses import dataclass
from typing import Dict, Optional, Tuple
from urllib.parse import quote, urlparse

import httpx

from app.config.settings import settings

logger = logging.getLogger(__name__)

REF_PREFIX = "storage://"
PUBLIC, PRIVATE = "public", "private"


class StorageError(Exception):
    """The storage provider failed or is misconfigured."""


@dataclass
class StoredFile:
    ref: str
    size: int
    content_type: str


def _safe_ext(filename: str) -> str:
    ext = os.path.splitext(filename or "")[1].lower()
    return ext if re.fullmatch(r"\.[a-z0-9]{1,8}", ext) else ""


def split_ref(ref: str) -> Tuple[str, str]:
    """'storage://private/a/b.mp4' -> ('private', 'a/b.mp4')."""
    if not is_ref(ref):
        raise ValueError("not a storage reference")
    kind, _, path = ref[len(REF_PREFIX):].partition("/")
    if kind not in (PUBLIC, PRIVATE) or not path or ".." in path.split("/") or path.startswith("/"):
        raise ValueError("invalid storage reference")
    return kind, path


def is_ref(value: Optional[str]) -> bool:
    return bool(value) and value.startswith(REF_PREFIX)


class StorageService:
    def __init__(self) -> None:
        self._memory: Dict[str, Tuple[bytes, str]] = {}
        self._sign_cache: Dict[str, Tuple[float, str]] = {}

    # ------------------------------------------------------------------ config
    @property
    def backend(self) -> str:
        return (settings.STORAGE_BACKEND or "local").lower()

    def _bucket(self, kind: str) -> str:
        return settings.STORAGE_PUBLIC_BUCKET if kind == PUBLIC else settings.STORAGE_PRIVATE_BUCKET

    def _sb_headers(self, extra: Optional[dict] = None) -> dict:
        key = settings.SUPABASE_SERVICE_ROLE_KEY
        if not (settings.SUPABASE_URL and key):
            raise StorageError("Supabase Storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)")
        return {"Authorization": f"Bearer {key}", "apikey": key, **(extra or {})}

    def _sb_url(self, suffix: str) -> str:
        return f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/{suffix.lstrip('/')}"

    def _client(self) -> httpx.Client:
        return httpx.Client(timeout=60)

    def describe(self) -> dict:
        return {
            "backend": self.backend,
            "public_bucket": settings.STORAGE_PUBLIC_BUCKET,
            "private_bucket": settings.STORAGE_PRIVATE_BUCKET,
            "supabase_configured": bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY),
        }

    # ------------------------------------------------------------------ paths
    def new_path(self, folder: str, filename: str) -> str:
        return f"{folder.strip('/')}/{uuid.uuid4().hex}{_safe_ext(filename)}"

    def make_ref(self, kind: str, path: str) -> str:
        return f"{REF_PREFIX}{kind}/{path}"

    # ------------------------------------------------------------------ write / delete / exists
    def save(self, data: bytes, *, kind: str, path: str, content_type: str) -> StoredFile:
        ref = self.make_ref(kind, path)
        split_ref(ref)  # validates
        if self.backend == "memory":
            self._memory[f"{kind}/{path}"] = (data, content_type)
        elif self.backend == "local":
            target = self._local_path(kind, path)
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target, "wb") as handle:
                handle.write(data)
        elif self.backend == "supabase":
            url = self._sb_url(f"object/{self._bucket(kind)}/{quote(path)}")
            with self._client() as client:
                response = client.post(url, content=data, headers=self._sb_headers(
                    {"Content-Type": content_type or "application/octet-stream", "x-upsert": "false"}))
            if response.status_code >= 300:
                logger.error("Supabase upload failed: %s %s", response.status_code, response.text[:300])
                raise StorageError("The file could not be saved to storage")
        else:
            raise StorageError(f"Unknown STORAGE_BACKEND '{settings.STORAGE_BACKEND}'")
        return StoredFile(ref=ref, size=len(data), content_type=content_type)

    def delete(self, ref: Optional[str]) -> None:
        """Best effort: a leftover file is better than a failed request."""
        if not is_ref(ref):
            return
        try:
            kind, path = split_ref(ref)
            if self.backend == "memory":
                self._memory.pop(f"{kind}/{path}", None)
            elif self.backend == "local":
                target = self._local_path(kind, path)
                if os.path.isfile(target):
                    os.remove(target)
            elif self.backend == "supabase":
                with self._client() as client:
                    client.delete(self._sb_url(f"object/{self._bucket(kind)}/{quote(path)}"), headers=self._sb_headers())
        except Exception:
            logger.exception("Could not delete stored file %s", ref)

    def exists(self, ref: str) -> bool:
        kind, path = split_ref(ref)
        if self.backend == "memory":
            return f"{kind}/{path}" in self._memory
        if self.backend == "local":
            return os.path.isfile(self._local_path(kind, path))
        if self.backend == "supabase":
            with self._client() as client:
                response = client.head(self._sb_url(f"object/authenticated/{self._bucket(kind)}/{quote(path)}"),
                                       headers=self._sb_headers())
            return response.status_code < 300
        return False

    # ------------------------------------------------------------------ read (local / memory)
    def _local_path(self, kind: str, path: str) -> str:
        root = os.path.abspath(settings.UPLOAD_DIR)
        target = os.path.abspath(os.path.join(root, kind, *path.split("/")))
        if not target.startswith(os.path.join(root, kind) + os.sep):
            raise StorageError("Invalid file path")
        return target

    def read_local(self, kind: str, path: str) -> Optional[Tuple[bytes, str]]:
        """(bytes, content_type) for the local and memory backends, None if missing."""
        if self.backend == "memory":
            return self._memory.get(f"{kind}/{path}")
        if self.backend == "local":
            target = self._local_path(kind, path)
            if not os.path.isfile(target):
                return None
            import mimetypes
            with open(target, "rb") as handle:
                return handle.read(), mimetypes.guess_type(target)[0] or "application/octet-stream"
        return None

    # ------------------------------------------------------------------ URLs
    def _signature(self, path: str, expires: int) -> str:
        return hmac.new(settings.SECRET_KEY.encode(), f"{path}:{expires}".encode(), hashlib.sha256).hexdigest()

    def verify_signature(self, path: str, expires: int, signature: str) -> bool:
        return expires >= int(time.time()) and hmac.compare_digest(self._signature(path, expires), signature or "")

    def resolve(self, value: Optional[str]) -> Optional[str]:
        """Turn a stored reference into a URL the browser can use. Anything else is returned unchanged."""
        if not is_ref(value):
            return value
        try:
            kind, path = split_ref(value)
        except ValueError:
            return None
        try:
            if self.backend == "supabase":
                if kind == PUBLIC:
                    return self._sb_url(f"object/public/{self._bucket(kind)}/{quote(path)}")
                return self._signed_supabase_url(path)
            base = settings.API_PUBLIC_URL.rstrip("/")
            if kind == PUBLIC:
                return f"{base}/api/v1/files/public/{quote(path)}"
            expires = int(time.time()) + settings.STORAGE_SIGNED_URL_TTL_SECONDS
            return f"{base}/api/v1/files/private/{quote(path)}?exp={expires}&sig={self._signature(path, expires)}"
        except Exception:
            logger.exception("Could not build a URL for %s", value)
            return None

    def _signed_supabase_url(self, path: str) -> str:
        ttl = settings.STORAGE_SIGNED_URL_TTL_SECONDS
        cached = self._sign_cache.get(path)
        now = time.time()
        if cached and cached[0] > now + 60:   # reuse until a minute before it expires
            return cached[1]
        with self._client() as client:
            response = client.post(self._sb_url(f"object/sign/{settings.STORAGE_PRIVATE_BUCKET}/{quote(path)}"),
                                   json={"expiresIn": ttl}, headers=self._sb_headers())
        if response.status_code >= 300:
            raise StorageError("Could not sign the download link")
        signed = response.json().get("signedURL") or response.json().get("signedUrl")
        url = signed if signed.startswith("http") else self._sb_url(signed)
        if len(self._sign_cache) > 5000:
            self._sign_cache.clear()
        self._sign_cache[path] = (now + ttl, url)
        return url

    def signed_upload(self, kind: str, path: str) -> dict:
        """Let the browser upload a big file straight to Supabase (videos), bypassing this server."""
        if self.backend != "supabase":
            raise StorageError("Direct uploads need STORAGE_BACKEND=supabase; use POST /uploads instead")
        with self._client() as client:
            response = client.post(self._sb_url(f"object/upload/sign/{self._bucket(kind)}/{quote(path)}"),
                                   headers=self._sb_headers())
        if response.status_code >= 300:
            raise StorageError("Could not create the upload link")
        signed = response.json().get("url", "")
        url = signed if signed.startswith("http") else self._sb_url(signed)
        return {"upload_url": url, "method": "PUT", "ref": self.make_ref(kind, path)}

    def normalize_incoming(self, value: Optional[str]) -> Optional[str]:
        """If a client sends back a URL we generated, store the reference instead of the expiring link."""
        if not value or is_ref(value):
            return value
        try:
            parsed = urlparse(value)
            base = urlparse(settings.API_PUBLIC_URL)
            if parsed.netloc == base.netloc and parsed.path.startswith("/api/v1/files/"):
                kind, _, path = parsed.path[len("/api/v1/files/"):].partition("/")
                if kind in (PUBLIC, PRIVATE) and path:
                    return self.make_ref(kind, path)
            if settings.SUPABASE_URL and parsed.netloc == urlparse(settings.SUPABASE_URL).netloc:
                match = re.match(r"^/storage/v1/object/(?:public|sign)/([^/]+)/(.+)$", parsed.path)
                if match:
                    bucket, path = match.group(1), match.group(2)
                    if bucket == settings.STORAGE_PUBLIC_BUCKET:
                        return self.make_ref(PUBLIC, path)
                    if bucket == settings.STORAGE_PRIVATE_BUCKET:
                        return self.make_ref(PRIVATE, path)
        except Exception:
            pass
        return value

    def ensure_buckets(self) -> dict:
        """Create the two Supabase buckets if they do not exist (run once: scripts/setup_storage.py)."""
        result = {}
        with self._client() as client:
            for kind in (PUBLIC, PRIVATE):
                bucket = self._bucket(kind)
                response = client.post(self._sb_url("bucket"), headers=self._sb_headers(),
                                       json={"id": bucket, "name": bucket, "public": kind == PUBLIC})
                result[bucket] = "created" if response.status_code < 300 else (
                    "exists" if response.status_code in (400, 409) else f"error {response.status_code}")
        return result


storage_service = StorageService()
