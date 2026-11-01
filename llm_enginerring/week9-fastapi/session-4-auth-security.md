# Session 4 - Users, login, JWT and "only my notes"

**What you build today:** NoteMind gets accounts. People register, log in, get a token, and from then on **every note belongs to someone**: you can only see, change or delete your own. You'll also break it first (read another user's note by guessing nothing more than its id) so you never forget why the fix matters.

New endpoints:

```
POST /api/v1/auth/register   -> create an account               (201)
POST /api/v1/auth/token      -> email + password -> access token (200 / 401)
GET  /api/v1/auth/me         -> who am I?                        (401 without a token)
all /api/v1/notes routes     -> now require a token and only touch YOUR notes
```

**Time:** about 8-10 hours.

**HLD notes to read alongside:**

- `A-Fundamentals\A6-API-Design.md`: the authentication / authorization part.
- `C-Caching\C2-Redis.md`: only the rate-limiting section (we build a simple in-memory version and discuss when Redis is needed).

Your security learning path (`ReactPersonal\Info\security-learning-path.md`) covers the browser side: where the frontend stores tokens, XSS and CSRF. This session is the server side.

## Topics

| # | Topic | After it you can |
|---|---|---|
| 1 | Authentication vs authorization | Name which one each bug breaks |
| 2 | Storing passwords | Hash with Argon2 and explain why hashing ≠ encryption |
| 3 | Users table + a migration with existing data | Add a NOT NULL column to a table that already has rows |
| 4 | Register and login | Avoid leaking which emails exist |
| 5 | JWT access tokens | Create and verify tokens, and know what a JWT does *not* protect |
| 6 | `get_current_user` | Protect routes with one dependency, return 401 correctly |
| 7 | Ownership and IDOR | Scope every query to the current user; 404 vs 403 |
| 8 | Login rate limiting | Slow down password guessing, and know the limits of in-memory limits |
| 9 | Security checklist | Go through the OWASP API Top 10 for NoteMind |

---

## 1. Authentication vs authorization

### Theory

<details>
<summary><b>1) Two different questions</b></summary>

| | Question | Fails with | NoteMind example |
|---|---|---|---|
| **Authentication** (authn) | *Who are you?* | **401 Unauthorized** | No token, expired token, wrong password |
| **Authorization** (authz) | *Are you allowed to do this?* | **403 Forbidden** (or 404, see section 7) | Ravi asks for Asha's note |

The names are confusing (401 says "Unauthorized" but means "unauthenticated"). Remember: 401 = "I don't know who you are", 403 = "I know who you are, and no".

</details>

<details>
<summary><b>2) Most real breaches are authorization bugs</b></summary>

Login is usually done with a library and works. The bugs are later: one endpoint forgets to check the owner, a list endpoint returns everyone's rows, an update endpoint lets you change `owner_id`. That's why "Broken Object Level Authorization" is **#1** in the OWASP API Security Top 10, and why section 7 is the most important part of this session.

</details>

---

## 2. Storing passwords

### Theory

<details>
<summary><b>1) Never store the password itself</b></summary>

If the database leaks (backup left public, SQL injection, a stolen laptop), stored passwords are used immediately, and on other sites too, since people reuse passwords. So we store a **hash**: a one-way fingerprint.

```
"hunter2-secret"  --hash-->  "$argon2id$v=19$m=65536,t=3,p=4$c2FsdA$Rk9P..."
```

On login, hash what the user typed and compare. You can check a password without being able to recover it.

</details>

<details>
<summary><b>2) Hashing vs encryption</b></summary>

- **Encryption** is reversible with a key. If the key leaks with the data, all passwords leak. Wrong tool for passwords.
- **Hashing** is one-way. There's no key that turns it back.

</details>

<details>
<summary><b>3) Why not SHA-256? Slow on purpose, and salted</b></summary>

SHA-256 is designed to be **fast**: a GPU computes billions per second, so an attacker with your leaked hashes can try every common password quickly. Password hashes like **Argon2** are designed to be **slow and memory-hungry** (tens of milliseconds and many MB per guess), which makes guessing millions of times too expensive.

A **salt** (random bytes, different per user, stored inside the hash string) makes two users with the same password get different hashes, so one precomputed table can't crack everyone at once. Argon2 adds the salt automatically. The string `$argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>` contains the algorithm, its cost settings, the salt and the hash, so verification knows exactly how to recompute it.

</details>

<details>
<summary><b>4) The library: pwdlib</b></summary>

FastAPI's current docs use `pwdlib` with Argon2:

```python
from pwdlib import PasswordHash
password_hash = PasswordHash.recommended()          # Argon2 with sensible settings
h = password_hash.hash("hunter2-secret")
password_hash.verify("hunter2-secret", h)            # True
password_hash.verify("wrong", h)                     # False
```

Never write your own hashing.

</details>

### Build it

```powershell
uv add pyjwt "pwdlib[argon2]"
```

```python
# file: app/security.py
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from pwdlib import PasswordHash

from app.config import Settings

_password_hash = PasswordHash.recommended()

# A real hash of a random string, used when the email doesn't exist (section 4, dropdown 2).
_DUMMY_HASH = _password_hash.hash("not-a-real-password-just-for-timing")


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, hashed: str | None) -> bool:
    """True only for a correct password. A missing or malformed hash is just 'no', never a crash."""
    try:
        return _password_hash.verify(password, hashed or _DUMMY_HASH)
    except Exception:
        return False
```

The JWT functions are added to this file in section 5.

---

## 3. A users table, and a migration that has to deal with existing data

### Theory

<details>
<summary><b>1) The new columns</b></summary>

```
users:  id (uuid) | email (unique, lowercase) | password_hash | created_at
notes:  + owner_id (uuid, NOT NULL, FK -> users.id, ON DELETE CASCADE)
```

Emails are stored **lowercased**, so `Ravi@x.com` and `ravi@x.com` are the same account. The unique constraint makes the database itself reject duplicates, even if two sign-ups race.

</details>

<details>
<summary><b>2) The problem: <code>NOT NULL</code> on a table that already has rows</b></summary>

You already have notes in the database, without an owner. A migration that says "add `owner_id` NOT NULL" fails: the existing rows would have to be NULL, which NOT NULL forbids. Production databases always have existing rows, so this is a real-world skill. Three steps:

1. Add the column as **nullable**.
2. **Backfill**: give every existing row a value.
3. Make it **NOT NULL** (and add the foreign key).

Here we give old notes to a placeholder `legacy@notemind.local` user. In a real product you'd decide per case (assign to an admin, or delete test data).

</details>

<details>
<summary><b>3) Why autogenerate can't do this for you</b></summary>

Autogenerate sees "the model says NOT NULL" and writes `add_column(..., nullable=False)`. It knows nothing about your data. You edit the migration by hand. This is the "autogenerate is a draft" lesson from Session 3, for real this time.

</details>

<details>
<summary><b>4) The index changes too</b></summary>

Every list query will now be `WHERE owner_id = :me ORDER BY pinned DESC, updated_at DESC`. The old index `(pinned, updated_at)` can't find "my" rows quickly. The leftmost-prefix rule says we need `owner_id` **first**: `(owner_id, pinned, updated_at)`. We replace the old index.

</details>

### Build it

```python
# file: app/models.py   (add the User class above Note; add owner_id to Note; replace Note.__table_args__)
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True)   # always stored lowercase
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


# inside class Note:
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    __table_args__ = (Index("ix_notes_owner_pinned_updated", "owner_id", "pinned", "updated_at"),)
```

```powershell
uv run alembic revision --autogenerate -m "users and note owners"
```

Open the file. Autogenerate produced roughly: create `users`, add `owner_id` NOT NULL, create a foreign key, drop the old index, create the new one. **Rewrite `upgrade()`** like this (keep the `revision` lines at the top as generated):

```python
# file: alembic/versions/xxxx_users_and_note_owners.py   (replace upgrade and downgrade)
import uuid

import sqlalchemy as sa
from alembic import op


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Step 1: nullable first, because existing notes have no owner yet
    op.add_column("notes", sa.Column("owner_id", sa.Uuid(), nullable=True))

    # Step 2: backfill. '!' is not a valid hash, so nobody can ever log in as this user.
    legacy_id = uuid.uuid4()
    op.execute(
        sa.text("INSERT INTO users (id, email, password_hash) VALUES (:id, 'legacy@notemind.local', '!')")
        .bindparams(id=legacy_id)
    )
    op.execute(sa.text("UPDATE notes SET owner_id = :id WHERE owner_id IS NULL").bindparams(id=legacy_id))

    # Step 3: now it is safe to require it
    op.alter_column("notes", "owner_id", nullable=False)
    op.create_foreign_key("fk_notes_owner_id_users", "notes", "users", ["owner_id"], ["id"], ondelete="CASCADE")

    op.drop_index("ix_notes_pinned_updated", table_name="notes")
    op.create_index("ix_notes_owner_pinned_updated", "notes", ["owner_id", "pinned", "updated_at"])


def downgrade() -> None:
    op.drop_index("ix_notes_owner_pinned_updated", table_name="notes")
    op.create_index("ix_notes_pinned_updated", "notes", ["pinned", "updated_at"])
    op.drop_constraint("fk_notes_owner_id_users", "notes", type_="foreignkey")
    op.drop_column("notes", "owner_id")
    op.drop_table("users")
```

```powershell
uv run alembic upgrade head
docker compose exec db psql -U notemind -c "\d notes"
docker compose exec db psql -U notemind -c "select email from users; select count(*) from notes where owner_id is null;"
```

The `count` should be 0 and `owner_id` should show `not null`.

Note that `verify_password` treats `'!'` as "no" instead of crashing. That's why it catches the exception.

---

## 4. Register and login

