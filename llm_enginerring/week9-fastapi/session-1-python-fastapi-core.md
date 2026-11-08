# Session 1 - FastAPI core: build the NoteMind notes API

**What you build today:** the first version of **NoteMind**, a small notes API. Later sessions add a database, login, an AI summary that streams live, tests and a deployment. Today the notes live in memory, and you learn how FastAPI works underneath.

By the end of this session these endpoints work:

```
GET    /health                    -> {"status": "ok"}
POST   /api/v1/notes              -> create a note           (201 + Location header)
GET    /api/v1/notes              -> list notes, paginated   (?limit=&offset=&tag=)
GET    /api/v1/notes/{note_id}    -> one note                (404 if missing)
PATCH  /api/v1/notes/{note_id}    -> change some fields      (only the fields you send)
DELETE /api/v1/notes/{note_id}    -> delete                  (204, no body)
```

**Time:** about 8-10 hours. Theory on light days, building on holiday days.

**HLD notes to read alongside** (in `C:\Users\neerajj\personal\SystemDesign\Notes\HLD\`):

- `A-Fundamentals\A2-Request-Flow.md`: what happens between the browser and your code. Section 2 below is the same idea, from inside the server.
- `A-Fundamentals\A7-Scaling-Basics.md`: why servers must be "stateless". Section 10 shows what breaks when they aren't.

---

## How to use this article

1. Each section has **Theory** (click the numbered dropdowns), then **Build it** (type the code), then **Run it** (what you should see), then sometimes **Try it** (break it on purpose).
2. Type the code yourself. Read the comments while typing; they explain each line.
3. The `# file:` line at the top of each code block says which file it goes in.
4. In PowerShell use `curl.exe`, not `curl` (in PowerShell, `curl` is a different command).
5. When something doesn't match what's described here, don't skip it: figure out why and write it down in `progress.md`. That's how this sticks.

> Honesty note: this code was written carefully but not executed while writing. If a library changed a name, the official docs win.

## Topics

| # | Topic | After it you can |
|---|---|---|
| 1 | Project setup with uv | Create the project, add packages, run the server |
| 2 | The request journey | Explain what happens from "HTTP request arrives" to "your function runs" |
| 3 | Pydantic models | Validate input, shape output, block fields the client must not set |
| 4 | Layers: router → service → repository | Know where each kind of code goes |
| 5 | Routes, params and status codes | Use path/query/body params and the right status codes |
| 6 | Dependency injection (`Depends`) | Give routes what they need without global imports |
| 7 | Settings | Load typed config from env vars and `.env`, fail fast on bad values |
| 8 | Lifespan | Run code once at startup and shutdown |
| 9 | `def` vs `async def` | Prove why one wrong `sleep` freezes the whole server |
| 10 | A real race condition | Reproduce two requests breaking a limit, and fix it |

---

## 1. Project setup with uv

### Theory

<details>
<summary><b>1) What uv does for you</b></summary>

`uv` is a Python project manager. You already use it in the course. For a new project it handles three things:

- **`pyproject.toml`**: the list of packages your project needs (like `package.json`).
- **`uv.lock`**: the exact versions that were installed (like `package-lock.json`). Commit it, so every machine and the Docker image get the same versions.
- **`.venv/`**: a private folder with Python and the packages, only for this project. Never commit it.

`uv run <command>` runs a command inside that `.venv`, so you never need to "activate" it.

```powershell
uv add fastapi          # adds to pyproject.toml, updates uv.lock, installs into .venv
uv run python -V        # runs Python from .venv
```

</details>

<details>
<summary><b>2) What <code>fastapi[standard]</code> installs, and why each part</b></summary>

The `[standard]` part is an "extra", a bundle of optional packages:

| Package | Why you need it |
|---|---|
| `fastapi` | The framework: routing, validation, docs |
| `starlette` | What FastAPI is built on: requests, responses, middleware |
| `pydantic` | Data validation (section 3) |
| `uvicorn` | The **server** that receives HTTP and calls your app |
| `fastapi-cli` | The `fastapi dev` / `fastapi run` commands |
| `httpx` | An HTTP client: used for tests and calling other APIs |
| `python-multipart` | Needed for form data and file uploads (Session 2) |

`pydantic-settings` (for config) isn't in the bundle, so we add it separately.

</details>

<details>
<summary><b>3) <code>fastapi dev</code> vs <code>fastapi run</code></b></summary>

Both start uvicorn with your app.

- `fastapi dev app/main.py`: **auto-reload** (restarts when you save a file), listens only on `127.0.0.1`. For coding.
- `fastapi run app/main.py`: no reload, listens on `0.0.0.0` (all network interfaces). For production and for timing tests (reload adds noise).

</details>

### Build it

```powershell
cd C:\Users\neerajj\personal\llm_enginerring\week9-fastapi
uv init --app notemind
cd notemind
uv add "fastapi[standard]" pydantic-settings
uv add --dev pytest ruff
Remove-Item main.py                        # uv created a sample; ours goes in app/
mkdir app, app\routers, app\services, scripts
New-Item app\__init__.py, app\routers\__init__.py, app\services\__init__.py
```

Open `pyproject.toml` and set `requires-python = ">=3.12"`. We use a few 3.12 features.

The empty `__init__.py` files make `app` a **package**, so `from app.routers import notes` works.

Folder after today:

```
notemind/
  pyproject.toml  uv.lock  .env  .env.example  .gitignore
  app/
    __init__.py
    main.py            # creates the app, plugs everything together
    config.py          # settings
    deps.py            # Depends() providers
    schemas.py         # Pydantic models (what goes in and out of the API)
    services/notes.py  # rules + in-memory repository
    routers/notes.py   # HTTP routes
    routers/demo.py    # section 9 experiment (delete after)
  scripts/             # small scripts to test behavior
```

---

## 2. Hello FastAPI, and the journey of one request

### Build it

```python
# file: app/main.py
from fastapi import FastAPI

# The app object. uvicorn will call it for every request.
app = FastAPI(title="NoteMind API", version="0.1.0")


# The decorator registers this function for "GET /health".
@app.get("/health")
def health() -> dict[str, str]:
    # A dict is turned into JSON automatically.
    return {"status": "ok"}
```

### Run it

```powershell
uv run fastapi dev app/main.py
# in a second terminal:
curl.exe -i http://127.0.0.1:8000/health
```

You should see `HTTP/1.1 200 OK`, `content-type: application/json` and `{"status":"ok"}`. Now open http://127.0.0.1:8000/docs in the browser: an interactive page listing your endpoint. You didn't write it; FastAPI generated it.

### Theory

<details>
<summary><b>1) Who actually receives the request: uvicorn and ASGI</b></summary>

