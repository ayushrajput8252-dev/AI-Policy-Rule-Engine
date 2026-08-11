from pydantic_settings import BaseSettings, SettingsConfigDict

from pydantic import Field, AliasChoices

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000

    GEMINI_API_KEY: str = Field(default="", validation_alias=AliasChoices("GEMINI_API_KEY", "GOOGLE_API_KEY"))
    GROK_API_KEY: str = Field(default="", validation_alias=AliasChoices("GROK_API_KEY", "XAI_API_KEY", "GROQ_API_KEY"))
    GROQ_API_KEY: str = Field(default="", validation_alias=AliasChoices("GROQ_API_KEY", "GROK_API_KEY"))

    PINECONE_API_KEY: str = ""
    PINECONE_ENVIRONMENT: str = ""
    PINECONE_INDEX_NAME: str = Field(default="policy-rules", validation_alias=AliasChoices("PINECONE_INDEX_NAME", "PINECONE_INDEX"))

    TAVILY_API_KEY: str = ""

    # Comma-separated list of allowed frontend origins in production (e.g. the
    # Vercel URL). Empty means "allow any origin" — fine for local dev, but
    # tightening this in render.yaml is what actually makes CORS_ORIGINS mean
    # something instead of sitting there unused.
    CORS_ORIGINS: str = ""

    DATABASE_URL: str = "sqlite:///./policy_engine.db"
    
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Fraud detection pipeline
    FRAUD_ELA_THRESHOLD: float = 35.0
    TESSERACT_CMD: str = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
