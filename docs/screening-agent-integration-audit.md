# Screening Agent Integration — Audit & Agentic System Design

Written after integrating a real, working Screening Agent into `localhost:3000`
(previously a standalone POC at `localhost:5173`). This doc answers three
things: what's real vs. dummy across the platform right now, what changed
this session, and a concrete, ordered roadmap for making the Screening Agent
(and the hiring stack generally) genuinely agentic end to end.

## 1. What's real vs. dummy — full platform audit

| Page / Feature | Status | Evidence |
|---|---|---|
| `/rag` — Policy RAG chat | **Real** | Real Pinecone retrieval + Groq/Gemini reasoning (`backend/app/services/retrieval.py`, `reasoning.py`). Voice input already calls real `/api/v1/transcribe`. |
| `/rules` — Rules Explorer | **Real** | Fetches `/api/v1/rules` from the live DB. |
| `/upload` | **Real** | Real PDF ingestion → chunk → classify → extract → validate pipeline. |
| `/fraud-detection` | **Real** | Real `fraud_orchestrator.py` pipeline (metadata, OCR, ELA, font, arithmetic checks). |
| `/telephonic-agent` | **100% simulated** | Explicit in-code comment: *"POC: fully client-side, no calls are placed and no backend is involved — every 'call', score, and candidate here is simulated."* Footer says the same. |
| `/hiring-automation` | **100% simulated** | Explicit in-code comment: *"POC constraint: no backend, no APIs, no real parsing. Whatever PDFs the user drops in, the workflow always narrates these two fixed candidates."* Notably, this page's `PIPELINE_NODES` copy ("Resume Parser," "ATS + Email Extraction," "Requirement Matching") is **identical** to a real, working FastAPI backend already built separately this session at `ai_engine/hiring-automation/` — that backend is not yet wired into this page. |
| `/onboarding`, `/knowledge`, `/security` | **Not audited this pass** — flagging as unknown, recommend the same real/dummy check before relying on them. |
| **`/screening-agent` (new, this session)** | **Real core, illustrative chrome** | See breakdown below. |

### `/screening-agent` breakdown

