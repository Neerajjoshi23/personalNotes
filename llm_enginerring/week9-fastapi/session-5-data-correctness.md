# Session 5 - Data correctness under concurrency: transactions, locks, idempotency

**What you build today:** NoteMind stays correct when many things happen at once. Four real bugs, each reproduced first and then fixed with the right database tool:

| Bug | When it happens | Fix you'll use |
|---|---|---|
| **Lost update**: two tabs edit one note, one edit silently disappears | Two people (or two tabs) editing | Optimistic locking: a `version` column + HTTP `ETag` / `If-Match` |
| **Limit broken**: 10 fast requests create 8 notes when the limit is 5 | Double-clicks, scripts, retries | Pessimistic locking: `SELECT ... FOR UPDATE` |
| **500 on a new tag**: two notes created with the same brand-new tag | Concurrent creates | `INSERT ... ON CONFLICT DO NOTHING` |
| **Duplicate notes on retry**: two servers, or two requests at the same moment, same Idempotency-Key | Network retries | Idempotency keys stored in Postgres with a unique key |

Changed endpoints:

```
GET   /api/v1/notes/{id}   -> now returns an ETag header: "3"
PATCH /api/v1/notes/{id}   -> now requires If-Match: "3"   (428 if missing, 412 if stale)
POST  /api/v1/notes        -> Idempotency-Key now stored in Postgres, safe across processes
```

**Time:** about 8-10 hours.

**HLD notes to read alongside:**

- `B-Data\B3-Transactions-Isolation.md`: isolation levels and anomalies (sections 1 and 2 here).
- `G-Contention\G1-Locking.md`: optimistic vs pessimistic locking (sections 3 and 4).
- `D-Async\D3-Delivery-Semantics-Idempotency.md`: idempotency in depth (section 6).
- Skim `G-Contention\G2-Distributed-Locks-Reservations.md` to see where this goes next.

## Topics

| # | Topic | After it you can |
|---|---|---|
| 1 | Isolation: what concurrent transactions see | Explain READ COMMITTED and why our bugs happen under it |
| 2 | Writing race scripts | Reliably reproduce a concurrency bug instead of hoping |
| 3 | Lost updates + optimistic locking | Add a version column, ETag and If-Match, return 412/428 |
| 4 | Check-then-act + pessimistic locking | Lock the user row with `FOR UPDATE` |
| 5 | Upserts | Get-or-create without races, using `ON CONFLICT` |
| 6 | Idempotency keys in the database | Replay safely across processes, even for simultaneous requests |
| 7 | Deadlocks | Recognize one and prevent it with lock ordering |

---

## 1. What concurrent transactions see

### Theory

<details>
<summary><b>1) Isolation: the "I" in ACID</b></summary>

When transactions run at the same time, **isolation** defines how much of each other's unfinished work they can see. Perfect isolation (as if they ran one after another) is slow, so databases offer levels. Postgres's default is **READ COMMITTED**:

- You **never** see another transaction's uncommitted changes.
- **Each statement** sees everything committed **before that statement started**.

So two `SELECT`s in the same transaction can return different results if someone committed in between. That detail explains section 4.

</details>

<details>
<summary><b>2) The anomalies, in NoteMind terms</b></summary>

| Anomaly | What happens | NoteMind example |
|---|---|---|
| Lost update | Two transactions read the same row, both write, the second overwrites the first | Two tabs save the same note (section 3) |
| Write skew / check-then-act | Both check a condition that's true, both act, and together they break it | Both requests see "4 notes < 5" and both insert (section 4) |
| Unique violation on create | Both see "tag doesn't exist", both insert | Same new tag created twice (section 5) |

READ COMMITTED prevents none of these. That's not a bug in Postgres: you choose the right tool per case.

</details>

<details>
<summary><b>3) Why not just use SERIALIZABLE everywhere?</b></summary>

`SERIALIZABLE` makes Postgres guarantee the result equals *some* one-at-a-time order. When it can't, it **aborts** a transaction with a serialization error, and your code must **retry** the whole transaction. It's a valid design (some teams use it everywhere with a retry wrapper), but it means retry logic around every write and more aborted work under load. Here we stay on READ COMMITTED and use **explicit**, targeted tools. You'll see exactly what each one protects.

</details>

<details>
<summary><b>4) Two kinds of "concurrent"</b></summary>

