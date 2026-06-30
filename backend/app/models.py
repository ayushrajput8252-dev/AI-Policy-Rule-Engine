from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON, Float
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

    document = relationship("Document", back_populates="rules")