Your code never touches the network. **uvicorn** does:

1. uvicorn listens on port 8000.
2. A request arrives as raw bytes: `GET /health HTTP/1.1\r\nHost: ...`.
3. uvicorn parses it into a Python dict called the **scope** (method, path, headers...).
4. uvicorn calls your `app` with that scope. That calling convention is called **ASGI**, a standard contract between Python servers and Python web apps.

Simplified, an ASGI app is just this:

```python
async def app(scope, receive, send):
    # scope = {"type": "http", "method": "GET", "path": "/health", "headers": [...]}
    await send({"type": "http.response.start", "status": 200,
                "headers": [(b"content-type", b"application/json")]})
    await send({"type": "http.response.body", "body": b'{"status":"ok"}'})
```

FastAPI builds this for you, so you write normal functions instead.

</details>

<details>
<summary><b>2) The full path inside the app</b></summary>

```
uvicorn (parses HTTP)
  -> middleware stack (CORS, logging, error catching... Session 2)
  -> router: finds the route that matches method + path
  -> FastAPI: reads path/query/body, validates them with Pydantic
  -> FastAPI: runs dependencies (section 6)
  -> YOUR FUNCTION
       async def -> runs on the event loop
       def       -> runs in a worker thread
  -> FastAPI: validates/filters the return value, converts it to JSON
  -> middleware stack (way back out)
  -> uvicorn sends the bytes
```

Keep this picture in mind. Most bugs make sense once you know which step they happen in. A 422 error, for example, happens at the "validates with Pydantic" step, before your function even runs.

</details>

<details>
<summary><b>3) How <code>@app.get</code> registers a route</b></summary>

A decorator is a function that receives your function. `@app.get("/health")` roughly does:

```python
def health(): ...
app.router.add_api_route("/health", health, methods=["GET"])
```

At that moment, FastAPI also **reads your function's signature** (parameters and type hints) and stores a plan: "this route needs no params and returns `dict[str, str]`". It does this once at startup, not per request. That's why FastAPI is fast and can generate `/docs`.

</details>

<details>
<summary><b>4) Where <code>/docs</code> comes from</b></summary>

From the stored plans, FastAPI builds an **OpenAPI** document (a JSON description of every endpoint, parameter and model) at `/openapi.json`. `/docs` is a page (Swagger UI) that reads it.

Bonus for the frontend: tools like `openapi-typescript` turn `/openapi.json` into TypeScript types for your Next.js app, so frontend and backend types can't drift apart.

</details>

---

## 3. Pydantic models: the contract of your API

A **model** describes the shape of data: which fields, which types, which limits. FastAPI uses models to check what clients send and to shape what you send back.

### Theory

<details>
<summary><b>1) Python doesn't check type hints. Pydantic does.</b></summary>

```python
def add(a: int, b: int) -> int:
    return a + b

add("x", "y")   # Python happily returns "xy". Hints are only documentation.
```

Pydantic reads the hints at runtime and **enforces** them:

```python
from pydantic import BaseModel

class Point(BaseModel):
    x: int
    y: int

Point(x=1, y=2)        # ok
Point(x="oops", y=2)   # raises ValidationError: x: Input should be a valid integer
```

This is why FastAPI can promise "inside your function, `body.title` really is a string of 1-200 chars".

</details>

<details>
<summary><b>2) Validation vs conversion (coercion)</b></summary>

By default Pydantic is "lax": it converts obvious cases.

```python
Point(x="5", y=2)   # ok, x becomes the int 5
Point(x=5.5, y=2)   # error: 5.5 is not a whole number
```

JSON from the browser often has numbers as strings, so this is usually helpful. If you want no conversion at all, use `model_config = ConfigDict(strict=True)`.

</details>

<details>
<summary><b>3) <code>Field(...)</code> limits: why every string needs a max length</b></summary>

```python
from pydantic import Field

class NoteCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(default="", max_length=20_000)
```

Without `max_length`, a client can send a 500 MB "title". Your server would read and store it all. Limits on every input are a basic security habit: cheap to add, painful to forget.

</details>

<details>
<summary><b>4) <code>extra="forbid"</code>: stop clients setting fields they shouldn't</b></summary>

By default Pydantic **ignores** unknown fields. Imagine the client sends:

```json
{"title": "Groceries", "id": "my-own-id", "created_at": "1999-01-01"}
```

With `extra="ignore"` (the default), the extra fields are silently dropped. That's mostly safe, but the client never learns its request was wrong. With `extra="forbid"`, the request fails with a clear 422 `extra_forbidden`. We use `forbid` on input models.

The bigger danger, called **mass assignment**: if you ever copy a request dict straight onto a stored object (`note.__dict__.update(request_dict)`), a client could set `owner_id` or `is_admin`. Separate input models that simply don't contain those fields make that impossible.

</details>

<details>
<summary><b>5) Separate models for input and output</b></summary>

| Model | Who fills it | Contains |
|---|---|---|
| `NoteCreate` | Client | title, body, tags: only what a client may choose |
| `NoteUpdate` | Client | the same fields, but all optional (PATCH) |
| `NoteOut` | Server | everything the client may **see**: id, timestamps... |

Later, the stored note will have fields the client must never see, like `owner_id` or internal flags. Because responses go through `NoteOut`, a field that isn't in `NoteOut` can never leak, even by accident.

</details>

<details>
<summary><b>6) <code>field_validator</code>: clean data on the way in</b></summary>

Tags should be lowercase, trimmed and without duplicates, whatever the client sends:

```python
from pydantic import field_validator

class NoteCreate(BaseModel):
    tags: list[str] = []

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, tags: list[str]) -> list[str]:
        cleaned = {t.strip().lower() for t in tags if t.strip()}
        return sorted(cleaned)

NoteCreate(tags=[" Work", "work", "IDEAS "]).tags   # ["ideas", "work"]
```

The validator runs after the type check, so `tags` is already a `list[str]` when it gets there.

</details>

<details>
<summary><b>7) <code>model_validate</code>, <code>model_dump</code> and <code>from_attributes</code></b></summary>

```python
note_out = NoteOut.model_validate(stored_note)   # object -> validated model
data = note_out.model_dump()                     # model -> plain dict
```

`model_validate` reads **dict keys** by default. Our stored notes are objects with attributes (`note.title`), so `NoteOut` sets `from_attributes=True`, which lets it read attributes. Session 3 needs this for database objects too.

</details>

<details>
<summary><b>8) What a 422 error looks like, and where it comes from</b></summary>

When the body doesn't match the model, FastAPI stops **before your function runs** and returns 422:

```json
{
  "detail": [
    {"type": "string_too_short", "loc": ["body", "title"],
     "msg": "String should have at least 1 character", "input": "", "ctx": {"min_length": 1}}
  ]
}
```

