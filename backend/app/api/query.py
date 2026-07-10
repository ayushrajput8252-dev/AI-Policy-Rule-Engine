import hashlib
import json
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from ..services.retrieval import retrieve_rules
from ..services.reasoning import generate_answer
from ..redis_client import redis_client

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    top_k: int = 5
    document_id: str | None = None
    session_id: str = "default_session"

@router.post("/query")
async def process_query(request: QueryRequest):
    try:
        # Rate Limiting
        rate_key = f"rate_limit:{request.session_id}"
        req_count = redis_client.incr(rate_key)
        if req_count == 1:
            redis_client.expire(rate_key, 60)
        
        if req_count > 3:
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Maximum 3 questions per minute.")
            
        # Response Caching
        doc_id_str = request.document_id if request.document_id else "all"
        cache_key_raw = f"{request.query}:{doc_id_str}:{request.session_id}"
        cache_hash = hashlib.sha256(cache_key_raw.encode()).hexdigest()
        cache_key = f"cache:{cache_hash}"
        
        cached_response = redis_client.get(cache_key)
        if cached_response:
            return json.loads(cached_response)

        # 1. Vector Retrieval
        retrieved_rules = retrieve_rules(request.query, request.top_k, request.document_id)
        
        if not retrieved_rules:
            return {
                "answer": "I don't have any policy rules that match your query.",
                "sources": []
            }
            
        # 2. Reasoning Layer with Chat Memory
        answer_data = generate_answer(request.query, retrieved_rules, request.session_id)
        
        # Save to cache for 1 hour
        redis_client.setex(cache_key, 3600, json.dumps(answer_data))
        
        return answer_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
