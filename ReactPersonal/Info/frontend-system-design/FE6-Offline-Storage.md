# FE6 · Offline + Storage: making a web app useful when the network lies

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Docs / Google Docs (#12), Chat (#3), Email client (FE Tier 2), News feed (#4), Photo sharing / Instagram (#11), DrawBoard collaborative editor (FE Tier 1)

---

## Why this topic matters

Offline is not a bonus feature in frontend system design. It is the moment where the browser stops being a thin view layer and becomes a small distributed system: local data, durable logs, cache invalidation, replay, conflicts and recovery.

For a React engineer, the interviewer is not asking, "do you know `localStorage`?" They are asking:

| Interview pressure | What they expect you to say |
|---|---|
| Slow or flaky network | Serve a useful shell and cached data, then reconcile. |
| Large client data | Use IndexedDB / OPFS, not synchronous string storage. |
| Writes while offline | Queue operations with idempotency keys; replay safely. |
| Reconnect conflicts | Pick server-authority, merge, or CRDT depending on domain. |
| Multiple tabs | Avoid two tabs corrupting the same queue; coordinate. |

In Adobe Connect terms: a meeting UI cannot depend on every icon, transcript chunk, chat draft or recording thumbnail being fetched at click time. In DrawBoard terms: local Yjs updates should survive refresh, then sync when the room service reconnects.

**Interview line:** "I separate the problem into read offline and write offline. Reads are a service-worker caching problem; writes are a durable operation-log problem with idempotency and conflict rules."

---

## Part 1: the browser storage toolbox

The first trade-off is not "which API do I know?" It is **what shape of data** you need to store.

| Storage | Best for | Avoid for | Notes / limits |
|---|---|---|---|
| **Memory** (`Map`, React state, TanStack Query cache) | Current render/session, derived state, in-flight de-dupe | Anything that must survive refresh | Fastest; lost on reload/tab close; memory pressure can kill the page. |
| **`sessionStorage`** | Per-tab wizard state, temporary filters | Cross-tab state, secrets, large data | Synchronous string key-value; scoped to one tab; blocks main thread. |
| **`localStorage`** | Tiny preferences, feature flags, last selected workspace | Caches, auth tokens, queues, large JSON | Synchronous; commonly ~a few MiB; XSS can read it; no transactions. |
| **Cookies** | Server-read session identifiers and CSRF-friendly flows | App caches, large state, bearer access tokens readable by JS | Small (~4KB each), sent on matching requests, support `HttpOnly`, `Secure`, `SameSite`. |
| **IndexedDB** | Structured client database: entities, sync queues, metadata, offline docs | Huge binary editing workloads where file-like access matters | Async, transactional, indexed object stores; browser-managed quota and eviction. |
| **Cache Storage** | HTTP `Request` → `Response` pairs for service-worker caching | Querying app entities, user-generated writes | Great for app shell/assets/API responses; not a general DB. |
| **OPFS** (Origin Private File System) | Large file-like blobs, media chunks, WASM/worker workloads | Normal JSON entity state | Origin-scoped private file system; useful when you want file handles and streaming writes. |

### The senior rule: don't put operational data in synchronous string storage

`localStorage` is tempting because it is one line. It is also synchronous and has no transactions. A 2 MB JSON parse during input can jank your app; two tabs can overwrite each other; a partial write can lose a queue.

Use it for:
- `theme = "dark"`
- `lastWorkspaceId = "abc"`
- "show beta sidebar" flags

Do not use it for:
- offline email drafts with attachments
- a chat send queue
- normalized feed cache
- auth bearer tokens

IndexedDB gives you the primitives you actually need: object stores, indexes, transactions and async access.

```ts
// A small wrapper shape; use Dexie/idb in real apps, but know the underlying model.
type OfflineOp = {
  idempotencyKey: string;
  entity: 'message' | 'board-update';
  createdAt: number;
  payload: unknown;
  status: 'pending' | 'sending' | 'failed';
};

// Object stores you might create for an offline chat/docs app:
// - entities: cached messages/docs keyed by server id
// - outbox: OfflineOp keyed by idempotencyKey
// - syncMeta: last cursor, last successful replay time, schema version
```

### Quota and eviction: design like the cache can disappear

Browsers do not promise infinite durable storage. Quota depends on browser, device storage and engagement. You can ask:

```ts
const estimate = await navigator.storage.estimate();
console.log({ used: estimate.usage, quota: estimate.quota });

const persisted = await navigator.storage.persist(); // may be denied
```

Treat most client storage as **recoverable**, not authoritative. The server remains the source of truth unless you explicitly design an offline-first CRDT app. Cache misses must degrade gracefully: show skeletons, refetch, or tell the user "available when online".

### Cache Storage vs IndexedDB

A common mistake is to put API JSON responses in Cache Storage and then need "all messages after timestamp X". Cache Storage is keyed by request. If the question is "give me `/api/inbox?page=4` exactly as fetched", Cache Storage works. If the question is "render the 50 most recent messages across folders", use IndexedDB.

```
HTTP cache / Cache Storage:  Request URL ─► Response body
IndexedDB:                   object store + indexes ─► queryable entities
```

For a feed: cache the app shell and images with Cache Storage; store normalized posts/users/cursors in IndexedDB if offline browsing matters.

---

## Part 2: service workers are a programmable network proxy

A service worker runs separately from your page and can intercept fetches for its scope.

```
React tab ── fetch('/api/feed') ──► Service Worker ──► Network
                         │              │
                         │              └──► Cache Storage
                         └── IndexedDB for app data (from page or worker)
```

Key properties:
- It only works in secure contexts (HTTPS, except localhost).
- It is event-driven; it can be killed when idle.
- It cannot touch the DOM.
- It has a lifecycle that makes updates intentionally conservative.

### Lifecycle: install → waiting → activate → fetch ⏭ *Skip for interviews*

| Phase | What happens | What to do |
|---|---|---|
| **register** | Page calls `navigator.serviceWorker.register('/sw.js')` | Keep registration at app startup, behind a feature flag if needed. |
| **install** | Browser downloaded a new worker | Precache versioned shell assets. If a required asset fails, fail install. |
| **waiting** | Old worker still controls open tabs | Avoid surprise reloads; ask user to refresh or coordinate `skipWaiting()`. |
| **activate** | New worker takes control | Delete old caches, migrate cache names. |
| **fetch** | Requests from controlled pages pass through | Apply caching strategy by request type. |

The waiting phase matters. If Adobe Connect shipped a new meeting client, you do not want one tab on old JS and one chunk from new JS. Version your assets and update carefully.

```ts
// service-worker.ts, simplified
const STATIC_CACHE = 'connect-shell-v42';
const STATIC_ASSETS = ['/', '/assets/app.abc123.js', '/assets/app.def456.css'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k))),
    ),
  );
});
```

Use Workbox in production if allowed; in an interview, explain the strategies and failure behavior, not just the library name.

---

## Part 3: caching strategies

The offline cookbook patterns are a vocabulary. Pick per resource, not globally.

### 1. Cache-first

Use for versioned static assets, fonts and immutable images.

```
request ─► cache hit? yes ─► return cached
              │
              no
              ▼
            network ─► cache ─► return
```

Why: `/assets/app.abc123.js` is content-hashed. If the name changes when content changes, stale is fine.

Trap: cache-first for `/api/feed` can show old data forever unless you expire or revalidate.

### 2. Network-first

Use for fresh API data where offline fallback is still useful.

```ts
async function networkFirst(req: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) await cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw new Error('offline and no cached response');
  }
}
```

Good for: user profile, inbox overview, meeting list.

### 3. Stale-while-revalidate

Use when fast first paint matters and slightly stale is acceptable.

```
return cached immediately ─┐
                           ├── in parallel: fetch fresh, update cache, notify UI
if no cached: network ─────┘
```

Good for: news feed cards, avatars, thumbnails, feature config. In React, pair it with a "data updated" event so the UI can refresh without surprising the user.

### 4. Cache-only and network-only

- **Cache-only:** offline fallback page, app shell after install.
- **Network-only:** payments, attendance submit, auth callbacks, anything where replay without explicit queue semantics is dangerous.

### Strategy table

| Resource | Strategy | Reason |
|---|---|---|
| Hashed JS/CSS | Cache-first / precache | Immutable by URL. |
| HTML document | Network-first, fallback to app shell | Must pick up deployments; fallback keeps app open. |
| Feed page | Stale-while-revalidate or network-first | UX vs freshness. |
| Chat history | IndexedDB normalized cache + network cursor | Need query/merge, not just response cache. |
| Image thumbnails | Cache-first with LRU/expiry | Large but safe to refetch. |
| Mutating POST | Network-only or queued outbox | Needs idempotency and conflict handling. |

**Interview line:** "I won't apply one caching strategy to the whole app. Static assets are cache-first, list data is stale-while-revalidate, critical mutations are network-only unless I have a durable outbox."

---

## Part 4: offline writes are an operation log

Read offline is mostly caching. Write offline is distributed systems.

For a chat/email/docs app, the safe shape is:

```
User action
   │
   ▼
optimistic UI update ─► IndexedDB outbox (durable op + idempotency key)
   │                                      │
   │ online                               │ offline / failed
   ▼                                      ▼
POST with key ───────────────────────► replay later
   │
   ▼
server ack with canonical id/version ─► replace optimistic entity
```

### Outbox record

```ts
type OutboxOp<T> = {
  idempotencyKey: string;       // UUID generated once, retried forever
  type: 'send-message' | 'edit-title' | 'add-board-stroke';
  payload: T;
  baseVersion?: number;         // for conflict detection
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
};
```

Rules:
1. **Write the outbox before claiming success.** If the tab crashes after optimistic UI but before persistence, the user loses work.
2. **Use idempotency keys.** A retry after a timeout may have succeeded server-side.
3. **Replay in order where order matters.** Chat messages in one room should preserve client order; independent preference updates can commute.
4. **Back off.** Do not DDoS your backend when connectivity returns.
5. **Surface stuck state.** "3 messages waiting to send" is better than silent failure.

### Background Sync

The Background Synchronization API lets a service worker ask the browser to retry work when connectivity is likely back.

```ts
// page
await navigator.serviceWorker.ready.then(reg => reg.sync.register('flush-outbox'));

// service worker
self.addEventListener('sync', event => {
  if (event.tag === 'flush-outbox') event.waitUntil(flushOutbox());
});
```

Use it as an optimization, not your only mechanism. Support varies, and browsers can throttle background work. Also flush on page start and on `online` events.

### Multi-tab coordination ⏭ *Skip for interviews*

Two tabs can both see "pending" and send the same operation. Use one or more:
- idempotency keys (server dedupe is mandatory)
- a lease field in IndexedDB (`lockedUntil`, `lockedBy`)
- `BroadcastChannel` to elect one active flusher
- `navigator.locks` where available

Server-side idempotency is the final safety net. Client coordination only reduces waste.

---

## Part 5: conflicts on reconnect

Conflict strategy depends on the domain. Do not answer "last write wins" by default.

| Domain | Conflict rule | Why |
|---|---|---|
| Email draft body | Usually last editor wins per draft, with recovery/version history | Single-user most of the time; show conflict if edited on two devices. |
| Chat send | Append-only; no conflict, order by server timestamp plus client temp order | Sending a message is an operation, not replacing a shared field. |
| Profile settings | Field-level merge with server validation | Independent fields can merge; invalid states rejected. |
| Inventory/payment | Server authority; offline mutation may be rejected | Correctness beats offline convenience. |
| Collaborative canvas/text | CRDT / OT | Concurrent edits are normal, not exceptional. |

### Version-based conflict detection

For normal CRUD:

```ts
// Client sends: "apply my change only if I edited version 7"
await fetch(`/api/docs/${docId}`, {
  method: 'PATCH',
  headers: { 'If-Match': String(baseVersion), 'Idempotency-Key': key },
  body: JSON.stringify(patch),
});
```

Server replies:
- `200` with new version: success.
- `409 Conflict` or `412 Precondition Failed`: client must refetch, merge or ask user.

### DrawBoard / CRDT connection

DrawBoard's Yjs model is the cleanest answer when simultaneous offline edits are expected. Each client applies local updates immediately. The updates are commutative and converge when exchanged. `y-indexeddb` persists the Yjs document locally, so a tab can reload and recover unsynced edits before reconnecting to the WebSocket room.

Cross-link this to [E3 Collaborative Sync](../../../SystemDesign/Notes/HLD/E-Realtime/E3-Collaborative-Sync.md): the frontend offline store is not separate from the real-time architecture; it is one replica in the replication system.

```
Browser tab A ─┐        WebSocket room service        ┌─ Browser tab B
IndexedDB(Yjs) ├──► exchange Yjs updates ◄────────────┤ IndexedDB(Yjs)
Browser tab C ─┘                                      └─ later reconnect
```

Do not use CRDTs for everything. They add data-model constraints, metadata overhead and debugging complexity. Use them when conflicts are the product: text, whiteboard strokes, cursors, comments.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| News feed should load on subway | App shell precache + stale-while-revalidate feed + cached images | Good UX; staleness acceptable. |
| Email client draft offline | IndexedDB drafts + outbox + conflict prompt on version mismatch | User work must survive refresh. |
| Chat send offline | IndexedDB outbox, idempotency key, optimistic bubble, retry/backoff | Send is append-only but needs dedupe. |
| Payment checkout | No offline submit; preserve form locally, submit online only | Avoid duplicate/invalid financial operations. |
| DrawBoard canvas | Yjs document persisted with IndexedDB + WebSocket sync | Offline concurrent edits are expected. |
| Recording playback thumbnails | Cache Storage for thumbnails; IndexedDB for metadata | HTTP responses vs queryable metadata. |
| Large local media processing | OPFS + worker | File-like access avoids loading whole blobs in memory. |

### Common interview traps

- Treating `localStorage` as a database. It is sync string storage, not a durable queue.
- Saying "service worker caches everything" without versioning, invalidation or auth boundaries.
- Caching personalized responses under a key that can leak across users after logout.
- Forgetting POST retry idempotency. Timeout does not mean failure.
- Ignoring multiple tabs replaying the same queue.
- Using last-write-wins for collaborative editing or money.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why is IndexedDB usually better than localStorage for an offline queue?</summary>

IndexedDB is async, transactional and can store structured records with indexes. `localStorage` is synchronous string key-value storage, blocks the main thread, has no transactions and is easy to corrupt from multiple tabs.
</details>

<details><summary>2. Which resources would you cache-first in a React app?</summary>

Versioned immutable assets such as hashed JS/CSS chunks, fonts and some thumbnails/images with eviction. Do not cache-first mutable API data unless there is an explicit expiry/revalidation plan.
</details>

<details><summary>3. A user sends a chat message offline, refreshes, then reconnects. What must be persisted?</summary>

The pending operation in IndexedDB: payload, idempotency key, creation time/order, status/attempt metadata and any temp client id used by the optimistic UI. On ack, replace the temp id with the server id.
</details>

<details><summary>4. Why is Background Sync not enough by itself?</summary>

Browser support and scheduling are not guaranteed. The app should also flush on startup, on network recovery and while the page is open. Background Sync is an optimization around a durable outbox, not the outbox itself.
</details>

<details><summary>5. Cache Storage vs IndexedDB: where would you store cached chat messages?</summary>

IndexedDB, because you need to query and merge messages by room, timestamp, cursor and server id. Cache Storage is better for HTTP response caching such as `/assets/app.js` or image requests.
</details>

<details><summary>6. How do you avoid double-sending offline operations from two tabs?</summary>

Use server-side idempotency keys as the correctness guarantee, plus client coordination such as IndexedDB leases, `BroadcastChannel`, or `navigator.locks` to reduce duplicate work.
</details>

<details><summary>7. When would you choose CRDTs over version conflict prompts?</summary>

When concurrent edits are normal and should merge automatically, such as text/canvas collaboration. For rare conflicts in CRUD forms, version checks plus a merge UI are simpler.
</details>

<details><summary>8. What should happen after logout in an offline-capable app?</summary>

Clear or partition user-specific caches, IndexedDB stores and pending queues; unregister or reset service-worker state if needed; keep only safe public assets. Never let the next user see cached private data.
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
| [web.dev: Offline cookbook](https://web.dev/articles/offline-cookbook) | Headings: "When to store resources", "On install, as a dependency", "On activate", "On network response", "Stale-while-revalidate", "On background-sync", "Cache persistence", then strategy headings "Cache only", "Network only", "Cache falling back to network", "Network falling back to cache" | ~35 min |
| [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) | "Key concepts and usage", "Synchronous and asynchronous", "Storage limits and eviction criteria", "Connecting to a database", "Retrieving and modifying data" | ~25 min |
| [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) | "Service worker concepts and usage", "Registration", "Download, install and activate", "Using static routing to control how resources are fetched" | ~25 min |
| [MDN: CacheStorage](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage) | "Instance methods", "Examples" | ~10 min |
| [MDN: Background Synchronization API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API) | "Concepts and usage", "Requesting a background sync", "Listening for a sync within a Service Worker" | ~10 min |
| [MDN: Origin private file system](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system) | "How does the OPFS solve such problems?", "How do you access the OPFS?", worker manipulation sections | ~15 min |

**Connects to:** [E3 Collaborative Sync](../../../SystemDesign/Notes/HLD/E-Realtime/E3-Collaborative-Sync.md) · FE3 State + data model · FE4 Network layer · FE8 Frontend security · Questions: Chat (#3), Google Docs / DrawBoard (#12), News feed (#4), Instagram (#11)
