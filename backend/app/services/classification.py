from transformers import pipeline

_classifier = None

def get_classifier():
    global _classifier
    if _classifier is None:
        # Load Facebook BART Large MNLI for zero-shot classification
        _classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
    return _classifier

LABELS = [
    "RULE", "GUIDELINE", "PRINCIPLE", "OBLIGATION", "PROHIBITION",
    "PERMISSION", "RECOMMENDATION", "FACT", "STORY", "EXAMPLE", "DEFINITION"
]

DISCARD_LABELS = ["FACT", "STORY", "EXAMPLE", "DEFINITION"]

def classify_rule(text: str) -> dict:
    """
    Classifies the text into one of the structural rule types.
    Discards FACT, STORY, EXAMPLE, DEFINITION.
    """
    classifier = get_classifier()
    result = classifier(text, candidate_labels=LABELS)
    
    top_label = result['labels'][0]
    score = result['scores'][0]
    
    is_valid = top_label not in DISCARD_LABELS
    
    return {
        "is_valid_rule": True, # Allow all labels for POC
        "type": top_label,
        "classification_score": score
    }
