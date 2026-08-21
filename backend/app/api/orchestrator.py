from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..memory import orchestrator

router = APIRouter(prefix="/orchestrator", tags=["orchestrator"])


class StartSessionRequest(BaseModel):
    agent_type: str
    subject_id: str
    role_title: Optional[str] = None
    session_id: Optional[str] = None


class RecordTurnRequest(BaseModel):
    session_id: str
    question: Optional[str] = None
    answer: Optional[str] = None
    sentiment: Optional[str] = None


class EndSessionRequest(BaseModel):
    session_id: str
    scores: Optional[dict] = None
    summary: Optional[str] = None


class ScheduleCandidateInterviewRequest(BaseModel):
    candidate_id: str
    candidate_name: str
    email: Optional[str] = None
    interview_type: str  # "telephonic" | "ai"


@router.post("/session/start")
def start_session(payload: StartSessionRequest):
    return orchestrator.start_session(payload.agent_type, payload.subject_id, payload.role_title, payload.session_id)


@router.post("/session/turn")
def record_turn(payload: RecordTurnRequest):
    state = orchestrator.record_turn(payload.session_id, payload.question, payload.answer, payload.sentiment)
    return state or {"session_id": payload.session_id, "note": "Session not found in working memory (expired or Redis unavailable)."}


@router.post("/session/end")
def end_session(payload: EndSessionRequest):
    return orchestrator.end_session(payload.session_id, payload.scores, payload.summary)


@router.get("/context/{subject_id}")
def get_context(subject_id: str, role_title: Optional[str] = None, query: Optional[str] = None):
    return orchestrator.get_context_for(subject_id, role_title, query)


@router.get("/health")
def memory_health():
    return orchestrator.memory_health()


@router.post("/candidates/schedule")
def schedule_candidate_interview(payload: ScheduleCandidateInterviewRequest):
    """Called when the hiring-automation UI schedules a telephonic or AI
    interview slot for a candidate — upserts that candidate's scorecard row,
    pulling in a real score from CallRecord/episodic memory if one already
    exists, or a stable placeholder otherwise."""
    if payload.interview_type not in ("telephonic", "ai"):
        raise HTTPException(status_code=400, detail="interview_type must be 'telephonic' or 'ai'")
    return orchestrator.schedule_candidate_interview(
        payload.candidate_id, payload.candidate_name, payload.email, payload.interview_type
    )


@router.get("/candidates")
def list_candidate_scorecards():
    """Backs the Enterprise Orchestration Layer's compact interview-scores table."""
    return {"candidates": orchestrator.get_candidate_scorecards()}
