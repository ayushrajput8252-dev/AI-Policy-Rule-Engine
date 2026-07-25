import json
from .llm_service import generate_json

def generate_answer(query: str, retrieved_rules: list[dict]) -> dict:
    """
    Uses Grok (primary) / Gemini (fallback) to reason over the retrieved rules and answer the user query.
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
    
    data = generate_json(prompt)
    if not isinstance(data, dict):
        data = {"answer": str(data)}
        
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

