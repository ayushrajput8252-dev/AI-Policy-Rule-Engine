"""
Screening Agent interviewer turn generation.

Reuses the same Groq-primary/Gemini-fallback JSON generation already used
for policy Q&A and fraud reasoning (see llm_service.generate_json), so the
interview loop gets the same dual-provider resilience instead of a
separate bespoke LLM integration.
"""
from typing import Any, Dict, List, Optional

from .llm_service import generate_json_resilient as generate_json

INTERVIEWER_NAME = "Ayush"

TURN_SYSTEM_INSTRUCTION = """You are {name}, the AI interviewer for AgenticFlow AI's Screening Agent, conducting a first-round screening interview for the role of "{role_title}".

Conduct a natural, adaptive interview:
- Ask ONE question at a time.
- Start by greeting the candidate and asking them to introduce themselves, then probe technical depth, past experience, and problem solving based on what the candidate actually said — follow up on specifics instead of reading a fixed script.
- Keep each line concise (1-3 sentences), conversational, and professional.
- After the candidate has answered {max_turns} questions, wrap up: thank them for their time and set is_final=true with a short closing line instead of a new question.

{resume_context}{jd_context}
Return ONLY a JSON object with this exact shape: {{"question": "<the next thing to say to the candidate>", "is_final": <true|false>}}"""

EVALUATION_SYSTEM_INSTRUCTION = """You are {name}, the AI interviewer for AgenticFlow AI's Screening Agent. The screening interview below has just ended. Evaluate the candidate honestly based ONLY on what they actually said in the transcript below — never invent details that aren't there.

Return ONLY a JSON object with this exact shape:
{{"communication_score": <0-100 integer>, "relevance_score": <0-100 integer>, "confidence_score": <0-100 integer>, "summary": "<2-3 sentence honest summary>", "strengths": "<1-2 sentences>", "areas_for_improvement": "<1-2 sentences>"}}"""

FALLBACK_QUESTION = "Could you tell me more about a recent project you're proud of?"
FALLBACK_EVALUATION = {
    "communication_score": None,
    "relevance_score": None,
    "confidence_score": None,
    "summary": "Automated evaluation is temporarily unavailable — both the primary and fallback LLM providers failed. Please review the transcript manually.",
    "strengths": "",
    "areas_for_improvement": "",
}


def _format_history(history: List[Dict[str, str]]) -> str:
    lines = []
    for turn in history:
        speaker = INTERVIEWER_NAME if turn.get("role") == "interviewer" else "Candidate"
        lines.append(f"{speaker}: {turn.get('text', '').strip()}")
    return "\n".join(lines)


def generate_next_turn(
    history: List[Dict[str, str]],
    role_title: str = "the open role",
    jd_text: Optional[str] = None,
    max_turns: int = 5,
    resume_context: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Given the conversation so far, asks the LLM for the interviewer's next
    line. Returns {"question": str, "is_final": bool}.
    """
    candidate_turns = sum(1 for t in history if t.get("role") == "candidate")
    jd_context = f"The role's job description:\n{jd_text.strip()}\n" if jd_text else ""
    resume_ctx = f"The candidate's resume summary:\n{resume_context.strip()}\n" if resume_context else ""

    system_instruction = TURN_SYSTEM_INSTRUCTION.format(
        name=INTERVIEWER_NAME, role_title=role_title, max_turns=max_turns,
        jd_context=jd_context, resume_context=resume_ctx,
    )

    if not history:
        prompt = "The interview is just starting. Greet the candidate briefly and ask them to introduce themselves."
    else:
        prompt = (
            f"Conversation so far (candidate has answered {candidate_turns} question(s)):\n"
            f"{_format_history(history)}\n\n"
            "Given what the candidate just said, produce your next line."
        )

    try:
        result = generate_json(prompt, system_instruction)
    except Exception as e:
        # Never let the transcript go unanswered — a visibly generic fallback
        # question is better than a silently broken interview loop.
        print(f"[Interview Service Error] {e}")
        result = {"question": FALLBACK_QUESTION, "is_final": candidate_turns >= max_turns}

    if not isinstance(result, dict) or not result.get("question"):
        result = {"question": FALLBACK_QUESTION, "is_final": candidate_turns >= max_turns}

    # Hard stop: once the turn limit is reached, force is_final=True even if
    # the LLM returned is_final=false — setdefault alone only fills the key
    # when it's absent, so it could never override a wrongly-false answer.
    result["is_final"] = bool(result.get("is_final", False)) or candidate_turns >= max_turns
    return result


def generate_evaluation(history: List[Dict[str, str]], role_title: str = "the open role") -> Dict[str, Any]:
    """Produces a scored evaluation of the whole interview transcript."""
    if not any(t.get("role") == "candidate" for t in history):
        return {**FALLBACK_EVALUATION, "summary": "No candidate responses were recorded."}

    system_instruction = EVALUATION_SYSTEM_INSTRUCTION.format(name=INTERVIEWER_NAME)
    prompt = f"Role: {role_title}\n\nFull transcript:\n{_format_history(history)}"

    try:
        result = generate_json(prompt, system_instruction)
        if not isinstance(result, dict):
            raise ValueError("Evaluation response was not a JSON object")
    except Exception as e:
        print(f"[Interview Evaluation Error] {e}")
        return FALLBACK_EVALUATION

    for field in ("communication_score", "relevance_score", "confidence_score"):
        try:
            result[field] = max(0, min(100, int(result.get(field, 50))))
        except (TypeError, ValueError):
            result[field] = 50

    # Single server-computed, auditable overall score instead of leaving
    # aggregation of the three sub-scores implicit/undone.
    result["overall_score"] = round(
        0.5 * result["relevance_score"]
        + 0.3 * result["communication_score"]
        + 0.2 * result["confidence_score"]
    )
    return result
