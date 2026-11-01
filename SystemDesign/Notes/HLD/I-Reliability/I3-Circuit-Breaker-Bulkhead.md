# I3 · Circuit Breaker + Bulkhead: stopping one failure from becoming everyone's failure

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** every reliability deep dive; chat (#3), notification system (#13), payment (#16), LeetCode / job execution (#19), metrics monitoring (#20), ChatGPT-style LLM app (#24).

---

## Why this topic matters

Retries help when failures are short and rare. But if a dependency is truly unhealthy, blind retries make the outage worse. A service can run out of threads, DB connections, memory, sockets, or worker slots because it keeps waiting for a broken dependency.

Circuit breakers and bulkheads are two failure-isolation tools:

| Pattern | Simple meaning | Protects against |
|---|---|---|
| Circuit breaker | Stop calling a dependency that is clearly failing | Retry storms, thread exhaustion, slow downstreams |
| Bulkhead | Isolate resources per dependency / tenant / feature | One bad dependency consuming the whole pool |
| Load shedding | Reject low-priority work when overloaded | System collapse under excess traffic |
| Graceful degradation | Return a smaller answer instead of failing all | User-visible outage for optional features |

For Adobe Connect, imagine chat storage is slow. That should not take down audio/video signaling, meeting join, or recording metadata. For DrawBoard, AI suggestions failing should not block whiteboard sync.

**Interview line:** "I separate critical and optional dependencies with bulkheads; if an optional dependency is failing, a circuit breaker opens and I return a degraded response instead of letting blocked calls exhaust the service."

---

## Part 1: cascading failures

A cascading failure starts when one component fails and causes overload elsewhere.

```
Search service slows down
  ↓
API threads wait longer
  ↓
Connection pool fills
  ↓
Clients timeout and retry
  ↓
API receives more traffic
  ↓
Healthy dependencies now also starve
```

Google SRE emphasizes that overload is dangerous because systems behave non-linearly near capacity. A service at 70% CPU may be fine; at 95%, queues grow, latencies spike, timeouts fire, and retries amplify.

### The reliable-system mindset

Instead of asking "How do I make this dependency never fail?", ask:

1. What is the user-visible impact if it fails?
2. Is it critical or optional for this request?
3. How much time and concurrency may it consume?
4. What fallback is acceptable?
5. How will I stop retries when the dependency is unhealthy?

This is why reliability patterns are design-time choices, not just library settings.

---

## Part 2: circuit breaker states

A circuit breaker wraps calls to a dependency and tracks recent failures / latency.

```
        failures exceed threshold
 CLOSED ───────────────────────► OPEN
   ▲                              │
   │                              │ after cool-down
   │ success probes               ▼
   └──────────────────────── HALF-OPEN
          failures -> OPEN
```

### Closed

Normal state. Calls pass through. The breaker records outcomes in a rolling window: successes, failures, timeouts, maybe slow calls.

Open conditions can be based on:

- error rate over N calls,
- consecutive failures,
- timeout rate,
- latency above threshold,
- explicit overload signals such as 429/503.

### Open

The dependency is considered unhealthy. New calls fail fast or go to fallback. This prevents the caller from spending threads and connection slots on a dependency that is unlikely to answer.

Open state is not a punishment; it is a pressure-release valve.

### Half-open

After a cool-down, allow a small number of probe requests. If they succeed, close the breaker. If they fail, open again.

The half-open state avoids two bad extremes:

- never trying again,
- letting all traffic rush back at once.

### TypeScript-shaped mental model

```ts
type State = "closed" | "open" | "halfOpen";

class CircuitBreaker {
  private state: State = "closed";
  private openedAt = 0;
  private failures = 0;

  constructor(private threshold: number, private coolDownMs: number) {}

  async call<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.openedAt < this.coolDownMs) return fallback();
      this.state = "halfOpen";
    }

    try {
      const value = await fn();
      this.failures = 0;
      this.state = "closed";
      return value;
    } catch (err) {
      this.failures += 1;
      if (this.state === "halfOpen" || this.failures >= this.threshold) {
        this.state = "open";
        this.openedAt = Date.now();
      }
      return fallback();
    }
  }
}
```

Production breakers should use rolling windows, classify errors carefully, emit metrics, and coordinate with retry policy. The snippet is just the state machine.

**Interview line:** "The circuit breaker is not a replacement for timeouts; it uses timeout/error signals to decide when to fail fast."

---

## Part 3: bulkheads and pool isolation

A ship's bulkheads divide it into watertight compartments. If one compartment floods, the whole ship does not sink. In services, bulkheads divide resources.

```
API service
 ├─ pool: critical DB       40 conns / 80 threads
 ├─ pool: payment provider  10 conns / 20 threads
 ├─ pool: recommendation     5 conns / 10 threads
 └─ pool: analytics          5 conns /  5 threads
```

Without bulkheads, optional recommendation calls can use all outbound connections and block login or checkout. With bulkheads, recommendation fails in its own small pool while critical paths continue.

### Bulkhead dimensions

| Dimension | Example |
|---|---|
| Thread / worker pools | Separate executor for PDF generation vs API requests |
| Connection pools | Separate DB or HTTP client pools per dependency |
| Queues | High-priority queue for payment, low-priority queue for analytics |
| Rate limits | Tenant A cannot consume all capacity for tenant B |
| Process / deployment | Run risky batch jobs separately from user-facing APIs |
| Browser frontend | Separate lazy-loaded widgets; failure of comments does not break video player |

Bulkheads are especially important when one feature is optional. In a feed, "people you may know" can fail while posts still render. In Adobe Connect, a transcript enrichment feature can fail while meeting join still works.

---

## Part 4: load shedding and graceful degradation

A system under overload has two choices: reject some work quickly, or accept everything and fail slowly. Load shedding chooses the first.

### Load shedding

Reject low-priority work when capacity is exhausted:

- return 429/503 with `Retry-After`,
- drop optional background work,
- stop expensive fan-out and enqueue for later,
- cap queue length,
- refuse new WebSocket connections while preserving existing meetings,
- sample analytics events instead of processing all.

The key is to shed **before** resource exhaustion. If every request is already queued behind seconds of work, it is too late.

### Graceful degradation

Return a reduced but useful answer:

| Dependency failing | Degraded response |
|---|---|
| Recommendations | Show popular/default items. |
| Search ranking service | Return lexical / cached results. |
| Avatar service | Show initials / placeholder. |
| Notification provider | Queue for retry; show "will send shortly". |
| AI participant in DrawBoard | Disable AI suggestions; keep drawing and sync alive. |
| Splunk/log query UI | Show partial time range / cached dashboard with warning. |

Fallbacks must be safe. A payment fallback cannot be "assume success". A seat booking fallback cannot be "let everyone reserve". For correctness-critical paths, fail closed.

### Fallback strategies

| Strategy | Good for | Watch out |
|---|---|---|
| Cache last known good value | Feature flags, config, recommendations | Staleness and expiry |
| Static default | Avatars, optional UI sections | Bad personalization |
| Partial response | Feed modules, dashboard panels | API contract must allow partial errors |
| Queue for later | Email, webhook, analytics | Needs idempotency and DLQ |
| Manual review | payments / fraud edge cases | Human process and audit trail |

---

## Part 5: making the patterns work together

These patterns are connected:

```
Deadline -> timeout per attempt -> retry with backoff/jitter
      ↓             ↓                    ↓
  cancellation   circuit breaker     retry budget
      ↓             ↓                    ↓
  load shedding  fallback/degrade   protect dependency
      ↓
  bulkheads keep optional failures isolated
```

A robust outbound call policy might say:

1. The request has a 1 second deadline.
2. The recommendation dependency gets at most 120 ms.
3. It has a 10-connection pool separate from critical DB.
4. It may retry once on 503 with full jitter, if budget allows.
5. If error rate exceeds 50% over 20 calls, breaker opens for 30 seconds.
6. Fallback is cached recommendations.
7. Metrics record latency, errors, breaker state, fallback count.

### What to monitor

At minimum:

- breaker state transitions,
- calls allowed / blocked / fallbacked,
- dependency latency and error rate,
- bulkhead pool saturation,
- queue depth and age,
- load-shed request count,
- user-visible success rate.

A breaker silently opening is not enough; it must show up in dashboards and alerts as degraded mode.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Optional dependency is slow | Circuit breaker + cached/static fallback | Preserve main user flow. |
| Payment provider is failing | Short timeout, idempotent retry, circuit breaker, fail closed | Correctness beats availability. |
| Recommendations overload API | Separate pool + low concurrency limit | Optional feature cannot starve critical API. |
| Flash sale traffic exceeds capacity | Load shedding / virtual waiting room | Better controlled rejection than total collapse. |
| Chat presence store slow | Degrade presence accuracy; keep message send path separate | Presence is less critical than message delivery. |
| Recording transcription slow | Queue and retry asynchronously | User meeting should not block on transcript. |
| AI feature in DrawBoard fails | Disable AI participant, keep CRDT sync | Optional intelligence must not break collaboration. |

### Common interview traps

- Adding a circuit breaker but no timeout. Slow calls still consume resources until the timeout fires.
- Retrying while the breaker is open. That defeats the breaker.
- One global thread/connection pool for all dependencies.
- Fallback that violates correctness, such as assuming a payment succeeded.
- Load shedding only after the service is already out of memory / threads.
- Treating degraded mode as invisible; it needs metrics and alerts.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What problem does a circuit breaker solve?</summary>

It stops a caller from repeatedly spending resources on a dependency that is currently failing or too slow. After enough failures, it opens and fails fast or uses fallback, reducing overload and protecting caller resources.
</details>

<details><summary>2. Name the three circuit breaker states.</summary>

Closed: calls flow normally and failures are recorded. Open: calls fail fast or go to fallback. Half-open: a small number of probe calls test whether the dependency recovered; success closes the breaker, failure reopens it.
</details>

<details><summary>3. What is a bulkhead?</summary>

Resource isolation. Separate pools, queues, limits, or deployments ensure one dependency, tenant, or feature cannot consume all resources and take down unrelated work.
</details>

<details><summary>4. Circuit breaker vs bulkhead: when do you use each?</summary>

Circuit breaker decides whether to call a dependency based on health. Bulkhead limits how much resource that dependency can consume. Use both: isolated pool plus fail-fast behavior when the dependency is unhealthy.
</details>

<details><summary>5. Give one safe fallback and one unsafe fallback.</summary>

Safe: recommendations service fails, show cached popular products. Unsafe: payment provider times out, assume payment succeeded. Correctness-critical flows should fail closed or go to reconciliation/manual review.
</details>

<details><summary>6. What is load shedding?</summary>

Deliberately rejecting or dropping lower-priority work when overloaded, before the system collapses. Examples: 429/503 with `Retry-After`, capped queues, dropping analytics, or virtual waiting rooms.
</details>

<details><summary>7. How do retries interact with circuit breakers?</summary>

Retries feed failure/timeout signals into the breaker, but once the breaker opens, retries should stop or go to fallback. Otherwise retries continue to overload the failing dependency.
</details>

<details><summary>8. How would you protect Adobe Connect meeting join from an optional transcript service?</summary>

Put transcript calls in a separate pool/queue, give them short deadlines, use a circuit breaker, and degrade by disabling or delaying transcripts. Meeting join and core signaling should not share the transcript pool.
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
| [Martin Fowler: CircuitBreaker](https://martinfowler.com/bliki/CircuitBreaker.html) | Whole article titled "CircuitBreaker"; focus on the state transition idea and fail-fast wrapper. The page exposes no useful static section headings beyond "Further Reading". | ~15 min |
| [Azure Architecture: Circuit Breaker pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker) | Exact headings: "Context and problem", "Solution", "Problems and considerations", "When to use this pattern", "Example"; also h3 "Flow A: Closed state", "Flow B: Open state", "Flow C: Half-Open state", "Components" | ~25 min |
| [Azure Architecture: Bulkhead pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead) | Exact headings: "Context and problem", "Solution", "Problems and considerations", "When to use this pattern", "Example", "Related resources" | ~20 min |
| [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/) | Read from "Causes of Cascading Failures and Designing to Avoid Them" through "Latency and Deadlines". Exact headings include "Server Overload", "Resource Exhaustion", "Service Unavailability", "Queue Management", "Load Shedding and Graceful Degradation", "Retries", "Latency and Deadlines" | ~35 min |

**Connects to:** [I2 Timeouts, retries and backoff](I2-Timeouts-Retries-Backoff.md) · [I4 Observability + SLOs](I4-Observability-SLOs.md) · [D1 Queues](../D-Async/D1-Queues.md) · [G3 Virtual waiting room](../G-Contention/G3-Virtual-Waiting-Room.md) · Questions: Payment (#16), Notification (#13), LeetCode (#19), Metrics monitoring (#20)