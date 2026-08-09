# AgenticFlow AI

**An autonomous enterprise platform that reads policy documents like a compliance officer and runs first-round hiring like a recruiting team — citing every answer, gating every action behind a human, and refusing to guess when it doesn't know.**

![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat-square&logo=fastapi) ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Pinecone](https://img.shields.io/badge/Pinecone-000000?style=flat-square&logo=pinecone) ![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)

**[Live Demo](https://ai-policy-rule-engine.vercel.app)** · [Core Features](#core-features) · [How It Works](#how-it-works) · [Engineering Notes](#engineering-notes)

![AgenticFlow AI](hero.png)

## What this actually is

Two products sharing one reasoning core:

1. **A policy intelligence engine.** Feed it HR manuals, compliance docs, contracts — it extracts every rule as structured, confidence-scored data and answers questions in seconds, citing the exact page and sentence it used. No hallucinated policy.
2. **An agentic hiring platform.** A 9-agent pipeline takes a resume from upload to onboarded employee: parsing → ATS scoring → requirement matching → AI-drafted assignment → voice + avatar interview → human approval → provisioned accounts → knowledge transfer. Nothing touches a real system without a human clicking approve.

Same orchestration kernel underneath both: parse intent, select the right tool, gate on human approval, execute deterministically, log everything.

## Core Features

### 🧠 Policy & Knowledge Intelligence
- **Dual-tier RAG reasoning** — answers from structured, validated rules first, falls back to raw document chunks only when rules don't cover it, and admits "not found" instead of fabricating an answer.
- **Grounded citations** — every answer links back to the exact page and bounding box in the source PDF, rendered next to the answer.
- **Self-validating extraction** — every extracted rule gets a confidence score; anything under 85% is discarded before it ever reaches the database.
- **Multilingual retrieval** — non-English queries are translated for retrieval so vector search quality never degrades, then answered back in the original language.
- **Interactive knowledge graph** — traces how a departing employee's projects, PRs, and tech stack connect, for whoever backfills them.

### 🤖 Agentic Hiring Pipeline — 9 autonomous agents, one human gate
- **Resume Parser → ATS + Email Extraction → Requirement Matching → Assignment Generator → Candidate Evaluation**, fully autonomous end to end.
- **Telephonic Agent** — AI voice screening calls, WhatsApp-verified, 10+ languages, pay-per-connect.
- **Screening Agent** — 3D avatar interviews (standard, deep-probe, or fully human-structured), proctored, auto-scored, PDF report per candidate.
- **Human-in-the-loop gate** — HR + hiring manager sign off before onboarding fires; nothing is silently automated into production.
- **Live hand-off** — approved hires flow straight into the real onboarding and knowledge-transfer systems below, zero re-entry.

### 🏢 Enterprise Operations
- **One-click onboarding** — provisions accounts, repo access, and equipment automatically across HR / Manager / Employee RBAC portals.
- **Enterprise Orchestration Layer** — the multi-agent kernel: intent parsing → MCP tool selection → approval gate → deterministic, idempotent execution.
- **Track Insights** — auto-generated executive digests: automations run, hours saved, docs indexed, cost saved.
- **Live ROI calculator** — a real cost model, not marketing copy — computes manual-vs-automated screening cost from the same per-unit pricing that bills usage, so the numbers can't drift from reality.

### 🔐 Trust & Infra
- **Zero-trust surface** — RBAC, audit logs, activity monitoring, backup/DR, secure uploads.
- **Dual-provider LLM fallback** — primary calls go to Groq/Grok; on failure the pipeline transparently retries on Gemini, so one provider outage doesn't take the product down.
- **Redis-backed caching** for embeddings and query results, keeping repeat queries fast without re-hitting the LLM or vector DB.
- **18+ native integrations** — Slack, Teams, Jira, GitHub, Salesforce, SAP, SharePoint, and custom MCP connectors.

## How it works

A 6-stage pipeline turns raw PDF text into grounded, structured knowledge:

`Parse → Chunk → Detect → Classify → Extract → Validate` → dual-indexed in **Pinecone** (vector search) + **SQL** (structured queries).

The hiring pipeline runs the same shape of process on a different input — a resume instead of a policy PDF — through nine specialized agents instead of six stages, with one difference: it stops and waits for a human before the final, irreversible step.

## Engineering notes

The parts that make this more than a wrapper around an LLM API:

- **Confidence-gated extraction, not confident-sounding extraction.** Rules under an 85% confidence threshold never reach the database — the system would rather say nothing than say something wrong.
- **Provider-agnostic reasoning.** Groq/Grok is primary; Gemini is a transparent fallback. A rate limit or outage on one provider doesn't degrade the product.
- **Citations carry geometry, not just text.** Each rule keeps its page number and bounding box, so the UI can highlight the *exact* source sentence in the original PDF.
- **A deterministic, resumable agent pipeline.** The hiring workflow is a real state machine (upload → parse → match → generate → evaluate → approve → onboard → transfer knowledge) with in-flight animation state that's invalidated on unmount, not a chain of hopeful `setTimeout`s.
- **Human approval is a hard gate, not a toast notification.** No downstream agent (onboarding, knowledge transfer, email dispatch) fires until HR explicitly confirms — enforced in the state machine, not just in the UI copy.

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 16 (React 19), TypeScript, Tailwind CSS v4, Framer Motion, shadcn/ui, react-pdf |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| AI / Retrieval | Groq/Grok + Gemini (fallback), Pinecone, Sentence-Transformers |
| Infra | Redis (caching), Celery (async task scaffolding), SQLite/PostgreSQL |

## Author

**Ayush Singh** — [GitHub](https://github.com/ayushrajput8252-dev) · [LinkedIn](https://www.linkedin.com/in/ayush-singh-aiml/)

Licensed under [MIT](LICENSE).
