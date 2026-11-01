# Session 8 - Ship it: Docker, CI, deploy, logs and health checks

**What you build today:** NoteMind goes live. It runs in a Docker image, every push is tested by CI, it's deployed on Render with a managed Postgres and a hosted AI model, and when something goes wrong you can find out **what** from structured logs and health checks, without SSH-ing anywhere.

```
GET /health/live    -> 200 if the process is up
GET /health/ready   -> 200 if it can serve traffic (DB reachable), 503 if not
logs                -> one JSON object per line: level, request_id, path, status, duration_ms...
```

**Time:** about 8-10 hours.

**HLD notes to read alongside:**

- `I-Reliability\I4-Observability-SLOs.md`: logs, metrics, traces, SLOs (sections 1 and 7).
- `A-Fundamentals\A4-DNS-CDN-LoadBalancer-Proxy.md`: what sits in front of your app in production (section 4).
- `I-Reliability\I3-Circuit-Breaker-Bulkhead.md`: why readiness must not depend on the AI (section 2).

## Topics

| # | Topic | After it you can |
|---|---|---|
| 1 | Structured (JSON) logs | Make logs searchable by field, and log the right things |
| 2 | Liveness vs readiness | Write both checks and know what each one must (not) check |
| 3 | Docker image | Build a small, reproducible, non-root image with uv |
| 4 | Behind a proxy | Get the real client IP and scheme; workers vs instances |
| 5 | Migrations on deploy | Run them safely, and know "expand and contract" |
| 6 | Graceful shutdown | Finish in-flight requests when the platform stops you |
| 7 | CI with GitHub Actions | Lint + tests against Postgres on every push |
| 8 | Deploy on Render | Web service + Postgres + env vars + a hosted model |
| 9 | Metrics and SLOs | p50/p95 latency, error rate, and one simple SLO |

---

## 1. Structured (JSON) logs

### Theory

<details>
<summary><b>1) Why JSON instead of text lines</b></summary>

On your laptop you read logs with your eyes. In production, thousands of lines per minute go to a log service (Render's log view, Datadog, Grafana Loki, CloudWatch), and you **query** them:

```
level = "ERROR" AND path = "/api/v1/notes/upload"
request_id = "4f1c9a..."
duration_ms > 1000
```

That only works if each field is a real field. A text line like `INFO [4f1c] GET /x -> 200 in 12.3 ms` must be parsed with fragile regexes. A JSON line is already structured:

```json
{"ts":"2026-12-02T10:00:01+0000","level":"INFO","logger":"notemind.access","msg":"request",
 "request_id":"4f1c9a","method":"GET","path":"/api/v1/notes","status":200,"duration_ms":12.3}
```

</details>

<details>
<summary><b>2) <code>extra=</code>: attaching fields to a log record</b></summary>

```python
log.info("request", extra={"method": "GET", "status": 200, "duration_ms": 12.3})
```

`extra` adds attributes to the log record. Our JSON formatter copies a known list of them into the output. The message stays short and constant (`"request"`), and the details live in fields: easy to count, filter and graph.

</details>

<details>
<summary><b>3) What to log (and what never to log)</b></summary>

| Log | Never log |
|---|---|
| One access line per request: method, path, status, duration, request id, user id | Passwords, tokens, `Authorization`/`Cookie` headers, API keys |
| Every unexpected error with its stack trace | Full request or response bodies (they contain notes = personal data) |
| Important business events: summary failed, quota hit, login throttled | Query strings (may contain tokens) |
| Retries and their reasons | Prompt contents and AI outputs (personal data again) |

User **ids** are fine (they're needed for debugging); emails and note contents aren't.

</details>

<details>
<summary><b>4) Text locally, JSON in production</b></summary>

A `log_format` setting switches the formatter: `text` for your terminal, `json` on Render. Same log calls, different output.

</details>

### Build it