### Theory

<details>
<summary><b>1) Password rules: length beats complexity</b></summary>

Current guidance (NIST SP 800-63B): require a **minimum length** (we use 12), allow long passphrases (we cap at 128 only to stop huge inputs), and **don't** force "one uppercase, one symbol" rules. Those make people write `Password1!`. Optional extra: reject passwords found in breach lists.

</details>

<details>
<summary><b>2) User enumeration: don't reveal which emails exist</b></summary>

Two ways a login endpoint leaks "this email has an account":

1. **Different messages:** "no such user" vs "wrong password". Fix: one message, `invalid email or password`.
2. **Different timing:** if the email doesn't exist you return instantly, but for a real email you spend ~50 ms hashing. An attacker measures the difference. Fix: when the user doesn't exist, **still verify against a dummy hash**, so both paths take the same time.

```python
user = find_user(email)
ok = verify_password(password, user.password_hash if user else None)   # None -> dummy hash
if not user or not ok:
    raise Unauthorized("invalid email or password")
```

Registration has the same problem ("email already registered" reveals it). Many products accept that trade-off for a better sign-up experience; the strict alternative is "check your inbox" for every sign-up. We return 409 and note the trade-off.

</details>

<details>
<summary><b>3) Why login uses form data: <code>OAuth2PasswordRequestForm</code></b></summary>

The OAuth2 "password flow" says the token endpoint receives **form fields** `username` and `password`. FastAPI's `OAuth2PasswordRequestForm` reads exactly that. The payoff: the **Authorize** button in `/docs` works, and you can test protected routes from the browser. We treat `username` as the email.

</details>

<details>
<summary><b>4) The race in "check if email exists, then insert"</b></summary>

Two sign-ups with the same email at the same moment both pass "email not taken?". We don't fight that in Python: the **unique constraint** rejects the second insert, and we turn that `IntegrityError` into a 409. Let the database enforce uniqueness; it's the only place that sees every request.

</details>

### Build it

Add an `Unauthorized` error:

```python
# file: app/errors.py   (add)
class Unauthorized(AppError):
    status_code, title = 401, "Unauthorized"

    def __init__(self, detail: str = "not authenticated") -> None:
        # WWW-Authenticate tells the client which auth scheme to use (required by the HTTP spec for 401)
        super().__init__(detail, headers={"WWW-Authenticate": "Bearer"})
```

```python
# file: app/schemas.py   (add)
from pydantic import EmailStr


class RegisterIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr                                         # validated by email-validator
    password: str = Field(min_length=12, max_length=128)    # length over complexity


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    created_at: datetime                                    # no password_hash, ever


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int                                         # seconds
```

```python
# file: app/services/users.py
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import Conflict, Unauthorized
from app.models import User
from app.security import hash_password, verify_password


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def register(self, email: str, password: str) -> User:
        user = User(email=email.lower(), password_hash=hash_password(password))
        self.db.add(user)
        try:
            self.db.commit()
        except IntegrityError:
            # the unique constraint caught a duplicate, even one created a millisecond ago
            self.db.rollback()
            raise Conflict("an account with this email already exists") from None
        return user

    def authenticate(self, email: str, password: str) -> User:
        user = self.db.scalar(select(User).where(User.email == email.lower()))
        # always run a hash check, so "no such user" takes as long as "wrong password"
        ok = verify_password(password, user.password_hash if user else None)
        if user is None or not ok:
            raise Unauthorized("invalid email or password")   # same message for both cases
        return user
```

---

## 5. JWT access tokens

### Theory

<details>
<summary><b>1) Why a token at all</b></summary>

HTTP doesn't remember anything between requests. After login, the client needs proof on **every** request that it's Asha. Sending her password every time would be terrible. Instead, login returns a **token**, and the client sends it in a header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

</details>

<details>
<summary><b>2) What's inside a JWT</b></summary>

A JWT is three base64url parts joined by dots: `header.payload.signature`.

```
header:   {"alg": "HS256", "typ": "JWT"}
payload:  {"sub": "6f1c...user-id", "iat": 1730000000, "exp": 1730001800,
           "iss": "notemind-api", "aud": "notemind-web"}
signature: HMAC-SHA256(header + "." + payload, SECRET)
```

| Claim | Meaning |
|---|---|
| `sub` | subject: **who** this token is for (the user id) |
| `iat` | issued at |
| `exp` | expires at: after this, reject it |
| `iss` | issuer: who created it (us) |
| `aud` | audience: who it's meant for (our web app) |

Paste any JWT into jwt.io: you can **read** the payload. It's encoded, **not encrypted**. Never put secrets or personal data in it.

</details>

<details>
<summary><b>3) How the signature makes it trustworthy</b></summary>

The server signs `header.payload` with a secret only the server knows. When a token comes back, the server recomputes the signature. If someone changed `sub` to another user's id, the signature no longer matches and the token is rejected. Because of that, the server doesn't need to look the token up anywhere: the signature itself is the proof. That's what "stateless" means.

