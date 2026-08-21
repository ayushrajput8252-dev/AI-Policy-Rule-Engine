import logging
from concurrent.futures import ThreadPoolExecutor
from .detection import get_embedding_model
from .canonicalization import get_pinecone_index
from .cache import get_cached_embedding, set_cached_embedding
from .resilience import call_with_resilience, CircuitOpenError
from .local_fallback_retrieval import local_semantic_search

logger = logging.getLogger(__name__)

def get_query_vector(query: str) -> list[float]:
    """
    Retrieves query vector from Redis cache or computes it using BAAI/bge-base-en-v1.5.
    """
    cached = get_cached_embedding(query)
    if cached:
        return cached
        
    model = get_embedding_model()
    query_vector = model.encode(query).tolist()
    set_cached_embedding(query, query_vector)
    return query_vector

def _query_pinecone_raw(vector: list[float], vector_type: str, top_k: int, document_id: str | None) -> list[dict]:
    index = get_pinecone_index()
    filter_dict = {}
    if document_id:
        filter_dict["document_id"] = {"$eq": document_id}
    if vector_type:
        filter_dict["vector_type"] = {"$eq": vector_type}

    query_args = {
        "vector": vector,
        "top_k": top_k,
        "include_metadata": True
    }
    if filter_dict:
        query_args["filter"] = filter_dict

    response = index.query(**query_args)

    matches = []
    for match in response.matches:
        matches.append({
            "id": match.id,
            "score": match.score,
            "metadata": match.metadata or {}
        })
    return matches


def _query_pinecone(vector: list[float], vector_type: str, top_k: int, document_id: str | None) -> list[dict]:
    """
    Pinecone read, protected by a circuit breaker + short retry (services/
    resilience.py). On an open breaker or exhausted retries — e.g. the known
    free-tier egress-quota 429s — falls back to local_semantic_search() over
    the same content mirrored in SQLite, instead of silently returning [],
    which is what used to push every query straight to web search regardless
    of whether the platform's own indexed content had the answer.
    """
    try:
        return call_with_resilience(
            "pinecone", _query_pinecone_raw, vector, vector_type, top_k, document_id,
            max_attempts=2, base_delay=0.3, max_delay=1.5,
        )
    except CircuitOpenError:
        logger.warning(
            "[Retrieval] Pinecone circuit open — using local fallback retrieval (vector_type=%s).", vector_type
        )
    except Exception as e:
        # Loud, diagnosable failure: a Pinecone outage must not look the same
        # as "no relevant results" in the logs, since callers silently treat
        # an empty list as a valid (if unhelpful) retrieval outcome.
        logger.error(
            "[Retrieval Error] Pinecone search failed (vector_type=%s, top_k=%s, document_id=%s): %s: %s",
            vector_type, top_k, document_id, type(e).__name__, str(e),
            exc_info=True
        )

    if vector_type in ("rule", "chunk"):
        return local_semantic_search(vector, vector_type, top_k, document_id)
    return []

def retrieve_rules(query: str, top_k: int = 5, document_id: str | None = None) -> list[dict]:
    query_vector = get_query_vector(query)
    matches = _query_pinecone(query_vector, "rule", top_k, document_id)
    
    # Fallback to general search if no vector_type tag matches yet (backwards compatibility)
    if not matches:
        matches = _query_pinecone(query_vector, None, top_k, document_id)
        
    results = []
    for m in matches:
        results.append({
            "rule_id": m["id"],
            "score": m["score"],
            "metadata": m["metadata"]
        })
    return results

def retrieve_rules_and_chunks_parallel(query: str, top_k: int = 5, document_id: str | None = None) -> tuple[list[dict], list[dict]]:
    """
    Executes parallel search for Rule vectors and Raw Chunk vectors simultaneously.
    Returns (retrieved_rules, retrieved_chunks).
    """
    query_vector = get_query_vector(query)
    
    with ThreadPoolExecutor(max_workers=2) as executor:
        rules_future = executor.submit(_query_pinecone, query_vector, "rule", top_k, document_id)
        chunks_future = executor.submit(_query_pinecone, query_vector, "chunk", top_k, document_id)
        
        rules_matches = rules_future.result()
        chunks_matches = chunks_future.result()
        
    # If vector_type was not set on older indexes, fallback rules_matches
    if not rules_matches and not chunks_matches:
        all_matches = _query_pinecone(query_vector, None, top_k, document_id)
        rules_matches = all_matches
        
    rules = [{"rule_id": m["id"], "score": m["score"], "metadata": m["metadata"]} for m in rules_matches]
    chunks = [{"chunk_id": m["id"], "score": m["score"], "metadata": m["metadata"]} for m in chunks_matches]
    
    return rules, chunks
