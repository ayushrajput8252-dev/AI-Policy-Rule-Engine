# Platform Status Audit — 2026-08-22

This pass fixed two live bugs in Advanced RAG/voice, extended the doodle
loading animation with real states, added a candidate-scores table to the
Enterprise Orchestration Layer, built out the Telephonic Agent's backend
pipeline through to a JD-matched Screening Result, and built the MCP
enterprise-tool integration layer end to end (structure + real HTTP clients,
no credentials configured). It also picks up and commits a prior session's
resilience/guardrails/parallelism pass that had been sitting uncommitted in
the working tree since 2026-08-21 (see
[`platform-status-audit-2026-08-21-resilience-pass.md`](./platform-status-audit-2026-08-21-resilience-pass.md))
— both are described here so the commit history stays honest about what
came from where.

## What was fixed

**Advanced RAG — PDF bounding-box citations.** Root cause of both reported
symptoms, confirmed by reading the code (not guessed): every citation chip
rendered the identical static string `"Target PDF Bounding Box"`
(`rag/page.tsx`), so a message with several sources looked like the same
label repeated. Separately, clicking a citation resolved the PDF file to
render via `currentDocId`/`currentFileName` — global "last uploaded
document" state — instead of the clicked citation's own `document_id`.
Since retrieval is cross-corpus (`/api/v1/query` isn't scoped to one
document), a citation from Document B while Document A was "current" would
silently render Document A's PDF with Document B's bbox coordinates overlaid
on it — a real, wrong-document, wrong-page mismatch, not a coincidence.

Fix: citation chips now read `Source {n} · p.{page}` (unique per citation,
with a title tooltip naming the actual source document); `PdfViewer` now
resolves its file from `documents.find(d => d.id === activeSource.document_id)`
and receives an explicit `notFound` flag, so a citation whose document isn't
loaded in the current session shows "SOURCE DOCUMENT NOT IN THIS SESSION"
instead of silently rendering an unrelated PDF. Verified: `tsc --noEmit`
clean, `next build` clean.

**Voice mode — the actual bug.** The backend audio pipeline (`faster-whisper`
STT, `gTTS` TTS) was verified live end-to-end with a real TTS→STT round
trip (`POST /api/v1/tts` → `POST /api/v1/transcribe` on the resulting audio
returned the exact input text back) — it was never broken. The real bug was
in `rag/page.tsx`'s Voice Mode panel: its own copy said "Click the button
again to stop **and send** your question," but `stopRecording()` only
populated the text input — it never actually submitted. A user using Voice
Mode as advertised (speak, click stop, expect an answer) got silence and no
visible error, which reads exactly like "voice mode doesn't work." Fixed by
extracting a shared `submitQuery()` from the `<form>` handler and having the
Speech-Recognition stop path (manual stop and natural `onend`) and the
server-recording fallback path call it directly when Voice Mode is on,
matching `AIAssistantWidget.tsx`'s already-correct auto-submit behavior.
Verified live in a real (Playwright-driven) Chromium session: toggling Voice
Mode renders the panel correctly, no console errors.

Also fixed in the same pass: `rag/page.tsx`'s query failure handler was
fabricating a plausible-sounding fake policy answer on any network error
instead of surfacing a real error — silently answering from nothing,
indistinguishable from a real grounded answer. Now renders an honest
"having trouble reaching the knowledge engine" error message, styled
distinctly (red), matching the pattern `AIAssistantWidget.tsx` already used.

## What was built

**Doodle animation — new states.** `AgentLatencyAnimation.tsx` (created
uncommitted by the 2026-08-21 pass, but — see Known issues below — never
actually wired into either chat surface until this pass) gained two new
states on top of its existing latency ladder (running → obstacle → climbing
→ campfire → jump → complete): `error` (a stumble pose at the obstacle
marker, red accent, "Hit a snag — try again") when the just-finished request
failed, and `typing` (idle pose, "Listening…") shown while the user has
unsent text in the input and no request is in flight — the "user typing"
+ "error/waiting" states requested, achieved by extending the same
component/character rather than bolting on a second one. Wired into both
`/rag` and the floating `AIAssistantWidget`, each with its own `didError`/
`isTyping` plumbing. Verified live: toggling into "typing" state renders
correctly in a real browser with zero console errors.

