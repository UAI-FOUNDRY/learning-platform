from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    DATABASE_URL: Optional[str] = "postgresql://postgres:postgres@localhost:5432/learning_platform"
    SECRET_KEY: str = "replace_with_a_secure_random_key_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Supabase / PostgreSQL Connection Pool Configurations
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800  # Recycle after 30 min to prevent disconnects on Supabase pgBouncer
    DB_ECHO: bool = False

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
