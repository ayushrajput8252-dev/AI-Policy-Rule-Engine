import asyncio
from typing import AsyncGenerator
from ..database import SessionLocal
from ..models import FraudScan
from . import fraud_metadata, fraud_ocr, fraud_arithmetic, fraud_ela, fraud_font, fraud_identity, fraud_resume_authenticity, fraud_reasoning


def _save(scan_id: str, status: str, result: dict) -> None:
    db = SessionLocal()
    try:
        scan = db.query(FraudScan).filter(FraudScan.id == scan_id).first()
        if scan:
            scan.status = status
            scan.result = result
            db.commit()
    finally:
        db.close()


async def run_scan(
    scan_id: str, file_path: str, content_type: str, ip_address: str | None = None, user_agent: str | None = None
) -> AsyncGenerator[dict, None]:
    steps: list[dict] = []

    def emit_and_save(status: str):
        _save(scan_id, status, {"steps": steps})

    try:
        metadata_step = await asyncio.to_thread(fraud_metadata.check_metadata, file_path, content_type)
        steps.append(metadata_step)
        emit_and_save("scanning")
        yield {"type": "step", "step": metadata_step}

        text, ocr_step = await asyncio.to_thread(fraud_ocr.extract_text, file_path, content_type)
        steps.append(ocr_step)
        emit_and_save("scanning")
        yield {"type": "step", "step": ocr_step}

        arithmetic_step = await asyncio.to_thread(fraud_arithmetic.check_arithmetic, text, ocr_step.get("score"))
        steps.append(arithmetic_step)
        emit_and_save("scanning")
        yield {"type": "step", "step": arithmetic_step}

        ela_step = await asyncio.to_thread(fraud_ela.check_ela, file_path, content_type)
        steps.append(ela_step)
        emit_and_save("scanning")
        yield {"type": "step", "step": ela_step}

        font_step = await asyncio.to_thread(fraud_font.check_fonts, file_path, content_type)
        steps.append(font_step)
        emit_and_save("scanning")
        yield {"type": "step", "step": font_step}

        identity_step, extracted_identity = await asyncio.to_thread(
            fraud_identity.check_identity, scan_id, text, ip_address, user_agent
        )
        steps.append(identity_step)
        emit_and_save("scanning")
        yield {"type": "step", "step": identity_step}

        resume_step = await asyncio.to_thread(
            fraud_resume_authenticity.check_resume_authenticity, scan_id, text, file_path, content_type, extracted_identity
        )
        steps.append(resume_step)
        emit_and_save("scanning")
        yield {"type": "step", "step": resume_step}

        reasoning_step = await asyncio.to_thread(fraud_reasoning.synthesize, text, steps)
        steps.append(reasoning_step)
        yield {"type": "step", "step": reasoning_step}

        overall = {
            "risk_score": reasoning_step.get("risk_score"),
            "verdict": reasoning_step.get("verdict"),
            "explanation": reasoning_step.get("explanation"),
            "key_concerns": reasoning_step.get("key_concerns", []),
            "steps": steps,
        }
        emit_and_save("complete")
        yield {"type": "complete", "overall": overall}

    except Exception as e:
        error_payload = {"steps": steps, "error": str(e)}
        _save(scan_id, "error", error_payload)
        yield {"type": "error", "message": str(e), "steps": steps}
