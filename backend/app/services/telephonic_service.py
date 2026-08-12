"""
Telephonic Agent call-turn generation.

Same Groq-primary/Gemini-fallback JSON generation as the Screening Agent's
interview_service, but tuned for a real phone call: every line here is read
aloud by Twilio's text-to-speech, so it has to stay short, plain, and free
of anything that only makes sense written down.
"""
from typing import Any, Dict, List, Optional

from .llm_service import generate_json

AGENT_NAME = "Ayush"

CALL_SYSTEM_INSTRUCTION = """You are {name}, an AI voice screening agent calling a candidate on the phone on behalf of AgenticFlow AI, screening them for the role of "{role_title}".

This is a real, live phone call and your words are read aloud by text-to-speech, so:
- Keep every line SHORT (1-2 sentences), plain spoken English — no markdown, no bullet points, no symbols.
- Ask ONE question at a time and wait for the answer.
- Start by greeting {candidate_name} by name, briefly saying who you are and why you're calling, and asking them to briefly introduce themselves.
- Probe their interest in the role, relevant experience, and fit based on what they actually say — follow up on specifics instead of reading a fixed script.
- After the candidate has answered {max_turns} questions, thank them for their time, let them know next steps will follow by email, and set is_final=true instead of asking a new question.

Return ONLY a JSON object with this exact shape: {{"question": "<the next thing to say out loud to the candidate>", "is_final": <true|false>}}"""

FALLBACK_QUESTION = "Could you tell me a bit about your relevant experience for this role?"


def _format_history(history: List[Dict[str, str]]) -> str:
    lines = []
    for turn in history:
        speaker = AGENT_NAME if turn.get("role") == "agent" else "Candidate"
        lines.append(f"{speaker}: {turn.get('text', '').strip()}")
    return "\n".join(lines)


def generate_call_turn(
    history: List[Dict[str, str]],
    candidate_name: str = "there",
    role_title: str = "the open role",
    max_turns: int = 4,
) -> Dict[str, Any]:
    """Given the call so far, asks the LLM for the agent's next spoken line.
    Returns {"question": str, "is_final": bool}."""
    candidate_turns = sum(1 for t in history if t.get("role") == "candidate")
    system_instruction = CALL_SYSTEM_INSTRUCTION.format(
        name=AGENT_NAME, role_title=role_title, candidate_name=candidate_name, max_turns=max_turns
    )

    if not history:
        prompt = f"The call with {candidate_name} just connected. Greet them and start the screen."
    else:
        prompt = (
            f"Conversation so far (candidate has answered {candidate_turns} question(s)):\n"
            f"{_format_history(history)}\n\n"
            "Given what the candidate just said, produce your next line."
        )

    try:
        result = generate_json(prompt, system_instruction)
    except Exception as e:
        print(f"[Telephonic Service Error] {e}")
        result = {"question": FALLBACK_QUESTION, "is_final": candidate_turns >= max_turns}

    if not isinstance(result, dict) or not result.get("question"):
        result = {"question": FALLBACK_QUESTION, "is_final": candidate_turns >= max_turns}

    result.setdefault("is_final", candidate_turns >= max_turns)
    return result