```python
# file: app/logging_setup.py   (replace the whole file)
import json
import logging

from app.middleware import request_id_var

# Fields we copy from `extra=` into the JSON line, when present.
EXTRA_FIELDS = ("method", "path", "status", "duration_ms", "user_id", "summary_id", "error_type")


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        data = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        for key in EXTRA_FIELDS:
            if hasattr(record, key):
                data[key] = getattr(record, key)
        if record.exc_info:
            data["exc"] = self.formatException(record.exc_info)   # stack trace as one string field
        return json.dumps(data, default=str)


def setup_logging(level: str = "INFO", fmt: str = "text") -> None:
    handler = logging.StreamHandler()
    handler.addFilter(RequestIdFilter())
    if fmt == "json":
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s"))
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(level)
    logging.getLogger("uvicorn.access").disabled = True   # we write our own access line (with request id)
```

Settings and the call site:

```python
# file: app/config.py   (add to Settings)
    log_format: Literal["text", "json"] = "text"
```

```python
# file: app/main.py   (in create_app)
    setup_logging(settings.log_level, settings.log_format)
```

Make the access line structured:

```python
# file: app/middleware.py   (replace the access_log.info(...) call)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        access_log.info(
            "%s %s -> %s in %s ms", request.method, request.url.path, response.status_code, duration_ms,
            extra={"method": request.method, "path": request.url.path,
                   "status": response.status_code, "duration_ms": duration_ms},
        )
```

The text formatter still prints the readable message; the JSON formatter adds the fields.

### Try it

`$env:NOTEMIND_LOG_FORMAT="json"; uv run fastapi run app/main.py`, make a few requests including an error, and look at the lines. Copy one into a JSON viewer. Then trigger the `boom` 500 from Session 2: the stack trace is in `exc`, with the same `request_id` as the access line.

---

## 2. Liveness vs readiness

### Theory

<details>
<summary><b>1) Two different questions the platform asks</b></summary>

| Check | Question | If it fails, the platform... | Should check |
|---|---|---|---|
| **Liveness** | "Is the process alive, or stuck?" | **Restarts** the container | Almost nothing: answering at all proves the event loop works |
| **Readiness** | "Can it serve requests right now?" | **Stops sending traffic** to it (no restart) | Critical dependencies: the database |

</details>

<details>
<summary><b>2) Why liveness must be dumb</b></summary>

If liveness checked the database and the database had a 30-second hiccup, the platform would restart **every** instance at the same time. Restarting doesn't fix the database; it just adds a stampede of reconnecting apps when it comes back. Liveness = "the process responds". Nothing more.

</details>

<details>
<summary><b>3) Why readiness must not check the AI</b></summary>

NoteMind without the AI still works: notes, login, uploads. If readiness failed whenever the model provider was slow, a provider outage would take your **whole** app offline. Only check what the app truly can't work without (the database). Degrade gracefully for the rest: summaries fail with a clear 503/error event, everything else keeps working. That's the bulkhead idea at the service level.

</details>

<details>
<summary><b>4) A readiness check must be fast and bounded</b></summary>

`SELECT 1` with a short timeout. A readiness check that hangs for 30 s when the DB is down is worse than one that answers 503 in 2 s. Postgres's `statement_timeout`, set for this one query, bounds it.

</details>

### Build it

```python
# file: app/routers/health.py
import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.db import get_engine
from app.errors import problem

router = APIRouter(prefix="/health", tags=["health"])
log = logging.getLogger("notemind.health")


@router.get("/live")
def live() -> dict[str, str]:
    return {"status": "ok"}   # if this answers, the process and event loop work


@router.get("/ready", response_model=None)
def ready(request: Request) -> dict[str, str] | JSONResponse:
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SET LOCAL statement_timeout = '2s'"))   # bound the check
            conn.execute(text("SELECT 1"))
    except Exception as e:
        log.warning("readiness failed: %s", type(e).__name__)
        return problem(request, 503, "Service Unavailable", "database not reachable")
    return {"status": "ready"}
```

`SET LOCAL` only lasts for the current transaction (which `connect()` starts automatically), so it doesn't leak to other pooled connections.

Replace the old `/health` route in `create_app()` with `app.include_router(health.router)`. Keep a plain `/health` too if anything still calls it.

### Try it

`docker compose stop db`, then `curl.exe -i http://127.0.0.1:8000/health/ready` → 503 within about 2-10 s (connect timeout), while `/health/live` → 200. `docker compose start db` → ready again. Also: stop Ollama → ready is still 200. That's dropdown 3.

---

## 3. A Docker image

### Theory

<details>
<summary><b>1) What an image is, and why build one</b></summary>

