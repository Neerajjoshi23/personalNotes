# C3 · Eviction + cache failure modes: when the cache becomes the outage

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Rate limiter (#2), News feed (#4), Web crawler (#7), Distributed cache / KV store (#10), Instagram (#11), Flash sale (#18)

---

## Why this topic matters

Caching is easy to add and hard to operate. A cache can save your database, but the same cache can also create a bigger outage than no cache at all: every key expires together, one hot key overloads one shard, nonexistent IDs bypass the cache, or Redis evicts the wrong data.

Interviewers ask this after you say "I'll add Redis":

| Failure mode | What happens |
|---|---|
| Eviction surprise | Redis removes data earlier than your app expected |
| Thundering herd / stampede | Many clients miss the same key and all hit the DB |
| Hot key | One key gets huge QPS and overloads one cache node |
| Cache penetration | Requests for nonexistent data bypass cache forever |
| Cache avalanche | Many keys expire together; DB sees a traffic cliff |
| Cold start | Cache begins empty after deploy/failover and DB takes all load |
| Consistency failure | Cache returns stale data or overwrites fresher data |

**Interview line:** "A cache improves average latency only if I also design the miss path, expiry strategy, hot-key handling and invalidation story. Otherwise the cache just moves the bottleneck."

---

## Part 1: eviction policies and what Redis actually removes

Eviction is what happens when Redis hits `maxmemory` and needs room for new writes. Expiration is what happens when a key's TTL ends. They interact, but they are not the same.

```
Memory pressure? yes
        |
        v
Redis chooses victim keys using maxmemory-policy
        |
        +-- allkeys-*    -> any key can be evicted
        +-- volatile-*   -> only keys with TTL can be evicted
        +-- noeviction   -> writes that need memory fail
```

### The Redis policy families

| Policy | Meaning | When it fits |
|---|---|---|
| `noeviction` | Don't evict; return errors for memory-growing writes | Redis is not purely a cache; app must handle write failure |
| `allkeys-lru` | Evict approximately least recently used key among all keys | General cache default |
| `allkeys-lfu` | Evict approximately least frequently used key among all keys | Stable skew: a few keys stay hot for long periods |
| `allkeys-random` | Evict random keys | Uniform-ish access, rarely the best interview answer |
| `volatile-lru` | Evict LRU only among keys with TTL | Mixed cache + persistent keys in one instance |
| `volatile-lfu` | Evict LFU only among keys with TTL | Mixed instance with frequency skew |
| `volatile-ttl` | Evict expiring keys with shortest remaining TTL | You deliberately set TTLs to encode importance |

The `volatile-*` policies can behave like `noeviction` if there are no TTL keys. That is a common production footgun: you thought Redis would evict, but the keys eligible for eviction are not the keys consuming memory.

### LRU vs LFU vs TTL

LRU says "recently used data is likely to be reused." LFU says "frequently used data is likely to stay useful." TTL says "the app knows when data becomes less valuable."

| Access pattern | Better policy | Why |
|---|---|---|
| News feed cache, product pages, user profiles | `allkeys-lru` | recent access predicts next access |
| Long-lived celebrity profiles or top leaderboard pages | `allkeys-lfu` | frequency matters more than recency |
| Temporary API responses with clear freshness windows | TTL + `allkeys-lru` | expiry handles correctness; LRU handles memory |
| Mixed cache and non-cache state | separate Redis instances if possible | simpler than `volatile-*` surprises |

Redis' LRU/LFU are approximate for memory efficiency. That is fine for a cache, but do not describe it as a perfect textbook LRU.

### Expiration is not an invalidation strategy by itself

TTL is a safety net, not a correctness proof. If a user updates their profile and the cache has `profile:42` with 10 minutes left, reads may be stale for 10 minutes unless you delete/update the key.

Common patterns:

- **Cache-aside + delete on write:** update DB, then delete cache key. Next read refills.
- **Write-through:** write cache and DB through one path.
- **Short TTL:** accept bounded staleness.
- **Versioned keys:** `profile:42:v18`, useful for immutable-ish objects or static assets.

For most HLD answers, cache-aside + delete-on-write + TTL is the simple, defensible default.

---

## Part 2: thundering herd and cache stampede

A stampede happens when many clients miss the same key and all regenerate it at once.

```
             hot key expires
                   |
  10,000 clients request feed:celebrity
                   |
        all MISS Redis at same time
                   |
        all query DB / render service
                   |
               DB melts
```

This is especially common for:

- homepage/feed keys;
- celebrity profile/feed keys;
- product detail pages during a sale;
- expensive aggregation results;
- config keys read by every app server.

### Fix 1: request coalescing inside the app

If 100 requests on the same app server miss `feed:virat`, only one should fetch from DB; the others wait for that promise.

```ts
const inflight = new Map<string, Promise<string>>();

async function cachedGet(key: string, load: () => Promise<string>) {
  const cached = await redis.get(key);
  if (cached) return cached;

  if (!inflight.has(key)) {
    inflight.set(key, load().then(async value => {
      await redis.set(key, value, { EX: 300 });
      return value;
    }).finally(() => inflight.delete(key)));
  }
  return inflight.get(key)!;
}
```

This only coalesces per process. It is cheap and often enough when you have many requests per app instance.

### Fix 2: distributed lock around regeneration

One worker gets `SET lock:key token NX PX 5000`, regenerates, fills cache, releases lock safely with token check. Others either wait briefly, return stale data, or retry.

Do not make every request block forever on a lock. Use a short lock TTL and a fallback.

```
MISS
 |
 +-- acquire lock? yes -> rebuild -> SET cache -> release
 |
 +-- no lock -> serve stale if available, or wait+jitter, or fail soft
```

Locks prevent DB overload but can create lock contention. For correctness-critical locks, see [G2 Distributed locks](../G-Contention/G2-Distributed-Locks-Reservations.md); for cache rebuilds, the lock is an efficiency tool.

### Fix 3: stale-while-revalidate

Store two notions of time:

- soft expiry: after this, data is stale but serveable;
- hard expiry: after this, data must not be served.

When a request arrives after soft expiry, return stale data immediately and trigger a background refresh. This is excellent for feeds, recommendations and dashboards where a slightly old response is better than a DB storm.

### Fix 4: probabilistic early expiration ⏭ *Skip for interviews*

Instead of letting everyone refresh at exactly `ttl=0`, start refreshing probabilistically as the key gets old. High-QPS keys are likely to refresh before expiry; low-QPS keys can expire normally.

Interview phrasing:
> "For very hot keys, I won't wait for hard TTL. I'll refresh early with jitter/probability so regeneration is spread over time."

You do not need to derive the math in an HLD interview. The concept matters: avoid synchronized misses.

---

## Part 3: hot keys

A hot key is a key whose QPS is too high for one cache node or one shard. Redis Cluster does not automatically split one key; `celebrity:feed` still maps to one slot.

Examples:

- a World Cup live score key;
- a celebrity's latest post;
- a flash-sale product inventory display;
- a meeting room state key for a huge Adobe Connect webinar;
- a DrawBoard document with many viewers reading the same snapshot.

### Mitigation options

| Fix | How | Trade-off |
|---|---|---|
| Local in-process cache | each app keeps hot value for 1-5 seconds | possible staleness per instance |
| Read replicas | route reads to Redis replicas | async replicas can lag; still limited by replicas |
| Key splitting | duplicate value across `key:0..N` and randomly read | writes/invalidation fan out to N keys |
| CDN / edge cache | push public data closer to users | only works for cacheable HTTP content |
| Precompute fan-out | store per-user or per-region copies | higher write/storage cost |

Key splitting example:

```text
hot:post:123:0
hot:post:123:1
hot:post:123:2
hot:post:123:3

read -> choose random suffix
write/delete -> update/delete all suffixes
```

For read-heavy immutable-ish data, splitting is simple. For frequently changing data, invalidation becomes harder.

**Interview line:** "Sharding helps many keys; it does not solve one hot key. For a celebrity feed, I'd add local short TTL caching and possibly duplicate the hot object across several Redis keys."

---

## Part 4: penetration, avalanche and cold start

### Cache penetration: nonexistent data bypasses the cache

Suppose attackers or buggy clients request random product IDs. Each request misses Redis and misses the DB. Because there is no value to cache, every request hits the DB again.

Fixes:

1. **Negative caching:** cache "not found" for a short TTL.
2. **Bloom filter:** quickly reject IDs that definitely do not exist.
3. **Input validation/rate limiting:** do not let random unbounded IDs reach the DB.

Negative caching shape:

```text
GET product:999999999 -> miss
DB lookup -> not found
SET product:999999999 "__NULL__" EX 60
```

Keep negative TTL short. A product/user might be created shortly after the first miss.

Bloom filter shape:

```
request productId
      |
      v
Bloom filter says "definitely not present"? -> return 404 without DB
      |
      v
"maybe present" -> check cache / DB
```

Bloom filters have false positives, not false negatives. They may allow a DB lookup for a nonexistent ID, but should not reject a real existing ID if maintained correctly.

### Cache avalanche: many keys expire together

Avalanche is synchronized expiry at scale. If one million feed keys all use `EX 3600` and were created by the same batch job, one hour later the DB gets hit by all of them.

Fixes:

- add TTL jitter: `ttl = base + random(0, spread)`;
- warm keys gradually;
- use stale-while-revalidate for hot data;
- separate hot keys from normal keys;
- rate-limit cache rebuilds.

```
Bad:  every key TTL = 3600s
Good: every key TTL = 3600s + random(0..600s)
```

### Cold start and warming

Cold start happens after deploy, Redis restart, region failover, or adding a new cache cluster. Hit ratio begins near zero; the database suddenly serves all reads.

Warm-up strategies:

- prefill top N keys from logs before sending traffic;
- gradually shift traffic to the new cache;
- keep old cache available during migration;
- use lazy loading but protect DB with request coalescing and rate limits;
- for CDN/static assets, pre-warm critical pages/assets when possible.

In a news feed interview, you can say:
> "On deploy/failover, I'll warm celebrity feeds and trending content first because they dominate traffic; the long tail can fill lazily."

---

## Part 5: consistency failure cases

The cache is a copy. Copies go stale.

### Failure: update DB, fail to delete cache

```
App updates DB: name = "Neeraj"
App crashes before DEL profile:42
Redis still has old name for 10 min
```

Mitigations:

- TTL bounds the stale window;
- retry cache invalidation;
- write invalidation events through an outbox/CDC pipeline;
- use versioned cache keys if you can derive version from DB row.

For high-value correctness, do not depend on a best-effort cache delete as the only consistency mechanism.

### Failure: delete cache, then DB update fails

If you delete first, then the DB update fails, a later read may refill old data. That is usually okay; the DB remains source of truth. The more dangerous pattern is update DB then fail to delete.

### Failure: concurrent read repopulates stale data

Classic cache-aside race:

```
T1: read miss -> queries DB old value
T2: update DB new value -> delete cache
T1: SET cache old value
```

Mitigations:

- short TTL;
- set cache with version/timestamp and refuse older versions;
- delete cache again after a small delay for high-risk keys;
- route writes through a single service that coordinates invalidation.

Do not overbuild this for every interview. Mention it when data correctness matters: inventory, bookings, profile/security settings.

### Failure: cache stores mutable shared objects

If your app stores a partially computed or user-specific response under a broad key, you leak or corrupt data:

```text
Bad key:  feed:home
Good key: feed:user:{userId}:lang:{lang}:v2
```

This connects to C4's `Vary` and CDN cache keys: include every dimension that changes the response.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Generic Redis object cache | `allkeys-lru`, TTLs, cache-aside | simple and memory-efficient |
| Stable hot set | consider `allkeys-lfu` | protects frequently used keys |
| Mixed persistent Redis state + cache | prefer separate Redis instances | avoids `volatile-*` surprises |
| Expensive hot key | request coalescing + stale-while-revalidate | protects DB and latency |
| Celebrity hot key | local cache + replicas/key splitting | one Redis shard cannot serve infinite QPS |
| Random nonexistent IDs | negative cache + Bloom filter | stops penetration |
| Batch-created keys | TTL jitter | prevents avalanche |
| Cache restart/failover | warm top keys + gradual traffic | avoids cold-start DB overload |
| Strong correctness required | DB as source of truth; cache derived | cache invalidation is best-effort |

### Common interview traps

- Saying "LRU" without specifying `allkeys` vs `volatile`.
- Forgetting that Redis LRU/LFU are approximate.
- Giving every key the same TTL and causing avalanche.
- Using a distributed lock for stampede but not saying what waiters do.
- Negative-caching 404s for too long, so newly created objects look missing.
- Treating cache invalidation as guaranteed when the app can crash between DB write and cache delete.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What is the difference between expiration and eviction?</summary>

Expiration removes a key because its TTL ended. Eviction removes a key because Redis hit `maxmemory` and the configured `maxmemory-policy` chose a victim. A key can expire without memory pressure; a key can be evicted before TTL if memory pressure exists.
</details>

<details><summary>2. Why can `volatile-lru` behave like `noeviction`?</summary>

`volatile-lru` only evicts keys that have an expiration. If the memory-heavy keys do not have TTLs, Redis has no eligible victims and writes that need memory can fail, similar to `noeviction`.
</details>

<details><summary>3. A homepage cache key expires and 5,000 requests hit the DB. Name the failure and three fixes.</summary>

Cache stampede / thundering herd. Fixes: request coalescing, distributed lock around regeneration, stale-while-revalidate, probabilistic early expiration, and TTL jitter.
</details>

<details><summary>4. Why does Redis Cluster not automatically solve a hot celebrity key?</summary>

Cluster shards by key. One key maps to one hash slot and one primary shard, so all reads for that key can still overload that shard. Use local cache, replicas, key splitting, CDN/edge caching, or precomputed copies.
</details>

<details><summary>5. What is cache penetration, and why does a Bloom filter help?</summary>

Penetration is repeated requests for data that does not exist, causing cache misses and DB misses forever. A Bloom filter can reject IDs that are definitely not present before hitting the DB. False positives may still hit DB; false negatives should not happen if maintained correctly.
</details>

<details><summary>6. Why add jitter to TTLs?</summary>

To avoid many keys expiring at the same instant. Jitter spreads cache misses and rebuild work over time, preventing cache avalanche.
</details>

<details><summary>7. In cache-aside, why is \"update DB, then delete cache\" still not perfectly safe?</summary>

The app can crash after the DB update but before cache deletion, leaving stale data. Also, a concurrent read can repopulate old data after invalidation. TTLs, retries, outbox/CDC invalidation, versions and delayed double-delete reduce the risk.
</details>

<details><summary>8. For a flash-sale product page, what cache failure modes do you mention?</summary>

Hot key for the product page/inventory display, stampede when the key expires, avalanche if many sale keys share TTL, penetration from random product IDs, and consistency issues for inventory. Use local/edge cache for display, jitter, coalescing, negative cache, and keep actual inventory correctness in the DB/reservation system.
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
| [Redis: Key eviction](https://redis.io/docs/latest/develop/reference/eviction/) | Exact headings: Using the `maxmemory` configuration directive, Eviction policies, Using the INFO command, Approximated LRU algorithm, LFU eviction, LRM eviction | ~25 min |
| **Alex Xu Vol 1, ch 6: Design a Key-value Store** | Skim for distributed cache/KV failure framing: data partition, replication, consistency, failures | [PDF p.87](<../../../Books/System Design Interview Vol 1 - Alex Xu.pdf#page=87>) |
| [Redis: Strings](https://redis.io/docs/latest/develop/data-types/strings/) | Strings as counters, Limits, Bitwise and bitfield operations; useful for counter + TTL and bitmap examples | ~10 min |
| [Redis: Scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/) | Getting started, Interacting with Redis from a script; use for atomic stampede/rate-limit operations | ~10 min |

**Connects to:** [C1 Cache patterns](C1-Cache-Patterns.md) · [C2 Redis](C2-Redis.md) · [C4 HTTP/CDN caching](C4-HTTP-CDN-Caching.md) · [B4 Replication](../B-Data/B4-Replication.md) · [G3 Virtual waiting room](../G-Contention/G3-Virtual-Waiting-Room.md)
