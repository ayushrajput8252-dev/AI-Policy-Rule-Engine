"""
FastAPI wrapper exposing:
  POST /extract — resume file -> structured JSON info
  POST /score   — resume file + job description text -> full score breakdown

The sentence-transformer model is preloaded once at startup (see
`lifespan`) so per-request latency stays under ~1s on CPU.
"""
import asyncio
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from app.extraction.file_ingestion import extract_text
from app.extraction.info_extractor import extract_resume_info
from app.extraction.meta import build_extraction_meta as _build_extraction_meta
from app.extraction.skills import get_taxonomy
from app.models import (
    BatchScoreResponse,
    ExtractResponse,
    JobDescriptionInfo,
    MatchedSkill,
    ScoreResponse,
)
from app.scoring.ats_scorer import score_resume
from app.scoring.jd_parser import parse_job_description
from app.scoring.pipeline import score_batch
from app.scoring.semantic import preload_model
from app.upload_limits import (
    BATCH_TIMEOUT_SECONDS,
    MAX_BATCH_FILES,
    MAX_BATCH_TOTAL_BYTES,
    validate_upload_bytes,
)

logger = logging.getLogger("hiring_automation")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")


@asynccontextmanager
async def lifespan(app: FastAPI):
    start = time.perf_counter()
    logger.info("Loading sentence-transformer model...")
    preload_model()
    get_taxonomy()  # warm the taxonomy + compiled regex too
    logger.info("Model loaded in %.2fs", time.perf_counter() - start)

    app.state.executor = ThreadPoolExecutor(thread_name_prefix="hiring-batch")
    logger.info("Batch executor started (max_workers=%s)", app.state.executor._max_workers)
    try:
        yield
    finally:
        app.state.executor.shutdown(wait=True, cancel_futures=True)


app = FastAPI(
    title="Hiring Automation — ATS Resume Screening Agent",
    description="Local resume parsing + ATS scoring: extraction, entity parsing, and requirement matching.",
    version="1.0.0",
    lifespan=lifespan,
)


def _read_and_validate_upload(file: UploadFile, raw_bytes: bytes):
    err = validate_upload_bytes(file.filename, raw_bytes)
    if err:
        raise HTTPException(status_code=400, detail=err)


@app.get("/", include_in_schema=False)
async def index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/extract", response_model=ExtractResponse)
async def extract(file: UploadFile = File(...)):
    raw_bytes = await file.read()
    _read_and_validate_upload(file, raw_bytes)

    try:
        extraction = extract_text(file.filename, raw_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Extraction failed for %s", file.filename)
        raise HTTPException(status_code=422, detail=f"Failed to parse file: {exc}")

    info = extract_resume_info(extraction.text)
    meta = _build_extraction_meta(file.filename, extraction)

    return ExtractResponse(
        meta=meta,
        info=info,
        raw_text_preview=extraction.text[:500],
    )


@app.post("/score", response_model=ScoreResponse)
async def score(
    file: UploadFile = File(...),
    job_description: str = Form(...),
):
    raw_bytes = await file.read()
    _read_and_validate_upload(file, raw_bytes)

    if not job_description or not job_description.strip():
        raise HTTPException(status_code=400, detail="job_description must not be empty.")

    try:
        extraction = extract_text(file.filename, raw_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Extraction failed for %s", file.filename)
        raise HTTPException(status_code=422, detail=f"Failed to parse file: {exc}")

    info = extract_resume_info(extraction.text)
    meta = _build_extraction_meta(file.filename, extraction)

    parsed_jd = parse_job_description(job_description)
    resume_skill_matches = get_taxonomy().match(extraction.text)

    breakdown = score_resume(
        resume_text=extraction.text,
        jd_text=job_description,
        extraction=extraction,
        resume_skills=resume_skill_matches,
        jd=parsed_jd,
        resume_section_headers=info.section_headers_found,
    )

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

    return ScoreResponse(
        meta=meta,
        resume_info=info,
        job_description=jd_info,
        score=breakdown,
    )


@app.post("/score/batch", response_model=BatchScoreResponse)
async def score_batch_endpoint(
    files: List[UploadFile] = File(...),
    job_description: str = Form(...),
):
    if not job_description or not job_description.strip():
        raise HTTPException(status_code=400, detail="job_description must not be empty.")
    if not files:
        raise HTTPException(status_code=400, detail="At least one resume file is required.")
    if len(files) > MAX_BATCH_FILES:
        raise HTTPException(status_code=400, detail=f"Too many files (max {MAX_BATCH_FILES} per batch).")

    # Read all upload bytes on the event loop up front — UploadFile.read()
    # is async and must be awaited here; the executor stage that follows
    # only ever sees plain bytes, never UploadFile/SpooledTemporaryFile
    # objects, so there's no cross-thread access to Starlette internals.
    raw_files = []
    total_bytes = 0
    for f in files:
        raw_bytes = await f.read()
        total_bytes += len(raw_bytes)
        if total_bytes > MAX_BATCH_TOTAL_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"Combined upload size exceeds {MAX_BATCH_TOTAL_BYTES // (1024 * 1024)}MB limit.",
            )
        raw_files.append((f.filename, raw_bytes))

    try:
        return await asyncio.wait_for(
            score_batch(raw_files=raw_files, job_description=job_description, executor=app.state.executor),
            timeout=BATCH_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail=f"Batch scoring exceeded {BATCH_TIMEOUT_SECONDS}s timeout.")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    logger.exception("Unhandled error")
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})
