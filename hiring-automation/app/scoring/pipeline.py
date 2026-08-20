"""
Batch scoring pipeline: scores N resumes against ONE job description in a
single request with genuine concurrency.

Design:

  1. Per-file extraction (pdfplumber/PyMuPDF/python-docx) + info/skill
     extraction is dispatched one task per file to a shared
     ThreadPoolExecutor via loop.run_in_executor. These calls are
     independent and touch no shared mutable state (SkillTaxonomy is
     read-only after init; file_ingestion.py has no module state), so this
     is safe real concurrency.

  2. Semantic similarity is NOT computed per file. All successfully
     extracted resume texts + the JD text are embedded in ONE batched
     model.encode() call (semantic.semantic_similarity_batch), run via the
     executor so it doesn't block the event loop. The sentence-transformer
     model stays a process-wide singleton loaded exactly once — a
     per-resume ProcessPoolExecutor would force a model reload per worker
     process, which is strictly worse.

  3. Keyword-match + formatting scoring is pure Python/dict-and-set work
     (<1ms/resume) and runs inline on the event loop once extraction +
     semantic results are back — not worth executor round-trip overhead.

A single corrupt/unsupported/oversized file never fails the whole batch:
_process_one_file() never raises; failures become a CandidateResult with
`error` set, excluded from ranking but included in the response.
"""
import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import List, Optional, Tuple

from app.extraction.file_ingestion import ExtractionResult, extract_text
from app.extraction.info_extractor import extract_resume_info
from app.extraction.meta import build_extraction_meta
from app.models import (
    BatchScoreResponse,
    BatchTiming,
    CandidateError,
    CandidateResult,
    JobDescriptionInfo,
    MatchedSkill,
    ResumeInfo,
    SemanticBreakdown,
)
from app.scoring.ats_scorer import combine_scores, score_keyword_and_formatting
from app.scoring.jd_parser import parse_job_description
from app.scoring.semantic import semantic_similarity_batch
from app.upload_limits import validate_upload_bytes

logger = logging.getLogger("hiring_automation")


@dataclass
class _ExtractedFile:
    filename: str
    extraction: Optional[ExtractionResult]
    resume_info: Optional[ResumeInfo]
    error: Optional[str]


def _process_one_file(filename: str, raw_bytes: bytes) -> _ExtractedFile:
    """Runs in a worker thread. Never raises: every failure mode is caught
    and returned as `.error` so one bad file can't break the batch."""
    err = validate_upload_bytes(filename, raw_bytes)
    if err:
        return _ExtractedFile(filename, None, None, err)

    try:
        extraction = extract_text(filename, raw_bytes)
    except ValueError as exc:
        return _ExtractedFile(filename, None, None, str(exc))
    except Exception as exc:  # pragma: no cover - defensive, mirrors /extract
        logger.exception("Batch extraction failed for %s", filename)
        return _ExtractedFile(filename, None, None, f"Failed to parse file: {exc}")

    try:
        # extract_resume_info() already runs the skill taxonomy match
        # internally (info.skills) — reuse that instead of matching again.
        info = extract_resume_info(extraction.text)
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Batch info-extraction failed for %s", filename)
        return _ExtractedFile(filename, extraction, None, f"Failed to extract resume info: {exc}")

    return _ExtractedFile(filename, extraction, info, None)


async def score_batch(
    raw_files: List[Tuple[str, bytes]],
    job_description: str,
    executor: ThreadPoolExecutor,
) -> BatchScoreResponse:
    batch_start = time.perf_counter()
    loop = asyncio.get_running_loop()

    # --- JD parsed once, on the event loop (cheap, pure Python) ---
    parsed_jd = parse_job_description(job_description)
    jd_info = JobDescriptionInfo(
        required_skills=[
            MatchedSkill(skill=s.skill, category=s.category, matched_text=s.matched_text, match_type=s.match_type)
            for s in parsed_jd.required_skills
        ],
        preferred_skills=[
            MatchedSkill(skill=s.skill, category=s.category, matched_text=s.matched_text, match_type=s.match_type)
            for s in parsed_jd.preferred_skills
        ],
        had_explicit_sections=parsed_jd.had_explicit_sections,
    )

    # --- Stage 1: fan out extraction + skills across the thread pool ---
    extraction_start = time.perf_counter()
    tasks = [
        loop.run_in_executor(executor, _process_one_file, filename, raw_bytes)
        for filename, raw_bytes in raw_files
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)  # defense-in-depth
    extracted: List[_ExtractedFile] = []
    for (filename, _), item in zip(raw_files, results):
        if isinstance(item, Exception):
            logger.exception("Unexpected error processing %s", filename, exc_info=item)
            extracted.append(_ExtractedFile(filename, None, None, f"Unexpected error: {item}"))
        else:
            extracted.append(item)
    extraction_elapsed = time.perf_counter() - extraction_start

    # --- Stage 2: ONE batched semantic encode call for every successful file ---
    ok_indices = [i for i, ef in enumerate(extracted) if ef.error is None]
    resume_texts = [extracted[i].extraction.text for i in ok_indices]

    semantic_start = time.perf_counter()
    sem_scores, model_name = await loop.run_in_executor(
        executor, semantic_similarity_batch, resume_texts, job_description
    )
    semantic_elapsed = time.perf_counter() - semantic_start
    sem_by_index = dict(zip(ok_indices, sem_scores))

    # --- Stage 3: cheap inline keyword+formatting scoring, assemble results ---
    candidates: List[CandidateResult] = []
    for i, ef in enumerate(extracted):
        if ef.error is not None:
            candidates.append(CandidateResult(
                filename=ef.filename,
                error=CandidateError(code="processing_failed", message=ef.error),
            ))
            continue

        keyword, formatting = score_keyword_and_formatting(
            extraction=ef.extraction,
            resume_skills=ef.resume_info.skills,
            jd=parsed_jd,
            resume_section_headers=ef.resume_info.section_headers_found,
        )
        semantic = SemanticBreakdown(score=sem_by_index[i], model=model_name)
        breakdown = combine_scores(keyword, semantic, formatting)

        candidates.append(CandidateResult(
            filename=ef.filename,
            meta=build_extraction_meta(ef.filename, ef.extraction),
            resume_info=ef.resume_info,
            score=breakdown,
        ))

    # --- Rank: succeeded candidates sorted desc by final_score get rank 1..K;
    #     failed candidates keep rank=None, appended after, original order ---
    succeeded = [c for c in candidates if c.error is None]
    failed = [c for c in candidates if c.error is not None]
    succeeded.sort(key=lambda c: c.score.final_score, reverse=True)
    for rank, c in enumerate(succeeded, start=1):
        c.rank = rank

    timing = BatchTiming(
        total_wall_seconds=round(time.perf_counter() - batch_start, 3),
        extraction_seconds=round(extraction_elapsed, 3),
        semantic_batch_seconds=round(semantic_elapsed, 3),
        file_count=len(raw_files),
        succeeded_count=len(succeeded),
        failed_count=len(failed),
    )

    return BatchScoreResponse(job_description=jd_info, candidates=succeeded + failed, timing=timing)
