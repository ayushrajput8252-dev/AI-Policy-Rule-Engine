"""
Agentic Hiring Pipeline — resume parsing, ATS scoring, requirement matching,
and assignment generation.

Reuses the existing PDF text extraction (parsing.parse_pdf) and the
Groq-primary/Gemini-fallback JSON generation already used for policy Q&A,
fraud reasoning, and interview scoring (see llm_service.generate_json), so
this gets the same dual-provider resilience instead of a separate bespoke
LLM integration. Every LLM call has a deterministic, non-LLM fallback so a
provider outage degrades the pipeline instead of breaking it.
"""
import re
from typing import Any, Dict, List, Optional

from .llm_service import generate_json
from .parsing import parse_pdf

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}")

RESUME_SYSTEM_INSTRUCTION = """You are a resume parsing and ATS scoring engine. Given the raw extracted
text of a resume PDF, extract structured fields and score the resume's overall quality/completeness
the way an Applicant Tracking System would — independent of any specific job requirement.

Return ONLY a JSON object with this exact shape:
{"name": "<candidate full name, or null if not found>",
 "email": "<candidate email, or null if not found>",
 "phone": "<candidate phone number, or null if not found>",
 "experience": "<short experience summary, e.g. '4 Years'>",
 "skills": ["<skill1>", "<skill2>", ...up to 8 most relevant skills],
 "summary": "<1-2 sentence honest summary of the candidate's background>",
 "ats_score": <integer 0-100, resume structure/clarity/completeness quality>}"""

MATCH_SYSTEM_INSTRUCTION = """You are a requirement-matching engine for a hiring pipeline. Given a
candidate's parsed skills/experience and a role requirement brief, score how well the candidate fits.

Return ONLY a JSON object with this exact shape:
{"match_score": <integer 0-100>,
 "matched_skills": ["<skill the candidate has that the role needs>", ...],
 "missing_skills": ["<skill the role needs that the candidate lacks>", ...],
 "recommendation": "<one of: 'Strong Hire', 'Hire', 'Consider', 'Not a Fit'>"}"""

ASSIGNMENT_SYSTEM_INSTRUCTION = """You are an assignment-generation engine for a hiring pipeline. Given
an HR-written requirement brief for a take-home assignment, draft a short, concrete assignment.

Return ONLY a JSON object with this exact shape:
{"title": "<short assignment title, e.g. 'Backend Engineer Assessment'>",
 "duration": "<expected completion time, e.g. '48 Hours'>",
 "requirements": ["<requirement 1>", "<requirement 2>", ...3-6 items],
 "submission": "<how it should be submitted, e.g. 'GitHub Repository'>"}"""


def _extract_email_phone(text: str) -> tuple[Optional[str], Optional[str]]:
    email_match = EMAIL_RE.search(text)
    phone_match = PHONE_RE.search(text)
    email = email_match.group(0) if email_match else None
    phone = phone_match.group(0).strip() if phone_match else None
    return email, phone


def _fallback_resume_fields(filename: str, text: str) -> Dict[str, Any]:
    email, phone = _extract_email_phone(text)
    first_line = next((l.strip() for l in text.splitlines() if l.strip()), filename)
    year_match = re.search(r"(\d+)\+?\s*years?", text, re.IGNORECASE)
    return {
        "name": first_line[:60] or filename,
        "email": email,
        "phone": phone,
        "experience": f"{year_match.group(1)} Years" if year_match else "Not specified",
        "skills": [],
        "summary": "Automated summary unavailable — both LLM providers failed. Review the resume manually.",
        "ats_score": 60,
    }


def extract_resume_fields(filename: str, text: str) -> Dict[str, Any]:
    """Parses raw resume text into structured fields + an ATS quality score."""
    if not text.strip():
        return {**_fallback_resume_fields(filename, text), "summary": "No extractable text found in this PDF."}

    prompt = f"Resume filename: {filename}\n\nRaw extracted resume text:\n{text[:6000]}"
    try:
        result = generate_json(prompt, RESUME_SYSTEM_INSTRUCTION)
        if not isinstance(result, dict):
            raise ValueError("Resume extraction response was not a JSON object")
    except Exception as e:
        print(f"[Hiring Resume Extraction Error] {e}")
        result = _fallback_resume_fields(filename, text)

    # Regex-extracted contact info is more reliable than LLM output for exact
    # strings — prefer it when present, fall back to whatever the LLM found.
    regex_email, regex_phone = _extract_email_phone(text)
    result["email"] = regex_email or result.get("email")
    result["phone"] = regex_phone or result.get("phone")
    result.setdefault("name", filename)
    if not result.get("name"):
        result["name"] = filename
    result.setdefault("skills", [])
    if not isinstance(result.get("skills"), list):
        result["skills"] = []
    result.setdefault("experience", "Not specified")
    result.setdefault("summary", "")
    try:
        result["ats_score"] = max(0, min(100, int(result.get("ats_score", 60))))
    except (TypeError, ValueError):
        result["ats_score"] = 60

    return result