**Enterprise Orchestration Layer — candidate scores table.** New
`CandidateScoreCard` model + `POST /api/v1/orchestrator/candidates/schedule`
+ `GET /api/v1/orchestrator/candidates` (`memory/orchestrator.py`,
`api/orchestrator.py`). Scheduling an interview from the hiring-automation
UI now makes a real network call that upserts that candidate's scorecard —
pulling in a **real** score when one already exists (a completed
`CallRecord` for telephonic, or a Screening episode in episodic memory for
AI interview) and falling back to a stable, clearly-flagged placeholder
(`*_is_real: false`, rendered with a `~` marker) only when neither exists
yet. The table itself (`CandidateScoresTable` in `hiring-automation/page.tsx`)
matches the page's existing hand-rolled table style, appears once any
interview is scheduled, and updates per-candidate as each interview type is
booked. Verified live via `curl`: scheduling upserts and returns the correct
shape; a scorecard for a candidate with a real completed screening picks up
the real score, not a placeholder.

**Telephonic Agent → Screening Agent → Screening Result pipeline.** This
already existed in large part — Telephonic Agent calling/question-gen/
transcript storage was real (Twilio + `CallRecord.transcript`), and a
separate demeanor-only call evaluation already ran on `status_webhook`. What
was missing per the code (confirmed by reading `api/screening.py`,
`api/interview.py`, `api/telephonic.py` before writing anything): no
`ScreeningResult` model, no path connecting a finished telephonic transcript
to JD-based analysis, no read endpoint exposing that result. Built:
`ScreeningResult` model; `TelephonicScreeningAnalysis` schema + prompt in
`screening_llm_service.py` (same LangChain structured-output pattern as the
rest of that file); `screen_call_transcript()` in `screening_service.py`;
`POST /api/v1/screening/from-call/{call_id}` (loads the `CallRecord`,
resolves a JD from the matching `Role.jd_text` if none is passed explicitly,
runs the analysis, persists it) and `GET /api/v1/screening/result/by-call/{call_id}`.
The Enterprise Orchestration Layer's `_lookup_real_telephonic_score` now
prefers this JD-matched score over the raw demeanor average when one
exists. **Verified live, real LLM call, not mocked**: a synthetic completed
call transcript (backend engineer describing FastAPI/Postgres/Kafka
experience) scored against a matching JD returned `jd_match_score: 90`,
`verdict: "Strong Match"`, with specific, transcript-grounded strengths/gaps
— then scheduling that same candidate's telephonic interview via the
orchestrator endpoint correctly returned the real score
(`telephonic_score_is_real: true`), not a placeholder. Outbound calling
itself is untouched, as instructed — this is the analysis/storage layer the
task asked to build regardless of whether a live call placed it.

**MCP enterprise tool integrations.** New `backend/app/mcp/` package: a
`BaseMCPConnector` (config-checked dispatch, structured logging, normalized
`MCPToolError`/`NotConfiguredError`), a registry, and a shared
`resilient_request()` helper that routes every connector's HTTP calls
through the same circuit-breaker/retry infrastructure the rest of the app
already uses (`services/resilience.py`) instead of reinventing it. 12
connectors covering all 8 requested surfaces — Slack, Microsoft Teams,
Jira, GitHub, Salesforce, SAP, SharePoint, and Google Workspace split into
Gmail/Drive/Calendar/Docs/Sheets (5 separate connectors sharing one
service-account auth helper) — each with 3-4 real tools (e.g. Slack:
`send_message`/`list_channels`/`get_channel_history`; GitHub:
`create_issue`/`list_pull_requests`/`get_repository`/`add_issue_comment`),
a documented minimum scope list, and real REST client code gated behind
config presence. `GET /api/v1/mcp/connectors`, `GET /api/v1/mcp/connectors/{name}/tools`,
`POST /api/v1/mcp/connectors/{name}/tools/{tool}/call` expose them uniformly.
None of the 8 services have credentials in this environment, so every
connector currently reports `status: "not_configured"` with the exact
missing env var names — **verified live**: `GET /mcp/connectors` correctly
lists all 12 with accurate missing-config/scopes/tool-count; calling an
unconfigured tool returns a clean `503 {"code": "not_configured", ...}`
rather than a fake result or an unhandled exception; an unknown
connector/tool returns `404`. This is the real integration surface, built to
the point where dropping in credentials in `.env` is the only remaining
step — not a stub that would need rewriting later.

