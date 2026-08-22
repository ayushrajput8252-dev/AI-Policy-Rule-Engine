"""
Ingests a local file (PDF, audio, or plain text/markdown) through the exact
same pipeline real /api/v1/upload uploads use — chunking, LLM rule
extraction, and Pinecone + SQLite indexing (see worker.py's
process_document_task / _process_text_blocks). Once ingested it's permanent
and queryable exactly like any other uploaded document: the AI Assistant
widget and /rag both answer from it via /api/v1/query, which already tries
indexed rules/chunks before ever falling back to a live web search.

Useful for documents that aren't a user-facing upload (nothing to click
"Upload" on) but should still ground the platform's own answers about
itself — e.g. a product overview/FAQ doc.

Usage:
    venv/Scripts/python.exe scripts/ingest_local_document.py <path> [--name "Display Name"]
"""
import argparse
import os
import shutil
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal  # noqa: E402
from app.models import Document  # noqa: E402
from app.services.cache import flush_query_cache  # noqa: E402
from app.worker import process_document_task  # noqa: E402

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
SUPPORTED_EXTS = {".pdf", ".md", ".txt"}


def ingest_local_document(source_path: str, display_name: str | None = None) -> dict:
    if not os.path.isfile(source_path):
        raise FileNotFoundError(source_path)

    ext = os.path.splitext(source_path)[1].lower()
    if ext not in SUPPORTED_EXTS:
        raise ValueError(f"Unsupported extension for ingestion: {ext!r} (expected one of {sorted(SUPPORTED_EXTS)})")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    doc_id = str(uuid.uuid4())
    filename = display_name or os.path.basename(source_path)
    dest_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{os.path.basename(source_path)}")
    shutil.copyfile(source_path, dest_path)

    db = SessionLocal()
    try:
        db.add(Document(id=doc_id, name=filename))
        db.commit()
    finally:
        db.close()

    print(f"[Ingest] document_id={doc_id} name={filename!r} source={source_path!r} -> {dest_path}")
    result = process_document_task(doc_id, dest_path)
    print(f"[Ingest] result: {result}")

    # Without this, a query asked shortly before this ingestion (and cached
    # for up to an hour — see cache.py) would keep serving its pre-ingestion
    # answer instead of picking up this document, defeating the point of
    # ingesting fresh ground truth.
    flushed = flush_query_cache()
    print(f"[Ingest] flushed {flushed} cached /query answer(s) so this document takes effect immediately")

    return {"document_id": doc_id, **result}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", help="Path to the local file to ingest")
    parser.add_argument("--name", default=None, help="Display name to store for this document (defaults to the filename)")
    args = parser.parse_args()
    ingest_local_document(args.path, args.name)
