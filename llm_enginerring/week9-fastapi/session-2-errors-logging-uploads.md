# Session 2 - Errors, logging, file uploads, idempotency, CORS and first tests

**What you build today:** NoteMind becomes something a real frontend can talk to.

- Every error, whatever caused it, returns **one JSON shape**, so the frontend needs only one error handler.
- Every request gets a **request id** that shows up in every log line and every error, so "user says it failed" turns into "here's exactly what happened".
- Users can **upload a `.md` or `.txt` file** and get a note from it, with size and content checks.
- Creating a note is **idempotent**: a double-click or a network retry doesn't create two notes.
- The Next.js dev server is allowed to call the API (**CORS**).
- You write your **first automated tests**.

New or changed endpoints:

```
POST /api/v1/notes            -> now accepts an Idempotency-Key header
POST /api/v1/notes/upload     -> multipart form: file (.md/.txt, max 1 MB) + tags
any error                     -> application/problem+json with requestId
```

**Time:** about 10-12 hours.

**HLD notes to read alongside:**

- `A-Fundamentals\A6-API-Design.md`: status codes, error formats, idempotency, versioning.
- `D-Async\D3-Delivery-Semantics-Idempotency.md`: why "retry" and "exactly once" need idempotency keys.

## Topics

| # | Topic | After it you can |
|---|---|---|
| 1 | One error format | Return RFC 9457 problem+json for every error: 404, 405, 413, 422, 429, 500 |
| 2 | Typed errors from the service | Raise `NotFound`/`TooManyRequests` in the service, map them in one place |
| 3 | Logging and request ids | Set up logging, tag every line with a request id using a `ContextVar` |
| 4 | Middleware | Write one, and know the order middleware runs in |
| 5 | File uploads | Accept a file safely: size limit, encoding check, safe filename handling |
| 6 | Idempotency keys | Make "create" safe to retry |
| 7 | CORS | Allow your frontend, and know why CORS is not security |
| 8 | First tests | Test the API with `TestClient` and `dependency_overrides` |

---

## 1. One error format for the whole API

### Theory

<details>
<summary><b>1) The problem: right now, errors come in three different shapes</b></summary>

Try these against your Session 1 code:

```powershell
curl.exe -s http://127.0.0.1:8000/api/v1/notes/00000000-0000-0000-0000-000000000000
# {"detail":"note not found"}                        <- detail is a string

curl.exe -s "http://127.0.0.1:8000/api/v1/notes?limit=500"
# {"detail":[{"type":"less_than_equal","loc":[...]}]} <- detail is a list

# and an unhandled bug returns plain text:  Internal Server Error
```

The frontend now needs three code paths just to show a message. One shape fixes that.

</details>

<details>
<summary><b>2) RFC 9457 "Problem Details": a standard error shape</b></summary>

It's an internet standard, so many tools and teams already know it. The content type is `application/problem+json`, and the fields are:

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "note not found",
  "instance": "/api/v1/notes/0000...",
  "requestId": "4f1c9a..."
}
```

| Field | Meaning |
|---|---|
| `type` | A URL identifying the kind of error. `about:blank` means "just look at the status" |
| `title` | Short, the same for every error of this kind ("Not Found") |
| `status` | The HTTP status, repeated in the body (handy in logs) |
| `detail` | The human message for *this* error |
| `instance` | Which URL it happened on |
| anything else | Extension fields: we add `requestId`, and `errors` for validation |

</details>

<details>
<summary><b>3) How FastAPI turns an exception into a response</b></summary>

When something raises inside your route, the exception travels **up** until something catches it:

```
your function raises NotFound("note not found")
  -> FastAPI looks up its exception handlers: "is there a handler for NotFound or a parent class?"
       yes -> call it -> it returns a Response -> sent to the client
       no  -> the exception keeps travelling up -> Starlette's error middleware -> plain 500
```

You register handlers with `@app.exception_handler(SomeError)`. A handler for a **parent class** also catches child classes. So one handler for `AppError` covers `NotFound`, `Conflict` and every other subclass.

</details>

<details>
<summary><b>4) The four handlers we need, and why each one exists</b></summary>

| Handler for | Catches | Example |
|---|---|---|
| `AppError` (ours) | Errors our service raises on purpose | Note not found, limit reached |
| `RequestValidationError` | FastAPI's input validation failures | Title too long, bad UUID |
| `StarletteHTTPException` | Errors the framework raises itself | Unknown URL (404), wrong method (405) |
| `Exception` | Everything else = bugs | `KeyError` in your code |

Why the Starlette one and not FastAPI's `HTTPException`? FastAPI's `HTTPException` is a subclass of Starlette's. Routing errors (an unknown path) raise the Starlette one, so handling the parent catches both.

</details>

<details>
<summary><b>5) Never put internals in a 500</b></summary>

For a bug, the client gets only `"detail": "unexpected error"` and the `requestId`. The stack trace goes to **your logs**, never to the client. A stack trace can show file paths, library versions, SQL queries, sometimes data: useful to an attacker, useless to a user.

With the request id, support can find the full trace: the user reports "requestId 4f1c9a", you search your logs for it.

</details>

<details>
<summary><b>6) Don't echo input back in validation errors</b></summary>

FastAPI's default 422 includes `"input"`: the exact value the client sent. For a login form, that would be the password, written into browser devtools, proxies and maybe your logs. Our validation handler keeps `loc`, `msg` and `type`, and drops `input`.

</details>

### Build it

```python
# file: app/errors.py
import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("notemind.errors")


class AppError(Exception):
    """Base class for errors we raise on purpose. Subclasses set status_code and title."""

    status_code = 500
    title = "Internal Server Error"

    def __init__(self, detail: str, headers: dict[str, str] | None = None, **extra: object) -> None:
        super().__init__(detail)
        self.detail = detail      # the human message for this case
        self.headers = headers    # e.g. Retry-After, WWW-Authenticate (Session 4)
        self.extra = extra        # extra JSON fields, e.g. errors=[...]


class BadRequest(AppError):
    status_code, title = 400, "Bad Request"


class NotFound(AppError):
    status_code, title = 404, "Not Found"


class Conflict(AppError):
    status_code, title = 409, "Conflict"


