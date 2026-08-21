import re
from langdetect import detect_langs, DetectorFactory
from .llm_service import generate_json
from .reasoning import strip_empty_emphasis

# langdetect is unreliable on short, common-phrasing text — it will happily call
# "What company documents are available?" Catalan. Below this confidence, trust
# English over the model's best guess rather than translating a fine English
# answer into the wrong language.
MIN_LANG_CONFIDENCE = 0.85

# Seed DetectorFactory for deterministic language identification
DetectorFactory.seed = 0

# ISO Code to Human-Readable Name mapping
LANGUAGE_MAP = {
    "en": "English",
    "hi": "Hindi (हिंदी)",
    "bn": "Bengali (বাংলা)",
    "gu": "Gujarati (ગુજરાતી)",
    "pa": "Punjabi (ਪੰਜਾਬੀ)",
    "mr": "Marathi (मराठी)",
    "ta": "Tamil (தமிழ்)",
    "te": "Telugu (తెలుగు)",
    "kn": "Kannada (ಕನ್ನಡ)",
    "ml": "Malayalam (മലയാളം)",
    "ur": "Urdu (اردو)",
    "ne": "Nepali (नेपाली)",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "zh-cn": "Chinese (Simplified)",
    "zh-tw": "Chinese (Traditional)",
    "ja": "Japanese",
    "ko": "Korean",
    "ru": "Russian",
    "ar": "Arabic",
    "nl": "Dutch",
    "pl": "Polish",
    "tr": "Turkish",
    "vi": "Vietnamese",
    "th": "Thai",
    "id": "Indonesian",
}

def detect_language(text: str) -> str:
    """
    Detects the ISO 639-1 language code of the input text using langdetect.
    Returns 'en' if text is too short, numeric, detection fails, or the model
    isn't confident enough to justify translating the answer away from English.
    """
    cleaned = text.strip()
    if not cleaned or len(cleaned) < 3 or cleaned.isnumeric():
        return "en"

    try:
        candidates = detect_langs(cleaned)
        if not candidates:
            return "en"
        top = candidates[0]
        lang_code = top.lang.lower()
        if lang_code != "en" and top.prob < MIN_LANG_CONFIDENCE:
            print(f"[Multilingual Service] Low-confidence '{lang_code}' ({top.prob:.2f}) for {cleaned!r} — treating as English")
            return "en"
        return lang_code
    except Exception as e:
        print(f"[Multilingual Service] Language detection fallback to 'en': {e}")
        return "en"

def get_language_name(lang_code: str) -> str:
    """
    Returns human readable language name for an ISO code.
    """
    return LANGUAGE_MAP.get(lang_code.lower(), lang_code.upper())

def translate_to_english(text: str, source_lang: str) -> str:
    """
    Translates a non-English user query into clear, accurate English.
    """
    source_name = get_language_name(source_lang)
    prompt = f"""
    You are an expert Enterprise Multilingual Translator.
    Translate the following user question from {source_name} (ISO: {source_lang}) into natural, concise English suitable for RAG document vector search.

    Original Question ({source_name}): "{text}"

    Return ONLY a JSON object with this exact schema:
    {{
      "translated_text": "The natural English translation"
    }}
    """
    try:
        res = generate_json(prompt)
        if isinstance(res, dict) and "translated_text" in res and res["translated_text"]:
            return res["translated_text"].strip()
    except Exception as e:
        print(f"[Multilingual Service] Translation to English failed: {e}")
    
    return text  # Return original if translation fails

def translate_from_english(text: str, target_lang: str) -> str:
    """
    Translates an English RAG answer back into the target user language.
    """
    target_name = get_language_name(target_lang)
    prompt = f"""
    You are an expert Enterprise Multilingual Translator.
    Translate the following English document answer into {target_name} (ISO: {target_lang}).
    Preserve all numbers, rule citations, formatting, and key terminology accurately.

    English Text:
    "{text}"

    Return ONLY a JSON object with this exact schema:
    {{
      "translated_text": "The full translation in {target_name}"
    }}
    """
    try:
        res = generate_json(prompt)
        if isinstance(res, dict) and "translated_text" in res and res["translated_text"]:
            return strip_empty_emphasis(res["translated_text"].strip())
    except Exception as e:
        print(f"[Multilingual Service] Translation from English failed: {e}")

    return text  # Return original English if translation fails