`loc` tells you where the problem is: `body` → `title`. Session 2 replaces this format with one standard error shape for the whole API, and stops echoing `input` back (it could contain a password).

</details>

### Build it

```python
# file: app/schemas.py
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_TAGS = 10


def _clean_tags(tags: list[str]) -> list[str]:
    """Lowercase, trim, drop empty ones, remove duplicates, keep a stable order."""
    cleaned = sorted({t.strip().lower() for t in tags if t.strip()})
    if len(cleaned) > MAX_TAGS:
        raise ValueError(f"at most {MAX_TAGS} tags")   # Pydantic turns this into a 422
    for t in cleaned:
        if len(t) > 30:
            raise ValueError("each tag must be at most 30 characters")
    return cleaned


class NoteCreate(BaseModel):
    """What a client may send to create a note. No id, no timestamps: the server owns those."""

    # forbid: unknown fields -> 422.  str_strip_whitespace: "  hi  " becomes "hi" before checks.
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200, examples=["Groceries"])
    body: str = Field(default="", max_length=20_000)
    tags: list[str] = Field(default_factory=list)
    pinned: bool = False

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, tags: list[str]) -> list[str]:
        return _clean_tags(tags)


class NoteUpdate(BaseModel):
    """PATCH body: every field is optional. Only the fields the client sends are changed."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str | None = Field(default=None, min_length=1, max_length=200)
    body: str | None = Field(default=None, max_length=20_000)
    tags: list[str] | None = None
    pinned: bool | None = None

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, tags: list[str] | None) -> list[str] | None:
        return None if tags is None else _clean_tags(tags)


class NoteOut(BaseModel):
    """What the client gets back. Anything not listed here can never leak."""

    model_config = ConfigDict(from_attributes=True)   # read from object attributes, not only dicts

    id: UUID
    title: str
    body: str
    tags: list[str]
    pinned: bool
    created_at: datetime
    updated_at: datetime


class Page[T](BaseModel):
    """A page of results. Page[NoteOut] is 'a page of notes' (Python 3.12 generic syntax)."""

    items: list[T]
    limit: int
    offset: int
```

### Try it (in a Python shell, no server needed)

```powershell
uv run python
```

```python
from app.schemas import NoteCreate, NoteUpdate
NoteCreate(title="  Groceries  ", tags=["Food", " food ", "HOME"])
# title='Groceries' body='' tags=['food', 'home'] pinned=False

NoteCreate(title="")                     # ValidationError: string_too_short
NoteCreate(title="x", owner="me")        # ValidationError: extra_forbidden
NoteCreate(title="x", pinned="yes")      # pinned=True  (lax conversion!)
NoteCreate(title="x", pinned="banana")   # ValidationError: bool_parsing
NoteUpdate(title="New").model_dump(exclude_unset=True)   # {'title': 'New'}  (section 5 uses this)
```

The `"yes"` → `True` result surprises most people. Now you know why: lax mode (dropdown 2).

---

## 4. Layers: router → service → repository

### Theory

<details>
<summary><b>1) Why split code into layers at all</b></summary>

You could write everything inside the route function. It works for 3 endpoints and turns painful at 20. Each layer has one job:

| Layer | Its one job | Must not |
|---|---|---|
| **Router** (`routers/notes.py`) | Turn HTTP into a function call and back: read params, pick status codes | Contain rules like "max 5 notes" |
| **Service** (`services/notes.py`) | The rules of your app: limits, checks, what happens in which order | Know about HTTP (no `Request`, no status codes) |
| **Repository** | Store and load data | Make decisions |

Payoff: in Session 3 you replace the in-memory repository with Postgres, and the router barely changes. In Session 6 you test the service without starting a server.

</details>

<details>
<summary><b>2) <code>@dataclass</code> vs Pydantic <code>BaseModel</code>: which for what</b></summary>

- **Pydantic** for data crossing a boundary you don't control: HTTP requests, files, env vars, LLM output. It validates.
- **dataclass** for your own internal objects. It's lighter and doesn't validate (you already trust the data).

```python
from dataclasses import dataclass, field

@dataclass
class Note:
    title: str
    tags: list[str] = field(default_factory=list)   # a NEW list per note
```

Why `default_factory=list` and not `= []`? With `= []`, the same list object would be shared by every note: add a tag to one and it would appear on all. A classic Python trap. (Pydantic copies defaults for you, so `= []` is fine there.)

</details>

<details>
<summary><b>3) Why the repository needs a lock</b></summary>

There's one repository object for the whole server process, and normal `def` routes run on several threads at once (section 9 explains why). Two threads changing the same dict at the same moment can corrupt what you read, for example a list being sorted while another thread inserts into it. A `threading.Lock` lets only one thread at a time inside a `with self._lock:` block.

```python
with self._lock:        # wait here until no other thread holds the lock
    self._notes[n.id] = n
# lock released automatically, even if an exception happened
```

</details>

### Build it

```python
# file: app/services/notes.py
import threading
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import UUID, uuid4


def now() -> datetime:
    return datetime.now(UTC)   # always timezone-aware UTC; convert to local time only in the UI


@dataclass
class Note:
    """Our internal note. Session 3 replaces this with a database model."""

    title: str
    body: str = ""
    tags: list[str] = field(default_factory=list)
    pinned: bool = False
    id: UUID = field(default_factory=uuid4)          # random id, safe to show in URLs
    created_at: datetime = field(default_factory=now)
    updated_at: datetime = field(default_factory=now)


class NoteLimitReached(Exception):
    """Raised by the service. The router decides which HTTP status that means."""


class InMemoryNoteRepo:
    """Stores notes in a dict. One instance per process, shared by all requests."""

    def __init__(self) -> None:
        self._notes: dict[UUID, Note] = {}
        self._lock = threading.Lock()

    def add(self, note: Note) -> Note:
        with self._lock:
            self._notes[note.id] = note
        return note

    def get(self, note_id: UUID) -> Note | None:
        return self._notes.get(note_id)   # one dict read is safe without the lock

    def count(self) -> int:
        with self._lock:
            return len(self._notes)

    def list(self, limit: int, offset: int, tag: str | None) -> list[Note]:
        with self._lock:
            notes = list(self._notes.values())   # copy, so sorting below is safe
        if tag:
            notes = [n for n in notes if tag in n.tags]
        # pinned first, then newest first
        notes.sort(key=lambda n: (not n.pinned, -n.updated_at.timestamp()))
        return notes[offset : offset + limit]

    def delete(self, note_id: UUID) -> bool:
        with self._lock:
            return self._notes.pop(note_id, None) is not None


class NoteService:
    """The rules of NoteMind. Knows nothing about HTTP."""

    def __init__(self, repo: InMemoryNoteRepo, max_notes: int) -> None:
        self.repo = repo
        self.max_notes = max_notes

    def create(self, title: str, body: str, tags: list[str], pinned: bool) -> Note:
        # BROKEN ON PURPOSE (section 10): we check, then later we add.
        if self.repo.count() >= self.max_notes:
            raise NoteLimitReached()
        time.sleep(0.2)   # pretend we do some work here (in Session 5: ask the AI for a title)
        return self.repo.add(Note(title=title, body=body, tags=tags, pinned=pinned))

    def get(self, note_id: UUID) -> Note | None:
        return self.repo.get(note_id)

    def list(self, limit: int, offset: int, tag: str | None) -> list[Note]:
        return self.repo.list(limit, offset, tag)

    def update(self, note_id: UUID, changes: dict) -> Note | None:
        note = self.repo.get(note_id)
        if note is None:
            return None
        for name, value in changes.items():
            setattr(note, name, value)   # safe: `changes` only has NoteUpdate's fields
        note.updated_at = now()
        return note

    def delete(self, note_id: UUID) -> bool:
        return self.repo.delete(note_id)
```

