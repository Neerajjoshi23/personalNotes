# Session 3 - Postgres, SQLAlchemy 2.0 and Alembic

**What you build today:** NoteMind stops losing everything on restart. Notes and tags move into **Postgres**, the schema is managed with **migrations**, and you meet the two database problems every backend engineer must recognize on sight: the **N+1 query** and the **missing index**.

Nothing changes for the client: same endpoints, same responses. That's the point of the layers from Session 1: only the repository and the service change.

**Time:** about 12-14 hours. The biggest session; split it across two holiday days.

**HLD notes to read alongside:**

- `B-Data\B1-Data-Models-DB-Choice.md`: tables, relations, why Postgres.
- `B-Data\B2-Indexes.md`: how an index works and when it's used (section 8 here).
- `B-Data\B3-Transactions-Isolation.md`: read the transaction part now; isolation levels are used in Session 5.

## Topics

| # | Topic | After it you can |
|---|---|---|
| 1 | Postgres in Docker | Run a database locally with one command and open a SQL shell |
| 2 | Engine, connection pool, session | Explain what each one is and size the pool |
| 3 | ORM models | Define tables in Python, including a many-to-many relation |
| 4 | Alembic migrations | Create, review, apply and roll back schema changes |
| 5 | Repository on SQLAlchemy | Write `select`, filters, joins, pagination |
| 6 | Transactions | Know when data is really saved, and prove "all or nothing" |
| 7 | The N+1 problem | Spot it in the SQL log and fix it with `selectinload` |
| 8 | Indexes and `EXPLAIN` | Measure a slow query, add the right index, prove it's used |

---

## 1. Postgres in Docker

### Theory

<details>
<summary><b>1) Why a real database instead of the dict</b></summary>

The in-memory dict had three problems you already saw:

1. **Restart = data gone.**
2. **Two processes = two different dicts** (Session 1, section 10).
3. **No safe concurrent changes** beyond one lock in one process.

A database server solves all three: data is on disk, every app process connects to the **same** server, and it has transactions and locks built in (Session 5 uses them heavily).

Why Postgres: it's the default choice for a new product. It's reliable, has JSON columns, full-text search, and `pgvector` for embeddings, so your RAG work fits in the same database later.

</details>

<details>
<summary><b>2) What Docker Compose does here</b></summary>

`docker-compose.yml` describes containers to run. One command starts Postgres with a user, password and database already created:

- `image: pgvector/pgvector:pg17`: Postgres 17 with the pgvector extension pre-installed (for later).
- `ports: "5432:5432"`: your laptop's port 5432 → the container's port 5432.
- `volumes: pgdata:...`: data is stored in a Docker **volume**, so it survives `docker compose down` and restarts. `docker compose down -v` deletes it.
- `healthcheck`: Docker checks `pg_isready` so you can see when the DB is really up.

</details>

<details>
<summary><b>3) The connection URL</b></summary>

```
postgresql+psycopg://notemind:notemind@localhost:5432/notemind
└──dialect┘└driver┘ └user┘   └pass┘   └host┘    └port┘└database┘
```

- **dialect** `postgresql`: which SQL flavor SQLAlchemy should speak.
- **driver** `psycopg`: the library that actually talks to Postgres over the network (psycopg 3).

In production the URL comes from an environment variable, never from code.

</details>

### Build it

```yaml
# file: docker-compose.yml
services:
  db:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_USER: notemind
      POSTGRES_PASSWORD: notemind      # local only; production uses a real secret
      POSTGRES_DB: notemind
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U notemind"]
      interval: 5s
      retries: 10

volumes:
  pgdata: {}
```

```powershell
docker compose up -d db
docker compose ps                     # STATUS should become "healthy"
docker compose exec db psql -U notemind -c "select version();"
```

Install the Python packages:

```powershell
uv add sqlalchemy "psycopg[binary]" alembic
```

Add to `Settings`:

```python
    database_url: str = "postgresql+psycopg://notemind:notemind@localhost:5432/notemind"
    db_echo: bool = False   # True = print every SQL statement (we use it in section 7)
```

---

## 2. Engine, connection pool and session

### Theory

<details>
<summary><b>1) Why opening a connection per request would be slow</b></summary>

Opening a Postgres connection means a TCP handshake, authentication and Postgres starting a backend process for you: typically several milliseconds, sometimes more. Doing that for every request wastes time, and Postgres can only hold a limited number of connections (100 by default).

So we keep a few connections **open** and **reuse** them: a **pool**.

</details>

<details>
<summary><b>2) Engine, pool, session: three layers</b></summary>

| Thing | How many | What it is |
|---|---|---|
| **Engine** | One per process | Knows the URL and owns the **pool** |
| **Pool** | One per engine | A few open connections, lent out and returned |
| **Session** | One per request | Your "unit of work": tracks objects you load or change, borrows a connection for its transaction |