class PayloadTooLarge(AppError):
    status_code, title = 413, "Content Too Large"


class Unprocessable(AppError):
    status_code, title = 422, "Unprocessable Content"


class TooManyRequests(AppError):
    status_code, title = 429, "Too Many Requests"


def problem(
    request: Request,
    status: int,
    title: str,
    detail: str,
    headers: dict[str, str] | None = None,
    **extra: object,
) -> JSONResponse:
    """Build one RFC 9457 problem+json response. Every error in the app goes through here."""
    body: dict[str, object] = {
        "type": "about:blank",
        "title": title,
        "status": status,
        "detail": detail,
        "instance": request.url.path,                               # path only, never the query string
        "requestId": getattr(request.state, "request_id", None),   # set by our middleware (section 3)
    }
    body.update(extra)
    return JSONResponse(body, status_code=status, headers=headers, media_type="application/problem+json")


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        return problem(request, exc.status_code, exc.title, exc.detail, exc.headers, **exc.extra)

    @app.exception_handler(RequestValidationError)
    async def handle_validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        # keep where + what; drop "input" (could be a password) and "ctx" (may not be JSON-serializable)
        errors = [{"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
        return problem(request, 422, "Unprocessable Content", "request has invalid fields", errors=errors)

    @app.exception_handler(StarletteHTTPException)
    async def handle_http(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        # unknown path (404), wrong method (405), and any HTTPException raised by FastAPI itself
        return problem(request, exc.status_code, HTTPStatus(exc.status_code).phrase, str(exc.detail), exc.headers)

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        # A bug. Full stack trace to OUR logs, nothing internal to the client.
        log.exception("unhandled error (request_id=%s)", getattr(request.state, "request_id", None))
        return problem(request, 500, "Internal Server Error", "unexpected error")
```

---

## 2. Typed errors from the service layer

### Theory

<details>
<summary><b>1) Why the service raises errors instead of returning <code>None</code></b></summary>

In Session 1 the service returned `None` for "not found", and every route had to check:

```python
note = service.get(note_id)
if note is None:
    raise HTTPException(404, "note not found")   # repeated in get, patch, delete...
```

If the service raises `NotFound` itself, routes become one line, and the rule "missing note = 404" lives in one place. The service still knows nothing about HTTP: `NotFound` is just "this thing doesn't exist". It's the **handler** that maps it to status 404.

</details>

<details>
<summary><b>2) Domain errors as subclasses</b></summary>

```python
class NoteLimitReached(TooManyRequests):
    def __init__(self) -> None:
        super().__init__("note limit reached, delete a note first")
```

Now `except NoteLimitReached` still works where you need the specific case (tests!), while the generic `AppError` handler already knows how to send it.

</details>

<details>
<summary><b>3) The service takes the validated model, not loose fields</b></summary>

Session 1's `create(title, body, tags, pinned)` would grow one parameter per new field. Passing the validated `NoteCreate` keeps the signature stable, and the upload route (section 5) can build a `NoteCreate` too, reusing the same rules (tag cleaning, max lengths).

</details>

### Build it

Replace the whole file. The repository is the same as Session 1 plus the fixed `add_if_below`; the service now raises errors.

```python
# file: app/services/notes.py   (replace the whole file)
import threading
from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.errors import NotFound, TooManyRequests
from app.schemas import NoteCreate


def now() -> datetime:
    return datetime.now(UTC)


@dataclass
class Note:
    title: str
    body: str = ""
    tags: list[str] = field(default_factory=list)
    pinned: bool = False
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=now)
    updated_at: datetime = field(default_factory=now)


class NoteLimitReached(TooManyRequests):
    def __init__(self) -> None:
        super().__init__("note limit reached, delete a note first")


class NoteNotFound(NotFound):
    def __init__(self) -> None:
        super().__init__("note not found")


class InMemoryNoteRepo:
    def __init__(self) -> None:
        self._notes: dict[UUID, Note] = {}
        self._lock = threading.Lock()

    def add_if_below(self, note: Note, limit: int) -> Note | None:
        with self._lock:   # check + insert as ONE step (Session 1, section 10)
            if len(self._notes) >= limit:
                return None
            self._notes[note.id] = note
            return note

    def get(self, note_id: UUID) -> Note | None:
        return self._notes.get(note_id)

    def list(self, limit: int, offset: int, tag: str | None) -> list[Note]:
        with self._lock:
            notes = list(self._notes.values())
        if tag:
            notes = [n for n in notes if tag in n.tags]
        notes.sort(key=lambda n: (not n.pinned, -n.updated_at.timestamp()))
        return notes[offset : offset + limit]

    def delete(self, note_id: UUID) -> bool:
        with self._lock:
            return self._notes.pop(note_id, None) is not None


class NoteService:
    def __init__(self, repo: InMemoryNoteRepo, max_notes: int) -> None:
        self.repo = repo
        self.max_notes = max_notes

    def create(self, data: NoteCreate) -> Note:
        note = Note(title=data.title, body=data.body, tags=data.tags, pinned=data.pinned)
        if self.repo.add_if_below(note, self.max_notes) is None:
            raise NoteLimitReached()
        return note

    def get(self, note_id: UUID) -> Note:
        note = self.repo.get(note_id)
        if note is None:
            raise NoteNotFound()
        return note

    def list(self, limit: int, offset: int, tag: str | None) -> list[Note]:
        return self.repo.list(limit, offset, tag)

    def update(self, note_id: UUID, changes: dict) -> Note:
        note = self.get(note_id)   # raises NoteNotFound
        for name, value in changes.items():
            setattr(note, name, value)
        note.updated_at = now()
        return note

    def delete(self, note_id: UUID) -> None:
        if not self.repo.delete(note_id):
            raise NoteNotFound()
```

And the routes get shorter (no more `HTTPException`):

```python
# file: app/routers/notes.py   (replace create, get, patch, delete; keep list_notes as it was)
@router.post("", status_code=status.HTTP_201_CREATED)
def create_note(body: NoteCreate, response: Response, service: NoteServiceDep) -> NoteOut:
    note = service.create(body)   # NoteLimitReached -> 429 via the AppError handler
    response.headers["Location"] = f"/api/v1/notes/{note.id}"
    return NoteOut.model_validate(note)


@router.get("/{note_id}")
def get_note(note_id: UUID, service: NoteServiceDep) -> NoteOut:
    return NoteOut.model_validate(service.get(note_id))   # NoteNotFound -> 404


@router.patch("/{note_id}")
def update_note(note_id: UUID, body: NoteUpdate, service: NoteServiceDep) -> NoteOut:
    changes = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    return NoteOut.model_validate(service.update(note_id, changes))


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: UUID, service: NoteServiceDep) -> Response:
    service.delete(note_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

Remove the `HTTPException` and `NoteLimitReached` imports from the router. `create_note` gets an idempotency key in section 6.

Delete `app/routers/demo.py` and its two lines in `main.py`; the experiment is done.

---

## 3. Logging and request ids

### Theory

<details>
<summary><b>1) <code>print</code> vs <code>logging</code></b></summary>

`print` writes text and that's it. `logging` gives every message:

- a **level** (`DEBUG` < `INFO` < `WARNING` < `ERROR`), so production can hide debug noise with one setting,
- a **logger name** (`notemind.errors`), so you know which part of the code spoke,
- a **timestamp** and **format** set in one place (Session 8 switches to JSON with one change),
- `log.exception(...)`, which adds the stack trace automatically.

```python
log = logging.getLogger("notemind.notes")   # one per module, named by dotted path
log.info("note created id=%s", note.id)     # %s formatting: only done if the level is enabled
```

</details>

<details>
<summary><b>2) How a log message travels: logger → handler → formatter</b></summary>