---

## 5. Routes: params, status codes, errors

### Theory

<details>
<summary><b>1) How FastAPI decides where each parameter comes from</b></summary>

It looks at the name and the type, in this order:

```python
@router.get("/{note_id}")
def get_note(note_id: UUID, verbose: bool = False, body: NoteCreate | None = None): ...
```

| Parameter | Rule | Result |
|---|---|---|
| `note_id` | Name appears in the path `{note_id}` | **Path** param |
| `body: NoteCreate` | Type is a Pydantic model | **JSON body** |
| `verbose: bool` | Simple type, not in path | **Query** param: `?verbose=true` |
| `service: ...Depends(...)` | Marked with `Depends` | **Dependency** (section 6) |

Because `note_id: UUID`, a request to `/api/v1/notes/abc` fails with 422 before your code runs: "abc" isn't a valid UUID.

</details>

<details>
<summary><b>2) Status codes you'll use every day</b></summary>

| Code | Meaning | NoteMind example |
|---|---|---|
| 200 OK | Success, with a body | GET a note |
| 201 Created | Something new was created | POST a note; add a `Location` header pointing to it |
| 204 No Content | Success, nothing to return | DELETE |
| 404 Not Found | That resource doesn't exist | GET an unknown id |
| 422 Unprocessable | The request is understood but invalid | Title too long |
| 429 Too Many Requests | A limit was hit | More notes than allowed |

`Location` lets a client (or your frontend) know the URL of what was just created without guessing.

</details>

<details>
<summary><b>3) <code>HTTPException</code>: how an error becomes a response</b></summary>

```python
raise HTTPException(status_code=404, detail="note not found")
```

Raising stops your function immediately. FastAPI catches the exception (in its error-handling layer) and sends `{"detail": "note not found"}` with status 404. For now we raise it in the router. Session 2 moves to typed errors raised by the service and one central handler.

</details>

<details>
<summary><b>4) Pagination limits: why <code>le=50</code> matters</b></summary>

```python
limit: Annotated[int, Query(ge=1, le=50)] = 20
```

`ge` = greater or equal, `le` = less or equal. Without `le=50`, one request with `?limit=10000000` makes your server build a giant response: an easy way to take it down. Every list endpoint needs a maximum.

`Annotated[int, Query(...)]` means: "the type is `int`, and here is extra info for FastAPI". The type stays clean for your editor, and the extra info is only for FastAPI.

</details>

<details>
<summary><b>5) PATCH and <code>exclude_unset</code>: "missing" is not the same as "empty"</b></summary>

PATCH means "change only what I send". The client sends `{"pinned": true}`, so the title must stay as it is.

```python
body = NoteUpdate(pinned=True)
body.model_dump()                     # {'title': None, 'body': None, 'tags': None, 'pinned': True}
body.model_dump(exclude_unset=True)   # {'pinned': True}   <- only what the client sent
```

With the first version you'd wipe the title. `exclude_unset=True` keeps only fields the client actually included.

One more case: the client sends `{"title": null}`. Our rule: `null` means "no change", so we also drop `None` values. (Another API could decide `null` means "clear this field". Pick one rule and document it.)

</details>

<details>
<summary><b>6) Deep Dive: Parameter Resolution, HTTP Status Compliance, and PATCH Mechanics</b></summary>

### 1. How Parameter Resolution Works (AST Inspection)
FastAPI doesn't parse route arguments dynamically on every request. Instead, it uses Python's `inspect` module at startup to analyze your function signature's abstract syntax tree (AST). It maps variables to request data using a strict type-hint rule:
* **Path Parameters:** If a variable name matches a placeholder in the URL path (e.g., `{note_id}`), it is extracted from the path. If type coercion fails (e.g., passing `abc` for a `UUID` parameter), FastAPI blocks the request with a `422 Unprocessable Entity` instantly, skipping your function logic and database layer entirely.
* **Body Parameters:** If a parameter is type-hinted as a Pydantic Model (inheriting from `BaseModel`), FastAPI automatically maps it to the incoming JSON request body payload.
* **Query Parameters:** If a parameter is a primitive scalar type (`int`, `str`, `bool`, `float`) and its name does *not* appear in the URL path, FastAPI treats it as a query string parameter (e.g., `?limit=20`). Missing query parameters safely fall back to their assigned Python defaults (like `None` or `20`).
* **Explicit Overrides:** To force a primitive type to be read from the JSON body instead of a query string, you must use the explicit `Body` marker (e.g., `comment: str = Body(...)`).

### 2. Semantic HTTP Status Codes & RFC Compliance
Declaring the status code within the route decorator ensures predictable, robust API behavior:
* **`201 Created`:** Used for successful `POST` requests. Best practices dictate attaching a `Location` header containing the direct URL of the newly created resource (e.g., `/api/v1/notes/{id}`) so clients don't have to guess the resource path.
* **`204 No Content`:** Used for successful `DELETE` operations. According to HTTP RFC specifications, a `204` response **must not contain a body**. FastAPI enforces this compliance by automatically stripping down the return value to 0 bytes before transmitting it to Uvicorn.
* **`422 Unprocessable Entity`:** Triggered automatically by FastAPI when incoming path, query, or body parameters fail validation checks.

### 3. Control Flow Short-Circuiting via `HTTPException`
Standard Python architectures often rely on returning complex state tuples or dictionaries (e.g., `{"error": "not_found"}`), forcing parent functions to constantly evaluate execution state. 

FastAPI utilizes Python's native exception propagation stack. Raising an `HTTPException` immediately halts control flow inside your function, winds back execution safely, and hands the error payload over to Starlette's exception middleware layer to build a clean JSON error response.

