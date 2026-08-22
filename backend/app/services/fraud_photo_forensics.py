import io
import numpy as np
from PIL import Image, ImageChops

# This is a regional-recompression-consistency check, NOT a neural deepfake
# classifier — there's no pretrained deepfake/face-swap model available in
# this environment. What it CAN detect: a genuine, uncomposited photo has
# fairly uniform recompression error across its whole area, because it was
# saved once by one camera/scanner pipeline. A photo where one region was
# pasted in from elsewhere (a swapped face, a copy-pasted photo on an ID
# card, a spliced signature) was compressed a *second* time only in that
# region, which leaves a spatially-contiguous block of elevated error that
# the rest of the image doesn't share. That's the actual, honest signal this
# check looks for.
JPEG_QUALITY = 90
MAX_DIM = 1024  # downscale cap — cost control, doesn't affect block-relative statistics
GRID = 12  # 12x12 blocks
Z_SCORE_THRESHOLD = 3.5
MIN_ABS_ERROR = 8.0  # ignore "outlier" blocks whose absolute error is trivially small


def _load_bounded(file_path: str) -> Image.Image:
    image = Image.open(file_path).convert("RGB")
    if max(image.size) > MAX_DIM:
        scale = MAX_DIM / max(image.size)
        image = image.resize((max(1, int(image.width * scale)), max(1, int(image.height * scale))))
    return image


def _error_map(image: Image.Image) -> np.ndarray:
    buf = io.BytesIO()
    image.save(buf, "JPEG", quality=JPEG_QUALITY)
    buf.seek(0)
    resaved = Image.open(buf)
    diff = ImageChops.difference(image, resaved)
    return np.asarray(diff).max(axis=2).astype(float)  # worst channel per pixel


def _block_means(error_map: np.ndarray, grid: int) -> np.ndarray:
    h, w = error_map.shape
    bh, bw = max(1, h // grid), max(1, w // grid)
    means = np.zeros((h // bh, w // bw))
    for r in range(means.shape[0]):
        for c in range(means.shape[1]):
            block = error_map[r * bh:(r + 1) * bh, c * bw:(c + 1) * bw]
            means[r, c] = block.mean() if block.size else 0.0
    return means


def _largest_contiguous_cluster(mask: np.ndarray) -> int:
    """Flood-fill over the outlier-block boolean grid — a real spliced region
    shows up as several touching blocks, not scattered isolated ones, so
    cluster size (not raw outlier count) is what actually separates a
    composited region from JPEG-block-grid noise."""
    visited = np.zeros_like(mask, dtype=bool)
    best = 0
    rows, cols = mask.shape
    for sr in range(rows):
        for sc in range(cols):
            if not mask[sr, sc] or visited[sr, sc]:
                continue
            stack = [(sr, sc)]
            visited[sr, sc] = True
            size = 0
            while stack:
                r, c = stack.pop()
                size += 1
                for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols and mask[nr, nc] and not visited[nr, nc]:
                        visited[nr, nc] = True
                        stack.append((nr, nc))
            best = max(best, size)
    return best


def check_photo_forensics(file_path: str, content_type: str) -> dict:
    if content_type != "image":
        return {
            "key": "photo_forensics",
            "title": "Photo Splice / Face Region Consistency",
            "status": "na",
            "score": None,
            "summary": "Not a photo upload — this check targets JPG/PNG images (ID photos, portraits), not PDF documents.",
            "details": {},
        }

    try:
        image = _load_bounded(file_path)
        error_map = _error_map(image)
        block_means = _block_means(error_map, GRID)
    except Exception as e:
        return {
            "key": "photo_forensics",
            "title": "Photo Splice / Face Region Consistency",
            "status": "error",
            "score": None,
            "summary": f"Photo forensics could not be run: {e}",
            "details": {},
        }

    median = float(np.median(block_means))
    mad = float(np.median(np.abs(block_means - median))) or 1e-6  # avoid div-by-zero on a perfectly flat map
    z_scores = 0.6745 * (block_means - median) / mad

    outlier_mask = (z_scores > Z_SCORE_THRESHOLD) & (block_means > MIN_ABS_ERROR)
    outlier_count = int(outlier_mask.sum())
    total_blocks = int(outlier_mask.size)
    cluster_size = _largest_contiguous_cluster(outlier_mask) if outlier_count else 0
    cluster_fraction = cluster_size / total_blocks if total_blocks else 0.0

    if cluster_size >= 4 and cluster_fraction >= 0.03:
        status, score = "fail", 30
        summary = (
            f"Found a contiguous {cluster_size}-block region with recompression error far above the rest of the "
            "image — consistent with a pasted/composited region (e.g. a swapped face or copy-pasted photo)."
        )
    elif cluster_size >= 2:
        status, score = "warn", 60
        summary = f"A small ({cluster_size}-block) region shows elevated recompression error relative to the rest of the image — could be benign (logo, watermark) but worth a manual look."
    else:
        status, score = "pass", 90
        summary = "Recompression error is spatially uniform across the image — no localized pasted/composited region detected."

    return {
        "key": "photo_forensics",
        "title": "Photo Splice / Face Region Consistency",
        "status": status,
        "score": score,
        "summary": summary,
        "details": {
            "grid": f"{block_means.shape[0]}x{block_means.shape[1]}",
            "outlier_blocks": outlier_count,
            "largest_contiguous_cluster": cluster_size,
            "median_block_error": round(median, 2),
            "note": "Regional recompression-consistency heuristic, not a neural deepfake/face-swap classifier.",
        },
    }