```
request starts  -> new Session (no connection yet)
first query     -> Session borrows a connection from the pool, starts a transaction
commit()        -> transaction ends, connection goes back to the pool
request ends    -> session.close()
```

</details>

<details>
<summary><b>3) Pool settings, and how to size them</b></summary>

```python
create_engine(url, pool_size=5, max_overflow=5, pool_timeout=10, pool_pre_ping=True)
```

- `pool_size=5`: keep up to 5 connections open.
- `max_overflow=5`: under load, open up to 5 extra temporary ones (10 total).
- `pool_timeout=10`: if all 10 are busy, a request waits up to 10 s for one, then errors.
- `pool_pre_ping=True`: check a connection still works before lending it (connections die when the DB restarts or the network drops).

Sizing: Remember the threadpool has about 40 threads, so 40 `def` routes can run at once, but only 10 connections exist. If each request holds a connection only briefly, that's fine. If requests hold connections for long (slow queries, or worse, waiting for an AI call *inside* a transaction), requests queue up. Also check the total: `processes × (pool_size + max_overflow)` must stay below Postgres's `max_connections`.

</details>

<details>
<summary><b>4) Why a session per request, closed with <code>yield</code></b></summary>

```python
def get_db() -> Iterator[Session]:
    db = SessionFactory()
    try:
        yield db          # the route runs here, using db
    finally:
        db.close()        # always runs: returns the connection, rolls back anything uncommitted
```

This is a **yield dependency**: FastAPI runs the code before `yield`, gives the value to the route, and runs the `finally` part after the route finishes. Even if the route crashes, the connection goes back to the pool. A session must never be shared between requests: it holds that request's objects and transaction.

</details>

<details>
<summary><b>5) Circular imports, and why <code>get_settings</code> moves</b></summary>

`db.py` needs the settings. `get_settings` lives in `deps.py`, which imports the services, which will import the models... A chain where module A imports B while B (indirectly) imports A fails with "partially initialized module". The fix is to put basic building blocks at the bottom of the chain: `get_settings` moves into `config.py`, which imports nothing from the app.

</details>

### Build it

Move `get_settings` into `config.py` (and delete it from `deps.py`):

```python
# file: app/config.py   (add at the bottom)
from functools import lru_cache


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

In `app/deps.py` and `app/main.py`, change the import to `from app.config import get_settings`. In `tests/conftest.py` too.

```python
# file: app/db.py
from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings


@lru_cache
def get_engine() -> Engine:
    """One engine (and one connection pool) per process."""
    s = get_settings()
    return create_engine(
        s.database_url,
        echo=s.db_echo,        # print SQL when debugging
        pool_size=5,
        max_overflow=5,
        pool_timeout=10,
        pool_pre_ping=True,
    )


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    # expire_on_commit=False: objects keep their values after commit, so we can still
    # build the response from them without another query
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """One session per request. Closing it returns the connection and rolls back uncommitted work."""
    db = get_session_factory()()
    try:
        yield db
    finally:
        db.close()
```

---

## 3. ORM models: tables as Python classes

### Theory

<details>
<summary><b>1) What an ORM does</b></summary>

ORM = Object-Relational Mapper. You define a class; SQLAlchemy maps it to a table, and objects to rows:

```python
note = Note(title="Groceries")
db.add(note)
db.commit()
# SQLAlchemy sends: INSERT INTO notes (id, title, ...) VALUES (...)
```

It saves you writing SQL by hand for common cases, but it **does not** save you from understanding SQL. Every ORM call becomes SQL, and sections 7 and 8 are about what happens when you don't look at it.

</details>

<details>
<summary><b>2) SQLAlchemy 2.0 typed models: <code>Mapped</code> and <code>mapped_column</code></b></summary>

```python
class Note(Base):
    __tablename__ = "notes"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str | None] = mapped_column(Text)
```

- `Mapped[str]` → column type from the Python type, and **NOT NULL**.
- `Mapped[str | None]` → nullable.
- `mapped_column(...)` adds details: length, primary key, defaults, indexes.
- `uuid.UUID` maps to Postgres's native `uuid` type automatically.

</details>

<details>
<summary><b>3) <code>default</code> vs <code>server_default</code></b></summary>

```python
created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())
```

- `default=utcnow`: Python fills the value when **SQLAlchemy** inserts. The object has it immediately, no extra query.
- `server_default=func.now()`: written into the table definition (`DEFAULT now()`), so rows inserted by **raw SQL** (seed scripts, other tools) also get a value.

Use both for timestamps. And always `DateTime(timezone=True)` (`timestamptz` in Postgres): store moments in UTC with a zone, never "local time without zone".

</details>

<details>
<summary><b>4) Many-to-many: notes ↔ tags</b></summary>

A note has many tags, and a tag belongs to many notes. Neither table can hold the other's ids in one column, so a third **association table** holds the pairs:

```
notes                 note_tags                 tags
id  | title           note_id | tag_id           id | name
a1  | Groceries       a1      | 1                1  | food
b2  | Paint           a1      | 2                2  | home
                      b2      | 2
