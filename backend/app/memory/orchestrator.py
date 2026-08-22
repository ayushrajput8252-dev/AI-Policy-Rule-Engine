"""Enterprise Orchestration Layer.

candidate score cards
---------------------
`schedule_candidate_interview` / `get_candidate_scorecards` back the compact
"Candidate Name / Telephonic Score / AI Interview Score" table on the
hiring-automation UI's Interview Scheduling step. Real scores already exist
in two places once an interview has actually run — `CallRecord` (Telephonic
Agent, SQLite) and episodic memory (Screening/AI Interview Agent, Postgres,
keyed by the candidate's email as subject_id — see api/screening.py's
`orchestrator.start_session("screening", session.email, ...)`) — so
scheduling looks each of those up first and only falls back to a stable
placeholder score (seeded by candidate_id, so it doesn't jump around on
refresh) when nothing real has landed yet. `*_is_real` on the stored row
tells the frontend which is which.

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
import random
import uuid
from datetime import datetime, timezone
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


def _lookup_real_telephonic_score(db, candidate_name: str) -> Optional[int]:
    """A completed Screening Agent JD-match analysis (ScreeningResult) is a
    more meaningful "Telephonic Screening Score" than the raw call-demeanor
    average, so it's preferred when one exists; otherwise falls back to
    averaging the raw CallRecord communication/relevance/confidence scores."""
    from ..models import CallRecord, ScreeningResult

    screening_result = (
        db.query(ScreeningResult)
        .filter(ScreeningResult.candidate_name.ilike(candidate_name.strip()))
        .filter(ScreeningResult.jd_match_score.isnot(None))
        .order_by(ScreeningResult.created_at.desc())
        .first()
    )
    if screening_result:
        return screening_result.jd_match_score

    record = (
        db.query(CallRecord)
        .filter(CallRecord.candidate_name.ilike(candidate_name.strip()))
        .filter(CallRecord.communication_score.isnot(None))
        .order_by(CallRecord.updated_at.desc())
        .first()
    )
    if not record:
        return None
    parts = [p for p in (record.communication_score, record.relevance_score, record.confidence_score) if p is not None]
    if not parts:
        return None
    return round(sum(parts) / len(parts))


def record_screening_result_for_scorecard(candidate_name: Optional[str], screening_result: dict) -> None:
    """Called right after a Screening Agent JD-match analysis is persisted
    (api/screening.py's /from-call/{call_id}) so an already-scheduled
    candidate's Enterprise Orchestration Layer scorecard picks up the real
    score immediately, instead of waiting for the next schedule action."""
    if not candidate_name or screening_result.get("jd_match_score") is None:
        return
    from ..database import SessionLocal
    from ..models import CandidateScoreCard

    db = SessionLocal()
    try:
        rows = db.query(CandidateScoreCard).filter(CandidateScoreCard.candidate_name.ilike(candidate_name.strip())).all()
        for row in rows:
            row.telephonic_score = screening_result["jd_match_score"]
            row.telephonic_score_is_real = "true"
        if rows:
            db.commit()
    finally:
        db.close()


def _lookup_real_ai_interview_score(email: Optional[str]) -> Optional[int]:
    """Most recent finished Screening/AI Interview episode for this candidate's
    email (episodic memory's subject_id — see api/screening.py's start_session
    call), preferring its LLM-computed overall_score."""
    if not email:
        return None
    episodes = episodic_memory.get_episodes_for_subject(email, limit=5)
    for ep in episodes:
        scores = ep.get("scores") or {}
        overall = scores.get("overall_score")
        if overall is not None:
            return round(overall)
    return None


def _placeholder_score(seed_key: str) -> int:
    """Stable (not re-randomized on every request) placeholder in a plausible
    band, so the UI doesn't flicker a different number on every refresh
    before the real interview has actually happened."""
    return random.Random(seed_key).randint(62, 91)


def schedule_candidate_interview(
    candidate_id: str,
    candidate_name: str,
    email: Optional[str],
    interview_type: str,
    slot_date: Optional[str] = None,
    slot_time: Optional[str] = None,
) -> dict:
    """Upserts this candidate's CandidateScoreCard row when an interview is
    scheduled from the hiring-automation UI, filling in a real score if one
    already exists (from a completed CallRecord / Screening episode) or a
    stable placeholder otherwise. `interview_type` is "telephonic" or "ai".
    `slot_date`/`slot_time` are the candidate-picked calendar slot labels
    (e.g. "Mon, Jan 12" / "10:00 AM") — persisted so the Telephonic Agent and
    Screening Agent pages can list upcoming interviews scheduled from the
    hiring pipeline, in sync with what was actually booked."""
    from ..database import SessionLocal
    from ..models import CandidateScoreCard

    db = SessionLocal()
    try:
        row = db.get(CandidateScoreCard, candidate_id)
        if row is None:
            row = CandidateScoreCard(id=candidate_id, candidate_name=candidate_name, email=email)
            db.add(row)
        else:
            row.candidate_name = candidate_name
            row.email = email or row.email

        now = datetime.now(timezone.utc)
        if interview_type == "telephonic":
            real = _lookup_real_telephonic_score(db, candidate_name)
            row.telephonic_score = real if real is not None else _placeholder_score(f"tel:{candidate_id}")
            row.telephonic_score_is_real = "true" if real is not None else "false"
            row.telephonic_scheduled_at = now
            row.telephonic_slot_date = slot_date
            row.telephonic_slot_time = slot_time
        elif interview_type == "ai":
            real = _lookup_real_ai_interview_score(email)
            row.ai_interview_score = real if real is not None else _placeholder_score(f"ai:{candidate_id}")
            row.ai_interview_score_is_real = "true" if real is not None else "false"
            row.ai_interview_scheduled_at = now
            row.ai_interview_slot_date = slot_date
            row.ai_interview_slot_time = slot_time
        else:
            raise ValueError(f"Unknown interview_type: {interview_type!r} (expected 'telephonic' or 'ai')")

        db.commit()
        db.refresh(row)
        return _serialize_scorecard(row)
    finally:
        db.close()


def get_candidate_scorecards() -> list[dict]:
    """All candidate scorecards, most recently updated first — powers the
    Enterprise Orchestration Layer's interview scores table."""
    from ..database import SessionLocal
    from ..models import CandidateScoreCard

    db = SessionLocal()
    try:
        rows = db.query(CandidateScoreCard).order_by(CandidateScoreCard.updated_at.desc()).all()
        return [_serialize_scorecard(r) for r in rows]
    finally:
        db.close()


def _serialize_scorecard(row) -> dict:
    return {
        "candidate_id": row.id,
        "candidate_name": row.candidate_name,
        "email": row.email,
        "telephonic_score": row.telephonic_score,
        "telephonic_score_is_real": row.telephonic_score_is_real == "true",
        "ai_interview_score": row.ai_interview_score,
        "ai_interview_score_is_real": row.ai_interview_score_is_real == "true",
        "telephonic_slot_date": row.telephonic_slot_date,
        "telephonic_slot_time": row.telephonic_slot_time,
        "ai_interview_slot_date": row.ai_interview_slot_date,
        "ai_interview_slot_time": row.ai_interview_slot_time,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }
