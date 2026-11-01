# B4 · Replication: keeping copies of data on many machines

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Key-value store (#10), Chat (#3), News feed (#4), URL shortener (#1: read replicas), Payment (#16), every "what if this DB node dies?" follow-up.

---

## Why this topic matters

Every system design answer eventually hits the question **"your database is a single machine; what happens when it dies, or can't handle the reads?"** Replication is the answer. That means keeping the **same data on several machines**.

It gives you three things:

| Goal | Example |
|---|---|
| **High availability:** survive a machine dying | Leader crashes, a follower takes over in seconds |
| **Read scaling:** spread reads across copies | 1 leader takes writes, 5 replicas serve feed reads |
| **Lower latency:** keep data close to users | A replica in Mumbai for Indian users, one in Virginia for US users |

If data never changed, replication would be trivial: copy it once. **All the difficulty comes from handling changes.** A write lands on one machine, and the others have to learn about it. How and when they learn it is the whole topic.

There are three families of approach: **single-leader**, **multi-leader** and **leaderless**. Interviewers expect you to pick one and justify the choice.

---

## Part 1: single-leader replication (the default you'll use 80% of the time)

```
          writes                     
Client ─────────────► LEADER ──── replication log ────┬──► Follower 1
                        │                              ├──► Follower 2
          reads         │                              └──► Follower 3
Client ◄────────────────┴──────── (reads can go to any of them)
```

- One node is the **leader** (also called primary or master). **All writes go to it.**
- The leader writes locally, then sends the change to **followers** (replicas or secondaries) through a **replication log**.
- Reads can be served by the leader *or* any follower.

This is how Postgres, MySQL, MongoDB (replica sets), Redis replication and Kafka partitions work.

### Sync vs async: the first trade-off

| Mode | How it works | Pro | Con |
|---|---|---|---|
| **Synchronous** | Leader waits for the follower's "got it" before confirming to the client | Follower is guaranteed up to date | One slow or dead follower **blocks all writes** |
| **Asynchronous** | Leader confirms immediately; followers catch up later | Fast; never blocked by followers | If the leader dies, **recent confirmed writes can be lost** |
| **Semi-synchronous** | **One** follower is synchronous, the rest async | At least 2 nodes always have the latest data | Slightly slower writes |

**In practice:** most systems run async or semi-sync. Fully synchronous replication to all followers is impractical, because one bad node halts the whole system.

**Interview line:** "I'll use semi-synchronous replication: one sync follower in another availability zone so we never lose a confirmed payment, and async followers for read scaling."

### Adding a new follower (without stopping writes) ⏭ *Skip for interviews*

You can't just copy files while writes are flowing in. The standard method:
1. Take a **consistent snapshot** of the leader, tied to an exact position in the replication log.
2. Copy the snapshot to the new follower.
3. The follower asks the leader for **every change since that log position** and catches up.

### When nodes fail

**Follower failure (easy):** the follower knows the last log position it processed. When it comes back, it asks for everything after that. This is called **catch-up recovery**.

**Leader failure (hard): failover.**
1. **Detect** that the leader is dead. Usually via a timeout: no heartbeat for about 30 seconds.
2. **Choose** a new leader. Ideally the follower with the most up-to-date data; often done by a consensus or election (see I1).
3. **Reconfigure** clients to send writes to the new leader.

Failover sounds simple but is full of traps. **Interviewers love these:**
- **Lost writes:** with async replication, the new leader may be missing the old leader's last writes. If the old leader returns, its extra writes are usually **discarded**. GitHub once had an incident where a lagging MySQL follower was promoted and reused already-issued auto-increment IDs, which collided with IDs stored in Redis.
- **Split brain:** two nodes both believe they're the leader and both accept writes. Data diverges. Fixes: fencing ("shoot the other node in the head") and consensus-based leader election.
- **Choosing the timeout:** too short means unnecessary failovers during a load spike (making things worse); too long means minutes of downtime.

### How the replication log is actually sent ⏭ *Skip for interviews*

| Method | What gets sent | Problem |
|---|---|---|
| **Statement-based** | The SQL statement itself (`UPDATE … SET x = NOW()`) | Non-deterministic functions (`NOW()`, `RAND()`) give different results on each replica |
| **WAL shipping** | Low-level disk-byte changes from the write-ahead log | Tied to the storage format, so leader and followers must run the **same DB version** (hard for zero-downtime upgrades) |
| **Logical (row-based)** | "Row id=42: column name changed to 'X'" | ✅ Version-independent. Also readable by *other* systems. This is **Change Data Capture** (see D4). |
| **Trigger-based** | Application-level code copies changes | Flexible but slow and error-prone |

The logical log matters beyond replication. It's how you stream DB changes into Elasticsearch, a cache or Kafka (the outbox and CDC patterns).

---

## Part 2: replication lag, where "eventual consistency" bites real users

With async followers, a follower may be **seconds behind** the leader (minutes under heavy load). Reads from that follower return **stale data**. "Eventually" everything catches up, but users see weird things in the meantime. Three classic anomalies, each with a named fix:

### 1. Read-your-own-writes
> *You post a comment, refresh, and your comment is gone.* The write went to the leader; the refresh read from a lagging follower.

**Fixes:**
- Read **the user's own data** from the leader (their profile, their posts); read everyone else's from followers.
- For 1 minute after a user writes, route **that user's** reads to the leader.
- The client remembers the timestamp of its last write; a replica serves the read only if it has caught up to at least that point.
- **Cross-device catch:** a user posts from their phone and checks on a laptop. The "last write timestamp" must live on the server, not in one device's memory.

### 2. Monotonic reads
> *You refresh twice. The first time you see 5 comments, the second time 4.* The two reads hit two followers with different lag, so time appears to go backwards.

**Fix:** always route a given user to the **same replica**, for example `replica = hash(userId) % N`. If that replica dies, reroute.

### 3. Consistent prefix reads
> *You see the answer before the question:*
> "Mrs Cake: About 10 seconds, Mr. Poons." … then … "Mr. Poons: How far into the future can you see?"

This happens when causally related writes land on **different partitions** that replicate at different speeds.

**Fix:** write causally related data to the **same partition** (for example, all messages of one chat thread in one partition). This is exactly why chat systems partition by `conversation_id`.

### The practical takeaway
In an interview, whenever you say "read replicas", **immediately address lag**:
> "Feed reads go to replicas; a few seconds of staleness is fine. But after a user posts, we read their own timeline from the leader for 60 seconds, so they always see their own post."

That one sentence signals real-world experience.

---

## Part 3: multi-leader replication

**More than one node accepts writes**, and each leader replicates to the others.

### When you actually want it

1. **Multiple datacenters:** one leader per region. Users write locally (fast), and regions sync asynchronously. Survives a whole datacenter outage.
2. **Offline clients:** every device is its own "leader". Calendar apps, notes apps and mobile apps with an offline mode. Your phone accepts writes offline and syncs later.
3. **Collaborative editing:** Google Docs, Figma and **your DrawBoard**. Every browser tab holds a local copy, applies edits immediately, and syncs. That's multi-leader replication, with the conflict problem solved by CRDTs (Yjs).

### The big problem: write conflicts

Two leaders accept conflicting writes at the same time (user A sets the title to "B", user B sets it to "C"). Both succeed locally. When they sync, which one wins?

| Strategy | How | Trade-off |
|---|---|---|
| **Avoid conflicts** | Route all writes for a record to the same leader (user → home region) | Simplest, and the most common. Breaks when a user moves region or a DC fails. |
| **Last write wins (LWW)** | Highest timestamp wins | Simple, but **silently loses data**. Clocks are unreliable. |
| **Merge values** | Keep both ("B/C") or ask the user | Correct, but pushes complexity to the app or user |
| **CRDTs / OT** | Data structures that merge automatically and deterministically | Great for text, lists, counters and sets. **This is what Yjs does in DrawBoard.** |

### Topologies ⏭ *Skip for interviews*

How leaders forward writes to each other: **all-to-all** (most common, but messages can arrive out of order), **circular** or **star** (a single node failure can break the chain). Just know the names and that all-to-all is the usual choice.

**Interview rule:** avoid multi-leader unless you need multi-region writes or offline/collaborative editing. If you choose it, you **must** explain conflict resolution. Otherwise it's a red flag.

---

## Part 4: leaderless replication (Dynamo-style)

**No leader at all.** The client, or a coordinator node, sends each write to **several replicas in parallel**, and reads from several in parallel. Used by **Amazon Dynamo** (the paper), **Cassandra**, **Riak** and **ScyllaDB**. DynamoDB, the AWS product, is different internally, but the ideas are the same.

### Quorums: the core idea

- **N** = number of replicas for each piece of data (for example 3)
- **W** = replicas that must confirm a write
- **R** = replicas that must answer a read

**If W + R > N, every read overlaps with at least one node that has the latest write.**

```
N = 3, W = 2, R = 2   →   2 + 2 > 3 ✓

Write "x=5":  [Node A ✓]  [Node B ✓]  [Node C ✗ down]
Read  x:      [Node B → 5] [Node C → 4 (stale)]  → take the newest version → 5 ✓
```

Common tunings:
| Setting | Effect |
|---|---|
| N=3, W=2, R=2 | Balanced; tolerates 1 node down for both reads and writes |
| W=N, R=1 | Fast reads, slow and fragile writes |
| W=1, R=N | Fast writes, slow reads |
| W + R ≤ N | Faster and more available, but **stale reads are possible** (eventual consistency) |

This is what **"tunable consistency"** means in Cassandra (`QUORUM`, `ONE`, `ALL`).

### How stale replicas get fixed
- **Read repair:** during a read, the client notices Node C returned an old version and writes the new value back to it. Works well for frequently read data.
- **Anti-entropy:** a background process compares replicas (using Merkle trees) and copies missing data. Covers rarely read data.

### Sloppy quorums and hinted handoff ⏭ *Skip for interviews*
If the "home" nodes for a key are unreachable, the system may accept the write on **other** nodes temporarily. This is a sloppy quorum: availability wins over consistency. When the home nodes return, the temporary nodes hand the data back (hinted handoff).

Trade-off: even with W + R > N, you might not read the latest value, because the write went to different nodes.

### Quorums aren't magic
Even with W + R > N, edge cases can return stale data:
- sloppy quorums
- concurrent writes
- a write that succeeded on fewer than W nodes and was never rolled back
- a node restored from an old replica

**Quorums give "probably fresh", not true linearizability.** For "exactly one person gets the seat", use a leader with transactions or consensus (see G1, G2, I1).

### Concurrent writes ⏭ *Skip for interviews*
Two clients write the same key at the same time to different nodes. Options:
- **LWW:** Cassandra's default. Simple, but it silently drops one write.
- **Version vectors:** track causality per replica, detect true concurrency, and keep **siblings** for the app to merge (Riak, and the original Dynamo shopping cart, which merged carts, so deleted items could reappear).

---

## Part 5: choosing in an interview (the cheat sheet)

| Scenario | Choice | Why |
|---|---|---|
| Typical app: users, orders, bookings, payments | **Single-leader** (Postgres/MySQL) + read replicas + semi-sync | Simple, strong consistency for writes, transactions work |
| Read-heavy feed, URL-shortener redirects | Single-leader + **many async read replicas** + cache | Reads scale out; slight staleness is fine |
| Huge write volume, always-on, simple key access (chat messages, IoT, metrics) | **Leaderless** (Cassandra/DynamoDB), N=3, quorum | Write availability, no failover step |
| Multi-region with local writes | **Multi-leader** or per-region leaders with home-region routing | Low latency; conflicts avoided by routing |
| Offline-first / collaborative editing | **Multi-leader + CRDT** (Yjs, Automerge) | Every client is a leader; CRDTs merge automatically |
| Money, inventory, "exactly one winner" | **Single-leader with transactions** (never LWW) | Correctness over availability |

### Common interview traps
- Saying "add read replicas" **without addressing replication lag**. Mention read-your-writes.
- Saying "failover is automatic" without mentioning **split brain** or **lost async writes**.
- Choosing Cassandra for payments "because it scales". Leaderless + LWW can lose writes.
- Choosing multi-leader without a **conflict-resolution** story.
- Confusing **replication** (same data copied everywhere, covered here) with **sharding** (data split into pieces, B5). Real systems do **both**: each shard is replicated.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why do most production systems use asynchronous or semi-synchronous replication instead of fully synchronous?</summary>

With fully synchronous replication, every write waits for every follower. One slow or dead follower blocks all writes, so availability gets worse as you add replicas. Semi-sync (one sync follower) guarantees the data is on 2 nodes without that fragility.
</details>

<details><summary>2. A user updates their profile photo, refreshes, and sees the old photo. Name the anomaly and give two fixes.</summary>

**Read-your-own-writes** violation, caused by replication lag. Fixes: (1) read the user's own profile from the leader; (2) after a write, route that user's reads to the leader for about 1 minute; or (3) track the last write timestamp and only read from replicas that have caught up to it.
</details>

<details><summary>3. N = 3. You want to tolerate one node down for both reads and writes, and still read the latest value. Pick W and R.</summary>

W = 2, R = 2. Then W + R = 4 > 3, so reads overlap with the latest write, and each operation needs only 2 of 3 nodes, so one node can be down.
</details>

<details><summary>4. What is split brain, and why is it dangerous during failover?</summary>

Two nodes both believe they're the leader and both accept writes, so data diverges and may be corrupted or lost when you reconcile. Prevent it with fencing (forcibly shutting down the old leader) and consensus-based leader election with leases or epochs.
</details>

<details><summary>5. Why is "last write wins" dangerous for a shopping cart or bank balance?</summary>

LWW silently discards one of two concurrent writes, based on timestamps from unreliable clocks. A cart loses an added item; a balance loses a deposit. Use single-leader transactions for money, or merge logic or CRDTs (set union for a cart).
</details>

<details><summary>6. Your DrawBoard uses Yjs. Which replication model is that, and how are conflicts handled?</summary>

**Multi-leader**: each client is a leader that accepts local edits offline or instantly and syncs later. Conflicts are resolved automatically and deterministically by CRDTs, so every replica converges to the same state without a central authority deciding.
</details>

<details><summary>7. Replication vs sharding: what's the difference, and do real systems use both?</summary>

Replication = **the same data** copied to several nodes (for availability and read scaling). Sharding = **different data** on different nodes (for write and storage scaling). Real systems use both: the data is split into shards, and each shard is replicated (for example, each Kafka partition has replicas, and each Cassandra token range is on N nodes).
</details>

<details><summary>8. Why does a chat system partition messages by <code>conversation_id</code>? Connect it to this topic.</summary>

For **consistent prefix reads**: messages within one conversation are causally related (replies follow questions). Keeping them in one partition preserves their order, so a reader never sees an answer before its question.
</details>

---

## My notes (write from memory after reading)

- 
- 
- 

**One thing I'd have got wrong before reading this:**

---

## Sources / read more

| Source | What to read | Where |
|---|---|---|
| **DDIA ch 5: Replication** (your PDF, 1st ed) | Whole chapter; this blog follows its structure | [PDF p.173](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=173>) |
| ↳ Leaders and Followers (sync/async, new followers, outages, replication logs) | Part 1 above | [p.174](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=174>) → [p.175](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=175>) · [p.178](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=178>) · [p.180](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=180>) |
| ↳ Problems with Replication Lag (read-your-writes, monotonic, consistent prefix) | Part 2 above | [p.183](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=183>) → [p.184](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=184>) · [p.186](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=186>) · [p.187](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=187>) |
| ↳ Multi-Leader Replication (use cases, conflicts, topologies) | Part 3 above | [p.190](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=190>) · conflicts [p.193](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=193>) |
| ↳ Leaderless Replication (quorums, limits, sloppy quorum, concurrent writes) | Part 4 above | [p.199](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=199>) · limits [p.203](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=203>) · [p.205](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=205>) · [p.206](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=206>) |
| ↳ Chapter summary | 2-page recap, good for revision | [p.214](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=214>) |
| [System Design Primer: Replication](https://github.com/donnemartin/system-design-primer#replication) | "Master-slave" and "Master-master" subsections (short, diagram-based) | ~10 min |
| **Alex Xu Vol 1, ch 6: Key-Value Store** | Sections "Data replication", "Consistency" (quorum) and "Handling failures" (hinted handoff, Merkle trees): leaderless replication applied to an interview question | [PDF p.87](<../../../Books/System Design Interview Vol 1 - Alex Xu.pdf#page=87>) |

> **Tip:** PDF page links (`#page=`) jump to the page when opened in Chrome or Edge. In VS Code, the link opens the PDF at page 1; use the page number shown.

**Connects to:** B5 Sharding · B6 Consistent hashing · B7 CAP · D4 Outbox + CDC · E3 Collaborative sync (DrawBoard) · I1 Leader election · Questions: KV store (#10), Chat (#3), News feed (#4)
