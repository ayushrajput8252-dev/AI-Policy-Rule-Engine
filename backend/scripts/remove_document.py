"""
Fully removes a document from the RAG engine: its chunk/rule vectors in
Pinecone, its Chunk/Rule rows in SQLite, and the Document row itself. Used
before re-ingesting an edited source file, so the old (now-stale) content
doesn't keep coexisting with — and potentially contradicting — the updated
version once it's re-ingested as a fresh document_id.

Usage:
    venv/Scripts/python.exe scripts/remove_document.py <document_id>
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal  # noqa: E402
from app.models import Chunk, Document, Rule  # noqa: E402
from app.services.cache import flush_query_cache  # noqa: E402
from app.services.canonicalization import delete_vectors_by_ids  # noqa: E402


def remove_document(document_id: str) -> dict:
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        chunk_rows = db.query(Chunk).filter(Chunk.document_id == document_id).all()
        rule_rows = db.query(Rule).filter(Rule.document_id == document_id).all()

        vector_ids = [f"chunk_{c.id}" for c in chunk_rows] + [f"rule_{r.id}" for r in rule_rows]
        delete_vectors_by_ids(vector_ids)

        for c in chunk_rows:
            db.delete(c)
        for r in rule_rows:
            db.delete(r)
        if doc:
            db.delete(doc)
        db.commit()

        flushed = flush_query_cache()
        result = {
            "document_id": document_id,
            "document_found": doc is not None,
            "chunks_removed": len(chunk_rows),
            "rules_removed": len(rule_rows),
            "vectors_removed": len(vector_ids),
            "cache_flushed": flushed,
        }
        print(f"[Remove] {result}")
        return result
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/remove_document.py <document_id>")
        sys.exit(1)
    remove_document(sys.argv[1])
