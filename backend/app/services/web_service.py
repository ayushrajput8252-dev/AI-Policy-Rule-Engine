import requests
from bs4 import BeautifulSoup
from ..config import settings
from .parsing import text_to_blocks
from .resilience import call_with_resilience, CircuitOpenError

USER_AGENT = "Mozilla/5.0 (compatible; AgenticFlowBot/1.0; +policy-engine)"
MIN_BLOCK_CHARS = 400
TAVILY_SEARCH_URL = "https://api.tavily.com/search"


def _tavily_search_raw(query: str, max_results: int) -> list[dict]:
    resp = requests.post(
        TAVILY_SEARCH_URL,
        json={
            "api_key": settings.TAVILY_API_KEY,
            "query": query,
            "search_depth": "basic",
            "max_results": max_results,
        },
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()
    return [
        {
            "title": r.get("title", ""),
            "url": r.get("url", ""),
            "content": r.get("content", ""),
        }
        for r in data.get("results", [])
        if r.get("content")
    ]


def tavily_search(query: str, max_results: int = 5) -> list[dict]:
    """
    Live web search via Tavily, used as the assistant's last-resort fallback when
    neither the extracted policy rules nor the indexed document chunks answer the
    question — e.g. general knowledge or anything outside the uploaded documents.
    Returns a list of {title, url, content} results, or [] if no key is configured
    or the request fails (callers treat that the same as "no results").
    Circuit-breaker + retry protected so a Tavily outage fails fast instead of
    stalling every "info missing" answer behind a full timeout.
    """
    if not settings.TAVILY_API_KEY:
        return []
    try:
        return call_with_resilience(
            "tavily", _tavily_search_raw, query, max_results,
            max_attempts=2, base_delay=0.3, max_delay=2.0,
        )
    except CircuitOpenError as e:
        print(f"[Tavily Search Warning]: circuit open, {e}")
        return []
    except Exception as e:
        print(f"[Tavily Search Warning]: {e}")
        return []


def fetch_url_text(url: str) -> dict:
    """Fetches a URL and extracts a clean readable title + body text."""
    resp = call_with_resilience(
        "web_crawl", requests.get, url, headers={"User-Agent": USER_AGENT}, timeout=20,
        max_attempts=2, base_delay=0.3, max_delay=2.0,
    )
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
    return text_to_blocks(data["text"], MIN_BLOCK_CHARS), data["title"]
