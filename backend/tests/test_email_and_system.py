import smtplib

import pytest

from app.config.settings import Settings, settings
from app.services.email_service import EmailService
from tests.factories import auth, make_user

API = "/api/v1/admin"


class FakeSMTP:
    instances = []

    def __init__(self, host, port, timeout=None, context=None):
        self.host, self.port, self.timeout, self.context = host, port, timeout, context
        self.actions, self.sent = [], None
        FakeSMTP.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def starttls(self, context=None):
        self.actions.append("starttls")

    def login(self, user, password):
        self.actions.append(f"login:{user}")

    def send_message(self, msg):
        self.sent = msg


@pytest.fixture
def smtp(monkeypatch):
    FakeSMTP.instances = []
    monkeypatch.setattr(smtplib, "SMTP", FakeSMTP)
    monkeypatch.setattr(smtplib, "SMTP_SSL", FakeSMTP)
    monkeypatch.setattr(settings, "EMAIL_BACKEND", "smtp")
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(settings, "SMTP_USER", "user")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "pw")
    return FakeSMTP


def test_smtp_starttls(smtp, monkeypatch):
    monkeypatch.setattr(settings, "SMTP_PORT", 587)
    monkeypatch.setattr(settings, "SMTP_USE_TLS", True)
    monkeypatch.setattr(settings, "SMTP_USE_SSL", False)
    assert EmailService().send("a@b.com", "Hi", "Body")
    inst = smtp.instances[0]
    assert (inst.host, inst.port) == ("smtp.example.com", 587)
    assert inst.actions == ["starttls", "login:user"] and inst.sent["To"] == "a@b.com"


def test_smtp_ssl_skips_starttls(smtp, monkeypatch):
    monkeypatch.setattr(settings, "SMTP_PORT", 465)
    monkeypatch.setattr(settings, "SMTP_USE_SSL", True)
    assert EmailService().send("a@b.com", "Hi", "Body")
    assert smtp.instances[0].actions == ["login:user"] and smtp.instances[0].context is not None


def test_smtp_failure_never_raises(monkeypatch):
    def boom(*a, **k):
        raise OSError("network down")
    monkeypatch.setattr(smtplib, "SMTP", boom)
    monkeypatch.setattr(settings, "EMAIL_BACKEND", "smtp")
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(settings, "SMTP_USE_SSL", False)
    assert EmailService().send("a@b.com", "Hi", "Body") is False


def test_admin_system_and_test_email(client, db_session, monkeypatch):
    admin, learner = make_user(db_session, "super_admin"), make_user(db_session)
    assert client.get(f"{API}/system", headers=auth(learner)).status_code == 403
    info = client.get(f"{API}/system", headers=auth(admin)).json()
    assert info["email"]["backend"] == "memory" and info["email"]["delivers_real_email"] is False
    assert "smtp_password" not in str(info).lower() and info["storage"]["backend"] == "memory"
    r = client.post(f"{API}/email/test", headers=auth(admin)).json()
    assert r["sent"] is True and r["to"] == admin.email and r["note"]
    assert client.post(f"{API}/email/test", headers=auth(learner)).status_code == 403


def test_production_refuses_half_configured_email_and_storage(monkeypatch):
    base = dict(ENVIRONMENT="production", SECRET_KEY="x" * 40, CORS_ORIGINS="https://app.example.com")
    Settings(**base, EMAIL_BACKEND="console", STORAGE_BACKEND="local").assert_safe()
    with pytest.raises(RuntimeError, match="SMTP_HOST"):
        Settings(**base, EMAIL_BACKEND="smtp", STORAGE_BACKEND="local").assert_safe()
    with pytest.raises(RuntimeError, match="SUPABASE_SERVICE_ROLE_KEY"):
        Settings(**base, STORAGE_BACKEND="supabase").assert_safe()
    with pytest.raises(RuntimeError, match="tests only"):
        Settings(**base, STORAGE_BACKEND="memory").assert_safe()
    Settings(**base, EMAIL_BACKEND="smtp", SMTP_HOST="h", STORAGE_BACKEND="supabase",
             SUPABASE_URL="https://p.supabase.co", SUPABASE_SERVICE_ROLE_KEY="k").assert_safe()
