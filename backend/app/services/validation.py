import json
import re
from google import genai
from google.genai import types
from ..config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

def validate_rule(source_text: str, extracted_rule: dict) -> dict:
    """
    Validates an extracted rule against the source text using a separate LLM call.
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
        # Fallback if it returns markdown json
        match = re.search(r'```json\s*(.*?)\s*```', response.text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        raise Exception("Failed to parse Gemini output as JSON")
