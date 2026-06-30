from .detection import get_embedding_model
from .canonicalization import get_pinecone_index

def retrieve_rules(query: str, top_k: int = 5) -> list[dict]:
    """
    Embeds the user query and retrieves the top_k most relevant rules from Pinecone.
    """
    model = get_embedding_model()
    query_vector = model.encode(query).tolist()
    
    index = get_pinecone_index()
    
    response = index.query(
        vector=query_vector,
        top_k=top_k,
        include_metadata=True
    )
    
    retrieved_rules = []
    for match in response.matches:
        retrieved_rules.append({
            "rule_id": match.id,
            "score": match.score,
            "metadata": match.metadata
        })
        
    return retrieved_rules
