# A7 · Scaling basics: the zero-to-millions story every design reuses

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Every HLD question; especially URL shortener (#1), News feed (#4), Dropbox (#5), YouTube (#6), Instagram (#11), KV store (#10)

---

## Why this topic matters

Scaling basics are the common skeleton under most answers. Start with one server, then split responsibilities as load, data and failure risk grow.

```text
single server
 -> separate database
 -> vertical scale
 -> horizontal app tier + load balancer
 -> cache
 -> CDN
 -> read replicas
 -> queues
 -> sharding preview
```

**Interview line:** “I’ll start with the simplest working design, then scale the bottleneck: app CPU with stateless horizontal servers, read latency with cache/replicas, static bytes with CDN, and heavy async work with queues.”

---

## Part 1: stage 0 — one server, then separate app and DB

Start small:

```text
Browser -> Single server
             |-- web/app code
             |-- database
             |-- local files
             |-- process memory cache
```

Fine for prototypes; bad for availability and independent scaling. Server dies, everything dies; app CPU competes with DB; disk fills with uploads; deploys restart everything.

The first production split is usually:

```text
Browser -> App server -> Database server / managed DB
```

Benefits: app and DB scale independently, DB gets storage-optimized hardware, app deploys do not restart DB, backups/security improve. Vertical scaling is valid early because it is simple, but it does not remove the single point of failure or give rolling deploys.

Trigger to move on: deploys/restarts are risky, app CPU and DB IO need independent scaling, local disk is unsafe, max instance size is near, or the machine is too large a failure domain.

---

## Part 2: stage 1 — stateless app tier + load balancer

```text
             +--> App 1
Browser -> LB +--> App 2 -> DB
             +--> App 3
```

Stateless means any app server can handle any request and can disappear without losing required state. Sessions move to signed cookies/Redis/DB, uploads to object storage, background work to queues, shared cache to Redis/Memcached, and WebSocket routing to a connection service plus pub/sub.

This enables horizontal scaling, rolling deploys, health checks and recovery. Sticky sessions are a fallback, not the default.

Trigger: app CPU, rolling deploys, availability, p95 latency under burst, or one app can no longer handle request/concurrency headroom.

**Interview line:** "I'll keep the app tier stateless so the load balancer can send any request to any healthy server; session state lives in Redis or signed cookies."

---

## Part 3: stage 2 — shared state, object storage and cache

Once there are multiple app instances, local state starts lying.

```text
Users -> LB -> App replicas -> DB
                  |-> Redis (sessions/cache)
                  \-> Object storage (uploads)
```

Shared state/object storage triggers: users lose sessions during deploy, uploads disappear when the next request hits another instance, cron runs on every instance, or cache hit rate differs per instance.

Cache hot reads with cache-aside: app checks Redis, returns on hit, queries DB on miss, writes cache with TTL, then returns. Cache URL mappings, profiles, product catalog, timelines, sessions or rate counters. Risks: staleness, stampede, hot keys, cache outage and invalidation complexity.

Trigger: repeated hot reads, high DB CPU, p95 read latency, or viral keys. DB remains source of truth; on cache outage, degrade with DB reads and rate limits rather than failing every request.

---

## Part 4: stage 3 — CDN for edge bytes

```text
User -> CDN edge -> origin only on miss
API  -> LB -> apps -> DB
```

Use CDN for hashed JS/CSS/images, videos, thumbnails, public files and sometimes stable public redirects. React deploy pattern: short-TTL `index.html`, long-TTL immutable hashed assets, media on CDN/object storage, and API JSON private unless designed otherwise.

Trigger: images/videos/downloads dominate bandwidth, global users see high RTT, or origin/app servers are relaying bytes. For YouTube/Netflix-style systems, CDN/object storage is core architecture.

---

## Part 5: stage 4 — read replicas

```text
Writes -> Primary DB -> replicas
Reads  -> replicas when staleness is acceptable
```

Replicas scale reads and improve availability, but asynchronous replication means lag. Feed reads can tolerate seconds of staleness; read-your-own-profile after update may need primary. Payments/bookings should not use stale replicas for correctness decisions.

Trigger: reads overwhelm the primary after cache, reporting/admin queries hurt OLTP, or availability requires failover. Whenever you say "read replicas", immediately say how you handle read-your-own-writes or why staleness is acceptable.

---

## Part 6: stage 5 — queues and workers

```text
API writes durable state -> enqueue job -> return
Workers process -> update status -> notify user
```

Use queues for email/push, feed fan-out, video transcoding, crawling, analytics, retries and long LLM jobs.

Benefits: load leveling, retries, DLQs, independent worker scaling, lower request latency. Costs: eventual consistency, duplicates, queue lag, debugging complexity. Make consumers idempotent.

Trigger: user request waits on slow side effects, burst traffic overloads downstreams, or work needs retries/DLQ. Do not queue work the user needs synchronously to continue, such as many payment authorization decisions.

---

## Part 7: stage 6 — sharding and multi-region

Sharding splits data across machines:

```text
App -> shard router
        |-- DB shard 0 (users/code hash range)
        |-- DB shard 1
        |-- DB shard 2
        |-- DB shard 3
```

It solves write throughput and storage beyond one primary. It adds shard-key choice, hot shards, resharding, cross-shard queries/transactions and secondary-index complexity. Do not shard before estimates justify it.

Good preview language:

> "At this scale I'd first use cache and replicas. If the primary write/storage load exceeds one DB, the next step is sharding by user ID/conversation ID/code depending on access pattern."

Multi-region/DR comes later for region outage requirements, global latency, regulatory locality, or 99.99%+ availability targets. Define RTO/RPO; do not casually say active-active without conflict handling.

---

## Part 8: autoscaling and statelessness pitfalls

Autoscaling signals: CPU for CPU-bound APIs, memory for connection-heavy services, request rate/concurrency for stateless HTTP, p95/p99 for user SLOs, queue lag for workers, and custom metrics for domain-specific work. Each signal has caveats: CPU misses IO saturation, latency can scale too late, and queue consumers can outrun downstream capacity.

Autoscaling needs headroom and cooldowns. Scaling from 3 to 30 instances is not instant if boot, warmup, JIT, connection pools, cache warm and quotas take minutes.

Statelessness pitfalls:

| Pitfall | Fix |
|---|---|
| in-memory sessions | signed cookies, Redis/session store |
| local uploads | direct object storage/presigned URLs |
| in-memory cache as truth | Redis/DB source of truth |
| cron on every instance | scheduler/leader election |
| local rate limiter only | shared Redis/distributed limiter |
| WebSocket state only in process | registry + pub/sub/backplane |

**Interview line:** "Horizontal scaling only works if an instance can disappear. Anything that must survive a restart belongs outside the app process or has a recovery story."

---

## Part 9: one story — URL shortener from zero to millions

```text
1. One app + DB: create and redirect work at tiny scale.
2. Split DB / managed storage: durable mappings and backups.
3. LB + stateless app replicas: redirect CPU, deploy safety and app availability.
4. Redis cache: hot `code -> longUrl` reads avoid DB.
5. CDN edge: viral stable links served near users, with invalidation trade-off.
6. Queue: click analytics and abuse scanning are async.
7. Read replicas: admin/reporting reads avoid primary where staleness is fine.
8. Shard by code/hash: only when storage/write estimates exceed one primary.
9. Multi-region: only if RTO/RPO/global latency justify it.
```

At each step, name the trigger. "I add Redis because redirect reads are hot" is stronger than "then add Redis because every design has Redis." The same story adapts: feed caches timelines and queues fan-out; YouTube uses CDN/object storage and transcode queues; Dropbox stores chunks in object storage.

The key habit: each component must answer "what bottleneck or failure mode does this solve?" If you cannot answer, leave it out until the design needs it.

---

## Part 10: choosing in an interview / cheat sheet

| Bottleneck | Move | Why |
|---|---|---|
| one-box failure domain | split app/DB, backups | safer production baseline |
| app CPU / app SPOF | horizontal stateless app tier + LB | scale out + availability |
| local state | Redis/session store/object storage/queue | instances can disappear |
| DB reads | cache then replicas | reduce DB pressure |
| static/media bytes | CDN + object storage | offload bandwidth |
| slow background work | queue + workers | remove from request path |
| DB write/storage limit | sharding | split data |
| global latency/DR | regional placement or multi-region | reduce RTT / survive region loss |
| correctness | transactions/idempotency | scale is not the fix |

### Common interview traps

- Sharding before cache/replicas/estimates.
- Horizontal apps with in-memory sessions.
- Accidentally making cache the source of truth.
- Ignoring replica lag.
- Queueing synchronous user-critical work.
- Serving large media through app servers.
- Treating vertical scaling as always wrong.
- Saying active-active multi-region without conflict/RTO/RPO details.

## Self-test (answer out loud first, then open)

<details><summary>1. What trigger moves you from one server to separate app and DB?</summary>

App CPU and DB IO need independent scaling, deploys/backups/security become risky, or one machine is too large a failure domain.
</details>

<details><summary>2. What does “stateless app tier” really mean?</summary>

Any instance can handle any request and can disappear without losing required state. Sessions, uploads, jobs and durable caches live outside the process.
</details>

<details><summary>3. Name four statelessness pitfalls.</summary>

In-memory sessions, local uploads, in-memory cache as source of truth, cron running on every instance, local-only rate limiter, WebSocket state with no resume/backplane.
</details>

<details><summary>4. When do you add cache vs read replicas?</summary>

Add cache for repeated hot reads and low latency. Add replicas when broader read volume/reporting/availability needs remain, while handling replication lag.
</details>

<details><summary>5. What trigger forces queues/workers?</summary>

Slow side effects, burst smoothing, retries/DLQ, fan-out, video transcoding, notifications, indexing or analytics that should not block user requests.
</details>

<details><summary>6. Why not shard before cache/replicas/estimates?</summary>

Sharding adds resharding, hot-key, cross-shard query and transaction complexity. Use it when one primary cannot handle write/storage needs.
</details>

<details><summary>7. Which metrics can autoscaling use?</summary>

CPU, memory, request rate/concurrency, p95/p99 latency, queue lag and domain-specific custom metrics. Each has caveats and needs cooldown/headroom.
</details>

<details><summary>8. Why is cron on every instance dangerous?</summary>

Each instance may run the same job, causing duplicate emails, payments or cleanup. Use one scheduler, leader election, leases or an external workflow system.
</details>

<details><summary>9. Recite the zero-to-millions path.</summary>

Single server -> separate DB -> vertical scale -> stateless apps + LB -> shared state/object storage -> cache -> CDN -> read replicas -> queues -> sharding -> multi-region/DR.
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
| **Alex Xu Vol 1, ch 1: Scale From Zero To Millions** | Exact sections: “Single server setup”, “Database”, “Vertical scaling vs horizontal scaling”, “Load balancer”, “Database replication”, “Cache”, “Content delivery network”, “Stateless web tier”, “Data centers”, “Message queue”, “Logging, metrics, automation”, “Database scaling” | [PDF p.5](<../../../Books/System Design Interview Vol 1 - Alex Xu.pdf#page=5>) |
| [System Design Primer: Design a system that scales to millions of users on AWS](https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/scaling_aws/README.md) | Exact sections: “Step 1: Outline use cases and constraints”, “Step 2: Create a high level design”, “Step 3: Design core components”, “Step 4: Scale the design”, “Additional talking points” | ~35 min |
| [System Design Primer: Load balancer](https://github.com/donnemartin/system-design-primer#load-balancer) | Refresh for horizontal app tier | ~10 min |
| [System Design Primer: Content delivery network](https://github.com/donnemartin/system-design-primer#content-delivery-network) | Refresh for CDN stage | ~10 min |

**Connects to:** [A1 Delivery Framework](A1-Delivery-Framework.md) · [A2 Request Flow](A2-Request-Flow.md) · [A4 DNS/CDN/LB/Proxy](A4-DNS-CDN-LoadBalancer-Proxy.md) · [A5 Latency Estimation](A5-Latency-Estimation.md) · [B4 Replication](../B-Data/B4-Replication.md) · [B5 Sharding](../B-Data/B5-Sharding.md) · [C1 Cache Patterns](../C-Caching/C1-Cache-Patterns.md) · [D1 Queues](../D-Async/D1-Queues.md) · [E2 Scaling WebSockets](../E-Realtime/E2-Scaling-WebSockets.md) · [I1 Leader Election](../I-Reliability/I1-Leader-Election.md) · URL shortener (#1)
