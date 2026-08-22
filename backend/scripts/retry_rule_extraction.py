"""
Re-runs just the rule-extraction stage of the ingestion pipeline
(worker.py's _process_text_blocks) against a document's already-chunked,
already-embedded content — for when that stage failed on a transient LLM
provider error during the original ingestion (rate limits, a 503, etc.)
without needing to re-chunk or re-embed anything.

Usage:
    venv/Scripts/python.exe scripts/retry_rule_extraction.py <document_id>
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from concurrent.futures import ThreadPoolExecutor, as_completed  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import Chunk  # noqa: E402
from app.services.cache import flush_query_cache  # noqa: E402
from app.services.canonicalization import canonicalize_and_store_rule  # noqa: E402
from app.services.classification import DISCARD_LABELS, classify_rule  # noqa: E402
from app.services.extraction import extract_rules_batch  # noqa: E402
from app.services.validation import validate_rule  # noqa: E402

MIN_RULE_CONFIDENCE = 70
BATCH_SIZE = 10
RULE_EXTRACTION_WORKERS = 3


def retry_rule_extraction(document_id: str) -> dict:
    db = SessionLocal()
    try:
        rows = db.query(Chunk).filter(Chunk.document_id == document_id).all()
        if not rows:
            raise ValueError(f"No chunks found for document_id={document_id!r} — was it ingested?")

        chunks = [
            {"chunk_id": r.id, "document_id": r.document_id, "page": r.page, "section": r.section, "content": r.content}
            for r in rows
        ]
        print(f"[Retry] Re-running rule extraction over {len(chunks)} existing chunks for {document_id}")

        valid_rules_count = 0
        batches = [chunks[i : i + BATCH_SIZE] for i in range(0, len(chunks), BATCH_SIZE)]

        with ThreadPoolExecutor(max_workers=RULE_EXTRACTION_WORKERS) as executor:
            future_to_batch = {executor.submit(extract_rules_batch, batch): batch for batch in batches}
            for future in as_completed(future_to_batch):
                batch = future_to_batch[future]
                try:
                    batch_results = future.result()
                except Exception as batch_err:
                    print(f"[Retry Warning] Batch failed, skipping: {batch_err}")
                    continue

                for res in batch_results:
                    chunk_idx = res.get("chunk_index")
                    c = batch[chunk_idx] if chunk_idx is not None and 0 <= chunk_idx < len(batch) else (batch[0] if batch else {})

                    if not res.get("is_candidate", True):
                        continue

                    extracted = {
                        "key_finding": res.get("key_finding", c.get("content", "")[:200]),
                        "context": res.get("condition") or c.get("content", ""),
                        "actor": res.get("actor", "N/A"),
                        "action": res.get("action", "N/A"),
                        "type": res.get("type", "GUIDELINE"),
                        "confidence": res.get("confidence", 85),
                    }

                    classification = classify_rule(extracted["key_finding"] or c.get("content", ""))
                    if classification.get("type") in DISCARD_LABELS:
                        continue
                    if extracted["confidence"] < MIN_RULE_CONFIDENCE:
                        continue

                    try:
                        validation = validate_rule(c.get("content", ""), extracted)
                        if isinstance(validation, dict) and str(validation.get("status", "")).upper() == "INVALID":
                            continue
                    except Exception as validation_err:
                        print(f"[Retry Warning] Skipping validation due to error: {validation_err}")

                    canonicalize_and_store_rule(
                        document_id=document_id,
                        page=c.get("page"),
                        section=c.get("section"),
                        rule_data=extracted,
                        db_session=db,
                    )
                    valid_rules_count += 1

        print(f"[Retry] Extracted {valid_rules_count} valid rules for {document_id}")
        flushed = flush_query_cache()
        print(f"[Retry] flushed {flushed} cached /query answer(s)")
        return {"document_id": document_id, "chunks_seen": len(chunks), "rules_extracted": valid_rules_count}
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/retry_rule_extraction.py <document_id>")
        sys.exit(1)
    print(retry_rule_extraction(sys.argv[1]))