- **Milliseconds apart:** two requests hit the server at the same moment (double-click, retries, scripts). Database locks handle these.
- **Minutes apart:** a user opens the edit form, goes for tea, then saves. No database transaction stays open for minutes, so locks can't help. You need **versions** that travel with the data to the client and back (section 3).

</details>

---

## 2. Writing race scripts

### Theory

<details>
<summary><b>1) Why "it works when I test it" means nothing</b></summary>

A race needs two requests to overlap in a tiny window. Clicking manually never hits it; production traffic eventually does. So you **force** it: send many requests at exactly the same moment with `asyncio.gather`, and if needed temporarily **widen the window** with a short `sleep` between check and act. Once the bug shows up reliably, you can prove the fix.

</details>

<details>
<summary><b>2) A helper that logs in once</b></summary>

All notes routes need a token now, so the scripts register/log in first and reuse the token.

</details>

### Build it

```python
# file: scripts/race_common.py
"""Shared helpers for the race scripts: log in once, then fire requests together."""
import httpx

BASE = "http://127.0.0.1:8000"


def token_for(email: str, password: str = "correct horse battery") -> str:
    with httpx.Client(base_url=BASE) as c:
        c.post("/api/v1/auth/register", json={"email": email, "password": password})   # 201 or 409, both fine
        r = c.post("/api/v1/auth/token", data={"username": email, "password": password})
        r.raise_for_status()
        return r.json()["access_token"]
```

---

## 3. Lost updates and optimistic locking

### Theory

<details>
<summary><b>1) The lost update, step by step</b></summary>

```
10:00  Tab A: GET note     -> body "milk"
10:01  Tab B: GET note     -> body "milk"
10:02  Tab B: PATCH body "milk, eggs"       -> saved
10:05  Tab A: PATCH body "milk, bread"      -> saved, and "eggs" is gone. Nobody was told.
```

No crash, no error, just quietly wrong data. The last writer wins.

</details>

<details>
<summary><b>2) Optimistic locking: "save only if nobody changed it since I read it"</b></summary>

Add a `version` number to the row. Every successful update increments it. A save says which version it was based on, and the update only applies if that's still the current version:

```sql
UPDATE notes SET body = 'milk, bread', version = 3
WHERE id = :id AND version = 2      -- "only if it's still the version I read"
```

If Tab B already moved it to version 3, this matches **0 rows**: the app knows the save is stale and tells the user "this note changed, reload it". It's called *optimistic* because it assumes conflicts are rare and doesn't lock anything while the user is editing.

</details>

<details>
<summary><b>3) How SQLAlchemy does it for you: <code>version_id_col</code></b></summary>

```python
version: Mapped[int] = mapped_column(server_default="1")
__mapper_args__ = {"version_id_col": version}
```

With this, every ORM `UPDATE` of a note automatically adds `AND version = <loaded value>` and sets `version = loaded + 1`. If the row count is 0, SQLAlchemy raises `StaleDataError`. That covers a change sneaking in **between our load and our commit**, in milliseconds. For the minutes-long case we also compare the client's version with the loaded one first (dropdown 5).

</details>

<details>
<summary><b>4) The HTTP side: ETag and If-Match</b></summary>

HTTP already has headers for exactly this, so the frontend doesn't need a custom field:

```
GET /api/v1/notes/abc        -> 200, ETag: "2"
PATCH /api/v1/notes/abc      If-Match: "2"   -> 200, ETag: "3"     (it was still version 2)
PATCH /api/v1/notes/abc      If-Match: "2"   -> 412 Precondition Failed   (it's version 3 now)
PATCH /api/v1/notes/abc      (no If-Match)   -> 428 Precondition Required
```

- **ETag** = "a label for this version of the resource". Ours is the version number in quotes (the quotes are part of the HTTP syntax).
- **412**: your precondition (`If-Match`) is false.
- **428**: this endpoint requires a precondition and you didn't send one. Requiring it means a frontend can't accidentally overwrite blindly.

Remember the CORS setup from Session 2: `ETag` is in `expose_headers` and `If-Match` is in `allow_headers`, or the browser would hide/block them.

</details>

<details>
<summary><b>5) Two checks, two time scales</b></summary>

