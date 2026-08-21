"""
Local, zero-external-call semantic search over what's already in SQLite
(Chunk/Rule content) — the graceful-degradation path for when Pinecone is
unreachable (circuit open) or its free-tier quota is exhausted.

Without this, a Pinecone outage makes retrieve_rules_and_chunks_parallel()
return ([], []) for every query, which pushes reasoning.py's dual-tier
reasoning straight to its Tier 3 web-search fallback for *everything* —
including questions the platform's own indexed content could have answered.
This keeps Tier 1/2 grounding alive using the same local embedding model
(get_embedding_model(), sentence-transformers — already running in-process,
no network call) that computes the query vector in the first place.

Encoding the whole corpus is only paid when the in-memory cache is stale
(row count changed since last build), so steady-state fallback queries stay
fast — this only runs at all while Pinecone is already degraded, so it never
adds latency to the healthy path.
"""
import logging
import threading
import numpy as np
from threading import Lock
from ..database import SessionLocal
from ..models import Chunk, Rule

logger = logging.getLogger(__name__)

# Bounds both worst-case memory during the encode pass (observed live on a
# memory-constrained Windows dev box: encoding the full ~11k-row chunk table
# in one go hit "the paging file is too small for this operation to
# complete") and worst-case rebuild latency. This is a degraded-path
# fallback, not the primary index — a bounded subset beats failing outright.
MAX_FALLBACK_ROWS = 4000
ENCODE_BATCH_SIZE = 16

_cache_lock = Lock()
_chunk_cache: dict = {"count": -1, "ids": [], "vectors": None, "meta": []}
_rule_cache: dict = {"count": -1, "ids": [], "vectors": None, "meta": []}
_building: dict[str, bool] = {"chunk": False, "rule": False}


def _cosine_top_k(query_vector: list[float], vectors: np.ndarray, top_k: int) -> list[tuple[int, float]]:
    if vectors is None or len(vectors) == 0:
        return []
    q = np.asarray(query_vector, dtype=np.float32)
    q_norm = np.linalg.norm(q) or 1e-9
    v_norms = np.linalg.norm(vectors, axis=1)
    v_norms[v_norms == 0] = 1e-9
    scores = (vectors @ q) / (v_norms * q_norm)
    top_idx = np.argsort(-scores)[:top_k]
    return [(int(i), float(scores[i])) for i in top_idx]


def _rebuild_chunk_cache(document_id: str | None):
    from .detection import get_embedding_model

    db = SessionLocal()
    try:
        query = db.query(Chunk)
        if document_id:
            query = query.filter(Chunk.document_id == document_id)
        if not document_id:
            query = query.limit(MAX_FALLBACK_ROWS)
        rows = query.all()
        if not rows:
            return {"count": 0, "ids": [], "vectors": None, "meta": []}

        model = get_embedding_model()
        contents = [r.content or "" for r in rows]
        vectors = np.asarray(model.encode(contents, batch_size=ENCODE_BATCH_SIZE, show_progress_bar=False), dtype=np.float32)
        meta = [
            {
                "chunk_id": r.id,
                "document_id": r.document_id,
                "page": r.page,
                "section": r.section,
                "content": (r.content or "")[:1000],
            }
            for r in rows
        ]
        return {"count": len(rows), "ids": [r.id for r in rows], "vectors": vectors, "meta": meta}
    finally:
        db.close()


def _rebuild_rule_cache(document_id: str | None):
    from .detection import get_embedding_model

    db = SessionLocal()
    try:
        query = db.query(Rule)
        if document_id:
            query = query.filter(Rule.document_id == document_id)
        if not document_id:
            query = query.limit(MAX_FALLBACK_ROWS)
        rows = query.all()
        if not rows:
            return {"count": 0, "ids": [], "vectors": None, "meta": []}

        model = get_embedding_model()
        texts = [f"Finding: {r.canonical_rule}. Context: {r.condition}." for r in rows]
        vectors = np.asarray(model.encode(texts, batch_size=ENCODE_BATCH_SIZE, show_progress_bar=False), dtype=np.float32)
        meta = [
            {
                "rule_id": r.id,
                "document_id": r.document_id,
                "canonical_rule": r.canonical_rule,
                "type": r.type,
                "page": r.page,
                "section": r.section,
            }
            for r in rows
        ]
        return {"count": len(rows), "ids": [r.id for r in rows], "vectors": vectors, "meta": meta}
    finally:
        db.close()


