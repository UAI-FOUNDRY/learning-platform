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
    SMTP_USE_TLS: bool = True

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