```python
note = repo.get(note_id)               # loads version 3
if note.version != expected_version:   # client edited version 2 minutes ago -> 412 (human time)
    raise PreconditionFailed(...)
... apply changes ...
db.commit()                            # UPDATE ... WHERE version = 3
                                       # someone committed version 4 in the last few ms
                                       # -> StaleDataError -> also 412 (machine time)
```

</details>

<details>
<summary><b>6) What the frontend does with a 412</b></summary>

Show "This note was changed somewhere else", fetch the latest version, and let the user re-apply or merge their change. Never silently retry with the new ETag: that just brings back the lost update. For collaborative editors (Google Docs style), conflicts are merged automatically instead (CRDTs/OT); see `E-Realtime\E3-Collaborative-Sync.md`.

</details>

### Build it

```python
# file: app/models.py   (inside class Note: add version, and __mapper_args__ next to __table_args__)
    version: Mapped[int] = mapped_column(server_default="1")
    __mapper_args__ = {"version_id_col": version}   # ORM adds "AND version = ?" to every UPDATE
```

```powershell
uv run alembic revision --autogenerate -m "note version for optimistic locking"
# review: add_column("notes", sa.Column("version", sa.Integer(), server_default="1", nullable=False))
# server_default fills existing rows with 1, so NOT NULL is fine this time
uv run alembic upgrade head
```

```python
# file: app/errors.py   (add)
class PreconditionFailed(AppError):
    status_code, title = 412, "Precondition Failed"


class PreconditionRequired(AppError):
    status_code, title = 428, "Precondition Required"
```

```python
# file: app/services/notes.py   (top of the file: add the imports and the error class)
from sqlalchemy.orm.exc import StaleDataError

from app.errors import PreconditionFailed


class NoteChanged(PreconditionFailed):
    def __init__(self) -> None:
        super().__init__("this note was changed by someone else; reload it and try again")
```

```python
# file: app/services/notes.py   (inside class NoteService: replace update)
    def update(self, note_id: UUID, changes: dict, expected_version: int) -> Note:
        note = self.get(note_id)
        if note.version != expected_version:      # stale since the client loaded it (human time)
            raise NoteChanged()
        if "tags" in changes:
            note.tags = self.repo.get_or_create_tags(changes.pop("tags"))
        for name, value in changes.items():
            setattr(note, name, value)
        note.updated_at = datetime.now(UTC)       # always touches the row, so version always increments
        try:
            self.db.commit()                      # UPDATE ... WHERE id = ? AND version = ?
        except StaleDataError:                    # changed between our SELECT and UPDATE (machine time)
            self.db.rollback()
            raise NoteChanged() from None
        return note
```

```python
# file: app/routers/notes.py   (replace get_note and update_note)
from app.errors import BadRequest, PreconditionRequired


def parse_if_match(value: str | None) -> int:
    """'"3"' -> 3. Missing -> 428. Anything else -> 400."""
    if value is None:
        raise PreconditionRequired('send If-Match with the note\'s ETag, e.g. If-Match: "3"')
    try:
        return int(value.strip().strip('"'))
    except ValueError:
        raise BadRequest('If-Match must look like "3"') from None


@router.get("/{note_id}")
def get_note(note_id: UUID, response: Response, service: NoteServiceDep) -> NoteOut:
    note = service.get(note_id)
    response.headers["ETag"] = f'"{note.version}"'
    return NoteOut.model_validate(note)


@router.patch("/{note_id}")
def update_note(
    note_id: UUID,
    body: NoteUpdate,
    response: Response,
    service: NoteServiceDep,
    if_match: Annotated[str | None, Header()] = None,   # the "If-Match" header
) -> NoteOut:
    changes = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    note = service.update(note_id, changes, parse_if_match(if_match))
    response.headers["ETag"] = f'"{note.version}"'   # the client needs the NEW version for its next save
    return NoteOut.model_validate(note)
```

Add `version: int` to `NoteOut` too, so list views can send `If-Match` without an extra GET.

### Try it: the two-tabs script

