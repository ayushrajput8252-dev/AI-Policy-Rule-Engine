"""Episodic memory — one Postgres row per finished session, queryable by
subject (candidate email/phone) so any agent can see a candidate's history
across products (e.g. Telephonic Agent can see a prior Screening Agent
session for the same person)."""
from datetime import datetime, timezone
from typing import Any, Optional

from .episodic_db import episodic_db_available, get_episodic_session
from .episodic_models import EpisodicMemory


def record_episode(
    session_id: str,
    agent_type: str,
    subject_id: str,
    role_title: Optional[str] = None,
    question_summary: Optional[str] = None,
    answer_summary: Optional[str] = None,
    transcript: Optional[list] = None,
    scores: Optional[dict] = None,
    sentiment: Optional[str] = None,
) -> bool:
    if not episodic_db_available():
        return False

    db = get_episodic_session()
    try:
        row = db.get(EpisodicMemory, session_id)
        if row is None:
            row = EpisodicMemory(id=session_id, agent_type=agent_type, subject_id=subject_id)
            db.add(row)

        row.role_title = role_title
        row.question_summary = question_summary
        row.answer_summary = answer_summary
        row.transcript = transcript or []
        row.scores = scores or {}
        row.sentiment = sentiment
        row.ended_at = datetime.now(timezone.utc)

        db.commit()
        return True
    except Exception as e:
        print(f"[Episodic Memory Error]: Failed to record session {session_id}: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def get_episodes_for_subject(subject_id: str, limit: int = 20) -> list[dict]:
    if not episodic_db_available():
        return []

    db = get_episodic_session()
    try:
        rows = (
            db.query(EpisodicMemory)
            .filter(EpisodicMemory.subject_id == subject_id)
            .order_by(EpisodicMemory.started_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "session_id": r.id,
                "agent_type": r.agent_type,
                "role_title": r.role_title,
                "question_summary": r.question_summary,
                "answer_summary": r.answer_summary,
                "scores": r.scores,
                "sentiment": r.sentiment,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "ended_at": r.ended_at.isoformat() if r.ended_at else None,
            }
            for r in rows
        ]
    except Exception as e:
        print(f"[Episodic Memory Error]: Failed to fetch episodes for {subject_id}: {e}")
        return []
    finally:
        db.close()
