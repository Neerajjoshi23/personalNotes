# HAR → SDK Studio — Scope

**One-liner:** upload a HAR file + a plain-English goal → get a typed TypeScript client that replays the workflow, validated against the recorded traffic. The request dependency graph is visible on an interactive canvas, and secrets never leave unredacted.

**Inspiration:** [Integuru v0](https://github.com/Integuru-AI/Integuru) (CLI-only, Python codegen, OpenAI-only). This is a learning rebuild with a web UI, LangGraph orchestration, and a deterministic eval loop. Credit them in the README.

---

## Problem

Sites without public APIs force developers into DevTools archaeology: export network traffic, guess which request matters, trace where tokens/IDs came from, hand-write integration code. 2–4 hours per integration, breaks silently later.

The HAR file *is* the only written API contract such a site has. This tool reverse-engineers it.

## Non-goals (v1)

- No live-site calls anywhere in the pipeline (replay against recorded HAR only — ToS, auth expiry, rate limits)
- No POST/mutation workflows (read-only GET chains first)
- No multi-step auth (OAuth flows, CAPTCHA, MFA re-challenge)
- No browser extension or Playwright recording mode (v2 candidates)
- No Python codegen (TypeScript only)

## Pipeline

```
HAR upload → noise filter + secret redaction → target selection (LLM)
→ dependency tracing (LangGraph agent) → human approval of graph (interrupt)
→ canvas visualization (React Flow) → TS codegen (LLM)
→ tsc typecheck + sandboxed replay vs recorded responses (deterministic eval)
→ self-heal loop (≤3 bounded retries) → download SDK + report
```

**Architecture (updated 2026-10-30):** Next.js/React UI → one Python FastAPI service (API + LangGraph agent). See "Build order" below (UI first with mock data). Backend patterns come from Week 9 (`week9-fastapi/`).

**Trust model:** LLM output is never trusted. Structured outputs validated by application code; generated code validated by typecheck + execution + schema match. LLM proposes, deterministic layers dispose.

## Build order (UI first)

**Step 0 — UI with mock data, no backend.** Build the React + TypeScript + React Flow UI first, driven by hard-coded JSON fixtures (a sample graph, request/response details, a run report). Cover upload, the canvas, edge correction, the approval screen, the codegen result and the failure report. Keep the UI behind one small API client module, so swapping fixtures for real endpoints later changes nothing else.

**Then:** LangGraph agent (Week 10) → FastAPI endpoints around it (Week 9 patterns: upload limits, auth, Postgres, 202 + SSE progress) → replace the fixtures with real calls.

**Architecture (final):** React UI → **one FastAPI service**: the API layer owns auth, validation, persistence and streaming; the LangGraph agent (checkpoints, tracing) runs inside the same service as a background run. Java/Spring Boot was dropped on 2026-10-30 (see `ai-learning-path.md`).

## Slices

### Slice 1 — HAR → dependency graph → canvas (demo-able alone)
- HAR parser + noise filter (drop static assets, analytics, keep XHR/fetch JSON)
- Secret redaction: mask cookie/auth-header *values* before LLM/storage; keep structure; reversible map held server-side only
- LangGraph agent: target selection from goal prompt, recursive dependency tracing, structured output with validation
- React Flow canvas: nodes = requests, edges = data dependencies ("basketId ← req#3 response.userId"), click to inspect request/response, **user can correct edges** (human-in-the-loop)
- **Done when:** given Juice Shop "get my basket" HAR, tool produces correct chain `login → whoami → basket` on canvas; wrong dependency is correctable by hand; redaction proven by test (no raw cookie value in any stored trace)

### Slice 2 — TS codegen + replay validation
- Codegen node: one typed function per graph node, Zod schemas from recorded responses, wired bottom-up
- Validation harness: `tsc` typecheck → execute with fetch intercepted, answered from recorded HAR → output schema match
- **Done when:** generated client for the Juice Shop sample runs green end-to-end in the sandbox; a deliberately corrupted dependency produces a clear failure report, not silent wrong code

### Slice 3 — self-heal + polish + deploy
- Bounded self-heal (≤3 retries, error fed back verbatim, then honest failure)
- p50/p95 latency + cost per run surfaced in UI (Langfuse)
- Deployed demo with 2 bundled sample HARs (Juice Shop, Restful Booker) + "try a sample" button — no login needed to see it work
- **Done when:** deployed URL works in under 2 minutes for a stranger; README states cost/run and eval pass rates

## Data model (core entities)

```
Run        { id, goal, harHash, status, createdAt, costUsd, latencyMs }
RequestNode{ id, runId, method, url, headers(redacted), bodySchema, responseSchema }
Edge       { id, runId, fromNodeId, toNodeId, param, sourcePath, approvedBy: agent|human }
SecretMap  { runId, placeholder → realValue }  // server memory only, never persisted
EvalResult { runId, stage, pass, error }
```

## Demo targets

| Target | Why |
|---|---|
| OWASP Juice Shop (local Docker) | Real login/JWT/CSRF, free to hammer |
| Restful Booker Platform | Built for API practice, dynamic IDs |
| (stretch) one real read-only account portal | Credibility — only with ToS check |

## Skill mapping (learning plan alignment)

| Path item | Where it lands here |
|---|---|
| Week 9 FastAPI s2 (uploads, errors, request ids) | HAR upload with limits, problem+json |
| Week 9 FastAPI s3–s5 (Postgres, auth, ETag/locking) | runs/nodes/edges storage, per-user runs, human edge edits without lost updates |
| Week 9 FastAPI s6 (SSE, background jobs, retries) | agent progress streamed to the canvas |
| Week 10 s1–3 (state, nodes, routing, retries) | dependency-tracing agent |
| Week 10 s4 (checkpoints, interrupts) | human approval of graph before codegen |
| Week 10 s6 (MCP mini task) | expose "list run requests" as an MCP tool (optional) |
| Week 10 s5 (tests, evals, Langfuse) | traces, cost/latency numbers for README |
| Week 5 evals | replay harness + golden HAR test set |

## Interview angles I can defend

- Why LLM output is never trusted; how verification is manufactured
- Why replay-against-recording instead of live calls (determinism, ToS, CI)
- Redaction design: what counts as a secret, reversible masking, threat model
- Why LangGraph instead of a prompt chain (branching, cycles like token refresh, bounded retries, interrupts)
- Canvas state sync with streaming agent progress; graph rendering at scale

## Security / ethics boundary (README must state)

User's own sessions only, sites they logged into themselves, explicit consent, read-only by default, no third-party data, secrets redacted before LLM. This is an integration tool, not a scraping/credential tool.
