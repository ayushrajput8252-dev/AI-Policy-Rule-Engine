import re

# IFSC: 4 bank-code letters + a literal '0' (reserved for future use by RBI)
# + 6 alphanumeric branch-code characters. The reserved 5th-char '0' is the
# part fabricated numbers most often get wrong.
IFSC_PATTERN = re.compile(r"\b([A-Z]{4})(0)([A-Z0-9]{6})\b")
MICR_PATTERN = re.compile(r"\bMICR\D{0,10}(\d{9})\b", re.IGNORECASE)
ACCOUNT_LABEL_PATTERN = re.compile(
    r"(?:a/?c(?:\.|\s|count)?\s*(?:no\.?|number)?|account\s*(?:no\.?|number))\s*[:\-]?\s*(\d{9,18})",
    re.IGNORECASE,
)

BANK_KEYWORDS = ("ifsc", "micr", "account no", "a/c no", "bank name", "branch")


def _is_degenerate_number(num: str) -> bool:
    """Flags account numbers that look typed-to-look-real rather than
    issued — all one repeated digit, or a run of ascending/descending
    consecutive digits — patterns a real core-banking system won't allocate."""
    if len(set(num)) == 1:
        return True
    # Modular step (mod 10), so a wrap like "...789012" (9 -> 0 -> 1 -> 2) is
    # still caught as sequential — that exact wraparound is the single most
    # common fabricated-account-number pattern, not an edge case to miss.
    ascending = all((int(num[i]) + 1) % 10 == int(num[i + 1]) for i in range(len(num) - 1))
    descending = all((int(num[i]) - 1) % 10 == int(num[i + 1]) for i in range(len(num) - 1))
    return ascending or descending


def check_bank_details(text: str) -> dict:
    if not text or not text.strip():
        return {
            "key": "bank_document",
            "title": "Bank Details Validation",
            "status": "na",
            "score": None,
            "summary": "No extracted text available to check.",
            "details": {},
        }

    upper = text.upper()
    looks_like_bank_doc = any(kw.upper() in upper for kw in BANK_KEYWORDS)
    ifsc_matches = IFSC_PATTERN.findall(upper)
    account_matches = ACCOUNT_LABEL_PATTERN.findall(text)
    micr_matches = MICR_PATTERN.findall(text)

    if not looks_like_bank_doc and not ifsc_matches and not account_matches:
        return {
            "key": "bank_document",
            "title": "Bank Details Validation",
            "status": "na",
            "score": None,
            "summary": "No bank account details (IFSC, account number, MICR) detected in the document.",
            "details": {},
        }

    issues: list[str] = []

    valid_ifsc = ["".join(m) for m in ifsc_matches]
    # The regex only matches when the 5th char is literally '0', so a
    # `[A-Z]{4}[^0][A-Z0-9]{5}` run near "IFSC" that fails to match is itself
    # the fail signal — look for an IFSC-labeled value that didn't match.
    ifsc_label_present = "IFSC" in upper
    if ifsc_label_present and not valid_ifsc:
        issues.append("An IFSC code is referenced but no value matching the real format (4 letters + '0' + 6 alphanumeric) was found nearby.")

    degenerate_accounts = [a for a in account_matches if _is_degenerate_number(a)]
    if degenerate_accounts:
        issues.append(f"Account number(s) look fabricated (repeated/sequential digits): {', '.join(degenerate_accounts)}.")

    distinct_accounts = list(dict.fromkeys(account_matches))
    if len(distinct_accounts) > 1:
        issues.append(f"{len(distinct_accounts)} different account numbers appear in the same document: {', '.join(distinct_accounts)}.")

    if micr_matches and any(len(m) != 9 for m in micr_matches):
        issues.append("MICR code present but not the standard 9 digits.")

    if degenerate_accounts or (ifsc_label_present and not valid_ifsc):
        status, score = "fail", 30
    elif issues:
        status, score = "warn", 55
    elif valid_ifsc or account_matches:
        status, score = "pass", 88
    else:
        status, score = "na", None

    if status == "pass":
        summary = "Bank details are structurally consistent" + (f" (IFSC {valid_ifsc[0]} is format-valid)." if valid_ifsc else ".")
    elif status == "na":
        summary = "Bank-related keywords present but no verifiable IFSC/account/MICR value could be extracted."
    else:
        summary = " ".join(issues) or "Bank detail fields present but failed consistency checks."

    return {
        "key": "bank_document",
        "title": "Bank Details Validation",
        "status": status,
        "score": score,
        "summary": summary,
        "details": {
            "ifsc_codes": list(dict.fromkeys(valid_ifsc)),
            "account_numbers": distinct_accounts,
            "micr_codes": list(dict.fromkeys(micr_matches)),
            "issues": issues,
        },
    }