An **image** is a frozen filesystem: OS libraries, Python, your dependencies, your code, plus the command to start. The same image runs on your laptop, in CI and on Render. "Works on my machine" becomes "works in this image", which you can run anywhere.

</details>

<details>
<summary><b>2) Layers and caching: why the order of lines matters</b></summary>

Each instruction creates a **layer**, and Docker reuses a layer if nothing it depends on changed. So copy the rarely-changing things first:

```
COPY pyproject.toml uv.lock     <- changes rarely
RUN uv sync (dependencies)      <- cached as long as the two files above are unchanged
COPY app/                       <- changes on every commit
```

Change one line of code and the rebuild takes seconds, because the slow dependency install is reused. Copy everything first and every code change reinstalls all packages.

</details>

<details>
<summary><b>3) Reproducible: <code>uv sync --frozen</code></b></summary>

`--frozen` installs **exactly** what's in `uv.lock` and fails instead of resolving new versions. The image built today and the one built next month contain the same packages. `--no-dev` leaves out pytest and ruff.

</details>

<details>
<summary><b>4) Don't run as root</b></summary>

By default a container process runs as root. If an attacker finds a bug that lets them run code in your app, root makes it far worse (writing anywhere, installing tools). A dedicated unprivileged user costs two lines.

</details>

<details>
<summary><b>5) <code>.dockerignore</code>: what must never get into the image</b></summary>

`.env` (your secrets!), `.venv` (built for Windows, useless and huge in Linux), `.git`, caches, tests. Docker copies the whole folder as the "build context" unless told otherwise, and anything in the image can be read by anyone who gets the image.

</details>

### Build it

```
# file: .dockerignore
.env
.env.*
!.env.example
.venv
.git
__pycache__
.pytest_cache
.ruff_cache
.coverage
tests
scripts
*.md
*.json
*.txt
```

(The `*.json`/`*.txt`/`*.md` lines keep your curl test files out; adjust if you ever need such files in the image.)

```dockerfile
# file: Dockerfile
FROM python:3.12-slim

# uv binary from its official image. Pin it to the version you use locally (uv --version).
COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"
# PYTHONUNBUFFERED: log lines appear immediately, not when a buffer fills

WORKDIR /app

# 1) dependencies only: this layer is cached until pyproject.toml / uv.lock change
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# 2) the code: changes often, rebuilds in seconds
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app
RUN uv sync --frozen --no-dev

# 3) never run as root
RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8000
# exec form (JSON array): the server is PID 1 and receives SIGTERM directly (section 6)
CMD ["fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
```

Add the API to `docker-compose.yml`, so the whole stack runs with one command:

```yaml
# file: docker-compose.yml   (add under services:)
  api:
    build: .
    depends_on:
      db:
        condition: service_healthy
    environment:
      NOTEMIND_DATABASE_URL: postgresql+psycopg://notemind:notemind@db:5432/notemind   # "db" = the service name
      NOTEMIND_JWT_SECRET: ${NOTEMIND_JWT_SECRET}      # read from your shell or .env, never written here
      NOTEMIND_LOG_FORMAT: json
      NOTEMIND_LLM_BASE_URL: http://host.docker.internal:11434/v1   # Ollama on your Windows host
    ports:
      - "8000:8000"
```

### Run it

```powershell
docker compose build api
docker compose run --rm api alembic upgrade head
docker compose up api
curl.exe -i http://127.0.0.1:8000/health/ready
docker image ls        # check the image size; python:3.12-slim based images are usually a few hundred MB
```

Inside a container, `localhost` is the container itself, so the database URL uses the **service name** `db`, and Ollama on your Windows machine is reached at `host.docker.internal`.

---

## 4. Behind a proxy: what's in front of your app

### Theory

<details>
<summary><b>1) The request path in production</b></summary>

```
browser --HTTPS--> Render's load balancer / proxy --HTTP--> your container (port 8000)
```

The proxy terminates TLS (HTTPS), then forwards plain HTTP to your app. So your app sees:

- the client address = **the proxy's IP**, not the user's,
- the scheme = `http`, even though the user used `https`.

The proxy passes the originals in headers: `X-Forwarded-For` (client IP) and `X-Forwarded-Proto` (scheme).

</details>

<details>
<summary><b>2) Trusting forwarded headers, but only from the proxy</b></summary>

