from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Rule, Document, Chunk

router = APIRouter()

@router.get("/rules")
async def get_rules(document_id: str = None, db: Session = Depends(get_db)):
    query = db.query(Rule)
    status = "completed"
    chunk_count = None

    if document_id:
        query = query.filter(Rule.document_id == document_id)
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc and doc.metadata_:
            status = doc.metadata_.get("status", "completed")
        # Real chunk count backing this document (chunks are committed to the
        # DB well before status flips to "completed" — see worker.py's
        # _process_text_blocks / process_document_task audio path), so the
        # frontend's existing status-polling loop can pick up the real number
        # instead of guessing at upload time.
        chunk_count = db.query(Chunk).filter(Chunk.document_id == document_id).count()

    # Sort by page to keep the natural order of the document.
    rules = query.order_by(Rule.page).limit(500).all()    
    results = []
    for rule in rules:
        results.append({
            "id": rule.id,
            "document_id": rule.document_id,
            "canonical_rule": rule.canonical_rule,
            "type": rule.type,
            "confidence": rule.confidence,
            "page": rule.page,
            "section": rule.section,
            "bbox": rule.metadata_.get("bbox") if rule.metadata_ else None,
            "page_dim": rule.metadata_.get("page_dim") if rule.metadata_ else None
        })
        
    return {"rules": results, "status": status, "chunk_count": chunk_count}
