from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api import upload, query
from .database import engine
from . import models

# Create database tables automatically
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Policy Intelligence Platform API",
    description="Backend API for the rule intelligence engine.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api/v1")
app.include_router(query.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Policy Intelligence Platform API", "environment": settings.ENVIRONMENT}

@app.get("/health")
def health_check():
    return {"status": "ok"}
