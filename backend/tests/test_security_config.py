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
    Settings(ENVIRONMENT="production", SECRET_KEY="x" * 40, CORS_ORIGINS="https://app.example.com", _env_file=None).assert_safe()


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
