# HLD — DrawBoard

> High-level design only — boxes and arrows, who talks to whom, and why. No table schemas, no message payloads, no code — that's LLD. Single doc for the whole system as currently decided.

---

## The boxes

```
┌──────────────────────────────┐
│  Frontend (React + Konva)    │
│  ┌────────────────────────┐  │
│  │ Y.Doc (local replica)  │  │  ← source of truth for board content in the browser
│  │ Y.UndoManager (per user)│  │
│  └────────────────────────┘  │
└──────┬───────────────────────┘
       │
       ├── (1) Auth (signup/login/logout/session) ──────────────► GoTrue (Supabase Auth)
       │
       ├── (2) Board list / create / rename / share / change role
       │        / revoke / soft-delete  (metadata only, never content)
       │                                  ──────────────────────► PostgREST ──► Postgres
       │
       └── (3) Open a board LIVE (WebSocket, carries user JWT) ──► Room Service (Yjs sync server)
                                                                   │  one Y.Doc per OPEN board
                                                                   │
                                                                   ├─ access check (user's JWT) ──► PostgREST ──► Postgres (RLS)
                                                                   └─ load / save content (service credential) ──► Postgres
```

- **Frontend, GoTrue, PostgREST, Postgres** — Supabase, used directly for everything that isn't live.
- **Room Service** — the one custom box. A Yjs sync server (Hocuspocus or `y-websocket`, decided in LLD) plus our own hooks for access control, load/save and room lifecycle.

---

## Access model (decided)

- A board has one **owner** and an **access list** of other users, each at role **viewer** or **editor**.
- Only the owner and users on the access list can open a board. Viewers see it live but cannot change it. Only the owner manages the access list.
- No public links, no join codes, no anonymous users.
- These rules live in **Postgres Row Level Security** — the single place permissions are defined — and the Room Service asks Postgres rather than re-implementing them.

---

## What each box does

### Frontend (React + Konva)
- Auth via the Supabase SDK → GoTrue.
- All non-live work via the Supabase SDK → PostgREST: list boards (owned + shared with me), create, rename, share with a user at a role, change role, revoke, soft-delete. **Metadata only — the frontend never writes board content through PostgREST.**
- Opening a board: connects to the Room Service over WebSocket with the user's JWT, and syncs a local **Y.Doc**.
- **Y.Doc is the only source of truth for board content in the browser.** Konva renders from it; every local edit is a change to the Y.Doc; remote changes arrive as Y.Doc updates and trigger re-render. Zustand holds only local UI state (active tool, selection, viewport, open panels) — never a second copy of the shapes.
- **Awareness** (ephemeral, not saved) carries cursors, who's present, and in-progress strokes. A freehand stroke is previewed via awareness while drawing and written to the Y.Doc once, on pointer-up.
- **Undo/redo** via a per-user `Y.UndoManager` (see below).
- Viewers get a read-only UI — a convenience only; the Room Service is what actually enforces it.

### GoTrue (Supabase Auth)
- Owns signup/login/logout/session and issues the JWT every other check relies on.

### PostgREST (Supabase Data API)
- The frontend's path to board metadata and the access list, and the Room Service's path for access checks. Every call carries the caller's JWT; RLS decides what's allowed.

### Postgres
- `auth.users` (GoTrue) — identity.
- Our tables — boards (metadata + **content stored as Yjs binary state**, optionally a JSON snapshot for thumbnails/search) and a board-access table (user + role per board).
- RLS enforces every permission rule. **Only the Room Service writes the content column**; RLS blocks the frontend from writing it.

### Room Service (the one custom box)
A small, stateful Node process. Yjs does the syncing and merging; this service adds what Yjs doesn't:

1. **Authenticate + authorize on connect** — verifies the user's JWT and asks Postgres (with that JWT, so RLS applies) for the user's role on the board. No access → connection refused.
2. **Hold one Y.Doc per open board** — loaded on first join, shared by everyone in that room, dropped after the last person leaves. Not every board in the system — only open ones.
3. **Sync** — exchanges Yjs updates between everyone in the room, and relays awareness (cursors, presence, draft strokes).
4. **Enforce read-only** — updates sent by a viewer are dropped, not applied or relayed.
5. **Load** — on first join, reads saved content from Postgres into the room's Y.Doc.
6. **Save** — writes the Y.Doc to Postgres shortly after edits (debounced), when the last person leaves, and on graceful shutdown.
7. **Recheck access** — about every 30 s, re-asks Postgres for every connected user's role. Downgraded/removed users are disconnected (they reconnect with their new role, or are refused). A deleted board's room is closed.
8. **Lifecycle** — unloads idle rooms.

**Credentials split:** the **user's JWT** is verified once, at connect, to prove identity. After that, load, save and role rechecks use a **server-only service credential** with the verified user ID, calling the same Postgres role function RLS uses — so rules still live in one place. Saving and rechecks must keep working after the last user leaves or a token expires. The service credential never reaches the browser.

**Long sessions:** JWT lifetime is not extended and new tokens are not sent over the open socket. The Supabase client auto-refreshes its token; an open connection isn't cut when the connect-time token expires; authorization stays current through the periodic recheck; every reconnect uses the fresh token.

