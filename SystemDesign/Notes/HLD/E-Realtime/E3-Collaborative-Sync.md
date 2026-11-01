# E3 · Collaborative Sync: making many editors converge

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Google Docs / collaborative editor (#12), Chat / presence (#3), Dropbox / file sync (#5), frontend collaborative editor / drawing tool (**DrawBoard**)

---

## Why this topic matters

Collaborative editing is the place where "just send updates over WebSocket" stops working. Two users edit at the same time, packets arrive in different orders, someone goes offline, undo should only undo your own work, and late joiners need the current document.

The system must guarantee **convergence**:

> If replicas receive the same set of edits, they eventually show the same document.

There are two classic families:

| Approach | Core idea | Famous examples |
|---|---|---|
| **OT (Operational Transformation)** | Transform concurrent operations so each operation still applies to the document version it expects | Google Docs-style text editing history |
| **CRDT (Conflict-free Replicated Data Type)** | Design data structures whose updates merge deterministically without central conflict resolution | Yjs, Automerge, many offline-first apps |

For interviews, you do not need to implement either from scratch. You need to explain the trade-off and design the surrounding system: WebSocket sync, snapshots, update logs, presence, access control and persistence.

**Interview line:** "For a Figma/whiteboard-style app, I'd use a CRDT library such as Yjs for document convergence, keep a server-side room copy for authority and late join, persist snapshots plus updates, and use awareness for cursors because presence is ephemeral."

---

## Part 1: OT vs CRDT with concrete examples

### OT example: concurrent text insert

Start document:

```
AB
```

Alice inserts `x` at position 1: `A x B`
Bob inserts `y` at position 1: `A y B`

If Alice's operation reaches Bob after Bob already inserted `y`, Alice's position may need transformation from 1 to 2 (depending on tie-breaking), so both end with the same text, for example:

```
A y x B
```

OT thinks in operations against document versions:

```
insert(pos=1, text="x")
insert(pos=1, text="y")
transform one operation against the other
```

OT can be efficient and is historically important for collaborative text editors, but transformation logic becomes tricky for rich structures, undo and many operation types.

### CRDT example: grow-only set

A simple CRDT is a grow-only set. Alice adds `A`, Bob adds `B` while offline. Merge is set union:

```
Alice: {A}
Bob:   {B}
Merge: {A, B}
```

Order does not matter. Applying the same update twice does nothing.

### CRDT example: last-writer register with deterministic tie-break

For one property like `shape.x`, concurrent writes need a winner:

```
Alice: x = 10 at logical timestamp (clientA, 5)
Bob:   x = 20 at logical timestamp (clientB, 3)
```

The CRDT defines a deterministic ordering. Everyone picks the same winner. This gives convergence, not necessarily "what both humans intended".

### DrawBoard-shaped CRDT example

If a shape is one nested map:

```
shape: { x: 10, y: 20, color: "red" }
```

Alice changes `color` to blue while Bob changes `x` to 50. With one key per property, both survive:

```
{ x: 50, y: 20, color: "blue" }
```

If the whole shape were stored as one JSON blob, the later write could overwrite the entire object and lose the other edit. That is why DrawBoard decided on **one `Y.Map` per shape, one key per property**.

---

## Part 2: server authority vs peer-to-peer

There are three common collaboration topologies.

| Topology | Shape | Pros | Cons |
|---|---|---|---|
| **Server-authoritative** | clients send ops to server; server validates/orders/persists | access control, durable state, simpler late join | server is on critical path |
| **Server as sync participant** | clients and server all hold replicas; CRDT merges | local-first feel + server persistence/ACLs | server still stateful per room |
| **Peer-to-peer** | browsers sync directly via WebRTC | low latency, less server bandwidth | hard auth, persistence, NAT/TURN, late join |

For interview systems, a server is usually still needed even with CRDTs:
- verify who may join
- reject writes from viewers
- hold current room state for late joiners
- persist snapshots/update logs
- provide audit and recovery

DrawBoard uses the middle model: Yjs handles merging, but the Room Service authorizes, syncs and persists. It is not a central ordering authority for conflict resolution.

**Interview line:** "CRDT removes the need for the server to resolve conflicts, not the need for a server. The server still owns authorization, persistence and room lifecycle."

---

## Part 3: snapshots + update log

A collaborative document can be persisted as:

1. **snapshot only** — periodically save full state
2. **update log only** — append every operation/update
3. **snapshot + update log** — fast load plus small recovery window

```
updates: u1 u2 u3 u4 u5 u6 u7
snapshot at u5: S5
load = S5 + replay u6,u7
```

| Choice | Pros | Cons |
|---|---|---|
| Snapshot only | simple, fast load | crash can lose updates since last save |
| Update log only | durable, auditable | load time grows; needs compaction |
| Snapshot + log | common production balance | more moving parts |

For a whiteboard, a snapshot can be the encoded CRDT state. Updates are binary CRDT updates. Periodic compaction writes a new snapshot and truncates old updates that are included in it.

Late join flow:

```
1. client connects with auth
2. server checks role
3. server has room in memory? send current state diff
4. otherwise load snapshot + updates, create room doc, then sync
```

---

## Part 4: awareness, presence, offline edits and undo

### Awareness / presence

Presence is not document content. Cursors, selections, "Alice is drawing" and online dots are ephemeral.

```
Document state: persisted, replayable, must converge
Awareness state: live only, expires on disconnect, can be lossy
```

Store presence separately and give it TTL/heartbeat behavior. Do not persist every cursor coordinate to the document log.

### Offline edits

CRDTs shine when clients edit offline and sync later, but product rules still matter:
- Does the app load without network?
- Is the user still allowed to edit when they reconnect?
- What if a viewer was downgraded while offline?
- How much local storage is allowed?

A safe first release often supports **brief disconnect/reconnect**, not full offline editing. DrawBoard made exactly that decision: Yjs can merge brief disconnect edits on reconnect, while full offline support with `y-indexeddb` and service worker caching is deferred.

### Undo

Collaborative undo is not "set document back to an older global snapshot". That would erase other users' newer work. Good collaborative undo creates a new operation that reverses **your own** previous operation.

Example:

```
Alice creates rectangle R
Bob changes R.color = blue
Alice presses undo for create R
```

Should R disappear, including Bob's change? Some systems say yes because Alice's create is undone; others protect subsequent edits. This is a product decision. DrawBoard notes this exact edge case as something to verify in the Yjs prototype.

---

## Part 5: Figma's multiplayer approach

Figma's blog is useful because it does not present pure textbook OT or CRDT. The key ideas to remember for interviews:

- A Figma document is a tree of objects with properties.
- Multiplayer edits operate on object properties, creation/removal and tree structure.
- Figma uses a server in the sync path, not pure peer-to-peer.
- Many conflicts are property-level: if two users edit different properties, both can survive.
- Undo is carefully scoped so a user's undo does not naively wipe out unrelated work.

The interview takeaway is not "copy Figma's exact algorithm". It is:

> Model the document at the right granularity. If your unit of conflict is the whole file, you lose edits. If your unit is an object property or list item with stable IDs, many concurrent edits merge naturally.

This maps directly to DrawBoard's one-`Y.Map`-per-shape and one-key-per-property decision.

---
## Part 6: My DrawBoard as the answer to "Design Google Docs / Figma"

Use DrawBoard as your worked example. It is strong because it has concrete product constraints and explicit trade-offs.

### Requirements

Functional:
- infinite canvas with freehand, rectangle, ellipse, line/arrow, text and sticky notes
- users log in; boards persist under accounts
- owner shares specific boards with users as viewer or editor
- multiple users see strokes/moves live
- late joiners see the current board, including unsaved live changes
- viewers can watch but cannot edit
- each user's undo reverses only their own work

Non-functional:
- local edits feel instant
- no silent data loss on brief reconnect
- access control is server-enforced
- a personal-project scale can start with one Room Service
- full offline and multi-instance scale are deferred, but there is a path

### High-level boxes

```
React + Konva frontend
  ├── Supabase Auth (GoTrue) for login/session
  ├── PostgREST/Postgres for board metadata and access list
  └── WebSocket to Room Service for live board content

Room Service
  ├── verifies JWT on connect
  ├── asks Postgres/RLS for role
  ├── holds one Y.Doc per open board
  ├── relays Yjs updates + awareness
  ├── drops viewer updates
  ├── debounced saves Yjs binary state to Postgres
  └── periodically rechecks roles (~30s)
```

### Why Yjs

Yjs gives a `Y.Doc` on every participant: browser replicas and server replica. Every local change becomes a binary update identified by client/counter metadata. Updates can be applied in any order, duplicates are harmless, and everyone with the same updates converges.

That lets DrawBoard avoid custom conflict resolution. The project effort moves to canvas UX, data modeling, access control and failure handling.

### Document model

- Board content lives only in the `Y.Doc`.
- Konva renders from the `Y.Doc`; Zustand holds local UI only: active tool, selection, viewport, panels.
- Board is a `Y.Map` from shape ID to shape.
- Each shape is a nested `Y.Map` with one key per property (`x`, `y`, `color`, etc.).
- Freehand draft strokes go through awareness while pointer is down; the finished shape is written once on pointer-up.

This is a very interview-friendly point:

**Interview line:** "I store each shape as a nested CRDT map, not one JSON blob, so concurrent edits to different properties merge instead of overwriting the whole shape."

### Room Service responsibilities

Yjs is not authorization or persistence. The Room Service exists because DrawBoard needs:

1. **join authorization** — user must be owner/editor/viewer
2. **read-only enforcement** — viewer updates are dropped server-side
3. **late join** — server room has unsaved live changes
4. **persistence** — encode Yjs state and save to Postgres
5. **role recheck** — owners can downgrade/remove users while room is open
6. **lifecycle** — unload idle rooms

The frontend never writes board content through PostgREST. Only metadata goes that path. Content has one writer: the Room Service. This avoids two writers overwriting each other.

### Main flows

Open first:

```
client connects with JWT
Room Service verifies identity and role
load saved Yjs binary from Postgres
create Y.Doc in memory
sync to client
```

Join mid-session:

```
client connects
role check passes
room already in memory
Yjs sync sends missing updates, including unsaved changes
```

Edit:

```
local Y.Doc changes immediately
binary update sent over WebSocket
Room Service applies if editor/owner
server relays to others
save is scheduled
```

Reconnect:

```
client shows disconnected
on reconnect, Yjs state vectors compare what each side has
missing updates are exchanged
brief-disconnect edits merge
```

Access change:

```
owner changes role/removes/deletes through PostgREST
Room Service periodic recheck sees it within ~30s
downgraded/removed users are disconnected or refused on reconnect
```

### Accepted limitations and scale-up path

| Limitation now | Why accepted | Scale-up path |
|---|---|---|
| One Room Service instance | personal project, few open boards | hash `boardId -> instance` or replicate Yjs updates via pub/sub |
| Debounced snapshot saves | small accepted loss window | append every Yjs update durably, compact into snapshots |
| No full offline editing | brief reconnect is enough for V1.5 | `y-indexeddb`, service worker, role-conflict policy |
| Same-property conflict: one wins | rare and convergent | awareness hints or soft locks if users find it confusing |
| Undo history lost on reload | normal first-release editor behavior | persist per-user undo stacks if needed |

### How to say the full answer in 60 seconds

> "DrawBoard is a Figma-like whiteboard. I use React/Konva for rendering, Supabase Auth/Postgres for identity and metadata, and a Node Room Service over WebSocket for live collaboration. The document is a Yjs CRDT: every browser and the server hold a `Y.Doc`. Each shape is a nested map, so independent property edits merge. Awareness carries cursors and draft strokes; finished strokes are written once. The Room Service verifies JWTs, checks Postgres RLS for owner/editor/viewer, drops viewer writes, holds one doc per open board for late joiners, and saves encoded Yjs state to Postgres. First version supports reconnect, not full offline; if save-loss becomes unacceptable, I append every update and compact snapshots."

That is a complete Google Docs/Figma answer grounded in your own system.

---

## Part 7: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Plain collaborative text editor | OT or mature CRDT library | Avoid inventing algorithms in interview |
| Whiteboard / Figma-style object canvas | CRDT with stable object IDs and property-level fields | Independent object/property edits merge naturally |
| Need strict server validation for every op | Server-authoritative ops | Useful for permissions, games, financial workflows |
| Need offline-first editing | CRDT + local persistence + sync server | Merges after reconnect |
| Need presence/cursors | Awareness/presence channel, not persisted doc | Ephemeral and lossy |
| Need fast load and durability | Snapshot + update log | Load snapshot, replay recent updates |
| First MVP | Server sync participant + snapshots | Simpler than full offline/update-log design |

### Common interview traps

- Saying "use WebSocket" as if transport solves conflicts.
- Storing the whole document as one JSON blob and overwriting concurrent edits.
- Persisting cursor positions as durable document operations.
- Undoing by reverting the entire document to an old snapshot.
- Choosing peer-to-peer when the product needs server-enforced permissions.
- Forgetting late joiners need current in-memory state, not just last saved DB snapshot.

---
## Self-test (answer out loud first, then open)

<details><summary>1. What problem do OT and CRDT both solve?</summary>

They let multiple replicas apply concurrent edits and converge to a consistent document. OT transforms operations against concurrent operations; CRDTs define data structures whose updates merge deterministically.
</details>

<details><summary>2. Give a concrete case where property-level modeling prevents lost edits.</summary>

If Alice changes a shape's color and Bob moves the same shape, storing each property as its own CRDT field lets both survive. If the shape is one JSON blob, the later write may replace the whole blob and lose the other edit.
</details>

<details><summary>3. Why does a CRDT app still need a server?</summary>

For authorization, rejecting viewer writes, late join state, persistence, snapshots/update logs, room lifecycle and sometimes audit. CRDT solves merge/convergence, not product authority.
</details>

<details><summary>4. Snapshot only vs snapshot + update log: what is the trade-off?</summary>

Snapshot only is simple and fast to load but can lose edits since the last save. Snapshot + update log durably records each update and periodically compacts, reducing loss and allowing replay at the cost of more complexity.
</details>

<details><summary>5. Why should awareness/presence be separate from document state?</summary>

Cursors and draft strokes are ephemeral, high-frequency and safe to lose. Persisting them pollutes document history and creates unnecessary storage/replay work.
</details>

<details><summary>6. Why is collaborative undo hard?</summary>

Undo should reverse the user's own intent without erasing independent edits by others. It usually creates a new inverse operation, not a global rollback to an old document snapshot.
</details>

<details><summary>7. In DrawBoard, why does only the Room Service write board content?</summary>

If the frontend and Room Service both wrote content, an open room save could overwrite a frontend write or vice versa. One content writer avoids dual-writer conflicts; frontend writes only metadata.
</details>

<details><summary>8. How would you scale DrawBoard beyond one Room Service?</summary>

Route all connections for a board to the same instance via consistent hashing, or replicate Yjs updates between instances through a pub/sub layer. Also move from snapshot-only saves to durable update append plus compaction if loss windows matter.
</details>

<details><summary>9. What is the biggest interview mistake in a Google Docs/Figma design?</summary>

Treating it as chat over WebSocket. The hard parts are conflict resolution, document model granularity, late join/reconnect, undo, awareness and persistence.
</details>

---

## My notes (write from memory after reading)

- 
- 
- 

**One thing I'd have got wrong before reading this:**

---

## Sources / read more

| Source | What to read | Where / time |
|---|---|---|
| [Figma: How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/) | Exact headings: **Multiplayer Editing in Figma**, **Background context: Figma's setup, OTs, and more**, **How OTs and CRDTs informed our multiplayer approach**, **How a Figma document is structured**, **The details of Figma's multiplayer system**, **Syncing object properties**, **Syncing object creation and removal**, **Syncing trees of objects**, **Implementing undo**, **The big takeaways** | ~40 min |
| DrawBoard PRD | Read sections **Architecture shape**, **V1.5 — Real-time collaboration**, **Success criteria** | `C:\Users\neerajj\ReactPersonal\Phase3\DrawBoard\PRD-DrawBoard.md` |
| DrawBoard HLD | Read **The boxes**, **What each box does**, **Main flows**, **Undo/redo model**, **Accepted limitations** | `C:\Users\neerajj\ReactPersonal\Phase3\DrawBoard\HLD-DrawBoard.md` |
| DrawBoard Decisions | Read **Yjs mental model**, decisions **D1**, **D10–D17**, and superseded decisions **S1–S3** | `C:\Users\neerajj\ReactPersonal\Phase3\DrawBoard\Decisions-DrawBoard.md` |

**Connects to:** [B4 Replication](../B-Data/B4-Replication.md) · [D3 Delivery semantics + idempotency](../D-Async/D3-Delivery-Semantics-Idempotency.md) · [E1 Polling/SSE/WebSocket](E1-Polling-SSE-WebSocket.md) · [E2 Scaling WebSockets](E2-Scaling-WebSockets.md) · Questions: Google Docs / collaborative editor (#12), Chat (#3)
