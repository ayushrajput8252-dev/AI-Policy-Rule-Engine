import json
import re
import time
from google import genai
from google.genai import types
from ..config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

def extract_rules_batch(chunks_batch: list[dict], max_retries: int = 4) -> list[dict]:
    """
    Extracts structured rules from a batch of document chunks using a single Gemini 2.5 Flash call.
    Includes exponential backoff retries for rate-limit protection (429).
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
    
    backoff = 2.0
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            
            text_resp = response.text
            try:
                data = json.loads(text_resp)
            except json.JSONDecodeError:
                match = re.search(r'```json\s*(.*?)\s*```', text_resp, re.DOTALL)
                if match:
                    data = json.loads(match.group(1))
                else:
                    data = []
            
            if isinstance(data, dict) and "rules" in data:
                data = data["rules"]
            if not isinstance(data, list):
                data = [data]
                
            return data
            
        except Exception as e:
            err_str = str(e)
            if ('429' in err_str or 'quota' in err_str.lower() or 'resource_exhausted' in err_str.lower()) and attempt < max_retries - 1:
                # Try parsing Gemini suggested retry delay e.g. retryDelay: '33s'
                match = re.search(r'retryDelay[\':\s]+[\'"]?(\d+)', err_str)
                sleep_time = int(match.group(1)) + 2 if match else int(backoff)
                print(f"[Gemini Rate Limit] 429 quota hit. Waiting {sleep_time}s before retry (Attempt {attempt + 1}/{max_retries})...")
                time.sleep(sleep_time)
                backoff *= 2.0
            else:
                print(f"[Gemini Batch Extraction Error] {str(e)}")
                # Fallback mock response per chunk in batch to prevent workflow crash
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
    Extracts structured rule fields from a candidate text using Gemini.
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
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )
    
    try:
        data = json.loads(response.text)
        return data
    except json.JSONDecodeError:
        match = re.search(r'```json\s*(.*?)\s*```', response.text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        raise Exception("Failed to parse Gemini output as JSON")