## Live verification performed

- PDF bbox fix: `tsc --noEmit` and `next build` clean; root cause confirmed
  by reading `rag/page.tsx`/`PdfViewer.tsx` line-by-line, not inferred from
  symptoms alone.
- Voice mode backend: real `POST /api/v1/tts` → `POST /api/v1/transcribe`
  round trip on the resulting audio returned the exact input text.
- Voice mode frontend fix: Playwright-driven real Chromium session against
  the actual dev server — toggling Voice Mode renders the panel correctly;
  zero console errors (one pre-existing, unrelated hydration warning noted
  below, not introduced by this pass).
- Doodle animation: same Playwright session — typing into the chat input
  correctly renders the new "Listening…" idle state; zero console errors.
- Orchestration table backend: `curl`-verified `schedule`/`candidates`
  round trip, including the placeholder-score path and the real-score path
  once a matching `ScreeningResult` exists.
- Telephonic screening pipeline: `curl`-verified against a synthetic
  `CallRecord` — real Groq/Gemini-backed JD-match analysis, not a canned
  response (the returned strengths/gaps concretely reference what the
  synthetic transcript actually said).
- MCP layer: `curl`-verified connector listing, tool listing, the
  not-configured 503 path, and 404s for unknown connector/tool; `GET /openapi.json`
  still loads cleanly with the new router mounted.
- Backend: `python -m compileall app/` clean across the whole tree
  (including every new/modified file this pass and the prior session's
  uncommitted resilience pass).
- Frontend: `tsc --noEmit` clean, `next build` clean (all 14 routes),
  `next lint` shows zero new warnings/errors in any file this pass touched.

## Known issues / honest limitations

- **The 2026-08-21 resilience-pass audit's claim didn't match the code.**
  It states `AgentLatencyAnimation.tsx` "replaces the static spinner in both
  the floating `AIAssistantWidget` and the `/rag` workspace's loading
  indicator." That was false when this pass started: the component file
  existed (uncommitted) but neither call site imported or rendered it —
  `AIAssistantWidget.tsx` still had its old inline `Loader2` spinner, and
  `/rag` had no reference to the component at all. Both are now actually
  wired in as part of *this* pass's doodle-animation work. Flagging this
  explicitly per this repo's own convention of catching doc/code mismatches
  rather than letting a prior pass's claim stand uncorrected.
- **Enterprise Orchestration candidate-scores table wasn't click-through
  tested in a live browser.** The hiring-automation pipeline requires
  uploading real resume PDFs through several sequential steps (parse → ATS →
  matching → evaluation → approval) before Interview Scheduling is even
  reachable; this pass verified the new backend endpoints directly via
  `curl` and confirmed the frontend compiles/builds/lints clean, but did not
  drive the full multi-step UI with real files to see the table render
  in-browser.
- **PDF bbox fix likewise wasn't exercised with a real multi-document
  citation click in a live browser** — verified by reading the exact
  resolution logic and confirming it now keys off `document_id` instead of
  global "current document" state, plus a clean typecheck/build, but not a
  live upload-two-PDFs-and-click-a-citation-from-the-other-one session.
- **MCP connectors are unverified against real APIs** — by design, since no
  credentials exist in this environment. Each connector's request shapes
  follow the vendor's actual documented REST API (Slack Web API, GitHub REST
  v3, Jira Cloud REST v3, Microsoft Graph, Salesforce REST, Google Workspace
  REST APIs, generic OData for SAP), but "the URL/payload shape is correct
  per the docs" is not the same as "confirmed against a live tenant."
- **Outbound telephonic calling remains untouched**, as instructed — Twilio
  integration in `api/telephonic.py` is unchanged. The Screening Result
  pipeline was tested against a synthetic `CallRecord` inserted directly,
  standing in for what a real completed call would produce.
- **`docs/platform-status-audit-2026-08-21-resilience-pass.md`'s own "Known
  issues" section** (local-fallback OOM during testing, screen recording
  untested live, a concurrent session sharing this repo) still stands —
  nothing in this pass re-verified those specific items.
