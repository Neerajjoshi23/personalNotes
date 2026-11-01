# B7 · CAP + Consistency: what you promise when the network breaks

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Key-value store (#10), Ticket booking (#8), Payment (#16), Chat (#3), News feed (#4), distributed cache (#10/#2), every "what if a node or network link fails?" follow-up.

---

## Why this topic matters

Every distributed design makes a promise: when replicas disagree or a network link breaks, should the system prefer **correct answers** or **available responses**?

CAP is often misquoted as "choose any two of consistency, availability and partition tolerance." The useful version is narrower: **during a network partition, choose consistency or availability**.

| During a partition | If you choose... | User-visible result |
|---|---|---|
| Keep **Consistency** | reject or delay some requests | some users get errors/timeouts, but no stale conflicting write succeeds |
| Keep **Availability** | accept requests on both sides | users get responses, but replicas may diverge and reconcile later |

**Interview line:** "CAP only bites during a partition. Since partitions are unavoidable, I choose CP for booking and payments, but AP/eventual consistency for feeds and likes where stale data is acceptable."

This note gives you the vocabulary to make that choice precisely: CAP, PACELC, a ladder of consistency models, and the availability patterns interviewers expect.

---

## Part 1: CAP stated precisely

CAP uses three terms:

| Letter | Meaning in CAP |
|---|---|
| **C: Consistency** | Every read sees the latest successful write, like a single up-to-date copy. This is close to **linearizability**, not SQL ACID consistency. |
| **A: Availability** | Every request to a non-failing node eventually returns a non-error response. It does not mean "99.99% uptime" in the SLA sense. |
| **P: Partition tolerance** | The system continues operating despite dropped/delayed messages between nodes. |

The theorem says: **when a partition occurs, you cannot guarantee both C and A.**

```text
Client 1 ──► Replica A     X network break X     Replica B ◄── Client 2
             balance=100                         balance=100

Client 1 withdraws 100 on A.
Client 2 withdraws 100 on B.

If both sides accept writes: available, but possibly inconsistent.
If one side refuses: consistent, but unavailable to some clients.
```

### Why "CA" is mostly a trap

A single-node database can be consistent and available until that node fails. A distributed system that assumes no partitions is not partition tolerant; that is not a useful internet-scale design. In interviews, do not say "I choose CA" for a replicated system. Say:

- **CP:** under partition, preserve correctness and reject some operations;
- **AP:** under partition, keep serving and reconcile later.

CAP is also not normal-day latency. Even without partitions, stronger consistency usually costs latency because you wait for leaders, quorums or consensus. That is where PACELC helps.

---

## Part 2: PACELC: the useful extension

PACELC says:

> **If Partition (P), choose Availability (A) or Consistency (C); Else (E), choose Latency (L) or Consistency (C).**

```text
P A / E L  => during partition prefer availability; otherwise prefer low latency
P C / E C  => during partition prefer consistency; otherwise also prefer consistency
P C / E L  => partition consistency, normal-day low latency where possible
```

| System style | Partition choice | Else choice | Why |
|---|---|---|---|
| Primary SQL with sync replication | C | C | writes wait for durable/ordered state |
| Cassandra with `ONE` | A | L | accept local writes fast, reconcile later |
| Cassandra with `QUORUM` | often C-ish | more C than L | waits for multiple replicas, still not always linearizable |
| Dynamo-style shopping cart | A | L | user should keep shopping; conflicts merge later |
| ZooKeeper/etcd/consensus | C | C | coordination values must be single-copy correct |

PACELC prevents shallow CAP answers. For a feed: AP under partition and low latency otherwise. For a seat booking: CP under partition and consistency over latency for the final reserve step.

---

## Part 3: the consistency models ladder

Do not say only "strong" or "eventual". There is a ladder.

### 1. Linearizability: one real-time global order

A system is linearizable if every operation appears to happen atomically at one instant between request and response, and real-time order is respected. If write `x=2` completes before a read starts, that read must see `2` or later.

```text
T1: write x=2  ───────✓
T2:                    read x  => must see 2 or later
```

Use linearizable semantics when there is one scarce thing: one seat, one payment idempotency key, one account balance, one lock/leader, one username claim. Costs: leader/quorum/consensus, higher latency, reduced availability during partitions.

### 2. Sequential consistency: one order, but not real-time ⏭ *Skip for interviews*

All clients agree on a single order of operations, but that order may not match wall-clock completion times. It is stronger than causal/eventual, weaker than linearizable. You rarely choose this explicitly in HLD, but it helps explain the ladder.

### 3. Causal consistency: cause before effect

If operation B depends on operation A, everyone should see A before B.

```text
A: "Are you joining?"
B replies: "Yes"  (causally depends on A)

Bad: user sees "Yes" before "Are you joining?"
```

For chat, documents and comments, causal or per-conversation ordering is often enough. You do not need a single global order across all conversations.

### 4. Read-your-writes consistency

After I write something, I should see my own write. Feed/profile example: I update my profile photo, refresh, and should not see the old one. This can be implemented by reading my own user data from the leader for a short window or routing to a replica caught up to my last write timestamp.

### 5. Monotonic reads

If I read version 5 once, I should not later read version 4. Sticky routing to the same replica is a common fix.

### 6. Eventual consistency

If no new writes arrive, replicas eventually converge. In the meantime, reads can be stale and different clients can see different values.

Great for likes, view counts, feed fan-out, analytics, CDN/cache invalidation and presence approximations. Dangerous for payments, inventory finalization, seat booking, distributed locks and uniqueness constraints.

**Interview line:** "The feed can be eventually consistent, but the follow graph update should be read-your-writes for the acting user, and payment/booking state should be linearizable or transactionally serialized."

---

## Part 4: where common interview questions sit

| Question area | Preferred consistency | Why |
|---|---|---|
| Ticket / hotel booking (#8) | CP for final reservation; linearizable row/seat update | exactly one user gets a seat |
| Payment / wallet (#16) | CP, transactions, idempotency, ledger | money cannot be double-spent or silently lost |
| Unique username / coupon claim | linearizable / serializable write | one winner |
| Key-value store (#10) | tunable: AP/eventual or quorum depending use case | KV store is a platform; expose consistency options |
| Chat (#3) | per-conversation ordering + read-your-writes; not global linearizability | users need sensible message order, not one global order |
| News feed (#4) | AP/eventual for feed materialization and likes | stale feed is acceptable; low latency matters |
| Likes / counters | eventual + approximate sometimes | exact count is rarely user-critical |
| Search index (#17) | eventual via CDC | new posts may take seconds to appear |
| Cache (#2/#10) | eventual/stale bounded by TTL | source of truth remains DB |

### Booking/payments are CP

In a partition, the safe side is to reject or queue operations if you cannot reach the authority. A ticketing system can say "temporarily unavailable"; it cannot sell the same seat twice and fix it later with an apology. A typical design keeps seat inventory in a strongly consistent database partitioned by event/seat, uses `SELECT ... FOR UPDATE` or optimistic version checks, caches availability as a hint only, and makes the final booking check the source of truth.

### Feeds/likes are AP

If a user in one region likes a post and another region sees the count 200 ms late, the product is fine. The system should keep serving reads/writes, then reconcile. A typical design writes events to a durable log, fans out asynchronously, converges counters, shows slightly stale counts or "99+", and repairs from source events if needed.

---

## Part 5: availability patterns from the system-design toolbox

CAP availability is theoretical, but interviews also ask practical availability: "what if a node dies?"

### Fail-over

A standby or follower takes over when the primary dies.

```text
Client -> LB -> Primary DB
              -> Standby DB (replicated)

Primary dies -> promote standby -> clients reconnect
```

Risks: failover timeout too short causes false failovers, async replication can lose recent writes, and split brain appears if two primaries accept writes. Connect to [B4 Replication](B4-Replication.md) and [I1 Leader election](../I-Reliability/I1-Leader-Election.md).

### Replication

Copies data or service instances so one failure does not remove the service. Variants: active-passive, active-active, read replicas and multi-region replicas. More replicas improve availability but create lag, conflict and failover complexity.

### Graceful degradation

Serve a weaker feature rather than fail everything: show cached feed if ranking service is down, disable recommendations if that service fails, accept chat messages but delay search indexing, or in Adobe Connect keep audio/video going even if analytics ingestion is delayed.

### Backpressure and load shedding

Availability can be destroyed by overload. Queues, rate limiters, circuit breakers and virtual waiting rooms preserve core paths by rejecting or delaying non-critical work.

CAP does not replace these patterns. CAP tells you what correctness to sacrifice under partitions; availability engineering tells you how to survive ordinary failures and overload.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Final payment debit | CP + transaction/ledger + idempotency key | correctness over availability |
| Seat hold confirmation | CP for hold row; cache only as hint | avoid double booking |
| Timeline reads | AP/eventual + cache | stale feed beats slow feed |
| User posts then refreshes | read-your-writes for that user | avoids confusing UX |
| Chat messages in one room | per-room ordering / causal consistency | answer should not appear before question |
| Distributed lock / leader election | linearizable store (ZooKeeper/etcd style) | split brain is worse than unavailability |
| Analytics counters | eventual, maybe approximate | exact latest value not worth latency |
| Multi-region profile update | home-region leader or conflict resolution | avoid uncontrolled multi-writer conflicts |

### Common interview traps

- Saying "CAP means choose two" without mentioning **during a partition**.
- Treating CAP consistency as ACID consistency. CAP C is closer to linearizability.
- Calling a system "CA" even though it is replicated across machines and must tolerate partitions.
- Choosing AP for payments because "availability is important". Money correctness comes first.
- Saying Cassandra quorum is automatically linearizable. Quorums can still have edge cases and depend on settings.
- Ignoring UX-level guarantees like read-your-writes, which often matter more than global strong consistency.

---

## Self-test (answer out loud first, then open)

<details><summary>1. State CAP precisely in one sentence.</summary>

When a network partition occurs, a distributed system cannot guarantee both linearizable consistency and availability; it must either reject/delay some operations (CP) or keep responding with possible divergence (AP).
</details>

<details><summary>2. Why is "choose CA" usually a bad distributed-system interview answer?</summary>

Because real distributed systems must tolerate partitions. "CA" only makes sense if you assume partitions do not happen or you are talking about a single node, which is not the interesting HLD case.
</details>

<details><summary>3. What does PACELC add to CAP?</summary>

It adds the normal-operation trade-off: if there is a Partition, choose Availability or Consistency; Else, choose Latency or Consistency. It explains why consistency can cost latency even when the network is healthy.
</details>

<details><summary>4. Give one CP and one AP example from interview questions.</summary>

CP: final seat booking or payment debit, because double booking/double spending is unacceptable. AP: news feed likes or feed materialization, because stale data is acceptable and low latency matters.
</details>

<details><summary>5. Linearizability vs read-your-writes: what's the difference?</summary>

Linearizability is a global single-copy illusion respecting real-time order for all clients. Read-your-writes is a client/session guarantee: after I write, I see my own write. It is weaker and often cheaper.
</details>

<details><summary>6. Why does chat usually not need global linearizability?</summary>

Users need sensible per-conversation order and causality, not one global order across every chat in the world. Partitioning by `conversation_id` and preserving per-thread order is enough for most chat designs.
</details>

<details><summary>7. A user updates their profile and refreshes but sees the old value. Which guarantee is missing?</summary>

Read-your-writes consistency. Fix by reading that user's data from the leader for a short window, storing a last-write timestamp, or routing to a replica that has caught up.
</details>

<details><summary>8. How do fail-over and replication relate to availability?</summary>

Replication keeps extra copies or instances. Fail-over promotes or routes to a healthy copy when the current one fails. They improve practical availability but introduce risks like replication lag, lost writes and split brain.
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
| [Hello Interview: CAP Theorem](https://www.hellointerview.com/learn/system-design/core-concepts/cap-theorem) | Exact headings: "What is CAP Theorem?", "Understanding CAP Theorem Through an Example", "When to Choose Consistency", "When to Choose Availability", "CAP Theorem in System Design Interviews", "Advanced CAP Theorem Considerations", "Different Levels of Consistency" | ~25 min |
| [System Design Primer: CAP theorem](https://github.com/donnemartin/system-design-primer#cap-theorem) | Exact heading: "CAP theorem" | ~5 min |
| [System Design Primer: Consistency patterns](https://github.com/donnemartin/system-design-primer#consistency-patterns) | Exact headings: "Consistency patterns", "Weak consistency", "Eventual consistency", "Strong consistency" | ~10 min |
| [System Design Primer: Availability patterns](https://github.com/donnemartin/system-design-primer#availability-patterns) | Exact headings: "Availability patterns", "Fail-over", "Replication", "Availability in numbers" | ~10 min |
| **DDIA ch 9: Consistency and Consensus** | Chapter intro, "Consistency Guarantees" and "Linearizability" | [p.343](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=343>) · [p.344](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=344>) · [p.346](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=346>) |

**Connects to:** [B3 Transactions + isolation](B3-Transactions-Isolation.md) · [B4 Replication](B4-Replication.md) · [B6 Consistent hashing](B6-Consistent-Hashing.md) · [G2 Distributed locks + reservations](../G-Contention/G2-Distributed-Locks-Reservations.md) · [I1 Leader election](../I-Reliability/I1-Leader-Election.md) · Questions: KV store (#10), Booking (#8), Payment (#16), Feed (#4), Chat (#3)
