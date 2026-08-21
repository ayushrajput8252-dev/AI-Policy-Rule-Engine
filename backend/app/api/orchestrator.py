from typing import Optional

from fastapi import APIRouter
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