uvicorn can read those headers (`--proxy-headers`, which `fastapi run` enables), but it only **trusts** them from the IPs in `--forwarded-allow-ips` (by default just `127.0.0.1`). Why the restriction: anyone can send `X-Forwarded-For: 1.2.3.4`. Trusting it from everyone lets attackers fake their IP and dodge per-IP rate limits.

On a platform where only the platform's proxy can reach your container, setting the env var `FORWARDED_ALLOW_IPS="*"` is common. Know what you're trusting and why. Your login throttle (Session 4, practice task 3) depends on this.

</details>

<details>
<summary><b>3) Workers vs instances</b></summary>

- **Workers** (`--workers 4`): several Python processes in **one** container, sharing its CPU and memory. Python runs one thread at a time per process, so workers use more CPU cores.
- **Instances**: several **containers**, often on different machines, behind the load balancer. More capacity and survives one machine dying.

Either way, each process has its own memory: its own pool, LLM semaphore and login throttle. Everything that must be shared lives in Postgres (Sessions 1 and 5 were the warm-up for exactly this moment). A small free/starter instance: one worker is fine.

</details>

---

## 5. Migrations on deploy

### Theory

<details>
<summary><b>1) When to run <code>alembic upgrade head</code></b></summary>

Before the new code starts serving, because the new code expects the new schema. Options:

- **A release / pre-deploy step**: the platform runs a command once, before switching traffic (Render calls it a "pre-deploy command" on paid plans). Best option.
- **At container start**: `alembic upgrade head && fastapi run ...`. Simple, but with several instances starting at once they'd all try to migrate. Alembic doesn't lock against that. OK for one instance.

</details>

<details>
<summary><b>2) Expand and contract: migrations without downtime</b></summary>

During a deploy, old and new code run **at the same time** for a moment. So each migration must work with both versions. Renaming `body` to `content` in one step breaks the old code instantly. Instead:

1. **Expand:** add `content`; deploy code that writes both columns and reads `content` falling back to `body`.
2. **Migrate data:** backfill `content` from `body`.
3. **Contract:** deploy code that only uses `content`; then drop `body` in a later migration.

Your Session 4 `owner_id` migration was a small version of this (nullable → backfill → NOT NULL).

</details>

<details>
<summary><b>3) Migrations are one-way in production</b></summary>

`downgrade` is great locally. In production, rolling back a migration that dropped a column doesn't bring the data back. Make each migration backward-compatible instead, and roll **forward** with a fix. And back up before risky migrations (managed Postgres does daily backups; know how to restore one).

</details>

---

## 6. Graceful shutdown

### Theory

<details>
<summary><b>1) What happens when the platform stops your container</b></summary>

On every deploy (and scale-down), the platform sends **SIGTERM** to the main process and, after a grace period (often 30 s), **SIGKILL**, which can't be caught. Between the two, uvicorn:

1. stops accepting new connections,
2. waits for in-flight requests to finish (`--timeout-graceful-shutdown` caps how long),
3. runs your lifespan shutdown code (close the LLM client, dispose the DB pool),
4. exits.

That's why `CMD` uses the exec form `["fastapi", "run", ...]`: in shell form (`CMD fastapi run ...`), a shell is PID 1 and may not forward SIGTERM to the server, so you'd always get killed hard.

</details>

<details>
<summary><b>2) What graceful shutdown can't save</b></summary>

A 40-second AI stream or a background job still running when SIGKILL arrives is cut off. That's acceptable **because** of Session 6: the summary row stays `running`, and the reaper on the next start marks it `failed`, so the user sees a clear failure and can retry. Designing for "we will be killed at some point" is the real lesson.

</details>

---

## 7. CI with GitHub Actions

### Theory

<details>
<summary><b>1) What CI gives you</b></summary>

On every push and pull request, a fresh machine checks out the code, installs exactly the locked dependencies, runs the linter and the full test suite against a real Postgres, and marks the commit green or red. Nobody merges red. Your tests only protect you if they **always** run, and CI makes sure they do.

</details>

<details>
<summary><b>2) Service containers</b></summary>

GitHub Actions can start a Postgres container next to the job (`services:`), with a health check, exactly like your docker-compose. The tests then use `NOTEMIND_TEST_DATABASE_URL` pointing to it. The test database setup from Session 7 works unchanged.

