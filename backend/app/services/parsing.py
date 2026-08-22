import fitz

MIN_TEXT_BLOCK_CHARS = 400  # paragraphs are buffered up to roughly this size before becoming one block


def text_to_blocks(text: str, min_block_chars: int = MIN_TEXT_BLOCK_CHARS) -> list[dict]:
    """
    Buffers plain text into block dicts shaped like parse_pdf()'s output
    (page/text/bbox/page_dim), so any non-PDF text source — a crawled web
    page, a local markdown/text file — can flow through the same
    chunk_document() -> rule-extraction -> Pinecone pipeline used for PDF
    uploads. bbox/page_dim are None: there's no fixed page layout to trace a
    citation back to for these sources.
    """
    paragraphs = [p.strip() for p in text.splitlines() if p.strip()]

    blocks: list[str] = []
    buffer: list[str] = []
    buffer_len = 0
    for para in paragraphs:
        buffer.append(para)
        buffer_len += len(para)
        if buffer_len >= min_block_chars:
            blocks.append("\n".join(buffer))
            buffer, buffer_len = [], 0
    if buffer:
        blocks.append("\n".join(buffer))

    return [{"page": i + 1, "text": block, "bbox": None, "page_dim": None} for i, block in enumerate(blocks)]


def parse_text_file(file_path: str) -> list[dict]:
    """Reads a local .md/.txt file and blocks it the same way a crawled URL is blocked (see web_service.crawl_url_to_blocks)."""
    with open(file_path, "r", encoding="utf-8") as f:
        raw = f.read()
    if not raw.strip():
        raise Exception(f"Text file {file_path} is empty.")
    return text_to_blocks(raw)


def parse_pdf(file_path: str) -> list[dict]:
    """
    Parses a PDF file and returns a list of text blocks with their bounding boxes.
    """
    try:
        doc = fitz.open(file_path)
        blocks_data = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            page_w = page.rect.width
            page_h = page.rect.height
            blocks = page.get_text("blocks")
            for b in blocks:
                # b is (x0, y0, x1, y1, text, block_no, block_type)
                x0, y0, x1, y1, text, block_no, block_type = b
                if block_type != 0:
                    continue # skip images
                text = text.strip()
                if not text:
                    continue
                blocks_data.append({
                    "page": page_num + 1,
                    "text": text,
                    "bbox": [x0, y0, x1 - x0, y1 - y0],
                    "page_dim": [page_w, page_h]
                })
        return blocks_data
    except Exception as e:
        raise Exception(f"Failed to parse PDF {file_path}: {str(e)}")
