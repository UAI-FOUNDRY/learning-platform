import pytest

from app.config.settings import Settings


def test_production_refuses_placeholder_secret():
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        Settings(ENVIRONMENT="production", _env_file=None).assert_safe()


def test_production_refuses_short_secret_and_wildcard_cors():
    with pytest.raises(RuntimeError) as exc:
        Settings(ENVIRONMENT="production", SECRET_KEY="short", CORS_ORIGINS="*", _env_file=None).assert_safe()
    assert "SECRET_KEY" in str(exc.value) and "CORS_ORIGINS" in str(exc.value)


def test_production_accepts_proper_values():
    Settings(ENVIRONMENT="production", SECRET_KEY="x" * 40, CORS_ORIGINS="https://app.example.com", STORAGE_BACKEND="local", _env_file=None).assert_safe()


def test_development_is_not_blocked():
    Settings(ENVIRONMENT="development", _env_file=None).assert_safe()


def test_cors_origins_parsing():
    s = Settings(CORS_ORIGINS=" http://a.com/ , http://b.com ,", _env_file=None)
    assert s.cors_origins_list == ["http://a.com", "http://b.com"]


def test_cors_allows_listed_origin_only(client):
    ok = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert ok.headers.get("access-control-allow-credentials") == "true"
    bad = client.get("/api/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in bad.headers


def test_production_blocks_test_only_backends():
    base = dict(ENVIRONMENT="production", SECRET_KEY="x" * 40, CORS_ORIGINS="https://app.example.com", STORAGE_BACKEND="local", _env_file=None)
    for bad in ({"STORAGE_BACKEND": "memory"}, {"CODE_RUNNER": "local"}, {"AI_PROVIDER": "fake"},
                {"EMAIL_BACKEND": "smtp"}, {"CODE_RUNNER": "judge0"}, {"AI_PROVIDER": "anthropic"}):
        import pytest
        with pytest.raises(RuntimeError):
            Settings(**{**base, **bad}).assert_safe()
