# B5 · Sharding: split data without splitting your brain

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** KV store (#10), Chat (#3), URL shortener (#1), News feed (#4), Booking (#8), Location search (#9), Metrics/ad click (#20), Web crawler (#7), every "one database is too big" follow-up.

---

## Why this topic matters

Replication copies the same data to multiple machines. Sharding (partitioning) splits **different data** across machines.

```text
Replication: each node has copy of shard A
Node1: A   Node2: A   Node3: A

Sharding: each node owns different keys
Node1: A-M   Node2: N-Z   Node3: numbers/special
```

You shard when one machine cannot handle:

- write throughput,
- storage size,
- index size,
- working set memory,
- maintenance windows,
- or blast radius.

But sharding makes simple things hard: secondary indexes, joins, transactions, rebalancing, hot keys and routing. Interviewers expect you to mention those costs before saying "just shard it".

**Interview line:** "I'll shard only after vertical scale, indexes, caching and read replicas are not enough. The shard key must match the highest-volume access pattern and avoid hot partitions."

---

## Part 1: partitioning, sharding and replication together

DDIA uses **partitioning** for splitting data. In system design interviews, people often say **sharding**. Treat them as the same idea: divide a dataset into partitions/shards.

Real systems combine sharding and replication:

```text
                 users by user_id hash

Shard 0: user_id 0..33%     replicas: S0a (leader), S0b, S0c
Shard 1: user_id 34..66%    replicas: S1a (leader), S1b, S1c
Shard 2: user_id 67..99%    replicas: S2a (leader), S2b, S2c
```

A write first chooses the shard, then goes to that shard's leader/quorum. A read chooses the shard, then maybe a replica.

### Why shard?

| Reason | Example |
|---|---|
| Storage | chat messages no longer fit on one node |
| Write throughput | metrics/ad clicks exceed one primary's IOPS |
| Index size | one B-tree no longer fits hot working set |
| Isolation | one tenant/customer should not affect all others |
| Geography | EU users/data in EU shard |
| Operational safety | rebuild one shard instead of entire DB |

Do not shard because it sounds advanced. Sharding is a tax you pay when a single logical database cannot keep up.

---

## Part 2: key-range vs hash partitioning

### Key-range partitioning

Assign contiguous ranges to shards.

```text
A-F -> shard 1
G-M -> shard 2
N-Z -> shard 3
```

Pros:
- range queries are natural,
- sorted scans are easy,
- good for time/geography ranges if balanced.

Cons:
- hot ranges are common (`created_at=today`, celebrity username prefix),
- splitting/merging ranges needs operational work,
- monotonically increasing keys send writes to one shard.

Avoid raw timestamp as the only shard key for high-write systems. "Today's partition" becomes a furnace.

### Hash partitioning

Hash the key, assign hash ranges/buckets to shards.

```text
hash(user_id) % 4 -> shard 0..3
```

Pros:
- distributes keys evenly if key cardinality is high,
- simple routing,
- avoids ordered hot ranges.

Cons:
- range queries are scattered,
- adding shards causes movement unless using virtual partitions/consistent hashing,
- one hot key still hot (`celebrity_user_id` hashes to one shard).

### Choosing shard keys per question

| Question | Likely shard key | Why | Watch out |
|---|---|---|---|
| URL shortener (#1) | `short_code` hash | redirect lookup by code | analytics by user/time need separate path |
| Chat messages (#3) | `conversation_id` | read messages by conversation; preserves order within chat | huge group chats can become hot |
| News feed (#4) | `user_id` for home timeline | read feed by viewer | celebrity fan-out creates hot writes elsewhere |
| Booking (#8) | `event_id/show_id` | seat map accessed per event | one Taylor Swift event is a hot shard |
| Payments (#16) | `account_id` or `merchant_id`; ledger may need careful domain partitioning | account history/idempotency scoped by account/merchant | transfers cross accounts become cross-shard |
| Metrics (#20) | `(metric_id/customer_id hash, time bucket)` | high write volume plus time queries | pure time key is hot |
| Search (#17) | document/source partition plus inverted index shards | search engine owns partitioning | ranking requires scatter-gather |
| KV store (#10) | hash(key) | uniform key lookup | hot keys and rebalancing |

**Interview line:** "For chat I shard messages by `conversation_id` because the main read is a conversation timeline and it keeps message order local. For giant channels, I need sub-sharding by time or message bucket."

---

## Part 3: hot keys and the celebrity problem

Hashing distributes **keys**, not **load**. If one key gets 30% of traffic, one shard still burns.

Examples:

- celebrity account in news feed,
- one viral URL short code,
- one massive WhatsApp group,
- one flash-sale event,
- one metric name receiving millions of samples/sec.

### Mitigations

| Technique | Works for | Trade-off |
|---|---|---|
| Cache hot reads | viral URL, celebrity profile/feed reads | cache invalidation/staleness |
| Split hot key into subkeys | metrics, large chat/channel, event seats | reads may need merge |
| Hybrid fan-out | news feed celebrity posts | followers pull celebrity posts at read time |
| Queue/admission control | flash sale/booking | adds waiting, protects DB |
| Precompute/read replicas | feeds/search | eventual consistency |
| Move hot partition manually | tenant/event isolation | operational complexity |
| Add random suffix for writes | write-heavy counters/events | aggregation requires fan-in |

Celebrity news feed example:

```text
Normal user post -> fan out to followers' feed shards
Celebrity post   -> store once; followers pull/merge at read time
```

Do not blindly fan out a celebrity post to 100 million timelines synchronously.

---

## Part 4: secondary indexes on sharded data

A primary-key lookup routes to one shard. A secondary lookup may not.

### Local secondary index

Each shard indexes only its own data.

```text
Shard 1 local index: email -> local user rows
Shard 2 local index: email -> local user rows
Shard 3 local index: email -> local user rows
```

Query by `user_id` is easy. Query by `email` may require searching every shard unless the routing key includes email.

Pros:
- simple writes,
- index lives with data,
- no global bottleneck.

Cons:
- scatter-gather for non-shard-key queries,
- pagination/ordering across shards is hard.

### Global secondary index

Maintain a separate index that maps secondary key to shard/key.

```text
email_hash -> { shard_id, user_id }
```

Pros:
- direct lookup by secondary key.

Cons:
- every write must update data shard + global index,
- consistency lag or distributed transaction problem,
- global index can become hot/bottleneck,
- rebalancing must update pointers.

### Denormalized query tables

Wide-column systems often build another table per query.

```text
messages_by_conversation(conversation_id, created_at, message_id, ...)
messages_by_sender(sender_id, created_at, message_id, ...)
```

This is explicit denormalisation. It is powerful if you accept eventual consistency and backfill/rebuild work.

---

## Part 5: rebalancing and request routing

### Rebalancing strategies

| Strategy | Idea | Pros | Cons |
|---|---|---|---|
| Hash mod N | `hash(key) % N` | simple | adding a node moves many keys |
| Fixed partitions | create many partitions upfront; assign partitions to nodes | only move partition ownership | choose count carefully |
| Dynamic splitting | split large/hot ranges as needed | adapts to data distribution | metadata/routing complexity |
| Per-node partitioning | each node owns partitions; new node takes from existing nodes | operationally common | needs balancing logic |
| Consistent hashing / virtual nodes | ring of hash ranges with many vnodes | limited movement, smooth balance | more metadata; covered in B6 |

DDIA warns against `hash(key) % number_of_nodes` because changing node count reshuffles almost everything. Use many logical partitions/virtual nodes and move only some of them.

### Request routing options

How does the app know which shard owns a key?

```text
Client/app -> routing tier -> shard
Client/app -> ZooKeeper/etcd metadata -> shard
Client/app -> any node; node forwards to owner
```

| Routing model | How | Trade-off |
|---|---|---|
| Routing tier/proxy | app sends key to a router; router knows shard map | central layer to scale/operate |
| Client-side shard map | app library caches metadata from ZooKeeper/etcd/config service | fast, but clients must refresh on changes |
| Any-node/gossip | request can hit any node; cluster forwards | simpler clients, extra hop possible |

ZooKeeper/etcd-style metadata is common for coordination: which partitions exist, who owns them, which node is leader. Gossip is common in decentralized systems to spread membership/state.

### Cross-shard queries and transactions

Cross-shard operations are the tax of sharding.

| Operation | Problem | Typical answer |
|---|---|---|
| Query user's own feed | one shard if keyed by user | easy |
| Search all posts by word | every shard has partial results | scatter-gather or search index |
| Transfer between two accounts | two shards may need atomicity | avoid with account grouping, saga, or distributed transaction if truly required |
| Join orders and users | data on different shards | denormalize, query by ID, or analytical pipeline |
| Global top-K | every shard has local top-K | merge in stream/OLAP layer |

For payments, avoid casual cross-shard distributed transactions. Model account domains carefully, use ledgers, idempotency and reconciliation ([G5 Ledger](../G-Contention/G5-Ledger-Reconciliation.md)).

---

## Part 6: choosing in an interview / cheat sheet

| Situation | Say this |
|---|---|
| The dataset fits one DB with replicas | "I won't shard yet; I use indexes, cache and read replicas first." |
| Need to shard simple key lookups | "Hash shard by the lookup key and use virtual partitions/consistent hashing for rebalancing." |
| Need range scans | "Use key-range partitioning, but watch hot ranges and split ranges dynamically." |
| Chat timeline | "Shard by conversation_id; for huge rooms add time/bucket sub-shards." |
| Feed home timeline | "Shard by viewer/user_id; handle celebrities with hybrid fan-out." |
| Booking event | "Shard by event/show_id for locality, but treat mega-events as hot keys needing queue/admission/subpartitioning." |
| Query by non-shard key | "Either scatter-gather, global secondary index, or build a denormalized query table/search index." |
| Need cross-shard transaction | "First redesign to avoid it; if unavoidable, make it rare and explicit with saga/2PC/serializable service boundary." |

### Common interview traps

- Saying "shard by timestamp" for high-write data; newest range becomes hot.
- Using `hash(key) % N` and ignoring rebalancing movement.
- Choosing `user_id` as shard key for chat messages, then needing every conversation read to hit many user shards.
- Forgetting secondary indexes: "find user by email" is not automatically one-shard if sharded by user ID.
- Ignoring the celebrity/hot-key problem after saying hash sharding.
- Pretending cross-shard joins/transactions are as easy as single-node SQL.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Replication vs sharding: what is the difference?</summary>

Replication copies the same data to multiple nodes for availability/read scaling. Sharding partitions different data across nodes for storage/write/index scaling. Real systems often do both: each shard is replicated.
</details>

<details><summary>2. Why is <code>hash(key) % N</code> a bad long-term sharding plan?</summary>

When N changes, most keys map to different shards, causing massive data movement and cache invalidation. Use fixed logical partitions, virtual nodes or consistent hashing to move only some ranges.
</details>

<details><summary>3. For chat messages, why is <code>conversation_id</code> usually a better shard key than <code>sender_id</code>?</summary>

The main read is a conversation timeline. Sharding by conversation keeps messages ordered and local. Sharding by sender would scatter one conversation across many user shards.
</details>

<details><summary>4. What is a hot key? Give two mitigations.</summary>

A key whose traffic is much higher than others, overloading one shard despite hashing. Mitigations: cache hot reads, split the key into subkeys/buckets, hybrid fan-out, queues/admission control, or manually move/isolate the hot partition.
</details>

<details><summary>5. Local secondary index vs global secondary index?</summary>

A local index covers data within each shard, so non-shard-key queries may scatter to all shards. A global index maps secondary key to owning shard/key, enabling direct lookup but adding write consistency, bottleneck and rebalancing complexity.
</details>

<details><summary>6. How do you route a request to the right shard?</summary>

Use a routing tier/proxy, a client-side shard map loaded from ZooKeeper/etcd/config service, or any-node routing where the cluster forwards to the owner. The shard map must change safely during rebalancing/failover.
</details>

<details><summary>7. Why is sharding bad for joins?</summary>

Rows needed for a join may live on different machines. The system must scatter-gather, move data, or perform distributed execution. Hot-path systems often denormalize, use query-specific tables, or move analytics/search to derived stores.
</details>

<details><summary>8. In a booking system, what shard key would you start with and what is the main caveat?</summary>

Start with `event_id`/`show_id` so the seat map is local. Caveat: a mega-event becomes a hot shard, so you may need a waiting room, subpartitioning by seat block, cache/read replicas and strict DB constraints.
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
| **DDIA ch 6: Partitioning** (1st ed) | Whole chapter; this note uses "sharding" for the same interview concept | [PDF p.221](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=221>) |
| ↳ Partitioning and Replication | how partitioning combines with replication | [p.222](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=222>) |
| ↳ Partitioning of Key-Value Data | key-range vs hash partitioning and skewed workloads | [p.223](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=223>) |
| ↳ Partitioning and Secondary Indexes | local/document-partitioned vs global/term-partitioned indexes | [p.228](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=228>) |
| ↳ Rebalancing Partitions | fixed partitions, dynamic partitioning and operational constraints | [p.231](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=231>) |
| ↳ Request Routing | routing tier, ZooKeeper-style metadata and gossip-style approaches | [p.236](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=236>) |
| [Hello Interview: Sharding](https://www.hellointerview.com/learn/system-design/core-concepts/sharding) | Headings verified: First, what is Partitioning? → What is Sharding? → How to Shard Your Data → Choosing Your Shard Key → Sharding Strategies → Challenges of Sharding → Hot Spots and Load Imbalance → Cross-Shard Operations → Maintaining Consistency → Sharding in Modern Databases → Sharding in System Design Interviews → When to Mention Sharding → What to Say → Conclusion | ~35 min |
| [Azure Architecture Center: Sharding pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/sharding) | Headings verified: Context and problem → Solution → Shard key selection → Sharding strategies → Lookup sharding strategy → Range-based sharding strategy → Hash-based sharding strategy → Geographic sharding strategy → Advantages and considerations → Scaling and data movement → Problems and considerations → When to use this pattern | ~30 min |

**Connects to:** [B2 Indexes](B2-Indexes.md) · [B4 Replication](B4-Replication.md) · [B6 Consistent Hashing](B6-Consistent-Hashing.md) · [B7 CAP](B7-CAP-Consistency.md) · [F3 Fan-out](../F-Blobs-Fanout/F3-Fan-out.md) · [G1 Locking](../G-Contention/G1-Locking.md)
