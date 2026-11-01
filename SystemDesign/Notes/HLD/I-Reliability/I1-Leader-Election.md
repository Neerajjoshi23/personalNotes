# I1 · Leader Election: choosing one owner when the system has many nodes

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Distributed job scheduler (#21), key-value store (#10), chat presence / partition ownership (#3), crawler workers (#7), any "who is the primary?" failover follow-up.

---

## Why this topic matters

A distributed system often has **many machines that could do the work, but only one should do a particular job at a time**. Without coordination, two nodes may both believe they are responsible and make conflicting writes.

Examples you will actually design:

| System | Why one leader helps |
|---|---|
| Distributed job scheduler (#21) | Only one scheduler should enqueue today's cron jobs, or every worker runs them twice. |
| Database shard / Kafka partition | One leader accepts writes for a partition; followers replicate. |
| Cache warmer / migration / compaction | Expensive background work should not be duplicated by every app instance. |
| Adobe Connect meeting host logic | If a room-level coordinator exists, exactly one owner should make ordering / recording decisions. |
| DrawBoard room service | You may have many room servers, but one server/session lease can own a room at a time. |

Leader election is not "pick the lowest IP and move on". In a real network, packets pause, processes stop-the-world for GC, clocks drift, and old leaders can come back. The hard problems are **split brain**, **fencing**, and **what happens after failover**.

**Interview line:** "I will avoid home-grown leader election. I will use a consensus-backed coordination service such as ZooKeeper/etcd, acquire a lease, and attach a monotonically increasing fencing token to every external write."

---

## Part 1: why coordination is needed

In one process, coordination is a mutex. In a cluster, the mutex has to survive node crashes and network partitions.

```
          ┌──────────────┐
          │ cron_jobs DB │
          └──────▲───────┘
                 │
       claim due jobs / write results
                 │
 ┌───────────────┼────────────────┐
 │               │                │
Scheduler A   Scheduler B      Scheduler C
```

If all three schedulers scan `cron_jobs` every minute and enqueue due work, you get duplicate jobs. Duplicates are sometimes okay if the job is idempotent; they are disastrous for "charge card", "send salary", or "mark seat sold".

Common coordination targets:

1. **Schedulers:** one active scheduler creates due job instances.
2. **Single writer:** one primary accepts writes for a record, shard, room, or stream partition.
3. **Partition leaders:** each partition has its own leader, so the whole cluster can scale while each partition remains ordered.
4. **Membership:** services need to know which nodes are currently alive, so they can rebalance work.

You can implement some of this with a database transaction and row locks. For example, a job queue can let workers claim rows directly. But when you need **cluster membership, failover, watches, and leader election as a shared primitive**, systems usually use ZooKeeper, etcd, Consul, or a managed cloud equivalent.

---

## Part 2: leases are useful, but they are not magic

A **lease** says: "node A is leader until time T, unless it renews." The coordinator grants the lease; the leader periodically renews it.

```
A acquires lease: leader(room-42), token=17, expires at coordinator time + 10s
A renews every 3s
If A stops renewing, B may acquire token=18
```

Why leases are better than a forever lock:

- If the leader crashes, the lease expires and another node can take over.
- If the leader loses network access to the coordinator, it cannot renew, so the system eventually recovers.
- The lease can carry a **generation / fencing token**: 17, 18, 19...

The dangerous assumption is: "my local clock says the lease is still valid, therefore I am safe." Local clocks are not enough. A process can pause for 30 seconds, wake up, and continue writing while another leader has already taken over.

### Fencing tokens: the missing half

A fencing token is a monotonically increasing number issued with the lease. Every write to an external resource includes it, and the resource rejects old tokens.

```
Lease service grants:
  A -> token 17
  B -> token 18

Storage rule:
  accept write only if token >= last_token_seen_for_resource
```

If old leader A wakes up and sends `token=17`, storage rejects it because `token=18` already won. This protects you even if A still thinks it is leader.

Without fencing, "distributed lock" often means "best-effort duplicate reduction", not correctness.

**Interview line:** "The lease decides who should be leader; the fencing token prevents an old leader from corrupting state after it loses leadership."

---

## Part 3: ZooKeeper / etcd coordination model

ZooKeeper and etcd are small, strongly consistent coordination systems. They are not meant to be your main product database. They are optimized for **small metadata with linearizable operations**: locks, leader election, configuration, membership, and watches.

### ZooKeeper idea: znodes, ephemeral nodes, watches

A common election recipe:

1. Each candidate creates an **ephemeral sequential node** under `/election`, for example `/election/candidate-0000000017`.
2. The candidate with the lowest sequence number is leader.
3. Every candidate watches the node immediately before it.
4. If the leader's session dies, ZooKeeper deletes its ephemeral node.
5. The next candidate's watch fires; it checks whether it is now lowest.

```
/election
  candidate-0000000017  ← leader, session A
  candidate-0000000018  ← watches 17
  candidate-0000000019  ← watches 18
```

Important details:

- **Ephemeral node:** tied to a client session; removed when the session expires.
- **Watch:** a one-time notification that a node changed/deleted. The client must re-check state after receiving it.
- **Sequential suffix:** creates a total order and can act like a fencing token.
- **Session timeout:** if heartbeats stop longer than the timeout, ZooKeeper treats the client as dead.

### etcd idea: lease + key + revision

etcd exposes a key-value API backed by Raft. A leader election often uses:

- a lease with TTL,
- a key such as `/leaders/scheduler`,
- a compare-and-swap transaction that creates the key only if absent,
- the key's create revision / lease ID as a generation.

Both systems rely internally on consensus so clients see a single agreed order of updates.

### What not to put in ZooKeeper / etcd

Do not store chat messages, meeting recordings, feed items, or large JSON blobs there. Keep it to small control-plane state:

- which node owns partition 37,
- feature flag / config values,
- service membership,
- leader election keys,
- shard assignment metadata.

---

## Part 4: Raft at a high level

Raft is a consensus algorithm used by etcd and many coordination systems. You do not need to derive the paper in an interview, but you should know the mental model.

```
States: follower ──timeout──► candidate ──wins majority──► leader
          ▲                         │                         │
          └──────── leader heartbeat / AppendEntries ◄────────┘
```

### Terms and votes ⏭ *Skip for interviews*

Time is split into **terms**. A term is like an election epoch.

1. Followers expect heartbeats from a leader.
2. If a follower times out, it becomes a candidate, increments the term, and asks peers for votes.
3. A candidate becomes leader only after a **majority** grants votes.
4. A node votes at most once per term.
5. If a node sees a higher term, it steps down.

The majority rule matters: two different candidates cannot both get a majority in the same term.

### Log replication ⏭ *Skip for interviews*

The leader receives client commands and appends them to its log. It sends entries to followers. Once an entry is replicated to a majority, it is **committed**, and every node applies committed entries in order.

```
Client -> Leader: set /leaders/scheduler = node-B
Leader log: [1,2,3,4]
Follower logs catch up
Majority has entry 4 -> entry 4 is committed
```

This is why coordination services can implement linearizable operations: every successful update has one agreed position in the replicated log.

### Why Raft still has a leader

Consensus does not remove leaders. It makes leadership safe by using terms, votes, and quorum replication. DDIA's useful phrasing: consensus algorithms often have a leader per epoch; if leaders conflict across epochs, the higher epoch wins.

**Interview line:** "Raft gives me a replicated log with a single agreed order. I use etcd/ZooKeeper on top of that, not Raft code in my app."

---

## Part 5: split brain and fencing

**Split brain** means two nodes both believe they are leader and accept work.

How it happens:

```
Before partition:
  A is leader, B is follower

Network partition:
  A can reach clients but not quorum
  B can reach quorum and gets elected

Bad system:
  both A and B accept writes
```

Correct systems avoid this with layered defenses:

| Defense | What it does | What it does not do |
|---|---|---|
| Quorum election | Only a node with majority can become leader | Does not stop an old paused process from sending stale writes to an external DB |
| Lease expiry | Lets another node take over after timeout | Depends on coordinator, not local clock, for truth |
| Fencing token | Lets storage reject old leaders | Requires every critical write to include and check token |
| Idempotency | Makes duplicate execution safe | Does not by itself prevent two leaders from writing conflicting values |
| Human / automated failover controls | Useful for databases | Too slow for per-partition app ownership |

For a job scheduler, fencing may be a `scheduler_epoch` column. For object storage, it may be conditional writes or a metadata row that tracks the latest token. For a payment system, the token alone is not enough; you also need idempotency keys and ledger constraints.

---

## Part 6: distributed job scheduler design

A simple, interview-ready design uses a relational DB as the source of truth and workers that claim jobs transactionally.

### Core tables

```sql
CREATE TABLE cron_jobs (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  cron_expr       TEXT NOT NULL,
  next_run_at     TIMESTAMPTZ NOT NULL,
  enabled         BOOLEAN NOT NULL DEFAULT true,
  idempotency_key TEXT NOT NULL
);

CREATE TABLE job_runs (
  id              BIGSERIAL PRIMARY KEY,
  cron_job_id     BIGINT NOT NULL REFERENCES cron_jobs(id),
  scheduled_for   TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL, -- queued/running/succeeded/failed
  attempt         INT NOT NULL DEFAULT 0,
  locked_by       TEXT,
  locked_until    TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL,
  UNIQUE (cron_job_id, scheduled_for)
);
```

### One scheduler creates due runs

You can elect one scheduler with etcd/ZooKeeper. But still keep a DB uniqueness constraint, because leaders fail and retries happen.

```
leader scheduler tick:
  find cron_jobs where next_run_at <= now()
  insert job_runs(cron_job_id, scheduled_for) with UNIQUE constraint
  update next_run_at
```

If the leader repeats the tick after a crash, the unique key prevents duplicate scheduled runs.

### Many workers claim jobs safely

Postgres-style worker claim:

```sql
WITH candidate AS (
  SELECT id
  FROM job_runs
  WHERE status = 'queued'
     OR (status = 'running' AND locked_until < now())
  ORDER BY scheduled_for
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE job_runs j
SET status = 'running',
    locked_by = $1,
    locked_until = now() + interval '2 minutes',
    attempt = attempt + 1
FROM candidate
WHERE j.id = candidate.id
RETURNING j.*;
```

`FOR UPDATE SKIP LOCKED` means each worker locks a different row; locked rows are skipped instead of blocking everyone.

### Execution semantics

Most schedulers are **at-least-once**:

- a worker may crash after doing the side effect but before marking success;
- the lock expires;
- another worker retries the same job.

So every job must be idempotent:

| Job | Idempotency strategy |
|---|---|
| Send notification | Store `(user_id, template_id, scheduled_for)` as a dedup key. |
| Generate report | Write to deterministic object key and upsert metadata. |
| Charge payment | Use provider idempotency key + internal ledger transaction. |
| Recompute feed ranking | Safe overwrite of derived table / cache. |

Do not promise exactly-once execution. Promise **at-least-once execution with idempotent effects**.

**Interview line:** "The scheduler may enqueue twice after failover, so correctness comes from DB uniqueness and idempotent job handlers, not from trusting the leader perfectly."

---

## Part 7: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| One daily scheduler among many app nodes | etcd/ZooKeeper lease + DB unique constraints | Lease reduces duplicate scheduling; DB protects correctness. |
| Workers pulling independent jobs | No leader; `SELECT ... FOR UPDATE SKIP LOCKED` | Row-level locking is simpler and scales. |
| Database primary failover | DB-native consensus / managed failover | Do not build your own database election. |
| Kafka-like partition ownership | Coordinator assigns partitions; one leader per partition | Parallelism with ordered writes per partition. |
| Distributed lock for correctness-critical resource | Prefer single DB transaction; if distributed, require fencing tokens | Plain Redis-style lock without fencing is not enough. |
| DrawBoard room ownership | Lease per room + token stored with room metadata | Lets room servers rebalance while rejecting stale owners. |

### Common interview traps

- Saying "use Redis lock" without discussing lease expiry, fencing, and what happens after client pauses.
- Treating leader election as exactly-once execution. It is not; jobs still need idempotency.
- Using ZooKeeper/etcd as a high-volume product database.
- Forgetting split brain during failover.
- Depending on local clocks instead of coordinator-granted leases.
- Having every worker poll the whole cron table when a transactional claim queue is enough.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why does a distributed job scheduler need coordination?</summary>

If multiple scheduler instances independently create due job runs, the same cron job can be enqueued multiple times. Coordination elects one active scheduler, while DB uniqueness and idempotent handlers protect correctness when failover or retries still duplicate work.
</details>

<details><summary>2. What is the difference between a lease and a fencing token?</summary>

A lease says who is allowed to act for a limited time. A fencing token is a monotonically increasing generation attached to writes, so external storage can reject writes from an old leader after a newer leader has taken over.
</details>

<details><summary>3. What are ZooKeeper ephemeral nodes and watches used for?</summary>

Ephemeral nodes are tied to a client session and disappear when the session expires. Watches notify clients when a znode changes or is deleted. Together with sequential nodes, they support leader election and membership: candidates watch predecessors and take over when the prior leader disappears.
</details>

<details><summary>4. Explain Raft in 30 seconds.</summary>

Nodes are followers, candidates, or a leader. If followers stop hearing heartbeats, a candidate starts a new term and asks for votes. A majority elects one leader for that term. The leader appends client commands to a replicated log; once an entry is on a majority, it is committed and applied in order.
</details>

<details><summary>5. What is split brain?</summary>

Two nodes both believe they are leader and accept writes. It can happen around network partitions, pauses, or bad failover. Prevent it with quorum-based election and protect external resources with fencing tokens.
</details>

<details><summary>6. Why is <code>SELECT ... FOR UPDATE SKIP LOCKED</code> useful for workers?</summary>

It lets many workers concurrently claim different queued rows. A worker locks one candidate row; other workers skip that locked row instead of blocking, so the queue drains in parallel without two workers claiming the same row.
</details>

<details><summary>7. Can a job scheduler guarantee exactly-once execution?</summary>

Usually no. A worker can complete the external side effect and crash before recording success. The safe design is at-least-once execution plus idempotency keys, unique constraints, and retry-safe handlers.
</details>

<details><summary>8. When would you avoid ZooKeeper/etcd?</summary>

For high-volume application data or simple independent worker queues. Use it for small coordination metadata; use the product database, queue, or storage system for product data and high-throughput events.
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
| [Azure Architecture: Leader election pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/leader-election) | Exact headings: "Context and problem", "Solution", "Issues and considerations", "When to use this pattern", "Example" | ~20 min |
| **DDIA ch 9: Consistency and Consensus** (1st ed PDF) | "Distributed Transactions and Consensus" as context; focus on "Fault-Tolerant Consensus", "Consensus algorithms and total order broadcast", "Single-leader replication and consensus", "Epoch numbering and quorums", "Limitations of consensus", "Membership and Coordination Services" | [PDF p.374](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=374>) → [p.393](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=393>) |
| DDIA: "Fault-Tolerant Consensus" | Agreement/integrity/validity/termination; why majority matters | [p.386](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=386>) |
| DDIA: "Membership and Coordination Services" | ZooKeeper/etcd, linearizable operations, ephemeral nodes, watches | [p.392](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=392>) |

**Connects to:** [B4 Replication](../B-Data/B4-Replication.md) · [B7 CAP](../B-Data/B7-CAP-Consistency.md) · [D3 Delivery semantics + idempotency](../D-Async/D3-Delivery-Semantics-Idempotency.md) · [G2 Distributed locks + reservations](../G-Contention/G2-Distributed-Locks-Reservations.md) · [I2 Timeouts](I2-Timeouts-Retries-Backoff.md) · Questions: Distributed job scheduler (#21), KV store (#10)