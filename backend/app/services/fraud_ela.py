import io
import fitz
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


def _ela_max_diff(image: Image.Image) -> float:
    """Resaves the image as JPEG and diffs it against the original — regions that
    were pasted/edited in re-compress differently than the rest of the image,
    showing up as bright spots in the diff."""
    rgb = image.convert("RGB")
    buf = io.BytesIO()
    rgb.save(buf, "JPEG", quality=ELA_JPEG_QUALITY)
    buf.seek(0)
    resaved = Image.open(buf)
    diff = ImageChops.difference(rgb, resaved)
    extrema = diff.getextrema()  # ((r_min,r_max), (g_min,g_max), (b_min,b_max))
    return max(channel_max for _, channel_max in extrema)


def check_ela(file_path: str, content_type: str) -> dict:
    try:
        if content_type == "pdf":
            threshold = PDF_ELA_THRESHOLD
            doc = fitz.open(file_path)
            page = doc[0]
            pix = page.get_pixmap(dpi=150)
            image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            source_note = "first page rendered to image"
        else:
            threshold = settings.FRAUD_ELA_THRESHOLD
            image = Image.open(file_path)
            source_note = "original image"

        max_diff = _ela_max_diff(image)
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
        f"Max recompression error {max_diff:.0f}/255 ({source_note}) — "
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
        "details": {"max_diff": round(max_diff, 1), "threshold": threshold, "source": source_note},
    }
