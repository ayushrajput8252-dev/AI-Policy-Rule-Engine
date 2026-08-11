from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.interview_service import generate_evaluation, generate_next_turn

router = APIRouter()


class InterviewTurnIn(BaseModel):
    role: str  # "interviewer" | "candidate"
    text: str


class InterviewTurnRequest(BaseModel):
    history: List[InterviewTurnIn] = []
    role_title: str = "the open role"
    jd_text: Optional[str] = None
    max_turns: int = 5


class InterviewEvaluationRequest(BaseModel):
    history: List[InterviewTurnIn]
    role_title: str = "the open role"


@router.post("/interview/turn")
async def interview_turn(request: InterviewTurnRequest):
    """
    Given the conversation so far, returns the AI interviewer's next line
    (or a closing line + is_final=true once max_turns is reached).
    """
    try:
        history = [t.model_dump() for t in request.history]
        return generate_next_turn(history, request.role_title, request.jd_text, request.max_turns)
    except Exception as e:
        print(f"[Interview Turn API Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interview/evaluate")
async def interview_evaluate(request: InterviewEvaluationRequest):
    """Scores the full transcript once the interview has ended."""
    try:
        history = [t.model_dump() for t in request.history]
        return generate_evaluation(history, request.role_title)
    except Exception as e:
        print(f"[Interview Evaluate API Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))
