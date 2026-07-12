from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://meduser:medpass@localhost:5432/medpartners"

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # JWT
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # File Storage
    UPLOAD_DIR: str = "/tmp/medpartners/uploads"
    MAX_UPLOAD_MB: int = 50

    # Docling / OCR
    SIMILARITY_THRESHOLD: float = 0.75  # fuzzy-match cut-off for service names
    DOCLING_LANGUAGE: str = "ru"

    # App
    APP_ENV: str = "development"
    API_PREFIX: str = "/api/v1"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
