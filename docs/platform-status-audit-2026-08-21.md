# Platform Status Audit — 2026-08-21

Supersedes [`platform-status-audit-2026-08-19.md`](./platform-status-audit-2026-08-19.md)
where the two disagree. Two things changed since then: this pass live-tested
every memory tier against real Redis/Postgres/Pinecone containers (not just
read the code), and a new Enterprise Orchestration Layer + 5-tier memory
architecture was built and wired into the Telephonic and Screening agents
(see [Memory Architecture](../README.md#memory-architecture) in the README).

## Five subsystems — end-to-end status

| # | Subsystem | Working | Notes |
|---|---|---|---|
| 1 | **Advanced Enterprise RAG** | **~75%** | Core answering (`POST /api/v1/query`) is genuinely strong: dual-tier retrieval, geometry-carrying citations, multilingual query translation, live-tested with real citations. Docked for: the README's 85%-confidence claim didn't match the code's actual 70% gate (fixed this pass — see below); Redis query/embedding cache was inert until this pass (Redis wasn't running — now is, see below); Celery is fully implemented but bypassed in favor of in-process `BackgroundTasks`, so ingestion has no durability across a crash/restart; **Pinecone reads are currently blocked by the account's exhausted free-tier egress quota** (found live during this audit, see below) — this hits RAG query results too, not just the new memory tier. |
| 2 | **Fraud Detection** | **~85%** | The most sophisticated single feature in the codebase: real 7-step pipeline (metadata, OCR, arithmetic, ELA, font analysis, ML identity clustering, resume-authenticity, LLM reasoning), shared `IdentityRecord` corpus genuinely blocks/matches across every scan. No code-level gaps found. Same Pinecone-quota and dual-provider-fallback caveats as RAG apply, since it shares the same LLM/vector infra. |
| 3 | **Telephonic Agent** | **Code ~90%, live-reachable: no** | Correction to the 08-19 audit: the frontend's "Place a real call" panel (`telephonic-agent/page.tsx`, `RealCallSection`) genuinely calls the real backend and was never disconnected — only the marketing content below it (waveform demo, scorecards) is illustrative, and the page discloses this in its own footer. The actual blocker is operational: `PUBLIC_BASE_URL` points at a dead ngrok tunnel, so Twilio has nowhere to fetch call instructions from — a live call would fail today. Backend logic itself (retry handling, low-confidence re-ask, trial-account quirks) is solid. Now wired into the orchestrator: every call opens a working-memory session, each turn is tracked with LLM-derived candidate sentiment, and the call folds into episodic + semantic memory on any terminal status. |
| 4 | **Screening Agent** | **~75%** | Real webcam interview core (MediaPipe proctoring, faster-whisper STT, LLM question generation, gTTS), session persistence, resume-based ATS flow now hitting a live backend. Gaps: `ffmpeg` still isn't installed (breaks the silent-candidate retry path with a raw 500), STT model reloads per request (won't hold up under concurrent interviews), no auth/rate-limiting. Now wired into the orchestrator at session start (`/screening/start`) and end (`/interview/evaluate`, now accepts `session_id`) — folds the full transcript into episodic + semantic memory. |
| 5 | **Enterprise Orchestration Layer** | **Was ~10% (decorative only) → now real** | Previously: zero backend — an "Orchestrator / MCP Router / Approval Gate" graphic on the homepage with no code behind it, each agent running fully independent of the others. Built this pass: `backend/app/memory/orchestrator.py` + `POST/GET /api/v1/orchestrator/*` — a real session lifecycle (start → turn → end) that drives all five memory tiers together and is now the shared backbone for Telephonic and Screening. Intent parsing / MCP tool routing / an enforced approval gate are still not part of it — scoped honestly as a memory/session orchestration layer, not the full agentic kernel the homepage copy describes. |

**Platform-wide, unweighted:** roughly 65% real and working end-to-end before this pass (skewed down hard by #5 being pure decoration); roughly 78% now that #5 has a real, tested implementation. The remaining gap is mostly operational (dead ngrok tunnel, dead Groq key, missing ffmpeg, exhausted Pinecone quota) rather than missing code.

## What changed this pass

**Built — Enterprise Orchestration Layer + 5-tier memory architecture** (`backend/app/memory/`), live-tested against real Redis, Postgres, and Pinecone containers, not just read:

| Tier | Store | Verified |
|---|---|---|
| Working / short-term | Redis | ✅ live turn-by-turn session state, TTL'd |
| Episodic | Postgres (new) | ✅ live write + read-back via `GET /orchestrator/context/{subject_id}` |
| Semantic / long-term | Pinecone (`agent-memory` namespace) | ⚠️ writes confirmed working; reads currently blocked by account quota (see below) |
| Shared / global | SQLite (existing DB, new `Role`/`OnboardingSOP` tables) | ✅ live read/write, now auto-populated from real Screening/Telephonic sessions |
| Graph-structured | SQLite + networkx (new `GraphNode`/`GraphEdge` tables) | ✅ live candidate↔role edges created and traversed |

`GET /api/v1/orchestrator/health` reports live reachability of all five tiers on demand.

**Fixed — three real bugs found while building/testing this:**

1. **Redis client never retried after one failed connection.** `services/cache.py`'s `get_redis_client()` cached a failed connection attempt for the life of the process — if the backend started before Redis was up, caching (and now working memory) stayed disabled until restart, even once Redis came online. Fixed with a 30s retry cooldown instead of a permanent cache. The new episodic-memory Postgres check (`memory/episodic_db.py`) had the same latent bug and got the same fix before it shipped.
2. **Postgres port collision.** The new `postgres` container's published port (`5432`) collided with another process already bound to `5432` on the host, causing silent auth failures that looked like a credentials problem. Moved the host-side publish to `5433` (internal container-to-container traffic over the compose network is unaffected).
3. **README doc/code mismatch.** README claimed a hard "85% confidence" extraction gate; the actual code (`worker.py`, `MIN_RULE_CONFIDENCE`) enforces 70%. Corrected the doc rather than silently changing the gate's value — that's a product decision, not a docs bug.

**Found — Pinecone account is at its free-tier monthly egress cap** (`[429] Request failed. You've reached your egress limit for the current month (1000000000 bytes)`), discovered live while testing semantic-memory reads. Vector *writes* (upserts) still succeed — only reads/queries are blocked. This is the same Pinecone project the RAG chunk/rule index uses, so it's a live risk to RAG query quality too, not just the new memory tier, until the quota resets or the plan is upgraded.

## Still open (operational, not code)

- `GROQ_API_KEY` is dead (401) — every "dual-provider" claim is currently running on Gemini alone. Rotate the key.
- `PUBLIC_BASE_URL` points at a dead ngrok tunnel — Telephonic Agent can't place a real call until this points somewhere live (fresh ngrok tunnel, or a deployed backend URL).
- `ffmpeg` isn't installed — breaks the Screening Agent's silent-candidate retry path.
- Pinecone free-tier egress quota is exhausted for the current billing period (see above).

None of these are code defects — they're all one credential rotation, one tunnel restart, one `winget install`, or one plan upgrade away from resolved.
