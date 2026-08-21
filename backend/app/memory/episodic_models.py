from sqlalchemy import Column, String, Integer, DateTime, JSON, Text
from sqlalchemy.sql import func

from .episodic_db import EpisodicBase


class EpisodicMemory(EpisodicBase):
    """One record per finished agent session — what was asked, what was
    answered, the scores it produced, and when. This is the platform's
    episodic memory: a session-level history any agent can look up by
    subject_id (candidate email/phone) to see "what happened last time",
    distinct from working memory (live, Redis, deleted at session end) and
    semantic memory (extracted facts, Pinecone, not full transcripts)."""

    __tablename__ = "episodic_memory"

    id = Column(String, primary_key=True, index=True)  # == session_id
    agent_type = Column(String, index=True)  # "screening" | "telephonic" | "rag" | "fraud"
    subject_id = Column(String, index=True)  # candidate email or phone number
    role_title = Column(String, nullable=True)
    question_summary = Column(Text, nullable=True)
    answer_summary = Column(Text, nullable=True)
    transcript = Column(JSON, default=list)
    scores = Column(JSON, default=dict)
    sentiment = Column(String, nullable=True)  # "positive" | "neutral" | "negative"
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
