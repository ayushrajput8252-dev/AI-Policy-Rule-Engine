from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Rule

router = APIRouter()

@router.get("/rules")
async def get_rules(db: Session = Depends(get_db)):
    rules = db.query(Rule).order_by(Rule.id.desc()).limit(50).all()
    
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
