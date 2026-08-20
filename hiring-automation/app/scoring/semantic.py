"""
Semantic similarity between resume and job description text using
sentence-transformers/all-MiniLM-L6-v2 (CPU-friendly, ~80MB).

The model is expensive to load (~1-2s) but cheap to run once loaded, so it
must be instantiated exactly once at process startup (see app/main.py's
startup hook) and reused across requests via `get_model()`.
"""
from functools import lru_cache
from typing import List, Tuple

import numpy as np
from sentence_transformers import SentenceTransformer

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
BATCH_ENCODE_SIZE = 32  # internal mini-batch size for model.encode()


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    return SentenceTransformer(MODEL_NAME, device="cpu")


def preload_model() -> None:
    """Call at FastAPI startup so the first real request isn't slowed down
    by model loading."""
    get_model()


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def _similarity_to_score(sim: float) -> float:
    # Cosine similarity is in [-1, 1]; clamp then scale to 0-100.
    sim_clamped = max(-1.0, min(1.0, sim))
    return round((sim_clamped + 1) / 2 * 100, 2)


def semantic_similarity_batch(resume_texts: List[str], jd_text: str) -> Tuple[List[float], str]:
    """Embeds the JD once and all resume texts in a SINGLE model.encode()
    call, then computes cosine similarity of each resume embedding against
    the one JD embedding. Order of the returned list matches resume_texts.

    This is the real parallelism primitive for batch scoring: one shared
    model, one vectorized call across N inputs, instead of N separate
    encode() calls (which would re-pay Python/tokenization overhead per
    resume for no benefit, since the model itself is a single-instance
    singleton either way).
    """
    model = get_model()
    n = len(resume_texts)
    if n == 0:
        return [], MODEL_NAME
    if not jd_text.strip():
        return [0.0] * n, MODEL_NAME

    non_empty_idx = [i for i, t in enumerate(resume_texts) if t.strip()]
    scores = [0.0] * n
    if not non_empty_idx:
        return scores, MODEL_NAME

    texts = [jd_text] + [resume_texts[i] for i in non_empty_idx]
    embeddings = model.encode(
        texts,
        batch_size=BATCH_ENCODE_SIZE,
        convert_to_numpy=True,
        normalize_embeddings=False,
        show_progress_bar=False,
    )
    jd_emb, resume_embs = embeddings[0], embeddings[1:]
    for idx, emb in zip(non_empty_idx, resume_embs):
        scores[idx] = _similarity_to_score(cosine_similarity(jd_emb, emb))
    return scores, MODEL_NAME


def semantic_similarity_score(resume_text: str, jd_text: str) -> Tuple[float, str]:
    """Returns (score 0-100, model name) for a single resume/JD pair.
    Delegates to the batch function with a batch of one so there is only
    one encode() code path in the codebase."""
    scores, model_name = semantic_similarity_batch([resume_text], jd_text)
    return scores[0], model_name
