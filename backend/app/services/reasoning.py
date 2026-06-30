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
    You are an AI Policy Intelligence Reasoning Engine. Answer the user's question based ONLY on the provided validated rules.
    If the provided rules do not contain the answer, say so. Do not hallucinate.

    User Question: "{query}"
    
    Retrieved Rules Context:
    {rules_context}
    
    Return a JSON object with the following schema:
    {{
      "answer": "Your comprehensive answer based on the rules (string)",
      "supporting_rules": ["List of Rule IDs used to formulate the answer (array of strings)"],
      "confidence": "Your confidence score in the answer from 0 to 100 (integer)",
      "sources": [
         {{
             "document_id": "string",
             "page": "integer",
             "section": "string"
         }}
      ]
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
        raise Exception("Failed to parse Gemini reasoning output as JSON")
