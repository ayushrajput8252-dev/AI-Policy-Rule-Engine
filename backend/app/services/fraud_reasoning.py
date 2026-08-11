import json
from . import llm_service

REASONING_PROMPT = """You are a fraud-detection analyst reviewing a document (e.g. a salary slip, offer letter, or relieving letter) that has already been through five automated forensic checks. Your job is to synthesize their findings with the document's own text into a single judgment call.

Not all checks are equally reliable — weight them accordingly:
- HIGH weight (strong, low-noise evidence): Metadata Fingerprint Check, Field Arithmetic & Logic.
- MEDIUM weight: OCR Extraction Quality, Error Level Analysis.
- LOW weight (noisy, prone to false positives on legitimate documents with normal typographic variety — headers, bold text, footnotes, multi-column layouts): Font & Layout Consistency. A "warn" or "fail" on this check ALONE, with every other check passing, is NOT sufficient grounds for "likely_fraudulent" — treat it as at most a mild reason for "needs_review", and only let it meaningfully raise risk_score if at least one other check also flagged something.

Automated check findings (JSON):
{signals}

Document text (may be OCR'd, so expect minor noise):
---
{text}
---

Respond with ONLY a JSON object with these fields:
- "risk_score": integer 0-100, where 0 means no fraud risk at all and 100 means near-certain fraud. Base this on the actual evidence above, weighted as instructed — do not default to a middle value out of caution alone, and do not let the low-weight signal alone drive a high score.
- "verdict": one of "likely_genuine", "needs_review", "likely_fraudulent".
- "explanation": 2-4 sentences explaining the verdict, referencing the specific signals (or lack of them) that drove it.
- "key_concerns": a short JSON array of strings, the specific concerns driving the score (empty array if none).
"""

VALID_VERDICTS = {"likely_genuine", "needs_review", "likely_fraudulent"}


def synthesize(text: str, step_summaries: list[dict]) -> dict:
    signals = [
        {"check": s["title"], "status": s["status"], "score": s.get("score"), "summary": s["summary"]}
        for s in step_summaries
    ]
    prompt = REASONING_PROMPT.format(signals=json.dumps(signals, indent=2), text=(text or "")[:6000])

    try:
        result = llm_service.generate_json(prompt)
        risk_score = max(0, min(100, int(result.get("risk_score", 50))))
        verdict = result.get("verdict") if result.get("verdict") in VALID_VERDICTS else "needs_review"
        explanation = str(result.get("explanation", "")).strip() or "No explanation provided."
        key_concerns = [str(c) for c in result.get("key_concerns", []) if str(c).strip()]
    except Exception as e:
        return {
            "key": "reasoning",
            "title": "AI Reasoning Synthesis",
            "status": "error",
            "score": None,
            "summary": f"AI synthesis failed: {e}",
            "details": {},
            "risk_score": None,
            "verdict": "needs_review",
            "explanation": f"Automated reasoning step failed ({e}); please review the individual check results manually.",
            "key_concerns": [],
        }

    status = {"likely_genuine": "pass", "needs_review": "warn", "likely_fraudulent": "fail"}[verdict]
    return {
        "key": "reasoning",
        "title": "AI Reasoning Synthesis",
        "status": status,
        "score": 100 - risk_score,
        "summary": explanation,
        "details": {"key_concerns": key_concerns},
        "risk_score": risk_score,
        "verdict": verdict,
        "explanation": explanation,
        "key_concerns": key_concerns,
    }