So the secret must be **long, random and secret**: anyone who has it can create tokens for any user.

</details>

<details>
<summary><b>4) The verification checklist (and the famous mistakes)</b></summary>

```python
jwt.decode(token, SECRET, algorithms=["HS256"], audience="notemind-web", issuer="notemind-api",
           options={"require": ["exp", "iat", "sub"]})
```

- `algorithms=["HS256"]`: **always pin the algorithm**. Old libraries accepted `"alg": "none"` (no signature at all!) or let attackers switch algorithms. PyJWT requires this list for that reason.
- `exp` is checked automatically: expired → `ExpiredSignatureError`.
- `audience`/`issuer`: reject tokens made for another app that happens to share a secret.
- `require`: a token missing `exp` would otherwise be valid forever.

All failures raise subclasses of `jwt.InvalidTokenError`, and we map all of them to 401.

</details>

<details>
<summary><b>5) The downside of stateless tokens: you can't easily take them back</b></summary>

Since the server doesn't store tokens, "log out" can't make an existing token invalid. The client just forgets it. If a token is stolen, it works until `exp`. That's why **access tokens are short-lived** (we use 30 minutes).

Real apps add a long-lived **refresh token** (stored server-side, so it *can* be revoked) to get new access tokens without logging in again. We skip refresh tokens to keep the session focused; they're practice task 4. When you use a hosted auth service (Supabase Auth, Auth0, Clerk), it handles this for you, and your API only **verifies** its tokens (dropdown 6).

</details>

<details>
<summary><b>6) If you later use Supabase Auth (or Auth0, Clerk...)</b></summary>

Then you don't create tokens at all: the auth provider does. Your API only verifies them, usually with the provider's **public key** (algorithm RS256 or ES256) fetched from a JWKS URL:

```python
jwks = jwt.PyJWKClient("https://<project>.supabase.co/auth/v1/.well-known/jwks.json")
key = jwks.get_signing_key_from_jwt(token).key
payload = jwt.decode(token, key, algorithms=["RS256", "ES256"], audience="authenticated")
```

The `get_current_user` dependency (next section) keeps exactly the same shape. Only the decode line changes.

</details>

### Build it

Settings: a secret that **must** be provided (no default) and must be long:

```python
# file: app/config.py   (add to Settings; add field_validator to the pydantic import)
    jwt_secret: SecretStr                  # no default: the app won't start without it
    jwt_issuer: str = "notemind-api"
    jwt_audience: str = "notemind-web"
    access_token_minutes: int = Field(default=30, ge=1, le=24 * 60)

    @field_validator("jwt_secret")
    @classmethod
    def secret_long_enough(cls, v: SecretStr) -> SecretStr:
        if len(v.get_secret_value()) < 32:
            raise ValueError("jwt_secret must be at least 32 characters")
        return v
```

Generate one and put it in `.env` (and a placeholder in `.env.example`):

```powershell
uv run python -c "import secrets; print(secrets.token_urlsafe(48))"
# .env:  NOTEMIND_JWT_SECRET=<paste the output>
```

```python
# file: app/security.py   (add)
def create_access_token(user_id: UUID, settings: Settings) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_minutes),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm="HS256")


def decode_access_token(token: str, settings: Settings) -> UUID:
    """Return the user id, or raise jwt.InvalidTokenError / ValueError for any bad token."""
    payload = jwt.decode(
        token,
        settings.jwt_secret.get_secret_value(),
        algorithms=["HS256"],                       # pinned: never trust the token's own "alg"
        audience=settings.jwt_audience,
        issuer=settings.jwt_issuer,
        options={"require": ["exp", "iat", "sub"]},
    )
    return UUID(payload["sub"])                     # ValueError if sub isn't a UUID
```

---

## 6. `get_current_user`: one dependency protects everything

### Theory

<details>
<summary><b>1) How the dependency chain works</b></summary>

```python
def list_notes(user: CurrentUserDep, ...):
```

For this route, FastAPI now runs:

```
OAuth2PasswordBearer   -> reads "Authorization: Bearer <token>"; missing -> 401 immediately
decode_access_token    -> bad signature / expired / wrong audience -> 401
db.get(User, id)       -> user deleted since the token was issued -> 401
-> route runs with `user` = the real User row
```

One parameter in the signature, and the route can't run without a valid user. Forgetting it is the only way to leave a route open, and section 9 shows how to check for that.

</details>

<details>
<summary><b>2) Why check the database even though the token is signed?</b></summary>

The signature proves the token was valid **when issued**. The user may have been deleted or banned since. One primary-key lookup per request is cheap (and Session 5 needs the `User` row anyway). Pure stateless verification is faster, but then "deleted user keeps access until `exp`" is something you have to accept.

</details>

<details>
<summary><b>3) The 401 response: <code>WWW-Authenticate</code></b></summary>

