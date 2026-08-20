"""
Regex + dictionary-based structured info extraction from raw resume text.
No LLM calls — every field is pulled with heuristics so extraction stays
fast, deterministic, and debuggable.
"""
import re
from datetime import datetime
from typing import List, Optional, Tuple

from app.extraction.skills import get_taxonomy
from app.models import EducationEntry, MatchedSkill, ResumeInfo

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

# Handles: +1 (123) 456-7890 | 123-456-7890 | 123.456.7890 | +91 98765 43210
# | (123) 456 7890 | 1234567890 (10 consecutive digits)
# Requires >=3 digit groups (or a bare 10-13 digit run) so 2-group date
# ranges like "2018 - 2021" never get misread as phone numbers.
PHONE_RE = re.compile(
    r"(?<!\d)(?:"
    r"(?:\+\d{1,3}[\s.-]?)?"
    r"(?:\(\d{2,4}\)[\s.-]?|\d{2,5}[\s.-])"
    r"\d{2,5}[\s.-]?\d{2,5}"
    r"|\d{10,13}"
    r")(?!\d)"
)
PHONE_MIN_DIGITS = 10
PHONE_MAX_DIGITS = 13

LINKEDIN_RE = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/(?:in|pub)/[A-Za-z0-9\-_/%]+", re.IGNORECASE)
GITHUB_RE = re.compile(r"(?:https?://)?(?:www\.)?github\.com/[A-Za-z0-9\-_]+", re.IGNORECASE)
GENERIC_URL_RE = re.compile(r"(?:https?://)?(?:www\.)?[A-Za-z0-9\-]+\.[A-Za-z]{2,}(?:/[^\s,;)]*)?", re.IGNORECASE)

YEARS_EXPLICIT_RE = re.compile(
    r"(\d{1,2}(?:\.\d)?)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:relevant\s+)?experience",
    re.IGNORECASE,
)
YEARS_EXPLICIT_RE_ALT = re.compile(
    r"(?:experience\s*[:\-]?\s*)(\d{1,2}(?:\.\d)?)\+?\s*(?:years?|yrs?)",
    re.IGNORECASE,
)

MONTH = r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
DATE_RANGE_RE = re.compile(
    rf"(?:{MONTH}\.?\s+)?(\d{{4}})\s*(?:-|–|to)\s*(?:(?:{MONTH}\.?\s+)?(\d{{4}})|(Present|Current|Now))",
    re.IGNORECASE,
)

# Abbreviation forms (M.S., B.A., A.A., ...) require a *literal* period between
# the letters (\bm\.s\.?\b, not \bm\.?s\.?\b) so bare words like "as", "be",
# "ms" don't get misread as degree abbreviations. Word forms additionally
# require "degree"/"of" after "master"/"bachelor" so "Scrum Master" or
# "master branch" don't false-positive.
DEGREE_KEYWORDS = [
    ("PhD", r"\bph\.?d\.?\b|\bdoctor(?:ate)? of philosophy\b"),
    ("MBA", r"\bm\.?b\.?a\.?\b"),
    ("Master's", r"\bmaster'?s\b|\bmasters?\s+degree\b|\bmaster\s+of\s+[a-z]+|\bm\.s\.?(?!\w)|\bm\.a\.?(?!\w)|\bmsc\b|\bm\.?tech\.?\b|\bm\.?eng\.?\b"),
    ("Bachelor's", r"\bbachelor'?s\b|\bbachelors?\s+degree\b|\bbachelor\s+of\s+[a-z]+|\bb\.s\.?(?!\w)|\bb\.a\.?(?!\w)|\bbsc\b|\bb\.?tech\.?\b|\bb\.?eng\.?\b"),
    ("Associate's", r"\bassociate'?s\s+degree\b|\ba\.a\.?(?!\w)|\ba\.s\.?(?!\w)"),
    ("Diploma", r"\bdiploma\b"),
    ("High School", r"\bhigh school\b|\bg\.?e\.?d\.?\b"),
]
DEGREE_PATTERNS = [(label, re.compile(pat, re.IGNORECASE)) for label, pat in DEGREE_KEYWORDS]

INSTITUTION_HINT_RE = re.compile(
    r"\b([A-Z][A-Za-z&.,'\-]*(?:\s+[A-Z][A-Za-z&.,'\-]*){0,5}\s+"
    r"(?:University|Institute of Technology|Institute|College|Polytechnic))\b"
)

SECTION_HEADERS = {
    "experience": re.compile(r"^\s*(work\s+)?experience\s*$|^\s*employment\s+history\s*$", re.IGNORECASE | re.MULTILINE),
    "education": re.compile(r"^\s*education\s*$", re.IGNORECASE | re.MULTILINE),
    "skills": re.compile(r"^\s*(technical\s+)?skills\s*$", re.IGNORECASE | re.MULTILINE),
    "summary": re.compile(r"^\s*(summary|profile|objective)\s*$", re.IGNORECASE | re.MULTILINE),
    "projects": re.compile(r"^\s*projects?\s*$", re.IGNORECASE | re.MULTILINE),
}

NAME_LINE_RE = re.compile(r"^[A-Z][a-zA-Z'\-]+(?:\s+[A-Z][a-zA-Z'\-.]+){1,3}$")