```python
# file: scripts/lost_update.py
"""Two 'tabs' load the same note, then both save. Without versions, one edit is silently lost."""
import httpx

from race_common import BASE, token_for

h = {"Authorization": f"Bearer {token_for('tabs@example.com')}"}
with httpx.Client(base_url=BASE, headers=h) as c:
    note = c.post("/api/v1/notes", json={"title": "Shopping", "body": "milk"}).json()
    url = f"/api/v1/notes/{note['id']}"

    tab_a = c.get(url)   # both tabs load version 1
    tab_b = c.get(url)

    r_b = c.patch(url, json={"body": "milk, eggs"}, headers={"If-Match": tab_b.headers["etag"]})
    r_a = c.patch(url, json={"body": "milk, bread"}, headers={"If-Match": tab_a.headers["etag"]})

    print("tab B save:", r_b.status_code)   # 200
    print("tab A save:", r_a.status_code, r_a.json().get("detail"))   # 412
    print("final body:", c.get(url).json()["body"])                  # "milk, eggs": nothing lost
```

```powershell
uv run python scripts/lost_update.py
```

Then see the bug the fix prevents: temporarily make `update_note` skip the version check (pass `note.version` as expected, i.e. comment out the `if note.version != expected_version` lines). Rerun: both saves return 200 and the final body is `milk, bread`. Eggs lost, nobody told. Put the check back.

---

## 4. Check-then-act, and pessimistic locking

### Theory

<details>
<summary><b>1) Why the per-user note limit is broken again</b></summary>

```python
if self.repo.count() >= self.max_notes:   # SELECT count(*) ... WHERE owner_id = me
    raise NoteLimitReached()
... insert ...
```

Ten requests at once, each in its own transaction. Under READ COMMITTED each `count(*)` sees only **committed** rows. None of the ten has committed yet, so they all see 4, all pass, all insert. The Session 1 lock is gone (it was in-memory), and a database transaction alone doesn't stop this.

</details>

<details>
<summary><b>2) <code>SELECT ... FOR UPDATE</code>: take a lock that others must wait for</b></summary>

```sql
SELECT id FROM users WHERE id = :me FOR UPDATE;
```

This locks **that one user row** until the transaction ends (commit or rollback). Any other transaction asking `FOR UPDATE` on the same row **waits**. So for one user, creates now run one after another:

```
T1: lock user row  -> count = 4 -> insert -> COMMIT (lock released)
T2: lock user row ... waits ... gets it -> count = 5 -> NoteLimitReached -> ROLLBACK
```

Why T2's count sees 5: under READ COMMITTED, **each statement** sees what was committed before it started, and T2's `count` runs after T1 committed. (Under REPEATABLE READ it would still see the old snapshot; the rules differ there.)

It's called *pessimistic* because it assumes conflicts will happen and blocks up front.

</details>

<details>
<summary><b>3) Why lock the <em>user</em> row?</b></summary>

We need one row that every "create a note for this user" request touches. The notes themselves can't be locked: the new note doesn't exist yet. The user row is the natural "parent" to serialize on. Different users lock different rows, so they never wait for each other.

Common alternatives: a counter column (`UPDATE users SET note_count = note_count + 1 WHERE id = :me AND note_count < 5`, one atomic statement), or a Postgres **advisory lock** on a key. All three are fine; the locked parent row is the easiest to understand.

</details>

<details>
<summary><b>4) The rules for holding locks</b></summary>

- Hold them as **short** as possible: lock, check, write, commit.
- **Never** wait for anything slow while holding a lock: no AI calls, no HTTP calls, no sleeps (except our deliberate demo sleep).
- Lock in a **consistent order** everywhere (section 7), or you get deadlocks.
- Use `FOR UPDATE NOWAIT` (error immediately) or `SET lock_timeout` when waiting isn't acceptable.

</details>

### Try it: reproduce

Temporarily widen the window: in `NoteService.create`, add `import time; time.sleep(0.3)` right **after** the count check and before the insert. Set `NOTEMIND_MAX_NOTES=5` and restart.

```python
# file: scripts/race_limit.py
"""One user fires 10 creates at the same moment. With max_notes=5, at most 5 may succeed."""
import asyncio

import httpx

from race_common import BASE, token_for


async def main() -> None:
    h = {"Authorization": f"Bearer {token_for('racer@example.com')}"}
    async with httpx.AsyncClient(base_url=BASE, headers=h, timeout=30) as c:
        rs = await asyncio.gather(*[c.post("/api/v1/notes", json={"title": f"race {i}"}) for i in range(10)])
        codes = sorted(r.status_code for r in rs)
        print(codes, "->", codes.count(201), "created")


asyncio.run(main())
```

```powershell
uv run python scripts/race_limit.py
```

