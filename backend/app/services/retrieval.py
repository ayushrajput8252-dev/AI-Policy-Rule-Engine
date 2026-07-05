from .detection import get_embedding_model
from .canonicalization import get_pinecone_index

def retrieve_rules(query: str, top_k: int = 5, document_id: str | None = None) -> list[dict]:
    """
    Embeds the user query and retrieves the top_k most relevant rules from Pinecone.
    """
    model = get_embedding_model()
    query_vector = model.encode(query).tolist()
    
    index = get_pinecone_index()
    
    query_args = {
        "vector": query_vector,
        "top_k": top_k,
        "include_metadata": True
    }
    
    if document_id:
        query_args["filter"] = {"document_id": {"$eq": document_id}}
        
    response = index.query(**query_args)
    
    retrieved_rules = []
    for match in response.matches:
        retrieved_rules.append({
            "rule_id": match.id,
            "score": match.score,
            "metadata": match.metadata
        })
        
    return retrieved_rules
