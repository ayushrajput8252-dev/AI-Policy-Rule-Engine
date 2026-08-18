from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    metadata_ = Column("metadata", JSON, default={})

    chunks = relationship("Chunk", back_populates="document")
    rules = relationship("Rule", back_populates="document")

class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(String, primary_key=True, index=True)
    document_id = Column(String, ForeignKey("documents.id"))
    page = Column(Integer)
    section = Column(String, index=True)
    content = Column(String)

    document = relationship("Document", back_populates="chunks")

class FraudScan(Base):
    __tablename__ = "fraud_scans"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String)
    file_path = Column(String)
    content_type = Column(String)  # "pdf" | "image"
    status = Column(String, default="uploaded")  # uploaded -> scanning -> complete -> error
    result = Column("result", JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class IdentityRecord(Base):
    """One row per document ever scanned that yielded identity fields — the
    corpus the Duplicate Identity Scan blocks/matches new scans against, and
    the corpus Resume Authenticity's embedding-similarity check compares
    against to catch templated/mass-produced resumes.

    Sensitive fields are never stored raw: bank_account_last4 keeps only the
    last 4 digits, and device_fingerprint/ip_hash store a SHA-256 hash (not
    the raw IP/user-agent) — enough to detect exact re-use across
    submissions without persisting the underlying PII.
    """

    __tablename__ = "identity_records"

    id = Column(String, primary_key=True, index=True)  # == scan_id, 1:1 with FraudScan
    full_name = Column(String, nullable=True)
    name_key = Column(String, index=True, nullable=True)  # phonetic blocking key
    email = Column(String, nullable=True)
    email_local_key = Column(String, index=True, nullable=True)  # normalized local-part blocking key
    email_domain = Column(String, index=True, nullable=True)
    phone = Column(String, nullable=True)
    phone_key = Column(String, index=True, nullable=True)  # last-7-digits blocking key
    date_of_birth = Column(String, nullable=True)  # YYYY-MM-DD
    bank_account_last4 = Column(String, nullable=True)
    device_fingerprint_hash = Column(String, index=True, nullable=True)
    ip_hash = Column(String, index=True, nullable=True)
    resume_embedding = Column(JSON, nullable=True)  # list[float] (truncated precision)
    resume_text_len = Column(Integer, nullable=True)
    cluster_id = Column(String, index=True, nullable=True)  # identity-graph cluster this record belongs to
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    picture = Column(String)
    login_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login_at = Column(DateTime(timezone=True), server_default=func.now())

class CallRecord(Base):
    __tablename__ = "call_records"

    id = Column(String, primary_key=True, index=True)
    call_sid = Column(String, unique=True, index=True, nullable=True)
    to_number = Column(String)
    candidate_name = Column(String)
    role_title = Column(String)
    status = Column(String, default="queued")  # queued -> ringing/in-progress -> completed/no-answer/busy/failed
    transcript = Column(JSON, default=list)  # [{"role": "agent"|"candidate", "text": str}, ...]
    duration_sec = Column(Integer, nullable=True)
    error_message = Column(String, nullable=True)
    communication_score = Column(Integer, nullable=True)
    relevance_score = Column(Integer, nullable=True)
    confidence_score = Column(Integer, nullable=True)
    evaluation_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ScreeningSession(Base):
    __tablename__ = "screening_sessions"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    role_title = Column(String, nullable=False)
    jd_text = Column(Text, nullable=True)
    status = Column(String, default="invited")  # invited -> opened -> in_progress -> completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Rule(Base):
    __tablename__ = "rules"

    id = Column(String, primary_key=True, index=True)
    canonical_rule = Column(String)
    actor = Column(String)
    action = Column(String)
    condition = Column(String)
    type = Column(String, index=True) # RULE, GUIDELINE, OBLIGATION, etc.
    confidence = Column(Float)
    document_id = Column(String, ForeignKey("documents.id"))
    page = Column(Integer)
    section = Column(String)
    metadata_ = Column("metadata", JSON, default={})

    document = relationship("Document", back_populates="rules")
