import spacy
from sentence_transformers import SentenceTransformer
from scipy.spatial.distance import cosine

# Load spaCy model for dependency parsing
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Warning: en_core_web_sm not found. Attempting to download...")
    from spacy.cli import download
    download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

# Load SentenceTransformer for embeddings (BAAI/bge-large-en-v1.5)
# This model will be downloaded on first run.
# For a production system, you would want to instantiate this once on startup.
# We'll use a global variable to cache it.
_embedding_model = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer("BAAI/bge-base-en-v1.5")
    return _embedding_model

KEYWORDS = [
    "must", "should", "shall", "prohibited", "forbidden", 
    "avoid", "required", "always", "never", "recommended"
]

# A small curated rule corpus to compare against for similarity detection
CURATED_RULES = [
    "Employees must wear ID badges while on company premises.",
    "Contractors are prohibited from accessing confidential data.",
    "Users should save their work regularly.",
    "You are required to report all security incidents immediately."
]
_curated_embeddings = None

def get_curated_embeddings():
    global _curated_embeddings
    if _curated_embeddings is None:
        model = get_embedding_model()
        _curated_embeddings = model.encode(CURATED_RULES)
    return _curated_embeddings

def detect_candidate(text: str) -> dict:
    """
    Hybrid candidate detection. Returns a candidate score based on:
    1. Keyword Rules
    2. Imperative Detection (spaCy)
    3. Embedding Similarity against curated rule corpus
    
    Target reduction: 80-95%
    """
    text_lower = text.lower()
    score = 0
    
    # Layer 1: Keyword Rules
    if any(keyword in text_lower for keyword in KEYWORDS):
        score += 30
        
    # Layer 2 & 3: Imperative Detection & Dependency Parsing
    doc = nlp(text)
    has_verb_object = False
    for token in doc:
        if token.pos_ == "VERB":
            # Check for direct object
            for child in token.children:
                if child.dep_ in ("dobj", "pobj"):
                    has_verb_object = True
                    break
    
    if has_verb_object:
        score += 30
        
    # Layer 4: Embedding Similarity
    model = get_embedding_model()
    text_emb = model.encode([text])[0]
    curated_embs = get_curated_embeddings()
    
    # Calculate max cosine similarity with curated rules (1 - cosine distance)
    max_similarity = max(1 - cosine(text_emb, cur_emb) for cur_emb in curated_embs)
    
    if max_similarity > 0.7:
        score += 40
        
    # Total score out of 100
    # Normalize somewhat
    final_score = min(100, score)
    
    return {
        "is_candidate": final_score > 50, # Threshold for keeping
        "candidate_score": final_score
    }
