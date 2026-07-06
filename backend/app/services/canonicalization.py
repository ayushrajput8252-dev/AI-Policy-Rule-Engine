import uuid
from pinecone import Pinecone
from .detection import get_embedding_model
from ..config import settings
from ..database import SessionLocal
from ..models import Rule

_pinecone = None
_index = None

def get_pinecone_index():
    global _pinecone, _index
    if _index is None:
        _pinecone = Pinecone(api_key=settings.PINECONE_API_KEY)
        _index = _pinecone.Index(settings.PINECONE_INDEX_NAME)
    return _index

def canonicalize_and_store_rule(document_id: str, page: int, section: str, rule_data: dict, db_session) -> dict:
    """
    Normalizes a rule using embeddings (conceptual clustering).
    For this POC, we will use the raw text as the canonical rule and store it in Pinecone + SQLite.
    A full agglomerative clustering implementation would batch rules and cluster them periodically.
    """
    canonical_rule = rule_data.get("key_finding", "")
    
    rule_id = str(uuid.uuid4())
    
    # Store in SQLite
    db_rule = Rule(
        id=rule_id,
        canonical_rule=canonical_rule,
        actor="N/A",
        action="N/A",
        condition=rule_data.get("context", ""),
        type=rule_data.get("type", ""),
        confidence=rule_data.get("confidence", 0),
        document_id=document_id,
        page=page,
        section=section
    )
    db_session.add(db_rule)
    db_session.commit()
    
    # Store in Pinecone
    try:
        index = get_pinecone_index()
        model = get_embedding_model()
        
        # We embed the full rule context for better semantic search
        text_to_embed = f"Finding: {canonical_rule}. Context: {db_rule.condition}."
        vector = model.encode(text_to_embed).tolist()
        
        metadata = {
            "rule_id": rule_id,
            "canonical_rule": canonical_rule,
            "type": db_rule.type,
            "page": page,
            "section": section,
            "document_id": document_id
        }
        
        index.upsert(vectors=[{"id": rule_id, "values": vector, "metadata": metadata}])
        
    except Exception as e:
        print(f"Warning: Failed to store rule in Pinecone: {str(e)}")
        # We don't rollback SQLite on Pinecone failure for this POC
        
    return {"rule_id": rule_id, "canonical_rule": canonical_rule}
