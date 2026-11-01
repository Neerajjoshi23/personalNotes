# Decisions — DrawBoard

> **Decision log.** What was decided, and why. Not an LLD — no schemas, message formats or code. Companion to `PRD-DrawBoard.md` (what users get) and `HLD-DrawBoard.md` (boxes and flows). Decisions that were replaced stay at the bottom with the reason, so the reasoning isn't lost.

---

## 1. Yjs mental model (reference)

Read this first — every collaboration decision below builds on it.

**1. Everyone has a full copy.** Yjs gives you a shared document, a `Y.Doc`. Every participant keeps a complete copy — each browser has one, the server has one. Nobody asks "what's the latest board?"; each person edits their own copy immediately and sends out a small message describing the change.

```text
Alice's browser     Server       Bob's browser
  [Y.Doc]    <-->  [Y.Doc]  <-->   [Y.Doc]
```

**2. The document is built from shared types, not plain objects.**

| Type | Behaves like | DrawBoard use |
|---|---|---|
| `Y.Map` | object / `Map` | the board: shape ID → shape |
| `Y.Map` (nested) | object | one shape: `x`, `y`, `color`, … |
| `Y.Array` | array | shape order (layering), if needed |
| `Y.Text` | string | sticky-note text |

**3. Every change becomes a small "update".** Local copy changes instantly → Yjs produces a binary update → it goes to the server → server applies it to its copy and forwards it to everyone else → they apply it and re-render. Every piece of data has a unique ID of **(client ID, counter)**, so each change is identifiable.

**4. Why copies never disagree (the CRDT part).** Updates can be applied **in any order**, applying one **twice has no effect**, and everyone who has the **same set of updates ends up identical**. Conflicts follow fixed rules applied identically everywhere:

| Situation | Result |
|---|---|
| Different keys changed at the same time | both kept |
| Same key changed at the same time | one value wins — the same one on every copy |
| Two people add new items | both kept |
| One deletes, another edits the same item | item stays deleted |

Yjs guarantees **everyone agrees**; it does **not** guarantee the result matches what each user intended. That part is a product decision.

**5. Catching up (late join / reconnect).** Each copy has a **state vector** — "from client A I've seen up to #50, from B up to #12". Two copies swap state vectors and send each other only what's missing. A late joiner with nothing receives the whole current board — including changes never saved to the database.

**6. Provider = the network.** Yjs knows nothing about networking. A provider (WebSocket) carries updates. The server is essentially one more participant everyone connects to, holding one `Y.Doc` per open board.

**7. Awareness = temporary "who's here" data.** Cursors, who's present, strokes in progress, selections. Separate channel, same connection, **never saved**, disappears on disconnect.

**8. Undo = `Y.UndoManager`.** Runs in each browser, tracks **only your own changes**, and undo creates a **new change that reverses yours**, which syncs like any other edit.

**9. Saving.** `Y.encodeStateAsUpdate(doc)` → bytes → Postgres. Load with `Y.applyUpdate(doc, bytes)`.

**10. Rendering loop.** Pointer event or remote update → `Y.Doc` changes → Yjs event → Konva re-renders from the `Y.Doc`. The `Y.Doc` is the only source of truth for board content.

> **One line:** every participant has a full copy; every change is a small, uniquely identified update that can be applied in any order; everyone with the same updates has the same board; the server connects everyone, checks permissions and saves.

---

## 2. Current decisions

| # | Area | Decision |
|---|---|---|
| D1 | Collaboration engine | Yjs, synced through our Room Service |
| D2 | Access model | Owner + per-user access list at **viewer** or **editor**; no public links or join codes |
| D3 | Permission authority | One Postgres role function, used by RLS and by the Room Service |
| D4 | Room Service credentials | User's JWT verified once at connect; server-only service credential for load/save and rechecks |
| D5 | Content writer | Only the Room Service writes board content |
| D6 | Participants | No fixed cap; single Room Service instance |
| D7 | Rendering | Konva via `react-konva`, interactions built ourselves |
| D8 | What a shape is | One pointer-down → pointer-up gesture = one shape |
| D9 | New shape vs. edit | Decided by hit-testing at pointer-down, with a tolerance margin |
| D10 | Shape data model | One `Y.Map` per shape, one key per property |
| D11 | Drawing in progress | Previewed via awareness; written to the `Y.Doc` once on pointer-up |
| D12 | Concurrent edits | No locks; Yjs merge rules decide |
| D13 | Undo/redo | Per-user `Y.UndoManager`, one gesture = one step, not persisted |
| D14 | Late join & persistence | Server keeps one `Y.Doc` per open board; debounced saves as Yjs binary |
| D15 | Offline | Reconnect after brief disconnects only; no full offline editing yet |
| D16 | Access changes during a live session | Allowed any time; Room Service rechecks roles periodically and disconnects/downgrades |
| D17 | Long sessions / token expiry | Don't extend JWT lifetime; the connection stays valid after connect; reconnects use the auto-refreshed token |

