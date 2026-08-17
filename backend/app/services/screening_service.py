import os
import tempfile
from typing import Any, Dict, Optional

from .parsing import parse_pdf
from .screening_llm_service import get_jd_profile, get_resume_profile, generate_question_set


def parse_resume_and_generate_questions(
    file_bytes: bytes, role_title: str, jd_text: Optional[str]
) -> Dict[str, Any]:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    try:
        blocks = parse_pdf(tmp_path)
        resume_text = "\n".join(b["text"] for b in blocks)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    resume_profile = get_resume_profile(resume_text)
    jd_profile = get_jd_profile(jd_text) if jd_text and jd_text.strip() else None
    questions = generate_question_set(role_title, resume_profile, jd_profile)

    return {
        "resume_profile": resume_profile.model_dump(),
        "questions": [
            {"id": f"q{i + 1}", "category": q.category, "text": q.text} for i, q in enumerate(questions)
        ],
    }
