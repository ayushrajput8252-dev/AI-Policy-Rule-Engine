import re
import fitz

MAX_PAGES = 3
HEADER_ZONE_FRACTION = 0.15
HEADER_SIZE_MULTIPLIER = 1.6

# Real single-source documents routinely use 2-4 font "families" once you
# account for embedded PDF font names encoding weight/style as a suffix
# (e.g. "NimbusRomNo9L-Regu" / "-Medi" / "-MediItal" are all the same
# family; "Arial-BoldMT" is the same family as "Arial"). Splitting on the
# first hyphen/comma collapses those variants so the count reflects actual
# distinct typefaces, not bold/italic usage — which is normal in any
# document with headers or emphasis. Calibrated against a real multi-column
# academic PDF (3 genuine families: body serif, one math symbol font, one
# stray title font) so it doesn't cry wolf on ordinary documents.
FLAG_THRESHOLD = 4


def _family_root(font: str) -> str:
    return re.split(r"[-,]", font, maxsplit=1)[0] or font


def check_fonts(file_path: str, content_type: str) -> dict:
    if content_type != "pdf":
        return {
            "key": "fonts",
            "title": "Font & Layout Consistency",
            "status": "na",
            "score": None,
            "summary": "Not applicable to image uploads (no embedded font data).",
            "details": {},
        }

    try:
        doc = fitz.open(file_path)
        all_spans = []
        for page in doc[:MAX_PAGES]:
            page_h = page.rect.height
            raw = page.get_text("dict")
            for block in raw.get("blocks", []):
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text = span.get("text", "").strip()
                        if not text:
                            continue
                        all_spans.append({
                            "font": span.get("font", "?"),
                            "size": round(span.get("size", 0), 1),
                            "y0": span["bbox"][1],
                            "page_h": page_h,
                        })
    except Exception as e:
        return {
            "key": "fonts",
            "title": "Font & Layout Consistency",
            "status": "error",
            "score": None,
            "summary": f"Font consistency check could not be run: {e}",
            "details": {},
        }

    if len(all_spans) < 5:
        return {
            "key": "fonts",
            "title": "Font & Layout Consistency",
            "status": "na",
            "score": None,
            "summary": "Not enough embedded text spans to assess font consistency (likely a scanned document).",
            "details": {},
        }

    sizes = sorted(s["size"] for s in all_spans)
    median_size = sizes[len(sizes) // 2]
    body_spans = [
        s for s in all_spans
        if s["y0"] >= s["page_h"] * HEADER_ZONE_FRACTION
        and s["size"] <= median_size * HEADER_SIZE_MULTIPLIER
    ]
    families = sorted({_family_root(s["font"]) for s in body_spans})
    distinct = len(families)

    score = max(0, min(100, 100 - max(0, distinct - FLAG_THRESHOLD) * 15))
    status = "pass" if distinct <= FLAG_THRESHOLD else ("warn" if score >= 50 else "fail")
    summary = (
        f"Body text draws from {distinct} font famil{'y' if distinct == 1 else 'ies'} — within normal range for a single-source document."
        if distinct <= FLAG_THRESHOLD
        else f"Body text draws from {distinct} distinct font families, more than expected for a single-source document."
    )

    return {
        "key": "fonts",
        "title": "Font & Layout Consistency",
        "status": status,
        "score": score,
        "summary": summary,
        "details": {"distinct_families": distinct, "families": families[:10]},
    }