### D1 — Yjs for collaboration
**Why:** merging concurrent edits, catching up late joiners, reconnect resync and per-user undo are solved problems in Yjs. Building them myself would consume the project; using Yjs moves effort to the canvas, the data model, access control and failure handling. Choosing a proven library for the hard distributed part is an engineering decision, not a shortcut — the key is being able to explain how it works (section 1).

### D2 — Owner + viewer/editor access list
**Why:** every participant is a known, logged-in user, so "who's in the room" and "who changed what" are always answerable. Viewer vs. editor covers the real need (show vs. collaborate) without a complex role system. Public links and join codes dropped to keep one access path.

### D3 — RLS is the permission authority
- The rule "what is user U's role on board B (owner / editor / viewer / none), and does B still exist" lives in **one Postgres function**.
- RLS policies call it, so the frontend (via PostgREST) is governed by it.
- The Room Service calls the same function — at connect and on every periodic recheck (D16).

**Why:** rules defined once, in Postgres. Everyone gets the same answer; nothing is duplicated in Room Service code that could drift.

### D4 — Credential split
- **At connect:** verify the user's JWT — this proves who they are and gives the user ID.
- **After that:** the Room Service uses its server-only service credential for load, save and role rechecks, passing the already-verified user ID to the role function (D3).

**Why:** saving and rechecks must keep working when the last user has left or a token has expired, so they can't depend on a user's JWT. Identity is still proven by the user's own JWT. The service credential lives only on the Room Service.

### D5 — Single writer for content
**Why:** if both the frontend (PostgREST) and the Room Service wrote content, an open room's next save would overwrite the other write. The frontend only writes metadata (name, sharing, deletion).

### D6 — No participant cap, one instance
**Why:** personal project; a cap adds rules without teaching anything. One instance guarantees everyone on a board reaches the same in-memory `Y.Doc`. Multi-instance routing is out of scope.

### D7 — Konva, not a whiteboard SDK
**Why:** tldraw would give drawing, selection and undo for free; the goal is to build selection, resize and hit-testing myself. Konva gives shape-level objects and per-shape hit-testing — low-level enough to need real design, high-level enough not to hand-roll canvas math.

### D8 — One gesture = one shape
**Why:** a freehand stroke has no formula; its data is the ordered list of points captured during the drag. Pointer-up seals it with its own ID. A new pointer-down always starts a new shape — even at the same spot, even touching another stroke. Overlap is only visual; data never auto-merges. This also means two people drawing new shapes can never collide (independent IDs).

### D9 — Hit-testing decides intent at pointer-down
- On a resize handle → resize (corner = both dimensions, edge midpoint = one).
- On a shape's body/edge → select/move.
- On empty canvas → new shape.
- Hit areas get an even tolerance margin in all directions (value tuned empirically).

**Why:** pixel-perfect clicking is unrealistic; without tolerance users start new strokes when they meant to resize.

### D10 — One `Y.Map` per shape, one key per property
**Why:** Yjs merges at key level. If Alice changes a shape's color while Bob moves it, both survive because they touch different keys. Storing a shape as one plain object would make the later write replace the whole shape and silently lose the other edit.

### D11 — Draft strokes through awareness
**Why:** others should see a stroke being drawn live, but the in-progress stroke isn't a finished shape and nobody else should be able to edit it. Sending it via awareness shows the preview without writing hundreds of intermediate updates into the saved document; the finished shape is written once on pointer-up. If the drawer disconnects mid-stroke, the preview simply disappears.

### D12 — No locks; Yjs merge rules decide
- Different properties of the same shape → both edits kept (D10).
- Same property at the same moment (two people drag the same shape) → one value wins, identically for everyone.
- Delete vs. edit → shape stays deleted.
- Optional: show "X is editing this" via awareness as a hint, **never** as a blocking lock.

**Why:** Yjs guarantees everyone converges, which removes the need for locks to protect correctness. Locks would also break during disconnects and add acquire/release/expiry complexity. The remaining case — two people fighting over the same property — is rare and visibly resolves to one result; accepted.

### D13 — Per-user `Y.UndoManager`
- Tracks only your own changes; never undoes someone else's.
- One gesture (stroke, drag, resize) = one undo step.
- Undo = a new reversing change that syncs to everyone.
- Saving doesn't clear history; history is lost on page reload (accepted).
- Known edge case to verify in prototype: undoing "create shape" removes that shape even if someone else edited it afterward — decide whether that's acceptable.

