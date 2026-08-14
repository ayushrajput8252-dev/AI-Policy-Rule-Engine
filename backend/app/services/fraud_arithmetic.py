from datetime import date, datetime, timedelta
from . import llm_service

EXTRACTION_PROMPT = """You are extracting structured fields from a document (likely a salary slip, offer letter, or relieving letter) for a fraud-consistency check.

From the document text below, extract these fields as a single JSON object. Use `null` for any field that is not present in the text — do not guess or invent values.

- "gross": the gross/total salary or earnings amount, as a plain number (no currency symbols/commas), or null.
- "deductions": the total deductions amount, as a plain number, or null.
- "net": the net/take-home salary amount, as a plain number, or null.
- "joining_date": the employee's joining/start date, formatted "YYYY-MM-DD", or null.
- "relieving_date": the employee's relieving/last working date, formatted "YYYY-MM-DD", or null.

CRITICAL: Extract the number EXACTLY as it is written in the text, character for character, even if it looks mathematically wrong (e.g. gross minus deductions doesn't equal the stated net, or a date looks out of order). Detecting that exact kind of inconsistency is the entire point of this extraction — you must transcribe the literal stated value, not a value you think would be more consistent or "correct". Never silently adjust a number to make the arithmetic work out.

Respond with ONLY the JSON object, no extra text.

Document text:
---
{text}
---
"""

MIN_TOLERANCE = 1.0
RELATIVE_TOLERANCE = 0.001  # 0.1% — absorbs independent per-line rounding on larger salary figures

# Dates on these documents are legitimately forward-looking (offer letters state a
# future joining date; relieving letters are often issued during a notice period,
# ahead of the actual last working day) or historical (old payslips re-uploaded
# years later). A bare "<= today" check auto-fails nearly every genuine offer
# letter, so instead we only flag dates that fall outside a generous plausibility
# window rather than requiring them to be in the past.
PLAUSIBLE_PAST = timedelta(days=365 * 10)
PLAUSIBLE_FUTURE = timedelta(days=180)

OCR_RELIABLE_THRESHOLD = 80


def _parse_date(value) -> date | None:
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.strptime(value.strip()[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def _parse_number(value) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).replace(",", "").strip())
    except ValueError:
        return None


def _appears_in_text(value: float, text: str) -> bool:
    """Cross-checks an LLM-extracted number against the raw document text so a
    misread digit doesn't get silently trusted as a real figure. Tries a few
    common formattings (plain, with/without decimals) against comma-stripped
    text."""
    normalized_text = text.replace(",", "")
    is_int = abs(value - round(value)) < 1e-6
    candidates = [str(int(round(value)))] if is_int else [f"{value:.2f}", f"{value:.1f}", str(value)]
    return any(c in normalized_text for c in candidates)


def _plausible_date(d: date, today: date) -> bool:
    return (today - PLAUSIBLE_PAST) <= d <= (today + PLAUSIBLE_FUTURE)


def check_arithmetic(text: str, ocr_confidence: float | None = None) -> dict:
    if not text or not text.strip():
        return {
            "key": "arithmetic",
            "title": "Field Arithmetic & Logic Consistency",
            "status": "na",
            "score": None,
            "summary": "No extracted text available to check.",
            "details": {},
        }

    try:
        fields = llm_service.generate_json(EXTRACTION_PROMPT.format(text=text[:6000]))
    except Exception as e:
        return {
            "key": "arithmetic",
            "title": "Field Arithmetic & Logic Consistency",
            "status": "error",
            "score": None,
            "summary": f"Field extraction failed: {e}",
            "details": {},
        }

    gross = _parse_number(fields.get("gross"))
    deductions = _parse_number(fields.get("deductions"))
    net = _parse_number(fields.get("net"))
    joining = _parse_date(fields.get("joining_date"))
    relieving = _parse_date(fields.get("relieving_date"))
    today = date.today()

    # An LLM re-reading the page can misread a digit in a multi-column salary
    # table. Before trusting any extracted amount as fraud evidence, confirm it
    # actually appears (in some plausible formatting) in the raw extracted text —
    # if it doesn't, the extraction itself is suspect, not the document.
    unverified = [
        name for name, val in (("gross", gross), ("deductions", deductions), ("net", net))
        if val is not None and not _appears_in_text(val, text)
    ]
    if "gross" in unverified:
        gross = None
    if "deductions" in unverified:
        deductions = None
    if "net" in unverified:
        net = None

    checks = []

    if gross is not None and deductions is not None and net is not None:
        tolerance = max(MIN_TOLERANCE, RELATIVE_TOLERANCE * max(abs(gross), abs(net)))
        ok = abs((gross - deductions) - net) <= tolerance
        checks.append({
            "rule": "gross - deductions = net",
            "passed": ok,
            "detail": f"{gross} - {deductions} = {gross - deductions:.2f} vs stated net {net} (tolerance {tolerance:.2f})",
        })

    if joining and relieving:
        ok = joining < relieving
        checks.append({"rule": "joining_date < relieving_date", "passed": ok, "detail": f"{joining} vs {relieving}"})

    if relieving:
        ok = _plausible_date(relieving, today)
        checks.append({"rule": "relieving_date is plausible", "passed": ok, "detail": f"{relieving} vs today {today}"})

    if joining:
        ok = _plausible_date(joining, today)
        checks.append({"rule": "joining_date is plausible", "passed": ok, "detail": f"{joining} vs today {today}"})

    if not checks:
        return {
            "key": "arithmetic",
            "title": "Field Arithmetic & Logic Consistency",
            "status": "na",
            "score": None,
            "summary": (
                "No salary figures or joining/relieving dates found in the document to cross-check."
                if not unverified
                else f"Extracted field(s) {', '.join(unverified)} could not be verified against the document text, so no reliable checks could be run."
            ),
            "details": {"extracted_fields": fields, "unverified_fields": unverified},
        }

    passed = sum(1 for c in checks if c["passed"])
    score = round(100 * passed / len(checks))
    failed = [c for c in checks if not c["passed"]]
    status = "pass" if not failed else ("warn" if score >= 50 else "fail")
    summary = (
        f"All {len(checks)} consistency check(s) passed."
        if not failed
        else f"{len(failed)} of {len(checks)} check(s) failed: {failed[0]['rule']} ({failed[0]['detail']})."
    )

    # OCR'd text can misread a digit (e.g. "3" -> "8"), which would surface here
    # as a false "inconsistency" rather than a real one — so a shaky OCR pass
    # softens a hard fail into a warning instead of destroying the score.
    low_confidence = ocr_confidence is not None and ocr_confidence < OCR_RELIABLE_THRESHOLD
    if failed and low_confidence:
        if status == "fail":
            status = "warn"
            score = max(score, 50)
        summary += f" Note: OCR confidence was only {ocr_confidence:.0f}%, so this could be a misread digit/date rather than a genuine inconsistency."

    return {
        "key": "arithmetic",
        "title": "Field Arithmetic & Logic Consistency",
        "status": status,
        "score": score,
        "summary": summary,
        "details": {"extracted_fields": fields, "checks": checks, "ocr_confidence": ocr_confidence, "unverified_fields": unverified},
    }
