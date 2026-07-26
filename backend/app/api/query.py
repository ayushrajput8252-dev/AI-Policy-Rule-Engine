from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from ..services.retrieval import retrieve_rules
from ..services.reasoning import generate_answer
from ..services.multilingual import (
    detect_language,
    get_language_name,
    translate_to_english,
    translate_from_english
)

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    top_k: int = 5
    document_id: str | None = None

@router.post("/query")
async def process_query(request: QueryRequest):
    try:
        raw_query = request.query.strip()
        if not raw_query:
            raise HTTPException(status_code=400, detail="Query string cannot be empty.")
            
        # 1. Language Detection via langdetect
        detected_lang = detect_language(raw_query)
        language_name = get_language_name(detected_lang)
        
        search_query = raw_query
        translated_to_english = False
        
        # 2. If non-English, translate query to English for vector search & reasoning
        if detected_lang != "en":
            print(f"[Multilingual Pipeline] Non-English detected ({language_name} - {detected_lang}). Translating to English...")
            search_query = translate_to_english(raw_query, detected_lang)
            translated_to_english = True
            print(f"[Multilingual Pipeline] Translated Query: '{search_query}'")
            
        # 3. Vector Retrieval with English Query
        retrieved_rules = retrieve_rules(search_query, request.top_k, request.document_id)
        
        if not retrieved_rules:
            fallback_answer = "I don't have any policy rules that match your query."
            if detected_lang != "en":
                fallback_answer = translate_from_english(fallback_answer, detected_lang)
            return {
                "answer": fallback_answer,
                "sources": [],
                "detected_language": detected_lang,
                "language_name": language_name,
                "original_query": raw_query if translated_to_english else None,
                "translated_query": search_query if translated_to_english else None
            }
            
        # 4. Reasoning Layer (generates English answer)
        answer_data = generate_answer(search_query, retrieved_rules)
        
        # 5. Translate English answer back into user's language if non-English
        if detected_lang != "en" and answer_data.get("answer"):
            print(f"[Multilingual Pipeline] Translating answer back into {language_name} ({detected_lang})...")
            answer_data["answer"] = translate_from_english(answer_data["answer"], detected_lang)
            
        # 6. Attach Multilingual Metadata
        answer_data["detected_language"] = detected_lang
        answer_data["language_name"] = language_name
        if translated_to_english:
            answer_data["original_query"] = raw_query
            answer_data["translated_query"] = search_query
            
        return answer_data
        
    except Exception as e:
        print(f"[Query API Error]: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
