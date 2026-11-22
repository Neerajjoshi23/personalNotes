# FE4 · Network Layer: the frontend's contract with unreliable systems

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** News feed (FE Tier 1 / HLD #4), Chat app (FE Tier 1 / HLD #3), Autocomplete (FE Tier 1 / HLD #14), Photo sharing / Instagram (FE Tier 1 / HLD #11), Email client (FE Tier 2), Data table (FE Tier 2)

---

## Why this topic matters

The browser network layer is where product UX meets distributed systems. A senior frontend engineer must handle slow requests, duplicate requests, cancellation, retries, stale data, reconnects and partial failure without making the UI feel random.

Frontend network design includes:

| Area | Interview risk |
|---|---|
| API shape | overfetching, underfetching, bad pagination |
| Caching | stale UI, duplicate requests, wrong invalidation |
| Retries | retry storms, duplicate mutations |
| Cancellation | race conditions and wasted bandwidth |
| Realtime | reconnect gaps, ordering, duplicate events |
| Error UX | user cannot recover or understand what failed |

**Interview line:** "I'll design a small typed network layer rather than calling `fetch` from components. It gives us cancellation, auth, retries, error normalization, request dedup and metrics in one place."

---

## Part 1: API design from the client side — REST, GraphQL and BFF

### REST

REST is excellent when resources map cleanly to screens and HTTP caching matters.

```http
GET /api/feed/home?cursor=abc&limit=20
POST /api/posts/{id}/like
GET /api/products/{slug}
```

Pros:
- simple mental model;
- CDN/browser caching works naturally for GETs;
- easy to debug and log;
- independent endpoints can evolve.

Cons:
- overfetch/underfetch across complex screens;
- multiple round trips if the page needs many resources;
- mobile/web may need different shapes.

### GraphQL

GraphQL is strong when clients need flexible nested data and the organization can operate a schema well.

Pros:
- one query can fetch exactly the screen shape;
- typed schema and fragments;
- normalized client caches can update entities by ID.

Cons:
- caching at HTTP/CDN layer is harder;
- query cost/rate limiting required;
- schema governance and N+1 resolver risks;
- not automatically simpler for mutations/realtime.

### BFF (Backend for Frontend)

A BFF shapes backend services for a specific client or surface.

```text
React app -> Web BFF -> feed service / user service / media service
```

Use a BFF when:
- backend microservices expose awkward internal APIs;
- the frontend needs screen-shaped aggregation;
- auth/session/cookie policy should stay server-side;
- web and mobile have different payload/performance needs.

Trade-off: another service to own. In an interview, say BFF when it simplifies the client and hides backend complexity, not because it sounds trendy.

**Interview line:** "For a feed, a BFF endpoint returning a screen-shaped page is reasonable; the client should not orchestrate five backend services before first paint."

---

## Part 2: cursor pagination and infinite scroll

Offset pagination breaks under inserts/deletes: page 2 can duplicate or skip items when new content appears above it. Cursor pagination uses an opaque position.

```ts
type PageRequest = { cursor?: string; limit: number; signal?: AbortSignal };
type Page<T> = { items: T[]; nextCursor?: string };
```

For infinite scroll:

```tsx
function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed', 'home'],
    queryFn: ({ pageParam, signal }) => api.feed({ cursor: pageParam, limit: 20, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor,
    maxPages: 5,
  });
}
```

Important design points:
- cursor should be opaque to the client;
- stable item IDs are mandatory for dedup;
- prefetch next page when sentinel nears viewport;
- preserve scroll anchor when prepending refreshed items;
- do not fetch multiple next pages concurrently unless supported;
- cap retained pages to avoid memory bloat.

For data tables, infinite scroll may be wrong. If users need page numbers, exports or total counts, use server-side pagination with explicit sort/filter state.

---

## Part 3: request dedup, caching, retries, backoff and cancellation

### Request dedup

If three components ask for `['user', '42']`, only one network call should run. Query libraries do this by query key; a custom client can maintain an in-flight map.

```ts
class HttpClient {
  private inFlight = new Map<string, Promise<unknown>>();

  get<T>(key: string, request: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(key)) return this.inFlight.get(key) as Promise<T>;
    const promise = request().finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }
}
```

Dedup only safe idempotent reads unless the mutation has an idempotency key.

### Retries and backoff

Retry transient failures: network errors, 429 with retry-after, 503. Do not blindly retry validation errors or 401.

Use exponential backoff with jitter. Cap attempts. Respect idempotency.

```ts
async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (err) {
      last = err;
      const delay = Math.min(1000 * 2 ** i, 8000) * (0.5 + Math.random());
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw last;
}
```

Interview caveat: retries belong in a policy layer, not every component. Mutations need idempotency keys or user-visible retry buttons.

### Cancellation and race conditions

A classic autocomplete race:
1. user types "rea" -> request A;
2. user types "react" -> request B;
3. B returns first, then A returns and overwrites results with stale data.

Fix with AbortController and/or sequence guards.

```ts
function useSearch(q: string) {
  React.useEffect(() => {
    if (!q) return;
    const controller = new AbortController();
    let active = true;

    api.search({ q, signal: controller.signal })
      .then(results => { if (active) setResults(results); })
      .catch(err => { if (err.name !== 'AbortError' && active) setError(err); });

    return () => {
      active = false;
      controller.abort();
    };
  }, [q]);
}
```

Query libraries handle much of this, but you should still explain the race.

---

## Part 4: prefetching and error handling UX

### Prefetching

Prefetch when intent is likely, not just because you can.

Good triggers:
- route hover/focus for desktop navigation;
- near-viewport sentinel for infinite feed;
- next image in carousel;
- next video metadata after current row becomes visible;
- typeahead popular results after input focus.

Bad prefetch:
- large media on constrained connections;
- sensitive user-specific data without intent;
- prefetching every possible route from the homepage.

Use browser hints and app-level query prefetch carefully. Abort prefetch when it no longer matters.

### Error handling UX

Design error states by scope:

| Failure | UX |
|---|---|
| full page initial load | error page with retry |
| one feed page fails | inline retry at bottom, keep previous pages |
| image fails | placeholder + alt/fallback |
| mutation fails | toast + rollback or retry affordance |
| websocket disconnects | subtle "reconnecting" banner, queue safe sends |
| auth expires | redirect or session refresh flow |

Normalize error shapes:

```ts
type ApiError = {
  kind: 'network' | 'timeout' | 'auth' | 'rate-limit' | 'validation' | 'server';
  message: string;
  retryable: boolean;
  requestId?: string;
};
```

Expose request IDs in logs/toasts when useful for support.

---

## Part 5: realtime on the client — WebSocket and SSE

For the HLD comparison of polling, SSE and WebSocket, connect to [E1](../../../SystemDesign/Notes/HLD/E-Realtime/E1-Polling-SSE-WebSocket.md). In the frontend note, focus on client behavior.

### WebSocket client concerns

- create socket after auth/session is ready;
- handle open/error/message/close;
- heartbeat or server ping if required;
- reconnect with backoff and jitter;
- resume from last known sequence;
- dedup events by ID/version;
- clean up on tab/page lifecycle events.

```ts
type EventEnvelope<T> = {
  id: string;
  seq: number;
  type: string;
  payload: T;
};

type RealtimeState = {
  status: 'connecting' | 'connected' | 'reconnecting' | 'offline';
  lastSeq: number;
  seenEventIds: Set<string>;
};
```

### Ordering and gap fill

Do not assume events are exactly once. On reconnect:
1. reconnect socket;
2. send last acknowledged sequence or fetch `GET /events?afterSeq=...`;
3. apply missing events in order;
4. ignore duplicates and older versions.

### SSE vs WebSocket

SSE is simpler for server-to-client streams: live notifications, ChatGPT token streaming, feed freshness. WebSocket is better for bidirectional low-latency collaboration/chat/whiteboard events.

DrawBoard needs WebSocket because clients send frequent CRDT updates and presence. A news feed may only need SSE or polling for "new items available".

**Interview line:** "I won't use WebSocket just because the UI is live. If the client only receives updates, SSE is simpler; if the client sends high-frequency collaborative updates, WebSocket fits better."

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Feed API | REST/BFF with cursor pagination | screen-shaped, cacheable, stable under inserts |
| Complex nested client with many surfaces | GraphQL | flexible queries + normalized cache if org supports it |
| Autocomplete | debounce + cache + abort stale requests | avoids races and excess calls |
| Infinite scroll | `useInfiniteQuery` style pages | dedup, page params, refetch model |
| Like/save mutation | optimistic + rollback + idempotency key | instant UX, safe retries |
| Payment/checkout | no blind retry without idempotency | duplicate charges/reservations are dangerous |
| Chat/DrawBoard | WebSocket with seq/dedup/reconnect | bidirectional realtime |
| Notification stream / LLM tokens | SSE | one-way server stream, simpler than WS |
| Large dashboard | BFF aggregation | client should not orchestrate many services |

### Common interview traps

- Offset pagination for a constantly changing feed.
- Retrying non-idempotent mutations without idempotency keys.
- Ignoring AbortController and stale response races.
- Treating WebSocket messages as ordered/exactly-once forever.
- Global error toast for every partial failure.
- Overusing GraphQL/BFF without explaining operational trade-offs.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why is cursor pagination better than offset pagination for feeds?</summary>

Feeds change while users scroll. Offset pagination can duplicate or skip items when inserts/deletes happen before the current page. Cursor pagination uses an opaque stable position, usually based on ranking/time/id, so the next page continues from the previous result set.
</details>

<details><summary>2. How do you prevent autocomplete race conditions?</summary>

Debounce input, cancel stale requests with AbortController, and/or use a sequence guard so only the latest request updates UI. Cache results by query and avoid refetching identical active queries.
</details>

<details><summary>3. Which failures should a frontend retry automatically?</summary>

Transient, retryable failures such as network errors, timeouts, 429 with retry-after and 503, with capped exponential backoff and jitter. Do not auto-retry validation errors, unauthorized requests, or non-idempotent mutations without idempotency keys.
</details>

<details><summary>4. When is a BFF better than direct frontend calls to many services?</summary>

When the screen needs aggregated, client-specific data from multiple backend services, or when auth/session/internal APIs should be hidden. The BFF reduces client orchestration and shapes payloads for web performance.
</details>

<details><summary>5. WebSocket reconnect: what state must the client remember?</summary>

Connection status, last acknowledged sequence/version, seen event IDs for dedup, queued safe outbound messages if any, and enough room/entity identity to fetch gaps after reconnect.
</details>

<details><summary>6. Why might SSE be better than WebSocket for an LLM streaming UI?</summary>

The stream is mostly server-to-client tokens/events. SSE is simpler over HTTP, supports automatic reconnection semantics, and avoids maintaining bidirectional socket infrastructure unless the product needs client-to-server realtime messages.
</details>

<details><summary>7. What is request dedup, and when is it unsafe?</summary>

Request dedup shares one in-flight request among identical callers, usually by query key. It is safe for idempotent reads. It is unsafe for mutations unless the operation has an idempotency key and duplicate semantics are explicitly defined.
</details>

<details><summary>8. How should the UI behave if page 4 of an infinite feed fails?</summary>

Keep pages 1–3 visible, show an inline retry at the bottom, avoid a full-page error, preserve scroll, and log the failure. If retry succeeds, append page 4 normally.
</details>

---

## My notes (write from memory after reading)

## My notes (FE4 · Network Layer)

<details>
<summary><strong>1. API Design & Pagination (REST, GraphQL, BFF & Cursors)</strong></summary>

* **Typed Network Layer:** Never call raw `fetch` directly inside components. Centralize auth, `AbortController` cancellation, retry policies, request deduplication, error normalization (`ApiError`), and observability in one client layer.
* **REST vs. GraphQL vs. BFF:**
  * **REST:** Best default when endpoints map cleanly to screens and HTTP/CDN caching matters.
  * **GraphQL:** Strong when complex clients need flexible nested shapes across many surfaces and the org supports schema governance/query cost limits.
  * **BFF (Backend for Frontend):** Shapes multiple internal microservices into one screen-ready payload so the browser doesn't orchestrate 5 round trips before first paint.
* **Cursor vs. Offset Pagination:**
  * Always use **opaque cursors** (`?cursor=abc&limit=20`) for live feeds/chats where inserts or deletes shift rows while scrolling (offset pagination causes duplicate or skipped items).
  * Cap retained pages in infinite scroll (`maxPages: 5`) to prevent mobile memory bloat. Use page numbers only for static data tables requiring arbitrary page jumps or exports.

```tsx
function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed', 'home'],
    queryFn: ({ pageParam, signal }) =>
      api.feed({ cursor: pageParam, limit: 20, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    maxPages: 5,
  });
}
```
</details>

<details>
<summary><strong>2. Request Dedup, Smart Retries & Cancellation</strong></summary>

* **Request Deduplication:** Share one in-flight `Promise` in a `Map<string, Promise>` when multiple components request the same query key simultaneously. Safe **only** for idempotent reads (`GET`), never mutations without an idempotency key.
* **Smart Retries (Exponential Backoff + Jitter):**
  * **Auto-retry:** Transient failures (network drops, timeouts, `429` respecting `Retry-After`, `503`). Add random jitter (`0.5 + Math.random()`) so reconnecting clients don't create a thundering herd.
  * **Never auto-retry:** `400` validation errors, `401/403` auth errors, or `POST` mutations (like payments) without an `Idempotency-Key` header.
* **Cancellation (`AbortController`):** Abort superseded requests on rapid inputs (like autocomplete) and ignore `AbortError` in `catch` so stale slow responses never overwrite fresher UI results.

```ts
useEffect(() => {
  if (!q) return;
  const controller = new AbortController();

  api.search({ q, signal: controller.signal })
    .then(setResults)
    .catch((err) => {
      if (err.name !== 'AbortError') setError(err);
    });

  return () => controller.abort();
}, [q]);
```
</details>

<details>
<summary><strong>3. Prefetching & Scoped Error Handling UX</strong></summary>

* **High-Intent Prefetching:** Prefetch on desktop link hover/focus, near-viewport scroll sentinels, or next carousel image. Avoid prefetching large media on slow connections or prefetching every link blindly.
* **Scoped Error Recovery (No Global Toast Spam):**
  * *Initial page load fails:* Full-page error state with Retry.
  * *Page 4 of feed fails:* Keep Pages 1–3 visible and show an inline Retry button at the bottom.
  * *Single image fails:* Fallback placeholder + `alt` text.
  * *WebSocket drops:* Subtle `"Reconnecting..."` banner while queueing outbound sends.
</details>

<details>
<summary><strong>4. Realtime on the Client: SSE vs. WebSockets (Comparison & Code)</strong></summary>

Both protocols start over encrypted **HTTPS** in production. **SSE** stays on standard `https://` (`text/event-stream`), while **WebSockets** upgrade via HTTP `101 Switching Protocols` into a persistent `wss://` two-way tunnel.

| Dimension | SSE (`Server-Sent Events`) | WebSockets (`wss://`) |
| :--- | :--- | :--- |
| **Direction** | **One-way (Server → Client)**. Client sends data via normal HTTP `POST`. | **Bidirectional / Full-duplex (Client ↔ Server)** over one persistent connection. |
| **Auto-Reconnect** | **Built into `EventSource`** (automatically sends `Last-Event-ID`). | **Manual** (requires custom backoff, jitter, ping/pong heartbeats, and gap-fill). |
| **Auth & Headers** | Native `EventSource` uses cookies (`GET` only); use `fetch()` stream for `POST` + Bearer tokens. | `new WebSocket(url)` cannot set custom headers; use `HttpOnly` cookies or a short-lived `POST /ws-ticket`. |
| **Best Use Cases** | **LLM / AI token streaming**, live notifications, stock tickers, `"12 new posts"` feed invalidation banners. | **Chat apps**, **DrawBoard / Figma** (CRDT updates + live cursors), multiplayer games. |

#### Code Example A: SSE / LLM Streaming with `fetch` + `ReadableStream` + `AbortController`
*(Preferred over `EventSource` when sending a `POST` prompt, `Authorization` header, or wiring a "Stop generating" button).*

```ts
async function streamPrompt(
  prompt: string,
  signal: AbortSignal,
  onToken: (chunk: string) => void
) {
  const res = await fetch('/api/ai/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ prompt }),
    signal,
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onToken(decoder.decode(value, { stream: true }));
  }
}
```

#### Code Example B: WebSocket Envelope, Reconnect Gap-Fill & Optimistic `clientId` Upsert
* **7 WebSocket Client Concerns:** (1) Auth readiness before connect, (2) Connection state machine (`connecting` / `connected` / `reconnecting` / `offline`), (3) Ping/pong heartbeats to catch silent zombie drops, (4) Exponential backoff + jitter, (5) `lastSeq` gap-filling on reconnect (`GET /events?afterSeq=lastSeq`) while buffering live incoming events, (6) Deduplication via `seenEventIds` and `clientId`, and (7) Closing on `pagehide` / reopening on `pageshow` (`event.persisted`) so open sockets don't break browser `bfcache`.

```ts
type EventEnvelope<T> = {
  id: string;        // Server event ID (for deduplication)
  clientId?: string; // Client-generated UUID (matches optimistic bubble)
  seq: number;       // Monotonic per-room sequence number (for ordering & gap fill)
  type: string;
  payload: T;
};

// Shared handler for BOTH HTTPS POST 200 OK and WebSocket broadcast (prevents duplicates)
function upsertMessage(state: RoomState, incoming: Message) {
  // 1. Loser of the race: already confirmed by the faster pipe -> ignore
  if (state.messagesById[incoming.id]) return;

  // 2. Winner of the race: swap temporary clientId -> real server id
  if (incoming.clientId && state.messagesById[incoming.clientId]) {
    delete state.messagesById[incoming.clientId];
    state.messagesById[incoming.id] = { ...incoming, status: 'sent' };
    state.orderedMessageIds = state.orderedMessageIds.map((id) =>
      id === incoming.clientId ? incoming.id : id
    );
    return;
  }

  // 3. New message from another user or another tab
  state.messagesById[incoming.id] = { ...incoming, status: 'sent' };
  state.orderedMessageIds.push(incoming.id);
}
```
</details>

**One thing I'd have got wrong before reading this:**
- Relying on `invalidateQueries` on HTTP `POST` success while a WebSocket is open (causing a brief duplicate-message flicker) instead of matching both responses by `clientId` in one shared `upsertMessage` reducer, and leaving WebSockets open across navigation (which breaks browser `bfcache`).


**One thing I'd have got wrong before reading this:**

---

## Sources / read more

| Source | What to read | Where / time |
|---|---|---|
| [TanStack Query: Infinite Queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries) | "Example", "What happens when an infinite query needs to be refetched?", "bi-directional infinite list", "manually update the infinite query", "limit the number of pages", "What if my API doesn't return a cursor?" | ~30 min |
| [TanStack Query: Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) | "Via the UI", "Via the cache", "When to use what" | ~20 min |
| [MDN: Writing WebSocket client applications](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications) | "Creating a WebSocket object", "Listening for the open event", "Listening for errors", "Sending messages", "Receiving messages", "Handling disconnect", "Working with the bfcache", "Security considerations" | ~25 min |
| [HLD E1: Polling/SSE/WebSocket](../../../SystemDesign/Notes/HLD/E-Realtime/E1-Polling-SSE-WebSocket.md) | Re-read the backend trade-off table and scaling notes, then map them to client reconnect/dedup logic | ~20 min |

**Connects to:** FE3 State + Data Model · FE5 Performance · [E1 Polling/SSE/WebSocket](../../../SystemDesign/Notes/HLD/E-Realtime/E1-Polling-SSE-WebSocket.md) · [I2 Timeouts/Retries/Backoff](../../../SystemDesign/Notes/HLD/I-Reliability/I2-Timeouts-Retries-Backoff.md) · [A6 API Design](../../../SystemDesign/Notes/HLD/A-Fundamentals/A6-API-Design.md)