```

"Which tags does note a1 have?" → rows in `note_tags` where `note_id = a1` → tags 1 and 2.

In SQLAlchemy, `relationship(secondary=note_tags)` lets you write `note.tags` and get `Tag` objects, while it manages the `note_tags` rows for you.

</details>

<details>
<summary><b>5) Foreign keys and <code>ON DELETE CASCADE</code></b></summary>

```python
Column("note_id", ForeignKey("notes.id", ondelete="CASCADE"), primary_key=True)
```

The foreign key makes the database **refuse** a `note_tags` row pointing to a note that doesn't exist. `ondelete="CASCADE"` means: when a note is deleted, the database deletes its `note_tags` rows too. The tags themselves stay, since other notes may use them.

The composite primary key `(note_id, tag_id)` also means the same pair can't be stored twice.

</details>

<details>
<summary><b>6) Mapping ORM objects to the response: tags are objects now</b></summary>

`note.tags` is now a list of `Tag` objects, but `NoteOut.tags` is `list[str]`. A `mode="before"` validator converts before the type check:

```python
@field_validator("tags", mode="before")
@classmethod
def tag_names(cls, v):
    return [t.name if hasattr(t, "name") else t for t in v]
```

That one line keeps the API exactly as it was, even though storage changed completely.

</details>

### Build it

```python
# file: app/models.py
import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Table, Text, Uuid, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    """All models inherit from this. Base.metadata knows every table (Alembic reads it)."""


