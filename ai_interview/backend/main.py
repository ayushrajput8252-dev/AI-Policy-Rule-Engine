"""
Minimal backend for the Screening Agent landing page.

Only job right now: when a visitor submits the "Schedule a Demo" form,
log the request. No email/CRM/Slack integration yet (by design, per
current scope) — requests are appended to a local JSON-lines file so
they're inspectable and easy to wire into something real later.
"""
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

logger = logging.getLogger("ai_interview_backend")
logging.basicConfig(level=logging.INFO)

LEADS_FILE = Path(__file__).parent / "demo_requests.jsonl"

app = FastAPI(title="Screening Agent — Landing Page API")

# Comma-separated public frontend origin(s) in production (e.g. the deployed
# EC2/domain URL). Falls back to the Vite dev server origins for local dev.
_cors_origins_env = os.getenv("CORS_ORIGINS", "")
_allow_origins = (
    [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
    if _cors_origins_env
    else ["http://localhost:5173", "http://127.0.0.1:5173"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class DemoRequest(BaseModel):
    name: str
    email: EmailStr
    company: str
    message: str | None = None


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/schedule-demo")
async def schedule_demo(payload: DemoRequest):
    record = {
        "received_at": datetime.now(timezone.utc).isoformat(),
        **payload.model_dump(),
    }
    with LEADS_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")

    logger.info("New demo request logged: %s <%s> @ %s", record["name"], record["email"], record["company"])

    return {"status": "logged", "received_at": record["received_at"]}
