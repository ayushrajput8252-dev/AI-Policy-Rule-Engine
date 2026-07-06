from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Rule

router = APIRouter()

@router.get("/rules")
async def get_rules(document_id: str = None, db: Session = Depends(get_db)):
    query = db.query(Rule)
    if document_id:
        query = query.filter(Rule.document_id == document_id)
        
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
            "section": rule.section
        })
        
    return {"rules": results}