```
log.info("note created")                       # logger "notemind.notes"
  -> is INFO enabled? no -> dropped (cheap)
  -> yes -> passes up to parent loggers: "notemind" -> root
  -> root's HANDLER (where to write: the console)
       -> FILTERS (can add fields, e.g. request_id)
       -> FORMATTER (turns the record into text: "2026-11-02 10:00:01 INFO [4f1c] notemind.notes: note created")
```

We configure **one handler on the root logger**, and every module's logger flows into it.

</details>

<details>
<summary><b>3) The request-id problem: how does deep code know which request it's in?</b></summary>

A log line deep inside the service doesn't know which request it belongs to. Passing `request_id` into every function would be awful. Python has a tool for exactly this: **`ContextVar`**.

```python
from contextvars import ContextVar
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

request_id_var.set("abc")    # at the start of a request (middleware)
request_id_var.get()         # anywhere later in that request -> "abc"
```

A `ContextVar` is like a global, but **each request has its own value**, even when hundreds run at once on the event loop or in threads. Starlette copies the context into the threadpool when it runs your `def` routes, so it works there too.

</details>

<details>
<summary><b>4) Accept the caller's request id, but only if it's safe</b></summary>

If the frontend (or a gateway in front of you) already sent `X-Request-Id`, reusing it ties browser logs and server logs together. But the header comes from outside, so check it first:

- **too long** → huge log lines, an easy way to fill disks,
- **newlines** → **log injection**: `abc\n2026-11-02 ERROR admin password changed` would forge a fake log line.

So accept it only if it matches `[A-Za-z0-9._-]{1,64}`; otherwise generate a fresh id.

</details>

<details>
<summary><b>5) What not to log</b></summary>

Never log: passwords, tokens, `Authorization` and `Cookie` headers, full request bodies, API keys. Be careful with query strings (tokens sometimes travel in URLs). Log the **path**, not the full URL. Logs are copied to many places (log services, laptops, tickets), so treat them as semi-public.

</details>

### Build it

```python
# file: app/logging_setup.py
import logging

from app.middleware import request_id_var


class RequestIdFilter(logging.Filter):
    """Adds the current request id to every log record, so the formatter can print it."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True   # True = keep the record


def setup_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler()   # write to the console (stderr)
    handler.addFilter(RequestIdFilter())
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s"))

    root = logging.getLogger()
    root.handlers[:] = [handler]   # replace, so calling this twice doesn't print every line twice
    root.setLevel(level)
```

Add to `Settings` in `app/config.py`:

```python
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
```

---

## 4. Middleware: code that wraps every request

### Theory

<details>
<summary><b>1) What middleware is</b></summary>

A function that runs **around** every request: before the route (it can read or reject the request) and after it (it can change the response).

```python
async def timing_middleware(request, call_next):
    start = time.perf_counter()          # BEFORE the route
    response = await call_next(request)  # run everything inside: other middleware + the route
    response.headers["X-Time-Ms"] = f"{(time.perf_counter() - start) * 1000:.1f}"   # AFTER
    return response
```

`call_next` means "pass it on". If you don't call it, the route never runs (that's how an auth or rate-limit middleware can reject early).

</details>

<details>
<summary><b>2) The order: an onion</b></summary>

Middleware wraps like onion layers. In FastAPI/Starlette, **the last one added is the outermost**:

```python
app.middleware("http")(request_id_middleware)   # added first  -> inner layer
app.add_middleware(CORSMiddleware, ...)         # added second -> outer layer
```

```
request  -> CORS -> request_id -> route
response <- CORS <- request_id <- route
```

We want CORS outermost so browser "preflight" checks (section 7) are answered immediately, without running anything else.

</details>

<details>
<summary><b>3) Why 500 responses don't get the <code>X-Request-Id</code> header</b></summary>

The `Exception` handler (for bugs) lives in Starlette's **outermost** error layer, outside our middleware. When a bug happens, our middleware's `call_next` raises, so it never gets to add the header. The error body still has `requestId`, because the handler reads it from `request.state`, which was set before the bug happened. Knowing *why* this happens is a good debugging skill; it's fine as it is.

</details>

### Build it

```python
# file: app/middleware.py
import logging
import re
import time
from collections.abc import Awaitable, Callable
from contextvars import ContextVar
from uuid import uuid4

from fastapi import Request, Response

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")
_SAFE_ID = re.compile(r"[A-Za-z0-9._-]{1,64}")
access_log = logging.getLogger("notemind.access")


async def request_id_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    incoming = request.headers.get("x-request-id", "")
    request_id = incoming if _SAFE_ID.fullmatch(incoming) else uuid4().hex   # reuse only if safe

    request.state.request_id = request_id   # for error handlers
    token = request_id_var.set(request_id)  # for log lines
    start = time.perf_counter()
    try:
        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id   # the client can quote it in bug reports
        access_log.info(
            "%s %s -> %s in %.1f ms",
            request.method,
            request.url.path,   # path only: query strings can contain tokens
            response.status_code,
            (time.perf_counter() - start) * 1000,
        )
        return response
    finally:
        request_id_var.reset(token)   # restore the previous value, even if the route crashed
```