def _rebuild_in_background(vector_type: str):
    def _run():
        try:
            rebuilt = _rebuild_chunk_cache(None) if vector_type == "chunk" else _rebuild_rule_cache(None)
            target = _chunk_cache if vector_type == "chunk" else _rule_cache
            target.update(rebuilt)
            logger.info("[Local Fallback Retrieval] %s cache ready (%d rows).", vector_type, rebuilt["count"])
        except Exception as e:
            logger.error("[Local Fallback Retrieval] Background %s cache build failed: %s", vector_type, e)
        finally:
            _building[vector_type] = False

    threading.Thread(target=_run, name=f"local-fallback-cache-{vector_type}", daemon=True).start()


def _get_cache(vector_type: str, document_id: str | None) -> dict:
    # document_id-scoped queries bypass the shared cache (they're rare —
    # normally called with document_id=None across the whole corpus — and
    # correctness for a scoped query matters more than reusing the cache).
    # This corpus can run into the thousands of rows, so encoding it all is
    # too slow to do inline on a request thread — it's built once in the
    # background (kicked off at startup via prewarm_caches(), and refreshed
    # the same way whenever a query notices the row count has drifted) and
    # served from whatever's cached in the meantime, even if that means an
    # empty result on the very first request before the initial build lands.
    if document_id:
        return _rebuild_chunk_cache(document_id) if vector_type == "chunk" else _rebuild_rule_cache(document_id)

    cache_ref = _chunk_cache if vector_type == "chunk" else _rule_cache
    with _cache_lock:
        if _building[vector_type]:
            return cache_ref

        db = SessionLocal()
        try:
            current_count = db.query(Chunk if vector_type == "chunk" else Rule).count()
        finally:
            db.close()
        # Compare against the same cap the rebuild itself applies — otherwise
        # a corpus larger than MAX_FALLBACK_ROWS would never look "up to
        # date" (built count always < true row count) and every call would
        # re-trigger a rebuild forever.
        current_count = min(current_count, MAX_FALLBACK_ROWS)

        if cache_ref["count"] != current_count:
            logger.info(
                "[Local Fallback Retrieval] %s cache stale (%d -> %d rows), rebuilding in background...",
                vector_type, cache_ref["count"], current_count,
            )
            _building[vector_type] = True
            _rebuild_in_background(vector_type)
        return cache_ref


def prewarm_caches():
    """
    Kicks off both caches' initial build in the background — call once at
    backend startup so the local fallback is likely already warm by the time
    Pinecone actually needs it, instead of the very first degraded query
    paying the full encode cost (or getting an empty result).
    """
    for vector_type in ("chunk", "rule"):
        with _cache_lock:
            if not _building[vector_type]:
                _building[vector_type] = True
                _rebuild_in_background(vector_type)


def local_semantic_search(query_vector: list[float], vector_type: str, top_k: int = 5, document_id: str | None = None) -> list[dict]:
    """
    Returns matches shaped like retrieval.py's Pinecone matches
    ({"id", "score", "metadata"}) so callers don't need to know whether the
    result came from Pinecone or this local fallback.
    """
    try:
        cache = _get_cache(vector_type, document_id)
    except Exception as e:
        logger.error("[Local Fallback Retrieval] Cache build failed (%s): %s", vector_type, e)
        return []

    if cache.get("vectors") is None:
        return []

    top = _cosine_top_k(query_vector, cache["vectors"], top_k)
    results = []
    id_prefix = "chunk_" if vector_type == "chunk" else "rule_"
    for idx, score in top:
        results.append({
            "id": f"{id_prefix}{cache['ids'][idx]}",
            "score": score,
            "metadata": {**cache["meta"][idx], "vector_type": vector_type},
        })
    return results
