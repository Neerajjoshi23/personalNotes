# A1 · Delivery framework: make a 45-minute HLD feel controlled

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Every HLD question: URL shortener (#1), Chat (#3), News feed (#4), Dropbox (#5), YouTube (#6), Booking (#8), Payment (#16), ChatGPT (#24)

---

## Why this topic matters

System design interviews are not won by memorising one perfect architecture. They are won by **driving ambiguity**. The interviewer gives a product prompt and watches whether you can turn it into requirements, APIs, a first architecture, and high-signal deep dives.

---

## Part 1: delivery rhythm and time budget

The delivery framework is the difference between “I know components” and “I can run the interview.” Use it as a clock in your head, not as a script you refuse to leave.

| Time | Phase | What to say/draw |
|---:|---|---|
| 0–5 min | Requirements | 3–5 functional requirements, 3–5 NFRs, explicit out-of-scope |
| 5–7 min | Core entities | User, ShortUrl, Message, File, Booking, Payment… |
| 7–12 min | API / interface | 3–6 endpoints or operations with request/response shape |
| 12–25 min | High-level design | boxes + arrows for the main user flows |
| 25–42 min | Deep dives | scale, consistency, latency, failures, hot keys, abuse |
| 42–45 min | Recap | final design and trade-offs |

A strong opening for URL shortener:

> “Before designing Bitly, I’ll clarify scope. I assume authenticated users can create short links and anyone can redirect. I’ll ignore custom domains for now unless you want them. The system is read-heavy, so low redirect latency and high availability matter more than strongly consistent analytics.”

Functional requirements are product behaviours: create a short URL, redirect by short code, send a chat message, upload a file, reserve a seat. Non-functional requirements are quality constraints: scale, latency, availability, consistency, durability and security. Functional requirements decide **features**. NFRs decide **architecture**. A URL shortener with 100 redirects/day can be one DB table. A URL shortener with 100M redirects/day needs cache/CDN/read replicas and async analytics.

**Interview line:** “I’ll first lock the functional and non-functional requirements, then define the core entities and APIs. After that I’ll draw the happy-path design and use the remaining time for scale and failure deep dives.”

---

## Part 2: requirements → core entities

Once scope is clear, extract the nouns. This prevents vague APIs and random boxes.

| Question | Core entities |
|---|---|
| URL shortener (#1) | User, ShortUrl, RedirectEvent |
| Chat (#3) | User, Device, Conversation, Message, DeliveryReceipt |
| News feed (#4) | User, Post, FollowEdge, TimelineItem |
| Dropbox (#5) | User, File, FileVersion, Chunk, Folder |
| Booking (#8) | Show/Event, Seat/Room, Reservation, Payment |
| Payment (#16) | Account, LedgerEntry, Transaction, IdempotencyKey |

Entities are not always final database tables, but they usually become tables, documents, events, or cache keys. They also reveal hidden requirements. If `RedirectEvent` exists, analytics can be asynchronous. If `Device` exists in chat, multi-device delivery matters. If `Reservation` exists, there is probably a TTL and contention story.

**Interview line:** “The main entity is `ShortUrl`: it maps a generated code to a long URL, owner, creation time, expiry and status. I’ll model `RedirectEvent` separately so analytics writes never block redirects.”

---

## Part 3: API before boxes

APIs force precision. They define what clients ask for and what the system promises.

For HLD, APIs can be REST, RPC, events, WebSocket messages, or a mix. Include method, path/operation, key request fields, response shape, auth assumption, idempotency and pagination where relevant.

```http
POST /v1/short-urls
Authorization: Bearer <token>
Idempotency-Key: 6f9d...
Content-Type: application/json

{ "longUrl": "<long-url>", "customAlias": null, "expiresAt": null }

201 Created
{ "code": "aB91kZ", "shortUrl": "sho.rt/aB91kZ" }
```

```http
GET /{code}

302 Found
Location: <long-url>
```

Why 302? If mappings can expire, be abuse-blocked, or change policy, temporary redirect is safer. If the product guarantees permanent immutable links and wants browser caching, discuss 301 as an optimization.

Chat may expose HTTP for history and WebSocket for live send/receive:

```http
GET /v1/conversations/{id}/messages?pageSize=50&pageToken=...
POST /v1/conversations/{id}/messages
```

```json
{ "type": "send_message", "conversationId": "c1", "clientMessageId": "uuid", "text": "hi" }
```

This phase connects directly to [A6 API Design](A6-API-Design.md): cursor pagination, idempotency keys, rate-limit headers and error formats.

---

## Part 4: high-level design: first make it work

Most first designs share this shape:

```text
Client
  |
  v
DNS / CDN / Load Balancer
  |
  v
Stateless API servers
  |
  +--> Cache (Redis / CDN / local only for non-critical hints)
  +--> Primary database
  +--> Queue / stream for async work
```

Draw flows, not just boxes. Label arrows with actions:

```text
POST /short-urls
Browser -> LB -> API -> generate code -> DB write -> cache warm -> response

GET /abc123
Browser -> CDN/LB -> Redirect service -> Redis lookup -> DB fallback -> 302
                                             |
                                             +-> enqueue RedirectEvent
```

Do not add every component immediately. Start with the simplest design that satisfies the main use cases. Then scale the bottlenecks.

---

## Part 5: deep dives: where the score is made

Deep dives are where interviewers separate “knows components” from “can design systems”. The pattern:

1. State the problem.
2. Give a simple solution.
3. Name its weakness.
4. Improve it.
5. State the trade-off.

| Category | Prompt | What to discuss |
|---|---|---|
| Scale | “What if traffic is 100x?” | QPS, cache hit rate, sharding, queues |
| Latency | “Redirects must be fast” | CDN/cache, indexes, connection reuse |
| Consistency | “Can two users book the same seat?” | transactions, locks, idempotency |
| Availability | “What if DB/cache dies?” | replicas, failover, graceful degradation |
| Hot keys | “One link/user goes viral” | CDN, cache replication, rate limits |
| Abuse/security | “Spam links?” | validation, scanning, throttling, status flags |
| Observability | “How do we know?” | metrics, logs, traces, SLOs |

Example answer fragment:

> “Redirects are read-heavy, so I’ll cache `code -> longUrl` in Redis. On miss, the service reads the DB and fills the cache with a TTL. A hot viral code can overload one Redis shard, so for extremely popular stable links I’d cache at CDN/edge too. The trade-off is invalidation speed if a link is disabled.”

---

## Part 6: why URL shortener is the Module A capstone

URL shortener (#1) is the cleanest first full HLD because it forces the whole framework without too much domain knowledge:

```text
requirements -> entities -> API -> HLD -> code generation/cache/analytics/failure deep dives
```

The full walkthrough below replaces memorised diagrams with an interview flow. Treat it as a 45-minute script you can adapt, not as a fixed architecture. The important habit is to justify every component: DB for durable mappings, cache/CDN for redirect latency, queue for analytics, and idempotency for create retries.

---


## Part 7: full 45-minute walkthrough - URL shortener (#1)

Use URL shortener as your first Module A mock because it touches almost every framework step without requiring deep data-system tricks.

### 0-5 min: real requirements

Functional requirements:

| Requirement | Why it matters |
|---|---|
| Authenticated user creates a short URL from a long URL | primary write flow |
| Anyone with the short URL is redirected | primary read flow; public endpoint |
| User can optionally set expiry | affects cache TTL and DB status checks |
| System records redirect analytics | creates async write path |
| User can list/manage their links | requires owner metadata and auth APIs |

Non-functional requirements:

| NFR | Design consequence |
|---|---|
| Redirect p95 under ~100 ms in-region | cache `code -> longUrl`, keep DB off hot path |
| Very high availability for existing links | stateless redirect tier, replicas, graceful cache/DB degradation |
| Read-heavy: redirects >> creates | optimize redirect path before create path |
| Durable mappings | DB is source of truth; cache is not |
| Abuse control | status flags, rate limits, URL validation, async scanning |
| Analytics can be eventually consistent | queue/stream events; never block redirects on analytics |

Out of scope unless interviewer asks: custom domains, QR codes, billing plans, full malware crawler, legal takedown workflow, exact analytics dashboard UX.

**Interview line:** "For this product, redirect latency and availability are more important than real-time analytics accuracy, so I will keep analytics off the synchronous redirect path."

### 5-10 min: entities and API

Core entities:

```text
User(id, email, plan, createdAt)
ShortUrl(code, longUrl, ownerId, createdAt, expiresAt, status, createdByRequestId)
RedirectEvent(eventId, code, ts, ipPrefix, userAgent, referrer)
DailyLinkStats(code, day, clicks, uniqueApprox, topReferrers)
```

API sketch:

```http
POST /v1/short-urls
Authorization: Bearer <token>
Idempotency-Key: <uuid>
Content-Type: application/json

{ "longUrl": "https://example.com/a/very/long/path", "customAlias": null, "expiresAt": "2027-01-01T00:00:00Z" }

201 Created
{ "code": "aB91kZ", "shortUrl": "https://sho.rt/aB91kZ" }
```

```http
GET /aB91kZ

302 Found
Location: https://example.com/a/very/long/path
Cache-Control: no-store
```

Use `301` only if the product guarantees immutable permanent redirects and is comfortable with browser/proxy caching. Use `302`/`307` when links can be disabled, expire, or need policy checks. For management/analytics:

```http
GET /v1/short-urls?pageSize=50&pageToken=...
DELETE /v1/short-urls/{code}
GET /v1/short-urls/{code}/analytics?from=2026-09-01&to=2026-09-30&pageSize=100&pageToken=...
```

Link this back to [A6 API Design](A6-API-Design.md): idempotency keys for safe retries, cursor pagination for analytics, and predictable error bodies.

### 10-25 min: HLD diagram

```text
Create flow
----------
Browser
  -> DNS / CDN / L7 gateway
  -> ShortUrl API
  -> Idempotency table check
  -> Code generator (random Base62 or ID -> Base62)
  -> ShortUrl DB primary
  -> optional Redis warm
  -> 201

Redirect flow
-------------
Browser / mobile app
  -> DNS / CDN / regional LB
  -> Redirect service (stateless)
  -> Redis cluster lookup: short:{code}
       | hit
       v
     302 Location
       |
       +-> fire-and-forget event -> Kafka/queue -> analytics workers -> aggregates DB

       miss
       v
     ShortUrl DB read by code -> fill Redis with TTL -> 302
```

Keep the synchronous redirect path small: validate code, lookup mapping, check status/expiry, return redirect, emit analytics event without waiting for aggregation. For DB, a relational table with unique index on `code` is fine at Module A depth; later [B5 Sharding](../B-Data/B5-Sharding.md) covers splitting by code/hash if storage/write throughput requires it.

### Deep dive 1: code generation

| Option | How | Pros | Cons |
|---|---|---|---|
| Random Base62 | generate 6-8 chars, retry on collision | no coordination, hides volume | collision handling, needs enough entropy |
| DB sequence / Snowflake -> Base62 | unique numeric ID encoded | no collisions, easy | may reveal growth; generator availability |
| Hash long URL | hash and truncate | deterministic | collisions, privacy leaks, bad for duplicate-but-owned links |
| Custom alias | user supplied | product-friendly | namespace contention, abuse, validation |

For a 7-character Base62 code, the space is roughly `62^7 ~= 3.5T`, enough for many millions of links with low collision probability. Still, implement uniqueness with a DB constraint and retry. Custom aliases use the same unique index and return `409 Conflict` if taken.

**Interview line:** "I will rely on a unique DB constraint for final collision safety; the generator should make collisions rare, not impossible by itself."

### Deep dive 2: hot redirects, cache invalidation and analytics

Hot link problem:

```text
viral code -> many clients -> one Redis key / one DB row becomes hot
```

Mitigations:

- cache the mapping in Redis with TTL; use request coalescing on miss to avoid stampede
- for public stable links, cache at CDN/edge with short TTL or surrogate-key invalidation
- replicate hot cache keys or use local in-process read-through cache for very short TTL hints
- rate-limit suspicious redirect patterns separately from normal viral traffic

Invalidation trade-off: if a link is disabled for abuse, stale cache must not keep redirecting for minutes. Keep TTL short enough for policy needs, delete Redis key on status change, and reserve CDN caching for links whose disable latency is acceptable.

Analytics should be at-least-once and eventually consistent. Add `eventId` or `(code, timestamp bucket, request id)` to dedupe if needed, and aggregate into hourly/daily buckets. The redirect should not wait for analytics workers; if the queue is down, choose a policy: drop low-value events with metrics, buffer briefly, or degrade redirect only if compliance requires every click.

---

## Part 8: what interviewers score - mid vs senior

| Area | Mid-level signal | Senior signal |
|---|---|---|
| Requirements | Lists features and scale | separates must-have, out-of-scope, and product trade-offs |
| API | Names endpoints | includes idempotency, pagination, status codes, retry semantics |
| Diagram | Draws common boxes | labels flows, critical paths, and source of truth |
| Data | Picks a DB | explains access pattern, indexes, cache/source-of-truth boundary |
| Scale | Adds cache/LB | estimates QPS, identifies hot keys and bottlenecks |
| Reliability | Mentions replicas | discusses failure modes and graceful degradation |
| Communication | Answers questions | drives the interview, summarizes decisions, handles pushback calmly |

At senior level, the architecture does not need to be exotic. It needs to be defensible. When you add a component, say what bottleneck or failure mode it solves. When you make a trade-off, say what you are giving up.

**Interview line:** "I am choosing the simpler design first; if the estimate shows the DB primary is the bottleneck, I will introduce sharding. I do not want to pay sharding complexity before the numbers require it."

---

## Part 9: handling interviewer pushback

Pushback is not failure; it is the real interview. Treat it as a signal to deepen.

| Pushback | Strong response |
|---|---|
| "What if the link goes viral?" | move from Redis to CDN/edge for public stable redirects; discuss hot-key mitigation and invalidation |
| "What if cache is down?" | DB fallback with rate limits/load shedding; maybe serve only active popular links from local cache briefly |
| "How do you prevent duplicate creates on retry?" | `Idempotency-Key` + request hash + stored response; unique constraint on custom alias |
| "Can analytics be exact?" | exact raw events are expensive; aggregates can be eventually consistent; use dedupe if billing depends on it |
| "Why not hash the long URL?" | deterministic but collision/privacy/product issues; owners may want separate short links for the same URL |
| "What about malicious links?" | validation, rate limits, status flags, async scanner, takedown workflow, safe interstitial if needed |

The pattern: restate the concern, adjust the design, name the trade-off. Do not defend the first design blindly.

---

## Part 10: 45-minute split and failure-mode pass

Use the roadmap split exactly for practice:

```text
0-5    requirements
5-10   entities + API
10-25  high-level design
25-40  deep dives
40-45  wrap-up + failures + trade-offs
```

Failure-mode checklist for URL shortener:

| Failure | Expected behaviour | Design response |
|---|---|---|
| Cache down | redirects still work but slower | DB fallback, circuit breaker, rate limit, protect DB |
| DB primary down | creates paused/degraded; redirects may still work from cache/read replica | failover, replicas, clear user-facing error for create |
| Queue backed up | redirects continue; analytics delayed | queue lag metric, autoscale workers, DLQ, drop policy for low-value events |
| Slow dependency | avoid cascading latency | timeouts, retries with backoff, circuit breaker; see [I2 Timeouts/retries](../I-Reliability/I2-Timeouts-Retries-Backoff.md) |
| Region down | route to another region if data replicated | DNS/global LB limits; define RPO/RTO; see [I6 Multi-region DR](../I-Reliability/I6-Multi-Region-DR.md) |
| Client retries | duplicate create/message/payment risk | idempotency keys; safe retry status codes |

A good wrap-up sounds like this:

> "We have a stateless create API and redirect service, durable mappings in a DB, Redis/CDN for read latency, and async analytics. The main trade-offs are cache invalidation for disabled links, code-generation strategy, and eventual analytics. For failures, redirects degrade better than creates because hot mappings can still be served from cache."

---

## Part 11: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Prompt is vague | Clarify requirements first | Prevents designing the wrong product |

### Common interview traps
- Drawing boxes before scope is clear.

---

## Self-test (answer out loud first, then open)

<details><summary>1. In the first 5 minutes of URL shortener, what functional and non-functional requirements would you lock?</summary>

Functional: create short link, redirect by code, optional expiry/manage links, analytics. NFRs: read-heavy, low redirect latency, high availability for existing links, durable mappings, abuse control, eventually consistent analytics.
</details>

<details><summary>2. Why define entities before drawing boxes?</summary>

Entities reveal the product nouns and hidden requirements. `RedirectEvent` implies async analytics; `ShortUrl.status` implies cache invalidation; `IdempotencyKey` implies safe retries.
</details>

<details><summary>3. What is the core URL shortener redirect path?</summary>

Client -> DNS/LB/CDN -> stateless redirect service -> Redis lookup -> DB fallback on miss -> return 302 -> emit analytics event asynchronously.
</details>

<details><summary>4. Give two valid code-generation strategies and their trade-offs.</summary>

Random Base62 is simple and hides volume but needs collision retry. Sequence/Snowflake encoded Base62 avoids collisions but may reveal volume and depends on generator availability.
</details>

<details><summary>5. How do you answer “what if the cache is down?”</summary>

Redirects should fall back to DB reads with circuit breakers, rate limits and load shedding to protect the DB. Creates should not depend on cache. Hot links may use CDN/local short TTL cache as an extra layer.
</details>

<details><summary>6. What separates a mid-level from a senior HLD answer?</summary>

Senior answers drive trade-offs: requirements, source of truth, estimates, failure modes, consistency, observability, and why each component exists. Mid-level answers often stop at naming components.
</details>

<details><summary>7. Why is analytics not on the synchronous redirect path?</summary>

Users need fast redirects; analytics can be eventually consistent. Emit an event to a queue/stream and aggregate asynchronously, handling duplicates if needed.
</details>

<details><summary>8. What should you do when the interviewer pushes back?</summary>

Restate the concern, modify the design, and state the trade-off. Example: for viral links, add CDN/edge caching but discuss invalidation for disabled links.
</details>

<details><summary>9. Recite the 45-minute HLD split.</summary>

Requirements 5, entities + API 5, HLD 15, deep dives 15, wrap-up 5.
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
| [Hello Interview: Delivery](https://www.hellointerview.com/learn/system-design/in-a-hurry/delivery) | Full page | ~35 min |
| [Hello Interview: Introduction](https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction) | Exact sections: “What are system design interviews?”, “Types of System Design Interviews”, “Assessment”, “How to Use This Guide” | ~15 min |
| [Hello Interview: Bitly](https://www.hellointerview.com/learn/system-design/problem-breakdowns/bitly) | “Understanding the Problem”, “The Set Up”, “High-Level Design”, “Potential Deep Dives” | ~35 min |
| **Alex Xu Vol 1, ch 3: A Framework for System Design Interviews** | “A 4-step process for effective system design interview” and Step 1–4 | [PDF p.42](<../../../Books/System Design Interview Vol 1 - Alex Xu.pdf#page=42>) |

**Connects to:** [A2 Request Flow](A2-Request-Flow.md) · [A5 Latency Estimation](A5-Latency-Estimation.md) · [A6 API Design](A6-API-Design.md) · [A7 Scaling Basics](A7-Scaling-Basics.md) · [B5 Sharding](../B-Data/B5-Sharding.md) · [C1 Cache Patterns](../C-Caching/C1-Cache-Patterns.md) · [D1 Queues](../D-Async/D1-Queues.md) · URL shortener (#1)

**Practice drill:** take any Tier-1 question, speak the first 7 minutes out loud, and stop before drawing. If you cannot produce requirements, entities and APIs without boxes, your design will probably drift later. The framework is a forcing function for clarity.
