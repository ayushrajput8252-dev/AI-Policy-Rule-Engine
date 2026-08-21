import json
import re
import urllib.request
import urllib.error
from google import genai
from google.genai import types
from ..config import settings
from .resilience import call_with_resilience, retry_with_backoff, CircuitOpenError

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
        # llama-3.3-70b-versatile was removed from Groq's catalog entirely
        # (404 model_not_found, confirmed live) — gpt-oss-120b is the current
        # equivalent-tier general-purpose model for JSON-mode completions.
        model = "openai/gpt-oss-120b"

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
    Calls fallback Gemini API (tries gemini-flash-latest, gemini-2.5-flash, gemini-3.6-flash).
    """
    if not gemini_client:
        raise ValueError("Gemini API key not configured.")

    full_prompt = prompt
    if system_instruction:
        full_prompt = f"{system_instruction}\n\n{prompt}"

    # gemini-2.0-flash returns 404 (Google retired it, docs point to
    # gemini-3.6-flash as the replacement) — confirmed live.
    for model_name in ["gemini-flash-latest", "gemini-2.5-flash", "gemini-3.6-flash"]:
        try:
            response = gemini_client.models.generate_content(
                model=model_name,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    # Match the Groq/Grok primary path's temperature so scoring
                    # is comparably deterministic whichever provider actually
                    # serves the request (Gemini is a silent fallback).
                    temperature=0.2,
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
    Each provider leg is protected by its own circuit breaker + exponential
    backoff (services/resilience.py) so a provider that's currently down gets
    skipped fast (no per-request timeout tax) instead of retried into the
    ground on every single call.
    """
    # 1. Try Primary (Grok / Groq) — breaker opens after 5 consecutive
    # failures so a dead key/outage stops being retried for 30s at a time.
    try:
        raw_output = call_with_resilience(
            "groq_grok", _call_grok_groq_api, prompt, system_instruction,
            max_attempts=2, base_delay=0.3, max_delay=2.0,
        )
        return _parse_json(raw_output)
    except CircuitOpenError as grok_open:
        print(f"[Primary LLM (Grok/Groq) Circuit Open]: {grok_open}")
    except Exception as grok_err:
        print(f"[Primary LLM (Grok/Groq) Error/Fallback Triggered]: {str(grok_err)}")

    # 2. Fallback to Gemini 2.5 Flash — _call_gemini_api already tries 3
    # model variants internally, so this leg just needs the breaker (skip
    # entirely while Gemini itself is down) without an extra retry loop on
    # top of that.
    try:
        print("[Fallback LLM] Executing request with Gemini 2.5 Flash...")
        raw_output = call_with_resilience(
            "gemini", _call_gemini_api, prompt, system_instruction,
            max_attempts=1,
        )
        return _parse_json(raw_output)
    except CircuitOpenError as gemini_open:
        print(f"[Fallback LLM (Gemini) Circuit Open]: {gemini_open}")
        raise Exception(f"Both Primary (Grok/Groq) and Fallback (Gemini) LLM calls are currently unavailable: {gemini_open}")
    except Exception as gemini_err:
        print(f"[Fallback LLM (Gemini) Error]: {str(gemini_err)}")
        raise Exception(f"Both Primary (Grok/Groq) and Fallback (Gemini) LLM calls failed: {str(gemini_err)}")

def generate_json_resilient(prompt: str, system_instruction: str = None, max_attempts: int = 2) -> dict | list:
    """
    Thin retry wrapper around generate_json() for callers that have their own
    deterministic fallback (a regex/heuristic result) if the LLM is
    unavailable entirely — hiring_service, interview_service,
    telephonic_service, fraud_reasoning. generate_json() itself already
    breaker-protects each provider leg, so a second attempt here is cheap
    (an open breaker fails instantly, no added latency) and only helps with
    one-off hiccups like a malformed JSON parse, reducing how often those
    callers have to fall back to their degraded heuristic path.
    """
    return retry_with_backoff(
        generate_json, prompt, system_instruction,
        max_attempts=max_attempts, base_delay=0.3, max_delay=2.0,
    )


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