def parse_resume_pdf(filename: str, file_path: str) -> Dict[str, Any]:
    """Extracts text from an uploaded resume PDF and returns structured fields."""
    try:
        blocks = parse_pdf(file_path)
        text = "\n".join(b["text"] for b in blocks)
    except Exception as e:
        print(f"[Hiring Resume Parse Error] {e}")
        text = ""
    fields = extract_resume_fields(filename, text)
    fields["filename"] = filename
    fields["resume_text"] = text[:8000]
    return fields


def _fallback_match(candidate: Dict[str, Any], requirement: str) -> Dict[str, Any]:
    req_lower = requirement.lower()
    skills = candidate.get("skills") or []
    matched = [s for s in skills if s.lower() in req_lower]
    missing = [] if matched else skills[:3]
    base = candidate.get("ats_score", 60)
    score = base if matched else max(40, base - 15)
    recommendation = "Strong Hire" if score >= 85 else "Hire" if score >= 65 else "Consider"
    return {
        "match_score": score,
        "matched_skills": matched,
        "missing_skills": missing,
        "recommendation": recommendation,
    }


def match_candidate_to_requirement(candidate: Dict[str, Any], requirement: str, role_title: str = "the open role") -> Dict[str, Any]:
    """Scores how well a parsed candidate fits an HR-written requirement brief."""
    if not requirement.strip():
        return _fallback_match(candidate, requirement)

    prompt = (
        f"Role: {role_title}\n\n"
        f"Requirement brief:\n{requirement.strip()}\n\n"
        f"Candidate: {candidate.get('name')}\n"
        f"Experience: {candidate.get('experience')}\n"
        f"Skills: {', '.join(candidate.get('skills') or [])}\n"
        f"Summary: {candidate.get('summary')}"
    )
    try:
        result = generate_json(prompt, MATCH_SYSTEM_INSTRUCTION)
        if not isinstance(result, dict):
            raise ValueError("Match response was not a JSON object")
    except Exception as e:
        print(f"[Hiring Requirement Match Error] {e}")
        result = _fallback_match(candidate, requirement)

    try:
        result["match_score"] = max(0, min(100, int(result.get("match_score", 60))))
    except (TypeError, ValueError):
        result["match_score"] = 60
    result.setdefault("matched_skills", [])
    result.setdefault("missing_skills", [])
    result.setdefault("recommendation", "Hire" if result["match_score"] >= 65 else "Consider")
    return result


def _fallback_assignment(requirement: str) -> Dict[str, Any]:
    lower = requirement.lower()
    bullet_lines = [
        re.sub(r"^[•\-*]\s*|^\d+[.)]\s*", "", l.strip())
        for l in requirement.split("\n")
        if re.match(r"^[•\-*]|^\d+[.)]", l.strip())
    ]
    title = "Technical Assessment"
    if "full stack" in lower or "full-stack" in lower:
        title = "Full-Stack Engineer Assessment"
    elif "backend" in lower or "back-end" in lower or "api" in lower:
        title = "Backend Engineer Assessment"
    elif "frontend" in lower or "front-end" in lower or "react" in lower:
        title = "Frontend Engineer Assessment"
    elif "machine learning" in lower or " ml " in lower or " ai " in lower:
        title = "AI/ML Engineer Assessment"

    hour_match = re.search(r"(\d+)\s*hour", lower)
    day_match = re.search(r"(\d+)\s*day", lower)
    duration = f"{hour_match.group(1)} Hours" if hour_match else f"{day_match.group(1)} Days" if day_match else "48 Hours"

    return {
        "title": title,
        "duration": duration,
        "requirements": bullet_lines[:6] or ["FastAPI", "Authentication", "Docker", "Unit Tests"],
        "submission": "GitHub Repository",
    }


def generate_assignment(requirement: str, role_title: str = "the open role") -> Dict[str, Any]:
    """Drafts a take-home assignment brief from an HR-written requirement."""
    if not requirement.strip():
        return _fallback_assignment(requirement)

    prompt = f"Role: {role_title}\n\nHR requirement brief:\n{requirement.strip()}"
    try:
        result = generate_json(prompt, ASSIGNMENT_SYSTEM_INSTRUCTION)
        if not isinstance(result, dict) or not result.get("title"):
            raise ValueError("Assignment response was not a valid JSON object")
    except Exception as e:
        print(f"[Hiring Assignment Generation Error] {e}")
        result = _fallback_assignment(requirement)

    result.setdefault("duration", "48 Hours")
    result.setdefault("submission", "GitHub Repository")
    if not isinstance(result.get("requirements"), list) or not result["requirements"]:
        result["requirements"] = _fallback_assignment(requirement)["requirements"]
    return result
