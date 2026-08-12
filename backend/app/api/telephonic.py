import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client
from twilio.twiml.voice_response import Gather, VoiceResponse

from .. import models
from ..config import settings
from ..database import get_db
from ..services.telephonic_service import generate_call_turn

router = APIRouter(prefix="/telephonic", tags=["telephonic"])

MAX_TURNS = 4
GATHER_TIMEOUT_SEC = 6


def _twilio_client() -> Client:
    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER):
        raise HTTPException(
            status_code=503,
            detail="Twilio isn't configured on the backend (missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER).",
        )
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


def _serialize(record: models.CallRecord) -> dict:
    return {
        "id": record.id,
        "call_sid": record.call_sid,
        "to_number": record.to_number,
        "candidate_name": record.candidate_name,
        "role_title": record.role_title,
        "status": record.status,
        "transcript": record.transcript or [],
        "duration_sec": record.duration_sec,
        "error_message": record.error_message,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


class PlaceCallRequest(BaseModel):
    to: str
    candidate_name: str = "there"
    role_title: str = "the open role"


@router.post("/call")
def place_call(payload: PlaceCallRequest, db: Session = Depends(get_db)):
    if not settings.PUBLIC_BASE_URL:
        raise HTTPException(
            status_code=503,
            detail=(
                "PUBLIC_BASE_URL isn't set — Twilio needs a public HTTPS URL to fetch call "
                "instructions from. Set it to an ngrok URL (dev) or this backend's deployed URL."
            ),
        )
    client = _twilio_client()

    record = models.CallRecord(
        id=str(uuid.uuid4()),
        to_number=payload.to,
        candidate_name=payload.candidate_name or "there",
        role_title=payload.role_title or "the open role",
        status="queued",
        transcript=[],
    )
    db.add(record)
    db.commit()

    base = settings.PUBLIC_BASE_URL.rstrip("/")
    voice_url = f"{base}/api/v1/telephonic/voice?call_record_id={record.id}"
    status_url = f"{base}/api/v1/telephonic/status?call_record_id={record.id}"

    def _create_call():
        # Twilio trial accounts reject the request outright ("limited parameter
        # access") the moment an explicit method/status_callback_method or a
        # status_callback_event list is included — even though POST is already
        # the default for both. Passing only `url` + `status_callback` (both
        # POST by default, fires on completion) is the trial-safe shape; the
        # same call works unmodified once the account is upgraded.
        return client.calls.create(
            to=payload.to,
            from_=settings.TWILIO_PHONE_NUMBER,
            url=voice_url,
            status_callback=status_url,
        )

    try:
        try:
            call = _create_call()
        except TwilioRestException:
            raise
        except Exception:
            call = _create_call()  # one retry — smooths over the odd transient connection reset talking to Twilio
    except TwilioRestException as e:
        record.status = "failed"
        record.error_message = e.msg
        db.commit()
        raise HTTPException(status_code=502, detail=f"Twilio rejected the call: {e.msg}")
    except Exception as e:
        # Network-level failure talking to Twilio (timeout, connection reset) —
        # not a Twilio rejection, but the candidate still doesn't get called,
        # so treat it the same way rather than leaking a raw 500.
        record.status = "failed"
        record.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=502, detail=f"Could not reach Twilio: {e}")

    record.call_sid = call.sid
    record.status = call.status or "queued"
    db.commit()
    return _serialize(record)


@router.get("/calls")
def list_calls(db: Session = Depends(get_db)):
    records = db.query(models.CallRecord).order_by(models.CallRecord.created_at.desc()).limit(50).all()
    return [_serialize(r) for r in records]


@router.get("/calls/{call_id}")
def get_call(call_id: str, db: Session = Depends(get_db)):
    record = db.query(models.CallRecord).filter(models.CallRecord.id == call_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Call not found")
    return _serialize(record)


def _gather_twiml(record_id: str, say_text: str) -> str:
    """Builds the TwiML for one turn: speak `say_text`, then listen for the
    candidate's spoken reply and post it to /gather. If nothing is heard,
    Twilio still posts to `action` with an empty SpeechResult, which /gather
    treats as "didn't catch that" rather than silently hanging up."""
    base = settings.PUBLIC_BASE_URL.rstrip("/")
    vr = VoiceResponse()
    gather = Gather(
        input="speech",
        action=f"{base}/api/v1/telephonic/gather?call_record_id={record_id}",
        method="POST",
        speech_timeout="auto",
        timeout=GATHER_TIMEOUT_SEC,
    )
    gather.say(say_text)
    vr.append(gather)
    # Reached only if Gather's own action request itself never fires (rare) —
    # keeps the call from hanging silently instead of ending cleanly.
    vr.say("We'll follow up by email. Goodbye for now.")
    vr.hangup()
    return str(vr)


@router.post("/voice")
async def voice_webhook(call_record_id: str, db: Session = Depends(get_db)):
    """Twilio hits this the moment the candidate picks up."""
    record = db.query(models.CallRecord).filter(models.CallRecord.id == call_record_id).first()
    if not record:
        vr = VoiceResponse()
        vr.say("Sorry, something went wrong on our end. Goodbye.")
        vr.hangup()
        return Response(content=str(vr), media_type="application/xml")

    record.status = "in-progress"
    turn = generate_call_turn([], record.candidate_name, record.role_title, MAX_TURNS)
    record.transcript = [{"role": "agent", "text": turn["question"]}]
    db.commit()

    return Response(content=_gather_twiml(record.id, turn["question"]), media_type="application/xml")


@router.post("/gather")
async def gather_webhook(
    call_record_id: str,
    SpeechResult: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """Twilio hits this after each Gather with what the candidate said."""
    record = db.query(models.CallRecord).filter(models.CallRecord.id == call_record_id).first()
    if not record:
        vr = VoiceResponse()
        vr.say("Sorry, something went wrong on our end. Goodbye.")
        vr.hangup()
        return Response(content=str(vr), media_type="application/xml")

    candidate_text = (SpeechResult or "").strip()
    transcript = record.transcript or []

    if not candidate_text:
        return Response(
            content=_gather_twiml(record.id, "Sorry, I didn't catch that — could you say that again?"),
            media_type="application/xml",
        )

    transcript.append({"role": "candidate", "text": candidate_text})

    turn = generate_call_turn(transcript, record.candidate_name, record.role_title, MAX_TURNS)
    transcript.append({"role": "agent", "text": turn["question"]})
    record.transcript = transcript
    db.commit()

    if turn.get("is_final"):
        vr = VoiceResponse()
        vr.say(turn["question"])
        vr.hangup()
        record.status = "completed"
        db.commit()
        return Response(content=str(vr), media_type="application/xml")

    return Response(content=_gather_twiml(record.id, turn["question"]), media_type="application/xml")


@router.post("/status")
async def status_webhook(
    call_record_id: str,
    CallStatus: Optional[str] = Form(None),
    CallDuration: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """Twilio's call-lifecycle callback (queued/ringing/answered/completed/...)."""
    record = db.query(models.CallRecord).filter(models.CallRecord.id == call_record_id).first()
    if record and CallStatus:
        # A completed webhook from /gather may already have set this more
        # precisely (e.g. after the final line) — don't downgrade it back to
        # Twilio's generic "completed" if we already know it finished cleanly.
        if not (record.status == "completed" and CallStatus == "completed"):
            record.status = CallStatus
        if CallDuration:
            try:
                record.duration_sec = int(CallDuration)
            except ValueError:
                pass
        db.commit()
    return Response(status_code=204)