### 4. Defensive Pagination (Input Guardrails)
Allowing clients to request unrestricted page sizes (e.g., `?limit=1000000`) introduces an immediate Memory Denial of Service (DoS) risk, causing the server process to exhaust its RAM allocation. 

Using Python's `Annotated` syntax combined with FastAPI's `Query` validation helper establishes strict data constraints:
```python
limit: Annotated[int, Query(ge=1, le=50)] = 20
```
* **`ge=1`:** Enforces a minimum boundary (**g**reater than or **e**qual to 1).
* **`le=50`:** Establishes a maximum security guardrail (**l**ess than or **e**qual to 50).

### 5. The State Dilemma of `PATCH` vs `PUT`
While a `PUT` request completely overwrites a resource, a `PATCH` request must update **only** the specific attributes the client sent. This creates an architectural contradiction in Python:
* **Scenario A (Omitted Field):** The client sends `{"title": "New"}`. They want to keep the existing body text.
* **Scenario B (Explicit Null):** The client sends `{"body": null}`. They explicitly want to erase the existing body text.

Because standard Pydantic models initialize missing attributes to their default value (`None`), both scenarios look identical to Python (`body.body` evaluates to `None` in both cases). 

Pydantic solves this by tracking the state inception of the raw HTTP JSON payload. Calling `body.model_dump(exclude_unset=True)` strips away every attribute the client did not physically type:
* In Scenario A, it outputs `{"title": "New"}`. The key `"body"` is completely absent from the dictionary, ensuring your service loop leaves the database state untouched.
* In Scenario B, it outputs `{"body": None}`. The key `"body"` is present, allowing your code to selectively apply `setattr()` and explicitly clear the field.

</details>

### Build it

```python
# file: app/routers/notes.py
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.deps import NoteServiceDep
from app.schemas import NoteCreate, NoteOut, NoteUpdate, Page
from app.services.notes import NoteLimitReached

# Every route below starts with /api/v1/notes. "tags" groups them in /docs.
router = APIRouter(prefix="/api/v1/notes", tags=["notes"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_note(body: NoteCreate, response: Response, service: NoteServiceDep) -> NoteOut:
    try:
        note = service.create(body.title, body.body, body.tags, body.pinned)
    except NoteLimitReached:
        # "from None" hides the internal exception from the error chain; it's not useful to the client
        raise HTTPException(status_code=429, detail="note limit reached") from None
    response.headers["Location"] = f"/api/v1/notes/{note.id}"
    return NoteOut.model_validate(note)


@router.get("")
def list_notes(
    service: NoteServiceDep,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    tag: Annotated[str | None, Query(max_length=30)] = None,
) -> Page[NoteOut]:
    notes = service.list(limit, offset, tag.lower() if tag else None)
    return Page[NoteOut](items=[NoteOut.model_validate(n) for n in notes], limit=limit, offset=offset)


@router.get("/{note_id}")
def get_note(note_id: UUID, service: NoteServiceDep) -> NoteOut:
    note = service.get(note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="note not found")
    return NoteOut.model_validate(note)


@router.patch("/{note_id}")
def update_note(note_id: UUID, body: NoteUpdate, service: NoteServiceDep) -> NoteOut:
    # only fields the client sent, and null means "no change"
    changes = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    note = service.update(note_id, changes)
    if note is None:
        raise HTTPException(status_code=404, detail="note not found")
    return NoteOut.model_validate(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: UUID, service: NoteServiceDep) -> Response:
    if not service.delete(note_id):
        raise HTTPException(status_code=404, detail="note not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)   # 204 must have no body
```

The `-> NoteOut` return annotation does two jobs: it documents the response in `/docs`, **and** FastAPI validates and filters what you return against it.

---

## 6. Dependency injection with `Depends`

### Theory

<details>
<summary><b>1) The problem it solves</b></summary>

The route needs a `NoteService`. Option A, the quick way:

```python
service = NoteService(InMemoryNoteRepo(), 5)   # a global, created at import time

@router.get("/{note_id}")
def get_note(note_id: UUID):
    return service.get(note_id)
```

That works until you want a test to use a fake repository, a different limit, or (Session 3) a fresh database session **per request**. Then the global is stuck. `Depends` says instead: "before calling me, build this for me".

</details>

<details>
<summary><b>2) What happens at request time</b></summary>

```python
def get_settings() -> Settings: ...
def get_repo() -> InMemoryNoteRepo: ...
def get_note_service(repo = Depends(get_repo), settings = Depends(get_settings)) -> NoteService: ...

def get_note(note_id: UUID, service = Depends(get_note_service)): ...
```

For each request FastAPI walks the tree from the leaves up:

```
get_note needs get_note_service
    get_note_service needs get_repo      -> call it -> repo
    get_note_service needs get_settings  -> call it -> settings
    call get_note_service(repo, settings) -> service
call get_note(note_id, service)
```

If two dependencies in one request both need `get_settings`, it's called **once** and the result is reused (per-request caching).

</details>

<details>
<summary><b>3) <code>Annotated</code> aliases: write the dependency once</b></summary>

```python
NoteServiceDep = Annotated[NoteService, Depends(get_note_service)]

def get_note(note_id: UUID, service: NoteServiceDep): ...   # short and typed
```

Your editor sees `service` as a `NoteService` (autocomplete works) and FastAPI sees the `Depends`.

</details>

<details>
<summary><b>4) Shared objects: <code>@lru_cache</code> and module-level instances</b></summary>

Some things should exist **once per process**: settings (read env vars once), the in-memory repo (all requests must see the same notes), later the DB engine and HTTP clients.

```python
@lru_cache                     # first call runs the function; later calls return the saved result
def get_settings() -> Settings:
    return Settings()
```

The service itself is cheap, so we build a new one per request. It just holds references to the shared repo and settings.

</details>

<details>
<summary><b>5) The payoff: swapping things in tests</b></summary>

Preview of Session 6:

```python
app.dependency_overrides[get_repo] = lambda: InMemoryNoteRepo()   # a fresh, empty store per test
```

Every route that depends on `get_repo`, directly or through `get_note_service`, now uses the test's repo. You didn't change a line of app code.

</details>

### Build it

```python
# file: app/deps.py
from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from app.config import Settings
from app.services.notes import InMemoryNoteRepo, NoteService


@lru_cache
def get_settings() -> Settings:
    # Created once. If a value is invalid, this raises and the app refuses to start.
    return Settings()


_repo = InMemoryNoteRepo()   # ONE store for the whole process


def get_repo() -> InMemoryNoteRepo:
    return _repo


SettingsDep = Annotated[Settings, Depends(get_settings)]
RepoDep = Annotated[InMemoryNoteRepo, Depends(get_repo)]


def get_note_service(repo: RepoDep, settings: SettingsDep) -> NoteService:
    return NoteService(repo, settings.max_notes)   # cheap: built per request


NoteServiceDep = Annotated[NoteService, Depends(get_note_service)]
```

