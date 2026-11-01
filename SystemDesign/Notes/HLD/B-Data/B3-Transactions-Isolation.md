# B3 · Transactions + Isolation: correctness when requests collide

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Booking (#8), Payment (#16), Flash sale (#18), E-commerce checkout, inventory, wallets, rate limiter state (#2), any "two users clicked at the same time" follow-up.

---

## Why this topic matters

Most system design diagrams work for one user. Transactions are what make them work for **two users racing**.

- Two people try to book the same seat.
- A payment retry arrives after a timeout.
- A wallet transfer debits one account and credits another.
- A flash sale has 1 item left and 10,000 buyers.

If you cannot explain isolation, locking and idempotent writes, your booking/payment answer is incomplete.

| Problem | Transaction concept |
|---|---|
| Half-written state | atomicity |
| Invalid totals/seat ownership | consistency constraints |
| Racing writes | isolation |
| Crash after commit | durability |
| Stale/concurrent reads | isolation level + locks |

**Interview line:** "The database transaction is my correctness boundary: I use constraints plus a short transaction for the seat/payment invariant, and I move slow side effects like email/webhook to an outbox after commit."

---

## Part 1: ACID, precisely

ACID is often repeated vaguely. Use it precisely.

### Atomicity

All writes in the transaction commit, or none do. It is about **abort on error**, not about concurrency.

Payment example:

```sql
BEGIN;
INSERT INTO ledger_entries (... debit ...);
INSERT INTO ledger_entries (... credit ...);
COMMIT;
```

If the credit insert fails, the debit must roll back.

### Consistency

The database moves from one valid state to another valid state, assuming the transaction code is correct. The DB helps with constraints: primary key, foreign key, unique, check, not null. It does not know your whole business model.

Booking example: a unique constraint on `(show_id, seat_id)` prevents two confirmed bookings for one seat, if modeled correctly.

### Isolation

Concurrent transactions should not interfere in ways the chosen isolation level forbids. This is where anomalies live: dirty reads, lost updates, write skew and phantoms.

### Durability

Once commit returns, data survives crashes according to the database's durability guarantees (WAL/fsync/replication settings). Durability does not mean the data is copied to every replica immediately; that is replication policy ([B4 Replication](B4-Replication.md)).

---

## Part 2: anomalies with booking and payment examples

### Dirty read

A transaction reads another transaction's uncommitted data.

```text
T1: mark seat A7 HELD but not committed
T2: reads A7 as HELD
T1: rolls back
T2: incorrectly tells user A7 is unavailable
```

Postgres does not allow dirty reads even at `READ UNCOMMITTED` (it treats it as Read Committed).

### Dirty write

Two transactions overwrite each other's uncommitted writes. Databases normally prevent this with row locks.

### Read skew / non-repeatable read

A transaction sees different committed values at different times.

```text
T1: reads account A balance = 100
T2: transfers 50 from A to B and commits
T1: reads account B balance = 150
```

T1 sees a state that never existed together. Snapshot isolation/repeatable read fixes this by reading from a consistent snapshot.

### Lost update

Two transactions read the same value, compute a new value, and one overwrites the other.

```text
inventory = 1
T1 reads 1, plans 0
T2 reads 1, plans 0
T1 writes 0 and commits
T2 writes 0 and commits  -- two purchases, inventory only decremented once
```

Fixes:

- atomic update: `UPDATE inventory SET qty = qty - 1 WHERE sku=? AND qty > 0`,
- `SELECT ... FOR UPDATE`,
- optimistic compare-and-set with version,
- serializable isolation.

### Write skew

Two transactions read overlapping data, update different rows, and together violate an invariant.

Doctor/on-call classic; booking version:

```text
Rule: at least one payment method must remain active for a subscription.
T1 reads card+UPI active, disables card.
T2 reads card+UPI active, disables UPI.
Both update different rows and commit.
Result: zero active methods.
```

Row locks on the updated rows may not help because each transaction updates a different row. Fix with serializable isolation, explicit locks on a parent row, or materialize the invariant into a constrained row.

### Phantom

A transaction repeats a predicate query and sees new rows appear/disappear.

```text
T1: SELECT count(*) FROM holds WHERE show_id=7 AND seat_id=A7 AND status='HELD'; -- 0
T2: INSERT hold for A7 and commit
T1: repeats predicate -- 1
```

Serializable isolation or predicate/range locking prevents the dangerous form. Unique constraints often solve specific booking cases better than trying to reason about predicate locks yourself.

---

## Part 3: isolation levels and Postgres specifics

### Read Committed

Each statement sees only committed data as of the start of that statement. Two statements in the same transaction can see different snapshots.

Good for many CRUD apps. Not enough for multi-statement read-check-write invariants unless you lock or use atomic updates.

```sql
BEGIN;
SELECT qty FROM inventory WHERE sku = 'iphone'; -- sees 1
-- another transaction commits here
SELECT qty FROM inventory WHERE sku = 'iphone'; -- may see 0
COMMIT;
```

Postgres default is **Read Committed**.

### Repeatable Read / Snapshot Isolation

The transaction sees a consistent snapshot as of transaction start. This prevents read skew/non-repeatable reads.

In PostgreSQL, `REPEATABLE READ` is snapshot isolation and is stronger than the SQL minimum: it does not allow phantoms in the way the standard table suggests. But snapshot isolation can still allow **write skew**.

### Serializable

The result should be equivalent to some serial order of transactions. PostgreSQL implements Serializable Snapshot Isolation (SSI): it tracks dangerous dependency patterns and aborts one transaction with a serialization failure.

Operational implication: your app must retry serializable transactions.

```text
try transaction
if serialization_failure: retry with backoff/jitter
```

### Postgres isolation table, interview version

| Level in Postgres | Dirty read | Non-repeatable/read skew | Phantom | Write skew |
|---|---|---|---|---|
| Read Uncommitted | Not possible; behaves like Read Committed | possible | possible | possible |
| Read Committed | prevented | possible | possible | possible |
| Repeatable Read | prevented | prevented | prevented in PG snapshot sense | possible |
| Serializable | prevented | prevented | prevented | prevented by abort/retry |

**Interview line:** "In Postgres I won't rely on `READ UNCOMMITTED`; it behaves like Read Committed. For a simple inventory decrement I prefer one atomic conditional update. For a multi-row invariant, I use Serializable or lock a parent row and keep the transaction short."

---

## Part 4: the tools: locks, atomic updates, CAS and constraints

### Atomic conditional update

Best for counters/inventory when the invariant fits one row.

```sql
UPDATE inventory
SET qty = qty - 1
WHERE sku = 'iphone-15' AND qty > 0
RETURNING qty;
```

If zero rows return, sold out. This avoids read-then-write races.

### SELECT ... FOR UPDATE

Locks selected rows until commit. Good when you need to read, run logic, then update the same rows.

```sql
BEGIN;
SELECT * FROM seats
WHERE show_id = 7 AND seat_no = 'A7'
FOR UPDATE;

-- if available, create hold
UPDATE seats
SET status = 'HELD', hold_expires_at = now() + interval '10 minutes'
WHERE show_id = 7 AND seat_no = 'A7';
COMMIT;
```

Keep this transaction short. Do not call payment gateways while holding DB locks. Instead: hold seat with TTL → commit → call payment → confirm in another short transaction.

### Compare-and-set / optimistic locking

Add a version column.

```sql
UPDATE bookings
SET status = 'CONFIRMED', version = version + 1
WHERE id = $1 AND version = $2;
```

If affected rows = 0, someone changed it; reload and retry/return conflict. Good when conflicts are rare.

### Unique constraints as concurrency control

For idempotent payments:

```sql
CREATE UNIQUE INDEX uniq_idempotency
ON payment_requests (merchant_id, idempotency_key);
```

The retry tries the same insert and gets the existing result instead of double-charging.

For bookings, a partial unique index can enforce "only one active/confirmed hold per seat" depending on schema.

### SSI vs explicit locks

- Use **explicit locks/atomic updates** when the invariant is obvious and local.
- Use **Serializable** when the invariant spans predicates/multiple rows and you can handle retries.
- Use **constraints** whenever possible; they are the database's last line of defense.

---

## Part 5: choosing in an interview / cheat sheet

| Scenario | Technique | Why |
|---|---|---|
| Decrement inventory if available | atomic conditional update | one statement, no lost update |
| Book one exact seat | unique constraint + short transaction; optionally `FOR UPDATE` | DB enforces one winner |
| Hold seat then payment | hold row with TTL; commit; payment outside lock; confirm later | avoids long lock during external call |
| Idempotent payment retry | unique idempotency key + transaction | retry returns same result, no double charge |
| Wallet transfer | transaction with immutable ledger entries | debit/credit atomic, auditable |
| Multi-row invariant | Serializable or parent-row lock/materialized constraint | prevents write skew |
| Low-contention profile update | optimistic version CAS | avoids locking unless conflict |
| High-contention flash sale | queue/admission + DB atomic update | protect DB from 10k lock waiters |

### Common interview traps

- Calling a payment gateway inside a DB transaction while holding a seat lock.
- Saying "ACID solves it" without naming the isolation level or anomaly.
- Using Redis locks as the only correctness mechanism for money/seats; DB constraints still need to be authoritative.
- Assuming Repeatable Read prevents every anomaly in every database. Implementations differ.
- Forgetting to retry serializable transactions after aborts.
- Doing read-check-write in application code at Read Committed without a lock/CAS/atomic update.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Which ACID letter is about aborting a half-finished transaction?</summary>

Atomicity. It ensures all writes in a transaction commit or none do. Isolation is the concurrency letter; durability is crash survival after commit.
</details>

<details><summary>2. Two users buy the last item. Both read qty=1, both write qty=0. Name the anomaly and a one-statement fix.</summary>

Lost update / read-check-write race. Fix with `UPDATE inventory SET qty = qty - 1 WHERE sku=? AND qty > 0 RETURNING qty;` and succeed only if a row is returned.
</details>

<details><summary>3. Why is write skew harder than lost update?</summary>

The transactions update different rows, so simple row write conflicts may not detect it. The invariant depends on a predicate or group of rows. Use serializable isolation, parent-row locks, or materialized constraints.
</details>

<details><summary>4. What does Postgres do with Read Uncommitted?</summary>

Postgres treats it as Read Committed; dirty reads are not allowed. Its default isolation level is Read Committed.
</details>

<details><summary>5. What is the operational cost of Serializable in PostgreSQL?</summary>

Postgres SSI may abort a transaction with a serialization failure to preserve serializability. The application must retry the whole transaction, usually with bounded retries/backoff.
</details>

<details><summary>6. When would you use <code>SELECT ... FOR UPDATE</code>?</summary>

When you need to read a row, make a decision, and update that same row while preventing concurrent transactions from changing it until commit. Keep the transaction short.
</details>

<details><summary>7. Why should payment gateway calls not happen inside the seat-locking transaction?</summary>

External calls are slow and unreliable. Holding DB locks during them increases contention, timeouts and deadlocks. Commit a short hold first, call payment outside, then confirm with another short transaction.
</details>

<details><summary>8. How does an idempotency key prevent double payment?</summary>

Store `(merchant_id, idempotency_key)` under a unique constraint with the request/result. Retries use the same key, so they fetch/return the existing result instead of creating a second charge.
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
| **DDIA ch 7: Transactions** (1st ed) | Whole chapter up to and including Serializability; this is the conceptual base for anomalies | [PDF p.243](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=243>) |
| ↳ The Slippery Concept of a Transaction | ACID meanings and why transactions are an abstraction over failures | [p.244](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=244>) |
| ↳ Weak Isolation Levels | Read Committed, Snapshot Isolation, lost updates, write skew, phantoms | [p.255](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=255>) |
| ↳ Serializability | actual serial execution, two-phase locking, SSI | [p.273](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=273>) |
| [PostgreSQL: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) | Headings verified: 13.2 Transaction Isolation → Read Committed Isolation Level → Repeatable Read Isolation Level → Serializable Isolation Level | ~25 min |
| [PostgreSQL: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html) | Headings verified: 13.3 Explicit Locking → Table-Level Locks → Row-Level Locks → Page-Level Locks → Deadlocks → Advisory Locks; focus on Row-Level Locks for `FOR UPDATE` | ~20 min |

**Connects to:** [B1 Data Models](B1-Data-Models-DB-Choice.md) · [B4 Replication](B4-Replication.md) · [G1 Locking](../G-Contention/G1-Locking.md) · [G2 Distributed locks + reservations](../G-Contention/G2-Distributed-Locks-Reservations.md) · [G5 Ledger](../G-Contention/G5-Ledger-Reconciliation.md)
