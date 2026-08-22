import json
import hashlib
import time
import redis
from ..config import settings

_redis_client = None
_last_failure_at = 0.0
RETRY_COOLDOWN_SECONDS = 30

def get_redis_client():
    """Returns a connected Redis client, or None if Redis isn't reachable.

    A failed connection is cached for RETRY_COOLDOWN_SECONDS (not
    permanently) — otherwise a long-running process that started before
    Redis came up (e.g. `docker compose up redis` after the backend was
    already running) would stay disabled until restart, even once Redis is
    actually reachable."""
    global _redis_client, _last_failure_at
    if _redis_client is None and (time.monotonic() - _last_failure_at) > RETRY_COOLDOWN_SECONDS:
        try:
            client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2)
            client.ping()
            _redis_client = client
        except Exception as e:
            print(f"[Redis Cache Warning]: Connection failed, cache disabled. ({str(e)})")
            _last_failure_at = time.monotonic()
    return _redis_client

def _hash_key(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()

def get_cached_query(document_id: str | None, query: str, top_k: int = 5) -> dict | None:
    r = get_redis_client()
    if not r:
        return None
    try:
        key = f"query_cache:{document_id or 'global'}:{top_k}:{_hash_key(query)}"
        cached = r.get(key)
        if cached:
            print(f"[Redis Cache HIT]: Query '{query[:30]}...' retrieved from cache.")
            return json.loads(cached)
    except Exception as e:
        print(f"[Redis Cache Error]: Failed to read query cache: {e}")
    return None

def set_cached_query(document_id: str | None, query: str, data: dict, top_k: int = 5, ttl_seconds: int = 3600):
    r = get_redis_client()
    if not r:
        return
    try:
        key = f"query_cache:{document_id or 'global'}:{top_k}:{_hash_key(query)}"
        r.setex(key, ttl_seconds, json.dumps(data))
    except Exception as e:
        print(f"[Redis Cache Error]: Failed to write query cache: {e}")

def flush_query_cache() -> int:
    """Drops every cached /query answer (embedding cache untouched — those
    stay valid regardless of what's indexed). Meant to be called right after
    ingesting a document that should immediately ground new answers — e.g.
    ground-truth product docs — so a stale cache entry from before that
    ingestion (up to the 1hr TTL) can't keep serving an answer that predates
    the new source. Returns the number of keys removed."""
    r = get_redis_client()
    if not r:
        return 0
    try:
        keys = list(r.scan_iter("query_cache:*"))
        if keys:
            r.delete(*keys)
        return len(keys)
    except Exception as e:
        print(f"[Redis Cache Error]: Failed to flush query cache: {e}")
        return 0

def get_cached_embedding(text: str) -> list[float] | None:
    r = get_redis_client()
    if not r:
        return None
    try:
        key = f"emb_cache:{_hash_key(text)}"
        cached = r.get(key)
        if cached:
            return json.loads(cached)
    except Exception as e:
        print(f"[Redis Cache Error]: Failed to read embedding cache: {e}")
    return None

def set_cached_embedding(text: str, vector: list[float], ttl_seconds: int = 86400):
    r = get_redis_client()
    if not r:
        return
    try:
        key = f"emb_cache:{_hash_key(text)}"
        r.setex(key, ttl_seconds, json.dumps(vector))
    except Exception as e:
        print(f"[Redis Cache Error]: Failed to write embedding cache: {e}")
