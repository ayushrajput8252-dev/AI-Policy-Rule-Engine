import json
from .llm_service import generate_json_resilient as generate_json

def validate_rule(source_text: str, extracted_rule: dict) -> dict:
    """
    Validates an extracted rule against the source text using Grok (primary) / Gemini (fallback).
    """
    prompt = f"""
    You are an AI Policy Intelligence Validator. Verify if the extracted rule accurately represents the source text.
    
    Source Text: "{source_text}"
    
    Extracted Rule:
    {json.dumps(extracted_rule, indent=2)}
    
    Return a JSON object with the following schema:
    {{
      "status": "VALID or INVALID",
      "confidence": "Validation confidence score from 0 to 100 (integer)",
      "issues": ["List of any issues found (array of strings)"]
    }}
    
    Return ONLY valid JSON.
    """
    return generate_json(prompt)

