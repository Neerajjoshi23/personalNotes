# G1 · Locking: making one winner under contention

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Ticket / hotel booking (#8), Payment system / wallet (#16), Flash sale / e-commerce (#18), Online auction variant, Inventory systems

---

## Why this topic matters

Contention is what happens when many users want the same scarce thing: the last seat, the last iPhone, the current highest auction bid, the same wallet balance. Caches and queues help with load, but at the decision point you still need correctness: **not two winners for one item**.

| Tool | Best for | Main trade-off |
|---|---|---|
| Pessimistic lock | high contention, short critical section | waiting, deadlocks, timeouts |
| Optimistic lock | low/moderate contention | retries under conflict |
| Atomic conditional update | simple invariant in one row | limited expressiveness |
| Serializable transaction | complex multi-row invariant | lower throughput, more aborts |

This note is about single-database locking. Distributed locks and reservations build on this in G2.

---

## Part 1: the lost update problem

The simplest bug:

```text
inventory.available = 1

Tx A reads available=1        Tx B reads available=1
Tx A decides buy is ok        Tx B decides buy is ok
Tx A writes available=0       Tx B writes available=0
Both orders succeed ❌
```

The final value is 0, so the database looks fine, but two customers got the same item. This is a **lost update / check-then-write race**. DDIA's "Preventing Lost Updates" section covers the family of fixes: atomic writes, explicit locks, automatic detection and compare-and-set.

The interview smell is any logic like:

```ts
const item = await db.query('SELECT available FROM inventory WHERE sku = $1', [sku]);
if (item.available > 0) {
  await db.query('UPDATE inventory SET available = available - 1 WHERE sku = $1', [sku]);
}
```

That check and update are not atomic. You need the database to enforce the condition while writing, or lock the row while deciding.

**Interview line:** "For scarce inventory, I never trust an app-level read-then-write. I either take a row lock inside a transaction or use one atomic conditional update whose affected-row count tells me whether I won."

---

## Part 2: pessimistic locking

Pessimistic locking assumes conflicts are likely. You lock the row before making the decision.

```sql
BEGIN;

SELECT id, status
FROM seats
WHERE show_id = $1 AND seat_no = $2
FOR UPDATE;

-- row is locked until COMMIT/ROLLBACK
UPDATE seats
SET status = 'HELD', hold_expires_at = now() + interval '10 minutes'
WHERE show_id = $1 AND seat_no = $2 AND status = 'AVAILABLE';

COMMIT;
```

In PostgreSQL, row-level locks block conflicting writes/locks on the same row. Other transactions may wait. If they wait too long, you can use timeouts. If two transactions lock resources in opposite order, you can deadlock; the DB detects it and aborts one transaction.

### Seat booking example

```text
Tx A: SELECT seat 7 FOR UPDATE   (gets lock)
Tx B: SELECT seat 7 FOR UPDATE   (waits)
Tx A: mark HELD; COMMIT
Tx B: wakes, sees status HELD; fails gracefully
```

This is exactly what you want for a single scarce row. The user sees either "seat held" or "seat no longer available," not double booking.

### Practical rules

- Keep transactions short: no network calls, email, payment gateway calls while holding DB locks.
- Lock rows in a consistent order to reduce deadlocks.
- Set lock/statement timeouts so users do not hang forever.
- Handle deadlock/serialization errors with safe retry where appropriate.
- Show the user a reservation TTL rather than holding the lock for minutes.

That last point matters: a DB lock should last milliseconds, not the entire 10-minute checkout. You use the lock to create a **reservation row** or mark a seat `HELD`, then release the lock. G2 covers reservations in more detail.

---

## Part 3: optimistic locking

Optimistic locking assumes conflicts are rare. You read the row with a version, make a decision, then update only if the version is unchanged.

```sql
-- read
SELECT id, available, version
FROM inventory
WHERE sku = $1;

-- later, compare-and-swap
UPDATE inventory
SET available = available - 1,
    version = version + 1
WHERE sku = $1
  AND version = $2
  AND available > 0;
```

If `row_count = 1`, you won. If `row_count = 0`, someone else changed the row or inventory is gone; reload and retry or tell the user.

### Why it is useful

Optimistic locking avoids blocking. It works well when many users view data but few update the exact same row at the exact same time. It is common for profile edits, document metadata, shopping carts and admin forms.

### Retry behavior

Do not blindly retry forever. Under heavy contention, optimistic locking can create a retry storm.

```text
max 2-3 retries with jitter
if still failing → return conflict / sold out / ask user to refresh
```

For a flash sale hot SKU, pessimistic lock or atomic update may be better. For normal inventory, optimistic can be simpler and fast.

---

## Part 4: atomic conditional updates

Sometimes the invariant fits in one SQL statement. Then use the database's atomic update directly.

```sql
UPDATE inventory
SET available = available - 1
WHERE sku = $1
  AND available > 0;
```

Check affected rows:

- 1 row updated → purchase/reservation can proceed;
- 0 rows updated → sold out.

This is the cleanest answer for a single counter/inventory row. It avoids a separate read and reduces lock duration. The database still locks the row internally while updating; the difference is your application did not split the check from the write.

### Auction bid example

```sql
UPDATE auctions
SET highest_bid = $newBid,
    highest_bidder = $userId,
    version = version + 1
WHERE auction_id = $auctionId
  AND status = 'OPEN'
  AND highest_bid < $newBid;
```

Again, affected row count decides whether the bid became the current winner. If two bids arrive concurrently, the DB serializes the row updates; only bids above the current value succeed.

### When atomic update is not enough

Atomic update is great for one row. It is not enough for multi-row invariants, e.g. "book 4 adjacent seats," "transfer money between two accounts with ledger entries," or "hotel room availability across date ranges." Then use a transaction with locks or serializable isolation.

---

## Part 5: deadlocks, timeouts and isolation

A deadlock happens when transactions wait on each other forever unless the DB breaks the cycle.

```text
Tx A locks seat 1          Tx B locks seat 2
Tx A wants seat 2          Tx B wants seat 1
A waits for B              B waits for A  → deadlock
```

Postgres detects deadlocks and aborts one transaction. Your app must catch the error and retry or fail safely. Avoid deadlocks by locking rows in a deterministic order:

```sql
SELECT * FROM seats
WHERE show_id = $1 AND seat_no = ANY($2)
ORDER BY seat_no
FOR UPDATE;
```

### Lock timeouts

A lock timeout is not a correctness failure; it is back-pressure. For user-facing paths, set a reasonable timeout and return "seat is being selected by someone else, try again" or queue the request.

### Isolation levels

Read Committed plus explicit row locks/atomic updates often solves simple booking/inventory races. Serializable isolation can protect more complex invariants, but transactions may abort under contention and require retries. Know the trade-off rather than blindly saying "serializable everything."

---

## Part 6: choosing by contention level

| Scenario | Choice | Why |
|---|---|---|
| Last seat in a show | short transaction + row lock / atomic status update | high contention; exactly one holder |
| Normal product inventory | atomic `UPDATE ... WHERE available > 0` | simple one-row invariant |
| User edits profile settings | optimistic version column | conflicts rare; no blocking |
| Auction bid | conditional update on `highest_bid < newBid` | one-row compare-and-set |
| Booking adjacent seats | transaction locks all candidate seats in sorted order | multi-row invariant |
| Payment ledger transfer | transaction + constraints; often serializable | money correctness beats throughput |

### Examples

**Seat hold:** use DB transaction to mark seat `HELD` with expiry. Release DB lock immediately. A background job expires old holds.

**Inventory:** decrement only if available. Create order in same transaction or use an outbox event so order/inventory do not diverge.

**Auction:** accept bid only if it beats current price. Notify losers asynchronously; do not notify while holding the row lock.

**Adobe Connect analogy:** if only one host can start a recording, use an atomic conditional update on meeting state: `WHERE recording_state = 'IDLE'`. The affected row count tells which request won.

---

## Part 7: choosing in an interview / cheat sheet

| Interview signal | Say this |
|---|---|
| "Only one user can get it" | Use DB-enforced atomicity, not app memory |
| "High contention" | Prefer pessimistic lock or atomic update; avoid retry storms |
| "Low contention" | Optimistic version column is simpler and avoids blocking |
| "Multiple rows" | Transaction, deterministic lock order, maybe serializable |
| "Long checkout" | Create short-lived reservation, don't hold DB lock |
| "What can fail?" | deadlocks, lock timeouts, aborted retries, stale reservations |

### Common interview traps

- Holding a DB lock while calling payment gateways or external services.
- Using `SELECT` then `UPDATE` without a lock/version/condition.
- Saying Redis lock when a single SQL row lock would be simpler and safer.
- Ignoring deadlock retries and lock timeouts.
- Using optimistic locking for a flash-sale hot key without explaining retry collapse.
- Confusing a 10-minute seat hold with a 10-minute database lock.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What is a lost update?</summary>

Two transactions read the same old value, both make decisions, and one write overwrites or hides the other's effect. The final data may look plausible even though both operations incorrectly succeeded.
</details>

<details><summary>2. How does <code>SELECT ... FOR UPDATE</code> help seat booking?</summary>

It locks the selected seat row until the transaction commits/rolls back. Competing transactions wait, then re-check the status after the first transaction commits, so only one can mark the seat held/booked.
</details>

<details><summary>3. Why should you not hold a row lock during payment?</summary>

External payment calls are slow and unreliable. Holding the lock blocks everyone else and increases deadlocks/timeouts. Instead create a short reservation/hold in a quick transaction, then process payment outside the lock.
</details>

<details><summary>4. What is optimistic locking?</summary>

Read a row with a version, then update with `WHERE version = oldVersion` and increment the version. If zero rows are updated, someone else changed it; retry or return a conflict.
</details>

<details><summary>5. When is atomic conditional update enough?</summary>

When the invariant fits in one row/statement, like `available > 0` or `highest_bid < newBid`. The affected-row count tells whether the operation won.
</details>

<details><summary>6. How do you reduce deadlocks when locking multiple rows?</summary>

Lock rows in a deterministic order, keep transactions short, avoid external calls inside transactions, set timeouts, and retry aborted transactions safely.
</details>

<details><summary>7. Pessimistic vs optimistic: how do you choose?</summary>

Use pessimistic/atomic updates when contention is high and conflicts are expected. Use optimistic when conflicts are rare and blocking would be wasteful. Under high contention, optimistic retries can amplify load.
</details>

<details><summary>8. What does affected row count mean in inventory decrement?</summary>

`1` means the condition was true and the decrement happened; reserve/order can proceed. `0` means no inventory remained or the row did not match; return sold out or retry after reload.
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
| [PostgreSQL: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html) | Headings: "13.3 Explicit Locking", "13.3.1 Table-Level Locks" (skim modes), "13.3.2 Row-Level Locks" (focus), "13.3.4 Deadlocks", "13.3.5 Advisory Locks" (know it exists) | ~35 min |
| **DDIA ch 7: Transactions** (1st ed) | "Weak Isolation Levels" and especially "Preventing Lost Updates": atomic write operations, explicit locking, automatically detecting lost updates, compare-and-set | [Weak isolation p.255](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=255>) · [Preventing lost updates p.264](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=264>) |

**Connects to:** [B3 Transactions + isolation](../B-Data/B3-Transactions-Isolation.md) · [G2 Distributed locks + reservations](G2-Distributed-Locks-Reservations.md) · [G3 Virtual waiting room](G3-Virtual-Waiting-Room.md) · [G4 Sagas](G4-Sagas.md) · Questions: Ticket booking (#8), Payment (#16), Flash sale (#18)
