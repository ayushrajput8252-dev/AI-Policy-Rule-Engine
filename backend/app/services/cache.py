import json
import hashlib
import redis
from ..config import settings

_redis_client = None

def get_redis_client():
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2)
            _redis_client.ping()
        except Exception as e:
            print(f"[Redis Cache Warning]: Connection failed, cache disabled. ({str(e)})")
            _redis_client = False
    return _redis_client if _redis_client else None

def _hash_key(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()

def get_cached_query(document_id: str | None, query: str) -> dict | None:
    r = get_redis_client()
    if not r:
        return None
    try:
        key = f"query_cache:{document_id or 'global'}:{_hash_key(query)}"
        cached = r.get(key)
        if cached:
            print(f"[Redis Cache HIT]: Query '{query[:30]}...' retrieved from cache.")
            return json.loads(cached)
    except Exception as e:
        print(f"[Redis Cache Error]: Failed to read query cache: {e}")
    return None

def set_cached_query(document_id: str | None, query: str, data: dict, ttl_seconds: int = 3600):
    r = get_redis_client()
    if not r:
        return
    try:
        key = f"query_cache:{document_id or 'global'}:{_hash_key(query)}"
        r.setex(key, ttl_seconds, json.dumps(data))
    except Exception as e:
        print(f"[Redis Cache Error]: Failed to write query cache: {e}")

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