The HTTP spec says a 401 must include `WWW-Authenticate`, telling the client which scheme to use (`Bearer`). Our `Unauthorized` error adds it, and `OAuth2PasswordBearer`'s own 401 (missing header) includes it too. It flows through our Starlette handler, which keeps `exc.headers`.

</details>

### Build it

```python
# file: app/deps.py   (add)
import jwt
from fastapi.security import OAuth2PasswordBearer

from app.errors import Unauthorized
from app.models import User
from app.security import decode_access_token
from app.services.users import UserService

# tokenUrl tells /docs where to log in; the scheme itself reads the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)], db: DbDep, settings: SettingsDep
) -> User:
    try:
        user_id = decode_access_token(token, settings)
    except (jwt.InvalidTokenError, ValueError):
        raise Unauthorized("invalid or expired token") from None
    user = db.get(User, user_id)
    if user is None:
        raise Unauthorized("invalid or expired token")   # same message: don't explain why
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def get_user_service(db: DbDep) -> UserService:
    return UserService(db)


UserServiceDep = Annotated[UserService, Depends(get_user_service)]
```

```python
# file: app/routers/auth.py
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.deps import CurrentUserDep, SettingsDep, UserServiceDep
from app.schemas import RegisterIn, TokenOut, UserOut
from app.security import create_access_token

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, users: UserServiceDep) -> UserOut:
    return UserOut.model_validate(users.register(body.email, body.password))


@router.post("/token")
def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],   # form fields: username, password
    users: UserServiceDep,
    settings: SettingsDep,
) -> TokenOut:
    user = users.authenticate(form.username, form.password)
    return TokenOut(
        access_token=create_access_token(user.id, settings),
        expires_in=settings.access_token_minutes * 60,
    )


@router.get("/me")
def me(user: CurrentUserDep) -> UserOut:
    return UserOut.model_validate(user)
```

Register the router in `create_app()`: `app.include_router(auth.router)` (and import `auth` next to `notes`).

### Run it

```powershell
'{"email": "asha@example.com", "password": "correct horse battery"}' | Set-Content asha.json
curl.exe -i -H "Content-Type: application/json" -d "@asha.json" http://127.0.0.1:8000/api/v1/auth/register
curl.exe -s -d "username=asha@example.com&password=correct horse battery" http://127.0.0.1:8000/api/v1/auth/token
```

Copy the `access_token`. Then:

```powershell
$t = "<paste token>"
curl.exe -i -H "Authorization: Bearer $t" http://127.0.0.1:8000/api/v1/auth/me
curl.exe -i http://127.0.0.1:8000/api/v1/auth/me
```

200 with Asha's user, then 401 with `www-authenticate: Bearer`. Also try `/docs` → **Authorize** → log in → call `/me` from the browser.

### Try it

1. Paste the token into jwt.io and read the payload. Change one character in the middle of the token and call `/me`: 401.
2. Set `NOTEMIND_ACCESS_TOKEN_MINUTES=1`, restart, log in, wait 70 seconds, call `/me`: 401 (expired). Set it back.
3. Log in with a wrong password, then with an unknown email: same 401 message. (Measuring timing reliably is hard on a laptop; the dummy hash is what makes them equal.)
4. Register `ASHA@example.com`: 409 (lowercasing + unique constraint).

---

## 7. Ownership: "only my notes" (and the IDOR bug)

### Theory

<details>
<summary><b>1) IDOR: Insecure Direct Object Reference</b></summary>

The API takes an id from the client (`/notes/{note_id}`) and loads that object **without checking who owns it**. Then any logged-in user can read anyone's note, as long as they have the id: from a shared link, a log, a browser history, or by guessing.

"But our ids are random UUIDs, nobody can guess them." Ids leak all the time (URLs in screenshots, referrer headers, logs, support tickets). Random ids make attacks harder, but they're **not** authorization. Every lookup must check ownership.

</details>

<details>
<summary><b>2) The fix: put the owner in every query</b></summary>

Don't "load it, then check the owner in Python". Put the owner **in the query**:

```python
select(Note).where(Note.id == note_id, Note.owner_id == current_user.id)
```

Then a forgotten `if` can't leak anything: the row simply isn't found. Do the same for list, count, update and delete. The cleanest design: the service is **created for one user**, so every method is automatically scoped:

```python
NoteService(db, owner_id=current_user.id, max_notes=...)
```

</details>

<details>
<summary><b>3) 404 or 403 for someone else's note?</b></summary>

403 says "this note exists, but it's not yours", which confirms the id is real. 404 says "no such note **for you**". For private user data, return **404**: it leaks nothing, and it's exactly what the scoped query does naturally. Use 403 when the resource is known to exist anyway (for example "you're a viewer, not an editor, on this shared note").

</details>

<details>
<summary><b>4) Never take the owner from the request body</b></summary>

`NoteCreate` has no `owner_id` field, and `extra="forbid"` rejects it if sent. The owner always comes from the **token** (`current_user.id`). This is the mass-assignment lesson from Session 1, now with real consequences: if a client could send `owner_id`, they could create notes in someone else's account.

