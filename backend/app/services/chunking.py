import re
import uuid

def chunk_document(document_id: str, blocks_data: list[dict]) -> list[dict]:
    """
    Chunks the document based on the text blocks extracted from PDF.
    """
    chunks = []
    current_section = "General"
    heading_pattern = re.compile(r'^(?:[A-Z0-9]+\.|[IVX]+\.)?\s*([A-Z][A-Za-z0-9\s]+)$', re.MULTILINE)
    
    for block in blocks_data:
        text = block.get("text", "")
        # Very basic heading heuristic for plain text blocks
        if len(text) < 100 and '\n' not in text and text.isupper():
            current_section = text.strip()
            
        chunk_id = str(uuid.uuid4())
        chunks.append({
            "chunk_id": chunk_id,
            "document_id": document_id,
            "page": block.get("page"),
            "section": current_section,
            "content": text,
            "bbox": block.get("bbox"),
            "page_dim": block.get("page_dim")
        })
            
    return chunks