Now wire everything into `create_app`:

```python
# file: app/main.py   (replace create_app; keep lifespan as it was)
from fastapi.middleware.cors import CORSMiddleware

from app.errors import install_error_handlers
from app.logging_setup import setup_logging
from app.middleware import request_id_middleware


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging(settings.log_level)

    app = FastAPI(title="NoteMind API", version="0.2.0", lifespan=lifespan)
    install_error_handlers(app)

    # Middleware: the LAST added is the OUTERMOST.
    app.middleware("http")(request_id_middleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,   # exact origins, never "*" (section 7)
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Request-Id", "If-Match"],
        expose_headers=["Location", "X-Request-Id", "Idempotent-Replayed", "Retry-After", "ETag"],
    )

    app.include_router(notes.router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app
```

Add to `Settings` (if you didn't do Session 1 practice task 3):

```python
    allowed_origins: list[str] = ["http://localhost:3000"]
```

### Run it

```powershell
curl.exe -i http://127.0.0.1:8000/api/v1/notes/00000000-0000-0000-0000-000000000000
curl.exe -i "http://127.0.0.1:8000/api/v1/notes?limit=500"
curl.exe -i http://127.0.0.1:8000/nope
curl.exe -i -X PUT http://127.0.0.1:8000/health
curl.exe -i -H "X-Request-Id: my-trace-1" http://127.0.0.1:8000/api/v1/notes/abc
```

All five now return `content-type: application/problem+json` with the same fields: 404, 422 (with `errors[]`), 404, 405, and 422 with `"requestId": "my-trace-1"`. In the server console, find the log line with `[my-trace-1]`.

### Try it

1. Add `raise RuntimeError("boom")` at the top of `get_note`. Call it: the client gets a clean 500 with only `"unexpected error"` and a `requestId`. The server console has the full stack trace with the **same** id. Remove the line.
2. Send `X-Request-Id` with 200 characters, or with a space in it. The response header shows a newly generated id instead.
3. Set `NOTEMIND_LOG_LEVEL=WARNING` in `.env`, restart: the access lines disappear. Set it back.

---

## 5. Upload a file as a note

### Theory

<details>
<summary><b>1) How a file reaches the server: multipart/form-data</b></summary>

JSON can't carry files nicely, so browsers use `multipart/form-data`: the body is split into **parts** by a random "boundary" string, and each part has its own headers.

```
POST /api/v1/notes/upload
Content-Type: multipart/form-data; boundary=----X1

------X1
Content-Disposition: form-data; name="tags"

work, ideas
------X1
Content-Disposition: form-data; name="file"; filename="plan.md"
Content-Type: text/markdown

# Weekend plan
Buy paint...
------X1--
```

FastAPI (using `python-multipart`) splits these parts for you: `Form()` parameters for text parts, `UploadFile` for file parts. A route with form fields can't also have a JSON body in the same request.

</details>

<details>
<summary><b>2) What <code>UploadFile</code> actually is</b></summary>

`UploadFile` is a wrapper around a temporary file:

- `file.filename`: the name **the client claims** (untrusted),
- `file.content_type`: the type **the client claims** (untrusted),
- `await file.read(n)`: read up to `n` bytes.

Small uploads stay in memory; bigger ones are written to a temporary file on disk (a "spooled" file). Either way, by the time your function runs, **the whole upload has already been received**.

</details>

<details>
<summary><b>3) The size limit, honestly</b></summary>

Because the body has already been received, a size check in your code protects **memory and processing time**, not bandwidth. Someone can still send you 2 GB; you just refuse to read it all.

The real first line belongs **in front of** the app: the proxy or platform max body size (`client_max_body_size` in nginx, request limits on your host). Do both: the proxy stops huge uploads cheaply, and your code enforces the exact business limit (1 MB) with a clear 413 error.

We read in chunks and stop as soon as we pass the limit, instead of `await file.read()` (which reads everything into memory first).

</details>

<details>
<summary><b>4) Never trust the filename or the content type</b></summary>

- **Filename:** a client can send `../../etc/passwd` or `C:\Windows\x.md`. We never use it as a path. We only take the **stem** (name without folders and extension) as a fallback title. `PureWindowsPath(name).name` strips both `/` and `\` folders.
- **Extension check:** `.md`/`.txt` only, as a first sanity check. It's still a claim, so we also check the content itself.
- **Content type:** just a claim too; ignore it.

</details>

<details>
<summary><b>5) Bytes vs text: decoding safely</b></summary>

A file arrives as **bytes**. To get text you must **decode** them with an encoding. We require UTF-8:

```python
b"caf\xc3\xa9".decode("utf-8")   # 'café'
b"\xff\xfe".decode("utf-8")      # UnicodeDecodeError -> tell the user "file must be UTF-8 text"
```

Also reject `\x00` (NUL) bytes: real text files don't contain them, binary files (images, exe) almost always do. A cheap "is this really text?" check.

UTF-8 files saved by some Windows editors start with an invisible "BOM" character. Decoding with `"utf-8-sig"` removes it if present.

</details>

<details>
<summary><b>6) <code>async</code> route + blocking work: <code>run_in_threadpool</code> again</b></summary>

The route must be `async def` because reading the upload is `await file.read(...)`. But creating the note calls the service, and from Session 3 the service talks to the database with a blocking driver. As Session 1, section 9 showed: blocking inside `async def` freezes the server. So:

```python
raw = await read_limited(file, limit)                     # async: fine on the loop
note = await run_in_threadpool(service.create, data)      # blocking: sent to a worker thread
```

</details>

<details>
<summary><b>7) Gotcha: a <code>ValidationError</code> inside your code is NOT a 422</b></summary>

FastAPI returns 422 only for validation of the **request** (params/body) it does itself. If *your* code builds a model and it fails:

```python
data = NoteCreate(title=title, body=body, tags=tags)   # raises pydantic.ValidationError
```

that's an ordinary exception, so it would become a **500**. Catch it and convert it into our `Unprocessable` with the error list.

</details>

### Build it

Add to `Settings`:

```python
    max_upload_bytes: int = Field(default=1_000_000, ge=1_000)   # 1 MB