Expect **more than 5** created. (Delete that user's notes, or use a new email each run.)

### Build it: the fix

```python
# file: app/services/notes.py   (NoteRepo: add)
    def lock_owner(self) -> None:
        """Serialize writes for this user: other transactions wait here until we commit."""
        self.db.execute(select(User.id).where(User.id == self.owner_id).with_for_update())
```

Import `User` from `app.models`. Then call it first thing in `NoteService.create` (the full new `create` comes in section 6):

```python
        self.repo.lock_owner()                      # wait for other creates of THIS user
        if self.repo.count() >= self.max_notes:     # now nobody can insert between count and insert
            raise NoteLimitReached()
```

Rerun `race_limit.py` with a new email (sleep still in place): exactly **5 × 201** and **5 × 429**. Notice the run takes longer: the requests now wait in line, about 0.3 s each. Remove the sleep.

---

## 5. Upserts: get-or-create without a race

### Theory

<details>
<summary><b>1) The 500 you haven't hit yet</b></summary>

`get_or_create_tags` selects existing tags, then inserts missing ones. Two requests creating notes with a **brand-new** tag `trip` at the same moment: both see "no `trip`", both insert, the unique constraint rejects the second → `IntegrityError` → 500.

Locking the user row doesn't help: tags are shared between users.

</details>

<details>
<summary><b>2) <code>INSERT ... ON CONFLICT DO NOTHING</code></b></summary>

Let the database do "insert if missing" as **one atomic statement**:

```sql
INSERT INTO tags (name) VALUES ('trip'), ('work')
ON CONFLICT (name) DO NOTHING;           -- already exists? skip that row, no error
SELECT * FROM tags WHERE name IN ('trip', 'work');
```

If another transaction inserted `trip` but **hasn't committed** yet, our insert **waits** for it. If it commits, ours skips the row; if it rolls back, ours inserts. Either way there's no error, and the `SELECT` afterwards (a new statement under READ COMMITTED) sees the committed row.

"Upsert" = update-or-insert. `ON CONFLICT DO UPDATE SET ...` is the update version.

</details>

### Try it: reproduce

```python
# file: scripts/race_tags.py
"""10 users create a note with the same brand-new tag at the same moment."""
import asyncio
import uuid

import httpx

from race_common import BASE, token_for


async def main() -> None:
    tag = f"fresh-{uuid.uuid4().hex[:8]}"   # a tag that doesn't exist yet
    tokens = [token_for(f"tagger{i}@example.com") for i in range(10)]
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as c:
        rs = await asyncio.gather(*[
            c.post("/api/v1/notes", json={"title": "trip", "tags": [tag]},
                   headers={"Authorization": f"Bearer {t}"})
            for t in tokens
        ])
        print(sorted(r.status_code for r in rs))


asyncio.run(main())
```

Run it a few times. You'll likely see some `500`s (and `IntegrityError: duplicate key value violates unique constraint "tags_name_key"` in the server log). If you never do, add a `time.sleep(0.2)` between the select and `add_all` in `get_or_create_tags`.

### Build it: the fix

```python
# file: app/services/notes.py   (replace NoteRepo.get_or_create_tags; add the import)
from sqlalchemy.dialects.postgresql import insert as pg_insert   # at the top of the file
```

```python
# file: app/services/notes.py   (inside class NoteRepo: replace get_or_create_tags)
    def get_or_create_tags(self, names: list[str]) -> list[Tag]:
        if not names:
            return []
        # one atomic "insert the missing ones" statement; existing names are skipped, no error
        self.db.execute(
            pg_insert(Tag).values([{"name": n} for n in names]).on_conflict_do_nothing(index_elements=["name"])
        )
        return list(self.db.scalars(select(Tag).where(Tag.name.in_(names)).order_by(Tag.name)))
```

Rerun `race_tags.py`: all `201`.

---

## 6. Idempotency keys in the database

### Theory

<details>
<summary><b>1) What's wrong with the in-memory store from Session 2</b></summary>

1. **Per process:** with 2 server processes, a retry that lands on the other process doesn't find the key → duplicate note.
2. **Lost on restart.**
3. **Race:** two requests with the same key at the same moment both see "unknown key".

A table with a **unique key** on `(user_id, key)` fixes all three at once.

</details>

<details>
<summary><b>2) "Insert the key first" is the trick</b></summary>

