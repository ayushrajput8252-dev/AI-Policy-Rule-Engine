import re
from collections import Counter

# Indian PAN format: AAAAA9999A — 5 letters, 4 digits, 1 letter. No official
# checksum digit exists (unlike Aadhaar's Verhoeff check), so authenticity is
# judged on format + structural rules that a fabricated/typo'd number tends to
# violate, plus cross-occurrence consistency within the same document.
PAN_PATTERN = re.compile(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b")

# The 4th character of a real PAN encodes the holder category — UIDAI/ITD
# never issue a PAN outside this set, so a 4th character outside it is a
# strong sign of a fabricated or badly-OCR'd number rather than a real one.
VALID_4TH_CHAR = set("ABCFGHLJPT")


def _extract_candidates(text: str) -> list[str]:
    # PAN is always printed uppercase; OCR sometimes lowercases it or drops
    # spacing, so uppercase the text first but don't touch spacing (a PAN with
    # embedded whitespace from OCR line-wrapping isn't recoverable here and is
    # better left undetected than guessed).
    return PAN_PATTERN.findall(text.upper())


def check_pan(text: str) -> dict:
    if not text or not text.strip():
        return {
            "key": "pan",
            "title": "PAN Card Validation",
            "status": "na",
            "score": None,
            "summary": "No extracted text available to check.",
            "details": {},
        }

    candidates = _extract_candidates(text)
    if not candidates:
        return {
            "key": "pan",
            "title": "PAN Card Validation",
            "status": "na",
            "score": None,
            "summary": "No PAN-format identifier (5 letters + 4 digits + 1 letter) detected in the document.",
            "details": {},
        }

    counts = Counter(candidates)
    distinct = list(counts.keys())
    invalid_holder_type = [p for p in distinct if p[3] not in VALID_4TH_CHAR]

    issues: list[str] = []
    if len(distinct) > 1:
        issues.append(f"{len(distinct)} different PAN numbers found in the same document ({', '.join(distinct)}).")
    if invalid_holder_type:
        issues.append(
            f"{'PAN' if len(invalid_holder_type) == 1 else 'PANs'} with an invalid 4th-character holder-type code: "
            f"{', '.join(invalid_holder_type)} (must be one of {''.join(sorted(VALID_4TH_CHAR))})."
        )

    if invalid_holder_type:
        status, score = "fail", 25
        summary = "PAN number(s) fail structural validation: " + " ".join(issues)
    elif len(distinct) > 1:
        status, score = "fail", 35
        summary = "Multiple inconsistent PAN numbers appear in the same document: " + " ".join(issues)
    else:
        status, score = "pass", 92
        summary = f"PAN {distinct[0]} is format-valid (5 letters + 4 digits + 1 letter) with a recognized holder-type code."

    return {
        "key": "pan",
        "title": "PAN Card Validation",
        "status": status,
        "score": score,
        "summary": summary,
        "details": {"candidates": distinct, "occurrences": dict(counts), "issues": issues},
    }
