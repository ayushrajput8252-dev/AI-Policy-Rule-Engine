import re
import uuid

def chunk_document(document_id: str, page_chunks: list[dict]) -> list[dict]:
    """
    Semantically chunks the document based on Headings (H1, H2, H3), paragraphs, and bullet points.
    Does NOT use token-based chunking.
    
    Expected page_chunks format: [{"metadata": {"page": int}, "text": "markdown string"}, ...]
    """
    chunks = []
    current_section = "General"
    
    heading_pattern = re.compile(r'^(#{1,3})\s+(.*)$', re.MULTILINE)
    
    for page in page_chunks:
        page_num = page.get("metadata", {}).get("page", 0)
        text = page.get("text", "")
        
        # Split by empty lines to get paragraph-like blocks
        blocks = re.split(r'\n\s*\n', text)
        
        for block in blocks:
            block = block.strip()
            if not block:
                continue
                
            # Check if block is a heading
            heading_match = heading_pattern.search(block)
            if heading_match:
                # Update current section and also store the heading as a chunk
                current_section = heading_match.group(2).strip()
            
            chunk_id = str(uuid.uuid4())
            chunks.append({
                "chunk_id": chunk_id,
                "document_id": document_id,
                "page": page_num,
                "section": current_section,
                "content": block
            })
            
    return chunks