</details>

<details>
<summary><b>3) Secrets in CI</b></summary>

Tests use a fake JWT secret (set in `conftest.py`) and the fake LLM, so CI needs **no real secrets**. That's good design. If a job ever needs one (deploying, for example), store it in the repo's **Actions secrets**, never in the YAML file.

</details>

### Build it

```yaml
# file: .github/workflows/ci.yml
# (if notemind/ isn't the repo root, set `defaults: run: working-directory:` to its folder)
name: ci
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      db:
        image: pgvector/pgvector:pg17
        env:
          POSTGRES_USER: notemind
          POSTGRES_PASSWORD: notemind
          POSTGRES_DB: notemind_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U notemind"
          --health-interval 5s
          --health-retries 10
    env:
      NOTEMIND_TEST_DATABASE_URL: postgresql+psycopg://notemind:notemind@localhost:5432/notemind_test
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6      # check the action's README for the current major version
      - run: uv sync --frozen
      - run: uv run ruff check .
      - run: uv run pytest -q --cov=app
```

Push it to GitHub and open the **Actions** tab. Then break a test on a branch and watch the red X on the pull request.

---

## 8. Deploy on Render

### Theory

<details>
<summary><b>1) The pieces</b></summary>

```
Vercel (Next.js frontend)  --HTTPS-->  Render Web Service (your Docker image)  -->  Render Postgres
                                                  |
                                                  +--> hosted LLM provider (OpenAI-compatible API)
```

- **Web service:** built from your `Dockerfile`, on every push to `main` (after CI is green, ideally).
- **Postgres:** a managed database. Render gives you an internal connection URL.
- **Environment variables:** all `NOTEMIND_*` settings, set in the Render dashboard.

Free tiers and their limits change; check Render's current pricing page before you rely on one (free web services typically sleep when idle, and free databases may expire).

</details>

<details>
<summary><b>2) The AI in production</b></summary>

Render can't run Ollama for you on a small instance. Point the same OpenAI-compatible client at a hosted provider: set `NOTEMIND_LLM_BASE_URL`, `NOTEMIND_LLM_MODEL` and `NOTEMIND_LLM_API_KEY`. No code changes (Session 6, section 1). Before going live:

- set a **monthly spend limit** in the provider's dashboard,
- keep `NOTEMIND_AI_DAILY_LIMIT` low (5-10) for a public demo,
- remember every summarized note is sent to that provider (Session 6, section 8).

</details>

<details>
<summary><b>3) The checklist of production settings</b></summary>

| Variable | Production value | Why |
|---|---|---|
| `NOTEMIND_ENV` | `prod` | |
| `NOTEMIND_DATABASE_URL` | Render's internal URL, with the `postgresql+psycopg://` prefix | Render gives `postgres://...`; SQLAlchemy needs the dialect+driver prefix |
| `NOTEMIND_JWT_SECRET` | a fresh 48+ char random secret | never reuse your dev one |
| `NOTEMIND_ALLOWED_ORIGINS` | `["https://your-app.vercel.app"]` | exact frontend origin |
| `NOTEMIND_LOG_FORMAT` | `json` | |
| `NOTEMIND_LLM_*` | hosted provider | |
| `FORWARDED_ALLOW_IPS` | `*` | read the real client IP from Render's proxy (section 4) |

Health check path in Render: `/health/ready`.

</details>

### Do it

1. Push `notemind` to a GitHub repo (check that `.env` is **not** in it: `git ls-files | Select-String .env` must show only `.env.example`).
2. Render → New → **PostgreSQL**. Copy the **internal** database URL and change the prefix to `postgresql+psycopg://`.
3. Render → New → **Web Service** → your repo → runtime **Docker**. Set the env vars from the table, health check path `/health/ready`.
4. Migrations: if your plan has a pre-deploy command, set it to `alembic upgrade head`. Otherwise use the start command `sh -c "alembic upgrade head && fastapi run app/main.py --host 0.0.0.0 --port 8000"` (fine with one instance; section 5).
5. Deploy. Watch the logs: JSON lines, the startup message, the reaper.
6. Smoke test against the public URL: `/health/ready`, register, login, create a note, stream a summary with `curl.exe -N`. If tokens arrive all at once at the end, suspect proxy buffering (Session 6, section 4).

