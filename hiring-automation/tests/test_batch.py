"""
Batch endpoint smoke test: POST /score/batch ranking order, per-file error
isolation, and a real (measurable) wall-clock speedup vs N sequential
/score calls.

Run: python scripts/generate_sample_resumes.py   # only needed once
     python tests/test_batch.py
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "..", "sample_resumes")
BATCH_FILES = ["strong_match.docx", "john_doe.docx", "partial_match.pdf", "mismatch.pdf"]


def _read(name):
    with open(os.path.join(SAMPLE_DIR, name), "rb") as f:
        return name, f.read()


def _ctype(name):
    if name.endswith(".pdf"):
        return "application/pdf"
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def main():
    with TestClient(app) as client:  # triggers lifespan -> model preload + executor start
        with open(os.path.join(SAMPLE_DIR, "sample_jd.txt"), "r", encoding="utf-8") as f:
            jd_text = f.read()

        # --- 1. Ranking order ---
        payload = [("files", (n, d, _ctype(n))) for n, d in (_read(n) for n in BATCH_FILES)]
        t0 = time.perf_counter()
        resp = client.post("/score/batch", files=payload, data={"job_description": jd_text})
        batch_elapsed = time.perf_counter() - t0
        assert resp.status_code == 200, resp.json()
        data = resp.json()
        candidates = data["candidates"]
        assert len(candidates) == len(BATCH_FILES)
        assert data["timing"]["failed_count"] == 0
        scores = [c["score"]["final_score"] for c in candidates]
        assert scores == sorted(scores, reverse=True), "candidates must be sorted by final_score desc"
        assert [c["rank"] for c in candidates] == list(range(1, len(candidates) + 1))
        by_name = {c["filename"]: c for c in candidates}
        assert (
            by_name["strong_match.docx"]["score"]["final_score"]
            > by_name["mismatch.pdf"]["score"]["final_score"]
        )
        print("Ranking OK:", [(c["filename"], c["score"]["final_score"]) for c in candidates])

        # --- 2. Per-file error isolation (good + thin-but-parseable + hard-corrupt) ---
        good_name, good_bytes = _read("john_doe.docx")
        thin_name, thin_bytes = _read("thin_scanned_like.pdf")
        corrupt_name, corrupt_bytes = "corrupt.pdf", b"not a real pdf file at all"
        mixed = [
            ("files", (good_name, good_bytes, _ctype(good_name))),
            ("files", (thin_name, thin_bytes, "application/pdf")),
            ("files", (corrupt_name, corrupt_bytes, "application/pdf")),
        ]
        resp2 = client.post("/score/batch", files=mixed, data={"job_description": jd_text})
        assert resp2.status_code == 200, resp2.json()  # batch must stay 200 even with a bad file
        data2 = resp2.json()
        by2 = {c["filename"]: c for c in data2["candidates"]}
        assert by2[good_name]["error"] is None and by2[good_name]["rank"] is not None
        assert by2[thin_name]["error"] is None  # parses fine, just flagged
        assert by2[thin_name]["meta"]["likely_bad_extraction"] is True
        assert by2[corrupt_name]["error"] is not None and by2[corrupt_name]["rank"] is None
        assert data2["timing"]["file_count"] == 3
        assert data2["timing"]["succeeded_count"] == 2
        assert data2["timing"]["failed_count"] == 1
        print("Per-file error isolation OK.")

        # --- 3. Real parallelism: batch vs N sequential /score calls ---
        sequential_total = 0.0
        for name, raw in (_read(n) for n in BATCH_FILES):
            t0 = time.perf_counter()
            r = client.post("/score", files={"file": (name, raw, _ctype(name))}, data={"job_description": jd_text})
            sequential_total += time.perf_counter() - t0
            assert r.status_code == 200
        print(f"Sequential total: {sequential_total:.3f}s, batch: {batch_elapsed:.3f}s")
        assert batch_elapsed < sequential_total * 0.9, (
            f"batch ({batch_elapsed:.3f}s) should be meaningfully faster than "
            f"{len(BATCH_FILES)}x sequential /score calls ({sequential_total:.3f}s)"
        )

        print("\nAll batch checks passed.")


if __name__ == "__main__":
    main()
