import requests
from bs4 import BeautifulSoup

USER_AGENT = "Mozilla/5.0 (compatible; AgenticFlowBot/1.0; +policy-engine)"
MIN_BLOCK_CHARS = 400


def fetch_url_text(url: str) -> dict:
    """Fetches a URL and extracts a clean readable title + body text."""
    resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=20)
    resp.raise_for_status()

    content_type = resp.headers.get("content-type", "")
    if "html" not in content_type and "text" not in content_type:
        raise ValueError(f"Unsupported content type for crawling: {content_type or 'unknown'}")

    soup = BeautifulSoup(resp.text, "html.parser")

    for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "svg", "form", "iframe"]):
        tag.decompose()

    title = soup.title.string.strip() if soup.title and soup.title.string else url

    main = soup.find("main") or soup.find("article") or soup.body or soup
    text = main.get_text(separator="\n")
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    cleaned = "\n".join(lines)

    if not cleaned:
        raise ValueError("No readable text content found at this URL.")

    return {"title": title, "text": cleaned}


def crawl_url_to_blocks(url: str) -> tuple[list[dict], str]:
    """
    Crawls a URL and converts its text into block dicts shaped like parse_pdf()'s
    output (page/text/bbox/page_dim), so it can flow through the same
    chunk_document() -> rule-extraction pipeline used for PDF uploads.
    """
    data = fetch_url_text(url)
    paragraphs = [p.strip() for p in data["text"].split("\n") if p.strip()]

    blocks: list[str] = []
    buffer: list[str] = []
    buffer_len = 0
    for para in paragraphs:
        buffer.append(para)
        buffer_len += len(para)
        if buffer_len >= MIN_BLOCK_CHARS:
            blocks.append("\n".join(buffer))
            buffer, buffer_len = [], 0
    if buffer:
        blocks.append("\n".join(buffer))

    blocks_data = [
        {"page": i + 1, "text": block, "bbox": None, "page_dim": None}
        for i, block in enumerate(blocks)
    ]
    return blocks_data, data["title"]
