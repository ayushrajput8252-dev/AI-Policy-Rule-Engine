# Platform Status Audit — 2026-08-19

Verified against the app as it was actually running at the time (backend on
`:8000`, frontend on `:3000`) — live endpoint calls and direct third-party API
checks, not just code reading. Supersedes the real/dummy table in
[`screening-agent-integration-audit.md`](./screening-agent-integration-audit.md)
(2026-08-11) where the two disagree; several things there have changed since
(fraud detection was being actively edited the day of this audit; screening-agent
gained session persistence on 2026-08-17; hiring-automation gained real backend
calls after that audit was written).

## Genuinely working, good quality

| Feature | Evidence | Quality |
|---|---|---|
| **Policy RAG chat** (`/rag`, `POST /api/v1/query`) | Live-tested: asked "What is the leave policy?", got a grounded answer with 5 citations carrying exact page + bounding-box coordinates (`backend/app/services/retrieval.py`, `reasoning.py`) | **Good.** Dual-tier retrieval, real citations, language detection — the strongest feature in the app. |
| **Document upload/ingestion** (`/upload`) | Real 6-stage pipeline: parse → chunk → detect → classify → extract → validate, dual-indexed into Pinecone + SQL | **Good**, but see the confidence-gate bug below. |
| **Fraud Detection** (`/fraud-detection`) | Real 7-step backend pipeline — metadata, OCR, arithmetic, ELA, font analysis, identity clustering (Random Forest + neural net ensemble), resume-authenticity, LLM reasoning (`backend/app/services/fraud_orchestrator.py`). Actively edited the same day as this audit. | **Good.** The most sophisticated single feature in the codebase — not a demo. |
| **Google Sign-In / auth** (`POST /api/v1/auth/google`) | Real ID-token verification against Google's tokeninfo endpoint; `GET /api/v1/auth/stats` returned a real DB-backed count | **Solid** for a lightweight login gate. Not full OAuth (no server-side JWT re-verification), but adequate at current scale. |
| **Dual-provider LLM fallback** | Confirmed live: direct call to Groq's API with the configured key returns `401 Invalid API Key`, yet `/query` still returns a good answer — every LLM call right now is silently running on Gemini, not Groq | **The fallback mechanism itself works well** — this is good engineering. But see the finding below; the silent failure isn't cosmetic. |
| **Screening Agent — live interview core** | Real webcam capture, real MediaPipe proctoring, real STT (faster-whisper) → LLM question generation → TTS loop, session persistence added 2026-08-17 (`session/[sessionId]` route) | **Good core, still rough edges** — no auth/rate-limiting on interview endpoints yet, STT model reloads per request (won't hold up under concurrent interviews). |
| **Telephonic Agent — backend** (`/api/v1/telephonic/*`) | Real Twilio integration: places actual calls, live IVR turn-by-turn via Gather webhooks, real speech-to-text via Twilio, real post-call scoring (`backend/app/api/telephonic.py`) | **Well-engineered** — retry logic, trial-account quirks handled, graceful low-confidence re-asks. **Not reachable right now** — see below. |

## Real bugs/gaps found and verified during this audit

1. **The "85% confidence gate" claim in the README isn't actually implemented.** Searched the whole backend for the threshold — it doesn't exist anywhere in code. Live proof: `GET /api/v1/rules` returned a real DB row with `confidence: 10.0` and an empty `canonical_rule: " "`, which should have been discarded per the README's claim. Either implement the filter or correct the doc.
2. **`GROQ_API_KEY` is dead (401 Unauthorized)**, confirmed by a direct call to Groq's API. Every "Groq/Grok-primary" claim in the README/docs is currently false in practice — the platform is quietly running on Gemini only. Cheap fix (rotate the key), but per the 2026-08-11 audit this has been broken for over a week.
3. **The Twilio callback tunnel is dead.** `PUBLIC_BASE_URL` in `.env` points at an ngrok URL that returns `ERR_NGROK_3200` (offline). The Telephonic Agent backend itself is real and solid, but placing an actual call would fail today — Twilio has nowhere to fetch instructions from.
4. **Redis isn't running.** Caching is coded defensively (`backend/app/services/cache.py` fails silent and degrades cleanly — good engineering), so nothing breaks, but the caching layer is providing zero benefit right now.
5. **`ffmpeg` still isn't installed** — same gap flagged in the 2026-08-11 audit, still open. Only bites when a candidate stays silent during a Screening Agent interview (raises a raw 500 instead of a clean retry prompt).

## Simulated / not backed by real logic

| Page | Status |
|---|---|
| **`/telephonic-agent`** (frontend) | Explicitly labeled in-code: "every call, score, and candidate is simulated." Doesn't call the real Twilio backend above at all — two disconnected things. |
| **`/knowledge`** | Zero backend calls anywhere in the file — fully client-side mock data, no disclaimer in the UI. |
| **`/security`** | Same — zero backend calls, RBAC panel is derived from local state only. |
| **`/onboarding`** | Partially real — calls the real `/api/v1/upload` endpoint for knowledge-transfer document ingestion, but account provisioning (Outlook, Teams, GitHub, Jira) has no backend at all. |
| **`/hiring-automation`** | **Improved since the 2026-08-11 audit** — resume parsing, ATS scoring, requirement matching, and assignment generation now genuinely call `hiring_service.py` (Groq/Gemini-backed), no longer the fixed two-candidate simulation the earlier audit described. Bulk email send, onboarding hand-off, and knowledge transfer *within this flow* are still explicitly labeled simulated in the UI ("no SMTP/MCP email tool is wired up yet"). |

## Not audited this pass

Two sibling projects exist in this monorepo but aren't wired into this app and
weren't running at audit time: `apps/hiring-automation` (a standalone FastAPI
backend that the 2026-08-11 audit says is real and already built, just not
connected to the `/hiring-automation` frontend page above) and
`apps/ai_interview`.

## Bottom line

Policy RAG and fraud detection are the real, production-quality core of this
platform. The hiring pipeline has gotten measurably more real since the last
audit — resume parsing and matching now hit a live backend. The weakest spots
are the marketing-facing demo pages (telephonic-agent UI, knowledge, security)
that visually promise more than any backend delivers, plus two operational
issues (dead Groq key, dead ngrok tunnel) that are silently degrading things
that would otherwise look like they're working.
