import json
import re
from .llm_service import generate_json

def extract_rules_batch(chunks_batch: list[dict], max_retries: int = 4) -> list[dict]:
    """
    Extracts structured rules from a batch of document chunks using Grok (primary) / Gemini (fallback).
    """
    if not chunks_batch:
        return []
        
    formatted_chunks = []
    for idx, c in enumerate(chunks_batch):
        formatted_chunks.append(
            f"--- CHUNK {idx} (ID: {c.get('chunk_id')}, Page: {c.get('page')}, Section: {c.get('section')}) ---\n{c.get('content')}"
        )
    chunks_text = "\n\n".join(formatted_chunks)
    
    prompt = f"""
    You are an AI Document Intelligence Assistant. Evaluate each document chunk below and extract all actionable business rules, compliance requirements, guidelines, obligations, permissions, or prohibitions.

    Chunks to process:
    {chunks_text}

    Return a JSON array where each object corresponds to a detected rule in the format:
    [
      {{
        "chunk_index": 0,
        "is_candidate": true,
        "key_finding": "Exact summary of rule or requirement",
        "actor": "Who must follow this rule (e.g. Employee, Admin, Contractor, User)",
        "action": "Action required, prohibited, or allowed",
        "condition": "Applicable context or condition under which rule applies",
        "type": "OBLIGATION | PROHIBITION | PERMISSION | RECOMMENDATION | GUIDELINE",
        "confidence": 90
      }}
    ]

    Rules guidelines:
    - OBLIGATION: Mandatory requirements ("must", "shall", "required to").
    - PROHIBITION: Forbidden actions ("must not", "prohibited", "never").
    - PERMISSION: Allowed privileges ("may", "allowed to", "permitted").
    - RECOMMENDATION / GUIDELINE: Best practices and standard procedures ("should", "recommended").
    
    Extract every valid policy sentence or rule statement. Skip pure document page numbers or cover page headers.
    Return ONLY valid JSON.
    """
    
    try:
        data = generate_json(prompt)
        if isinstance(data, dict) and "rules" in data:
            data = data["rules"]
        if isinstance(data, dict) and "results" in data:
            data = data["results"]
        if not isinstance(data, list):
            data = [data] if isinstance(data, dict) else []
            
        if data:
            return data
    except Exception as e:
        print(f"[Extraction Error] Fallback to sentence extraction: {str(e)}")
        
    # Robust fallback: extract clean sentences from chunks
    fallback_results = []
    rule_keywords = ["must", "shall", "should", "required", "prohibited", "allowed", "may", "never", "policy", "ensure", "guideline"]
    
    for idx, c in enumerate(chunks_batch):
        content = c.get("content", "").strip()
        if not content:
            continue
            
        sentences = [s.strip() for s in re.split(r'[.\n]+', content) if len(s.strip()) > 15]
        found_rule = False
        
        for s in sentences:
            s_lower = s.lower()
            if any(k in s_lower for k in rule_keywords):
                rule_type = "PROHIBITION" if any(p in s_lower for p in ["prohibited", "must not", "never"]) else (
                    "OBLIGATION" if any(o in s_lower for o in ["must", "shall", "required"]) else "GUIDELINE"
                )
                fallback_results.append({
                    "chunk_index": idx,
                    "is_candidate": True,
                    "key_finding": s,
                    "actor": "Applicable Subject",
                    "action": "Policy Compliance",
                    "condition": c.get("section", "General Section"),
                    "type": rule_type,
                    "confidence": 85
                })
                found_rule = True
                
        if not found_rule and sentences:
            # Fall back to first key sentence of chunk
            fallback_results.append({
                "chunk_index": idx,
                "is_candidate": True,
                "key_finding": sentences[0],
                "actor": "Organization Member",
                "action": "Procedural Standard",
                "condition": c.get("section", "General Section"),
                "type": "GUIDELINE",
                "confidence": 80
            })
            
    return fallback_results

def extract_rule(text: str, rule_type: str) -> dict:
    """
    Extracts structured rule fields from a candidate text using Grok (primary) / Gemini (fallback).
    """
    prompt = f"""
    You are an AI Document Intelligence Assistant. Extract the most important insight, rule, or definition from the following text.
    The text is classified as: {rule_type}.
    
    Text: "{text}"
    
    Return a JSON object with the following schema:
    {{
      "key_finding": "The main takeaway, rule, or fact (string)",
      "context": "Any supporting context or conditions (string)",
      "type": "The type of statement (string)",
      "confidence": "Extraction confidence score from 0 to 100 (integer)"
    }}
    
    Return ONLY valid JSON.
    """
    return generate_json(prompt)


