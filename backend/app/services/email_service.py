"""Sending transactional email (password reset, email verification).

EMAIL_BACKEND=console  -> the email is written to the server log (default for development;
                          copy the link from there)
EMAIL_BACKEND=smtp     -> real delivery through SMTP_HOST / SMTP_USER / SMTP_PASSWORD
EMAIL_BACKEND=memory   -> kept in `email_service.outbox` (automated tests)

Sending never raises: a mail outage must not break registration or password reset.
"""
import logging
import smtplib
from email.message import EmailMessage
from typing import List

from app.config.settings import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self) -> None:
        self.outbox: List[dict] = []

    def send(self, to: str, subject: str, body: str) -> bool:
        backend = (settings.EMAIL_BACKEND or "console").lower()
        try:
            if backend == "memory":
                self.outbox.append({"to": to, "subject": subject, "body": body})
                return True
            if backend == "smtp" and settings.SMTP_HOST:
                msg = EmailMessage()
                msg["From"], msg["To"], msg["Subject"] = settings.EMAIL_FROM, to, subject
                msg.set_content(body)
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
                    if settings.SMTP_USE_TLS:
                        smtp.starttls()
                    if settings.SMTP_USER:
                        smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    smtp.send_message(msg)
                return True
            logger.warning("EMAIL (console) to=%s subject=%s\n%s", to, subject, body)
            return True
        except Exception:  # pragma: no cover - network failures
            logger.exception("Could not send email to %s", to)
            return False

    # ---- templates -------------------------------------------------------------
    def send_password_reset(self, to: str, name: str, token: str) -> bool:
        link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
        return self.send(
            to,
            "Reset your password",
            f"Hi {name},\n\nUse this link to choose a new password (valid for "
            f"{settings.PASSWORD_RESET_EXPIRE_MINUTES} minutes):\n{link}\n\n"
            "If you did not ask for this, you can ignore this email.",
        )

    def send_verification(self, to: str, name: str, token: str) -> bool:
        link = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={token}"
        return self.send(
            to,
            "Verify your email address",
            f"Hi {name},\n\nConfirm your email address with this link:\n{link}\n\n"
            "If you did not create an account, you can ignore this email.",
        )


email_service = EmailService()
