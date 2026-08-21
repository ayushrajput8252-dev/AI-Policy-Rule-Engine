"""Working/short-term memory — the live state of one in-progress agent
session (current question, running transcript, latest sentiment reading).

Backed by Redis with a sliding TTL. Nothing here is meant to outlive the
session: app/memory/orchestrator.py reads it once at session end, folds it
into a summary, writes that summary to episodic memory (Postgres) and
semantic memory (Pinecone), then deletes the Redis key. Reuses the same
Redis client/fail-open convention as app/services/cache.py rather than
managing a second connection.
"""
import json
from datetime import datetime, timezone
from typing import Any, Optional

from ..config import settings
from ..services.cache import get_redis_client

KEY_PREFIX = "session_state"


def _key(session_id: str) -> str:
    return f"{KEY_PREFIX}:{session_id}"


def start_session_state(session_id: str, agent_type: str, subject_id: str, role_title: Optional[str] = None) -> dict:
    state = {
        "session_id": session_id,
        "agent_type": agent_type,
        "subject_id": subject_id,
        "role_title": role_title,
        "current_question": None,
        "current_transcript": [],
        "sentiment": "neutral",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    _write(session_id, state)
    return state


def record_turn(
    session_id: str,
    question: Optional[str] = None,
    answer: Optional[str] = None,
    sentiment: Optional[str] = None,
) -> Optional[dict]:
    """Appends a turn to the live transcript and updates the current
    question/sentiment. Returns None (no-op) if the session isn't in Redis
    (expired or Redis unavailable) — callers should not treat that as fatal."""
    state = get_session_state(session_id)
    if state is None:
        return None

    if question is not None:
        state["current_question"] = question
        state["current_transcript"].append({"role": "agent", "text": question})
    if answer is not None:
        state["current_transcript"].append({"role": "candidate", "text": answer})
    if sentiment:
        state["sentiment"] = sentiment
    state["updated_at"] = datetime.now(timezone.utc).isoformat()

    _write(session_id, state)
    return state


def get_session_state(session_id: str) -> Optional[dict]:
    r = get_redis_client()
    if not r:
        return None
    try:
        raw = r.get(_key(session_id))
        return json.loads(raw) if raw else None
    except Exception as e:
        print(f"[Working Memory Error]: Failed to read session {session_id}: {e}")
        return None


def end_session_state(session_id: str) -> Optional[dict]:
    """Reads and deletes the session's working memory in one step, returning
    the final state for the caller (orchestrator) to summarize/persist."""
    state = get_session_state(session_id)
    r = get_redis_client()
    if r:
        try:
            r.delete(_key(session_id))
        except Exception as e:
            print(f"[Working Memory Error]: Failed to clear session {session_id}: {e}")
    return state


def _write(session_id: str, state: dict) -> None:
    r = get_redis_client()
    if not r:
        return
    try:
        r.setex(_key(session_id), settings.WORKING_MEMORY_TTL_SECONDS, json.dumps(state))
    except Exception as e:
        print(f"[Working Memory Error]: Failed to write session {session_id}: {e}")