**Why:** replaces the custom long-list + last-writer-marker design (see superseded S3) with a tested implementation of the same intent: undo your own work without trampling others.

### D14 — Server `Y.Doc` per open board; debounced binary saves
- First person opens → load from Postgres into a new `Y.Doc`.
- Others join → sync from the in-memory `Y.Doc` (includes unsaved changes).
- Save shortly after edits, when the room empties, and on shutdown; content stored as Yjs binary.
- Last person leaves → save, then unload.

**Why:** late joiners must see the live board, not the last save. Memory scales with open boards, not total boards. Crash loss window is limited by frequent saves, and still-open browsers resend newer changes on reconnect.

### D15 — Reconnect only, no full offline editing
**Why:** Yjs merges brief-disconnect edits on reconnect for free. Full offline (local persistence, loading the app without network, long divergence) is a separate feature; deferred.

### D16 — Access changes apply during a live session
- The owner can change a role, remove a user or delete the board **at any time**, even while the room is open.
- The Room Service **rechecks every connected user's role periodically** (about every 30 s) using the role function (D3).
  - Downgraded editor → disconnected; reconnects as a viewer.
  - Removed user → disconnected; reconnect is refused.
  - Upgraded viewer → can be left until their next reconnect, or reconnected the same way.
  - Board deleted → room closed, saving stops, everyone disconnected.
- Later improvement (optional): after a successful access change, the owner's browser notifies the Room Service so it applies immediately; the periodic recheck stays as the safety net.

**Why:** blocking changes while a room is open (considered — see S8) would let anyone who keeps a tab open block the owner from ever removing them, needs a "room is open" flag in the database, races with people joining, and leaves boards stuck if the service crashes. Periodic recheck has none of those problems; the cost is a bounded delay (~30 s) before a change takes effect.

### D17 — Long sessions: no longer JWTs, no token passing over the socket
- Supabase access tokens are short-lived (about an hour by default); the Supabase client **refreshes them automatically** using a refresh token.
- The Room Service verifies the JWT **only when the WebSocket connects**. An open connection is not cut when that token later expires.
- Ongoing authorization during the session comes from the periodic role recheck (D16), not the token.
- Every reconnect uses the client's **current, already-refreshed** token.
- **Not doing:** increasing JWT lifetime, or sending new tokens over the open WebSocket.

**Why:** a longer JWT lifetime makes a stolen token useful for longer. Sending refreshed tokens over the socket adds protocol work that adds nothing once the role is rechecked server-side. Token = proves identity at connect; role recheck = keeps authorization current.

---

## 3. Superseded decisions (kept for the reasoning)

| # | Old decision | Replaced by | Why replaced |
|---|---|---|---|
| S1 | Custom Room Service as single ordering authority, no CRDT | D1, D14 | Yjs gives convergence, late join and reconnect; the Room Service now only authorizes, syncs and persists |
| S2 | Per-property locks (shape ID + property), with prevent-if-known / reject-if-late race handling | D12 | Not needed for correctness once Yjs merges; locks fail during disconnects and add expiry complexity |
| S3 | Undo via shared long list + per-user reference stacks + last-writer marker | D13 | `Y.UndoManager` delivers the same "undo only my own work" intent without custom staleness checks |
| S4 | Undo must check the shape lock | D12, D13 | No locks exist anymore |
| S5 | Clear all undo/redo stacks on save | D13 | Saving and history are separate; clearing on every autosave would surprise users |
| S6 | Public/private rooms with join codes | D2 | One access path: logged-in users on an access list, as viewer or editor |
| S7 | Two-participant limit | D6 | Unnecessary restriction for a personal project |
| S8 | Block role downgrade, removal and deletion while a room is open *(proposed, not adopted)* | D16 | A connected user could block the owner indefinitely; needs a "room open" flag, has a join race, and gets stuck after crashes |

---

## 4. Open items

- Resize-handle hit tolerance (px) — tune once built.
- Primitive tools (rectangle, ellipse, line/arrow, text, sticky note) are in scope per the PRD; confirm how each maps to the one-`Y.Map`-per-shape model.
- How freehand points are stored inside a shape (plain array value vs. `Y.Array`).
- Undo-of-create edge case (D13) — verify in prototype and decide.
- Hocuspocus vs `y-websocket` server.
- Save debounce interval and idle-room eviction timeout.
- Role recheck interval (starting point ~30 s).
- Whether an upgraded viewer is reconnected immediately or on their next reconnect.