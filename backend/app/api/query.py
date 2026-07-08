from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from ..services.retrieval import retrieve_rules
from ..services.reasoning import generate_answer

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    top_k: int = 5
    document_id: str | None = None

@router.post("/query")
async def process_query(request: QueryRequest):
    try:
        # 1. Vector Retrieval
        retrieved_rules = retrieve_rules(request.query, request.top_k, request.document_id)
        
        if not retrieved_rules:
            return {
                "answer": "I don't have any policy rules that match your query.",
                "sources": []
            }
            
        # 2. Reasoning Layer
        answer_data = generate_answer(request.query, retrieved_rules)
        
        # 3. Augment with raw retrieved rule data if needed, but our Reasoning Layer 
        # already formats the response as required.
        return answer_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
