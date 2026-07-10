import json
import re
import time
from google import genai
from google.genai import types
from groq import Groq
from ..config import settings

gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
groq_client = Groq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None

def extract_rule(text: str, rule_type: str) -> dict:
    """
    Extracts structured rule fields from a candidate text using Groq with Gemini fallback.
    """
    prompt = f"""
    You are an AI Document Intelligence Assistant. You are extracting business rules, policies, or operational constraints from a document.
    The text is classified as: {rule_type}.
    
    Text: "{text}"
    
    IMPORTANT: Do NOT extract copyright notices, legal disclaimers, trademark information, or boilerplate publication details as rules.
    If the text only contains such boilerplate, set "is_business_rule" to false.
    Otherwise, extract the most important policy, constraint, or business rule.
    
    Return a JSON object with the following schema:
    {{
      "is_business_rule": true,
      "key_finding": "The main policy, rule, or constraint (string)",
      "actor": "Who does this rule apply to? If general, write 'All' (string)",
      "condition": "When does this rule apply? If none, leave empty (string)",
      "action": "What must or must not be done? (string)",
      "exception": "Are there any exceptions? If none, leave empty (string)",
      "penalty": "What happens if violated? If none, leave empty (string)",
      "context": "Any other supporting context (string)",
      "type": "The type of statement (string)",
      "confidence": "Extraction confidence score from 0 to 100 (integer)"
    }}
    
    Return ONLY valid JSON format without markdown blocks like ```json.
    """
    
    max_retries = 3
    base_wait = 2
    
    # Try Groq First
    if groq_client:
        for attempt in range(max_retries):
            try:
                chat_completion = groq_client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model="llama-3.1-70b-versatile",
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
                content = chat_completion.choices[0].message.content
                return json.loads(content)
            except Exception as e:
                err_str = str(e).lower()
                if ('429' in err_str or 'rate' in err_str) and attempt < max_retries - 1:
                    print(f"Groq rate limit. Retrying in {base_wait}s...")
                    time.sleep(base_wait)
                    base_wait *= 2
                else:
                    print(f"Groq extraction failed, falling back to Gemini: {str(e)}")
                    break
                    
    # Fallback to Gemini
    print("Executing Gemini fallback for rule extraction")
    for attempt in range(max_retries):
        try:
            response = gemini_client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            
            try:
                return json.loads(response.text)
            except json.JSONDecodeError:
                match = re.search(r'```json\s*(.*?)\s*```', response.text, re.DOTALL)
                if match:
                    return json.loads(match.group(1))
                raise Exception("Failed to parse Gemini output as JSON")
        except Exception as e:
            if ('429' in str(e) or 'quota' in str(e).lower()) and attempt < max_retries - 1:
                wait_time = base_wait * (2 ** attempt)
                print(f"Gemini rate limited. Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                if attempt == max_retries - 1:
                    raise e

