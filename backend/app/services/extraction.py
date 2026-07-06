import json
import re
from google import genai
from google.genai import types
from ..config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

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
        # Fallback if it returns markdown json
        match = re.search(r'```json\s*(.*?)\s*```', response.text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        raise Exception("Failed to parse Gemini output as JSON")
