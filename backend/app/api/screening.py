import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from .. import models
from ..config import settings
from ..database import get_db
from ..memory import global_memory, orchestrator
from ..services.email_service import send_invite_email
from ..services.screening_service import parse_resume_and_generate_questions

router = APIRouter(prefix="/screening", tags=["screening"])


@router.post("/start")
async def start_screening(
    resume: UploadFile = File(...),
    role_title: str = Form(...),
    jd_text: str = Form(""),
    session_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(resume.filename or "")[1].lower()
    if ext != ".pdf":
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported.")

    content = await resume.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded resume file is empty.")

    if not role_title.strip():
        raise HTTPException(status_code=400, detail="Role title is required.")

    # Shared/global memory: every real screening session that names a role
    # grows the Role table, so it's populated from actual usage rather than
    # needing to be seeded by hand.
    global_memory.upsert_role(role_title.strip(), jd_text=jd_text or "")

    if session_id:
        session = db.query(models.ScreeningSession).filter(models.ScreeningSession.id == session_id).first()
        if session:
            session.status = "in_progress"
            db.commit()
            # Orchestration layer: opens this interview's working-memory
            # session (Redis) keyed by the candidate's email, and registers
            # candidate<->role in graph memory — mirrors the Telephonic Agent's
            # wiring in api/telephonic.py so both conversational agents feed
            # the same memory tiers.
            orchestrator.start_session("screening", session.email, session.role_title, session_id=session_id)

    return parse_resume_and_generate_questions(content, role_title.strip(), jd_text or None)


class InviteRequest(BaseModel):
    email: EmailStr
    role_title: str
    jd_text: Optional[str] = None


class InviteResponse(BaseModel):
    status: str  # "sent" | "failed"
    session_id: str
    interview_link: str
    message: str


@router.post("/invite", response_model=InviteResponse)
def invite_candidate(payload: InviteRequest, db: Session = Depends(get_db)):
    if not payload.role_title.strip():
        raise HTTPException(status_code=400, detail="Role title is required.")

    session_id = str(uuid.uuid4())
    session = models.ScreeningSession(
        id=session_id,
        email=str(payload.email),
        role_title=payload.role_title.strip(),
        jd_text=payload.jd_text,
        status="invited",
    )
    db.add(session)
    db.commit()

    interview_link = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/screening-agent/session/{session_id}"
    sent = send_invite_email(str(payload.email), payload.role_title.strip(), interview_link)

    if not sent:
        return InviteResponse(
            status="failed",
            session_id=session_id,
            interview_link=interview_link,
            message="Session created, but the invite email could not be sent. Share the link manually.",
        )
    return InviteResponse(
        status="sent",
        session_id=session_id,
        interview_link=interview_link,
        message=f"Invite sent to {payload.email}.",
    )


@router.get("/session/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(models.ScreeningSession).filter(models.ScreeningSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="This interview link is invalid or has expired.")

    if session.status == "invited":
        session.status = "opened"
        db.commit()

    return {
        "session_id": session.id,
        "email": session.email,
        "role_title": session.role_title,
        "jd_text": session.jd_text,
        "status": session.status,
    }
