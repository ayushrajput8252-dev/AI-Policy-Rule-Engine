# Screening Agent — AI Interview Landing Page

A dedicated marketing/demo page for the AI interview Screening Agent, with a
**genuinely functional** live proctoring demo: click "Start Live Demo" and
your real front camera turns on, with real-time multi-face detection, gaze
tracking, and tab-switch detection running against it in the browser.

## What's here

```
ai_interview/
  frontend/   React + TypeScript + Tailwind (Vite). The whole landing page + live camera demo.
  backend/    Minimal FastAPI service. One job: log "Schedule a Demo" form submissions.
```

## Running it

**Backend** (needed for the "Schedule a Demo" form to succeed — the rest of
the page works without it):

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Demo requests land in `backend/demo_requests.jsonl` (one JSON object per
line) — inspect with `cat` or `tail -f` while testing.

**Frontend**:

```bash
cd frontend
npm install
npm run dev
```

Open the printed `http://localhost:5173` URL. `frontend/.env` points the
app at `http://localhost:8000` for the API — change `VITE_API_BASE` if your
backend runs elsewhere.

## The live proctoring demo

This is the centerpiece of the hero section, replacing the two stock-photo
video boxes from the original mock with:
- **Top box**: your real front camera (`getUserMedia`), live.
- **Bottom box**: the AI interviewer avatar (static image, per design).

Clicking **Start Live Demo** turns on your camera and runs, entirely
client-side (no server, no upload — see `frontend/src/hooks/useProctoring.ts`):

1. **Face presence + multi-face detection** — MediaPipe `FaceLandmarker`
   (`@mediapipe/tasks-vision`) runs against the video feed. No face for
   >3s, or more than one face, gets flagged.
2. **Gaze / looking-away detection** — same model call also returns face
   landmarks (including iris points); a simple head-pose ratio (nose
   position relative to the face bounding box) flags sustained
   (>2.5s) looking-away.
3. **Tab-switch / focus-loss detection** — plain `visibilitychange` +
   `window.blur` listeners, active only while the demo is live. Zero ML,
   highest signal-to-effort ratio, per spec.

All three feed one live state: an **integrity score** (starts at 100,
deducted per flag type), a **live activity log** (timestamped flag
history), and a **red alert banner overlaid directly on the video** the
instant something's flagged — so switching tabs or having someone else
step into frame is visibly, immediately reflected on screen, live.

Bounding boxes are drawn over detected faces on a canvas overlay (green =
OK, red = flagged) so you can see exactly what the model is tracking.

Nothing is uploaded: the camera stream and all inference stay in the
browser tab.

### Verified end-to-end

This was tested with real Playwright automation against a live camera
feed (Chromium's fake video device) and real MediaPipe model inference —
not just visual inspection:
- Camera goes live, MediaPipe loads and runs `detectForVideo` per frame.
- With no face in frame, integrity score correctly drops after the 3s
  grace period (100 → 85 → 70 as repeated "no face" flags fire).
- Simulating a tab switch correctly increments the tab-switch counter,
  drops the integrity score, adds a log entry, and shows the on-video
  alert banner.
- The Schedule Demo form correctly posts to the backend and the lead
  lands in `demo_requests.jsonl`.

## Design reference

The hero mock, "Create in Minutes," "Descriptive Interview Reports," and
"Detailed Interview Reports" sections were built to match the reference
screenshots in this folder. Two changes from the original mock, per
request:
- The two stock-photo video boxes were replaced: one with a real live
  camera feed, one with the provided AI-interviewer image
  (`frontend/src/assets/ai-interviewer.png`).
- Candidate report photos use initials-avatar placeholders instead of
  stock photography.

## Current scope / what's intentionally not built yet

Per explicit scope: the "Schedule a Demo" backend **just logs the
request** (JSON-lines file) — no email, CRM, or Slack integration. That's
a reasonable next step whenever you want it; `backend/main.py`'s
`schedule_demo` handler is the place to add it.