```

```python
# file: app/uploads.py
from pathlib import PureWindowsPath

from fastapi import UploadFile
from pydantic import ValidationError

from app.errors import PayloadTooLarge, Unprocessable
from app.schemas import NoteCreate

ALLOWED_SUFFIXES = (".md", ".txt")


async def read_limited(upload: UploadFile, max_bytes: int) -> bytes:
    """Read the upload in 64 KB chunks and stop as soon as it's too big."""
    buf = bytearray()
    while chunk := await upload.read(64 * 1024):   # empty bytes = end of file -> loop ends
        buf += chunk
        if len(buf) > max_bytes:
            raise PayloadTooLarge(f"file is larger than {max_bytes // 1000} KB")
    return bytes(buf)


def safe_stem(filename: str | None) -> str:
    """'C:\\x\\..\\plan.md' or '../../plan.md' -> 'plan'. Never used as a path, only as a title."""
    name = PureWindowsPath(filename or "").name   # strips folders written with / or \
    return name.rsplit(".", 1)[0].strip() or "Untitled"


def check_suffix(filename: str | None) -> None:
    if not (filename or "").lower().endswith(ALLOWED_SUFFIXES):
        raise Unprocessable("only .md and .txt files are accepted")


def decode_text(raw: bytes) -> str:
    if b"\x00" in raw:
        raise Unprocessable("file looks binary, not text")
    try:
        return raw.decode("utf-8-sig")   # utf-8, and drops a Windows BOM if present
    except UnicodeDecodeError:
        raise Unprocessable("file must be UTF-8 text") from None


def note_from_text(text: str, filename: str | None, tags_csv: str) -> NoteCreate:
    """First '# heading' becomes the title; otherwise the file name. The rest is the body."""
    lines = text.splitlines()
    first = next((i for i, line in enumerate(lines) if line.strip()), None)   # first non-empty line
    if first is not None and lines[first].startswith("# "):
        title = lines[first][2:].strip()
        body = "\n".join(lines[first + 1 :]).strip()
    else:
        title = safe_stem(filename)
        body = text.strip()

    tags = [t for t in tags_csv.split(",")]
    try:
        # Reuse ALL the NoteCreate rules: max lengths, tag cleaning, extra fields...
        return NoteCreate(title=title[:200], body=body, tags=tags)
    except ValidationError as e:
        # our own validation failed: without this it would be a 500, not a 422
        errors = [{"loc": list(err["loc"]), "msg": err["msg"]} for err in e.errors()]
        raise Unprocessable("file content is not a valid note", errors=errors) from None
```

```python
# file: app/routers/notes.py   (add these imports and the route)
from fastapi import Form, UploadFile
from starlette.concurrency import run_in_threadpool

from app.deps import SettingsDep
from app.uploads import check_suffix, decode_text, note_from_text, read_limited


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_note(
    file: UploadFile,
    response: Response,
    service: NoteServiceDep,
    settings: SettingsDep,
    tags: Annotated[str, Form(max_length=400)] = "",   # "work, ideas"
) -> NoteOut:
    check_suffix(file.filename)
    raw = await read_limited(file, settings.max_upload_bytes)
    data = note_from_text(decode_text(raw), file.filename, tags)
    note = await run_in_threadpool(service.create, data)   # blocking work off the event loop
    response.headers["Location"] = f"/api/v1/notes/{note.id}"
    return NoteOut.model_validate(note)
```

Route order matters a little here: `POST /upload` and `POST ""` are different paths, so there's no clash. (A `GET /{note_id}` route would try to read `upload` as a UUID, but this route is `POST`.)

### Run it

Create two test files:

```powershell
@"
# Weekend plan
- buy paint
- call Ravi
"@ | Set-Content -Encoding utf8 plan.md

"just some thoughts without a heading" | Set-Content -Encoding utf8 thoughts.txt
```

```powershell
curl.exe -i -F "file=@plan.md" -F "tags=Home, weekend" http://127.0.0.1:8000/api/v1/notes/upload
curl.exe -i -F "file=@thoughts.txt" http://127.0.0.1:8000/api/v1/notes/upload
```

Expected: `201`, title `Weekend plan` with tags `["home","weekend"]`; then title `thoughts`.

### Try it

1. Upload an image renamed to `photo.md`: 422 "file looks binary".
2. Create a 2 MB file (`fsutil file createnew big.txt 2000000`; it's full of NUL bytes, so make sure the size check runs **before** the binary check): 413.
3. Upload `notes.pdf`: 422 "only .md and .txt files".
4. Upload a file whose heading is 300 characters long. What happens, and why? (Look at `title[:200]`.)
5. Upload a `.md` with 25,000 characters of body: 422 with `errors[]` from `NoteCreate`, not a 500. Temporarily remove the `try/except` in `note_from_text` and see the 500 instead.

---

## 6. Idempotency keys: safe retries for "create"

### Theory

<details>
<summary><b>1) The problem: "did my request work?"</b></summary>

The user clicks "Save". The request reaches the server, the note is created, but the response gets lost (flaky Wi-Fi, a timeout, the browser tab sleeping). The client doesn't know whether it worked. If it retries, you get **two notes**.

```
client --POST--> server: note created
client <--X----- response lost
client --POST--> server: ANOTHER note created   <- duplicate
```

GET, PUT and DELETE are naturally safe to repeat (doing them twice has the same effect as once: that's what **idempotent** means). POST "create" isn't.

</details>

<details>
<summary><b>2) The fix: the client names the attempt</b></summary>

The client generates a random key **once per user action** (`crypto.randomUUID()` in the browser) and sends it with every retry of that action:

```
POST /api/v1/notes
Idempotency-Key: 7d0f1c2e-...
```

The server remembers `key → result`. On a repeat with the same key, it returns the **stored result** instead of doing the work again.

</details>

<details>
<summary><b>3) Same key, different body = a client bug</b></summary>

What if the client reuses a key with a different request body (a bug in the frontend)? Returning the old note would silently hide the bug. So we also store a **hash of the request body**:

| Situation | Response |
|---|---|
| New key | Do the work, store key + hash + note id, 201 |
| Known key, same hash | Return the stored note, **200**, header `Idempotent-Replayed: true` |
| Known key, different hash | **422**: "Idempotency-Key was already used with a different request" |

A hash (`sha256`) is a short fingerprint of the body: same body → same hash; any change → a completely different hash.

</details>

<details>
<summary><b>4) What's still wrong with our in-memory version</b></summary>

Two honest problems, both fixed in Session 5 with Postgres:

1. **Race:** two identical requests arriving at the same moment can both see "key not found" and both create a note. That's the check-then-act bug from Session 1 again.
2. **Memory only:** a restart forgets all keys, and with two server processes each has its own store.

Real systems also expire keys after a while (for example 24 hours), so the store doesn't grow forever.

</details>

### Build it

```python
# file: app/idempotency.py
import hashlib
import threading
from dataclasses import dataclass
from uuid import UUID

