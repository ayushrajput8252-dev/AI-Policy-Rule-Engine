import re

# UIDAI issues every Aadhaar number with a trailing Verhoeff checksum digit
# (ISO/IEC 7064 Verhoeff scheme) — a random 12-digit string will fail this
# check with ~90% probability, making it a genuinely strong authenticity
# signal rather than a cosmetic format check.
_D_TABLE = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
_P_TABLE = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]


def _verhoeff_valid(number: str) -> bool:
    c = 0
    for i, digit in enumerate(reversed(number)):
        c = _D_TABLE[c][_P_TABLE[i % 8][int(digit)]]
    return c == 0


# A real Aadhaar number never starts with 0 or 1 (UIDAI allocation rule).
FULL_PATTERN = re.compile(r"\b([2-9]\d{3})[\s-]?(\d{4})[\s-]?(\d{4})\b")
# Common masked-display forms: "XXXX XXXX 1234" / "xxxxxxxx1234" / "****1234".
MASKED_PATTERN = re.compile(r"\b([xX*]{4})[\s-]?([xX*]{4})[\s-]?(\d{4})\b")


def check_aadhaar(text: str) -> dict:
    if not text or not text.strip():
        return {
            "key": "aadhaar",
            "title": "Aadhaar Card Validation",
            "status": "na",
            "score": None,
            "summary": "No extracted text available to check.",
            "details": {},
        }

    full_matches = ["".join(m) for m in FULL_PATTERN.findall(text)]
    # A full match can also be a false positive off some unrelated 12-digit
    # run (e.g. a phone/PO box concatenation) — Verhoeff is exactly what
    # separates a real Aadhaar-shaped number from an incidental digit run.
    full_matches = list(dict.fromkeys(full_matches))  # de-dupe, keep order

    if full_matches:
        results = {num: _verhoeff_valid(num) for num in full_matches}
        valid = [n for n, ok in results.items() if ok]
        invalid = [n for n, ok in results.items() if not ok]
        masked_display = [f"{n[:4]} {n[4:8]} {n[8:]}" for n in full_matches]

        if invalid and not valid:
            status, score = "fail", 15
            summary = (
                f"{'A' if len(invalid) == 1 else len(invalid)} unmasked 12-digit number(s) formatted like an Aadhaar ID "
                f"fail the official Verhoeff checksum UIDAI uses — consistent with a fabricated or mistyped number, not a real one."
            )
        elif invalid:
            status, score = "warn", 55
            summary = f"{len(valid)} Aadhaar-shaped number(s) pass the Verhoeff checksum, but {len(invalid)} do not — mixed signal, worth a manual look."
        else:
            status, score = "pass", 90
            summary = (
                f"{'Aadhaar number' if len(valid) == 1 else f'{len(valid)} Aadhaar numbers'} passes the UIDAI Verhoeff checksum. "
                "Note: the full number appears unmasked in the document — UIDAI guidance recommends displaying only the last 4 digits."
            )

        return {
            "key": "aadhaar",
            "title": "Aadhaar Card Validation",
            "status": status,
            "score": score,
            "summary": summary,
            "details": {"numbers_checked": masked_display, "checksum_valid": {f"{n[:4]} {n[4:8]} {n[8:]}": ok for n, ok in results.items()}},
        }

    masked_matches = MASKED_PATTERN.findall(text)
    if masked_matches:
        return {
            "key": "aadhaar",
            "title": "Aadhaar Card Validation",
            "status": "warn",
            "score": 60,
            "summary": f"Found {len(masked_matches)} masked Aadhaar-style number(s) (e.g. \"XXXX XXXX {masked_matches[0][2]}\") — format is consistent with a masked Aadhaar, but the checksum can't be verified from a masked number.",
            "details": {"masked_last4": [m[2] for m in masked_matches]},
        }

    return {
        "key": "aadhaar",
        "title": "Aadhaar Card Validation",
        "status": "na",
        "score": None,
        "summary": "No Aadhaar-format number (12 digits, masked or unmasked) detected in the document.",
        "details": {},
    }
