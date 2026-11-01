# C2 · Redis: the Swiss-army knife behind fast systems

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Rate limiter (#2), Chat (#3), News feed (#4), Location search (#9), Distributed cache / KV store (#10), Top-K / leaderboard (#15), Flash sale (#18)

---

## Why this topic matters

Redis starts as "an in-memory cache", but in interviews it quietly becomes many other things: rate limiter, session store, leaderboard, presence map, lightweight queue, pub/sub fan-out, distributed lock, geospatial index and approximate counter. The danger is using the right word but the wrong Redis primitive.

| Interview need | Redis primitive you should reach for |
|---|---|
| Fast cache / session | string or hash with TTL |
| Sliding-window rate limiter | sorted set + Lua, or counter + TTL |
| Leaderboard | sorted set |
| Online presence | set/hash + short TTL heartbeat |
| Small durable-ish work stream | Redis Streams consumer groups |
| Fire-and-forget notifications | Pub/Sub |
| Unique visitors | HyperLogLog |
| Nearby drivers/stores | GEO commands |
| Daily active bitmap | bitmap operations on strings |

Redis is attractive because **single commands are atomic** and very fast. But it is not magic: memory is finite, replication is usually async, Lua can block the server, Cluster limits multi-key operations, and Pub/Sub drops messages for disconnected clients.

**Interview line:** "I'll use Redis because the access pattern is simple, hot and latency-sensitive; I won't make it the source of truth unless the data can tolerate Redis' persistence and failover trade-offs."

---

## Part 1: the Redis mental model

Redis is an in-memory data-structure server. A client sends commands; Redis executes them against typed values stored under keys.

```
Client -- command --> Redis event loop --> keyspace in RAM
                          |
                          +-- RDB/AOF persistence in background
                          +-- async replication to replicas
                          +-- optional cluster sharding by hash slot
```

### Single-threaded does not mean weak

For the core command path, Redis historically uses one main event-loop thread. That gives a useful guarantee: **one command runs to completion before the next command mutates that server's data**. You do not need a mutex around `INCR`, `ZADD`, `HSET` or a Lua script.

Modern Redis can use extra threads for I/O and background work, but the interview-safe model is:

- one command is atomic on one Redis node;
- multi-command sequences are **not** atomic unless wrapped in Lua or a transaction;
- long commands and long Lua scripts block everyone behind them;
- a big value, `KEYS *`, or an unbounded scan in a hot path is a latency incident waiting to happen.

This is why Redis works so well for counters and rate limiters. It is also why you must avoid treating it like a general database where arbitrary queries are fine.

### Key design matters

A Redis schema is mostly key naming + data type choice.

```
session:{userId}        -> hash/string, TTL 30 days
presence:{roomId}       -> set of userIds, each user heartbeat stored separately
rl:{userId}:{minute}    -> string counter, TTL 2 min
lb:weekly               -> sorted set userId -> score
stream:emails           -> stream of jobs
```

Use colons for readability. In Redis Cluster, use **hash tags** (`{...}`) only when you deliberately need related keys in the same slot: `cart:{userId}:items`, `cart:{userId}:meta`.

---

## Part 2: data types mapped to interview uses

### Strings: cache values, counters, locks, bit operations

A Redis string is binary-safe bytes, not just text. It is the default for cache-aside: `GET product:123`, miss, query DB, `SET product:123 <json> EX 300`.

Useful interview commands:

| Command idea | Use |
|---|---|
| `SET key value EX ttl` | cache/session with expiry |
| `SET key value NX EX ttl` | only set if absent; lock primitive or idempotency marker |
| `INCR` / `INCRBY` | counters, fixed-window rate limits |
| `GETSET` / `SET ... XX` | conditional updates |
| bit operations | dense booleans such as daily active users |

A fixed-window rate limiter can be a string counter:

```text
key = rl:user42:2026-09-30T18:19
INCR key
EXPIRE key 60       # only when newly created
allow if value <= 100
```

The trap: fixed windows allow boundary bursts. For stricter limits, use sorted sets or token buckets.

### Hashes: object-like state without huge JSON rewrites

Hashes store field-value pairs under one key:

```text
HSET session:abc userId 42 role host lastSeen 1790760000
HGET session:abc userId
HINCRBY user:42:stats meetingsJoined 1
```

Good uses:

- session state;
- user/profile snippets;
- per-room metadata;
- counters grouped under an entity.

Why not always JSON in a string? If one field changes often, a hash avoids reading and writing the whole JSON blob. But a hash is still one Redis value; a single huge hash can become a hot key.

### Lists: simple queues and recent activity

Lists are linked-list-like sequences. `LPUSH` + `RPOP` gives FIFO; blocking pops (`BLPOP`/`BRPOP`) let workers wait.

```
Producer: LPUSH queue:thumbnail jobJson
Worker:   BRPOP queue:thumbnail 5
```

This is fine for a small internal queue. But lists do not give a full pending/ack/retry model by themselves. For interviews, say: "For a production message queue, I prefer SQS/RabbitMQ/Kafka; Redis lists are okay for simple best-effort worker queues. Redis Streams are the Redis-native upgrade."

### Sets: uniqueness, membership, presence, dedup

Sets give fast membership checks and set operations.

| Pattern | Redis shape |
|---|---|
| Online users in a room | `SADD room:123:online user42` |
| Has this URL been crawled? | `SISMEMBER crawled:urlHash` |
| Mutual friends-ish demo | `SINTER friends:a friends:b` |
| Notification dedup | `SET/SADD processed:{day} eventId` |

Presence needs TTL, and sets do not expire individual members. A common design is:

- `SETEX presence:user42 30 "room123"` refreshed by heartbeat;
- optionally keep a room set for quick reads, and clean stale members lazily when `presence:userId` is missing.

### Sorted sets: leaderboards, delayed jobs, sliding windows

A sorted set maps `member -> score` and keeps members ordered by score. It is the interview darling.

Leaderboard:

```text
ZINCRBY lb:weekly 25 user42
ZREVRANGE lb:weekly 0 9 WITHSCORES
ZREVRANK lb:weekly user42
```

Sliding-window rate limiter:

```text
key = rl:user42
now = current epoch milliseconds
ZREMRANGEBYSCORE key -inf now-60000
ZADD key now requestId
ZCARD key
EXPIRE key 120
allow if count <= limit
```

Make the remove/add/count/expire sequence atomic with Lua; otherwise two concurrent requests can both pass.

Delayed jobs use timestamp as score: workers poll `ZRANGEBYSCORE delayed -inf now LIMIT 0 1`, claim atomically, then process. This is useful but still less robust than a real queue if job delivery matters.

### Streams: Redis' durable log-like structure

Redis Streams store append-only entries with IDs and field-value payloads.

```text
XADD stream:emails * userId 42 template welcome
XGROUP CREATE stream:emails workers $
XREADGROUP GROUP workers worker-1 COUNT 10 BLOCK 5000 STREAMS stream:emails >
XACK stream:emails workers 171...-0
```

Use Streams when you need:

- history / replay for a bounded time;
- consumer groups;
- pending entries and acknowledgement;
- small-to-medium async pipelines close to Redis.

Do not sell Streams as "Kafka but easier" for unlimited retention and huge partitioned throughput. Kafka is better when the log itself is a central platform with replay, many consumers and long retention.

### HyperLogLog: approximate unique counts

HyperLogLog estimates cardinality: "how many unique visitors saw this video today?"

```text
PFADD uv:video:99:2026-09-30 user42
PFCOUNT uv:video:99:2026-09-30
PFMERGE uv:video:99:month uv:video:99:2026-09-*
```

Redis' HLL is compact and approximate. It is perfect for dashboards and trending signals, not billing or payments.

### GEO: proximity search on top of sorted sets

Redis GEO indexes longitude/latitude and searches by radius or box.

```text
GEOADD drivers 77.5946 12.9716 driver42
GEOSEARCH drivers FROMLONLAT 77.60 12.97 BYRADIUS 3 km ASC COUNT 20
```

Good for "find nearby drivers/restaurants" when the dataset fits in memory and exact GIS is not required. For complex polygons, routing or durable geo queries, use PostGIS/Elasticsearch/S2-backed systems.

### Bitmaps: dense booleans ⏭ *Skip for interviews*

Bitmaps are operations on strings where each bit represents something.

```text
SETBIT dau:2026-09-30 424242 1
BITCOUNT dau:2026-09-30
BITOP AND retained dau:2026-09-29 dau:2026-09-30
```

They are great when user IDs are dense-ish integers. If IDs are huge random UUIDs, use hashing carefully or pick HLL/sets instead.

---

## Part 3: persistence, replication and Redis Cluster

### Persistence: RDB vs AOF ⏭ *Skip for interviews*

Redis can be just a cache with no persistence. If you need it to survive restart, there are two main modes:

| Mode | How it works | Good for | Risk |
|---|---|---|---|
| RDB snapshot | point-in-time snapshot every N seconds/changes | backups, fast restart | lose changes since last snapshot |
| AOF | append write commands and replay | better durability | bigger files, rewrite complexity |
| RDB + AOF | combine both | safer Redis-as-database setups | operational complexity |

For pure cache, losing Redis data is acceptable; you warm it from DB. For rate limiter state, losing a few seconds may be acceptable. For wallet balances, it is not.

### Replication: fast reads, not strong consistency

Redis primary-replica replication is asynchronous by default.

```
          writes
Client ---------> Primary --- async stream ---> Replica A
                    |                         \-> Replica B
                 reads/writes                  read scaling / failover candidate
```

A replica can be promoted after primary failure, but a recently acknowledged write can be missing if it had not reached the replica. `WAIT` can reduce this risk by waiting for replica acknowledgements, but the Redis docs are careful: it does not turn Redis into a CP strongly consistent database.

**Interview line:** "Redis replication gives availability and read scaling, but I still treat Redis data as either reconstructable or protected by a durable source of truth."

### Cluster: 16,384 hash slots

Redis Cluster shards keys across masters using 16,384 hash slots. A key maps to a slot; a slot maps to a node. Clients learn the slot map and follow `MOVED`/`ASK` redirects during resharding.

```
key -> CRC16(key) % 16384 -> slot -> Redis master
```

Important limits:

- Multi-key commands work only when keys are in the same slot.
- Hash tags force a substring to decide the slot: `cart:{u42}:items` and `cart:{u42}:meta` colocate.
- Cluster uses async replication; failover can lose acknowledged writes in failure windows.
- Hot keys remain hot even in a cluster. Sharding by key does not split one celebrity key.

Use Cluster when Redis memory/throughput no longer fits one primary, but design keys for sharding from the beginning.

---

## Part 4: Pub/Sub, Streams, Lua and locks

### Pub/Sub vs Streams

| Need | Pub/Sub | Streams |
|---|---|---|
| Delivery style | push to currently subscribed clients | persisted entries read by consumers |
| Offline subscriber | misses messages | can catch up from last ID / pending list |
| Ack/retry | no | consumer groups + `XACK` |
| Latency | very low | low, with more machinery |
| Use | live invalidation, presence notifications | background jobs, event log, audit-ish feed |

For Adobe Connect-like meeting pods, Pub/Sub is okay for ephemeral "room state changed" notifications if clients can refetch. For "send this email eventually", use Streams/SQS/RabbitMQ/Kafka.

### Lua scripts: atomic multi-step logic

Lua runs server-side and atomically. While a script runs, no other command interleaves.

Rate limiter Lua shape:

```lua
-- KEYS[1]=rate-limit key, ARGV[1]=now, ARGV[2]=windowMs, ARGV[3]=limit, ARGV[4]=requestId
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1] - ARGV[2])
redis.call('ZADD', KEYS[1], ARGV[1], ARGV[4])
local count = redis.call('ZCARD', KEYS[1])
redis.call('EXPIRE', KEYS[1], math.ceil(ARGV[2] / 1000) * 2)
return count <= tonumber(ARGV[3])
```

Use Lua for short, bounded operations. Never do unbounded scans. A slow script blocks the Redis event loop.

### Locks: useful, but be humble

`SET lock:resource token NX PX 10000` is a common lock primitive. Release safely by checking the token in Lua before deleting.

But Redis locks are subtle under pauses, failovers and partitions. For correctness-critical inventory/payment, prefer DB transactions, compare-and-swap with fencing tokens, or a coordination system. In interviews, Redis locks are acceptable for efficiency locks (avoid duplicate expensive work), not for "never sell the last ticket twice" unless you add fencing and discuss failure modes.

---

## Part 5: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Cache product/user/feed objects | String or hash + TTL | simplest, fast, reconstructable |
| Session store | Hash/string + TTL, with durable auth source elsewhere | easy expiry and lookup |
| Fixed-window rate limiter | `INCR` + `EXPIRE` | cheap, good enough for coarse limits |
| Sliding-window rate limiter | Sorted set + Lua | precise per request; atomic sequence |
| Leaderboard / Top-K | Sorted set | ranking is native |
| Presence | heartbeat key with TTL + set/hash index | avoids stale forever-online users |
| Fire-and-forget room event | Pub/Sub | low latency; subscribers can refetch |
| Background jobs with ack | Streams, or external queue | pending list and consumer groups |
| Unique visitors | HyperLogLog | tiny memory, approximate |
| Nearby users/stores | GEO | simple radius/box queries in memory |
| Correct financial state | Not Redis as source of truth | Redis failover/persistence is not enough |

### Common interview traps

- Saying "Redis is single-threaded, so it cannot scale." It scales vertically, via replicas for reads and Cluster for shards; the single event loop is also why commands are atomic.
- Using Pub/Sub for durable notifications. Disconnected subscribers miss messages.
- Forgetting Redis memory limits and eviction. A cache without `maxmemory` planning becomes a production outage.
- Using `KEYS *` or unbounded Lua in a hot path.
- Assuming replicas are strongly consistent. Redis replication is usually async.
- Using Redis locks for correctness without tokens/fencing and expiry failure discussion.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why does Redis' single-threaded command model help a rate limiter?</summary>

A single command or Lua script runs atomically on one Redis node, so the increment/check/update sequence can be made race-free without app-level locks. The caveat is that multi-command sequences need Lua/transactions, and long scripts block other clients.
</details>

<details><summary>2. Pick Redis types for: session store, leaderboard, unique visitor count, nearby drivers.</summary>

Session store: string or hash with TTL. Leaderboard: sorted set. Unique visitor count: HyperLogLog if approximate is okay, set if exact and small enough. Nearby drivers: GEO commands, which are implemented over sorted sets.
</details>

<details><summary>3. Pub/Sub or Streams for a notification worker that must retry failed sends?</summary>

Streams, or a dedicated queue. Pub/Sub is at-most-once to currently connected subscribers and has no ack/retry/history. Streams support consumer groups, pending entries and `XACK`.
</details>

<details><summary>4. Why can a Redis Cluster multi-key command fail even when all keys exist?</summary>

Cluster shards keys by hash slot. Multi-key operations generally require all keys to be in the same slot. Use hash tags such as `{user42}` only when keys must be colocated.
</details>

<details><summary>5. What is the difference between RDB and AOF?</summary>

RDB is periodic point-in-time snapshots: compact and fast to restart, but can lose changes since the last snapshot. AOF appends write commands and can be fsynced more often, improving durability at the cost of log size/rewrite overhead.
</details>

<details><summary>6. Why is Redis not a safe primary store for bank balances?</summary>

Persistence and async replication can lose recently acknowledged writes in failures, Lua/atomic commands do not give full transactional invariants across services, and eviction/memory operations are dangerous for durable state. Use a transactional durable database/ledger; Redis can cache derived views.
</details>

<details><summary>7. How would you model online presence for chat?</summary>

Have each client heartbeat a key like `presence:userId` with a short TTL. Maintain room membership in a set/hash for fast listing, but verify or lazily remove stale users by checking their heartbeat key. This prevents users staying online forever after disconnect.
</details>

<details><summary>8. When would you choose Kafka over Redis Streams?</summary>

When the event log is a central durable platform: high throughput, many independent consumers, partitioned scaling, long retention, replay, and operational isolation. Redis Streams are convenient for smaller Redis-adjacent pipelines.
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
| [Hello Interview: Redis deep dive](https://www.hellointerview.com/learn/system-design/deep-dives/redis) | Exact headings: Redis Basics, Commands, Infrastructure Configurations, Performance, Capabilities, Redis as a Cache, Redis as a Distributed Lock, Redis for Leaderboards, Redis for Rate Limiting, Redis for Proximity Search, Redis for Event Sourcing, Redis for Pub/Sub | ~45 min |
| Redis data types | [Strings](https://redis.io/docs/latest/develop/data-types/strings/) headings: Strings as counters, Limits, Bitwise and bitfield operations, Performance · [Hashes](https://redis.io/docs/latest/develop/data-types/hashes/) headings: Examples, Field expiration, Compact hashes, Performance, Limits · [Lists](https://redis.io/docs/latest/develop/data-types/lists/) headings: Examples, Blocking operations on lists, Limits, Performance · [Sets](https://redis.io/docs/latest/develop/data-types/sets/) headings: Examples, Tutorial, Limits, Performance · [Sorted sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/) headings: Operating on ranges, Lexicographical scores, Examples, Performance · [Streams](https://redis.io/docs/latest/develop/data-types/streams/) headings: Streams basics, Consumer groups, Recovering from permanent failures, Differences with Kafka partitions · [HyperLogLog](https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/) headings: Use cases, Performance, Limits · [Geospatial](https://redis.io/docs/latest/develop/data-types/geospatial/) headings: Examples, Learn more · [Bitmaps](https://redis.io/docs/latest/develop/data-types/strings/bitmaps/) headings: Example, Bit Operations, Split bitmaps into multiple keys, Performance | Use as reference while mapping use cases |
| Redis operations docs | [Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/) headings: RDB advantages/disadvantages, AOF advantages/disadvantages, Snapshotting, Append-only file · [Replication](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/) headings: Safety of replication, How Redis replication works, Replication ID, Partial sync · [Cluster spec](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/) headings: Key distribution model, Hash tags, Redirection and resharding, Fault Tolerance, Write safety | ~30 min skim |
| Redis messaging + programmability | [Pub/Sub](https://redis.io/docs/latest/develop/pubsub/) headings: Delivery semantics, Pattern-matching subscriptions, Sharded Pub/Sub · [Scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/) headings: Getting started, Script parameterization, Interacting with Redis from a script, Script cache, Script replication | ~20 min |

**Connects to:** [C1 Cache patterns](C1-Cache-Patterns.md) · [C3 Eviction + failure modes](C3-Eviction-Failure-Modes.md) · [D1 Queues](../D-Async/D1-Queues.md) · [D2 Kafka](../D-Async/D2-Kafka.md) · [G2 Distributed locks](../G-Contention/G2-Distributed-Locks-Reservations.md) · [H1 Geospatial](../H-Geo-Search-Counting/H1-Geospatial.md) · [H5 Approximate counting](../H-Geo-Search-Counting/H5-Approximate-Counting.md)