---

## 9. Metrics and SLOs (the simple version)

### Theory

<details>
<summary><b>1) Logs, metrics, traces</b></summary>

- **Logs**: individual events with details. "What happened to request 4f1c?"
- **Metrics**: numbers over time. "How many 5xx per minute? What's the p95 latency?"
- **Traces**: one request's path through many services, with timing per step. "Which part of this slow request was slow?"

NoteMind is one service, so logs plus a few metrics are enough. In Week 10, Langfuse adds traces for the AI part (model calls, tokens, cost per request).

</details>

<details>
<summary><b>2) Why p95, not the average</b></summary>

The average hides pain. If 95 requests take 50 ms and 5 take 4 s, the average is about 250 ms, which looks fine, while 1 in 20 users waits 4 seconds. **Percentiles**: p50 (median) = the typical user; p95 = the slow tail that 1 in 20 requests hits; p99 for stricter needs. Your `duration_ms` log field is all you need to compute them.

</details>

<details>
<summary><b>3) SLIs, SLOs and error budgets</b></summary>

- **SLI** (indicator): something you measure, e.g. "share of non-AI requests that succeed in under 300 ms".
- **SLO** (objective): the target, e.g. "99% over 30 days".
- **Error budget**: the allowed 1%. While you're within budget, ship features; when it's used up, prioritize reliability.

AI endpoints get their own SLIs: "time to first token < 3 s for 95% of streams", "summary success rate > 98%". Mixing them with CRUD latency would make both numbers meaningless.

</details>

<details>
<summary><b>4) Prometheus, briefly</b></summary>

For real dashboards and alerts, apps expose a `/metrics` endpoint in Prometheus format (counters and histograms), which a Prometheus server scrapes, and Grafana graphs. In FastAPI, `prometheus-fastapi-instrumentator` adds request metrics in a few lines. Keep `/metrics` off the public internet. Optional for NoteMind (practice task 3).

</details>

### Try it

From your local JSON logs (or Render's log export), compute p50/p95 for `GET /api/v1/notes` with a tiny script:

```python
# file: scripts/latency.py
"""Usage: uv run python scripts/latency.py app.log /api/v1/notes"""
import json
import statistics
import sys

path_filter = sys.argv[2]
durations = []
with open(sys.argv[1], encoding="utf-8") as f:
    for line in f:
        try:
            rec = json.loads(line)
        except ValueError:
            continue   # skip non-JSON lines (uvicorn startup text)
        if rec.get("path") == path_filter and "duration_ms" in rec:
            durations.append(rec["duration_ms"])

if len(durations) < 20:
    sys.exit(f"only {len(durations)} samples, make more requests first")
q = statistics.quantiles(durations, n=100)   # q[49] = p50, q[94] = p95
print(f"n={len(durations)}  p50={q[49]:.1f} ms  p95={q[94]:.1f} ms  max={max(durations):.1f} ms")
```

```powershell
$env:NOTEMIND_LOG_FORMAT="json"; uv run fastapi run app/main.py 2> app.log
# in another terminal, make 50+ requests (a loop in a script), then:
uv run python scripts/latency.py app.log /api/v1/notes
```

(Python logging writes to stderr, hence `2>`.)

---

## Practice tasks

1. Add `user_id` to the access log line (set it on `request.state` in `get_current_user`, read it in the middleware). Then find all requests of one user in the logs.
2. Add a startup log line with the app version and the git commit (passed as a build arg / env var `NOTEMIND_GIT_SHA`). When a bug report comes in, you'll know exactly which code was running.
3. Add `prometheus-fastapi-instrumentator`, expose `/metrics` only when `env != "prod"` (or protect it), and look at the request histogram.
4. Write `render.yaml` (a Render Blueprint) describing the web service and database, so the whole setup is code in the repo.
5. Add a second CI job that builds the Docker image (`docker build .`), so a broken Dockerfile fails CI instead of the deploy.
6. Write a one-page `RUNBOOK.md` for NoteMind: how to check health, find a request by id, see failing summaries (SQL), roll back a deploy, rotate the JWT secret (what happens to logged-in users?), and restore the database from a backup.

## Interview questions

<details>
<summary><b>1) Liveness vs readiness probes: what does each check?</b></summary>

