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

    # OAuth client ID from Google Cloud Console (Credentials > OAuth 2.0 Client
    # IDs > Web application). Must match NEXT_PUBLIC_GOOGLE_CLIENT_ID on the
    # frontend — used to reject ID tokens issued for a different app.
    GOOGLE_CLIENT_ID: str = ""

    # Comma-separated list of allowed frontend origins in production (e.g. the
    # Vercel URL). Empty means "allow any origin" — fine for local dev, but
    # tightening this in render.yaml is what actually makes CORS_ORIGINS mean
    # something instead of sitting there unused.
    CORS_ORIGINS: str = ""

    # Telephonic Agent — real outbound calling via Twilio.
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    # Public HTTPS origin (no trailing slash) Twilio can reach to fetch TwiML
    # and post call-status/speech-gather webhooks — e.g. an ngrok URL in dev,
    # or this backend's deployed URL in production. Outbound calling is
    # disabled (with a clear error) while this is unset, since Twilio cannot
    # call back into localhost.
    PUBLIC_BASE_URL: str = ""

    # SMTP — used only by the Screening Agent invite flow (app/services/email_service.py).
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # Candidate-facing origin (the frontend's own URL), used to build interview
    # invite links — distinct from PUBLIC_BASE_URL, which is this backend's own
    # public URL for Twilio webhooks.
    FRONTEND_BASE_URL: str = "http://localhost:3000"

    DATABASE_URL: str = "sqlite:///./policy_engine.db"

    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # --- Agent memory architecture (app/memory/) ---
    # Episodic memory (one row per finished agent session: screening interview,
    # telephonic call, ...). Separate Postgres database, not the primary SQLite
    # DB above — SQLite already serves as this platform's shared/global memory
    # (documents/rules/roles/SOPs), Postgres is for the higher write-volume,
    # structured session history. Falls back cleanly (session just isn't
    # persisted, logged not raised) if this Postgres isn't reachable, same
    # fail-open convention as REDIS_URL / services/cache.py.
    # Port 5433, not the standard 5432 — docker-compose.yml publishes the
    # postgres container there too, since 5432 was already occupied by
    # another Postgres instance on the host during development.
    EPISODIC_DATABASE_URL: str = "postgresql+psycopg2://policy:policy@localhost:5433/policy_episodic"

    # Working/short-term memory: how long a session's live state (current
    # question, running transcript, latest sentiment) survives in Redis with
    # no activity before it's treated as abandoned.
    WORKING_MEMORY_TTL_SECONDS: int = 1800

    # Semantic/long-term memory: Pinecone namespace used for agent-extracted
    # facts, kept separate from the default namespace (policy rules/chunks
    # indexed by services/canonicalization.py) inside the SAME index/project
    # so no second Pinecone index needs to be provisioned.
    PINECONE_MEMORY_NAMESPACE: str = "agent-memory"

    # Fraud detection pipeline
    FRAUD_ELA_THRESHOLD: float = 35.0
    # Empty by default so pytesseract resolves `tesseract` from PATH, which is
    # how the apt-installed binary is found on Linux hosts (Render/Docker/HF
    # Spaces). Only set this in .env on Windows dev machines, where Tesseract
    # isn't on PATH by default — e.g. C:\Program Files\Tesseract-OCR\tesseract.exe.
    TESSERACT_CMD: str = ""

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
