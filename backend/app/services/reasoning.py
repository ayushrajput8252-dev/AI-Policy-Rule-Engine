import json
import re
from google import genai
from google.genai import types
from groq import Groq
from ..config import settings
from ..redis_client import redis_client

gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
groq_client = Groq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None

def generate_answer(query: str, retrieved_rules: list[dict], session_id: str = "default_session") -> dict:
    """
    Uses Groq (with Gemini fallback) to reason over the retrieved rules and answer the user query.
    Never sends the entire document, only top-K validated rules.
    """
    
    rules_context = "\n".join([
        f"- Rule ID: {r['rule_id']}\n"
        f"  Type: {r.get('metadata', {}).get('type', 'Unknown')}\n"
        f"  Rule: {r.get('metadata', {}).get('canonical_rule', '')}\n"
        f"  Source: Doc {r.get('metadata', {}).get('document_id', '')}, Page {r.get('metadata', {}).get('page', '')}, Section {r.get('metadata', {}).get('section', '')}"
        for r in retrieved_rules
    ])
    
    # Fetch Chat Memory
    chat_memory_key = f"chat_memory:{session_id}"
    history_raw = redis_client.lrange(chat_memory_key, 0, 4) # Last 5 messages
    history_raw.reverse() # Chronological order
    history_context = "\n".join(history_raw) if history_raw else "No previous conversation."
    
    prompt = f"""
    You are an AI Document Intelligence Engine. Answer the user's question using the provided context. 
    If the provided context does not fully contain the answer, you may supplement it with your general knowledge, but prioritize the context.

    Recent Conversation History:
    {history_context}

    User Question: "{query}"
    
    Retrieved Rules Context:
    {rules_context}
    
    Return a JSON object with the following schema:
    {{
      "answer": "Your comprehensive answer based on the rules (string)"
    }}
    
    Return ONLY valid JSON format without markdown blocks like ```json.
    """
    
    data = None
    
    # Try Groq First
    if groq_client:
        try:
            chat_completion = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.1-70b-versatile",
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            content = chat_completion.choices[0].message.content
            data = json.loads(content)
        except Exception as e:
            print(f"Groq reasoning failed, falling back to Gemini: {str(e)}")
            
    # Fallback to Gemini
    if not data:
        print("Executing Gemini fallback for reasoning")
        response = gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        
        try:
            data = json.loads(response.text)
        except json.JSONDecodeError:
            # Fallback if it returns markdown json
            match = re.search(r'```json\s*(.*?)\s*```', response.text, re.DOTALL)
            if match:
                data = json.loads(match.group(1))
                
        if not data:
            raise Exception("Failed to parse Gemini reasoning output as JSON")
            
    # Build sources array manually from retrieved rules to include bbox
    sources = []
    for r in retrieved_rules:
        meta = r.get("metadata", {})
        bbox = meta.get("bbox")
        page_dim = meta.get("page_dim")
        if isinstance(bbox, str):
            try: bbox = json.loads(bbox)
            except: pass
        if isinstance(page_dim, str):
            try: page_dim = json.loads(page_dim)
            except: pass
            
        sources.append({
            "document_id": meta.get("document_id"),
            "page": meta.get("page"),
            "bbox": bbox,
            "page_dim": page_dim
        })
        
    data["sources"] = sources
    
    # Save to memory
    if "answer" in data:
        exchange = f"User: {query}\nAI: {data['answer']}"
        redis_client.lpush(chat_memory_key, exchange)
        redis_client.ltrim(chat_memory_key, 0, 9)
        
    return data

