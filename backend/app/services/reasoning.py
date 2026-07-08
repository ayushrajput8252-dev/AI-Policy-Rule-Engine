import json
import re
from google import genai
from google.genai import types
from ..config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

def generate_answer(query: str, retrieved_rules: list[dict]) -> dict:
    """
    Uses Gemini to reason over the retrieved rules and answer the user query.
    Never sends the entire document, only top-K validated rules.
    """
    
    rules_context = "\n".join([
        f"- Rule ID: {r['rule_id']}\n"
        f"  Type: {r['metadata'].get('type', 'Unknown')}\n"
        f"  Rule: {r['metadata'].get('canonical_rule', '')}\n"
        f"  Source: Doc {r['metadata'].get('document_id', '')}, Page {r['metadata'].get('page', '')}, Section {r['metadata'].get('section', '')}"
        for r in retrieved_rules
    ])
    
    prompt = f"""
    You are an AI Document Intelligence Engine. Answer the user's question using the provided context. 
    If the provided context does not fully contain the answer, you may supplement it with your general knowledge, but prioritize the context.

    User Question: "{query}"
    
    Retrieved Rules Context:
    {rules_context}
    
    Return a JSON object with the following schema:
    {{
      "answer": "Your comprehensive answer based on the rules (string)"
    }}
    
    Return ONLY valid JSON.
    """
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )
    
    try:
        data = json.loads(response.text)
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
        return data
    except json.JSONDecodeError:
        # Fallback if it returns markdown json
        match = re.search(r'```json\s*(.*?)\s*```', response.text, re.DOTALL)
        if match:
            data = json.loads(match.group(1))
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
            return data
        raise Exception("Failed to parse Gemini reasoning output as JSON")
