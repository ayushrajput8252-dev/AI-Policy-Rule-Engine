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

def store_chunks_batch_in_pinecone(chunks: list[dict]):
    """
    Indexes raw document chunks into Pinecone so Normal Chunk RAG can query 100% of document content.
    """
    if not chunks:
        return
    try:
        index = get_pinecone_index()
        model = get_embedding_model()
        
        vectors = []
        for c in chunks:
            content = c.get("content", "").strip()
            if not content:
                continue
            chunk_id = c.get("chunk_id")
            doc_id = c.get("document_id")
            page = c.get("page", 1)
            section = c.get("section", "")
            
            vector = model.encode(content).tolist()
            metadata = {
                "vector_type": "chunk",
                "chunk_id": chunk_id,
                "document_id": doc_id,
                "page": page,
                "section": section,
                "content": content[:1000]  # Store content preview in metadata
            }
            if c.get("is_audio"):
                metadata["is_audio"] = True
                metadata["timestamp_str"] = c.get("timestamp_str", "")
                if c.get("start_time") is not None:
                    metadata["start_time"] = float(c.get("start_time"))
                if c.get("end_time") is not None:
                    metadata["end_time"] = float(c.get("end_time"))

            if c.get("bbox") and c.get("page_dim"):
                import json
                metadata["bbox"] = json.dumps(c.get("bbox"))
                metadata["page_dim"] = json.dumps(c.get("page_dim"))
                
            vectors.append({"id": f"chunk_{chunk_id}", "values": vector, "metadata": metadata})
            
        if vectors:
            index.upsert(vectors=vectors)
            print(f"[Pinecone Indexer]: Indexed {len(vectors)} raw chunks into Pinecone.")
    except Exception as e:
        print(f"Warning: Failed to store chunks in Pinecone: {str(e)}")

def canonicalize_and_store_rule(document_id: str, page: int, section: str, rule_data: dict, db_session, bbox: list = None, page_dim: list = None) -> dict:
    """
    Normalizes a rule using embeddings and stores it in Pinecone + SQLite.
    """
    canonical_rule = rule_data.get("key_finding", "")
    
    rule_id = str(uuid.uuid4())
    
    # Store in SQLite
    db_rule = Rule(
        id=rule_id,
        canonical_rule=canonical_rule,
        actor=rule_data.get("actor", "N/A"),
        action=rule_data.get("action", "N/A"),
        condition=rule_data.get("context", ""),
        type=rule_data.get("type", ""),
        confidence=rule_data.get("confidence", 0),
        document_id=document_id,
        page=page,
        section=section,
        metadata_={"bbox": bbox, "page_dim": page_dim} if bbox and page_dim else {}
    )
    db_session.add(db_rule)
    db_session.commit()
    
    # Store in Pinecone
    try:
        index = get_pinecone_index()
        model = get_embedding_model()
        
        # Embed the full rule context for semantic search
        text_to_embed = f"Finding: {canonical_rule}. Context: {db_rule.condition}."
        vector = model.encode(text_to_embed).tolist()
        
        metadata = {
            "vector_type": "rule",
            "rule_id": rule_id,
            "canonical_rule": canonical_rule,
            "type": db_rule.type,
            "page": page,
            "section": section,
            "document_id": document_id
        }
        
        if bbox and page_dim:
            import json
            metadata["bbox"] = json.dumps(bbox)
            metadata["page_dim"] = json.dumps(page_dim)
            
        index.upsert(vectors=[{"id": f"rule_{rule_id}", "values": vector, "metadata": metadata}])
        
    except Exception as e:
        print(f"Warning: Failed to store rule in Pinecone: {str(e)}")
        
    return {"rule_id": rule_id, "canonical_rule": canonical_rule}
