# B6 · Consistent Hashing: scaling shards without reshuffling the world

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Distributed key-value store (#10), distributed cache (#10/#2), Web crawler (#7), Chat (#3), News feed (#4), CDN / load balancer follow-ups.

---

## Why this topic matters

A normal hash table assumes the number of buckets is stable. Distributed systems do not have that luxury: cache nodes die, database shards are added, a hot service needs more capacity, and regions come and go.

If the mapping is `node = hash(key) % N`, changing `N` changes almost every answer. That is acceptable inside one process, but disastrous when each "bucket" is a machine holding terabytes or millions of cache keys.

| Situation | Bad hashing symptom | What consistent hashing gives you |
|---|---|---|
| Add cache node | Massive cache miss storm | Only a small slice moves |
| Remove failed node | Most clients remap keys | Neighboring nodes absorb its range |
| Add database shard | Expensive full reshuffle | Incremental rebalancing |
| Uneven node sizes | One node becomes hot | Virtual nodes / weights |

**Interview line:** "I won't use `hash(key) % nodeCount` for a dynamic cluster, because resizing would remap most keys. I'll use consistent hashing with virtual nodes so adding one node moves roughly `K/N` keys, not nearly all `K`."

---

## Part 1: why modulo hashing breaks on resize

The simple approach is tempting:

```text
nodeIndex = hash(key) % numberOfNodes
```

With 4 nodes, `hash("user:42") = 791` maps to `791 % 4 = 3`. Add a fifth node and the same key maps to `791 % 5 = 1`. The key did not change. The node count changed.

For most random hashes, changing from `N` to `N+1` remaps a very large fraction of keys. In a cache cluster this means a **cold-cache storm**: requests that used to hit now miss, all miss traffic falls through to the database, and the database gets overloaded exactly when you were trying to scale.

```text
Before: N = 4
keyA -> hash 10 -> node 2
keyB -> hash 11 -> node 3
keyC -> hash 12 -> node 0
keyD -> hash 13 -> node 1

After: N = 5
keyA -> hash 10 -> node 0  moved
keyB -> hash 11 -> node 1  moved
keyC -> hash 12 -> node 2  moved
keyD -> hash 13 -> node 3  moved
```

Modulo hashing is fine when the bucket count is fixed, buckets are in memory and rehashing is cheap, or the system can tolerate a full rebuild. It is not fine when bucket = server, partition, cache node, CDN edge bucket or storage shard.

A small nuance: some databases use a fixed number of **logical partitions** and then assign those partitions to machines. That is a different design. The modulo is over stable logical buckets, not live nodes. Consistent hashing solves the same problem more directly by making the ownership boundary stable under membership changes.

---

## Part 2: the hash ring

Consistent hashing maps both **keys** and **nodes** into the same hash space, usually drawn as a circle from `0` to `2^m - 1`.

```text
                    0 / 2^m
                      ▲
          Node C      │        Node A
             ●        │          ●
        ┌─────────────┼─────────────┐
        │             │             │
        │             │             │
        └─────────────┼─────────────┘
             ●        │          ●
          Node D      │        Node B
                      ▼
```

To place a key: hash the key to a point on the ring, walk clockwise until you hit the first node, and store the key there.

```text
key x hashes here
      ▼
----- x -------- Node B -------- Node C -------- Node D -------- Node A -----
               owner
```

Each node owns the arc between its predecessor and itself. If Node B fails, only Node B's range moves, usually to Node C. Node A, C and D do not have to give up unrelated keys.

### Adding a node

```text
Before:
Node A owns (D, A]
Node B owns (A, B]
Node C owns (B, C]
Node D owns (C, D]

Add Node X between A and B:
Node X owns (A, X]
Node B now owns only (X, B]
```

Only keys in `(A, X]` move, and they move from Node B to Node X. No other range changes.

### Rebalancing cost: roughly K/N keys move

If there are `K` keys and `N` nodes, each node owns about `K/N` keys on average. Adding one node means the new node needs about a `1/(N+1)` share of the keyspace. In interview shorthand, say **about `K/N` keys move**, not `K`.

A more precise expression for adding one node to a balanced ring is about `K/(N+1)` keys, but `~K/N` communicates the order of magnitude and matches interview expectations.

---

## Part 3: virtual nodes fix uneven rings

The basic ring has a problem: with only a few physical nodes, placement is random and uneven. One node may own a huge arc while another owns a tiny arc.

```text
Bad luck with 4 nodes:

A ●-----------------------------● B
  |                               |
  | huge range owned by B         | tiny ranges elsewhere
  |                               |
D ●-----------● C
```

The fix is **virtual nodes** (vnodes). Instead of hashing each physical node once, hash it many times:

```text
Physical node A -> A#1, A#2, A#3, ... A#128 on the ring
Physical node B -> B#1, B#2, B#3, ... B#128 on the ring
```

Now each real machine owns many small ranges scattered around the ring. Randomness averages out.

Virtual nodes help with three practical issues:

| Problem | How vnodes help |
|---|---|
| Uneven key distribution | Many small ranges average out better than one large range |
| Rebalancing | Moving many small ranges is smoother than moving one huge range |
| Heterogeneous machines | Give stronger machines more vnodes / weight |

For example, a 64 GB cache node may get 200 vnodes and a 16 GB node may get 50. The ring then naturally assigns more keyspace to the bigger machine.

### Hot keys are a separate problem

Consistent hashing balances **number of keys**, not **traffic**. If `celebrity:virat` receives 100,000 QPS, the node owning that key is hot even if key counts are even.

Typical fixes: cache hot keys in more places, split the key (`timeline:celebrity:shard:0..15`), request coalescing for cache misses, celebrity-specific feed fan-out, or load-aware routing above the hash layer.

**Interview line:** "Consistent hashing handles membership changes and average distribution. I still need hot-key mitigation for skewed workloads."

---

## Part 4: replication on the ring

Consistent hashing is often paired with replication. If the owner of a key dies, you need another copy.

A common rule: the primary owner is the first node clockwise from the key; replicas are the next `R-1` distinct physical nodes clockwise.

```text
Replication factor R = 3

key k
  ▼
--k---- A#4 ---- B#9 ---- C#2 ---- A#7 ---- D#1 ----
        primary  replica  replica  skip A   next range
```

We skip duplicate virtual nodes for the same physical machine. Replicas should be on different failure domains when possible: different machines, racks, availability zones, or sometimes regions.

This is the Dynamo/Cassandra-style mental model: the ring chooses the **preference list** of nodes for a key, then the database applies quorum rules (`R`, `W`, `N`) from [B4 Replication](B4-Replication.md) and [B7 CAP](B7-CAP-Consistency.md).

### What happens when a node fails?

Suppose Node B dies. Its ranges become temporarily owned by the next nodes clockwise. With replication, reads and writes can continue if enough replicas are alive.

```text
Before failure:
range (A, B] primary = B, replicas = C, D

After B fails:
range (A, B] served by C/D until B recovers or ranges are rebuilt
```

Systems differ in how aggressively they rebalance. A cache cluster may simply let keys miss and refill; a database must stream token ranges to maintain replication factor; a load balancer only updates routing because no stored data moves.

---

## Part 5: real users of the idea

Consistent hashing became famous through the Dynamo paper and then appeared everywhere dynamic placement is needed.

| System / area | How the idea appears |
|---|---|
| **Amazon Dynamo** | Ring of storage nodes; each key replicated to next nodes in the preference list |
| **Cassandra** | Token ring; partition key hashes to token; vnodes distribute ranges across nodes |
| **DynamoDB** | The public API hides placement, but the data model inherits Dynamo ideas: partition keys, automatic partitioning, replication |
| **Memcached clients** | Client-side consistent hashing maps keys to cache nodes |
| **Load balancers** | Consistent hash policy routes same user/session/object to same backend with minimal movement |
| **CDNs** | Objects/users mapped to cache servers; adding edges should not flush the world |
| **Discord / large chat systems** | Shards/gateways route guilds or channels to workers; consistent hashing is a common fit for stable ownership |

Do not overclaim exact internals unless you have a public source. In interviews, phrase it as "systems like Dynamo and Cassandra use token-ring style partitioning; load balancers and CDNs use the same family of hashing ideas for stable routing."

For your world: Adobe Connect meeting rooms can be assigned to media/control servers by room id; DrawBoard rooms could be assigned to WebSocket room-service instances by `boardId`; a CDN edge cache maps assets to backing cache nodes and wants resizing not to invalidate everything.

---

## Part 6: alternatives: rendezvous hashing and jump hash ⏭ *Skip for interviews*

Consistent hashing is not the only answer. Know the names and when they are simpler.

### Rendezvous / HRW hashing

Rendezvous hashing (Highest Random Weight) scores every candidate node for a key and chooses the node with the highest score.

```text
owner(key) = node with max hash(key, nodeId)
```

If a node is added or removed, only keys that would choose that node move. It is simple, deterministic and does not need a ring.

Pros: easy to reason about, naturally supports weighted nodes, minimal disruption on membership change. Cons: naïvely scores every node per lookup (`O(N)`), though optimized variants exist. Good fit: small-to-medium clusters, service discovery, load balancer choices.

### Jump consistent hash

Jump hash maps a key to one of `N` buckets with very little memory and fast computation. It is great when buckets are numbered `0..N-1` and have equal weight.

Pros: no ring structure, very fast, minimal movement when `N` increases. Cons: mainly handles numbered equal-weight buckets and is less flexible for arbitrary weighted, failure-domain-aware placement than vnode rings.

### Simple fixed partitions

Many modern systems use a large fixed number of logical partitions, then assign those partitions to nodes. For example, create 16,384 partitions and move partitions between machines. This is conceptually close to vnodes.

In an interview, consistent hashing is the safest default phrase because it is widely recognized. If the interviewer asks for alternatives, mention HRW and jump hash briefly.

---

## Part 7: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Distributed cache nodes change often | Consistent hashing + vnodes | Minimal cache churn; simple client-side routing |
| Dynamo/Cassandra-style KV store | Hash ring + replication to next `R` nodes | Natural partition + replica placement |
| A few backends behind an L7 LB | HRW / consistent-hash LB policy | Stable sticky routing with low movement |
| Equal-weight numbered buckets | Jump hash | Fast and memory-light |
| Very hot celebrity keys | Consistent hashing **plus** hot-key strategy | Hashing alone does not solve skew |
| Need range scans | Do not hash the primary access path, or add a separate index | Hash destroys locality |

### Common interview traps

- Using `hash(key) % N` and then saying "we can add nodes later". Resizing remaps most keys.
- Forgetting **virtual nodes**, which are what make the ring balanced in practice.
- Claiming exactly `K/N` keys move. It is approximate and assumes uniform hashing.
- Treating consistent hashing as replication. It places keys; replication is a separate policy.
- Ignoring hot keys. Hashing balances random keys, not skewed traffic.
- Using hashed placement when the question needs range queries (`created_at BETWEEN ...`, nearby geo cells, prefix search).

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why does <code>hash(key) % N</code> break when you add one node?</summary>

Because the divisor changes. For most keys, `hash(key) % N` and `hash(key) % (N+1)` produce different bucket numbers, so the system remaps a large fraction of all keys. In a cache this creates a miss storm; in storage it means huge data movement.
</details>

<details><summary>2. In a hash ring, how do you find the owner of a key?</summary>

Hash the key to a point on the ring, then walk clockwise to the first node. That node owns the key's range. The node owns the interval from its predecessor up to itself.
</details>

<details><summary>3. If there are K keys and N balanced nodes, about how many keys move when adding one node?</summary>

About `K/N` in interview shorthand (more precisely near `K/(N+1)` for the new node's final share). The important contrast is: a small fraction moves, not almost all `K` keys.
</details>

<details><summary>4. What are virtual nodes, and why are they needed?</summary>

A physical machine appears many times on the ring (`nodeA#1`, `nodeA#2`, ...). This breaks one large random range into many small ranges, improving balance, smoothing rebalancing and allowing weighted capacity.
</details>

<details><summary>5. How do you place replicas on a ring?</summary>

The primary is the first node clockwise from the key. Replicas are the next `R-1` distinct physical nodes clockwise, preferably in different racks/AZs. Skip additional virtual nodes belonging to the same physical node.
</details>

<details><summary>6. Does consistent hashing solve hot keys?</summary>

No. It balances key ownership under uniform hashing, not request rate. A single popular key can overload one node. Use hot-key replication, key splitting, request coalescing, celebrity handling or load-aware routing.
</details>

<details><summary>7. When might rendezvous hashing be simpler than a ring?</summary>

When the cluster is small or medium and you want deterministic placement without maintaining a ring: score each node with `hash(key, nodeId)` and pick the highest. It gives minimal disruption and supports weights, but naïve lookup is `O(N)`.
</details>

<details><summary>8. Why is consistent hashing relevant to DrawBoard?</summary>

Room servers can be selected by `boardId`. With consistent hashing, adding or losing a room-service instance only moves a fraction of boards, instead of forcing every active board to reconnect to a new owner.
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
| [Hello Interview: Consistent Hashing](https://www.hellointerview.com/learn/system-design/core-concepts/consistent-hashing) | Exact headings: "Consistent Hashing via an Example", "First Attempt: Simple Modulo Hashing", "Consistent Hashing", "Addressing Hot Spots", "Data Movement in Practice", "Consistent Hashing in the Real World", "When to use Consistent Hashing in an Interview" | ~25 min |
| **Alex Xu Vol 1, ch 5: Consistent Hashing** | Whole chapter; especially the ring, virtual nodes and rebalancing explanation | [PDF p.71](<../../../Books/System Design Interview Vol 1 - Alex Xu.pdf#page=71>) |
| **DDIA ch 6: Partitioning** | "Partitioning of Key-Value Data" and "Rebalancing Partitions" for the database view of the same problem | [p.223](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=223>) · [p.231](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=231>) |

**Connects to:** [B4 Replication](B4-Replication.md) · [B5 Sharding](B5-Sharding.md) · [B7 CAP](B7-CAP-Consistency.md) · [C1 Cache patterns](../C-Caching/C1-Cache-Patterns.md) · [C2 Redis](../C-Caching/C2-Redis.md) · Questions: KV store (#10), Rate limiter (#2), Web crawler (#7), Chat (#3)
