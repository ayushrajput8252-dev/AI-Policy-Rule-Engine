"""
Combines the three ATS sub-scores into a final, explainable score:

  final = 0.5 * keyword_match + 0.4 * semantic_similarity + 0.1 * formatting

Every sub-score is returned in full (not just the blended number) so the
caller can see exactly which skills matched/were missing and why points
were deducted for formatting.
"""
from typing import List, Tuple

from app.extraction.file_ingestion import ExtractionResult
from app.extraction.skills import SkillMatch
from app.models import (
    FormattingBreakdown,
    ScoreBreakdown,
    SemanticBreakdown,
    SkillMatchBreakdown,
)
from app.scoring.jd_parser import ParsedJD
from app.scoring.semantic import semantic_similarity_score

WEIGHTS = {"keyword_match": 0.5, "semantic_similarity": 0.4, "formatting": 0.1}

REQUIRED_SECTION_HEADERS = ["experience", "education", "skills"]
SHORT_TEXT_THRESHOLD = 300


def _skill_match_score(resume_skills: List[SkillMatch], jd: ParsedJD) -> SkillMatchBreakdown:
    resume_skill_names = {s.skill for s in resume_skills}
    required_names = [s.skill for s in jd.required_skills]
    preferred_names = [s.skill for s in jd.preferred_skills]

    matched_required = [s for s in required_names if s in resume_skill_names]
    missing_required = [s for s in required_names if s not in resume_skill_names]
    matched_preferred = [s for s in preferred_names if s in resume_skill_names]
    missing_preferred = [s for s in preferred_names if s not in resume_skill_names]

    total_required = len(required_names)
    if total_required == 0:
        # No required skills detected in the JD at all — nothing to penalize against.
        score = 100.0 if not resume_skills else 100.0
    else:
        score = round(len(matched_required) / total_required * 100, 2)

    return SkillMatchBreakdown(
        score=score,
        matched_required=sorted(matched_required),
        missing_required=sorted(missing_required),
        matched_preferred=sorted(matched_preferred),
        missing_preferred=sorted(missing_preferred),
        total_required=total_required,
        total_preferred=len(preferred_names),
    )


def _formatting_score(extraction: ExtractionResult, resume_section_headers: List[str]) -> FormattingBreakdown:
    score = 100
    deductions = []

    if extraction.has_tables:
        score -= 10
        deductions.append("tables_detected: -10 (tables often parse poorly in real ATS systems)")

    if extraction.has_images:
        score -= 10
        deductions.append("images_detected: -10 (text embedded in images is invisible to ATS parsers)")

    missing_headers = [h for h in REQUIRED_SECTION_HEADERS if h not in resume_section_headers]
    for header in missing_headers:
        score -= 10 if header != "experience" else 15
        deductions.append(f"missing_section_header:{header}: -{10 if header != 'experience' else 15}")

    if extraction.char_count < SHORT_TEXT_THRESHOLD:
        score -= 30
        deductions.append(
            f"short_extracted_text: -30 (only {extraction.char_count} chars extracted — likely a bad/partial parse)"
        )

    if extraction.likely_bad_extraction:
        score -= 20
        deductions.append("extraction_quality_warning: -20 (see extraction warnings)")

    score = max(0, score)
    return FormattingBreakdown(score=float(score), deductions=deductions)


def score_keyword_and_formatting(
    extraction: ExtractionResult,
    resume_skills: List[SkillMatch],
    jd: ParsedJD,
    resume_section_headers: List[str],
) -> Tuple[SkillMatchBreakdown, FormattingBreakdown]:
    """The two sub-scores that don't need the sentence-transformer model.
    Split out so the batch pipeline can compute these cheaply per-resume
    while semantic similarity is computed once for the whole batch."""
    return (
        _skill_match_score(resume_skills, jd),
        _formatting_score(extraction, resume_section_headers),
    )


def combine_scores(
    keyword: SkillMatchBreakdown,
    semantic: SemanticBreakdown,
    formatting: FormattingBreakdown,
) -> ScoreBreakdown:
    final = (
        WEIGHTS["keyword_match"] * keyword.score
        + WEIGHTS["semantic_similarity"] * semantic.score
        + WEIGHTS["formatting"] * formatting.score
    )

    return ScoreBreakdown(
        final_score=round(final, 2),
        weights=WEIGHTS,
        keyword_match=keyword,
        semantic_similarity=semantic,
        formatting=formatting,
    )


def score_resume(
    resume_text: str,
    jd_text: str,
    extraction: ExtractionResult,
    resume_skills: List[SkillMatch],
    jd: ParsedJD,
    resume_section_headers: List[str],
) -> ScoreBreakdown:
    """Scores a single resume against a single JD. Used by POST /score.
    The batch pipeline (app/scoring/pipeline.py) instead calls
    score_keyword_and_formatting() + combine_scores() directly with a
    semantic score computed once for the whole batch."""
    keyword, formatting = score_keyword_and_formatting(
        extraction, resume_skills, jd, resume_section_headers
    )
    sem_score, model_name = semantic_similarity_score(resume_text, jd_text)
    semantic = SemanticBreakdown(score=sem_score, model=model_name)
    return combine_scores(keyword, semantic, formatting)
