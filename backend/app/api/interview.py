from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..memory import orchestrator
from ..services.interview_service import generate_evaluation, generate_next_turn
from ..services.guardrails import check_input, check_output

router = APIRouter()


def _sanitize_history(history: list[dict]) -> list[dict]:
    """
    Regex-only guardrail pass over the candidate's free-text answers before
    they reach the interviewer LLM's prompt — strips control characters/caps
    length, and swaps out any answer that trips the prompt-injection
    blocklist for a neutral placeholder so the payload never reaches the
    prompt (the interview itself continues rather than hard-erroring, since a
    suspicious answer is still just one candidate answer, not a reason to
    abort the whole session).
    """
    sanitized = []
    for turn in history:
        text = turn.get("text", "")
        if turn.get("role") == "candidate" and text:
            result = check_input(text)
            text = result.text if result.allowed else "[response withheld — flagged content]"
        sanitized.append({**turn, "text": text})
    return sanitized


class InterviewTurnIn(BaseModel):
    role: str  # "interviewer" | "candidate"
    text: str


class InterviewTurnRequest(BaseModel):
    history: List[InterviewTurnIn] = []
    role_title: str = "the open role"
    jd_text: Optional[str] = None
    resume_context: Optional[str] = None
    max_turns: int = 5


class InterviewEvaluationRequest(BaseModel):
    history: List[InterviewTurnIn]
    role_title: str = "the open role"
    session_id: Optional[str] = None


@router.post("/interview/turn")
async def interview_turn(request: InterviewTurnRequest):
    """
    Given the conversation so far, returns the AI interviewer's next line
    (or a closing line + is_final=true once max_turns is reached).
    """
    try:
        history = _sanitize_history([t.model_dump() for t in request.history])
        result = generate_next_turn(
            history, request.role_title, request.jd_text, request.max_turns, request.resume_context
        )
        if result.get("question"):
            result["question"] = check_output(result["question"]).text
        return result
    except Exception as e:
        print(f"[Interview Turn API Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interview/evaluate")
async def interview_evaluate(request: InterviewEvaluationRequest):
    """Scores the full transcript once the interview has ended."""
    try:
        history = _sanitize_history([t.model_dump() for t in request.history])
        evaluation = generate_evaluation(history, request.role_title)
        if evaluation.get("summary"):
            evaluation["summary"] = check_output(evaluation["summary"]).text

        if request.session_id:
            # Orchestration layer: fold the full transcript this endpoint
            # already received into episodic memory (Postgres) + semantic
            # memory (Pinecone), and clear this session's working memory.
            # transcript_override is used because the live interview UI
            # (InterviewRoom.tsx) drives Q&A client-side rather than through
            # /orchestrator/session/turn per exchange.
            transcript = [{"role": "agent" if t["role"] == "interviewer" else "candidate", "text": t["text"]} for t in history]
            orchestrator.end_session(
                request.session_id,
                scores={
                    "communication_score": evaluation.get("communication_score"),
                    "relevance_score": evaluation.get("relevance_score"),
                    "confidence_score": evaluation.get("confidence_score"),
                    "overall_score": evaluation.get("overall_score"),
                },
                summary=evaluation.get("summary"),
                transcript_override=transcript,
            )

        return evaluation
    except Exception as e:
        print(f"[Interview Evaluate API Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))
