from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    DATABASE_URL: Optional[str] = "postgresql://postgres:postgres@localhost:5432/learning_platform"
    SECRET_KEY: str = "replace_with_a_secure_random_key_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14
    PASSWORD_RESET_EXPIRE_MINUTES: int = 60
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 48

    # Browsers allowed to call the API (comma separated). Never "*" in production.
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Where the React app lives (used to build the links inside emails)
    FRONTEND_URL: str = "http://localhost:5173"

    # Email: "console" prints emails to the server log (development), "smtp" sends them,
    # "memory" keeps them in a list (tests).
    EMAIL_BACKEND: str = "console"
    EMAIL_FROM: str = "Learning Platform <no-reply@localhost>"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True      # STARTTLS (port 587)
    SMTP_USE_SSL: bool = False     # implicit TLS (port 465); use instead of SMTP_USE_TLS
    SMTP_TIMEOUT_SECONDS: int = 15

    # File storage: "local" saves into UPLOAD_DIR (development), "supabase" uses Supabase Storage,
    # "memory" keeps files in RAM (tests).
    STORAGE_BACKEND: str = "local"
    UPLOAD_DIR: str = "./uploads"
    # Public base URL of this API; used to build download links for the local backend.
    API_PUBLIC_URL: str = "http://localhost:8000"
    SUPABASE_URL: str = ""                    # https://<project-ref>.supabase.co
    SUPABASE_SERVICE_ROLE_KEY: str = ""       # server-side only, never ship it to the browser
    STORAGE_PUBLIC_BUCKET: str = "public-assets"   # thumbnails, avatars (public bucket)
    STORAGE_PRIVATE_BUCKET: str = "course-files"   # videos, resources, submissions (private bucket)
    STORAGE_SIGNED_URL_TTL_SECONDS: int = 3600
    MAX_UPLOAD_MB: int = 25                   # documents/images; videos use courses.max_upload_size_mb

    # Coding workspace. Student code must never run inside this server in production.
    #   disabled -> exercises can be authored but Run/Submit answer 503 (default)
    #   judge0   -> a Judge0 server (self-hosted or hosted); set JUDGE0_URL (+ token if it needs one)
    #   local    -> runs Python/JavaScript on THIS machine with basic limits. Development only, NOT a sandbox.
    CODE_RUNNER: str = "disabled"
    JUDGE0_URL: str = ""
    JUDGE0_AUTH_TOKEN: str = ""
    JUDGE0_AUTH_HEADER: str = "X-Auth-Token"
    CODE_MAX_SOURCE_KB: int = 64

    # AI assistant: "disabled" | "anthropic" (needs ANTHROPIC_API_KEY) | "fake" (tests)
    AI_PROVIDER: str = "disabled"
    ANTHROPIC_API_KEY: str = ""
    AI_MODEL: str = "claude-haiku-5-5"
    AI_MAX_OUTPUT_TOKENS: int = 700

    # Supabase / PostgreSQL Connection Pool Configurations
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800  # Recycle after 30 min to prevent disconnects on Supabase pgBouncer
    DB_ECHO: bool = False

    PLACEHOLDER_SECRET: str = "replace_with_a_secure_random_key_in_production"

    @property
    def is_production_like(self) -> bool:
        return self.ENVIRONMENT.strip().lower() in ("production", "prod", "staging")

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip().rstrip("/") for o in self.CORS_ORIGINS.split(",") if o.strip()]

    def assert_safe(self) -> None:
        """Refuse to start a production/staging server with development defaults."""
        if not self.is_production_like:
            return
        problems = []
        if self.SECRET_KEY == self.PLACEHOLDER_SECRET or len(self.SECRET_KEY) < 32:
            problems.append(
                "SECRET_KEY must be a random value of at least 32 characters "
                '(generate one: python -c "import secrets; print(secrets.token_urlsafe(48))")'
            )
        if "*" in self.cors_origins_list:
            problems.append("CORS_ORIGINS must list your real frontend URL(s), not '*'")
        if self.EMAIL_BACKEND.lower() == "smtp" and not self.SMTP_HOST:
            problems.append("EMAIL_BACKEND=smtp needs SMTP_HOST (and usually SMTP_USER / SMTP_PASSWORD)")
        if self.STORAGE_BACKEND.lower() == "supabase" and not (self.SUPABASE_URL and self.SUPABASE_SERVICE_ROLE_KEY):
            problems.append("STORAGE_BACKEND=supabase needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        if self.CODE_RUNNER.lower() == "local":
            problems.append("CODE_RUNNER=local runs student code on the server itself; use 'judge0' (or 'disabled')")
        if self.CODE_RUNNER.lower() == "judge0" and not self.JUDGE0_URL:
            problems.append("CODE_RUNNER=judge0 needs JUDGE0_URL")
        if self.AI_PROVIDER.lower() == "anthropic" and not self.ANTHROPIC_API_KEY:
            problems.append("AI_PROVIDER=anthropic needs ANTHROPIC_API_KEY")
        if self.AI_PROVIDER.lower() == "fake":
            problems.append("AI_PROVIDER=fake is for tests only")
        if self.STORAGE_BACKEND.lower() == "memory":
            problems.append("STORAGE_BACKEND=memory is for tests only; use 'supabase' or 'local'")
        if problems:
            raise RuntimeError("Unsafe configuration for ENVIRONMENT=%s:\n - %s" % (self.ENVIRONMENT, "\n - ".join(problems)))

    @property
    def sync_database_url(self) -> str:
        """
        Normalize database connection URL.
        Converts legacy 'postgres://' scheme to 'postgresql://' for SQLAlchemy compatibility.
        """
        if not self.DATABASE_URL:
            return ""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql://", 1)
        return url

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

settings = Settings()