Liveness asks "is the process stuck?", and failing it restarts the container, so it should check almost nothing (just respond). Readiness asks "can it serve traffic now?", and failing it removes the instance from the load balancer without restarting it, so it checks critical dependencies like the database, quickly and with a timeout. Don't put non-critical dependencies (an AI provider) in readiness, or their outage takes the whole service down. Degrade those features instead.

</details>

<details>
<summary><b>2) How do you deploy schema changes without downtime?</b></summary>

Expand and contract: make every migration compatible with both the old and new code, because both run during a rollout. Add new columns or tables first (nullable or with defaults), deploy code that writes both and reads the new one with a fallback, backfill in batches, switch reads, and only drop old columns in a later release. Run migrations as a single pre-deploy step, avoid long table locks (create indexes concurrently), and roll forward rather than down in production.

</details>

<details>
<summary><b>3) What happens when your container is stopped during a deploy, and how do you handle it?</b></summary>

The platform sends SIGTERM, then SIGKILL after a grace period. The server must be PID 1 (exec-form CMD) to receive SIGTERM; it then stops accepting connections, drains in-flight requests and runs shutdown hooks (close pools and clients). Long work can still be cut off, so design for it: persist job state, make work retryable or idempotent, and reap or requeue interrupted jobs on startup.

</details>

<details>
<summary><b>4) Why structured logs, and what do you log?</b></summary>

JSON logs make every field queryable and aggregatable (filter by request id, count errors by path, compute latency percentiles) without fragile parsing. Log one access line per request (method, path, status, duration, request id, user id), all unexpected errors with stack traces, retries, and key business events. Never log secrets, tokens, auth headers, full bodies or personal content, and keep query strings out.

</details>

<details>
<summary><b>5) Why p95 latency instead of the average, and what's an SLO?</b></summary>

Averages hide the slow tail that real users feel. p95 shows what 1 in 20 requests experiences. An SLI is a measured indicator (for example, the fraction of requests faster than 300 ms and successful); an SLO is the target for it over a window (99% over 30 days); the remaining 1% is the error budget, which guides how much risk you can take with releases. AI features get separate SLIs, such as time to first token and success rate.

</details>

<details>
<summary><b>6) Why does the client IP look wrong behind a load balancer, and how do you fix it safely?</b></summary>

The proxy terminates the connection, so the app sees the proxy's IP and plain HTTP. The original IP and scheme arrive in `X-Forwarded-For` and `X-Forwarded-Proto`. Configure the server to trust these headers only from the proxy's addresses (uvicorn's `--forwarded-allow-ips`), because clients can forge them, which would break IP-based rate limits and logs.

</details>

## Done when

- [ ] Logs are JSON in production mode, with `request_id`, `path`, `status`, `duration_ms`, and stack traces in `exc`.
- [ ] `/health/live` stays 200 when the DB is down; `/health/ready` returns 503 quickly; stopping the AI doesn't affect readiness.
- [ ] `docker compose up` runs API + DB from the image, as a non-root user, without `.env` inside the image.
- [ ] CI runs ruff + the full test suite against Postgres on every push, and I've seen it go red and green.
- [ ] NoteMind is deployed on Render with a hosted model: register, login, notes and a streamed summary work on the public URL.
- [ ] I computed p50/p95 for one endpoint from my own logs.
- [ ] I can explain liveness vs readiness, graceful shutdown and expand/contract without notes.
- [ ] I wrote `RUNBOOK.md` (practice task 6), even a short one.

## Reading

- FastAPI in containers (Docker): https://fastapi.tiangolo.com/deployment/docker/
- FastAPI behind a proxy: https://fastapi.tiangolo.com/advanced/behind-a-proxy/
- uv in Docker: https://docs.astral.sh/uv/guides/integration/docker/
- uv in GitHub Actions: https://docs.astral.sh/uv/guides/integration/github/
- Uvicorn settings (proxy headers, graceful shutdown): https://www.uvicorn.org/settings/
- Render docs, Docker deploys and Postgres: https://render.com/docs
- Google SRE book, "Service Level Objectives": https://sre.google/sre-book/service-level-objectives/
- The Twelve-Factor App (config, logs, disposability): https://12factor.net/