# Plain association table: only two foreign keys, no extra columns, so no class needed.
note_tags = Table(
    "note_tags",
    Base.metadata,
    Column("note_id", Uuid, ForeignKey("notes.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)   # auto-increment integer
    name: Mapped[str] = mapped_column(String(30), unique=True)   # unique: one row per tag name


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, default="", server_default="")
    pinned: Mapped[bool] = mapped_column(default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())

    # note.tags -> list[Tag], managed through note_tags; sorted by name when loaded
    tags: Mapped[list[Tag]] = relationship(secondary=note_tags, order_by=Tag.name)
```

```python
# file: app/schemas.py   (add to NoteOut)
    @field_validator("tags", mode="before")
    @classmethod
    def tag_names(cls, v: list) -> list:
        # ORM gives Tag objects; the in-memory version gave strings. Accept both.
        return [t.name if hasattr(t, "name") else t for t in v]
```

---

## 4. Alembic migrations

### Theory

<details>
<summary><b>1) Why migrations instead of <code>create_all()</code></b></summary>

`Base.metadata.create_all(engine)` creates missing tables, and that's all it does. It can't **change** an existing table (add a column, add an index), and it doesn't record what was applied where. Your laptop, CI and production would drift apart.

A **migration** is a small Python file: "from version A to version B, run these changes", plus how to undo them. Alembic keeps an `alembic_version` table in the database saying which migration it's at. `alembic upgrade head` applies whatever is missing, in order. Same result on every database.

</details>

<details>
<summary><b>2) Autogenerate: a draft, not an answer</b></summary>

```powershell
uv run alembic revision --autogenerate -m "create notes and tags"
```

Alembic compares your models with the real database and **writes a draft** migration. Always open and read it. It can't detect some things correctly:

- a **renamed** column looks like "drop old column + add new column" (= data loss!),
- some type changes, server defaults and constraint names,
- data changes ("fill this new column for existing rows") are never generated.

Treat the generated file like code from a junior teammate: review it before running it.

</details>

<details>
<summary><b>3) upgrade, downgrade, and the history</b></summary>

```powershell
uv run alembic upgrade head     # apply everything up to the newest
uv run alembic downgrade -1     # undo the last one
uv run alembic current          # which version is this DB at?
uv run alembic history          # list all migrations
```

Each file has `revision` (its id) and `down_revision` (the one before it): a chain. Two people creating migrations at the same time gives two "heads"; Alembic will tell you and you merge them.

</details>

<details>
<summary><b>4) Wiring Alembic to our settings and models</b></summary>

`alembic/env.py` is a script Alembic runs. We change two things:

- `target_metadata = Base.metadata`: so autogenerate knows our models.
- the URL comes from **our settings**, unless something (like the test setup in Session 7) already set one.

We also remove the placeholder URL from `alembic.ini`, so a secret never sits in a committed file.

</details>

### Build it

```powershell
uv run alembic init alembic
```

That creates `alembic.ini` and an `alembic/` folder. In `alembic.ini`, find the line starting with `sqlalchemy.url =` and **delete it**.

In `alembic/env.py`, replace the part near the top where `target_metadata = None` is defined:

```python
# file: alembic/env.py   (replace "target_metadata = None" with this block)
from app.config import get_settings
from app.models import Base

target_metadata = Base.metadata

# Use our settings, unless a URL was already set (Session 7 tests set their own).
if not config.get_main_option("sqlalchemy.url"):
    config.set_main_option("sqlalchemy.url", get_settings().database_url.replace("%", "%%"))
```

(The `%%` is because `alembic.ini` is parsed by Python's configparser, where `%` is special. Passwords with `%` would otherwise break.)

Alembic must be able to `import app`. Run it from the `notemind` folder; if you get `ModuleNotFoundError: app`, add `prepend_sys_path = .` under `[alembic]` in `alembic.ini` (it's usually already there).

```powershell
uv run alembic revision --autogenerate -m "create notes and tags"
```

Open the new file in `alembic/versions/`. You should see `op.create_table("tags", ...)`, `op.create_table("notes", ...)` and `op.create_table("note_tags", ...)` with the foreign keys. Read every line. Then:

```powershell
uv run alembic upgrade head
docker compose exec db psql -U notemind -c "\dt"
docker compose exec db psql -U notemind -c "\d notes"
docker compose exec db psql -U notemind -c "\d note_tags"
```

### Try it

`uv run alembic downgrade -1`, then `\dt` again: the tables are gone (only `alembic_version` stays). `uv run alembic upgrade head` to bring them back. You now know how to undo a bad migration locally.

---

## 5. The repository, now on SQLAlchemy

### Theory

<details>
<summary><b>1) <code>select()</code>: queries as Python objects</b></summary>

```python
stmt = select(Note).where(Note.pinned.is_(True)).order_by(Note.updated_at.desc()).limit(20)
notes = db.scalars(stmt).all()
```

becomes:

```sql
SELECT notes.* FROM notes WHERE notes.pinned IS true ORDER BY notes.updated_at DESC LIMIT 20
```

- `db.scalars(stmt)` → the first column of each row (here: `Note` objects).
- `db.scalar(stmt)` → one single value (for `count`).
- `db.get(Note, id)` → load by primary key (and reuse it if this session already loaded it).

Values are sent as **bound parameters**, never pasted into the SQL text, so SQL injection is impossible through these calls. Never build SQL with f-strings.

</details>

<details>
<summary><b>2) Filtering through a relation: join</b></summary>

"Notes that have the tag `work`":

```python
stmt = select(Note).join(Note.tags).where(Tag.name == "work")
```

```sql
SELECT notes.* FROM notes
JOIN note_tags ON notes.id = note_tags.note_id
JOIN tags ON tags.id = note_tags.tag_id
WHERE tags.name = 'work'
```

`join(Note.tags)` works out the join path through `note_tags` from the relationship.

</details>

<details>
<summary><b>3) Offset pagination, and its weakness</b></summary>

`LIMIT 20 OFFSET 40` = "skip 40 rows, give me 20". Simple, and fine for NoteMind. The weakness: the database still walks through the 40 skipped rows, so page 5,000 is slow, and if a note is inserted while you're paging, items shift and you can see one twice. Big feeds use **keyset (cursor) pagination**: `WHERE updated_at < :last_seen ORDER BY updated_at DESC LIMIT 20`. Practice task 5.

</details>

<details>
<summary><b>4) Get-or-create tags</b></summary>

For `tags=["food","home"]`: load the tags that already exist, create the missing ones, attach all of them.

```python
existing = {t.name: t for t in db.scalars(select(Tag).where(Tag.name.in_(names)))}
new = [Tag(name=n) for n in names if n not in existing]
```

Two requests creating the same **new** tag at the same moment would both try to insert `food`. The unique constraint rejects the second one: an `IntegrityError` and a 500. Session 5 fixes it with `INSERT ... ON CONFLICT DO NOTHING`. Note it and move on.

</details>

### Build it

```python
# file: app/services/notes.py   (replace the whole file)
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.errors import NotFound, TooManyRequests
from app.models import Note, Tag
from app.schemas import NoteCreate


class NoteLimitReached(TooManyRequests):
    def __init__(self) -> None:
        super().__init__("note limit reached, delete a note first")


class NoteNotFound(NotFound):
    def __init__(self) -> None:
        super().__init__("note not found")


class NoteRepo:
    """All SQL for notes lives here. It never commits: the service decides when work is done."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, note_id: UUID) -> Note | None:
        return self.db.get(Note, note_id)

    def count(self) -> int:
        return self.db.scalar(select(func.count()).select_from(Note)) or 0

    def list(self, limit: int, offset: int, tag: str | None) -> list[Note]:
        stmt = (
            select(Note)
            .order_by(Note.pinned.desc(), Note.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if tag:
            stmt = stmt.join(Note.tags).where(Tag.name == tag)
        return list(self.db.scalars(stmt))

    def get_or_create_tags(self, names: list[str]) -> list[Tag]:
        if not names:
            return []
        existing = {t.name: t for t in self.db.scalars(select(Tag).where(Tag.name.in_(names)))}
        new = [Tag(name=n) for n in names if n not in existing]
        self.db.add_all(new)   # inserted at the next flush/commit (race fixed in Session 5)
        return sorted([*existing.values(), *new], key=lambda t: t.name)

    def add(self, note: Note) -> None:
        self.db.add(note)

    def delete(self, note: Note) -> None:
        self.db.delete(note)


class NoteService:
    def __init__(self, db: Session, max_notes: int) -> None:
        self.db = db
        self.repo = NoteRepo(db)
        self.max_notes = max_notes

    def create(self, data: NoteCreate) -> Note:
        if self.repo.count() >= self.max_notes:   # check-then-act race again (fixed in Session 5)
            raise NoteLimitReached()
        note = Note(title=data.title, body=data.body, pinned=data.pinned,
                    tags=self.repo.get_or_create_tags(data.tags))
        self.repo.add(note)
        self.db.commit()   # the moment it is really saved
        return note

    def get(self, note_id: UUID) -> Note:
        note = self.repo.get(note_id)
        if note is None:
            raise NoteNotFound()
        return note

    def list(self, limit: int, offset: int, tag: str | None) -> list[Note]:
        return self.repo.list(limit, offset, tag)

    def update(self, note_id: UUID, changes: dict) -> Note:
        note = self.get(note_id)
        if "tags" in changes:
            note.tags = self.repo.get_or_create_tags(changes.pop("tags"))   # objects, not strings
        for name, value in changes.items():
            setattr(note, name, value)
        note.updated_at = datetime.now(UTC)
        self.db.commit()
        return note

    def delete(self, note_id: UUID) -> None:
        self.repo.delete(self.get(note_id))
        self.db.commit()
```

(`selectinload` is imported now; section 7 uses it.)

```python
# file: app/deps.py   (replace the repo parts; keep the idempotency store from Session 2)
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.idempotency import InMemoryIdempotencyStore
from app.services.notes import NoteService

SettingsDep = Annotated[Settings, Depends(get_settings)]
DbDep = Annotated[Session, Depends(get_db)]


def get_note_service(db: DbDep, settings: SettingsDep) -> NoteService:
    return NoteService(db, settings.max_notes)


NoteServiceDep = Annotated[NoteService, Depends(get_note_service)]

_idem_store = InMemoryIdempotencyStore()


def get_idem_store() -> InMemoryIdempotencyStore:
    return _idem_store


IdemStoreDep = Annotated[InMemoryIdempotencyStore, Depends(get_idem_store)]
```

Close the pool cleanly at shutdown:

```python
# file: app/main.py   (in lifespan, after "yield")
    from app.db import get_engine
    get_engine().dispose()   # close all pooled connections
```

### Theory: one more thing before running

<details>
<summary><b>Why our routes build <code>NoteOut</code> inside the function</b></summary>

`note.tags` is loaded **lazily**: the first time you touch it, SQLAlchemy runs a query. That needs the session to still be open. Our routes call `NoteOut.model_validate(note)` **inside** the function, while the request's session is open. If you instead returned the raw ORM object and let FastAPI convert it later, you could hit `DetachedInstanceError` ("parent instance is not bound to a Session") depending on when cleanup runs. Converting explicitly avoids that whole class of bugs.

</details>

### Run it

```powershell
uv run fastapi dev app/main.py
curl.exe -i -H "Content-Type: application/json" -d "@note.json" http://127.0.0.1:8000/api/v1/notes
```

Stop the server, start it again, and `GET /api/v1/notes`: the note is still there. Look at it in SQL too:

```powershell
docker compose exec db psql -U notemind -c "select n.title, t.name from notes n join note_tags nt on nt.note_id = n.id join tags t on t.id = nt.tag_id;"
```

The Session 2 tests now need a database; they'll fail until Session 7. Running `uv run pytest tests/test_uploads.py` still works (pure functions).

---

## 6. Transactions: when is data really saved?

### Theory

<details>
<summary><b>1) A transaction = all or nothing</b></summary>

Creating a note with two new tags is **five** SQL statements: insert 2 tags, insert 1 note, insert 2 `note_tags` rows. If the server crashed after the third, you'd have a note with no tags and maybe orphan tags. A transaction groups them: either **all** are saved (`COMMIT`) or **none** (`ROLLBACK`). Postgres guarantees this even if the power goes out mid-way.

</details>

<details>
<summary><b>2) How SQLAlchemy's session handles transactions ("autobegin")</b></summary>

```
db = Session()                 # nothing happens yet
db.get(Note, id)               # first SQL -> BEGIN is sent automatically, then SELECT
db.add(note); db.commit()      # INSERTs are sent ("flush"), then COMMIT
db.get(...)                    # a NEW transaction begins automatically
db.close()                     # anything not committed -> ROLLBACK
```

So in our app: **every request is one transaction**, from its first query to `db.commit()` in the service. If the service raises before commit, `get_db`'s `close()` rolls everything back.

</details>

<details>
<summary><b>3) flush vs commit</b></summary>

- **flush** = send the pending SQL (`INSERT`, `UPDATE`) to the database **inside** the transaction. Other connections can't see it yet, and it can still be rolled back. Useful when you need a generated value (like an auto-increment id) before committing. SQLAlchemy also flushes automatically before a query ("autoflush") so your own queries see your own changes.
- **commit** = flush + make it permanent and visible to everyone.

</details>

<details>
<summary><b>4) Who commits: the service, once per use case</b></summary>

The repository only adds, loads and deletes; the **service** calls `commit()` once, at the end of a use case. If one action needs several repository calls (create a note + its tags + later a usage record), they all land in one transaction. A repository that committed inside each method would break "all or nothing".

</details>

<details>
<summary><b>5) Keep transactions short</b></summary>

While a transaction is open it holds a pooled connection and possibly locks (Session 5). Never wait for slow things inside one: no AI calls, no HTTP calls to other services, no `sleep`. Session 6 calls the AI **outside** any transaction for exactly this reason.

</details>

### Try it: prove "all or nothing"

Temporarily add this to `NoteService.create`, right after `self.repo.add(note)`:

```python
        self.db.flush()                      # the INSERTs really reach Postgres here...
        if data.title == "boom":
            raise RuntimeError("crash after insert, before commit")
```

```powershell
'{"title": "boom", "tags": ["brandnewtag"]}' | Set-Content boom.json
curl.exe -i -H "Content-Type: application/json" -d "@boom.json" http://127.0.0.1:8000/api/v1/notes
docker compose exec db psql -U notemind -c "select count(*) from notes where title = 'boom';"
docker compose exec db psql -U notemind -c "select count(*) from tags where name = 'brandnewtag';"
```

The API returns 500 (our clean problem body). Both counts are **0**: the INSERTs were sent, but the transaction never committed, so `close()` rolled them back. Remove the lines.

---

## 7. The N+1 query problem

### Theory

<details>
<summary><b>1) What it is</b></summary>

`list_notes` loads 20 notes with **1** query. Then, for each note, building `NoteOut` touches `note.tags`, which is lazy, so SQLAlchemy runs **1 more query per note**:

```
SELECT * FROM notes ORDER BY ... LIMIT 20             -- 1 query
SELECT tags.* ... WHERE note_tags.note_id = 'a1'      -- +1
SELECT tags.* ... WHERE note_tags.note_id = 'b2'      -- +1
... 20 times                                          -- = 21 queries
```

That's "N+1": 1 query for the list + N for the related data. Each query is fast alone, but each one is a network round-trip. 20 is annoying; a page of 100 items with three relations is 301 queries and a slow page.

</details>

<details>
<summary><b>2) Why it's sneaky</b></summary>

The code looks innocent: `note.tags`. No query in sight. It's fast on your laptop with 3 notes and slow in production with real data. The only way to see it: **look at the SQL**. Turn on `echo`, or count queries in a test.

</details>

<details>
<summary><b>3) The fix: load the relation for all notes at once</b></summary>

```python
stmt = select(Note).options(selectinload(Note.tags)) ...
```

`selectinload` runs **one** extra query for all 20 notes together:

```
SELECT * FROM notes ORDER BY ... LIMIT 20
SELECT ... FROM tags JOIN note_tags ... WHERE note_tags.note_id IN ('a1','b2',...)   -- 1 query
```

21 queries become 2, whatever the page size.

</details>

<details>
<summary><b><code>selectinload</code> vs <code>joinedload</code></b></summary>

- `joinedload`: one single query with a `JOIN`. Good for **one-to-one / many-to-one** (each note has one author). For many-to-many it repeats each note's columns once per tag, and combined with `LIMIT` it gets tricky.
- `selectinload`: a second query with `WHERE id IN (...)`. Good for **collections** (a note has many tags). It's our choice here.

</details>

### Try it: see it, then fix it

1. Create 5 notes with 2 tags each (a small loop in `scripts/seed_notes.py` with `httpx`, or 5 curls).
2. Set `NOTEMIND_DB_ECHO=true` in `.env`, restart, call `GET /api/v1/notes`, and count the `SELECT` statements in the console: **1 + 5**.
3. Fix it in `NoteRepo.list`:

```python
# file: app/services/notes.py   (NoteRepo.list: add the options line)
        stmt = (
            select(Note)
            .options(selectinload(Note.tags))   # load tags for ALL notes in one extra query
            .order_by(Note.pinned.desc(), Note.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
```

4. Restart and call it again: **2** SELECTs. Set `NOTEMIND_DB_ECHO=false`.

---

## 8. Indexes and `EXPLAIN`

### Theory

<details>
<summary><b>1) What an index is</b></summary>

Without an index, "the 20 newest notes" means: read **every** row, sort them all, keep 20. That's a **sequential scan**: fine for 100 rows, terrible for 1 million.

An index is a separate, **sorted** structure (a B-tree) of chosen columns, each entry pointing to its row. Like a book's index: you jump straight to the right page instead of reading the whole book. With an index on `updated_at`, "the newest 20" = read the last 20 index entries. No sort, no full scan.

Cost: every INSERT/UPDATE must also update the index, and it takes disk space. So index what you **query**, not every column.

</details>

<details>
<summary><b>2) Composite indexes and the "leftmost prefix" rule</b></summary>

An index on `(pinned, updated_at)` is sorted by `pinned` first, then by `updated_at` within each `pinned` value. Like a phone book sorted by last name, then first name:

- it helps `ORDER BY pinned DESC, updated_at DESC` ✓ (exactly its order, read backwards),
- it helps `WHERE pinned = true ORDER BY updated_at` ✓,
- it does **not** help `ORDER BY updated_at` alone ✗: like finding everyone named "Ravi" in a phone book sorted by last name.

Same reason `note_tags`' primary key `(note_id, tag_id)` helps "tags of this note" but not "notes with this tag" (which filters on `tag_id` first). That needs its own index on `tag_id`.

</details>

<details>
<summary><b>3) Reading <code>EXPLAIN ANALYZE</code></b></summary>

`EXPLAIN` shows the plan Postgres chose; `EXPLAIN ANALYZE` also **runs** the query and shows real times.

```
Limit  (actual time=45.1..45.2 rows=20)
  ->  Sort  (Sort Method: top-N heapsort)
        ->  Seq Scan on notes  (rows=200000)          <- read every row
Execution Time: 45.3 ms
```

```
Limit  (actual time=0.03..0.05 rows=20)
  ->  Index Scan Backward using ix_notes_pinned_updated on notes   <- read only 20 index entries
Execution Time: 0.07 ms
```

What to look for: `Seq Scan` on a big table, `Sort` on many rows, and `rows=` much larger than what you return. (Your numbers will differ; the shape is what matters.)

</details>

<details>
<summary><b>4) <code>ANALYZE</code>: why Postgres sometimes ignores your index</b></summary>

Postgres picks a plan using **statistics** about the table (row count, value distribution). After inserting a lot of data, run `ANALYZE notes;` to refresh them (autovacuum also does it, eventually). On a tiny table Postgres may skip the index on purpose: reading 50 rows directly is cheaper than using an index. That's why you test with realistic data sizes.

</details>

### Try it: measure, index, measure again

Seed 200,000 notes with plain SQL (it bypasses the API limit on purpose):

```powershell
docker compose exec db psql -U notemind -c "INSERT INTO notes (id, title, body, pinned, created_at, updated_at) SELECT gen_random_uuid(), 'seed-' || g, '', g % 100 = 0, now() - g * interval '1 second', now() - g * interval '1 second' FROM generate_series(1, 200000) AS g; ANALYZE notes;"
docker compose exec db psql -U notemind -c "EXPLAIN ANALYZE SELECT id FROM notes ORDER BY pinned DESC, updated_at DESC LIMIT 20;"
```

Write down the plan and time (expect `Seq Scan` + `Sort`). Now add the index **through a migration**, like a real change. Add to the `Note` model:

```python
# file: app/models.py   (inside class Note)
    __table_args__ = (Index("ix_notes_pinned_updated", "pinned", "updated_at"),)
```

And to the `note_tags` table, for "notes with tag X":

```python
# file: app/models.py   (add as a third argument inside Table("note_tags", ...))
    Index("ix_note_tags_tag_id", "tag_id"),
```

```powershell
uv run alembic revision --autogenerate -m "index notes list order and note_tags tag_id"
# open the file: you should see two op.create_index(...) calls. Review, then:
uv run alembic upgrade head
docker compose exec db psql -U notemind -c "EXPLAIN ANALYZE SELECT id FROM notes ORDER BY pinned DESC, updated_at DESC LIMIT 20;"
```

Expect `Index Scan Backward using ix_notes_pinned_updated` and a time in fractions of a millisecond. Clean up the seed data:

```powershell
docker compose exec db psql -U notemind -c "DELETE FROM notes WHERE title LIKE 'seed-%'; ANALYZE notes;"
```

On a big production table, `CREATE INDEX` locks writes while it builds. There you'd use `CREATE INDEX CONCURRENTLY` (in Alembic: `op.create_index(..., postgresql_concurrently=True)` inside an `autocommit_block()`). Good to know for interviews.

---

## Practice tasks

1. Add `GET /api/v1/tags` returning every tag name with how many notes use it (`GROUP BY` + `count`). Check the SQL with `echo`: it should be **one** query.
2. Add a nullable `archived_at` column with a migration, and make `DELETE` set it instead of deleting ("soft delete"). Lists must hide archived notes. What happens to your index? Would a **partial index** (`WHERE archived_at IS NULL`) help?
3. Write a migration that renames `body` to `content`. Look at what autogenerate produces (drop + add!) and fix it by hand with `op.alter_column(..., new_column_name=...)`. Then rename it back.
4. Find the N+1 in `GET /api/v1/notes/{id}` (hint: there isn't one; why not?) and in a version of `list` that also loaded a second relation.
5. Implement keyset pagination: `GET /api/v1/notes?before=<updated_at>&limit=20`. Explain why it stays fast on page 5,000 and doesn't skip or repeat items.
6. Use `docker compose exec db psql -U notemind` and write by hand the SQL for: "the 5 most used tags", "notes without any tag", "notes with both tags `work` and `ideas`".

## Interview questions

<details>
<summary><b>1) What's the difference between the engine, the connection pool and the session?</b></summary>

The engine is created once per process; it knows the database URL and owns the connection pool. The pool keeps a few connections open and lends them out, because opening a connection is slow and Postgres allows a limited number. A session is per request (a unit of work): it tracks loaded and changed objects and borrows a connection for its transaction, which goes back to the pool on commit or close. Size the pool so `processes × pool size` stays under the database's connection limit.

</details>

<details>
<summary><b>2) What is the N+1 problem, how do you detect it, and how do you fix it?</b></summary>

Loading a list with one query, then lazily loading a relation for each item with one more query each: N+1 round-trips. It hides behind innocent attribute access like `note.tags`. You detect it by logging SQL or counting queries in tests. Fix it with eager loading: `selectinload` for collections (one extra `IN (...)` query) or `joinedload` for many-to-one, or by writing the query to fetch what you need directly.

</details>

<details>
<summary><b>3) How does an index speed up a query, and when doesn't it help?</b></summary>

A B-tree index keeps chosen columns sorted with pointers to rows, so the database can find matching rows or read rows in order without scanning and sorting the whole table. A composite index only helps queries that use its leftmost columns. It doesn't help when the query filters or sorts on other columns, when it returns a large share of the table (a sequential scan is cheaper), or when statistics are stale. Indexes cost write time and space. Verify with `EXPLAIN ANALYZE`.

</details>

<details>
<summary><b>4) Why use migrations instead of creating tables from the models?</b></summary>

`create_all` can only create missing tables. It can't alter existing ones and doesn't record what was applied. Migrations are versioned, reviewable, reversible changes applied in order, with the current version stored in the database, so every environment ends up identical. Autogenerated migrations are drafts: renames, data backfills and some type changes must be written or fixed by hand.

</details>

<details>
<summary><b>5) What is a transaction, and where do you put commit?</b></summary>

A group of statements that succeed or fail together (atomicity), isolated from other transactions until commit, and durable after commit. Commit once per use case in the service layer, so everything one action does lands together; repositories don't commit. Keep transactions short and never wait on slow external calls inside them, because they hold a connection and possibly locks.

</details>

<details>
<summary><b>6) Offset vs keyset pagination?</b></summary>

Offset (`LIMIT 20 OFFSET 4000`) is simple and allows jumping to any page, but the database still walks the skipped rows, so deep pages are slow, and concurrent inserts shift items between pages. Keyset (`WHERE updated_at < :last ORDER BY updated_at DESC LIMIT 20`, with a unique tie-breaker) uses an index to start right where the last page ended: fast at any depth and stable, but no "jump to page 57".

</details>

## Done when

- [ ] Postgres runs in Docker, and I can open `psql` and inspect tables with `\dt` and `\d`.
- [ ] Notes and tags are stored in Postgres and survive a server restart; the API responses look exactly like before.
- [ ] I created, reviewed, applied and rolled back a migration, and I can explain what autogenerate misses.
- [ ] I proved "all or nothing" with the `boom` experiment.
- [ ] I saw the N+1 in the SQL log (1+N SELECTs) and fixed it (2 SELECTs).
- [ ] I measured the list query on 200k rows before and after the index and can read both `EXPLAIN ANALYZE` plans.
- [ ] I answered interview questions 2, 3 and 5 aloud without notes.

## Reading

- SQLAlchemy 2.0 ORM quickstart: https://docs.sqlalchemy.org/en/20/orm/quickstart.html
- SQLAlchemy unified tutorial (sessions, select, relationships): https://docs.sqlalchemy.org/en/20/tutorial/index.html
- Relationship loading (`selectinload`, `joinedload`): https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html
- Connection pooling: https://docs.sqlalchemy.org/en/20/core/pooling.html
- Alembic tutorial and autogenerate: https://alembic.sqlalchemy.org/en/latest/tutorial.html and https://alembic.sqlalchemy.org/en/latest/autogenerate.html
- FastAPI SQL databases guide: https://fastapi.tiangolo.com/tutorial/sql-databases/
- Postgres `EXPLAIN`: https://www.postgresql.org/docs/current/using-explain.html
- Postgres indexes: https://www.postgresql.org/docs/current/indexes.html
- Use The Index, Luke (free book on indexes): https://use-the-index-luke.com/
