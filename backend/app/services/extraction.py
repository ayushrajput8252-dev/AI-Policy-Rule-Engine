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
    You are an AI Document Intelligence Assistant. Evaluate each document chunk below and extract any actionable business rules, compliance requirements, guidelines, obligations, permissions, or prohibitions.

    Chunks to process:
    {chunks_text}

    Return a JSON array where each object corresponds to a detected rule in the format:
    [
      {{
        "chunk_index": 0,
        "is_candidate": true,
        "key_finding": "Summary of rule or requirement",
        "actor": "Who must follow this rule (e.g. Employee, User, Admin, Contractor)",
        "action": "Action required, prohibited, or allowed",
        "condition": "Applicable context or condition under which rule applies",
        "type": "OBLIGATION | PROHIBITION | PERMISSION | RECOMMENDATION | GUIDELINE",
        "confidence": 85
      }}
    ]

    Only set is_candidate to true if the chunk actually contains a business rule, policy, guideline, or requirement (skip pure titles/headers or page numbers).
    Return ONLY valid JSON.
    """
    
    try:
        data = generate_json(prompt)
        if isinstance(data, dict) and "rules" in data:
            data = data["rules"]
        if not isinstance(data, list):
            data = [data]
        return data
    except Exception as e:
        print(f"[Extraction Error] Fallback to chunk text: {str(e)}")
        fallback_results = []
        for idx, c in enumerate(chunks_batch):
            fallback_results.append({
                "chunk_index": idx,
                "is_candidate": True,
                "key_finding": c.get("content", "").strip()[:200],
                "actor": "General User",
                "action": "Compliance",
                "condition": c.get("section", "General"),
                "type": "GUIDELINE",
                "confidence": 75
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