Don't *check* whether the key exists; **try to insert it** at the start of the transaction:

```sql
INSERT INTO idempotency_keys (user_id, key, request_hash) VALUES (...)
ON CONFLICT (user_id, key) DO NOTHING
RETURNING key;
```

- Returns a row → we own this key. Create the note, store its id on the key row, commit **both together**.
- Returns nothing → the key already exists: load it, compare the hash, replay the stored note.

And the simultaneous case: request 2's insert finds request 1's **uncommitted** key row and **waits** (same behavior as the tags upsert). When request 1 commits (key + note together), request 2 continues, sees the conflict, reads the key row (which now has `note_id`) and replays. No duplicate, no error. If request 1 fails and rolls back, its key row disappears with it, and request 2 simply does the work.

</details>

<details>
<summary><b>3) Why the key and the note must commit together</b></summary>

If the key were committed first and the note later, a crash in between would leave a key pointing at nothing: every retry would be "replayed" with no note. Same transaction = both or neither. That's the general rule: **the idempotency record and the effect it protects commit atomically.**

</details>

<details>
<summary><b>4) Keys per user, and expiry</b></summary>

The primary key is `(user_id, key)`: Ravi using the same key string as Asha has no effect on her. Keys aren't needed forever; delete ones older than 24 hours with a scheduled job (practice task 3). Stripe, for example, documents a 24-hour window for its idempotency keys.

</details>

### Build it

```python
# file: app/models.py   (add)
class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    note_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("notes.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())
```

```powershell
uv run alembic revision --autogenerate -m "idempotency keys"
uv run alembic upgrade head
```

```python
# file: app/services/notes.py   (top of the file: add these imports)
from sqlalchemy import update

from app.errors import Conflict, Unprocessable
from app.idempotency import hash_request
from app.models import IdempotencyKey, Note, Tag, User
```

```python
# file: app/services/notes.py   (inside class NoteService: replace create)
    def create(self, data: NoteCreate, idem_key: str | None = None) -> tuple[Note, bool]:
        """Returns (note, replayed). Everything below is ONE transaction."""
        request_hash = hash_request(data.model_dump_json())

        if idem_key:
            # 1) claim the key. If another request holds it uncommitted, we WAIT here.
            claimed = self.db.execute(
                pg_insert(IdempotencyKey)
                .values(user_id=self.repo.owner_id, key=idem_key, request_hash=request_hash)
                .on_conflict_do_nothing(index_elements=["user_id", "key"])
                .returning(IdempotencyKey.key)
            ).first()
            if claimed is None:   # the key already existed (and is committed)
                record = self.db.get(IdempotencyKey, (self.repo.owner_id, idem_key))
                if record.request_hash != request_hash:
                    raise Unprocessable("Idempotency-Key was already used with a different request")
                if record.note_id is None:
                    raise Conflict("the note created with this key was deleted")
                return self.get(record.note_id), True   # replay

        # 2) the limit check, serialized per user (section 4)
        self.repo.lock_owner()
        if self.repo.count() >= self.max_notes:
            raise NoteLimitReached()   # rollback also removes our key claim: a later retry can succeed

        # 3) the actual work
        note = Note(title=data.title, body=data.body, pinned=data.pinned,
                    tags=self.repo.get_or_create_tags(data.tags))
        self.repo.add(note)
        self.db.flush()   # send the INSERT now so the key row can reference the note (foreign key)
        if idem_key:
            self.db.execute(
                update(IdempotencyKey)
                .where(IdempotencyKey.user_id == self.repo.owner_id, IdempotencyKey.key == idem_key)
                .values(note_id=note.id)
            )
        self.db.commit()   # key + note + tags: all or nothing
        return note, False
```

Now clean up the old in-memory store. In `app/idempotency.py`, keep only `hash_request` and delete `IdemRecord` and `InMemoryIdempotencyStore`. In `app/deps.py`, delete `_idem_store`, `get_idem_store` and `IdemStoreDep`.

