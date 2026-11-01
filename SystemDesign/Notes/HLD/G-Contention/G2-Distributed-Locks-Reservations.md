# G2 · Distributed Locks + Reservations: locks are leases, reservations are state

> **Status:** [ ] Read the blog ? [ ] Read the sources ? [ ] Self-test passed · **Date:** ___
> **Used in:** Ticket / hotel booking (#8), Payment / wallet (#16), Flash sale / e-commerce (#18), Distributed rate limiter (#2), Distributed job scheduler (#21)

---

## Why this topic matters

Every contention-heavy design has a moment where many workers want the same thing: one seat, one coupon, one inventory item, one cron job, one payment transition. The tempting answer is "take a distributed lock". The senior answer is: **what correctness property do you need, and what happens if the lock expires while the work is still running?**

| Problem | Better mental model |
|---|---|
| "Only one worker should run this job" | Leader election / lease with fencing |
| "Only one user should get this seat" | DB constraint + reservation state, not just a lock |
| "Avoid duplicate expensive work" | Cache stampede lock may be okay; correctness loss is tolerable |
| "Move money exactly once" | Idempotency + ledger state machine; a lock is not enough |

A distributed lock is usually a **lease**: it has an expiry time because the lock holder might die. That expiry is both the feature and the danger. If the holder pauses for longer than the TTL, another client can acquire the lock while the old client continues and writes stale data. This is why Kleppmann's fencing-token idea is the most important takeaway.

**Interview line:** "For a seat booking I won't rely on a Redis lock as the source of truth. I'll use a short reservation row with `status` and `expires_at`, plus a uniqueness/transaction boundary in the DB. Redis can reduce load, but the database enforces correctness."

---

## Part 1: when do you actually need a distributed lock?

A local mutex protects threads inside one process. A distributed lock coordinates **different processes or machines**. You need one only when all of these are true:

1. There is shared mutable state or a shared external resource.
2. Multiple independent workers can act on it concurrently.
3. The resource cannot cheaply reject stale or duplicate operations by itself.
4. You have a plan for lock holder crashes, slow networks and process pauses.

Good uses:

- **Efficiency locks:** avoid duplicate work, such as one worker rebuilding a hot cache key. If the lock fails, two workers compute the same value; annoying but not corrupting.
- **Coordination locks with fencing:** one compactor, one scheduler leader, one migration worker, where the downstream system checks a monotonically increasing token.
- **Short critical sections:** acquire, change a small piece of state, release. Not "hold lock while calling five services".

Dangerous uses:

- **Long user flows:** "hold the seat while user enters card details". Users disappear. Browsers close. TTLs expire.
- **Money movement:** duplicate PSP calls or ledger writes must be prevented with idempotency keys and durable state, not only a lock.
- **Anything where the lock protects an object that cannot reject stale writers.** If stale writers can still write, the lock is only a hope.

A lock is not a transaction. A transaction changes durable state atomically. A lock only tries to control who is allowed to attempt the change.

```
Bad: lock is treated as truth
Client -> Redis lock seat:42 -> payment -> mark seat SOLD

Better: DB row is truth
Client -> reserve seat row (status=HELD, expires_at=T)
       -> payment with idempotency key
       -> confirm row HELD->SOLD if still owned and not expired
```

Think of DrawBoard: you do **not** lock the whole whiteboard while one user drags a shape. You let edits merge through Yjs. Locks fit resources that cannot be merged: a seat, a coupon, a single scheduled job.

---

## Part 2: Redis `SET NX PX` and the lease-expiry trap

The classic Redis lock is one atomic command:

```text
SET lock:seat:42 <random-token> NX PX 30000
```

Meaning:

| Option | Meaning |
|---|---|
| `NX` | Set only if the key does not already exist |
| `PX 30000` | Expire automatically after 30 seconds |
| random token | Only the owner that acquired the lock should release it |

Release must be conditional, usually with a Lua script:

```lua
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
```

Why the random token? Without it, this can happen:

```
T=0   A acquires lock with TTL 30s
T=31  A is paused; Redis expires lock
T=32  B acquires lock
T=33  A resumes and DEL lock:seat:42  → deletes B's lock ❌ ?
```

The token prevents A from deleting B's lock. But it **does not** prevent A from writing stale data after expiry:

```
T=0   A acquires lock token=abc, starts work
T=10  A hits a long GC pause / VM pause / network stall
T=31  Redis expires A's lock
T=32  B acquires lock token=def and updates resource
T=40  A resumes and writes old update to DB/object store  ❌
```

This is the lease-expiry problem. In JVM services it can be a long GC pause. In Node it can be event-loop starvation, container pause, CPU steal, or a slow synchronous operation. In any runtime, the process cannot reliably know it was paused for too long until after it resumes.

So a Redis lock by itself is safe only when stale work cannot corrupt state. It is usually fine for **efficiency**:

- rebuild `event:123:seat-map-cache`
- run a best-effort cleanup job
- deduplicate a non-critical push notification

It is risky for **correctness** unless the protected resource can reject stale writers.

---

## Part 3: Redlock and the fencing-token debate

Redlock is Redis' algorithm for taking a lock across multiple independent Redis nodes. Roughly:

1. Generate a random value.
2. Try to acquire the same key with `NX PX` on N Redis nodes.
3. Succeed if a majority acquired it and the elapsed time is less than the TTL.
4. Release by deleting the key on all nodes if the value matches.

The goal is to survive one Redis node dying. The debate is not "is Redis bad?". It is about **what kind of guarantee you think Redlock gives**.

Kleppmann's argument: if a lock protects correctness, you need more than a time-limited lease. Clocks drift, processes pause, packets delay, and the old holder can continue after expiry. Even if Redlock successfully excludes clients for a period, the resource being protected still needs a way to reject stale operations.

That way is a **fencing token**.

```
Lock service issues monotonically increasing tokens:

A acquires lock -> token 17
A pauses
B acquires lock -> token 18
B writes to storage with token 18 -> accepted
A resumes and writes with token 17 -> rejected
```

The downstream storage remembers the highest token seen and rejects lower tokens:

```sql
UPDATE seats
SET status = 'SOLD', fencing_token = :token
WHERE seat_id = :seat_id
  AND :token > fencing_token;
```

This is the missing piece in many lock designs. A random Redis value is not a fencing token because it is not ordered. You need a monotonically increasing number, often from a database sequence, ZooKeeper/etcd revision, or a consensus-backed lock service.

**Interview line:** "If the lock guards correctness, I need fencing. The lock service gives every holder a monotonic token, and the database or storage layer rejects writes with an older token. Otherwise a paused process can corrupt state after its lease expires."

### Redlock in interviews

A practical answer:

- For cache stampede prevention: Redis `SET NX PX` is fine.
- For seat/payment correctness: don't put correctness only in Redis. Use DB constraints/state transitions, or a consensus lock with fencing.
- If the interviewer says "use Redlock": say you can, but you still want fencing or durable conditional writes for the protected resource.

Do not spend five minutes arguing blog posts. Show the failure mode, then show the protection.

---

## Part 4: ZooKeeper/etcd locks, leases and leader election

ZooKeeper and etcd are coordination systems built on consensus. They are slower and more operationally heavier than Redis, but they give stronger ordering semantics.

Common lock shape:

| System | Lock idea |
|---|---|
| ZooKeeper | Create an ephemeral sequential znode under `/locks/job`. Lowest sequence number owns the lock. If the client session dies, the ephemeral node disappears. Sequence number can act like a fencing token. |
| etcd | Create a key attached to a lease. Use revision numbers as fencing tokens. Watch the key/lease for changes. |

Why this is stronger:

- The service maintains a consistent ordered log.
- Sessions/leases are part of the protocol.
- Revisions/sequence numbers are monotonic.
- Watchers avoid aggressive polling.

But the same warning remains: **a lock is still a lease**. A client can pause, lose its session, then resume. The protected system must either receive and validate the fencing token or make the state change conditional.

For a distributed scheduler (#21), a good design is:

```
Workers compete in etcd/ZK -> leader gets epoch 42
Leader claims due jobs in DB with epoch 42
Job execution writes heartbeat/result with epoch 42
If new leader epoch 43 appears, DB rejects epoch 42 claims
```

For a booking flow (#8), ZooKeeper is rarely necessary. A row-level DB transaction or reservation row is usually simpler and more directly tied to correctness.

---

## Part 5: reservation pattern for Ticketmaster / flash sale

A reservation is better than a long lock because it is **domain state**. Instead of hiding contention in a lock key, you model the seat lifecycle.

```
AVAILABLE -> HELD -> SOLD
      ^        |
      |        v
      +----- EXPIRED / RELEASED
```

A minimal schema:

```sql
CREATE TABLE seat_reservations (
  reservation_id UUID PRIMARY KEY,
  event_id        BIGINT NOT NULL,
  seat_id         BIGINT NOT NULL,
  user_id         BIGINT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('HELD','CONFIRMED','EXPIRED','CANCELLED')),
  expires_at      TIMESTAMPTZ NOT NULL,
  payment_id      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- At most one active hold/confirmation per seat.
-- In Postgres this is commonly a partial unique index.
CREATE UNIQUE INDEX one_active_reservation_per_seat
ON seat_reservations(event_id, seat_id)
WHERE status IN ('HELD', 'CONFIRMED');
```

Hold seat for 10 minutes:

```sql
BEGIN;

-- Option A: if seats are rows, lock just this seat row.
SELECT status
FROM seats
WHERE event_id = :event_id AND seat_id = :seat_id
FOR UPDATE;

-- Check not sold and no active non-expired hold, then insert hold.
INSERT INTO seat_reservations(reservation_id, event_id, seat_id, user_id, status, expires_at)
VALUES (:rid, :event_id, :seat_id, :user_id, 'HELD', now() + interval '10 minutes');

COMMIT;
```

Confirm after payment:

```sql
UPDATE seat_reservations
SET status = 'CONFIRMED', payment_id = :payment_id, updated_at = now()
WHERE reservation_id = :rid
  AND user_id = :user_id
  AND status = 'HELD'
  AND expires_at > now();
```

Cleanup job:

```sql
UPDATE seat_reservations
SET status = 'EXPIRED', updated_at = now()
WHERE status = 'HELD'
  AND expires_at <= now();
```

Redis can still help:

- `hold:<reservation_id>` with TTL 10 minutes for fast countdown UX.
- `seat:<event_id>:<seat_id>:held` as a short-lived cache key to reduce DB attempts.
- Pub/sub or stream event when a hold expires so seat maps update quickly.

But Redis is **not** the source of truth. If Redis evicts or restarts, the DB still knows the hold. If the cleanup job is delayed, `expires_at` still prevents confirmation after expiry.

### Why not hold a DB lock for 10 minutes?

Because users are slow. A DB transaction holding a row lock while someone types OTP/card details wastes connections, blocks other buyers, and may deadlock under load. Reservation rows turn waiting time into ordinary durable state.

```
User selects seat
  -> create HELD row, expires_at = now + 10 min
  -> user pays outside transaction
  -> confirm only if HELD and not expired
```

This is the pattern Hello Interview's Ticketmaster deep dive converges on: start with status + expiration, then add cache/TTL/distributed locks only as scale optimizations.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Cache stampede for one hot key | Redis `SET NX PX` with random token | Duplicate work is tolerable; simple and fast |
| One background worker should run a cron | etcd/ZK lease or DB advisory lock; add fencing/epoch for writes | Need failover and stale leader protection |
| Seat held while user pays | Reservation row: `HELD`, `expires_at`, cleanup job; Redis TTL only for UX/cache | User flow is long; DB state is truth |
| Exact inventory decrement | SQL transaction / conditional update / optimistic version | Correctness belongs in durable state |
| Payment or wallet operation | Idempotency key + ledger state machine; maybe short lock per account as optimization | Locks don't prove money moved once |
| Object storage write by elected leader | Consensus lock + fencing token checked by storage metadata | Object store cannot infer stale writers unless token is stored |

### Common interview traps

- Saying "Redis lock" without TTL. A dead holder would block forever.
- Saying "TTL fixes it" without noticing a paused holder can continue after expiry.
- Releasing a Redis lock with plain `DEL` instead of token-check Lua.
- Treating Redlock as a replacement for database constraints or fencing.
- Holding a DB transaction open while the user completes payment.
- Forgetting cleanup: expired holds must be ignored by reads and eventually marked expired.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why is a distributed lock usually a lease, not a normal mutex?</summary>

Because the holder might crash or lose network access. The system needs an expiry so the lock can be recovered. That expiry makes it a lease: ownership is valid only for a time window, and stale holders may resume after losing it.
</details>

<details><summary>2. What does <code>SET lock value NX PX 30000</code> do, and why must the value be random?</summary>

It creates the key only if absent and sets a 30-second TTL. The random value identifies the owner. Release should delete the key only if the stored value matches, so an old holder does not delete a newer holder's lock.
</details>

<details><summary>3. A worker acquires a Redis lock, pauses for 60 seconds, then writes to the DB. The TTL was 30 seconds. What can go wrong?</summary>

The lock may have expired and another worker may have acquired it. The old worker can resume and write stale data, overwriting or duplicating the new worker's work. Token-checked unlock does not prevent this; the protected resource needs fencing or conditional writes.
</details>

<details><summary>4. What is a fencing token?</summary>

A monotonically increasing token issued with each lock acquisition. Every write to the protected resource includes the token, and the resource rejects tokens older than the highest one it has already accepted.
</details>

<details><summary>5. When is a Redis lock acceptable without fencing?</summary>

When the lock is for efficiency, not correctness: cache rebuild, best-effort deduplication, or reducing duplicate background work. If two holders accidentally run, the result should be extra cost, not corrupted state.
</details>

<details><summary>6. Why is a reservation row better than a 10-minute distributed lock for Ticketmaster?</summary>

A reservation is durable domain state with `status` and `expires_at`. It survives service crashes, can be shown to the user, can be cleaned up, and can be checked during confirmation. A long lock wastes resources and can expire while the user is still paying.
</details>

<details><summary>7. How do ZooKeeper/etcd locks differ from a plain Redis lock?</summary>

They are consensus-backed coordination systems with sessions/leases, ordering and monotonic sequence/revision numbers. They can provide a natural fencing token. They are stronger but slower and operationally heavier.
</details>

<details><summary>8. In a booking system, what is the final source of truth: Redis TTL key or database row?</summary>

The database row. Redis TTL keys are useful for countdowns, cache hints and reducing load, but correctness should come from DB constraints, transactions and `status/expires_at` checks.
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
| [Martin Kleppmann: How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html) | Headings: "What are you using that lock for?", "Protecting a resource with a lock", "Making the lock safe with fencing", "Using time to solve consensus", "Breaking Redlock with bad timings", "The synchrony assumptions of Redlock", "Conclusion" | ~35 min |
| [Redis SET command](https://redis.io/docs/latest/commands/set/) | Headings: "SET", "Required arguments", "Optional arguments", "Examples", "Details", especially the `NX` and `PX` options | ~10 min |
| [Hello Interview: Ticketmaster](https://www.hellointerview.com/learn/system-design/problem-breakdowns/ticketmaster) | Headings under "Potential Deep Dives": "How do we improve the booking experience by reserving tickets?", "Status & Expiration Time with Cron", "Implicit Status with Status and Expiration Time", "Distributed Lock with TTL" | ~25 min |
| **DDIA ch 8: The Trouble with Distributed Systems** (1st ed) | "The leader and the lock" and fencing-token discussion | [PDF p.323](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=323>) – [p.326](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=326>) |

**Connects to:** [G1 Locking](G1-Locking.md) · [G3 Virtual waiting room](G3-Virtual-Waiting-Room.md) · [G4 Sagas](G4-Sagas.md) · [G5 Ledger + reconciliation](G5-Ledger-Reconciliation.md) · [B3 Transactions](../B-Data/B3-Transactions-Isolation.md) · [I1 Leader election](../I-Reliability/I1-Leader-Election.md)
