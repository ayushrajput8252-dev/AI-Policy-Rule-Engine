"""
Upload constraints shared by the single-file endpoints (/extract, /score)
and the batch endpoint (/score/batch). Kept out of main.py so
app/scoring/pipeline.py can import these without importing main.py itself
(main.py imports pipeline.py, not the other way round).
"""
from typing import Optional

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB per file (unchanged from today)
SUPPORTED_EXTENSIONS = (".pdf", ".docx")  # unchanged from today

MAX_BATCH_FILES = 25  # hard cap on files per /score/batch request
MAX_BATCH_TOTAL_BYTES = 60 * 1024 * 1024  # 60 MB combined, enforced while reading uploads
BATCH_TIMEOUT_SECONDS = 120  # ceiling for the whole batch request


def validate_upload_bytes(filename: Optional[str], raw_bytes: bytes) -> Optional[str]:
    """Same checks the single-file endpoints apply, but returns an error
    message instead of raising — so a per-file failure in a batch can
    become a CandidateResult.error instead of failing the whole request."""
    if not filename or not filename.lower().endswith(SUPPORTED_EXTENSIONS):
        return f"Unsupported file type. Supported: {', '.join(SUPPORTED_EXTENSIONS)}"
    if len(raw_bytes) == 0:
        return "Uploaded file is empty."
    if len(raw_bytes) > MAX_FILE_SIZE_BYTES:
        return "File too large (max 10MB)."
    return None
