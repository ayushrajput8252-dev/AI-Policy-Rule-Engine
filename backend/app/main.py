from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from .config import settings
from .api import upload, query, rules, audio, fraud, interview, auth, telephonic, hiring, screening, orchestrator, mcp
from .database import engine
from . import models

# Create database tables automatically
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Policy Intelligence Platform API",
    description="Backend API for the rule intelligence engine.",
    version="1.0.0"
)

cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

# Every Vercel deployment (production and each PR/branch preview) gets its own
# hostname under *.vercel.app, so a fixed CORS_ORIGINS list can't keep up with
# preview URLs on its own — match the whole vercel.app family by regex in
# addition to whatever explicit custom domain(s) are set in CORS_ORIGINS.
VERCEL_ORIGIN_REGEX = r"^https://[a-zA-Z0-9-]+\.vercel\.app$"

if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_origin_regex=VERCEL_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # No explicit origins configured (local dev) — allow any origin, but
    # without credentials, since browsers reject a wildcard origin combined
    # with credentialed requests regardless of what the server sends.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(upload.router, prefix="/api/v1")
app.include_router(query.router, prefix="/api/v1")
app.include_router(rules.router, prefix="/api/v1")
app.include_router(audio.router, prefix="/api/v1")
app.include_router(fraud.router, prefix="/api/v1")
app.include_router(interview.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(telephonic.router, prefix="/api/v1")
app.include_router(hiring.router, prefix="/api/v1")
app.include_router(screening.router, prefix="/api/v1")
app.include_router(orchestrator.router, prefix="/api/v1")
app.include_router(mcp.router, prefix="/api/v1")

# Mount uploads directory for static file serving
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
def _prewarm_local_fallback_retrieval():
    # Kicks off the local (Pinecone-free) semantic search cache build in a
    # background thread so it's likely warm by the time a Pinecone outage
    # actually needs it — see services/local_fallback_retrieval.py.
    from .services.local_fallback_retrieval import prewarm_caches
    prewarm_caches()


@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Policy Intelligence Platform API", "environment": settings.ENVIRONMENT}

@app.get("/health")
def health_check():
    from .services.resilience import all_breaker_states
    return {"status": "ok", "circuit_breakers": all_breaker_states()}