</details>

### Try it first: reproduce the bug

Before fixing anything, make the notes routes require login but **keep the service unscoped**. Add `user: CurrentUserDep` to `create_note`, set `owner_id=user.id` when creating (temporarily pass it through), and leave `get` as `db.get(Note, note_id)`. Then:

1. Register Ravi (`ravi@example.com`), log in as both Asha and Ravi.
2. Asha creates a note. Copy its id.
3. Ravi calls `GET /api/v1/notes/<asha's id>` with **his** token: **200, Asha's note**. That's IDOR.

### Build it: scope everything to the owner

```python
# file: app/services/notes.py   (replace NoteRepo and NoteService; the error classes stay)
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.errors import NotFound, TooManyRequests
from app.models import Note, Tag
from app.schemas import NoteCreate


class NoteRepo:
    """Every query is filtered by owner_id. There is no method that can see other users' notes."""

    def __init__(self, db: Session, owner_id: UUID) -> None:
        self.db = db
        self.owner_id = owner_id

    def _mine(self):
        return select(Note).where(Note.owner_id == self.owner_id)

    def get(self, note_id: UUID) -> Note | None:
        return self.db.scalar(self._mine().where(Note.id == note_id))

    def count(self) -> int:
        return self.db.scalar(select(func.count()).select_from(Note).where(Note.owner_id == self.owner_id)) or 0

    def list(self, limit: int, offset: int, tag: str | None) -> list[Note]:
        stmt = (
            self._mine()
            .options(selectinload(Note.tags))
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
        self.db.add_all(new)
        return sorted([*existing.values(), *new], key=lambda t: t.name)

    def add(self, note: Note) -> None:
        note.owner_id = self.owner_id   # the owner ALWAYS comes from here, never from the client
        self.db.add(note)

    def delete(self, note: Note) -> None:
        self.db.delete(note)


class NoteService:
    def __init__(self, db: Session, owner_id: UUID, max_notes: int) -> None:
        self.db = db
        self.repo = NoteRepo(db, owner_id)
        self.max_notes = max_notes

    # create, get, list, update, delete: exactly as in Session 3 (they call self.repo)
```

Keep the five methods from Session 3 unchanged. They already go through `self.repo`, which is now scoped. That's the layering payoff again.

Move `get_note_service` and `NoteServiceDep` **below** `CurrentUserDep` in `deps.py`: Python evaluates `Annotated[...]` when the function is defined, so a name used in a signature must already exist.

```python
# file: app/deps.py   (replace get_note_service, placed after CurrentUserDep)
def get_note_service(db: DbDep, settings: SettingsDep, user: CurrentUserDep) -> NoteService:
    # The service is built FOR this user. Every route using NoteServiceDep now requires a token.
    return NoteService(db, user.id, settings.max_notes)
```

Because every notes route depends on `NoteServiceDep`, and `NoteServiceDep` now depends on `CurrentUserDep`, **all notes routes require login** with no change in the router. `max_notes` is now **per user**.

Idempotency keys must be per user too, otherwise Ravi could replay Asha's key and get her note. In `create_note`, prefix the key with the user id before using the store:

```python
# file: app/routers/notes.py   (create_note: add `user: CurrentUserDep` to the parameters, then)
    key = f"{user.id}:{idempotency_key}" if idempotency_key else None
    # ...and use `key` instead of `idempotency_key` in idem.find / idem.save
```

### Run it

Repeat the IDOR steps: Ravi now gets **404**. Ravi's `GET /api/v1/notes` shows only his notes. Asha's upload, patch and delete only work on her notes. The legacy notes from before belong to `legacy@notemind.local`, so nobody sees them anymore.

---

## 8. Slowing down password guessing

### Theory

<details>
<summary><b>1) Why the login endpoint needs a limit</b></summary>

Without one, an attacker can try thousands of passwords per minute against one account (brute force), or one common password against thousands of accounts (credential stuffing with leaked lists). Argon2 already makes each guess slower, but a limit stops it early.

</details>

<details>
<summary><b>2) A sliding-window counter</b></summary>

Keep, per **email**, the timestamps of recent failed attempts. On each attempt, drop timestamps older than the window (60 s); if 5 or more remain, reject with **429** and a `Retry-After` header saying how many seconds to wait.

```
attempts for asha@...: [10:00:01, 10:00:03, 10:00:04, 10:00:09, 10:00:15]
at 10:00:20 -> 5 in the last 60 s -> 429, Retry-After: 41
```

We count **failures only**, keyed by email, so a successful login isn't punished. Real systems also limit per IP address.

</details>

<details>
<summary><b>3) The honest limitation: in-memory = per process</b></summary>

Like the Session 1 lock: with 4 processes, an attacker gets 4× the attempts, and a restart resets everything. Production uses a shared store, usually **Redis** with an atomic increment + expiry (`INCR` + `EXPIRE`, see `C2-Redis.md`), or an edge rate limit at the proxy/CDN. For NoteMind on one instance, in-memory is a reasonable first step, as long as you know the limit.

