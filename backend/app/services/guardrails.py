"""
Regex-only input/output guardrails — deliberately NOT an extra LLM
moderation call, since that would add a full round-trip of latency to every
single request. Precompiled patterns matched against prompt-sized text cost
low-single-digit microseconds, so this adds no measurable latency to the
happy path.

Used by api/query.py (chat), api/interview.py (screening turns), and
api/telephonic.py (call turns) on both the free-text input a user/candidate
sends and the text the LLM generates in response.
"""
import re
from dataclasses import dataclass, field

MAX_INPUT_CHARS = 4000

# Control characters (except \n, \r, \t) have no legitimate reason to appear
# in a chat query and are a classic smuggling vector for prompt-injection
# payloads that try to hide instructions from a human reviewing logs.
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

# A deliberately small, high-precision blocklist of jailbreak/prompt-injection
# phrasing — false positives on a legitimate business question are worse than
# missing an exotic injection attempt, so these are specific phrases, not
# broad single-word triggers.
_INJECTION_PATTERNS = [
    re.compile(p, re.IGNORECASE) for p in [
        r"ignore (all|any|the|previous|prior|above) (instructions|prompts?|rules)",
        r"disregard (all|any|the|previous|prior|above) (instructions|prompts?|rules)",
        r"reveal (your|the) (system|hidden) prompt",
        r"you are now (DAN|in developer mode|unrestricted)",
        r"pretend (you have no|there are no) (restrictions|rules|guidelines)",
        r"forget (all|your) (previous|prior) instructions",
        r"act as (an? )?(unfiltered|unrestricted|jailbroken)",
    ]
]

# Secret/credential-shaped substrings that should never appear in an LLM
# output for this platform — defense in depth in case a document or web
# result the model was grounded in happened to contain one.
_SECRET_PATTERNS = {
    "openai_key": re.compile(r"sk-[A-Za-z0-9]{20,}"),
    "groq_key": re.compile(r"gsk_[A-Za-z0-9]{20,}"),
    "google_key": re.compile(r"AIza[0-9A-Za-z_\-]{35}"),
    "generic_bearer": re.compile(r"Bearer\s+[A-Za-z0-9\-_.]{20,}"),
}
_CREDIT_CARD_RE = re.compile(r"\b(?:\d[ -]?){13,16}\b")
_SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")


@dataclass
class GuardrailResult:
    allowed: bool
    text: str
    reason: str | None = None
    redactions: list[str] = field(default_factory=list)


def check_input(text: str) -> GuardrailResult:
    """
    Validates/sanitizes free-text user input before it reaches an LLM prompt.
    Never raises — a malformed/malicious input just comes back not-allowed.
    """
    if not text or not text.strip():
        return GuardrailResult(allowed=False, text="", reason="empty_input")

    cleaned = _CONTROL_CHARS_RE.sub("", text)

    if len(cleaned) > MAX_INPUT_CHARS:
        cleaned = cleaned[:MAX_INPUT_CHARS]

    for pattern in _INJECTION_PATTERNS:
        if pattern.search(cleaned):
            return GuardrailResult(allowed=False, text=cleaned, reason="prompt_injection_pattern")

    return GuardrailResult(allowed=True, text=cleaned)


def check_output(text: str) -> GuardrailResult:
    """
    Redacts anything that looks like a leaked secret/credential/PII pattern
    from LLM-generated text before it's returned to the client. Always
    "allowed" (this redacts rather than blocks — an over-eager block on a
    false-positive credit-card-shaped number would be worse than a redaction
    that turns out to be unnecessary).
    """
    if not text:
        return GuardrailResult(allowed=True, text=text or "")

    redactions: list[str] = []
    redacted = text

    for label, pattern in _SECRET_PATTERNS.items():
        if pattern.search(redacted):
            redacted = pattern.sub("[REDACTED]", redacted)
            redactions.append(label)

    if _CREDIT_CARD_RE.search(redacted):
        redacted = _CREDIT_CARD_RE.sub("[REDACTED-CARD]", redacted)
        redactions.append("credit_card")

    if _SSN_RE.search(redacted):
        redacted = _SSN_RE.sub("[REDACTED-SSN]", redacted)
        redactions.append("ssn")

    return GuardrailResult(allowed=True, text=redacted, redactions=redactions)
