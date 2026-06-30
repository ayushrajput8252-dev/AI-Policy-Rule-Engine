import pymupdf4llm

def parse_pdf(file_path: str) -> list[dict]:
    """
    Parses a PDF file and returns a list of page chunks.
    Each item in the list is a dict containing 'text' (markdown) and 'metadata' (page number, etc.).
    """
    try:
        # Use PyMuPDF4LLM to extract markdown while preserving page chunks
        # This allows us to track page numbers for the extracted content
        md_chunks = pymupdf4llm.to_markdown(doc=file_path, page_chunks=True)
        return md_chunks
    except Exception as e:
        raise Exception(f"Failed to parse PDF {file_path}: {str(e)}")
