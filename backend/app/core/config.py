import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings configuration using Pydantic validation.
    Reads from .env file or environment variables.
    """

    PROJECT_NAME: str = "Cancer Institute Management & AI Research Platform"

    # Security
    SECRET_KEY: str = "placeholder_secret_key_change_me_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Databases
    DATABASE_URL: str = "mysql+aiomysql://devuser:1234@localhost:3306/cancer_institute"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Cloud Storage
    GCS_BUCKET_NAME: str = "placeholder-bucket-name"
    GOOGLE_APPLICATION_CREDENTIALS: str | None = None

    # AI API keys
    GEMINI_API_KEY: str | None = None

    model_config = SettingsConfigDict(
        env_file=os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            ".env"
        ),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()