from app.errors import Unprocessable


@dataclass
class IdemRecord:
    request_hash: str
    note_id: UUID


def hash_request(payload: str) -> str:
    return hashlib.sha256(payload.encode()).hexdigest()


class InMemoryIdempotencyStore:
    """key -> (hash of the request, id of the created note). Session 5 moves this to Postgres."""

    def __init__(self) -> None:
        self._records: dict[str, IdemRecord] = {}
        self._lock = threading.Lock()

    def find(self, key: str, request_hash: str) -> UUID | None:
        """Return the stored note id for a replay, None for a new key, raise for a misused key."""
        with self._lock:
            record = self._records.get(key)
        if record is None:
            return None
        if record.request_hash != request_hash:
            raise Unprocessable("Idempotency-Key was already used with a different request")
        return record.note_id

    def save(self, key: str, request_hash: str, note_id: UUID) -> None:
        with self._lock:
            self._records[key] = IdemRecord(request_hash, note_id)
```

```python
# file: app/deps.py   (add)
from app.idempotency import InMemoryIdempotencyStore

_idem_store = InMemoryIdempotencyStore()


def get_idem_store() -> InMemoryIdempotencyStore:
    return _idem_store


IdemStoreDep = Annotated[InMemoryIdempotencyStore, Depends(get_idem_store)]
```

```python
# file: app/routers/notes.py   (replace create_note)
from fastapi import Header

from app.deps import IdemStoreDep
from app.idempotency import hash_request


@router.post("", status_code=status.HTTP_201_CREATED)
def create_note(
    body: NoteCreate,
    response: Response,
    service: NoteServiceDep,
    idem: IdemStoreDep,
    # FastAPI turns idempotency_key into the header "idempotency-key" (headers are case-insensitive)
    idempotency_key: Annotated[str | None, Header(min_length=8, max_length=100)] = None,
) -> NoteOut:
    if idempotency_key:
        request_hash = hash_request(body.model_dump_json())   # same body -> same hash
        existing_id = idem.find(idempotency_key, request_hash)
        if existing_id is not None:
            response.status_code = status.HTTP_200_OK
            response.headers["Idempotent-Replayed"] = "true"
            response.headers["Location"] = f"/api/v1/notes/{existing_id}"
            return NoteOut.model_validate(service.get(existing_id))

    note = service.create(body)
    if idempotency_key:
        idem.save(idempotency_key, request_hash, note.id)
    response.headers["Location"] = f"/api/v1/notes/{note.id}"
    return NoteOut.model_validate(note)
```

`body.model_dump_json()` is the **validated** body, after trimming and tag cleaning. So `{"title":" A "}` and `{"title":"A"}` count as the same request. Is that what you want? Think about it; it's a design choice.

### Run it

```powershell
'{"title": "Idem test"}' | Set-Content idem.json
'{"title": "Something else"}' | Set-Content idem2.json
curl.exe -i -H "Content-Type: application/json" -H "Idempotency-Key: key-12345" -d "@idem.json"  http://127.0.0.1:8000/api/v1/notes
curl.exe -i -H "Content-Type: application/json" -H "Idempotency-Key: key-12345" -d "@idem.json"  http://127.0.0.1:8000/api/v1/notes
curl.exe -i -H "Content-Type: application/json" -H "Idempotency-Key: key-12345" -d "@idem2.json" http://127.0.0.1:8000/api/v1/notes
```

Expected: 201; then 200 with `Idempotent-Replayed: true` and the **same id**; then 422.

---

## 7. CORS: letting your frontend call the API

### Theory

<details>
<summary><b>1) What an "origin" is, and the browser's default rule</b></summary>

An **origin** is scheme + host + port: `http://localhost:3000` and `http://localhost:8000` are **different** origins (different port).

By default, a browser lets JavaScript on page A *send* a request to origin B, but **won't let it read the response** unless B says "A is allowed". That's the same-origin policy. It exists so a random website you visit can't use *your* logged-in browser to read your bank's API.

</details>

<details>
<summary><b>2) How the server says "allowed": CORS headers</b></summary>

```
Browser: GET /api/v1/notes      Origin: http://localhost:3000
Server:  200 ...                Access-Control-Allow-Origin: http://localhost:3000
Browser: origins match -> JavaScript may read the response
```

Without that header, the request still reached your server, but the browser hides the response and shows a CORS error in the console.

</details>

<details>
<summary><b>3) Preflight: the browser asks first</b></summary>

For "non-simple" requests (JSON body, `Authorization` header, PATCH/DELETE), the browser first sends an automatic `OPTIONS` request:

```
OPTIONS /api/v1/notes/123
Origin: http://localhost:3000
Access-Control-Request-Method: PATCH
Access-Control-Request-Headers: content-type, if-match
```

The server answers which methods and headers are allowed. Only if they match does the browser send the real request. `CORSMiddleware` answers these for you; that's why it sits outermost.

</details>

<details>
<summary><b>4) <code>expose_headers</code>: why your frontend can't see <code>Location</code></b></summary>

Even for allowed origins, browser JavaScript can only read a few "safe" response headers by default. `Location`, `X-Request-Id`, `ETag` and `Retry-After` are hidden unless listed in `Access-Control-Expose-Headers`. Forgetting this is a classic "it works in curl but `response.headers.get('Location')` is null in React" bug.