</details>

<details>
<summary><b>4) Don't lock the account itself</b></summary>

"5 wrong passwords = account locked for a day" lets an attacker lock **anyone** out just by knowing their email. Temporary throttling (wait 60 s) protects the account without handing attackers that power.

</details>

### Build it

```python
# file: app/ratelimit.py
import threading
import time
from collections import defaultdict, deque

from app.errors import TooManyRequests


class LoginThrottle:
    """Max `limit` FAILED logins per key per `window` seconds. In-memory: one process only."""

    def __init__(self, limit: int = 5, window: float = 60.0) -> None:
        self.limit = limit
        self.window = window
        self._failures: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str) -> None:
        now = time.monotonic()   # monotonic: never jumps when the system clock changes
        with self._lock:
            q = self._failures[key]
            while q and q[0] <= now - self.window:   # drop attempts outside the window
                q.popleft()
            if len(q) >= self.limit:
                retry_after = int(q[0] + self.window - now) + 1
                raise TooManyRequests("too many failed logins, try again later",
                                      headers={"Retry-After": str(retry_after)})

    def record_failure(self, key: str) -> None:
        with self._lock:
            self._failures[key].append(time.monotonic())

    def reset(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)
```

```python
# file: app/deps.py   (add)
from app.ratelimit import LoginThrottle

_login_throttle = LoginThrottle()


def get_login_throttle() -> LoginThrottle:
    return _login_throttle


LoginThrottleDep = Annotated[LoginThrottle, Depends(get_login_throttle)]
```

```python
# file: app/routers/auth.py   (replace login; import LoginThrottleDep and Unauthorized)
@router.post("/token")
def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    users: UserServiceDep,
    settings: SettingsDep,
    throttle: LoginThrottleDep,
) -> TokenOut:
    key = form.username.lower()
    throttle.check(key)                 # 429 before we even look at the password
    try:
        user = users.authenticate(form.username, form.password)
    except Unauthorized:
        throttle.record_failure(key)
        raise
    throttle.reset(key)
    return TokenOut(access_token=create_access_token(user.id, settings),
                    expires_in=settings.access_token_minutes * 60)
```

### Try it

Fail 5 logins for `asha@example.com`, then try the **correct** password: 429 with `Retry-After`. Wait that long, log in correctly: 200.

---

## 9. Security checklist: OWASP API Top 10, applied to NoteMind

### Theory

<details>
<summary><b>1) The list, and where NoteMind stands</b></summary>

| OWASP API risk (2023) | What it means | NoteMind |
|---|---|---|
| API1 Broken Object Level Authorization | IDOR | Every query scoped by `owner_id` (section 7) |
| API2 Broken Authentication | Weak login/tokens | Argon2, pinned-algorithm JWT, short expiry, throttling |
| API3 Broken Object Property Level Authorization | Reading/setting fields you shouldn't | Separate in/out models, `extra="forbid"`, no `owner_id` in input |
| API4 Unrestricted Resource Consumption | No limits | Max lengths, page size cap, upload size, note limit. **Session 6 adds AI quotas: AI calls cost money** |
| API5 Broken Function Level Authorization | Admin routes open to users | No admin routes yet. If added: a separate `require_admin` dependency |
| API6 Unrestricted Access to Sensitive Business Flows | Automation abuse | Login throttle; AI quota in Session 6 |
| API7 Server-Side Request Forgery | Server fetches attacker-chosen URLs | We don't fetch user URLs. If you add "import note from URL", this becomes critical |
| API8 Security Misconfiguration | Defaults, verbose errors, CORS `*` | Clean 500s, exact CORS origins, no secrets in code |
| API9 Improper Inventory Management | Forgotten old endpoints | `/api/v1` prefix, `/docs` lists everything; remove demo routes |
| API10 Unsafe Consumption of APIs | Trusting third-party responses | Session 6: treat AI output as untrusted text |

</details>

<details>
<summary><b>2) How to find routes that forgot authentication</b></summary>

List every route and check which ones depend on `get_current_user`. A small script beats memory:

```python
# scripts/list_routes.py
from fastapi.routing import APIRoute
from app.main import app

for r in app.routes:
    if isinstance(r, APIRoute):
        print(sorted(r.methods), r.path)
```

Then decide, per route, whether it should be public. Session 7 turns this into a test: "every `/api/v1/notes` route returns 401 without a token".

</details>

<details>
<summary><b>3) Where the frontend should keep the token (short version)</b></summary>

- **In memory** (a React state or context): safest against XSS; lost on page reload, so you need a refresh mechanism.
- **`localStorage`**: survives reloads, but any XSS on your site can read it and send it away.
- **httpOnly cookie**: JavaScript can't read it at all (strong against XSS), but then you must defend against CSRF (SameSite cookies, CSRF tokens) and CORS needs `allow_credentials=True` with exact origins.

