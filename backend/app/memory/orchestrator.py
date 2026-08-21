"""Enterprise Orchestration Layer.

Previously this was frontend-only marketing copy (an "Orchestrator / MCP
Router / Approval Gate" graphic on the homepage) with no backend behind it —
each agent (RAG, Fraud, Screening, Telephonic) ran fully independently, with
no shared session lifecycle and no cross-agent memory.

This module is the real thing, scoped to what the other agents actually
need: a single place that starts/updates/ends an agent session and, in
doing so, drives all five memory tiers together so no agent has to know
Redis/Postgres/Pinecone/SQLite/networkx individually —

  start_session   -> working memory (Redis) + graph memory (candidate/role nodes)
  record_turn     -> working memory (Redis)
  end_session     -> episodic memory (Postgres) + semantic memory (Pinecone) + graph memory
  get_context_for -> aggregates global + semantic + episodic + graph memory
                      into one bundle any agent can hand to its LLM prompt

Agents call this instead of touching individual memory modules directly.
"""
import uuid
from typing import Any, Optional

from . import episodic_memory, global_memory, graph_memory, semantic_memory, working_memory
from .episodic_db import episodic_db_available
from ..services.cache import get_redis_client


def _candidate_node_id(subject_id: str) -> str:
    return f"candidate:{subject_id}"


def _role_node_id(role_title: str) -> str:
    return f"role:{role_title.strip().lower()}"


def start_session(agent_type: str, subject_id: str, role_title: Optional[str] = None, session_id: Optional[str] = None) -> dict:
    session_id = session_id or str(uuid.uuid4())
    state = working_memory.start_session_state(session_id, agent_type, subject_id, role_title)

    try:
        graph_memory.add_node(_candidate_node_id(subject_id), "candidate", subject_id)
        if role_title:
            graph_memory.add_node(_role_node_id(role_title), "role", role_title)
            graph_memory.add_edge(_candidate_node_id(subject_id), _role_node_id(role_title), f"{agent_type.upper()}_FOR")
    except Exception as e:
        print(f"[Orchestrator Warning]: Graph memory update failed for session {session_id}: {e}")

    return state


def record_turn(session_id: str, question: Optional[str] = None, answer: Optional[str] = None, sentiment: Optional[str] = None) -> Optional[dict]:
    return working_memory.record_turn(session_id, question=question, answer=answer, sentiment=sentiment)


def end_session(
    session_id: str,
    scores: Optional[dict] = None,
    summary: Optional[str] = None,
    transcript_override: Optional[list] = None,
) -> dict:
    """Folds working memory into episodic + semantic memory, then clears it.
    Safe to call even if the session already expired from Redis (e.g. a
    long-running call) — it just won't have a transcript to persist.

    `transcript_override` lets a caller that already holds the full
    transcript client-side (e.g. the Screening Agent's browser-driven
    interview, which doesn't stream turns through /orchestrator/session/turn)
    supply it directly instead of relying on what's in Redis."""
    state = working_memory.end_session_state(session_id) or {}
    transcript = transcript_override if transcript_override is not None else state.get("current_transcript", [])
    subject_id = state.get("subject_id", "unknown")
    agent_type = state.get("agent_type", "unknown")
    role_title = state.get("role_title")
    sentiment = state.get("sentiment")

    question_summary = "; ".join(t["text"] for t in transcript if t.get("role") == "agent")[:2000]
    answer_summary = summary or "; ".join(t["text"] for t in transcript if t.get("role") == "candidate")[:2000]

    persisted = episodic_memory.record_episode(
        session_id=session_id,
        agent_type=agent_type,
        subject_id=subject_id,
        role_title=role_title,
        question_summary=question_summary,
        answer_summary=answer_summary,
        transcript=transcript,
        scores=scores or {},
        sentiment=sentiment,
    )

    if answer_summary:
        semantic_memory.store_fact(
            entity_id=subject_id,
            agent_type=agent_type,
            fact_text=f"[{agent_type} session for {role_title or 'unspecified role'}] {answer_summary}",
            metadata={"session_id": session_id, "role_title": role_title or ""},
        )

    return {
        "session_id": session_id,
        "episodic_persisted": persisted,
        "subject_id": subject_id,
        "agent_type": agent_type,
        "transcript_turns": len(transcript),
    }


def get_context_for(subject_id: str, role_title: Optional[str] = None, query_text: Optional[str] = None) -> dict:
    """Aggregates every memory tier for one subject into a single bundle —
    the read-side counterpart to the write-side lifecycle above, for any
    agent that wants "everything we know about this candidate" before it
    asks its next question."""
    context: dict[str, Any] = {
        "subject_id": subject_id,
        "global": {"role": global_memory.get_role(role_title) if role_title else None},
        "episodic": episodic_memory.get_episodes_for_subject(subject_id),
        "semantic": semantic_memory.retrieve_facts(query_text or subject_id, entity_id=subject_id),
        "graph": graph_memory.get_related(_candidate_node_id(subject_id)),
    }
    return context


def memory_health() -> dict:
    """Live reachability of each memory tier — lets an operator see at a
    glance which tiers are actually up, instead of guessing from silent
    fail-open logs."""
    redis_ok = get_redis_client() is not None
    postgres_ok = episodic_db_available()

    pinecone_ok = False
    try:
        from ..services.canonicalization import get_pinecone_index

        get_pinecone_index().describe_index_stats()
        pinecone_ok = True
    except Exception:
        pinecone_ok = False

    sqlite_ok = False
    try:
        from sqlalchemy import text

        from ..database import SessionLocal

        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            sqlite_ok = True
        finally:
            db.close()
    except Exception:
        sqlite_ok = False

    return {
        "working_memory_redis": redis_ok,
        "episodic_memory_postgres": postgres_ok,
        "semantic_memory_pinecone": pinecone_ok,
        "global_memory_sqlite": sqlite_ok,
        "graph_memory_sqlite": sqlite_ok,
    }
