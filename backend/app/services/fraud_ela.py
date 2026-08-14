import io
import fitz
import numpy as np
from PIL import Image, ImageChops
from ..config import settings

ELA_JPEG_QUALITY = 90

# A freshly rendered (unedited) vector PDF page consistently measures ~16/255
# max diff purely from anti-aliased text edges being requantized on JPEG
# re-save — that's rendering noise, not an editing signal. Real JPG/PNG
# uploads are already-compressed photos, where re-compression noise is much
# lower unless a region was genuinely pasted/edited, so they get the tighter
# threshold. Measured empirically against several freshly-rendered pages.
PDF_ELA_THRESHOLD = 60.0

# Only the first few pages are checked (cost control on large documents), but
# capped instead of hardcoded to page 0 only — tampering on page 2+ of a
# multi-page offer/relieving letter was previously invisible to this check.
MAX_ELA_PAGES = 5

# A pasted/edited region shows up as a *cluster* of elevated-error pixels, not
# a single stray one. Embedded letterhead art, logos, or signature images are
# already-compressed raster content that re-quantizes differently from the
# surrounding vector text/background, producing a handful of legitimately
# "hot" pixels even on an unedited page. Using a high percentile of the
# per-pixel error (instead of the single hottest pixel via getextrema) is far
# more robust to that kind of small, benign hotspot while staying sensitive to
# any region large enough to matter.
ERROR_PERCENTILE = 99.5


def _ela_error_percentile(image: Image.Image) -> float:
    """Resaves the image as JPEG and diffs it against the original — regions that
    were pasted/edited in re-compress differently than the rest of the image,
    showing up as elevated error in the diff. Returns a high percentile of the
    per-pixel max-channel error, robust to small isolated hotspots."""
    rgb = image.convert("RGB")
    buf = io.BytesIO()
    rgb.save(buf, "JPEG", quality=ELA_JPEG_QUALITY)
    buf.seek(0)
    resaved = Image.open(buf)
    diff = ImageChops.difference(rgb, resaved)
    arr = np.asarray(diff)
    per_pixel_max = arr.max(axis=2)  # worst channel per pixel
    return float(np.percentile(per_pixel_max, ERROR_PERCENTILE))


def check_ela(file_path: str, content_type: str) -> dict:
    try:
        if content_type == "pdf":
            threshold = PDF_ELA_THRESHOLD
            doc = fitz.open(file_path)
            page_errors = []
            for page in doc[:MAX_ELA_PAGES]:
                pix = page.get_pixmap(dpi=150)
                image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                page_errors.append(_ela_error_percentile(image))
            max_diff = max(page_errors) if page_errors else 0.0
            pages_checked = len(page_errors)
            source_note = f"{pages_checked} page(s) rendered to image"
        else:
            threshold = settings.FRAUD_ELA_THRESHOLD
            image = Image.open(file_path)
            max_diff = _ela_error_percentile(image)
            pages_checked = 1
            source_note = "original image"
    except Exception as e:
        return {
            "key": "ela",
            "title": "Error Level Analysis",
            "status": "error",
            "score": None,
            "summary": f"ELA could not be run: {e}",
            "details": {},
        }

    score = round(max(0.0, min(100.0, 100.0 * (1 - max_diff / threshold))))
    status = "pass" if score >= 70 else "warn" if score >= 40 else "fail"
    summary = (
        f"Max recompression error {max_diff:.0f}/255 (p{ERROR_PERCENTILE}, {source_note}) — "
        + ("no significant edited-region signal." if status == "pass"
           else "some regions show elevated recompression error, possibly edited/pasted content."
           if status == "warn"
           else "strong recompression-error signal, suggesting pasted or re-edited regions.")
    )

    return {
        "key": "ela",
        "title": "Error Level Analysis",
        "status": status,
        "score": score,
        "summary": summary,
        "details": {"max_diff": round(max_diff, 1), "threshold": threshold, "source": source_note, "pages_checked": pages_checked},
    }