```python
# file: app/routers/notes.py   (replace create_note; the upload route changes one line)
@router.post("", status_code=status.HTTP_201_CREATED)
def create_note(
    body: NoteCreate,
    response: Response,
    service: NoteServiceDep,
    idempotency_key: Annotated[str | None, Header(min_length=8, max_length=100)] = None,
) -> NoteOut:
    note, replayed = service.create(body, idempotency_key)
    if replayed:
        response.status_code = status.HTTP_200_OK
        response.headers["Idempotent-Replayed"] = "true"
    response.headers["Location"] = f"/api/v1/notes/{note.id}"
    response.headers["ETag"] = f'"{note.version}"'
    return NoteOut.model_validate(note)

# in upload_note:   note, _ = await run_in_threadpool(service.create, data)
```

The key no longer needs the `user.id:` prefix from Session 4: `user_id` is part of the primary key now.

### Try it: same key, same moment

```python
# file: scripts/race_idem.py
"""5 identical requests with the SAME Idempotency-Key at the same moment -> exactly one note."""
import asyncio
import uuid

import httpx

from race_common import BASE, token_for


async def main() -> None:
    h = {"Authorization": f"Bearer {token_for('idem@example.com')}", "Idempotency-Key": str(uuid.uuid4())}
    async with httpx.AsyncClient(base_url=BASE, headers=h, timeout=30) as c:
        rs = await asyncio.gather(*[c.post("/api/v1/notes", json={"title": "pay rent"}) for _ in range(5)])
        print(sorted(r.status_code for r in rs), "ids:", {r.json()["id"] for r in rs})


asyncio.run(main())
```

Expected: `[200, 200, 200, 200, 201]` and **one** id in the set. Now run the server with two processes (`uv run fastapi run app/main.py --workers 2`) and run it again: still one note. The Session 2 in-memory version couldn't do that.

---

## 7. Deadlocks

### Theory

<details>
<summary><b>1) What a deadlock is</b></summary>

Two transactions each hold a lock the other one needs:

```
T1: locks row A ... wants row B (held by T2) -> waits
T2: locks row B ... wants row A (held by T1) -> waits
```

Neither can ever continue. Postgres checks for this after `deadlock_timeout` (1 s by default), aborts one of them with `deadlock detected`, and the other proceeds.

</details>

<details>
<summary><b>2) How it would happen in NoteMind</b></summary>

Imagine a future "move a note from Asha to Ravi" feature that locks both users: request 1 moves Asha → Ravi (locks Asha, then Ravi), request 2 moves Ravi → Asha (locks Ravi, then Asha). If they overlap: deadlock.

Our `create` locks in a fixed order (idempotency key row, then the user row) for every request, so it can't deadlock with itself.

</details>

<details>
<summary><b>3) Prevention and handling</b></summary>

- **Lock in a consistent order** everywhere. For "move between two users", lock the two rows sorted by id, whatever the direction.
- Keep transactions short, so the window is small.
- Treat `deadlock detected` (and serialization failures) as **retryable**: roll back and retry the whole transaction a couple of times.

</details>

### Try it (optional, 10 minutes)

Open two `psql` sessions (`docker compose exec db psql -U notemind`) and run, step by step, alternating between them:

```sql
-- session 1                                   -- session 2
BEGIN;                                          BEGIN;
SELECT * FROM users WHERE email='asha@example.com' FOR UPDATE;
                                                SELECT * FROM users WHERE email='ravi@example.com' FOR UPDATE;
SELECT * FROM users WHERE email='ravi@example.com' FOR UPDATE;   -- waits...
                                                SELECT * FROM users WHERE email='asha@example.com' FOR UPDATE;
                                                -- ERROR: deadlock detected (after about 1 s)
```

Session 1 continues once session 2 is aborted. `ROLLBACK;` both.

---

## Practice tasks

1. Add `If-Match` support to `DELETE` too: deleting a note someone just changed should return 412.
2. Rewrite the note limit **without** `FOR UPDATE`: add a `note_count` column to `users` and use one atomic `UPDATE users SET note_count = note_count + 1 WHERE id = :me AND note_count < :max RETURNING note_count`. Remember to decrement on delete. Compare the two designs in `progress.md`.
3. Add a cleanup that deletes idempotency keys older than 24 hours, run at startup in `lifespan` (Session 6 shows a nicer place for periodic jobs).
4. Run `race_limit.py` with `--workers 4`. Does the fix still hold? Why? (Compare with Session 1, section 10.)
5. Try `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ` in two psql sessions and recreate the lost update with plain `UPDATE`s. What error does Postgres give the second writer? How would the app have to handle it?
6. Write down, for each of the four bugs, whether it would also affect an app with only **one** user (hint: two tabs).

