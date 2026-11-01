# Week 9 - FastAPI backend (personal extension)

Goal: learn a production-shaped Python backend by building **NoteMind**, a notes app with AI, step by step and by hand. Users write or upload notes, add tags, and ask the AI (Ollama locally, a hosted model in production) for a summary that streams in live. After this week, the same skills go into the flagship (HAR → SDK Studio) backend.

Why FastAPI and not Spring Boot (decided 2026-10-30): the target role is full-stack AI engineer; the agent (LangGraph) is Python, office work is frontend/TypeScript/Python, and one Python service takes half the time of Spring + Python. Backend concepts (transactions, idempotency, auth, retries) are the same in any language. Spring Boot is parked in `C:\Users\neerajj\personal\SpringBootBackend\` as an on-demand fallback.

**Sequence:** Week 5 ✓ → **Week 9 FastAPI (this)** → Week 10 LangGraph → flagship → Week 8 → Week 11 LLM system design before interviews.

- **Time:** ~80-90 hours over 9 sessions (1-8 plus 3.5). A session is done when its "Done when" boxes are ticked, not when the hours are used.
- **Code lives in:** `C:\Users\neerajj\personal\llm_enginerring\week9-fastapi\notemind\` (created in Session 1).
- **Format of each session:** theory in numbered dropdowns (small code + explanation), then "Build it" with commented code, "Run it", "Try it" (break it on purpose), practice tasks, interview questions (also dropdowns: answer first, then peek), "Done when".
- **Honesty note:** the code was written carefully but not executed while writing. If something differs, the official docs win; write the fix in `progress.md`.

## Sessions

| # | Article | What NoteMind gains | Hours | HLD notes alongside |
|---|---|---|---|---|
| 1 | [`session-1-python-fastapi-core.md`](session-1-python-fastapi-core.md) | Notes CRUD in memory, Pydantic models, `Depends`, settings, lifespan, `def` vs `async def`, a race condition | 8-10 | A2 Request-Flow, A7 Scaling-Basics |
| 2 | [`session-2-errors-logging-uploads.md`](session-2-errors-logging-uploads.md) | One error format (problem+json), request ids in logs, `.md`/`.txt` upload with limits, idempotency key, CORS, first tests | 10-12 | A6 API-Design, D3 Delivery-Semantics-Idempotency |
| 3 | [`session-3-postgres-sqlalchemy.md`](session-3-postgres-sqlalchemy.md) | Postgres in Docker, SQLAlchemy 2.0, Alembic, transactions, many-to-many tags, N+1 fix, index with `EXPLAIN` | 12-14 | B1 Data-Models, B2 Indexes, B3 Transactions-Isolation |
| 3.5 | [`session-3.5-sql-by-hand.md`](session-3.5-sql-by-hand.md) | Plain SQL in `psql` on a fixed practice dataset: filters, NULL, joins and anti-joins, GROUP BY/HAVING/FILTER, fan-out, subqueries, CTEs, window functions, dates, percentiles, safe writes. 36 exercises with answers | 6-8 | B1 Data-Models, B2 Indexes |
| 4 | [`session-4-auth-security.md`](session-4-auth-security.md) | Users, Argon2, JWT login, "only my notes" (IDOR), migration with existing data, login throttle, OWASP checklist | 8-10 | A6 API-Design (auth), C2 Redis (rate limits) |
| 5 | [`session-5-data-correctness.md`](session-5-data-correctness.md) | Lost updates → ETag/If-Match, limit race → `FOR UPDATE`, tag race → `ON CONFLICT`, idempotency keys in Postgres, deadlocks | 8-10 | B3 Transactions-Isolation, G1 Locking, D3 Idempotency, G2 (skim) |
| 6 | [`session-6-ai-streaming-background.md`](session-6-ai-streaming-background.md) | AI summaries streamed over SSE, 202 background jobs, timeouts, retries with jitter, concurrency cap, quota, prompt injection | 10-12 | E1 Polling-SSE-WebSocket, D5 Async-Request-Reply, I2 Timeouts-Retries, D1 Queues |
| 7 | [`session-7-testing.md`](session-7-testing.md) | Real test DB with rollback per test, dependency overrides, fake AI, auth/IDOR/N+1 tests, failure paths, coverage, ruff | 8-10 | I3 Circuit-Breaker-Bulkhead, I4 (skim) |
| 8 | [`session-8-deploy-observability.md`](session-8-deploy-observability.md) | JSON logs, liveness/readiness, Dockerfile, CI, deploy on Render with a hosted model, p50/p95, SLOs | 8-10 | I4 Observability-SLOs, A4 DNS-CDN-LB-Proxy, I3 |

HLD notes are in `C:\Users\neerajj\personal\SystemDesign\Notes\HLD\`.

**Left out on purpose (no bloat):** Redis cache, Celery/arq workers, Kafka, microservices, GraphQL, async SQLAlchemy, WebSockets. Sessions say when you'd reach for them.

## How to work

1. Read the theory dropdowns and the HLD notes (good for 1-hour days).
2. Type the code yourself (holiday days). Read the comments as you type.
3. Do every "Try it", at least half the practice tasks, and the interview questions aloud.
4. Tick "Done when" and log learnings in `progress.md` under "Week 9".

## How this feeds the flagship (HAR → SDK Studio)

| NoteMind skill | Where it lands in the flagship |
|---|---|
| Upload limits, safe parsing (S2) | HAR upload: size cap, JSON validation, allowlisted fields |
| Problem+json, request ids (S2) | Same error and logging setup, copied over |
| Postgres + Alembic + transactions (S3) | Runs, request nodes, edges, eval results |
| Auth + ownership (S4) | Users only see their own runs |
| ETag/If-Match (S5) | Human edge corrections on the canvas without lost updates |
| SSE + background jobs + retries (S6) | Agent progress streamed to the React Flow canvas; LangGraph runs in the background |
| Test DB + fakes (S7) | Fake LLM for deterministic agent tests |
| Docker + CI + deploy (S8) | Deployed demo with sample HARs |

## Done when (whole week)

- [ ] All nine session "Done when" lists are ticked (1-8 and 3.5).
- [ ] Every error returns one problem+json shape with a request id.
- [ ] A user can't read or edit another user's notes (a test proves it).
- [ ] An AI summary streams to the client over SSE, and a failed AI call ends as a clear failed status, never a hang.
- [ ] The API runs in Docker, CI is green, and it's deployed with a working readiness check.
- [ ] I can explain without notes: request flow, `def` vs `async def`, transaction boundaries, optimistic vs pessimistic locking, idempotency keys, JWT validation, IDOR, SSE vs WebSocket, retries with jitter, liveness vs readiness.
