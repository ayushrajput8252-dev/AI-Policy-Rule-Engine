"""
Classification service for policy and business rules.
Uses lightweight rule taxonomy heuristics and LLM batch classification.
"""

LABELS = [
    "RULE", "GUIDELINE", "PRINCIPLE", "OBLIGATION", "PROHIBITION",
    "PERMISSION", "RECOMMENDATION", "FACT", "STORY", "EXAMPLE", "DEFINITION"
]

DISCARD_LABELS = ["FACT", "STORY", "EXAMPLE", "DEFINITION"]

def classify_rule(text: str) -> dict:
    """
    Fast rule classification without loading heavy CPU-bound transformers pipelines.
    Detailed classification is handled directly within the Gemini batch LLM pipeline.
    """
    text_lower = text.lower()
    
    if any(word in text_lower for word in ["must not", "prohibited", "forbidden", "shall not", "banned"]):
        rule_type = "PROHIBITION"
    elif any(word in text_lower for word in ["must", "shall", "required to", "mandatory"]):
        rule_type = "OBLIGATION"
    elif any(word in text_lower for word in ["may", "permitted", "allowed", "entitled"]):
        rule_type = "PERMISSION"
    elif any(word in text_lower for word in ["should", "recommended", "encouraged", "advisable"]):
        rule_type = "RECOMMENDATION"
    else:
        rule_type = "GUIDELINE"
        
    return {
        "is_valid_rule": rule_type not in DISCARD_LABELS,
        "type": rule_type,
        "classification_score": 0.90
    }

