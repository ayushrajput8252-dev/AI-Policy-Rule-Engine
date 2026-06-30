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
    You are an AI Policy Intelligence Assistant. Extract the structured rule from the following text.
    The rule is of type: {rule_type}.
    
    Text: "{text}"
    
    Return a JSON object with the following schema:
    {{
      "actor": "Who the rule applies to (string)",
      "action": "The action being regulated (string)",
      "object": "The object of the action (string)",
      "condition": "Any conditions or context (string)",
      "exception": "Any exceptions (string)",
      "type": "The type of rule (string)",
      "priority": "High, Medium, or Low (string)",
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
