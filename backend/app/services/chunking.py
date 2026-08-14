import re
import uuid

# Numbered/title-case heading pattern, e.g. "1. Data Retention", "III. Scope",
# "Data Retention Policy". Used alongside the ALL CAPS heuristic below so
# non-uppercase section titles are still recognized as section boundaries.
heading_pattern = re.compile(r'^(?:[A-Z0-9]+\.|[IVX]+\.)?\s*([A-Z][A-Za-z0-9\s]+)$')

MIN_BLOCK_CHARS = 40    # blocks shorter than this are folded into the next block
MAX_CHUNK_CHARS = 1500  # blocks longer than this are split into overlapping windows
SUB_CHUNK_SIZE = 900    # target size of each overlapping sub-chunk
SUB_CHUNK_OVERLAP = 135  # ~15% overlap between consecutive sub-chunks


def _is_heading(text: str) -> bool:
    """
    Detects section headings from either an ALL CAPS heuristic (legacy
    behavior) or a numbered/title-case pattern like "1. Data Retention".
    """
    stripped = text.strip()
    if not stripped or len(stripped) >= 100 or "\n" in stripped:
        return False
    if stripped.isupper():
        return True
    return bool(heading_pattern.match(stripped))


def _split_large_block(text: str, size: int = SUB_CHUNK_SIZE, overlap: int = SUB_CHUNK_OVERLAP) -> list[str]:
    """
    Splits an oversized text block into overlapping windows so a single giant
    block isn't embedded/stored as one undifferentiated chunk.
    """
    if len(text) <= MAX_CHUNK_CHARS:
        return [text]

    windows = []
    start = 0
    text_len = len(text)
    step = max(1, size - overlap)
    while start < text_len:
        end = min(start + size, text_len)
        windows.append(text[start:end])
        if end >= text_len:
            break
        start += step
    return windows


def _merge_tiny_blocks(blocks_data: list[dict]) -> list[dict]:
    """
    Folds tiny, non-heading blocks (e.g. stray page numbers, running headers,
    single-line fragments) into the block that follows them, so they aren't
    embedded as noisy standalone micro-chunks. Heading blocks are never
    merged away - the clean heading text is preserved for section tracking
    even if a tiny prefix ends up prepended to the chunk content.
    """
    merged = []
    pending_prefix = ""

    for block in blocks_data:
        text = block.get("text", "") or ""
        is_heading = _is_heading(text)

        if not is_heading and len(text.strip()) < MIN_BLOCK_CHARS and text.strip():
            pending_prefix = f"{pending_prefix}{text}\n" if pending_prefix else f"{text}\n"
            continue

        if pending_prefix:
            new_block = dict(block)
            new_block["text"] = f"{pending_prefix}{text}" if text else pending_prefix.rstrip("\n")
            new_block["_is_heading"] = is_heading
            new_block["_heading_text"] = text.strip() if is_heading else None
            merged.append(new_block)
            pending_prefix = ""
        else:
            new_block = dict(block)
            new_block["_is_heading"] = is_heading
            new_block["_heading_text"] = text.strip() if is_heading else None
            merged.append(new_block)

    if pending_prefix:
        # Trailing tiny block with nothing left to attach to - keep it as its
        # own block rather than dropping the content.
        last = blocks_data[-1] if blocks_data else {}
        merged.append({
            "page": last.get("page"),
            "text": pending_prefix.rstrip("\n"),
            "bbox": last.get("bbox"),
            "page_dim": last.get("page_dim"),
            "_is_heading": False,
            "_heading_text": None
        })

    return merged


def chunk_document(document_id: str, blocks_data: list[dict]) -> list[dict]:
    """
    Chunks the document based on the text blocks extracted from PDF.

    - Detects section headings via both an ALL CAPS heuristic and a
      numbered/title-case regex, so section tagging works on more real-world
      documents.
    - Merges tiny adjacent blocks into their following block so noisy
      micro-chunks aren't embedded on their own.
    - Splits oversized blocks into overlapping sub-chunks so a single giant
      block isn't stored/embedded as one undifferentiated vector.
    """
    chunks = []
    current_section = "General"

    for block in _merge_tiny_blocks(blocks_data):
        text = block.get("text", "") or ""

        if block.get("_is_heading") and block.get("_heading_text"):
            current_section = block["_heading_text"]

        for sub_text in _split_large_block(text):
            chunk_id = str(uuid.uuid4())
            chunks.append({
                "chunk_id": chunk_id,
                "document_id": document_id,
                "page": block.get("page"),
                "section": current_section,
                "content": sub_text,
                "bbox": block.get("bbox"),
                "page_dim": block.get("page_dim")
            })

    return chunks