def extract_name(text: str) -> Optional[str]:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    for line in lines[:5]:
        if EMAIL_RE.search(line) or PHONE_RE.search(line):
            continue
        if len(line) > 60 or len(line.split()) > 5:
            continue
        if NAME_LINE_RE.match(line):
            return line
    # Fallback: first short line without digits/@ that looks title-cased.
    for line in lines[:5]:
        if "@" in line or any(c.isdigit() for c in line):
            continue
        words = line.split()
        if 1 < len(words) <= 5 and all(w[0].isupper() for w in words if w[0].isalpha()):
            return line
    return None


def extract_email(text: str) -> Optional[str]:
    m = EMAIL_RE.search(text)
    return m.group(0) if m else None


def extract_phone(text: str) -> Optional[str]:
    for m in PHONE_RE.finditer(text):
        digits = re.sub(r"\D", "", m.group(0))
        if PHONE_MIN_DIGITS <= len(digits) <= PHONE_MAX_DIGITS:
            return m.group(0).strip()
    return None


def extract_urls(text: str) -> Tuple[Optional[str], Optional[str], List[str]]:
    linkedin_m = LINKEDIN_RE.search(text)
    github_m = GITHUB_RE.search(text)
    linkedin = linkedin_m.group(0) if linkedin_m else None
    github = github_m.group(0) if github_m else None

    portfolio_urls = []
    for m in GENERIC_URL_RE.finditer(text):
        url = m.group(0)
        lower = url.lower()
        if "linkedin.com" in lower or "github.com" in lower:
            continue
        if EMAIL_RE.fullmatch(url):
            continue
        if "." not in url.split("/")[0]:
            continue
        # Filter out obvious false positives like "e.g." or trailing sentence punctuation.
        if len(url) < 6 or url.count(".") == 0:
            continue
        portfolio_urls.append(url)

    # De-dup while preserving order.
    seen = set()
    deduped = []
    for u in portfolio_urls:
        key = u.lower().rstrip("/.")
        if key not in seen:
            seen.add(key)
            deduped.append(u)

    return linkedin, github, deduped[:5]


def _month_to_num(month_str: Optional[str]) -> int:
    if not month_str:
        return 6  # assume mid-year if only a year is given
    month_str = month_str[:3].lower()
    mapping = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    }
    return mapping.get(month_str, 6)


def extract_years_of_experience(text: str) -> Tuple[Optional[float], Optional[str]]:
    # 1) Explicit "X+ years of experience" style claims take priority.
    m = YEARS_EXPLICIT_RE.search(text) or YEARS_EXPLICIT_RE_ALT.search(text)
    if m:
        return float(m.group(1)), "explicit_statement"

    # 2) Fall back to summing date ranges found anywhere in the text
    #    (typically the work-experience section). We take the earliest
    #    start year and latest end year (or "Present") as a conservative
    #    span estimate rather than trying to reconcile overlapping roles.
    ranges = []
    current_year = datetime.now().year
    for dm in DATE_RANGE_RE.finditer(text):
        start_year = int(dm.group(1))
        if dm.group(3):  # "Present"/"Current"/"Now"
            end_year = current_year
        elif dm.group(2):
            end_year = int(dm.group(2))
        else:
            continue
        if 1950 <= start_year <= current_year and start_year <= end_year <= current_year:
            ranges.append((start_year, end_year))

    if not ranges:
        return None, None

    earliest = min(r[0] for r in ranges)
    latest = max(r[1] for r in ranges)
    span = latest - earliest
    if span <= 0:
        return None, None
    return float(span), "date_range_span"


def extract_education(text: str) -> List[EducationEntry]:
    entries: List[EducationEntry] = []
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    for line in lines:
        degree_label = None
        for label, pattern in DEGREE_PATTERNS:
            if pattern.search(line):
                degree_label = label
                break
        if degree_label is None:
            continue

        institution = None
        inst_m = INSTITUTION_HINT_RE.search(line)
        if inst_m:
            institution = inst_m.group(1).strip()

        field_m = re.search(
            r"(?:in|of)\s+([A-Z][A-Za-z&,\s]{2,40}?)(?:,|\bfrom\b|\bat\b|$)",
            line,
        )
        field_of_study = field_m.group(1).strip() if field_m else None

        entries.append(
            EducationEntry(
                degree=degree_label,
                field=field_of_study,
                institution=institution,
                raw_line=line[:200],
            )
        )

    return entries[:10]


def find_section_headers(text: str) -> List[str]:
    found = []
    for name, pattern in SECTION_HEADERS.items():
        if pattern.search(text):
            found.append(name)
    return found


def extract_skills(text: str) -> List[MatchedSkill]:
    taxonomy = get_taxonomy()
    matches = taxonomy.match(text)
    return [
        MatchedSkill(
            skill=m.skill,
            category=m.category,
            matched_text=m.matched_text,
            match_type=m.match_type,
        )
        for m in sorted(matches, key=lambda x: x.skill)
    ]


def extract_resume_info(text: str) -> ResumeInfo:
    linkedin, github, portfolio_urls = extract_urls(text)
    years, years_source = extract_years_of_experience(text)

    return ResumeInfo(
        name=extract_name(text),
        email=extract_email(text),
        phone=extract_phone(text),
        linkedin_url=linkedin,
        github_url=github,
        portfolio_urls=portfolio_urls,
        years_of_experience=years,
        years_of_experience_source=years_source,
        education=extract_education(text),
        skills=extract_skills(text),
        section_headers_found=find_section_headers(text),
    )