---

## 7. Settings: typed config from the environment

### Theory

<details>
<summary><b>1) Why config comes from environment variables</b></summary>

The same code runs on your laptop, in CI and in production. What changes is config: database URL, API keys, limits. Putting these in **environment variables** means:

- no secrets in Git,
- one Docker image for every environment (only the env vars change),
- hosting platforms (Render, Vercel) all have an "environment variables" screen.

Locally, typing env vars every time is annoying, so we use a `.env` file. It is **never committed**. `.env.example` (no real secrets) is committed so others know which variables exist.

</details>

<details>
<summary><b>2) Where a value comes from: precedence</b></summary>

`pydantic-settings` looks for each field, highest priority first:

1. A real environment variable: `$env:NOTEMIND_MAX_NOTES="7"`
2. The `.env` file: `NOTEMIND_MAX_NOTES=5`
3. The default in the class: `max_notes: int = 100`

`env_prefix="NOTEMIND_"` means field `max_notes` reads variable `NOTEMIND_MAX_NOTES`. The prefix avoids clashing with other apps' variables. Matching is case-insensitive.

</details>

<details>
<summary><b>3) Fail fast: bad config should stop startup</b></summary>

```python
max_notes: int = Field(default=100, ge=1)
```

With `NOTEMIND_MAX_NOTES=0` or `=abc`, creating `Settings()` raises a validation error **at startup**, naming the field. Far better than the app starting and failing on the first user request at 2 a.m. That's why `lifespan` (next section) calls `get_settings()` on startup.

</details>

<details>
<summary><b>4) <code>SecretStr</code>: secrets that don't print</b></summary>

```python
from pydantic import SecretStr

class Settings(BaseSettings):
    llm_api_key: SecretStr | None = None

s = Settings()
print(s)                                  # llm_api_key=SecretStr('**********')
s.llm_api_key.get_secret_value()          # the real value: call this only where it's used
```

If someone logs the settings object while debugging, the key doesn't end up in your logs.

</details>

### Build it

```python
# file: app/config.py
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Read NOTEMIND_* environment variables, then .env, then the defaults below.
    model_config = SettingsConfigDict(env_prefix="NOTEMIND_", env_file=".env", extra="ignore")

    app_name: str = "notemind-api"
    env: Literal["dev", "test", "prod"] = "dev"   # any other value -> startup error
    max_notes: int = Field(default=100, ge=1, le=10_000)
    llm_api_key: SecretStr | None = None           # used in Session 5
```

```
# file: .env.example   (commit this)
NOTEMIND_ENV=dev
NOTEMIND_MAX_NOTES=100
NOTEMIND_LLM_API_KEY=
```

```
# file: .env   (do NOT commit; add ".env" to .gitignore)
NOTEMIND_ENV=dev
NOTEMIND_MAX_NOTES=5
```

We use `max_notes=5` locally so you can hit the limit easily in section 10.

---

## 8. Lifespan: code that runs at startup and shutdown

### Theory

<details>
<summary><b>1) What runs when</b></summary>

```python
@asynccontextmanager
async def lifespan(app):
    print("A: before the first request")   # startup
    yield                                   # the app serves requests while paused here
    print("B: after the last request")      # shutdown (Ctrl+C, or a deploy stopping the container)
```

Startup is where you check config, open a DB connection pool (Session 3) or create a shared HTTP client (Session 5). Shutdown is where you close them cleanly.

</details>

<details>
<summary><b>2) Why not just run code at the top of <code>main.py</code>?</b></summary>

Top-level code runs at **import** time: also when tests import the module, when tools inspect it, and once per reload. Lifespan code runs only when a server actually starts serving, and it has a matching shutdown. It also keeps "everything this app opens" in one place.

</details>

<details>
<summary><b>3) The app factory: <code>create_app()</code></b></summary>

```python
def create_app() -> FastAPI:
    app = FastAPI(lifespan=lifespan)
    app.include_router(notes.router)
    return app

app = create_app()   # what uvicorn imports
```

Building the app inside a function means a test can create a fresh app with different settings, instead of sharing one global app.

</details>

### Build it

```python
# file: app/main.py   (replace the whole file)
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.deps import get_settings
from app.routers import demo, notes

log = logging.getLogger("notemind")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()   # bad config fails HERE, before any request
    log.warning("starting %s (env=%s, max_notes=%s)", settings.app_name, settings.env, settings.max_notes)
    yield
    log.warning("shutting down")   # Session 3: close DB pool. Session 5: close HTTP client.


def create_app() -> FastAPI:
    app = FastAPI(title="NoteMind API", version="0.1.0", lifespan=lifespan)
    app.include_router(notes.router)
    app.include_router(demo.router)   # section 9 experiment; remove after this session

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
```

(We use `log.warning` only because Python's default logging level hides `info`. Session 2 sets up proper logging.)

Create `app/routers/demo.py` from section 9 before starting the server, since `main.py` imports it.

### Run it

```powershell
'{"title": "Groceries", "body": "milk, eggs", "tags": ["Home", "food"]}' | Set-Content note.json
curl.exe -i -X POST -H "Content-Type: application/json" -d "@note.json" http://127.0.0.1:8000/api/v1/notes
```

You should see `201 Created`, a `location: /api/v1/notes/<uuid>` header, and the note with `tags: ["food","home"]`.

### Try it

1. `GET` the URL from the `location` header: 200. `PATCH` it with `{"pinned": true}`: title unchanged, `updated_at` changed. `DELETE` it: 204. `GET` again: 404.
2. `GET /api/v1/notes?limit=500`: 422. `GET /api/v1/notes/abc`: 422. Read the `loc` in each.
3. `POST` with `{"title": "x", "owner": "me"}`: 422 `extra_forbidden`.
4. Stop the server, run `$env:NOTEMIND_MAX_NOTES="0"; uv run fastapi dev app/main.py`. Startup fails and names the field. Then `Remove-Item Env:NOTEMIND_MAX_NOTES`.
5. Open `/docs` and create a note from the browser.

---

## 9. `def` vs `async def`: the most important runtime fact

### Theory

<details>
<summary><b>1) The event loop in plain words</b></summary>

uvicorn runs your app on **one thread** with an **event loop**. Think of one cook in a kitchen:

- The cook starts dish A, puts it in the oven (waiting for I/O, e.g. "waiting for the database"), and **while it bakes** starts dish B.
- `await` is the cook saying "this will take a while, I'll do something else meanwhile".

