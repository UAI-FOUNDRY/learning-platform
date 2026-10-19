"""Refresh tokens, one-time email/password tokens, login history and lockout.

All one-time tokens live in `auth_tokens`; only the SHA-256 hash is stored.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.security import AuthToken, LoginHistory
from app.models.user import User
from app.schemas.user import TokenResponse
from app.services.platform_settings_service import get_setting
from app.utils.security import create_access_token

REFRESH = "refresh"
PASSWORD_RESET = "password_reset"
EMAIL_VERIFICATION = "email_verification"


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _now() -> datetime:
    return datetime.utcnow()


class SessionService:
    # ------------------------------------------------------------ one-time tokens
    def issue_token(self, db: Session, user: User, purpose: str, ttl: timedelta, ip: Optional[str] = None) -> str:
        raw = secrets.token_urlsafe(32)
        db.add(AuthToken(
            user_id=user.id, purpose=purpose, token_hash=_hash(raw),
            expires_at=_now() + ttl, created_ip=ip,
        ))
        db.commit()
        return raw

    def _find(self, db: Session, raw: str, purpose: str) -> Optional[AuthToken]:
        if not raw:
            return None
        return db.query(AuthToken).filter(
            AuthToken.token_hash == _hash(raw), AuthToken.purpose == purpose
        ).first()

    def consume_token(self, db: Session, raw: str, purpose: str) -> User:
        """Validate a single-use token and mark it used. Same error for every failure."""
        bad = HTTPException(status.HTTP_400_BAD_REQUEST, "This link is invalid or has expired")
        row = self._find(db, raw, purpose)
        if row is None or row.used_at is not None or _aware(row.expires_at) < datetime.now(timezone.utc):
            raise bad
        user = db.get(User, row.user_id)
        if user is None:
            raise bad
        row.used_at = _now()
        db.commit()
        return user

    def revoke_all(self, db: Session, user_id: str, purpose: Optional[str] = None) -> None:
        q = db.query(AuthToken).filter(AuthToken.user_id == user_id, AuthToken.used_at.is_(None))
        if purpose:
            q = q.filter(AuthToken.purpose == purpose)
        q.update({AuthToken.used_at: _now()}, synchronize_session=False)
        db.commit()

    # ------------------------------------------------------------ sessions
    def start_session(self, db: Session, user: User, ip: Optional[str] = None) -> TokenResponse:
        access = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
        refresh = self.issue_token(db, user, REFRESH, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS), ip)
        return TokenResponse(
            access_token=access, token_type="bearer", refresh_token=refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    def refresh_session(self, db: Session, raw: str, ip: Optional[str] = None) -> TokenResponse:
        bad = HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired. Please log in again.")
        row = self._find(db, raw, REFRESH)
        if row is None:
            raise bad
        if row.used_at is not None:
            # A refresh token was used twice: it may have been stolen. End every session.
            self.revoke_all(db, row.user_id, REFRESH)
            raise bad
        if _aware(row.expires_at) < datetime.now(timezone.utc):
            raise bad
        user = db.get(User, row.user_id)
        if user is None:
            raise bad
        if not user.is_active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"This account is {user.status}")
        row.used_at = _now()  # rotate: each refresh token works once
        db.commit()
        return self.start_session(db, user, ip)

    def end_session(self, db: Session, raw: Optional[str]) -> None:
        row = self._find(db, raw or "", REFRESH)
        if row is not None and row.used_at is None:
            row.used_at = _now()
            db.commit()

    # ------------------------------------------------------------ login history / lockout
    def record_attempt(
        self, db: Session, email: str, user: Optional[User], success: bool,
        reason: Optional[str] = None, ip: Optional[str] = None, user_agent: Optional[str] = None,
    ) -> None:
        try:
            db.add(LoginHistory(
                user_id=user.id if user else None, email=(email or "")[:255].lower(),
                success=success, failure_reason=reason, ip_address=ip,
                user_agent=(user_agent or "")[:500] or None,
            ))
            db.commit()
        except Exception:
            db.rollback()

    def assert_not_locked(self, db: Session, email: str) -> None:
        """Too many wrong passwords in a row -> 429 for `security.lockout_minutes`."""
        max_failed = int(get_setting(db, "security.max_failed_logins", 5) or 0)
        minutes = int(get_setting(db, "security.lockout_minutes", 15) or 0)
        if max_failed <= 0 or minutes <= 0:
            return
        email = (email or "").lower().strip()
        window = _now() - timedelta(minutes=minutes)
        last_ok = (
            db.query(LoginHistory.created_at)
            .filter(LoginHistory.email == email, LoginHistory.success.is_(True))
            .order_by(LoginHistory.created_at.desc()).first()
        )
        q = db.query(LoginHistory).filter(
            LoginHistory.email == email, LoginHistory.success.is_(False), LoginHistory.created_at >= window,
        )
        if last_ok is not None:
            q = q.filter(LoginHistory.created_at > last_ok[0])
        if q.count() >= max_failed:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"Too many failed attempts. Try again in {minutes} minutes or reset your password.",
            )


session_service = SessionService()
