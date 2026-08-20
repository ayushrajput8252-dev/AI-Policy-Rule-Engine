"""
Job description parsing: splits required vs. preferred sections (when the
JD has explicit headers) and runs the same skill taxonomy matcher used on
resumes so both sides are normalized against identical canonical skills.
"""
import re
from dataclasses import dataclass
from typing import List

from app.extraction.skills import SkillMatch, get_taxonomy

REQUIRED_HEADER_RE = re.compile(
    r"(?:required|must[\s\-]have|requirements?|qualifications?|what\s+you'?ll?\s+need)\s*:?",
    re.IGNORECASE,
)
PREFERRED_HEADER_RE = re.compile(
    r"(?:preferred|nice[\s\-]to[\s\-]have|bonus|good\s+to\s+have|pluses?)\s*:?",
    re.IGNORECASE,
)
# Any other all-caps-ish / colon-terminated header line, used to know where
# the "required"/"preferred" section ends.
GENERIC_HEADER_RE = re.compile(r"^[A-Za-z][A-Za-z\s/&\-]{2,40}:?\s*$")


@dataclass
class ParsedJD:
    required_skills: List[SkillMatch]
    preferred_skills: List[SkillMatch]
    had_explicit_sections: bool


def _split_sections(text: str):
    """Returns (required_text, preferred_text, had_explicit_sections).

    If no explicit "required"/"preferred" headers are found, the whole JD
    text is treated as the required section (a reasonable default: most
    JDs list must-have skills without a formal header).
    """
    lines = text.splitlines()
    required_start = None
    preferred_start = None

    for i, line in enumerate(lines):
        stripped = line.strip()
        if required_start is None and REQUIRED_HEADER_RE.fullmatch(stripped):
            required_start = i
        elif preferred_start is None and PREFERRED_HEADER_RE.fullmatch(stripped):
            preferred_start = i

    if required_start is None and preferred_start is None:
        return text, "", False

    def _section_text(start_idx):
        if start_idx is None:
            return ""
        collected = []
        for line in lines[start_idx + 1:]:
            stripped = line.strip()
            if stripped and (
                REQUIRED_HEADER_RE.fullmatch(stripped)
                or PREFERRED_HEADER_RE.fullmatch(stripped)
            ):
                break
            collected.append(line)
        return "\n".join(collected)

    required_text = _section_text(required_start) if required_start is not None else text
    preferred_text = _section_text(preferred_start) if preferred_start is not None else ""

    return required_text, preferred_text, True


def parse_job_description(text: str) -> ParsedJD:
    taxonomy = get_taxonomy()
    required_text, preferred_text, had_explicit = _split_sections(text)

    required_skills = taxonomy.match(required_text)
    preferred_skills = taxonomy.match(preferred_text) if preferred_text else []

    # A skill mentioned in both sections counts as required (stricter bucket).
    required_names = {s.skill for s in required_skills}
    preferred_skills = [s for s in preferred_skills if s.skill not in required_names]

    return ParsedJD(
        required_skills=required_skills,
        preferred_skills=preferred_skills,
        had_explicit_sections=had_explicit,
    )
