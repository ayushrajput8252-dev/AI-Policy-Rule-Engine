"""Semantic/long-term memory — durable facts ("candidate has 5 years Python",
"role requires VP approval for remote work") stored as embeddings in Pinecone
so any agent can retrieve them by meaning, not just by exact session/subject
id lookup (that's episodic memory's job).

Reuses the same Pinecone index and embedding model as the policy-rules RAG
pipeline (services/canonicalization.py, services/detection.py) but writes
into a separate namespace (settings.PINECONE_MEMORY_NAMESPACE) so agent
memory never mixes into policy-document retrieval results.
"""
import hashlib
import uuid
from typing import Optional

from ..config import settings
from ..services.canonicalization import get_pinecone_index
from ..services.detection import get_embedding_model


def store_fact(entity_id: str, agent_type: str, fact_text: str, metadata: Optional[dict] = None) -> bool:
    fact_text = (fact_text or "").strip()
    if not fact_text:
        return False
    try:
        index = get_pinecone_index()
        model = get_embedding_model()
        vector = model.encode(fact_text).tolist()

        fact_id = f"fact_{entity_id}_{hashlib.md5(fact_text.encode('utf-8')).hexdigest()[:12]}"
        payload = {
            "entity_id": entity_id,
            "agent_type": agent_type,
            "fact_text": fact_text[:2000],
            **(metadata or {}),
        }
        index.upsert(
            vectors=[{"id": fact_id, "values": vector, "metadata": payload}],
            namespace=settings.PINECONE_MEMORY_NAMESPACE,
        )
        return True
    except Exception as e:
        print(f"[Semantic Memory Error]: Failed to store fact for {entity_id}: {e}")
        return False


def retrieve_facts(query_text: str, entity_id: Optional[str] = None, top_k: int = 5) -> list[dict]:
    try:
        index = get_pinecone_index()
        model = get_embedding_model()
        vector = model.encode(query_text).tolist()

        query_kwargs = {
            "vector": vector,
            "top_k": top_k,
            "include_metadata": True,
            "namespace": settings.PINECONE_MEMORY_NAMESPACE,
        }
        if entity_id:
            query_kwargs["filter"] = {"entity_id": {"$eq": entity_id}}

        result = index.query(**query_kwargs)
        matches = result.get("matches", []) if isinstance(result, dict) else getattr(result, "matches", [])
        facts = []
        for m in matches:
            meta = m.get("metadata", {}) if isinstance(m, dict) else getattr(m, "metadata", {}) or {}
            score = m.get("score") if isinstance(m, dict) else getattr(m, "score", None)
            facts.append({"fact_text": meta.get("fact_text", ""), "entity_id": meta.get("entity_id"), "agent_type": meta.get("agent_type"), "score": score})
        return facts
    except Exception as e:
        print(f"[Semantic Memory Error]: Failed to retrieve facts for '{query_text[:40]}': {e}")
        return []
