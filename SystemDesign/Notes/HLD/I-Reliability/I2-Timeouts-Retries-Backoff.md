# I2 · Timeouts, Retries and Backoff: failing fast without melting the system

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** every "what fails?" deep dive; rate limiter (#2), chat (#3), notification system (#13), payment (#16), LeetCode / job execution (#19), ChatGPT-style LLM app (#24).

---

## Why this topic matters

Most system design answers show boxes connected by arrows. Real incidents happen in the arrows: a dependency becomes slow, clients wait forever, retries multiply traffic, queues fill, and a small failure becomes an outage.

Timeouts and retries are supposed to help:

| Tool | Helps when | Hurts when |
|---|---|---|
| Timeout | A dependency is slow or dead; you need to free threads/connections | Too short for normal tail latency; causes false failures |
| Retry | Failure is transient: packet loss, 503, leader failover | Operation is non-idempotent or dependency is already overloaded |
| Backoff + jitter | Many clients retry together | Missing jitter synchronizes clients into waves |
| Deadline | A whole request has a time budget | Not propagated, so deeper services keep working after caller gave up |

For Neeraj's world: a React client, Adobe Connect room service, recording pipeline, and analytics backends all call other services. A retry in the browser plus a retry in the API plus a retry in the worker can accidentally turn **one user action into dozens of calls**.

**Interview line:** "I set timeouts at every hop, propagate an end-to-end deadline, retry only safe transient failures, use capped exponential backoff with jitter, and enforce a retry budget so recovery traffic cannot exceed normal traffic."

---

## Part 1: timeouts at every hop

A timeout is a bound on how long you are willing to wait. It is not just an HTTP client setting. Every blocking resource needs one:

- browser request timeout / AbortController,
- load balancer idle timeout,
- API server outbound HTTP timeout,
- database query timeout,
- connection acquisition timeout,
- queue receive / visibility timeout,
- WebSocket heartbeat timeout,
- worker job lease timeout.

```
User click
  │  1200 ms overall deadline
  ▼
Frontend ──300ms──► API ──250ms──► User svc
                 └──400ms──► Search svc
                 └──200ms──► Cache/DB
```

If the whole page interaction should finish in 1.2 seconds, the API cannot spend 1.2 seconds on one dependency. It must reserve time for other work and response serialization.

### Timeout types you should name

| Timeout | Meaning | Example |
|---|---|---|
| Connection timeout | Time to establish TCP/TLS connection | Dependency host is unreachable |
| Request / read timeout | Time waiting for response bytes | Service accepted connection but is slow |
| Pool acquisition timeout | Time waiting for a free connection/thread | Your own client pool is exhausted |
| Idle timeout | Close inactive keep-alive connections | LB or proxy cleanup |
| Job lease timeout | How long a worker owns a task before retry | At-least-once queue processing |

A common bug: setting only a read timeout and forgetting DNS/TLS/connection setup. AWS's article calls out that timeouts must cover all remote call work you care about, not just part of it.

### Choosing the value

For internal services, start from downstream latency percentiles and a tolerable false-timeout rate. Example: if you accept 0.1% false timeouts, use something around downstream p99.9 plus network margin. But do not turn this into a magic rule:

- if p99.9 is too close to p50, add padding;
- if the call crosses the public internet, add more margin;
- if the action is user-facing, the caller's UX budget may be stricter than the dependency's tail.

**Interview line:** "I will not use a 30-second default. For a user-facing API, I derive per-hop timeouts from the end-to-end deadline and downstream p99s, with small padding."

---

## Part 2: deadline propagation

A **timeout** is local: "wait at most 300 ms for this call." A **deadline** is end-to-end: "this entire request must finish by 18:20:01.200."

Deadline propagation means every downstream call receives the remaining budget.

```
Client sends: X-Request-Deadline: 18:20:01.200
API receives at 18:20:00.300 -> 900ms left
API spends 250ms auth -> 650ms left
API calls search with deadline, not a fresh 1s timeout
Search sees 80ms left -> returns partial/fallback instead of starting expensive work
```

Why it matters:

- The caller may give up, but downstream services keep doing useless work.
- Queues and thread pools fill with work whose answers nobody needs.
- Retries from upstream arrive while stale downstream work is still running.

In gRPC, deadlines are a first-class concept. In HTTP, you can pass an absolute deadline header or a remaining-time header. Absolute deadlines avoid each hop accidentally resetting the budget, but require reasonably synchronized clocks; remaining time avoids clock assumptions but can be mishandled by each hop. In interviews, say the idea, not a vendor-specific header.

### Cancellation matters too

Deadline propagation should pair with cancellation propagation. If the user closes a tab or the API times out, cancel DB queries, abort fetches, and stop expensive search. In Node/TypeScript, `AbortController` is the common primitive.

---

## Part 3: retries, amplification and retry storms

A retry is a second attempt after a failure. It is often correct: networks drop packets, leaders fail over, a dependency returns a short 503 during deploy. But retries create **extra load** exactly when the dependency may already be struggling.

### Multiplicative retries

If each layer retries three times, traffic explodes.

```
Browser retries 3x
  API retries 3x
    Service A retries 3x
      DB client retries 3x

Worst case attempts = 3 * 3 * 3 * 3 = 81
```

This is retry amplification. It turns a small dependency slowdown into a system-wide load spike. Prefer retries at one layer that has enough context, and disable or limit hidden SDK retries when you add your own policy.

### Retry storms

If 10,000 clients all get a 503 and retry after exactly 1 second, the dependency gets hammered in synchronized waves:

```
time: 0s  failure
      1s  10k retries
      2s  10k retries
      4s  10k retries
```

Backoff spreads retries over time; jitter randomizes them so clients do not move in lockstep.

### Retry budgets

A retry budget caps how much extra traffic retries can add. For example:

- allow retries to be at most 10% of original requests over a rolling window;
- or allow each request at most 1 retry for user-facing paths;
- or stop retrying when dependency error rate / latency crosses a threshold.

This is the operational version of "retries are not free".

**Interview line:** "I budget retries as a small percentage of normal traffic; if the budget is exhausted, I fail fast and let circuit breakers / degradation protect the system."

---

## Part 4: exponential backoff and jitter

Plain exponential backoff:

```
delay = min(cap, base * 2^attempt)
```

Example with `base=100ms`, `cap=2s`:

| Attempt | Max delay |
|---|---|
| 1 | 100 ms |
| 2 | 200 ms |
| 3 | 400 ms |
| 4 | 800 ms |
| 5 | 1600 ms |
| 6+ | 2000 ms cap |

Backoff slows retries. **Jitter** randomizes them.

| Jitter type | Formula | Behavior |
|---|---|---|
| Full jitter | random(0, exponentialDelay) | Best default; spreads load widely |
| Equal jitter | exponentialDelay / 2 + random(0, exponentialDelay / 2) | Keeps a minimum delay, less spread |
| Decorrelated jitter | min(cap, random(base, previousDelay * 3)) | Good for long-running clients; avoids lockstep |

Full jitter is the easiest interview answer: compute the capped exponential delay, then pick a random value between 0 and that delay.

### Short TypeScript snippet

```ts
type RetryOptions = {
  attempts: number;
  baseMs: number;
  capMs: number;
  deadlineMs: number;
  retryable: (status: number) => boolean;
};

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(signal.reason ?? new Error("aborted"));
    }, { once: true });
  });

async function fetchWithRetry(url: string, opts: RetryOptions): Promise<Response> {
  const started = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt < opts.attempts; attempt++) {
    const remaining = opts.deadlineMs - (Date.now() - started);
    if (remaining <= 0) throw new Error("deadline exceeded");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("per-attempt timeout"), remaining);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!opts.retryable(res.status) || attempt === opts.attempts - 1) return res;
      lastError = new Error(`retryable status ${res.status}`);
    } catch (err) {
      lastError = err;
      if (attempt === opts.attempts - 1) break;
    } finally {
      clearTimeout(timeoutId);
    }

    const exp = Math.min(opts.capMs, opts.baseMs * 2 ** attempt);
    const fullJitterDelay = Math.floor(Math.random() * exp);
    if (Date.now() - started + fullJitterDelay >= opts.deadlineMs) break;
    await sleep(fullJitterDelay);
  }

  throw lastError instanceof Error ? lastError : new Error("request failed");
}
```

This is intentionally small. Production code would include metrics, request IDs, idempotency keys, and policy centralized in one HTTP client wrapper.

---

## Part 5: idempotency and which errors to retry

A retry means the server may receive the same logical operation more than once. Safe retries require idempotency.

| Operation | Naturally idempotent? | Retry approach |
|---|---|---|
| `GET /profile/42` | Usually yes | Retry transient 502/503/504/timeouts. |
| `PUT /profile/42` with full desired state | Usually yes | Retry with version / ETag if needed. |
| `POST /payments` | No | Require `Idempotency-Key`; server stores first result. |
| `POST /messages` | Not by HTTP method, but can be made idempotent | Use client message ID / dedup key. |
| `DELETE /resource/42` | Often idempotent | Treat already-deleted as success. |

### Errors worth retrying

Retry only when another attempt has a good chance of success:

- network connection reset / timeout before response,
- DNS or connect errors that are known transient,
- HTTP 408, 429 (respect `Retry-After`), 500, 502, 503, 504,
- leader failover / `UNAVAILABLE` / temporary overload,
- optimistic concurrency conflict only if you re-read and recompute safely.

Usually do **not** retry:

- 400 validation errors,
- 401/403 auth errors,
- 404 for a stable resource lookup,
- 409 without a merge/re-read strategy,
- non-idempotent side effects without an idempotency key,
- requests after the caller's deadline expired.

### Idempotency-key flow

```
Client: POST /payments
Headers: Idempotency-Key: user-42:order-99:attempt-1

Server transaction:
  if key exists -> return stored result
  else create payment + store result under key
```

For a notification system, the key might be `(user_id, campaign_id)`. For chat, it might be `(conversation_id, client_message_id)`. For DrawBoard, CRDT updates are already designed to be safely re-applied / deduplicated by update identity.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| User-facing read API | Short per-hop timeout + 1 retry with full jitter | User is waiting; avoid long tail. |
| Payment creation | Retry only with idempotency key; strict deadline | Duplicate charge is worse than slow failure. |
| Notification send | At-least-once queue + idempotent provider key + backoff | Duplicates can be deduped; transient provider failures common. |
| WebSocket heartbeat | Miss N heartbeats then reconnect with jitter | Avoid mass reconnect storms after network blip. |
| Batch job calling flaky API | More attempts, capped/decorrelated backoff, retry budget | Not user-facing; can trade time for success. |
| Dependency overloaded | Stop retries, circuit-break, shed load | Retrying overload makes it worse. |
| React data fetch | Abort on route change; dedupe in-flight requests | Prevent stale UI updates and wasted work. |

### Common interview traps

- No timeout, or one giant 30-second timeout everywhere.
- Retrying at every layer and accidentally creating 81 attempts.
- Retrying non-idempotent `POST`s without idempotency keys.
- Exponential backoff without jitter.
- Ignoring `Retry-After` on 429/503.
- Letting downstream work continue after the client deadline passed.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why should every hop have a timeout?</summary>

Without timeouts, threads, connections, and promises wait indefinitely for dead or slow dependencies. Each hop needs its own bound so resources are released and the system can degrade instead of piling up stuck work.
</details>

<details><summary>2. Timeout vs deadline: what's the difference?</summary>

A timeout is local to one operation. A deadline is an end-to-end time budget for the whole request. Deadline propagation prevents downstream services from starting work after the caller no longer has time to use the answer.
</details>

<details><summary>3. How can three retries at four layers become 81 attempts?</summary>

Retries multiply: browser 3 attempts × API 3 attempts × service 3 attempts × DB client 3 attempts = 81 downstream attempts for one logical request in the worst case.
</details>

<details><summary>4. What is full jitter?</summary>

Compute the capped exponential backoff delay, then sleep a random amount between 0 and that delay. It spreads clients out and avoids synchronized retry waves.
</details>

<details><summary>5. Which HTTP statuses are normally retryable?</summary>

Transient failures: 408, 429 with `Retry-After`, and 500/502/503/504 if the operation is safe to retry. Network timeouts/resets are also retryable. Do not retry validation/auth errors or non-idempotent operations without protection.
</details>

<details><summary>6. Why do payment APIs require idempotency keys?</summary>

Because a retry may reach the server after the first attempt already created a charge. The idempotency key lets the server return the original result instead of charging again.
</details>

<details><summary>7. What is a retry budget?</summary>

A cap on extra traffic caused by retries, often as a percentage of normal request volume or attempts per request. When exhausted, clients fail fast rather than increasing load on a struggling dependency.
</details>

<details><summary>8. How would you handle retries in a chat message send?</summary>

Generate a client message ID, send it with the message, and let the server dedupe by `(conversation_id, client_message_id)`. Retry transient network/5xx errors with short backoff and jitter; show pending/failed state in the UI.
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
| [AWS Builders' Library: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) | Whole article. The current AWS Builder Center page returns HTTP 200 but does not expose static `<h2>/<h3>` headings; read the article sections titled around "Timeouts", "Retries and backoff", "Jitter", and retry safety. | ~35 min |
| [I3 Circuit breaker + bulkhead](I3-Circuit-Breaker-Bulkhead.md) | After this note, read how retries interact with circuit breakers, load shedding, and cascading failures. | next note |
| [D3 Delivery semantics + idempotency](../D-Async/D3-Delivery-Semantics-Idempotency.md) | Idempotent consumers and dedup keys for at-least-once processing. | review after D3 exists |

**Connects to:** [D1 Queues](../D-Async/D1-Queues.md) · [D3 Delivery semantics + idempotency](../D-Async/D3-Delivery-Semantics-Idempotency.md) · [G4 Sagas](../G-Contention/G4-Sagas.md) · [I3 Circuit breaker + bulkhead](I3-Circuit-Breaker-Bulkhead.md) · Questions: Rate limiter (#2), Notification (#13), Payment (#16), LeetCode (#19), ChatGPT (#24)