One cook can handle hundreds of dishes, **as long as no dish needs the cook standing still**.

```python
async def handler():
    await asyncio.sleep(2)   # "oven": the loop serves other requests during these 2 s
```

</details>

<details>
<summary><b>2) What "blocking" means, and why it freezes everything</b></summary>

```python
async def handler():
    time.sleep(2)            # the cook stands still for 2 s: nobody else gets served
```

`time.sleep` (and `requests.get`, a normal DB driver, reading a big file) don't know about the event loop. They hold the only thread. For those 2 seconds **every other request in this process waits**, including `/health`. In production, the load balancer sees health checks failing and may restart a perfectly healthy server.

</details>

<details>
<summary><b>3) What FastAPI does with plain <code>def</code></b></summary>

If your route is a normal `def`, FastAPI assumes it might block, so it runs it in a **threadpool** (about 40 worker threads by default) instead of on the loop:

```
event loop thread:  receives request -> hands def-route to a worker thread -> keeps serving others
worker thread:      runs your def function (blocking is OK here) -> returns result to the loop
```

So `time.sleep(2)` inside a `def` route only blocks one worker thread. Limit: with 40 threads, the 41st simultaneous blocking request waits for a free thread.

</details>

<details>
<summary><b>4) Calling blocking code from an <code>async def</code></b></summary>

Sometimes the route must be `async` (it awaits something) but also has one blocking step. Send just that step to the threadpool:

```python
from starlette.concurrency import run_in_threadpool

async def upload(file: UploadFile):
    raw = await file.read()                       # async: fine on the loop
    result = await run_in_threadpool(parse, raw)  # blocking parse runs on a worker thread
```

Session 2 uses exactly this for uploaded notes.

</details>

<details>
<summary><b>5) Which one to choose</b></summary>

| Inside the function you... | Use |
|---|---|
| only `await` async libraries (`httpx.AsyncClient`, `asyncio.sleep`, async DB driver) | `async def` |
| call any blocking library (`requests`, sync SQLAlchemy, `time.sleep`, heavy CPU work) | `def` |
| do mostly async work plus one blocking step | `async def` + `run_in_threadpool` for that step |
| aren't sure | `def`: slower in theory, never freezes the server |

Note: heavy **CPU** work (parsing a 50 MB file) still slows things down in a thread, because of Python's GIL (only one thread runs Python code at a time). Real CPU work belongs in a separate worker process (Session 5 talks about workers).

</details>

### Build it: prove it

```python
# file: app/routers/demo.py   (delete after this session)
import asyncio
import time

from fastapi import APIRouter

router = APIRouter(prefix="/demo", tags=["demo"])


@router.get("/block-async")
async def block_async() -> dict[str, str]:
    time.sleep(2)            # WRONG: blocks the event loop, so the whole server freezes
    return {"done": "block-async"}


@router.get("/block-sync")
def block_sync() -> dict[str, str]:
    time.sleep(2)            # OK: plain def runs in a worker thread
    return {"done": "block-sync"}


@router.get("/await-async")
async def await_async() -> dict[str, str]:
    await asyncio.sleep(2)   # OK: gives the loop back while waiting
    return {"done": "await-async"}
```

```python
# file: scripts/parallel.py
"""Calls a slow endpoint AND /health at the same moment, and prints when each finished."""
import asyncio
import sys
import time

import httpx


async def main(slow_path: str) -> None:
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=30) as client:
        start = time.perf_counter()

        async def hit(path: str) -> None:
            r = await client.get(path)
            print(f"{path:<20} {r.status_code}  finished after {time.perf_counter() - start:.1f}s")

        # gather = start both requests together, wait for both
        await asyncio.gather(hit(slow_path), hit("/health"))


asyncio.run(main(sys.argv[1]))
```

### Run it

Use `fastapi run` here (no auto-reload, cleaner timing):

```powershell
uv run fastapi run app/main.py
# second terminal:
uv run python scripts/parallel.py /demo/block-async
uv run python scripts/parallel.py /demo/block-sync
uv run python scripts/parallel.py /demo/await-async
```

What you should see:

| Slow endpoint | `/health` finished after | Why |
|---|---|---|
| `/demo/block-async` | about **2.0 s** | `time.sleep` held the only loop thread; `/health` had to wait |
| `/demo/block-sync` | about **0.0 s** | the sleep ran on a worker thread; the loop stayed free |
| `/demo/await-async` | about **0.0 s** | `await` handed the loop back during the wait |

If you remember one thing from this session, make it this table.

---

## 10. A real race condition, and its fix

### Theory

<details>
<summary><b>1) Why two threads can interleave</b></summary>

`def` routes run on worker threads at the same time. Python switches between threads every few milliseconds, and always during waits like `time.sleep`. So two requests can execute "step by step, mixed together":

```
thread A: count() -> 4   (limit is 5, OK)
thread B: count() -> 4   (still 4: A hasn't added yet, OK)
thread A: sleep... add  -> 5 notes
thread B: sleep... add  -> 6 notes   <- limit broken
```

</details>

<details>
<summary><b>2) The pattern: check-then-act</b></summary>

"Check a condition, then act on it" is only correct if nothing can change between the check and the act. Our `create()` checks `count()`, does some work, then calls `add()`. Each step holds the lock briefly, but the lock is **released in between**. Locking each step isn't enough; the check and the act must be **one** locked step.

The same bug, in bigger systems: two buyers both see "1 item left", or a free-plan user creates 6 projects when the limit is 5.

</details>

<details>
<summary><b>3) The fix: make check + act atomic</b></summary>

```python
def add_if_below(self, note: Note, limit: int) -> Note | None:
    with self._lock:                         # one lock around BOTH steps
        if len(self._notes) >= limit:
            return None
        self._notes[note.id] = note
        return note
```

Now thread B can't even run its check until A has finished adding.

</details>

<details>
<summary><b>4) Why the fix stops working in production</b></summary>

A `threading.Lock` only exists inside **one process**. In production you run several processes (`--workers 4`) or several containers behind a load balancer. Each has its own `_repo` and its own lock:

```
process 1: its own notes, its own lock
process 2: its own notes, its own lock   -> the limit is per process, and data is split
```

So the real fix is to keep shared state in one place all processes share: the **database**, using a transaction, a row lock or a unique constraint (Sessions 3 and 4). That's the "stateless servers" rule from `A7-Scaling-Basics.md`: servers keep no important state in memory.

</details>

### Try it: reproduce the bug

```python
# file: scripts/race.py
"""Sends 10 create requests at the same moment and prints the status codes."""
import asyncio

import httpx


async def main() -> None:
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=30) as client:
        responses = await asyncio.gather(
            *[client.post("/api/v1/notes", json={"title": f"race {i}"}) for i in range(10)]
        )
        codes = sorted(r.status_code for r in responses)
        print(codes, "->", codes.count(201), "created")


asyncio.run(main())
```