## Interview questions

<details>
<summary><b>1) Optimistic vs pessimistic locking: when do you use each?</b></summary>

Optimistic: no locks while working; a version column (or ETag) is checked at write time, and a stale write fails (HTTP 412) so the client reloads. Best when conflicts are rare and when the "read → write" gap is human time (edit forms), since no transaction can stay open that long. Pessimistic: lock rows up front (`SELECT ... FOR UPDATE`) so concurrent transactions wait. Best for short, contended critical sections like enforcing a quota, stock, or balance. Keep locks short, never hold them across slow calls, and lock in a consistent order.

</details>

<details>
<summary><b>2) How do you prevent lost updates in a REST API?</b></summary>

Give each resource a version: return it as an `ETag`, require `If-Match` on updates (428 if missing), and make the update conditional on the version (`WHERE id = ? AND version = ?`). Zero affected rows means a stale write: 412. The client then fetches the latest version and lets the user reconcile, rather than retrying blindly.

</details>

<details>
<summary><b>3) Two requests both pass a limit check. What's happening, and what are your options?</b></summary>

Check-then-act under READ COMMITTED: each transaction counts only committed rows, so concurrent ones all see room. Options: lock a parent row with `FOR UPDATE` so checks run one at a time; use one atomic conditional statement (`UPDATE ... SET count = count + 1 WHERE count < max`); use a unique or exclusion constraint when the rule can be expressed as one; use SERIALIZABLE isolation with retries; or an advisory lock. An in-process lock doesn't work across processes.

</details>

<details>
<summary><b>4) How do you implement idempotency keys correctly with multiple servers?</b></summary>

Store keys in a shared database with a unique constraint on (client or user, key). At the start of the transaction, insert the key with `ON CONFLICT DO NOTHING`: if it's inserted you own it, otherwise load the existing record, compare the request hash (mismatch → reject) and return the stored result. Concurrent duplicates wait on the uncommitted unique entry and then see the result. Commit the key record and the effect in the same transaction, scope keys per client, and expire them after a TTL.

</details>

<details>
<summary><b>5) What is a deadlock and how do you avoid it?</b></summary>

Two transactions each hold a lock the other needs, so neither can proceed. The database detects it and aborts one. Avoid it by acquiring locks in a consistent global order (for example sorted by id), keeping transactions short, and touching fewer rows. Handle it by treating deadlock and serialization errors as retryable and retrying the whole transaction with a small backoff.

</details>

<details>
<summary><b>6) What does READ COMMITTED guarantee, and what doesn't it?</b></summary>

No dirty reads: you only see committed data, and each statement sees a snapshot as of its own start. It doesn't prevent lost updates, write skew, non-repeatable reads (the same SELECT twice can differ) or phantoms. Those need explicit locks, conditional writes, constraints, or a stricter isolation level with retries.

</details>

## Done when

- [ ] `lost_update.py` shows 200 then 412 with nothing lost, and I saw the silent loss when the check was removed.
- [ ] PATCH without `If-Match` returns 428; with a stale one, 412.
- [ ] `race_limit.py` creates more than 5 notes before the fix and exactly 5 after.
- [ ] `race_tags.py` gave 500s before the upsert and only 201s after.
- [ ] `race_idem.py` creates exactly one note, also with `--workers 2`.
- [ ] I reproduced a deadlock in two psql sessions (optional) and can explain lock ordering.
- [ ] I answered interview questions 1, 3 and 4 aloud without notes.

## Reading

- Postgres transaction isolation: https://www.postgresql.org/docs/current/transaction-iso.html
- Postgres explicit locking (`FOR UPDATE`, advisory locks, deadlocks): https://www.postgresql.org/docs/current/explicit-locking.html
- `INSERT ... ON CONFLICT`: https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT
- SQLAlchemy versioning (`version_id_col`): https://docs.sqlalchemy.org/en/20/orm/versioning.html
- SQLAlchemy PostgreSQL insert/upsert: https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#insert-on-conflict-upsert
- HTTP conditional requests (ETag, If-Match, 412, 428): https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests
- Stripe on idempotent requests: https://docs.stripe.com/api/idempotent_requests
- Martin Kleppmann, *Designing Data-Intensive Applications*, chapter 7 (Transactions)
