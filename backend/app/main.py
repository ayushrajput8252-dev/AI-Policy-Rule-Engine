from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from .config import settings
from .api import upload, query, rules, audio, fraud, interview, auth, telephonic
from .database import engine
from . import models

# Create database tables automatically
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Policy Intelligence Platform API",
    description="Backend API for the rule intelligence engine.",
    version="1.0.0"
)

cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
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

# Mount uploads directory for static file serving
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Policy Intelligence Platform API", "environment": settings.ENVIRONMENT}

@app.get("/health")
def health_check():
    return {"status": "ok"}
