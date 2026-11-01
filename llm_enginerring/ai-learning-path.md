# AI Engineering Learning Path — Neeraj

> **Goal:** Strong LLM engineering skills + a portfolio project by end of 2027
> **This doc = the map** (what to do, in what order). **`progress.md` = the log** (what you've done + learnings).

---

## Rule #1 — Finish the Core Track first

Do **not** buy another course until **Week 8** is done. **Current position (October 30, 2026): Week 5 and its project are done.** **Week 9 (FastAPI backend) is the next main learning block**, then Week 10 (LangGraph). The flagship starts only after Week 10 is complete.

**Sequence:** Week 5 ✓ → Week 9 (FastAPI backend) → Week 10 (LangGraph) → flagship (HAR → SDK Studio) → Week 8 → Week 11 before interviews.

**Shift (decided October 30, 2026):** a FastAPI backend week was inserted as Week 9. The old Week 9 (LangGraph) is now **Week 10**, and the old Week 10 (LLM system design) is now **Week 11**. Spring Boot is parked as an on-demand skill (`C:\Users\neerajj\personal\SpringBootBackend\`); the flagship backend is FastAPI.

**Timing rule:** week lengths are estimates only. A week is done when its "Done when" checks pass, however long that takes. Never cut an eval, a failure-path test or a security test to hit a date.

**Focus until end of January 2027:** LLM track (Week 5 → 11, Weeks 6–7 deferred), system design and frontend. Keep a light DSA habit alongside. Not switching jobs now; no pressure to apply. **Reassess at the end of January** based on actual progress: what is finished, what is solid, and what is still weak. Decide the next step then, not out of fear.

---

## The Spine: Ed Donner — AI Engineer Core Track (8 weeks)

Udemy: [llm-engineering-master-ai-and-large-language-models](https://www.udemy.com/course/llm-engineering-master-ai-and-large-language-models/) · Repo: this folder · Started May 27, 2026

| Week   | Topic                                                                                                                                                                             | Repo     | Status                                         |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------- |
| **1**  | LLM foundations, API calls, tokenization, scraping → brochure generator                                                                                                           | `week1/` | ✓ Done                                         |
| **2**  | Chatbots, Gradio, **tool calling**, multimodal                                                                                                                                    | `week2/` | ✓ Done                                         |
| **3**  | Open-source models, HuggingFace, Colab GPU                                                                                                                                        | `week3/` | ✓ Done                                         |
| **4**  | Advanced techniques                                                                                                                                                               | `week4/` | ✓ Done                                         |
| **5**  | RAG & knowledge bases, embeddings, vector DB, **evals**                                                                                                                           | `week5/` | ✓ Done (course 2026-10-11, TanStack RAG project 2026-10-17) |
| **6**  | Fine-tuning (QLoRA/LoRA)                                                                                                                                                          | `week6/` | ⏸ Deferred — do on demand (2–3 day crash plan) |
| **7**  | Advanced fine-tuning (optional ~$10 spend)                                                                                                                                        | `week7/` | ⏸ Deferred — do on demand                      |
| **8**  | Autonomous agentic AI — capstone                                                                                                                                                  | `week8/` | —                                              |
| **9**  | _Personal extension:_ FastAPI backend (NoteMind, 9 sessions)                                                                                                                      | `week9-fastapi/` | ⏭ **Next main block**                  |
| **10** | _Personal extension:_ LangGraph bridge                                                                                                                                            | —        | After Week 9 (then the flagship)               |
| **11** | _Personal extension:_ LLM system design practice                                                                                                                                  | —        | ⏸ Do 1–2 weeks before interviews               |

**How to work each week:** `git pull` → do every notebook in order (run, tweak, break) → do the week exercise (mandatory, that's the project) → log learnings in `progress.md` → next week.

**Setup (working — don't change):** Ollama + `llama3.2` (free local) · `uv sync` → `.venv` kernel · Claude Enterprise via Adobe for heavy work · Colab free T4 GPU from Week 3 Day 2.

## End of Week 5 — Technical-documentation troubleshooting assistant (✓ Done 2026-10-17)

**Completed.** Built as `tanstack-rag-assistant/` (notes in its `REVIEW.md`), logged in `progress.md`. **Personal practice project: a TanStack Query docs RAG assistant with its own eval harness (baselines, hybrid + RRF, rerank, faithfulness, abstention). Full plan, steps, eval metrics and expected outcome: [`week5/PROJECT.md`](week5/PROJECT.md).**

---

## Week 9 — FastAPI backend (personal extension, not part of Ed's course)

**Status (October 30, 2026): next main learning block.** Full roadmap and 8 session articles: [`week9-fastapi/README.md`](week9-fastapi/README.md).

**Purpose:** own a production-shaped Python backend before building the flagship, by building **NoteMind** (notes + AI summaries) by hand: FastAPI core, problem+json errors and request ids, uploads, Postgres + SQLAlchemy + Alembic, auth and ownership (IDOR), concurrency correctness (ETag/If-Match, `FOR UPDATE`, `ON CONFLICT`, DB idempotency keys), AI streaming over SSE with background jobs, timeouts and retries, testing with a real test DB and a fake LLM, Docker, CI and deploy. Each session maps to the HLD notes in `C:\Users\neerajj\personal\SystemDesign\Notes\HLD\`.

**Target:** ~80-90 hours (9 sessions, including 3.5 SQL by hand). **Done when:** the README's whole-week checklist passes. Log Week 9 in `progress.md`.

---

## Week 10 — LangGraph bridge (personal extension, not part of Ed's course)

**Status (October 30, 2026): after Week 9.** The flagship (HAR → SDK Studio) starts only once all six sessions' completion checks pass.

**Purpose:** connect the course's practical foundations—model calls, prompts/messages, tool calling, retrieval, model internals and fine-tuning—to explicit application orchestration. This is an application-engineering foundation, not a complete course in training foundation models from scratch or production infrastructure. Frameworks organize these mechanisms; they do not replace understanding them.

**Target:** roughly one focused week (6 sessions) for a small working graph plus the MCP mini task, not framework mastery. Use the official [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview) and [Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api). Learn one framework; a separate LangChain course and multiple agent frameworks are not prerequisites.

| Session | Read and implement                                                                                                                                                                                         | Completion check                                                                                                                                    |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | Typed workflow state, nodes, edges, `START`/`END`, compilation and invocation                                                                                                                              | Explain the state passed between steps; build a deterministic graph before adding an LLM                                                            |
| 2       | Add a model call and a document-search tool; validate structured outputs                                                                                                                                   | Unknown document IDs and malformed outputs are rejected by application code                                                                         |
| 3       | Conditional routing, bounded retries and termination                                                                                                                                                       | Exercise an empty search, invalid output and exhausted retry budget; report failures explicitly                                                     |
| 4       | [Persistence/checkpoints](https://docs.langchain.com/oss/python/langgraph/persistence) and [interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts) for approval                           | Pause before applying changes, resume with approval or rejection, and avoid duplicate side effects when execution resumes                           |
| 5       | Tests, a small evaluation set and tracing (set up Langfuse here)                                                                                                                                          | Demonstrate normal, invalid, rejected and failed workflows; explain why a graph helps compared with a simple function pipeline                      |
| 6       | **MCP mini task** — build one small MCP server (official Python SDK) exposing your document-search tool, then call it from a graph node or an MCP client. [MCP docs](https://modelcontextprotocol.io/docs) | The tool has a clear schema, rejects bad input, and is read-only; you can explain MCP vs a direct tool call and the tool-poisoning/permission risks |

**Mini-project:** a backend prototype for the Knowledge Assistant: question → retrieve → grade evidence → answer with citations, or propose an action → validate → user approval → execute through a test adapter. A CLI or test harness is enough this week; React integration and production persistence come later. Keep credentials on the backend, separate checkpoint state by user/workflow, and do not treat checkpointing as authorization or exactly-once execution.

**Scope:** no multi-agent system or deployment platform survey (token streaming is covered in the flagship). Start with direct model/tool calls inside graph nodes; use integrations only when useful. Log Week 10 separately in `progress.md` when you actually do it. Expose the graph through the Week 9 FastAPI patterns (202 + background run, SSE progress) when you wire it to a UI.

---

## Week 11 — LLM system design practice (personal extension)

**Timing (decided October 8, 2026):** do this **1–2 weeks before interviews**, not before building the flagship. **Do during the flagship build** (cannot be recreated later): save your failure story and your cost/latency numbers (p50/p95, cost per question from Langfuse).

**Purpose:** AI engineer interviews include a design round for LLM-backed systems. Use what Weeks 1–9 taught; no new framework. One focused week, then repeat questions over time. Source suggestions are from memory and unverified — check them before use.

**Answer framework** (adapt your RADIO habit from `C:\Users\neerajj\SystemDesign`):

1. Requirements — users, quality bar, latency, cost, data sensitivity, what "wrong" costs.
2. Data — sources, ingestion, chunking, freshness, versioning, access control.
3. Retrieval and model — hybrid search, reranking, prompt/context budget, model choice, structured output.
4. Orchestration — single call vs workflow vs agent; tools, retries, approvals, termination.
5. Evaluation — golden set, retrieval vs generation metrics, regression runs, human review, online feedback.
6. Safety and security — prompt injection, data leakage, output validation, permissions, rate limits.
7. Operations — caching, latency/cost budgets, observability and tracing, fallbacks, rollout.

| Session | Question to design aloud (35–45 min, then self-grade)                | Concepts it forces                                               |
| ------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1       | Docs / support Q&A assistant over a changing corpus                  | Chunking, hybrid search, citations, freshness, evals             |
| 2       | Enterprise knowledge search with per-user permissions                | Access control at retrieval time, leakage, multi-tenancy         |
| 3       | Customer-support agent that can take actions (refund, update ticket) | Tools, approvals, idempotency, bounded retries, audit log        |
| 4       | Code or document assistant at scale (cost and latency focus)         | Caching, model routing, batching, token budgets, streaming       |
| 5       | Evaluation and monitoring platform for an LLM feature                | Golden sets, LLM-as-judge limits, drift, tracing, feedback loops |
| 6       | Your own Knowledge Assistant, end to end                             | Streaming, citations, permissions, approvals, evals              |

**Extra topics to be able to discuss — write a 30-second answer for each and save it next to `progress.md`:**

| #   | Topic                              | The answer should cover                                                                                                                     |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Context engineering and memory     | Token budgeting across history, retrieved text and tool results; summarisation and trimming; short-term vs long-term memory; prompt caching |
| 2   | Online evaluation and feedback     | Thumbs up/down, sampling production traces for review, drift, regression gate before release, LLM-as-judge bias                             |
| 3   | Model routing and fallbacks        | Small model first and escalate; provider outage fallback; rate-limit handling                                                               |
| 4   | Guardrails and compliance          | Input/output filters, PII, audit logs, data residency, human approval for risky actions                                                     |
| 5   | Prompt and model versioning        | Version prompts like code; pin model versions; re-run evals when a provider changes a model                                                 |
| 6   | Agent vs workflow choice           | Chaining, routing, parallelisation, orchestrator-workers; default to the simplest pattern that works                                        |
| 7   | RAG vs fine-tuning vs long context | When each is the right call (fine-tuning: read the concepts only, Weeks 6–7 deferred)                                                       |
| 8   | Hallucination and abstention       | Why citations don't prove correctness; when to say "I don't know"                                                                           |
| 9   | Cost levers                        | Smaller models, caching, prompt trimming, batching                                                                                          |
| 10  | Evaluating agents                  | Why retries need a budget; trajectory and tool-call checks                                                                                  |

**Two personal artifacts to bring to interviews:**

- **A failure story:** one real retrieval, generation or abstention failure from your Week 5 project, with the fix and the measured result.
- **Your cost and latency numbers:** cost per question and p50/p95 latency from Langfuse (Week 10 / flagship), so "what does it cost?" has a real answer.

**Suggested reading (verify):** [OWASP Top 10 for LLM Apps](https://owasp.org/www-project-top-10-for-large-language-model-applications/), [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), RAGAS/DeepEval docs from the free-deepening list below.

**Done when:** you have designed at least 4 of the 6 questions aloud or in writing, graded each with a simple rubric (requirements, retrieval, evals, safety, cost), and saved your answers next to `progress.md`, written the 10 topic answers above, and prepared your failure story and cost/latency numbers. Log lessons in `progress.md`.

---

## Project Ladder (this is how you actually learn)

Each project reuses the previous one's skills and adds one new thing. Complete #1/#2 together through the end-of-Week-5 troubleshooting assistant above; do #4 as the flagship.

| #     | Project                                                                                                                                                                                                                                                                                                                                                                                                                                       | Start after                                      | New skill it forces                                                                                         | Adobe angle                                                                       |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **1** | **Technical-documentation troubleshooting assistant** — bounded, versioned corpus with inspectable passages and citations                                                                                                                                                                                                                                                                                                                     | End of Week 5 (RAG)                              | Ingestion, embeddings, chunking, retrieval and grounding                                                    | Public docs first; approved tooling for any internal data                         |
| **2** | **Eval harness for the same app** — 30+ reviewed cases, development/held-out split and retrieval/answer comparisons; tracing optional initially                                                                                                                                                                                                                                                                                               | With Project #1                                  | Evals, failure analysis, cost/latency measurement                                                           | Demonstrates measured engineering rather than demo-only quality                   |
| **3** | **LangGraph agent prototype** — retrieve, grade evidence, answer or escalate, with bounded retries and approval before any action                                                                                                                                                                                                                                                                                                             | Week 10                                          | Stateful orchestration, tool contracts, checkpoint/resume and error recovery                                | Transferable workflow engineering                                                 |
| **4** | **⭐ HAR → SDK Studio** (flagship, decided 2026-10-17) — upload a HAR file + plain-English goal → typed TypeScript client validated against recorded traffic; LangGraph dependency-tracing agent, React Flow canvas with human graph correction, secret redaction, replay-based evals. Full scope: [`projects/har-sdk-studio/SCOPE.md`](projects/har-sdk-studio/SCOPE.md). Rebuilt-for-learning from Integuru v0 (CLI-only); credit in README | Week 10 complete | LangGraph agent + interrupts, deterministic verification of LLM output, graph canvas UI, security redaction | Dev-tool with provable correctness — "code runs or it doesn't," not chatbot vibes |
| **5** | **Ship it** — deploy #4 to Railway/Render with auth, rate limiting, and monitoring                                                                                                                                                                                                                                                                                                                                                            | anytime after #4                                 | Deployment, guardrails, prod hardening                                                                      | The thing that makes it interview-grade                                           |

**What makes #4/#5 interview-grade (not "I did a course"):** golden eval set · Langfuse monitoring · security (input validation, no raw LLM output → shell/DB, rate limiting) · actually deployed and demoable. Log the build in `progress.md`.

**Flagship scope (HAR → SDK Studio, decided 2026-10-17):** see [`projects/har-sdk-studio/SCOPE.md`](projects/har-sdk-studio/SCOPE.md). The old Knowledge Assistant idea is superseded — the Week 5 TanStack RAG + eval harness already covers that learning, and HAR → SDK Studio is the flagship because correctness is provable (generated code runs or it doesn't). **Architecture (updated 2026-10-30):** Next.js/React UI → one Python **FastAPI** service (API, auth, Postgres, SSE) with the LangGraph agent inside it (tracing, evals). Java/Spring Boot was dropped for this project. **Build order:** UI first with mock data (no backend), then the LangGraph agent, then the FastAPI endpoints around it. Deploy it with bundled sample HARs. Audio Blend stays a React-only project.

**Free deepening — pull in only when a project needs it:**

- Tools/agents → [Anthropic Tool Use](https://docs.anthropic.com/en/docs/tool-use), [MCP docs](https://modelcontextprotocol.io/docs)
- Orchestration → [LangGraph docs](https://docs.langchain.com/oss/python/langgraph/overview) (Week 10 bridge, then deepen through the project)
- RAG evals → [RAGAS](https://docs.ragas.io/), [DeepEval](https://github.com/confident-ai/deepeval)
- Fine-tuning → [HuggingFace LoRA blog](https://huggingface.co/blog/lora)
- Security → [OWASP Top 10 for LLM Apps](https://owasp.org/www-project-top-10-for-large-language-model-applications/) (prompt injection = the new XSS — your security background)

---

## Quick Links

| Resource                  | URL                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Course resources & slides | https://edwarddonner.com/2024/11/13/llm-engineering-resources/                             |
| Ed's full curriculum      | https://edwarddonner.com/2025/05/28/connecting-my-courses-become-an-llm-expert-and-leader/ |
| Progress log              | `progress.md`                                                                              |

_Core course first; one FastAPI backend week; one focused LangGraph bridge; then the deployed, evaluated flagship._