</details>

<details>
<summary><b>5) CORS is not security for your API</b></summary>

CORS is enforced **by browsers only**. curl, Postman, Python scripts and attackers' servers ignore it completely. It protects **users' browsers** from other websites; it doesn't protect your API from anyone. Your API is protected by **authentication and authorization** (Session 4).

Rules: list exact origins, never `"*"` for an API that uses cookies or credentials, and load the list from settings (dev: `localhost:3000`, prod: your Vercel domain).

</details>

### Try it

```powershell
curl.exe -i -X OPTIONS http://127.0.0.1:8000/api/v1/notes -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"
curl.exe -i -X OPTIONS http://127.0.0.1:8000/api/v1/notes -H "Origin: http://evil.test" -H "Access-Control-Request-Method: POST"
```

The first returns `access-control-allow-origin: http://localhost:3000`. The second has no such header (Starlette answers 400 "Disallowed CORS origin"). Then run a normal `curl.exe http://127.0.0.1:8000/api/v1/notes -H "Origin: http://evil.test"`: you still get the data. That's dropdown 5 in action.

---

## 8. Your first automated tests

### Theory

<details>
<summary><b>1) <code>TestClient</code>: call the API without a running server</b></summary>

`TestClient(app)` calls your ASGI app directly, in the same process. No uvicorn, no port, no network. Same request journey (middleware, validation, handlers), just much faster.

```python
from fastapi.testclient import TestClient
client = TestClient(app)
r = client.post("/api/v1/notes", json={"title": "x"})
assert r.status_code == 201
```

Using it in a `with TestClient(app) as client:` block also runs the **lifespan** (startup/shutdown).

</details>

<details>
<summary><b>2) pytest basics: tests, asserts, fixtures</b></summary>

- A test is any function named `test_...` in a file named `test_*.py`.
- `assert something` fails the test if `something` is false, and pytest shows both sides.
- A **fixture** is setup code shared by tests. A test asks for it by naming it as a parameter:

```python
@pytest.fixture
def client():
    app = create_app()
    with TestClient(app) as c:
        yield c          # the test runs here; code after yield = cleanup

def test_health(client):  # pytest sees "client", runs the fixture, passes the value in
    assert client.get("/health").json() == {"status": "ok"}
```

Put fixtures in `tests/conftest.py`; every test file can use them without importing.

</details>

<details>
<summary><b>3) Isolation: every test gets a fresh, empty store</b></summary>

Our repo is a module-level object, so tests would share notes, and test B could fail because of something test A created. Use the Session 1 payoff:

```python
app.dependency_overrides[get_repo] = lambda: fresh_repo
```

Every test gets its own empty repo. Tests can then run in any order.

</details>

<details>
<summary><b>4) What to test first</b></summary>

Test **behavior a user or the frontend relies on**, not internal details: status codes, response shapes, error shape, limits, idempotency. Pure functions like `note_from_text` are the easiest and fastest to test, so test their edge cases directly. Session 7 goes much deeper (database, auth, the AI, failure paths).

</details>

### Build it

Add to `pyproject.toml`, so tests can `import app`:

```toml
[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
```

```python
# file: tests/conftest.py
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.deps import get_idem_store, get_repo, get_settings
from app.idempotency import InMemoryIdempotencyStore
from app.main import create_app
from app.services.notes import InMemoryNoteRepo


@pytest.fixture
def client():
    app = create_app()
    repo = InMemoryNoteRepo()            # fresh store for THIS test
    idem = InMemoryIdempotencyStore()
    app.dependency_overrides[get_repo] = lambda: repo
    app.dependency_overrides[get_idem_store] = lambda: idem
    # _env_file=None: ignore your local .env, so tests behave the same on every machine
    app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None, max_notes=3)
    with TestClient(app) as c:
        yield c
```

```python
# file: tests/test_notes_api.py
def test_create_returns_201_and_location(client):
    r = client.post("/api/v1/notes", json={"title": "Groceries", "tags": ["Food", "food"]})
    assert r.status_code == 201
    note = r.json()
    assert r.headers["location"] == f"/api/v1/notes/{note['id']}"
    assert note["tags"] == ["food"]


def test_validation_error_is_problem_json(client):
    r = client.post("/api/v1/notes", json={"title": "", "owner": "me"})
    assert r.status_code == 422
    assert r.headers["content-type"].startswith("application/problem+json")
    body = r.json()
    assert body["status"] == 422 and body["requestId"]
    assert {tuple(e["loc"]) for e in body["errors"]} == {("body", "title"), ("body", "owner")}
    assert all("input" not in e for e in body["errors"])   # never echo input


def test_unknown_note_is_404_problem(client):
    r = client.get("/api/v1/notes/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404
    assert r.json()["detail"] == "note not found"


def test_note_limit_returns_429(client):
    for i in range(3):   # max_notes=3 in the fixture
        assert client.post("/api/v1/notes", json={"title": f"n{i}"}).status_code == 201
    assert client.post("/api/v1/notes", json={"title": "one too many"}).status_code == 429


def test_idempotent_create(client):
    headers = {"Idempotency-Key": "test-key-123"}
    first = client.post("/api/v1/notes", json={"title": "A"}, headers=headers)
    again = client.post("/api/v1/notes", json={"title": "A"}, headers=headers)
    other = client.post("/api/v1/notes", json={"title": "B"}, headers=headers)
    assert (first.status_code, again.status_code, other.status_code) == (201, 200, 422)
    assert again.json()["id"] == first.json()["id"]
    assert again.headers["idempotent-replayed"] == "true"


def test_request_id_is_reused_when_safe(client):
    assert client.get("/health", headers={"X-Request-Id": "abc-123"}).headers["x-request-id"] == "abc-123"
    assert client.get("/health", headers={"X-Request-Id": "bad id!"}).headers["x-request-id"] != "bad id!"


def test_upload_markdown(client):
    files = {"file": ("plan.md", b"# Weekend plan\n- paint\n", "text/markdown")}
    r = client.post("/api/v1/notes/upload", files=files, data={"tags": "Home, weekend"})
    assert r.status_code == 201
    assert r.json()["title"] == "Weekend plan"
    assert r.json()["tags"] == ["home", "weekend"]


def test_upload_rejects_binary(client):
    files = {"file": ("x.md", b"\x89PNG\x00\x00", "text/markdown")}
    assert client.post("/api/v1/notes/upload", files=files).status_code == 422
```

