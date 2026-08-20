"""
End-to-end smoke test exercising the real FastAPI endpoints (with the
sentence-transformer model actually loaded) against the generated sample
resumes. Not a unit test — meant to be run manually to sanity-check the
whole pipeline and print timing.

Run: python tests/test_end_to_end.py
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "..", "sample_resumes")


def main():
    with TestClient(app) as client:  # triggers lifespan -> model preload
        print("Health check:", client.get("/health").json())

        # --- /extract on DOCX ---
        with open(os.path.join(SAMPLE_DIR, "john_doe.docx"), "rb") as f:
            t0 = time.perf_counter()
            resp = client.post("/extract", files={"file": ("john_doe.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
            elapsed = time.perf_counter() - t0
        print(f"\n/extract (docx) status={resp.status_code} elapsed={elapsed:.3f}s")
        data = resp.json()
        assert resp.status_code == 200, data
        info = data["info"]
        print("  name:", info["name"])
        print("  email:", info["email"])
        print("  phone:", info["phone"])
        print("  linkedin:", info["linkedin_url"])
        print("  github:", info["github_url"])
        print("  years_of_experience:", info["years_of_experience"], info["years_of_experience_source"])
        print("  education:", info["education"])
        print("  skills matched:", len(info["skills"]), [s["skill"] for s in info["skills"]])
        print("  has_tables:", data["meta"]["has_tables"])

        # --- /extract on PDF ---
        with open(os.path.join(SAMPLE_DIR, "john_doe.pdf"), "rb") as f:
            t0 = time.perf_counter()
            resp = client.post("/extract", files={"file": ("john_doe.pdf", f, "application/pdf")})
            elapsed = time.perf_counter() - t0
        print(f"\n/extract (pdf) status={resp.status_code} elapsed={elapsed:.3f}s")
        assert resp.status_code == 200, resp.json()

        # --- /extract on thin/likely-bad PDF ---
        with open(os.path.join(SAMPLE_DIR, "thin_scanned_like.pdf"), "rb") as f:
            resp = client.post("/extract", files={"file": ("thin_scanned_like.pdf", f, "application/pdf")})
        data = resp.json()
        print(f"\n/extract (thin pdf) likely_bad_extraction={data['meta']['likely_bad_extraction']} warnings={data['meta']['warnings']}")
        assert data["meta"]["likely_bad_extraction"] is True

        # --- /score ---
        with open(os.path.join(SAMPLE_DIR, "sample_jd.txt"), "r", encoding="utf-8") as f:
            jd_text = f.read()

        with open(os.path.join(SAMPLE_DIR, "john_doe.docx"), "rb") as f:
            t0 = time.perf_counter()
            resp = client.post(
                "/score",
                files={"file": ("john_doe.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
                data={"job_description": jd_text},
            )
            elapsed = time.perf_counter() - t0
        print(f"\n/score status={resp.status_code} elapsed={elapsed:.3f}s")
        data = resp.json()
        assert resp.status_code == 200, data
        score = data["score"]
        print("  final_score:", score["final_score"])
        print("  keyword_match:", score["keyword_match"])
        print("  semantic_similarity:", score["semantic_similarity"])
        print("  formatting:", score["formatting"])

        print("\nAll end-to-end checks passed.")


if __name__ == "__main__":
    main()
