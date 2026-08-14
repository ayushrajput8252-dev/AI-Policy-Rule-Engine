import fitz
import pytesseract
from PIL import Image
from ..config import settings

if settings.TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

MAX_OCR_PAGES = 5
NATIVE_TEXT_MIN_CHARS = 40


def _ocr_image(image: Image.Image) -> tuple[str, float]:
    """Runs Tesseract on a PIL image, returns (text, avg_confidence_0_100)."""
    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    words, confs = [], []
    for i, word in enumerate(data["text"]):
        word = word.strip()
        conf = int(data["conf"][i]) if str(data["conf"][i]).lstrip("-").isdigit() else -1
        if word:
            words.append(word)
        if conf >= 0:
            confs.append(conf)
    text = " ".join(words)
    avg_conf = (sum(confs) / len(confs)) if confs else 0.0
    return text, avg_conf


def extract_text(file_path: str, content_type: str) -> tuple[str, dict]:
    """
    Extracts text from the document and returns (text, step_result).
    PDF: tries the native text layer first, falls back to OCR only if the
    page appears to be a scanned image (no meaningful text layer).
    Image: OCR directly.
    """
    try:
        if content_type == "pdf":
            doc = fitz.open(file_path)
            native_text = "\n".join(page.get_text() for page in doc)

            if len(native_text.strip()) >= NATIVE_TEXT_MIN_CHARS:
                return native_text, {
                    "key": "ocr",
                    "title": "OCR Extraction Quality",
                    "status": "pass",
                    "score": 100,
                    "summary": "Native PDF text layer found — no OCR needed, full extraction confidence.",
                    "details": {"method": "native_text_layer", "pages": len(doc)},
                }

            # Scanned PDF with no usable text layer — OCR the rendered pages.
            texts, confs = [], []
            for page in doc[:MAX_OCR_PAGES]:
                pix = page.get_pixmap(dpi=200)
                img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                page_text, page_conf = _ocr_image(img)
                texts.append(page_text)
                confs.append(page_conf)
            text = "\n".join(texts)
            avg_conf = sum(confs) / len(confs) if confs else 0.0
            status = "pass" if avg_conf >= 70 else "warn" if avg_conf >= 40 else "fail"
            return text, {
                "key": "ocr",
                "title": "OCR Extraction Quality",
                "status": status,
                "score": round(avg_conf, 1),
                "summary": f"Scanned PDF — OCR'd {min(len(doc), MAX_OCR_PAGES)} page(s) at {avg_conf:.0f}% average confidence.",
                "details": {"method": "ocr", "pages_ocred": min(len(doc), MAX_OCR_PAGES)},
            }

        # image
        img = Image.open(file_path)
        if img.mode != "RGB":
            img = img.convert("RGB")
        text, avg_conf = _ocr_image(img)
        status = "pass" if avg_conf >= 70 else "warn" if avg_conf >= 40 else "fail"
        return text, {
            "key": "ocr",
            "title": "OCR Extraction Quality",
            "status": status,
            "score": round(avg_conf, 1),
            "summary": f"Image OCR'd at {avg_conf:.0f}% average word confidence.",
            "details": {"method": "ocr"},
        }
    except Exception as e:
        return "", {
            "key": "ocr",
            "title": "OCR Extraction Quality",
            "status": "error",
            "score": None,
            "summary": f"OCR extraction could not be run: {e}",
            "details": {},
        }
