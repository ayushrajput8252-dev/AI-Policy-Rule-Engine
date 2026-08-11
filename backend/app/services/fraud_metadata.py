import re
from datetime import datetime, timedelta
import fitz
from PIL import Image, ExifTags

EDITING_SOFTWARE_BLOCKLIST = [
    "photoshop", "canva", "gimp", "illustrator", "paint.net", "snapseed",
    "pixlr", "lightroom", "affinity photo", "inkscape", "corel", "picsart",
    "photopea", "fotor",
]

DATE_MISMATCH_TOLERANCE = timedelta(seconds=60)


def _parse_pdf_date(raw: str) -> datetime | None:
    """Parses PDF date format 'D:YYYYMMDDHHmmSS(+HH'mm')' -> naive datetime."""
    if not raw:
        return None
    match = re.match(r"D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?", raw)
    if not match:
        return None
    y, mo, d, h, mi, s = (int(g) if g else 0 for g in match.groups())
    try:
        return datetime(y, mo, d, h, mi, s)
    except ValueError:
        return None


def _check_pdf(file_path: str) -> dict:
    doc = fitz.open(file_path)
    meta = doc.metadata or {}
    producer = (meta.get("producer") or "").strip()
    creator = (meta.get("creator") or "").strip()
    fingerprint = f"{producer} {creator}".lower()

    flags = []
    score = 100

    hit = next((sw for sw in EDITING_SOFTWARE_BLOCKLIST if sw in fingerprint), None)
    if hit:
        flags.append(f"Editing software fingerprint detected: '{hit}' in Producer/Creator metadata.")
        score -= 45

    created = _parse_pdf_date(meta.get("creationDate", ""))
    modified = _parse_pdf_date(meta.get("modDate", ""))
    if created and modified and abs(modified - created) > DATE_MISMATCH_TOLERANCE:
        flags.append(f"Creation date ({created}) and modification date ({modified}) differ by more than a minute.")
        score -= 30

    score = max(0, score)
    status = "pass" if not flags else ("warn" if score >= 50 else "fail")
    return {
        "key": "metadata",
        "title": "Metadata Fingerprint Check",
        "status": status,
        "score": score,
        "summary": flags[0] if flags else "No editing-software fingerprints or date-mismatch flags found in PDF metadata.",
        "details": {
            "producer": producer or None,
            "creator": creator or None,
            "creation_date": str(created) if created else None,
            "mod_date": str(modified) if modified else None,
            "flags": flags,
        },
    }


def _check_image(file_path: str) -> dict:
    img = Image.open(file_path)
    exif = img.getexif()

    flags = []
    score = 100

    tag_map = {ExifTags.TAGS.get(k, k): v for k, v in exif.items()} if exif else {}
    software = str(tag_map.get("Software", "")).lower()

    hit = next((sw for sw in EDITING_SOFTWARE_BLOCKLIST if sw in software), None)
    if hit:
        flags.append(f"Editing software fingerprint detected: '{hit}' in image EXIF Software tag.")
        score -= 45

    dt_original = tag_map.get("DateTimeOriginal")
    dt_modified = tag_map.get("DateTime")
    if dt_original and dt_modified:
        try:
            fmt = "%Y:%m:%d %H:%M:%S"
            d_orig = datetime.strptime(dt_original, fmt)
            d_mod = datetime.strptime(dt_modified, fmt)
            if abs(d_mod - d_orig) > DATE_MISMATCH_TOLERANCE:
                flags.append(f"EXIF original capture time ({d_orig}) and modified time ({d_mod}) differ by more than a minute.")
                score -= 30
        except ValueError:
            pass

    if not tag_map:
        flags.append("No EXIF metadata present — common after re-saving/editing, but not conclusive on its own.")
        score -= 10

    score = max(0, score)
    status = "pass" if not flags else ("warn" if score >= 50 else "fail")
    return {
        "key": "metadata",
        "title": "Metadata Fingerprint Check",
        "status": status,
        "score": score,
        "summary": flags[0] if flags else "No editing-software fingerprints or date-mismatch flags found in image EXIF.",
        "details": {
            "software": tag_map.get("Software"),
            "date_time_original": dt_original,
            "date_time_modified": dt_modified,
            "flags": flags,
        },
    }


def check_metadata(file_path: str, content_type: str) -> dict:
    if content_type == "pdf":
        return _check_pdf(file_path)
    return _check_image(file_path)