**Real, verified end to end (see §3):**
- Candidate video = actual front camera (`getUserMedia`), not a stock photo.
- Face-count / gaze / tab-switch proctoring = real MediaPipe `FaceLandmarker` inference running in-browser (ported from the standalone POC's `useProctoring.ts`, unchanged logic).
- Interview questions = real calls to new `/api/v1/interview/turn`, which asks Groq (Gemini fallback) for the next line based on the actual conversation — verified to produce genuinely context-specific follow-ups (asked about the *specific* rate-limiter/Redis detail a synthetic candidate mentioned).
- Candidate answers = really recorded (`MediaRecorder`) and really transcribed via the existing `/api/v1/transcribe` (faster-whisper), same endpoint `/rag`'s voice mode already used.
- Interviewer's lines = really spoken via the existing `/api/v1/tts` (gTTS).
- Final scores = real call to new `/api/v1/interview/evaluate`, grounded only in the actual transcript (verified: summary text matched what the synthetic candidate actually said, no fabricated detail).

**Illustrative, clearly labeled:**
- "Create in Minutes" and the two report sections below the live demo are static sample UI (badged "Illustrative sample — not live data" in the page itself), matching the reference screenshots' visual design. They don't read from the live interview above yet — see Phase 1 below to close that loop.

**Known gaps found while wiring this up (not blocking, but real):**
1. **`GROQ_API_KEY` is currently unauthorized.** A direct `curl` to Groq's API with the configured key returns `401`. Every LLM call in the platform (not just Screening Agent) is silently falling back to Gemini right now — functionally fine because of the dual-provider design, but it means "based on response of Groq" is, today, actually "based on response of Gemini via the Groq-shaped fallback path." Fix: rotate/re-check the key in `.env`. Cheap, do first.
2. **`ffmpeg` isn't installed** on this machine. `pydub` and the HuggingFace Whisper fallback both need it; faster-whisper (the primary STT engine) doesn't and works fine without it for normal speech. Only surfaces when faster-whisper genuinely finds zero speech segments (silence) — it then tries the ffmpeg-dependent fallback, which fails, producing a raw 500 instead of a graceful "didn't catch that." Real users speaking normally won't hit this; someone who stays silent will get a confusing error instead of a clean retry prompt. Fix: install ffmpeg, or make `audio_service.transcribe_audio` return an empty transcript instead of raising when faster-whisper cleanly ran but heard nothing.
3. **Not resume-aware yet.** The live interview takes a role title + optional pasted JD snippet, but doesn't read an uploaded resume — despite the homepage's `ScreeningAgentCard` advertising "JD + resume aware." Phase 2 below closes this by reusing the real `hiring-automation` backend's parser.
4. **No session persistence.** Refreshing the page loses the transcript; there's no way for HR to review a completed interview after the fact. Phase 1 below.

## 2. What changed this session (concrete diff)

**Backend** (`AI-Policy-Rule-Engine/backend/`):
- `app/services/interview_service.py` — new. `generate_next_turn()` / `generate_evaluation()`, both built on the existing `llm_service.generate_json()` Groq→Gemini fallback (no new LLM integration).
- `app/api/interview.py` — new. `POST /api/v1/interview/turn`, `POST /api/v1/interview/evaluate`.
- `app/main.py` — registered the new router.
- Installed missing `Pillow`/`pytesseract` into the backend venv (pre-existing gap, unrelated to this feature, blocked *any* backend startup).

**Frontend** (`AI-Policy-Rule-Engine/frontend/`):
- `src/hooks/useProctoring.ts` — new. Ported verbatim from the standalone POC (camera + MediaPipe face/gaze detection + tab-switch listeners).
- `src/app/screening-agent/page.tsx` — new. Full page: hero, live interview demo (real voice loop described above), features strip, illustrative "Create in Minutes" + report sections, closing CTA.
- `src/app/page.tsx` — added a "Try Screening Agent" CTA to the existing `ScreeningAgentCard` (it previously had none).
- Rebranding from the standalone POC's invented "SkillBrew AI" / "Hridesh AI" / "Anna" to this platform's actual identity: **AgenticFlow AI** (platform), **BrewShield** (proctoring — matches the existing `ScreeningAgentCard` copy), **Ayush** (interviewer persona — reuses the same self-referential agent identity the Telephonic Agent already established, rather than inventing a second fake name).
- Added `@mediapipe/tasks-vision` dependency.

**Verification:** real end-to-end Playwright runs against the live backend — including one with actual synthesized speech ("I recently built a rate limiter using Redis...") fed into a fake mic device, confirming faster-whisper genuinely transcribed it (with realistic ASR artifacts like "Redis"→"readies") and the next question genuinely referenced it back.

## 3. Making this genuinely agentic — system design

The current interview loop is **one well-prompted LLM call per turn**, not an
agent: it can't look anything up, can't decide to skip ahead, can't flag a
concern for a human, and forgets everything the moment the tab closes. Here's
the gap between that and what "agentic" should mean here, and how to close it,
in the order it's worth building.

### Phase 0 — Fix what's already broken (do first, cheap, unblocks everything)
1. Rotate/verify `GROQ_API_KEY` so "based on Groq" is actually true, not a silent Gemini fallback.
2. Install `ffmpeg` on the backend host; fix `audio_service.transcribe_audio` to return an empty transcript (not raise) when faster-whisper cleanly detects silence.
3. Add request timeouts + a single retry to the new frontend's `fetch` calls (`interview/turn`, `interview/evaluate`, `transcribe`, `tts`) — right now a network blip surfaces as a raw error with no retry.

### Phase 1 — Close the loop for Screening Agent itself (make it a real feature, not a demo)
1. **Persist sessions.** New `InterviewSession` / `InterviewTurn` SQLAlchemy models (mirrors the existing `models.py` conventions). `POST /api/v1/interview/turn` starts writing turns to a session row instead of being purely stateless/client-driven.
2. **A review endpoint + view.** `GET /api/v1/interview/sessions/{id}` returns the full transcript + evaluation; a simple HR-facing list/detail view (can reuse the existing `Detailed Interview Reports` UI already built, just fed real data instead of the illustrative sample).
3. **Human gate.** Add real Accept/Reject actions on a completed session (the existing report UI already has these buttons in the illustrative version — wire them to actually write a decision), matching the platform's established "human-in-the-loop gate" principle used elsewhere.

### Phase 2 — Connect the dots across features that already exist
1. **Resume-aware questions.** The `hiring-automation/` FastAPI project built earlier this session already does real resume parsing + skill extraction. Reuse it (as a library import or a sibling service call) to feed parsed resume text into `interview_service.generate_next_turn`'s prompt — this is what actually earns the "resume aware" claim on the homepage card.
2. **Fix `/hiring-automation`'s own dummy data** using that same real backend — replace its fixed two-candidate simulation with real upload → parse → ATS score, closing the gap between what that page claims and what it does. (Flagged as a finding, not done this session — it's a separate, sizeable piece of work from the Screening Agent integration that was actually requested.)
3. **One candidate record.** Right now ATS score (hiring-automation) and interview evaluation (Screening Agent) are two disconnected numbers. Merge them into a single candidate profile so a hiring manager sees one ranked view, not two.

