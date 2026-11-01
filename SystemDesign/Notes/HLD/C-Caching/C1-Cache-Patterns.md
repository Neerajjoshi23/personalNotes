# C1 · Cache Patterns: fast reads without lying too much

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** URL shortener (#1), Rate limiter (#2), Chat (#3), News feed (#4), Dropbox (#5), YouTube (#6), Web crawler (#7), Booking (#8), KV store (#10), Instagram (#11), Search (#17), Flash sale (#18), Metrics (#20).

---

## Why this topic matters

Caching is the highest-frequency system-design concept in the roadmap because almost every product is read-heavy somewhere. A cache stores a copy of data closer to the caller so the system avoids repeated expensive work.

But a cache is also a second copy of truth. The hard part is not putting Redis in the diagram. The hard part is explaining **what can be stale, for how long, and how the cache is invalidated**.

| Cache goal | Example |
|---|---|
| Reduce latency | profile page reads from Redis instead of Postgres |
| Reduce load | URL shortener redirects avoid hitting DB every request |
| Absorb spikes | feed cache handles celebrity traffic |
| Move data closer | CDN caches images/video chunks near users |
| Avoid recomputation | cache expensive ranking/search results |

**Interview line:** "I'll use cache-aside for read-heavy, slightly stale data with a TTL. The database remains the source of truth; the cache is an optimization, so misses and evictions are safe."

---

## Part 1: where caches live

Caching is not only Redis. It appears at every layer.

```text
Browser / client
   ↓
CDN / edge cache
   ↓
Load balancer / API gateway cache (sometimes)
   ↓
App in-memory cache
   ↓
Distributed cache (Redis/Memcached)
   ↓
Database buffer cache / OS page cache
   ↓
Disk / object storage
```

| Location | Good for | Example |
|---|---|---|
| Client/browser | static assets, API responses with clear freshness | React app caches user preferences |
| CDN | images, videos, JS/CSS, public GET responses | YouTube thumbnails, Instagram images |
| App memory | tiny hot config, per-process memoization | feature flags, compiled templates |
| Distributed cache | shared hot data across app servers | Redis for profiles/feed pages/session tokens |
| DB buffer cache | recently accessed pages/indexes | Postgres keeps B-tree pages in memory |

### Client cache

The fastest request is the one you do not send. Browsers cache assets using `Cache-Control`, `ETag` and service workers. For frontend system design, this connects to [C4 HTTP/CDN caching](C4-HTTP-CDN-Caching.md) and FE network/performance notes.

### CDN cache

CDNs cache public content close to users. They are ideal for immutable assets and media chunks. Use content-hashed URLs (`app.abc123.js`) so assets can be cached for a long time.

### In-process cache

A Node/Java service can keep small data in memory. This avoids network hops but is not shared between instances and disappears on restart. Use for stable config or very hot read-only data, not user-specific mutable truth.

### Distributed cache

Redis/Memcached sits between many app servers and the DB. It is shared, fast and supports TTLs. It introduces network calls and consistency questions, but it is the default interview cache.

### Database buffer cache

Databases already cache disk pages. Do not add Redis blindly if the DB can serve indexed reads from memory and the consistency cost is not worth it.

---

## Part 2: cache-aside, read-through, write-through, write-behind, write-around

### Cache-aside / lazy loading

The application owns cache reads/writes.

```text
read(key):
  v = cache.get(key)
  if v exists: return v
  v = db.get(key)
  cache.set(key, v, ttl)
  return v
```

Pros: simple, cache can be rebuilt from DB, only hot keys enter cache, works well with Redis.

Cons: first request after miss is slow, app code must handle caching, stale data possible after writes, cache stampede possible when hot key expires.

Use for profiles, URL mappings, product details, feed pages and most interview read caches.

### Read-through

The application asks the cache; the cache loads from DB on miss.

```text
App -> cache.get(key)
Cache miss -> cache loader -> DB -> cache -> App
```

Pros: app code simpler; caching logic centralized. Cons: cache layer needs DB loading logic; less common with plain Redis unless wrapped by a library.

### Write-through

Writes go to cache and DB synchronously before returning.

```text
App write -> cache -> DB -> ack
```

Pros: cache stays warm and consistent after writes. Cons: write latency higher; cache contains cold data that may never be read.

Use when reads immediately follow writes and you can pay write latency.

### Write-behind / write-back

Writes update cache first; cache flushes to DB asynchronously.

```text
App write -> cache ack
cache later -> DB
```

Pros: very low write latency; can batch writes. Cons: data loss if cache fails before flush; complex replay/recovery; source of truth becomes blurry. Use carefully for analytics/counters where loss/delay is tolerable, not for payments.

### Write-around

Writes go directly to DB and do not populate cache. Reads later load through cache-aside.

Pros: avoids polluting cache with data that may not be read. Cons: first read after write misses; read-your-writes may need leader/DB read. Good for write-heavy workloads with low immediate reread probability.

---

## Part 3: TTLs and invalidation

There are only two hard problems in computer science, and cache invalidation is the famous one because the cache is a copy. You must decide when it stops being trustworthy.

### TTL: time-based expiry

Every cache entry has an expiration time.

```text
cache.set("user:42", profile, ttl=5 minutes)
```

Pros: simple, bounds staleness, works even if invalidation messages are lost.

Cons: data can be stale until TTL expires, too short lowers hit ratio, too long causes stale UX, synchronized expiry can cause stampedes.

Use TTLs for data where bounded staleness is acceptable: feeds, profiles, product pages, counts.

### Explicit invalidation

On write, delete or update the cache entry.

```text
update DB user:42
cache.delete("user:42")
```

Deleting is often safer than updating because the next read reloads from the source of truth.

### Versioned keys

Put a version in the key:

```text
profile:user:42:v17
```

When data changes, bump version. Old cache entries become unreachable and expire naturally. This is common for derived/expensive objects and CDN asset hashes.

### Event-driven invalidation

Database change -> CDC/event -> cache invalidator deletes keys. Good for many services sharing a cache, but the invalidation stream must be reliable and idempotent.

---

## Part 4: consistency issues and classic races

### Stale reads

If cache TTL is 10 minutes, a user may see data up to 10 minutes old. That is fine for like counts; not fine for payment status after checkout.

Always classify data:

- **authoritative:** read DB/leader/transaction path;
- **cacheable with bounded staleness:** TTL/invalidation;
- **derived/approximate:** eventual is okay.

### Race: update DB then invalidate cache

Common pattern:

```text
1. write DB
2. delete cache
```

Race:

```text
T1 read miss -> reads old DB value
T2 writes new DB value -> deletes cache
T1 sets old value into cache after T2 delete
```

Now the cache contains stale data until TTL.

Mitigations: short TTL as safety net, delete cache before and after write (double delete) with delay, versioned values so old writes cannot overwrite newer versions, write-through for some paths, request coalescing to reduce races, or simply accept bounded staleness if product allows it.

### Cache stampede / thundering herd

A hot key expires. Thousands of requests miss and all hit DB.

Mitigations:

- per-key lock / request coalescing;
- stale-while-revalidate: serve stale value while one worker refreshes;
- random TTL jitter;
- prewarm hot keys;
- background refresh before expiry.

### Cache penetration

Requests for non-existent keys repeatedly miss cache and hit DB. Mitigate with negative-result caching with short TTL, Bloom filters for known existing keys, and rate limiting bad clients.

### Hot keys

One key receives too much traffic for one cache node. Mitigate with hot-key replication, local in-process cache for the hottest values, key splitting if the value can be partitioned, and [B6 Consistent hashing](../B-Data/B6-Consistent-Hashing.md) for distribution. Remember consistent hashing does not solve skew alone.

---

## Part 5: what to cache per question

| Question | Cache candidates | Notes |
|---|---|---|
| URL shortener (#1) | short code -> long URL; redirect metadata | very read-heavy; TTL long; DB source of truth |
| Rate limiter (#2) | counters/tokens in Redis | Redis is not just cache here; it is fast state with TTL |
| Chat (#3) | recent conversations, presence, user profiles | messages need durable store; presence can be approximate |
| News feed (#4) | home timeline pages, celebrity posts, user/profile data | stale feed acceptable; invalidate on follow/post carefully |
| Dropbox/Drive (#5) | metadata, thumbnails, CDN blobs | file bytes via CDN; metadata source in DB |
| YouTube (#6) | video chunks at CDN, metadata, recommendations | CDN is the main cache |
| Web crawler (#7) | DNS results, robots.txt, fetched URL dedup hints | respect TTL/politeness |
| Booking (#8) | availability display, seat map hints | final reservation must bypass/verify cache |
| KV store (#10) | cache is the product or layer | discuss eviction and consistency |
| Instagram (#11) | feed, media CDN, profiles | blob URLs should be cache-friendly |
| Search (#17) | popular queries/results | invalidate/recompute from index changes |
| Flash sale (#18) | product details, inventory hint | do not trust cache for final stock decrement |

**Interview line:** "I'll cache availability for fast browsing, but the checkout path revalidates against the transactional inventory store because cache can be stale."

---

## Part 6: hit ratio maths

Hit ratio is the fraction of requests served by cache.

```text
hit ratio = cache hits / total requests
miss ratio = 1 - hit ratio
```

Average latency:

```text
avg = hitRatio * cacheLatency + missRatio * missLatency
```

Example:

- Redis hit: 2 ms
- DB miss path: 50 ms
- hit ratio: 90%

```text
avg = 0.90 * 2 + 0.10 * 50 = 1.8 + 5 = 6.8 ms
```

At 99% hit ratio:

```text
avg = 0.99 * 2 + 0.01 * 50 = 2.48 ms
```

The jump from 90% to 99% is huge because misses are expensive.

### DB load reduction

If total QPS is 100,000 and hit ratio is 95%, DB sees:

```text
100,000 * (1 - 0.95) = 5,000 QPS
```

If hit ratio drops to 80%, DB sees 20,000 QPS: 4x more. This is why cache stampedes are dangerous.

### Cache size intuition

Caching works best with skewed popularity (Zipf distribution): a small fraction of keys receives most reads. Feeds, profiles, URLs and media often have skew. Uniform random access gets lower benefit unless the cache is very large.

---

## Part 7: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Read-heavy data, DB source of truth | Cache-aside + TTL | simple, rebuildable |
| Need cache always filled after write | Write-through | fresher reads, higher write latency |
| Can lose/delay writes, need speed | Write-behind | batch/fast, but dangerous for critical data |
| Avoid caching one-time writes | Write-around | prevents cache pollution |
| Public static/media content | CDN + immutable/versioned URLs | edge latency and bandwidth savings |
| Hot key expiring | stale-while-revalidate + jitter + coalescing | avoid stampede |
| Final payment/booking decision | bypass cache or verify source of truth | correctness over speed |
| Many services need invalidation | CDC/event invalidation + TTL safety net | reliable shared invalidation |

### Common interview traps

- Drawing Redis without saying cache-aside/read-through/write-through.
- Forgetting TTL and invalidation.
- Trusting cache for final inventory/payment correctness.
- Ignoring stampedes when hot keys expire.
- Caching data with low reuse and calling it an optimization.
- Assuming cache improves p99 if misses are very slow and synchronized.
- Not mentioning that DBs already have buffer caches.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Explain cache-aside in 20 seconds.</summary>

The app checks cache first. On hit, return. On miss, read from the database, store the value in cache with a TTL, then return it. On writes, update the DB and usually delete the cache key. The DB remains the source of truth.
</details>

<details><summary>2. Read-through vs cache-aside?</summary>

In cache-aside, the application handles misses and loads from DB. In read-through, the cache layer has a loader and fetches from DB itself. Read-through centralizes caching logic but makes the cache layer more complex.
</details>

<details><summary>3. Why is write-behind dangerous for payments?</summary>

Because the cache acknowledges before the durable DB write. If the cache fails or the async flush is lost, confirmed money state can disappear. Use durable transactional writes for payments.
</details>

<details><summary>4. What is cache stampede and how do you mitigate it?</summary>

A hot key expires and many requests miss at once, overwhelming the DB. Mitigate with per-key request coalescing, stale-while-revalidate, TTL jitter, prewarming and background refresh.
</details>

<details><summary>5. Give the race in "write DB then delete cache".</summary>

A reader misses and reads old DB value. A writer updates DB and deletes cache. The reader then sets the old value into cache after the delete. The stale value remains until TTL unless versioning/double-delete/other mitigation handles it.
</details>

<details><summary>6. If cache hit latency is 2 ms, miss path is 50 ms and hit ratio is 90%, what is average latency?</summary>

`0.9 * 2 + 0.1 * 50 = 6.8 ms`.
</details>

<details><summary>7. What should you cache in a ticket booking system?</summary>

Cache browsing data and availability hints/seat maps with short TTLs, but final seat hold/booking must verify and write to the transactional source of truth. Cache is not authoritative for scarce inventory.
</details>

<details><summary>8. Why can adding a cache make consistency worse?</summary>

It creates another copy of data. Reads may hit stale cache after DB updates, invalidation messages can fail, and races can repopulate old values. You need TTLs, invalidation strategy and clear source-of-truth boundaries.
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
| [Hello Interview: Caching](https://www.hellointerview.com/learn/system-design/core-concepts/caching) | Exact headings: "Where to Cache", "External Caching", "CDN (Content Delivery Network)", "Client-Side Caching", "In-Process Caching", "Cache Architectures", "Cache-Aside (Lazy Loading)", "Write-Through Caching", "Write-Behind (Write-Back) Caching", "Read-Through Caching", "Cache Eviction Policies", "TTL (Time To Live)", "Common Caching Problems", "Cache Stampede (Thundering Herd)", "Cache Consistency", "Hot Keys", "Caching in System Design Interviews" | ~35 min |
| [Azure Architecture: Cache-Aside pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside) | Exact headings: "Context and problem", "Solution", "Problems and considerations", "When to use this pattern", "Workload design", "Example" | ~15 min |
| [System Design Primer: Cache](https://github.com/donnemartin/system-design-primer#cache) | Exact heading: "Cache" plus subsections "Client caching", "CDN caching", "Web server caching", "Database caching", "Application caching", "Caching at the database query level", "Caching at the object level" | ~15 min |

**Connects to:** [B6 Consistent hashing](../B-Data/B6-Consistent-Hashing.md) · [B7 CAP + consistency](../B-Data/B7-CAP-Consistency.md) · [C2 Redis](C2-Redis.md) · [C3 Eviction + failure modes](C3-Eviction-Failure-Modes.md) · [C4 HTTP/CDN caching](C4-HTTP-CDN-Caching.md) · [D3 Delivery semantics + idempotency](../D-Async/D3-Delivery-Semantics-Idempotency.md) · Questions: URL shortener (#1), Rate limiter (#2), News feed (#4), Booking (#8), KV store (#10), Flash sale (#18)