```python
# file: tests/test_uploads.py
import pytest

from app.errors import Unprocessable
from app.uploads import decode_text, note_from_text, safe_stem


@pytest.mark.parametrize(
    ("filename", "expected"),
    [("plan.md", "plan"), ("../../etc/passwd.md", "passwd"), ("C:\\Users\\x\\plan.txt", "plan"), (None, "Untitled")],
)
def test_safe_stem(filename, expected):
    assert safe_stem(filename) == expected


def test_heading_becomes_title():
    note = note_from_text("\n\n# Title here\nbody line", "f.md", "")
    assert (note.title, note.body) == ("Title here", "body line")


def test_no_heading_uses_filename():
    assert note_from_text("hello", "my-notes.txt", "").title == "my-notes"


def test_bad_utf8_is_422():
    with pytest.raises(Unprocessable):
        decode_text(b"\xff\xfe\xfa")
```

`@pytest.mark.parametrize` runs the same test once per row: four tests from one function.

### Run it

```powershell
uv run pytest -q
```

Expected: everything passes (about 15 tests). If one fails, read pytest's output carefully. It shows the values on both sides of the failed `assert`. Fix the code, not the test (unless the test is wrong, and then say why in a comment).

---

## Practice tasks

1. Add `X-Request-Id` to the CORS `expose_headers` (already there) and write a tiny HTML page with `fetch()` from another port that prints the request id from a failed request. See `expose_headers` work, then remove `X-Request-Id` from it and watch `null`.
2. Add a `Retry-After` header to `NoteLimitReached`? Think first: is a "note limit" something that gets better with time? Write your answer in `progress.md`. (Session 6's per-day AI quota is where `Retry-After` really fits.)
3. Make the upload accept `tags` as repeated form fields (`-F tags=a -F tags=b`) instead of comma-separated. Hint: `list[str]` with `Form()`.
4. Log a line `note created id=... tags=...` from the service at INFO level, and confirm it carries the request id without passing it in.
5. Add a test proving a 2 MB upload returns 413 (build the bytes in the test: `b"a" * 2_000_000`).
6. Expire idempotency keys: store `created_at` in `IdemRecord` and treat keys older than 24 hours as unknown. Test it without waiting 24 hours (hint: let the store take a `now` function you can replace in tests).

## Interview questions

<details>
<summary><b>1) How do you design error responses for an API?</b></summary>

One format for every error, here RFC 9457 problem+json: `type`, `title`, `status`, `detail`, `instance`, plus a request id and field errors for validation. Business errors are typed exceptions raised by the service and mapped to status codes in one central handler; framework errors (unknown route, wrong method) go through the same shape. Unexpected errors become a generic 500 with no internals, while the stack trace is logged server-side with the request id. Don't echo invalid input back.

</details>

<details>
<summary><b>2) What is an idempotency key and how do you implement it?</b></summary>

A client-generated key sent with a non-idempotent request (a POST create), the same for every retry of one user action. The server stores key → request hash + result. Same key and same request → return the stored result instead of repeating the work; same key with a different request → reject it as a client bug. The store must be shared and atomic (a unique constraint in the database, or Redis `SET NX`) and keys expire after a TTL.

</details>

<details>
<summary><b>3) How do you accept file uploads safely?</b></summary>

Limit size at the proxy/platform and again in the app with a chunked read and a 413. Allowlist extensions, but don't trust the extension, content type or filename: never use the filename as a path. Check the content itself (decode as UTF-8, reject NUL bytes or check magic bytes). Validate the result with the same model rules as normal input, and do heavy parsing off the event loop.

</details>

<details>
<summary><b>4) Why isn't CORS a security control for your API?</b></summary>

Only browsers enforce it. It decides whether JavaScript from another origin may read a response; curl, scripts and servers ignore it completely. It protects users' browsers from malicious websites, not your API from callers. Your API is protected by authentication and authorization. Use exact origins and expose the headers your frontend needs.

</details>

<details>
<summary><b>5) How do you correlate logs for one request across your system?</b></summary>

A request id per request: accept an incoming `X-Request-Id` only if it matches a safe pattern, otherwise generate one. Store it in a context variable so every log line gets it through a logging filter, return it in a response header and in error bodies, and forward it on outbound calls so downstream services log the same id.

</details>

<details>
<summary><b>6) In what order does middleware run in FastAPI?</b></summary>

Like an onion: the last middleware added is the outermost, so it sees the request first and the response last. Starlette's error middleware (which runs the handler for unhandled exceptions) is outside all of yours, which is why your middleware can't add headers to responses for unhandled errors.

</details>

## Done when

- [ ] 404, 405, 413, 422, 429 and 500 all return problem+json with `requestId`, and validation errors list `loc`/`msg`/`type` without `input`.
- [ ] Every log line shows a request id; a safe incoming `X-Request-Id` is reused, an unsafe one is replaced.
- [ ] Uploading `plan.md` creates "Weekend plan" with clean tags; binary, too large, wrong extension and bad UTF-8 files are rejected with clear errors.
- [ ] The same Idempotency-Key replays the note (200), and a reused key with a different body gets 422.
- [ ] I can explain preflight, `expose_headers`, and why CORS isn't security.
- [ ] `uv run pytest -q` passes, and I added at least two tests of my own.
- [ ] I answered interview questions 1, 2 and 4 aloud without notes.

## Reading

- Handling errors: https://fastapi.tiangolo.com/tutorial/handling-errors/
- Request files: https://fastapi.tiangolo.com/tutorial/request-files/
- Middleware: https://fastapi.tiangolo.com/tutorial/middleware/
- CORS: https://fastapi.tiangolo.com/tutorial/cors/ and https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- Testing: https://fastapi.tiangolo.com/tutorial/testing/
- Python logging HOWTO: https://docs.python.org/3/howto/logging.html
- RFC 9457 Problem Details: https://www.rfc-editor.org/rfc/rfc9457
- IETF Idempotency-Key draft: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
