from pydantic_settings import BaseSettings, SettingsConfigDict

from pydantic import Field, AliasChoices

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000

    GEMINI_API_KEY: str = Field(default="", validation_alias=AliasChoices("GEMINI_API_KEY", "GOOGLE_API_KEY"))
    GROQ_API_KEY: str = ""

    PINECONE_API_KEY: str = ""
    PINECONE_ENVIRONMENT: str = ""
    PINECONE_INDEX_NAME: str = Field(default="policy-rules", validation_alias=AliasChoices("PINECONE_INDEX_NAME", "PINECONE_INDEX"))

    DATABASE_URL: str = "sqlite:///./policy_engine.db"
    
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