### Phase 3 — Real agentic orchestration
This is the difference between "an LLM call with a good prompt" and an agent:
1. **Tool use instead of one monolithic prompt.** Give the interviewer LLM actual tools it can call mid-conversation: `flag_followup_topic(topic)`, `score_answer(rubric)`, `check_jd_requirement_covered(requirement)`. Today it can only emit `{question, is_final}` — a real agent should be able to decide *why* it's asking the next thing and leave an auditable trace of that reasoning, not just the output text.
2. **Route through the existing Orchestrator/MCP kernel**, not a bespoke loop. The README already describes this platform's kernel (`Reasoning Agent → Retrieval Agent → Tool Agent → Validator Agent`, with an `Approval Gate`) for the policy/hiring pipeline. Screening Agent should be another consumer of that same kernel instead of its own separate `interview_service.py` pattern — one orchestration story for the whole platform, not N bespoke ones.
3. **Structured, resumable state machine**, mirroring the pattern the Hiring Automation page's *frontend* already animates (`upload → parse → match → generate → evaluate → approve → onboard`). Give Screening Agent the same shape *server-side*, for real: `session_created → questioning → evaluating → pending_review → approved/rejected → (if approved) handed to onboarding`.

### Phase 4 — Production hardening
1. **Streaming voice**, not push-to-talk. Swap the per-turn `MediaRecorder` → `/transcribe` round trip for a streaming STT (Groq's real-time transcription, or Deepgram/AssemblyAI) so it feels like an actual conversation instead of a walkie-talkie. This is also the natural point to converge Screening Agent and Telephonic Agent onto one shared real-time voice stack instead of two.
2. **Scale STT off the request thread.** `faster-whisper` "base" on CPU, loaded fresh per request, works fine for a demo; it will not hold up under concurrent interviews. Cache the loaded model process-wide (it currently isn't cached — check `audio_service.py`), and benchmark whether a hosted STT API is needed for real concurrency.
3. **Auth + rate limiting.** The interview endpoints are open and unauthenticated right now — fine for a demo, not for production. Add per-candidate session tokens (e.g., a magic link tied to a specific `InterviewSession`) before this is a public-facing product.
4. **Observability.** Log per-stage latency (STT / LLM / TTS) and the Groq-vs-Gemini fallback rate, so a silent provider outage (like the current Groq key issue) shows up on a dashboard instead of being discovered by reading server logs.

## 4. Why this order

Phase 0 is free and unblocks accurate testing of everything else. Phase 1
turns today's demo into something HR can actually use once (a reviewable
session) before investing further. Phase 2 is high-leverage because the hard
part (resume parsing) is *already built* and just sitting disconnected — wiring
it in is mostly plumbing, not new engineering. Phase 3 is the real "agentic"
upgrade and is deliberately last because it's the most expensive and riskiest
to get right, and doing it before Phase 1/2 exist would mean designing tool
use against a feature with no persistence or grounding yet to make the tools
meaningful. Phase 4 is production-readiness, relevant once this is more than
a demo.
