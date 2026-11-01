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

- 
- 
- 

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