Your security learning path goes into this properly. For NoteMind's first version, a bearer token held in memory by the Next.js app is fine.

</details>

---

## Practice tasks

1. Add `DELETE /api/v1/auth/me` that deletes the account. What happens to the user's notes (look at `ondelete="CASCADE"`)? What happens to an access token issued before deletion?
2. Add `POST /api/v1/auth/password` (current password + new password). Require the current password even though the user is logged in. Why?
3. Make the login throttle also limit per client IP (`request.client.host`). Discuss: what does the IP look like behind a proxy? (Session 8, `--proxy-headers`.)
4. Design refresh tokens on paper: a `refresh_tokens` table (hashed token, user id, expires, revoked), rotation on every use, and what "log out everywhere" does. Implement it if you have time.
5. Write `scripts/list_routes.py` and mark each route public or protected. Make sure `/health` is public and everything under `/api/v1/notes` is protected.
6. At work: find how your office services authenticate requests (gateway? JWT? session cookie?) and where the "owner check" happens for one endpoint.

## Interview questions

<details>
<summary><b>1) Authentication vs authorization, and which status codes?</b></summary>

Authentication answers "who are you?" and fails with 401 (with a `WWW-Authenticate` header). Authorization answers "may you do this?" and fails with 403, or 404 when revealing that the resource exists would itself leak information. Most real API breaches are authorization bugs, especially object-level ones (IDOR).

</details>

<details>
<summary><b>2) How do you store passwords?</b></summary>

Never in plain text and never encrypted. Hash them with a slow, memory-hard, salted algorithm built for passwords (Argon2id, or bcrypt/scrypt), through a maintained library. The salt is per user and stored in the hash string. Verify by recomputing. Require a minimum length rather than complexity rules, and make login responses identical (message and timing) whether or not the account exists.

</details>

<details>
<summary><b>3) How does a JWT work, and what are its pitfalls?</b></summary>

Header, payload (claims like `sub`, `exp`, `iss`, `aud`) and a signature over both. The server verifies the signature with its key, so it can trust the claims without a lookup. Pitfalls: the payload is readable (no secrets in it); you must pin the algorithm and check `exp`, `aud` and `iss`; a weak or leaked secret lets anyone mint tokens; and tokens can't be revoked before `exp`, so keep access tokens short-lived and use revocable refresh tokens.

</details>

<details>
<summary><b>4) What is IDOR and how do you prevent it systematically?</b></summary>

Insecure direct object reference: the API loads an object by a client-supplied id without checking that the caller may access it. Prevent it structurally: scope every query by the owner (or tenant) inside the repository, take the owner from the authenticated identity and never from the request, return 404 for objects that aren't yours, and add tests where user B tries user A's ids. Random ids help but aren't authorization.

</details>

<details>
<summary><b>5) How do you add a NOT NULL column to a large table that already has data?</b></summary>

In steps: add the column as nullable, backfill existing rows (in batches on big tables), then add the NOT NULL constraint and foreign key. With zero-downtime deploys, the application code is changed around it too ("expand and contract": deploy code that writes the new column, backfill, then enforce and remove old paths). Autogenerate can't do this; write the migration by hand.

</details>

<details>
<summary><b>6) How would you rate limit login attempts across several servers?</b></summary>

Use a shared store: Redis with an atomic increment plus expiry per key (email and IP), or a sliding-window algorithm in Redis, or the rate limiting of an API gateway/CDN. Return 429 with `Retry-After`. Count failures rather than all attempts, throttle temporarily instead of locking accounts (which would let attackers lock anyone out), and add CAPTCHA or other step-up checks for suspicious patterns.

</details>

## Done when

- [ ] I can register, log in (also via `/docs` → Authorize) and call `/me`; without a token I get 401 with `WWW-Authenticate: Bearer`.
- [ ] Passwords are stored as Argon2 hashes, and wrong-password and unknown-email logins look the same.
- [ ] I wrote the three-step `owner_id` migration by hand, and existing notes got the legacy owner.
- [ ] I reproduced IDOR (Ravi read Asha's note) and fixed it so Ravi gets 404, with the owner filter inside the repository.
- [ ] A tampered or expired token gets 401.
- [ ] 5 failed logins give 429 with `Retry-After`.
- [ ] I went through the OWASP table and can say where NoteMind is covered and where it isn't.
- [ ] I answered interview questions 3 and 4 aloud without notes.

## Reading

- FastAPI security tutorial (OAuth2 + JWT): https://fastapi.tiangolo.com/tutorial/security/
- PyJWT usage: https://pyjwt.readthedocs.io/en/stable/usage.html
- pwdlib: https://frankie567.github.io/pwdlib/
- OWASP API Security Top 10 (2023): https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- NIST SP 800-63B (passwords): https://pages.nist.gov/800-63-4/sp800-63b.html
- JWT introduction: https://jwt.io/introduction
