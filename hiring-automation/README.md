# Hiring Automation — ATS Resume Screening Agent

A fast, local ATS resume-screening service, with a built-in browser UI for
screening a batch of resumes against one job description in parallel. No
LLM calls in the hot path — structured extraction is regex +
fixed-taxonomy fuzzy matching, and the only model in the loop is a small
local sentence-transformer used purely for semantic similarity scoring.

Covers the three pieces from the brief:

- **Resume Parser** — extracts structured text & entities (`app/extraction/`)
- **ATS + Email Extraction** — scores resumes, extracts contact info (`app/scoring/ats_scorer.py`)
- **Requirement Matching** — matches resume skills to JD requirements (`app/scoring/jd_parser.py`)

Plus batch screening with real parallelism: `POST /score/batch` scores many
resumes against one JD concurrently (thread-pool file extraction + a
single batched embedding call, not a sequential loop), and `GET /` serves
a self-contained HTML/JS page that drives it — paste a JD, drop in a pile
of resumes, get a ranked shortlist with a full explainable breakdown per
candidate.

## Architecture

```
app/
  main.py                    FastAPI app: /, /extract, /score, /score/batch, model preload at startup
  models.py                  Pydantic response schemas
  upload_limits.py           Shared upload/batch size + timeout limits and validation
  static/
    index.html                Built-in UI: JD + multi-resume upload -> ranked results table
  extraction/
    file_ingestion.py        PDF (pdfplumber, PyMuPDF fallback) / DOCX (python-docx)
    skills.py                Skill taxonomy: alias-regex pass + rapidfuzz fuzzy pass
    info_extractor.py        Name/email/phone/URLs/experience/education/skills
    meta.py                  Builds ExtractionMeta (shared by single-file + batch paths)
  scoring/
    jd_parser.py             Required vs. preferred skill extraction from JD text
    semantic.py               all-MiniLM-L6-v2 embeddings + cosine similarity (single-pair + batch)
    ats_scorer.py             Combines the 3 sub-scores into an explainable breakdown
    pipeline.py               Batch orchestration: parallel extraction + one batched embed call
  data/
    skills_taxonomy.json      Canonical skills + aliases + category
scripts/
  build_taxonomy.py           Regenerates skills_taxonomy.json
  generate_sample_resumes.py  Generates sample_resumes/ fixtures for manual testing
tests/
  test_skills.py               Unit tests for the taxonomy matcher (no model load)
  test_end_to_end.py           Full pipeline smoke test via FastAPI TestClient
  test_batch.py                Batch endpoint: ranking, per-file error isolation, real speedup
```

## Setup

```bash
python -m venv .venv
.venv/Scripts/activate        # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
```

Run the API:

```bash
uvicorn app.main:app --reload
```

The sentence-transformer model (~80MB) downloads on first run and is cached
by `huggingface_hub`; after that, it loads once at process startup (see
`lifespan` in `app/main.py`) so it's never reloaded per-request.

## Endpoints

### `POST /extract`

Multipart form upload, field `file` (PDF or DOCX). Returns structured resume
info: name, email, phone, LinkedIn/GitHub/portfolio URLs, years of
experience (+ how it was derived), education entries, and matched skills.

```bash
curl -X POST http://localhost:8000/extract \
  -F "file=@sample_resumes/john_doe.pdf"
```

### `POST /score`

Multipart form upload, field `file` (PDF or DOCX) + form field
`job_description` (plain text). Returns the full explainable score
breakdown.

```bash
curl -X POST http://localhost:8000/score \
  -F "file=@sample_resumes/john_doe.pdf" \
  -F "job_description=$(cat sample_resumes/sample_jd.txt)"
```

Response shape (abbreviated):

```json
{
  "score": {
    "final_score": 93.54,
    "weights": {"keyword_match": 0.5, "semantic_similarity": 0.4, "formatting": 0.1},
    "keyword_match": {
      "score": 100.0,
      "matched_required": ["Docker", "FastAPI", "Kubernetes", "Python", "..."],
      "missing_required": [],
      "matched_preferred": ["Machine Learning", "Terraform"],
      "missing_preferred": ["GraphQL"],
      "total_required": 12,
      "total_preferred": 4
    },
    "semantic_similarity": {"score": 86.35, "model": "sentence-transformers/all-MiniLM-L6-v2"},
    "formatting": {"score": 90.0, "deductions": ["tables_detected: -10 ..."]}
  }
}
```

Nothing is a black-box percentage — every sub-score lists exactly which
skills matched/were missing and why formatting points were deducted.

### `POST /score/batch`

Multipart form upload: repeated `files` fields (up to 25 PDFs/DOCX, 60MB
combined) + form field `job_description`. Scores every resume against the
one JD **in parallel** — file extraction + skill matching for each resume
runs concurrently across a shared thread pool, and semantic similarity for
the whole batch is computed in a single vectorized embedding call rather
than once per resume. A single corrupt/unsupported file never fails the
whole request — it comes back as a `CandidateResult` with `error` set,
excluded from ranking but still visible in the response. Results are
sorted by `final_score` descending with `rank` assigned.

```bash
curl -X POST http://localhost:8000/score/batch \
  -F "job_description=$(cat sample_resumes/sample_jd.txt)" \
  -F "files=@sample_resumes/strong_match.docx" \
  -F "files=@sample_resumes/john_doe.docx" \
  -F "files=@sample_resumes/partial_match.pdf" \
  -F "files=@sample_resumes/mismatch.pdf"
```