---

## Main flows

**Open a board (first person):** frontend connects with JWT → Room Service checks role → no room in memory, so it loads content from Postgres into a new Y.Doc → syncs the full board to the client → live.

**Join mid-session:** new client connects → role check → room already in memory → Yjs sync sends everything the client is missing, **including changes not yet saved to Postgres** → client receives live updates from then on. Postgres is not involved.

**An edit:** user drags a shape → local Y.Doc changes immediately (no waiting) → update sent to Room Service → role check passed at connect, viewer updates dropped → applied to the room's Y.Doc → relayed to others → their Konva re-renders. Save is scheduled.

**Dropped connection / reconnect:** client shows "disconnected" → on reconnect, client and server exchange only what each is missing → edits made during the short disconnect are merged, not lost.

**Access change during a session:** owner changes a role / removes a user / deletes the board via PostgREST (allowed any time) → within ~30 s the Room Service's recheck sees it → affected users are disconnected and reconnect with their new role or are refused; a deleted board's room closes and stops saving.

**Save:** debounced after edits + when the room empties + on shutdown → Y.Doc encoded to binary → written to Postgres with the service credential.

**Room Service restart:** in-memory rooms are lost. Next open reloads from the last save. Browsers still open hold their own replica and send back any newer changes when they reconnect. Changes made only on a client that closed before the save are lost — the accepted loss window, kept small by frequent saves.

---

## Undo/redo model

- Each browser runs its own **`Y.UndoManager`**, tracking **only that user's own changes** — remote changes are never on your stack.
- One gesture (a full stroke, a drag, a resize) is grouped into **one undo step**.
- Undo doesn't rewind history — it creates a **new change that reverses yours**, which syncs to everyone like any other edit.
- Saving does **not** clear undo history. History lives in the browser only, so it's **lost on page reload** — accepted limitation.
- Exact behavior on concurrent edits to the same shape (e.g. undoing a move after someone else also moved it) to be verified in a Yjs prototype and documented in LLD.

---

## Why this shape

**Why a Room Service still exists with Yjs:** Yjs merges changes, but something must still check who may join, reject viewer edits, hold a live copy so late joiners catch up without a save, and persist the board. That's the Room Service — it no longer orders operations or resolves conflicts; Yjs does.

**Why not Supabase Realtime instead:** it could relay messages between browsers, but there's no server-side copy of the board to catch up late joiners or save from, and no place to drop writes from viewers.

**Why not peer-to-peer (`y-webrtc`):** no server means no enforced access control and no durable save.

**Why the Room Service asks Postgres for permissions:** RLS stays the single place rules are defined, so the frontend and the Room Service can't drift apart.

**Why non-live work skips the Room Service:** listing, sharing, renaming, deleting are one-shot reads/writes; they don't need a live copy.

**Why only the Room Service writes content:** if the frontend could also write content via PostgREST, an open room's next save would overwrite it (or vice versa). One writer avoids that.

---

## Accepted limitations

Each limitation is deliberate for this project's scale. For each: what breaks, why it's accepted now, how it would be solved, and when solving it becomes worth it.

| Limitation | What breaks | Why accepted now | How we'd solve it | When it's worth solving |
|---|---|---|---|---|
| **Single Room Service instance** | Can't add servers; one process holds every open board | A few users per board, few open boards — fits one small instance | Route every connection for a board to the same instance (e.g. hash board ID → instance), or share Yjs updates between instances via Redis pub/sub | One instance runs out of memory/CPU, or needs zero-downtime deploys |
| **Access changes take up to ~30 s** | A removed/downgraded user can keep editing briefly | Simple, can't get stuck, owner can always act | After a successful change, owner's browser (or a Postgres change notification) tells the Room Service to apply it immediately; keep periodic recheck as safety net | Removal must be instant (security-sensitive boards) |
| **Save loss window** | Room Service crash loses changes since last save, unless an open browser resends them | Saves every few seconds; open replicas usually recover the rest | Append each update to durable storage before acknowledging it; periodically compact the log into a snapshot | Losing even seconds of work is unacceptable |
| **Undo history lost on reload** | After refresh, can't undo earlier actions | Normal behavior for most editors | Persist each user's undo stack per board (e.g. browser storage or server-side per user) | Users expect undo to survive reloads |
| **No full offline editing** | Can't work for long without a connection, or load the app offline | Brief disconnects already merge on reconnect | Local persistence with `y-indexeddb` + service worker caching the app; decide how viewer/role changes apply to offline edits | Users need to work without internet |
| **Same-property conflicts: one wins** | Two people dragging the same shape — one drag is kept | Rare; everyone sees the same result | Show "X is moving this" via awareness as a hint, or a short soft lock | Testing shows users find it confusing |

---

## Open questions this HLD leaves to LLD

- Table/column shapes (boards, board access) and exact RLS policies, including "only Room Service writes content"
- Y.Doc structure: one `Y.Map` per shape; how freehand points and sticky-note text are stored; shape ordering
- Hocuspocus vs `y-websocket` server
- Save debounce interval and idle-room eviction timeout
- Whether to also store a JSON snapshot (thumbnails/search)
- Role recheck interval and the exact role function
- Board size limits