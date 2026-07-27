import json
import re
import urllib.request
import urllib.error
from google import genai
from google.genai import types
from ..config import settings

# Initialize Gemini Client
gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None

def _call_grok_groq_api(prompt: str, system_instruction: str = None) -> str:
    """
    Attempts calling primary Grok / Groq OpenAI-compatible API endpoint.
    Supports both Groq (gsk_...) and xAI Grok (xai-...).
    """
    api_key = settings.GROK_API_KEY or settings.GROQ_API_KEY
    if not api_key:
        raise ValueError("No Grok/Groq API key found in configuration.")

    # Determine endpoint and model based on API key prefix
    if api_key.startswith("xai-"):
        base_url = "https://api.x.ai/v1/chat/completions"
        model = "grok-2-latest"
    else:
        base_url = "https://api.groq.com/openai/v1/chat/completions"
        model = "llama-3.3-70b-versatile"

    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
        "response_format": {"type": "json_object"}
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "AI-Policy-Rule-Engine/1.0"
    }

    req = urllib.request.Request(
        base_url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=30) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))
        return res_data["choices"][0]["message"]["content"]

def _call_gemini_api(prompt: str, system_instruction: str = None) -> str:
    """
    Calls fallback Gemini API (tries gemini-flash-latest, gemini-2.5-flash, gemini-2.0-flash).
    """
    if not gemini_client:
        raise ValueError("Gemini API key not configured.")

    full_prompt = prompt
    if system_instruction:
        full_prompt = f"{system_instruction}\n\n{prompt}"

    for model_name in ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"]:
        try:
            response = gemini_client.models.generate_content(
                model=model_name,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            if response and response.text:
                return response.text
        except Exception as e:
            print(f"[Gemini Model {model_name} Warning]: {e}")
            
    raise ValueError("All Gemini model attempts failed.")

def generate_json(prompt: str, system_instruction: str = None) -> dict | list:
    """
    Executes JSON generation with Grok/Groq as primary and Gemini 2.5 Flash as automatic fallback.
    """
    # 1. Try Primary (Grok / Groq)
    try:
        raw_output = _call_grok_groq_api(prompt, system_instruction)
        return _parse_json(raw_output)
    except Exception as grok_err:
        print(f"[Primary LLM (Grok/Groq) Error/Fallback Triggered]: {str(grok_err)}")

    # 2. Fallback to Gemini 2.5 Flash
    try:
        print("[Fallback LLM] Executing request with Gemini 2.5 Flash...")
        raw_output = _call_gemini_api(prompt, system_instruction)
        return _parse_json(raw_output)
    except Exception as gemini_err:
        print(f"[Fallback LLM (Gemini) Error]: {str(gemini_err)}")
        raise Exception(f"Both Primary (Grok/Groq) and Fallback (Gemini) LLM calls failed: {str(gemini_err)}")

def _parse_json(text: str) -> dict | list:
    """
    Safely parses JSON output from LLM responses.
    """
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        # Try finding array or object bounds
        obj_match = re.search(r'(\{.*\}|\[.*\])', text, re.DOTALL)
        if obj_match:
            return json.loads(obj_match.group(1))
        raise Exception("Could not parse valid JSON from LLM response.")