Response shape (abbreviated):

```json
{
  "job_description": {"required_skills": ["..."], "preferred_skills": ["..."], "had_explicit_sections": true},
  "candidates": [
    {"filename": "strong_match.docx", "rank": 1, "error": null, "score": {"final_score": 90.66, "...": "..."}},
    {"filename": "mismatch.pdf", "rank": null, "error": {"code": "processing_failed", "message": "..."}}
  ],
  "timing": {
    "total_wall_seconds": 0.78, "extraction_seconds": 0.39, "semantic_batch_seconds": 0.36,
    "file_count": 4, "succeeded_count": 4, "failed_count": 0
  }
}
```

### `GET /` — built-in UI

A self-contained HTML/JS page (no build step, no framework, no CDN) served
directly by FastAPI. Paste a job description, pick one or more resumes,
submit — it calls `/score/batch` and renders a ranked table with an
expandable per-candidate breakdown (matched/missing skills, formatting
deductions, extraction warnings). Open `http://localhost:8000/` after
starting the server.

## How scoring works

`final = 0.5 * keyword_match + 0.4 * semantic_similarity + 0.1 * formatting`

- **Keyword/skill match** — required skills are extracted from the JD (via
  the same taxonomy used on resumes, so both sides are alias-normalized),
  and the score is `matched / total_required * 100`.
- **Semantic similarity** — resume and JD full text are embedded with
  `all-MiniLM-L6-v2` and compared via cosine similarity, scaled to 0-100.
- **Formatting/parseability** — starts at 100, deducts for detected tables,
  detected images, missing standard section headers (Experience, Education,
  Skills), short extracted text, and any extraction-quality warning.

## Skill taxonomy

`app/data/skills_taxonomy.json` currently has **376 canonical skills / 602
matchable terms** (languages, frameworks, databases, cloud/devops, data &
ML, testing, security, mobile, design, business tools, soft skills) with
common aliases (`JS`→JavaScript, `ML`→Machine Learning, `k8s`→Kubernetes,
etc.). This is a curated, real starting set rather than the full 2000-5000
the brief mentions — regenerate/extend it by editing
`scripts/build_taxonomy.py` (or appending directly to the JSON; no code
changes needed) and re-running it. A production deployment would likely
merge in an open skills dataset (ESCO, Lightcast, O*NET) to reach that
scale.

Matching is two-pass:
1. **Exact/alias pass** — every skill+alias compiled into one word-boundary
   alternation regex, matched in a single linear pass (fast even as the
   taxonomy grows).
2. **Fuzzy pass** (rapidfuzz `token_sort_ratio`, cutoff 90) — only run over
   text not already covered, to catch typos/variants like "Kubernetees"
   without fuzzy-matching the entire taxonomy against the entire text.

## Extraction-quality safeguards

`file_ingestion.py` never silently returns bad text:
- PDFs that pdfplumber under-extracts automatically fall back to PyMuPDF
  (`fitz`), which uses a different layout engine and often recovers more.
- Extraction results carry `likely_bad_extraction` + `warnings` for: no
  text at all (likely scanned image), unusually thin text, and low
  alpha-character ratio (garbled/encoding issues).
- The `/score` formatting sub-score reads these signals directly, so a bad
  parse tanks the formatting score instead of silently producing a
  confident-looking but meaningless final score.

## Performance

- Model loaded once at FastAPI startup (`lifespan`), not per-request.
- Resume + JD embeddings are computed in a single batched `.encode()` call.
- Skill matching is single-pass regex + narrowed fuzzy fallback, not O(taxonomy × text).
- Measured on this machine (CPU, model warm): `/extract` ~0.15s, `/score` ~0.4s — both well under the 1s target.
- `/score/batch` parallelizes real work, not fake concurrency: file
  extraction + skill matching for every resume in the batch run
  concurrently on a shared `ThreadPoolExecutor` (created once at startup,
  sized by `os.cpu_count()`), and semantic similarity for the entire batch
  is one vectorized `model.encode()` call instead of N sequential calls —
  avoids reloading the ~80MB model per worker, which a naive
  process-per-resume approach would force. Measured on this machine: a
  4-file batch runs in ~1.0s wall time vs. ~1.3s for 4 sequential `/score`
  calls, and the gap widens with batch size since the embedding call is
  amortized across all resumes.

## Testing

```bash
# Unit tests (no model load, fast)
python tests/test_skills.py

# Full pipeline smoke test (loads the model, hits both endpoints)
python scripts/generate_sample_resumes.py   # only needed once
python tests/test_end_to_end.py

# Batch endpoint: ranking order, per-file error isolation, real speedup
python tests/test_batch.py
```

## What's deliberately not included

- **LLM fallback for thin extractions** (e.g. a Groq call when parsed text
  looks too sparse to score reliably) — not wired in. It's a reasonable
  next step but needs an API key/external dependency and adds latency +
  non-determinism, which conflicts with "fast, local, deterministic." The
  hook point is `file_ingestion.py`'s `likely_bad_extraction` flag — a
  fallback could branch on that before scoring.
- **mpnet instead of MiniLM** — kept MiniLM per the brief's CPU/latency
  target; swap `MODEL_NAME` in `app/scoring/semantic.py` if you're doing
  low-volume/high-accuracy scoring instead of high-throughput batches.