Restart the server (empty store), then run `uv run python scripts/race.py`. With `NOTEMIND_MAX_NOTES=5` you should see **more than 5** created, often all 10.

### Build it: the fix

Add this method to `InMemoryNoteRepo`:

```python
# file: app/services/notes.py   (add to InMemoryNoteRepo)
    def add_if_below(self, note: Note, limit: int) -> Note | None:
        """Check the limit and add in ONE locked step, so no other thread can slip in between."""
        with self._lock:
            if len(self._notes) >= limit:
                return None
            self._notes[note.id] = note
            return note
```

And replace `NoteService.create`:

```python
# file: app/services/notes.py   (replace NoteService.create)
    def create(self, title: str, body: str, tags: list[str], pinned: bool) -> Note:
        time.sleep(0.2)   # the slow work now happens BEFORE taking the lock (never hold a lock while waiting)
        note = self.repo.add_if_below(Note(title=title, body=body, tags=tags, pinned=pinned), self.max_notes)
        if note is None:
            raise NoteLimitReached()
        return note
```

Restart and rerun: exactly **5 × 201** and **5 × 429**.

Notice the slow work moved **outside** the lock. Holding a lock while waiting makes every other request wait in line too.

---

## Practice tasks

1. Add `GET /api/v1/notes?pinned=true` filtering. Which layer does the filtering, and why?
2. Add a `sort` query parameter that accepts only `updated` or `created` (hint: `Literal["updated", "created"]`). Check the 422 for `sort=title`.
3. Add `NOTEMIND_ALLOWED_ORIGINS` as `list[str]` to `Settings` and set it in `.env` as JSON: `NOTEMIND_ALLOWED_ORIGINS=["http://localhost:3000"]`. Print it at startup. Session 2 uses it for CORS.
4. Run `scripts/parallel.py` against `/demo/block-sync`, but fire **60** slow requests together, plus `/health`. Explain the timing using the threadpool size.
5. Write a dependency `get_request_time()` that returns `time.perf_counter()`, used by two other dependencies of the same route. Print inside it and prove it runs once per request.
6. At work: open one of your office services (FastAPI or TypeScript). Find where config is loaded, where input is validated, and whether any async function calls something blocking.

## Interview questions

<details>
<summary><b>1) What happens between an HTTP request arriving and your FastAPI function running?</b></summary>

uvicorn accepts the connection and parses the HTTP request on an asyncio event loop, then calls the app through the ASGI interface. The request passes through the middleware stack, the router matches method and path, FastAPI resolves dependencies and validates path, query and body with Pydantic (invalid → 422 without calling your code), then calls the handler: `async def` on the event loop, `def` in a threadpool. The return value is validated against the response model, serialized to JSON, and sent back out through the middleware.

</details>

<details>
<summary><b>2) <code>def</code> vs <code>async def</code>: which do you use and what goes wrong?</b></summary>

`async def` runs on the single event loop, so one blocking call (`time.sleep`, `requests`, a sync DB driver) freezes every request in the process, including health checks. `def` runs in a threadpool: safe for blocking I/O but capped by the pool size. Use `async def` only when every slow call inside is awaited; otherwise `def`, or `run_in_threadpool` for one blocking step. CPU-heavy work belongs in a separate process.

</details>

<details>
<summary><b>3) Why separate input and output models?</b></summary>

Input models contain only what a client may set, so it can't set server-owned fields like id, owner or timestamps (mass assignment), and `extra="forbid"` rejects unknown fields loudly. Output models list only what a client may see, so internal fields can't leak. And the API contract can change independently of how data is stored.

</details>

<details>
<summary><b>4) What does <code>Depends</code> give you over importing a global?</b></summary>

Things get built per request (for example a DB session), are cached within that request, and are visible in the function signature. Cleanup works through `yield`. Docs are generated for auth and params. Most importantly, tests can swap any dependency with `app.dependency_overrides` without touching app code.

</details>

<details>
<summary><b>5) How do you handle configuration and secrets?</b></summary>

Environment variables, with a `.env` file only for local development and never committed (`.env.example` documents the variables). A typed settings class validates everything at startup, so bad config fails fast. Secrets use `SecretStr`, so they print masked; the real value is read only where it's used.

</details>

<details>
<summary><b>6) Two requests both passed a "max 5" check. Why, and how do you fix it?</b></summary>

Check-then-act isn't atomic: two threads both check before either one writes. In one process, put the check and the write under one lock (and do slow work outside the lock). Across several processes or servers, an in-memory lock doesn't help because each process has its own: the shared state and the atomicity must live in the database (a transaction with a row lock, a conditional write, or a unique constraint) or in Redis with an atomic operation.

</details>

<details>
<summary><b>7) What's the difference between PUT and PATCH, and how do you implement PATCH?</b></summary>

PUT replaces the whole resource with what you send; PATCH changes only the fields you send. In FastAPI, make every field in the update model optional and apply `model_dump(exclude_unset=True)`, so fields the client didn't send stay unchanged. Decide and document what an explicit `null` means.

</details>

## Done when

- [ ] `uv run fastapi dev app/main.py` serves `/docs`, and I can draw the request journey from memory.
- [ ] Create, list (with `tag` filter), get, patch and delete all work, with 201 + `Location`, 204 and 404.
- [ ] Empty titles, unknown fields, a bad UUID and `limit=500` are all rejected with 422, and I can read the `loc`.
- [ ] Invalid config stops startup with a clear message.
- [ ] I ran the three `/demo` experiments and can explain the results table.
- [ ] I reproduced the race (more than 5 notes) and fixed it, and I can explain why the fix breaks with 2 workers.
- [ ] I answered interview questions 1, 2 and 6 aloud without looking.
- [ ] I logged today's learnings in `progress.md` under "Week 9".

## Reading

- FastAPI tutorial, first steps through dependencies: https://fastapi.tiangolo.com/tutorial/
- Concurrency and `async`/`await` in FastAPI: https://fastapi.tiangolo.com/async/
- Bigger applications (routers): https://fastapi.tiangolo.com/tutorial/bigger-applications/
- Body updates (PATCH): https://fastapi.tiangolo.com/tutorial/body-updates/
- Lifespan events: https://fastapi.tiangolo.com/advanced/events/
- Settings: https://fastapi.tiangolo.com/advanced/settings/
- Pydantic models and validators: https://docs.pydantic.dev/latest/concepts/models/ and https://docs.pydantic.dev/latest/concepts/validators/
- uv projects: https://docs.astral.sh/uv/guides/projects/
