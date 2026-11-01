# D4 · Outbox + CDC: crossing service boundaries without dual-write bugs

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Notification system (#13), Payment system / digital wallet / UPI (#16), Post / tweet search (#17), Ad click aggregator (#20), Message queue (#23)

---

## Why this topic matters

Most useful features write data **and** notify another system. An order service saves an order and publishes `OrderCreated`. A payments service updates a ledger and publishes `PaymentCaptured`. A product service updates Postgres and Elasticsearch must reflect it.

The trap is the **dual-write problem**:

```
BEGIN DB TRANSACTION
  INSERT order
COMMIT
publish event to Kafka
```

What if the DB commit succeeds and the Kafka publish fails? The order exists, but no downstream service hears about it. If you publish first and the DB fails, consumers see an event for data that does not exist.

The transactional outbox and CDC are the standard answers:

| Pattern | Core idea | Best for |
|---|---|---|
| **Transactional outbox** | Write business row and event row in the same DB transaction; publish later | Domain events, notifications, payments, service integration |
| **CDC** | Read database commit log and stream changes to other systems | Search indexes, caches, analytics, data integration |

**Interview line:** "I won't write Postgres and Kafka independently. I'll put an outbox row in the same transaction as the order, then publish from the outbox at least once; consumers are idempotent."

---

## Part 1: the dual-write problem

A dual write is any operation that tries to make two systems consistent without one transaction covering both.

```
Order API
  ├── write Postgres
  └── publish Kafka event
```

Failure matrix:

| Step 1 | Step 2 | Result |
|---|---|---|
| DB succeeds | Publish succeeds | Good |
| DB succeeds | Publish fails | Silent missing event |
| DB fails | Publish succeeds | Event lies about reality |
| DB unknown | Publish retried | Duplicate or missing event depending on retry |

Distributed transactions / two-phase commit can coordinate some systems, but they are often unavailable, operationally heavy, or too slow for microservice boundaries. In interviews, the expected answer is almost always **avoid the dual write** by making the database transaction the source of truth.

---

## Part 2: transactional outbox

The outbox pattern stores the event as a normal row inside the same database transaction as the business change.

```sql
BEGIN;

INSERT INTO orders(id, user_id, status, total_cents)
VALUES (:order_id, :user_id, 'CREATED', :total);

INSERT INTO outbox_events(id, aggregate_type, aggregate_id, event_type, payload, created_at)
VALUES (:event_id, 'order', :order_id, 'OrderCreated', :json_payload, now());

COMMIT;
```

Now the database has one atomic fact: either both the order and event exist, or neither exists.

A separate publisher drains the outbox:

```
Postgres outbox table ──► Publisher ──► Kafka / SQS / webhook
        ▲                      │
        └──── mark sent / retry┘
```

Typical schema:

```sql
CREATE TABLE outbox_events (
  id uuid PRIMARY KEY,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  attempts int NOT NULL DEFAULT 0
);

CREATE INDEX outbox_unpublished_idx
ON outbox_events(created_at)
WHERE published_at IS NULL;
```

Important: publishing is usually **at-least-once**. The publisher might send to Kafka and crash before marking `published_at`. It will send again. That is okay only if consumers deduplicate by `event_id` or by a domain operation ID.

---

## Part 3: polling publisher vs log tailing

There are two common ways to move outbox rows to the broker.

### Option A: polling publisher

A worker periodically queries unpublished rows:

```sql
SELECT * FROM outbox_events
WHERE published_at IS NULL
ORDER BY created_at
LIMIT 100
FOR UPDATE SKIP LOCKED;
```

Then it publishes and marks rows sent.

Pros:
- simple to build with only SQL and a worker
- easy to reason about in interviews
- `SKIP LOCKED` lets multiple publishers share work

Cons:
- adds polling load
- latency depends on polling interval
- still needs idempotent publish/consume
- ordering can be subtle with multiple workers

### Option B: log tailing / CDC publisher

Instead of polling a table, a CDC tool reads the database's commit log and emits changes.

```
Postgres WAL / MySQL binlog ──► Debezium / connector ──► Kafka topic
```

Pros:
- lower latency and less query polling
- preserves commit order better than ad-hoc pollers
- scales naturally into a data pipeline

Cons:
- operationally more complex
- schema evolution and connector management matter
- you must understand offsets, restarts and replay

A strong interview answer can start with polling for simplicity and say CDC is the scale-up path.

---

## Part 4: Change Data Capture (CDC)

CDC means turning database changes into a stream. DDIA places it under "Databases and Streams": once changes are a stream, you can keep derived systems in sync.

Use cases:

| Source table | CDC destination | Why |
|---|---|---|
| `products` | Elasticsearch | Search index stays updated after product edits |
| `users` | Redis / materialized view | Denormalized profile cache |
| `orders` | Analytics warehouse | BI dashboards without hammering OLTP DB |
| `outbox_events` | Kafka | Reliable domain event publication |

Postgres exposes logical decoding over its write-ahead log; MySQL has the binlog. Debezium is the common open-source connector family that reads these logs and writes Kafka topics.

CDC does **not** remove the need for design discipline:
- consumers still see at-least-once delivery and replays
- schema changes must be compatible
- delete events and tombstones need a plan
- ordering is usually per table/partition/key, not global across the universe
- downstream systems must tolerate lag

### Initial snapshot + live tail

A new CDC pipeline usually starts with a snapshot, then tails the log.

```
1. Snapshot existing rows at position L
2. Emit snapshot records downstream
3. Continue streaming WAL/binlog changes after L
```

Without a consistent snapshot position, you can miss or duplicate changes around the cutover.

### Log compaction ⏭ *Skip for interviews*

For some topics, only the latest value per key matters. Kafka log compaction keeps the most recent record for each key while still allowing consumers to rebuild state by replaying the topic.

This is useful for "current product document" or "current user profile" topics. It is not enough for an audit ledger where every event matters.

---

## Part 5: ordering and idempotency concerns

Outbox + CDC solves atomicity, not every distributed-system problem.

### Ordering

If events for the same aggregate must be processed in order, partition by that aggregate ID.

```
key = order_id
OrderCreated -> PaymentCaptured -> OrderShipped
all go to the same Kafka partition
```

If you spread events for one order across partitions, consumers can see `OrderShipped` before `OrderCreated`.

For multiple aggregates, global order is rarely necessary and very expensive. Prefer local order per entity.

### Idempotency

Every event should carry:

```json
{
  "eventId": "uuid",
  "eventType": "OrderCreated",
  "aggregateId": "order_123",
  "aggregateVersion": 7,
  "occurredAt": "2026-09-30T...",
  "payload": { }
}
```

Consumers store processed `eventId`s or use `aggregateVersion` to ignore stale duplicates.

### Poison messages

If one bad event always crashes the consumer, the whole stream can stall. Production systems need retry limits, DLQs and alerting. In an interview, mention where failed rows/events go and how an operator can inspect/replay them.

---

## Part 6: applying it to common designs

### Notification system (#13)

```
User action transaction:
  INSERT comment
  INSERT outbox NotificationRequested(event_id, user_id, template)

Publisher:
  outbox -> queue

Email/SMS worker:
  dedup event_id
  send with provider idempotency key
  mark notification status
```

The user action is not slowed down by email provider latency, and a crash after the comment commit does not lose the notification.

### Search indexing (#17)

Search is a derived view. The source of truth remains Postgres or the primary data store. CDC feeds Elasticsearch:

```
Postgres products ── CDC ──► Kafka topic ──► indexer ──► Elasticsearch
```

If Elasticsearch is down, CDC offsets stop advancing or the indexer retries. Once it recovers, replay rebuilds the index. The UI must tolerate indexing lag.

### Payments (#16)

For payments, the outbox event should not be the only record. The ledger row is the truth; events announce it.

```
BEGIN
  INSERT ledger_entries(operation_id UNIQUE, ...)
  INSERT outbox PaymentRecorded(event_id, operation_id, ...)
COMMIT
```

Consumers dedup by `event_id`; reconciliation can compare ledger rows with external gateway reports later.

### DrawBoard analogy

DrawBoard stores board content as Yjs binary state and may later add update logs for stronger durability. That is conceptually similar to snapshot + log: periodic compact state for fast load, plus append-only updates to reduce loss windows. For V1.5, the accepted loss window is debounced saves; if that becomes unacceptable, append each Yjs update durably before acknowledging.

---

## Part 7: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Service writes DB and emits domain event | Transactional outbox | Avoids DB+broker dual-write inconsistency |
| Small/medium system, simple ops | Polling outbox publisher | Easy to build and explain; enough for many cases |
| High-volume event pipeline | CDC / log tailing | Lower latency, better commit-order stream |
| Keep Elasticsearch in sync | CDC from source DB to indexer | Search is derived; replay can rebuild it |
| Cache invalidation | Outbox/CDC invalidation events | Prevents stale cache after DB commit |
| Analytics warehouse | CDC to stream/warehouse | Avoids OLTP read pressure |
| Cross-service money movement | Ledger transaction + outbox event | Ledger is truth; event announces it |

### Common interview traps

- Publishing to Kafka inside request code after DB commit and calling it reliable.
- Forgetting that outbox publishers are at-least-once, so consumers still need idempotency.
- Treating Elasticsearch/cache as source of truth instead of a derived view.
- Claiming global event ordering when only per-key ordering is practical.
- Not planning for schema evolution in event payloads.
- Letting the frontend or another service also mutate state that the outbox owner assumes it owns.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What is the dual-write problem?</summary>

It is trying to update two systems, such as a database and Kafka, without one atomic transaction covering both. One write can succeed while the other fails, leaving missing or false events.
</details>

<details><summary>2. How does a transactional outbox fix the dual-write problem?</summary>

The service writes the business row and an outbox event row in the same database transaction. A separate publisher later sends the outbox row to the broker. The DB transaction becomes the atomic source of truth.
</details>

<details><summary>3. Why are outbox consumers still designed for duplicates?</summary>

The publisher can send an event and crash before marking it sent, or CDC can replay after a restart. Delivery is at-least-once, so consumers must deduplicate by event ID or operation ID.
</details>

<details><summary>4. Polling outbox vs CDC: when would you start with each?</summary>

Start with polling for simplicity and lower operational cost. Use CDC/log tailing when event volume, latency, commit ordering or many downstream pipelines justify running connectors such as Debezium.
</details>

<details><summary>5. What does an initial CDC snapshot need to avoid missing changes?</summary>

A consistent snapshot tied to a log position. After emitting rows from the snapshot, the connector streams changes after that position so writes during the snapshot are not missed.
</details>

<details><summary>6. How do you preserve ordering for all events of one order?</summary>

Put the order ID as the Kafka partition key (or equivalent routing key). Then all events for that order go to the same partition and are consumed in order.
</details>

<details><summary>7. Why is Elasticsearch usually a derived view here?</summary>

Because it can lag, fail, or be rebuilt. The primary database is the source of truth; CDC/outbox events update Elasticsearch asynchronously, and replay can reconstruct the index.
</details>

<details><summary>8. Connect this topic to DrawBoard's save-loss limitation.</summary>

DrawBoard currently saves Yjs state periodically. If losing seconds of edits becomes unacceptable, it can append each Yjs update to durable storage before acknowledging, then compact updates into snapshots: the same snapshot + log idea used in CDC/event systems.
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
| [microservices.io: Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html) | Exact headings: **Context**, **Problem**, **Forces**, **Solution**, **Result context**, **Related patterns** | ~15 min |
| **DDIA ch 11: Stream Processing** (your PDF, 1st ed) | **Databases and Streams** → **Change Data Capture** → **Initial Snapshot** → **Log Compaction** → **API support for change streams** | [p.473](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=473>) → [p.478](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=478>) |
| [Debezium tutorial](https://debezium.io/documentation/reference/stable/tutorial.html) | Skim the tutorial to see CDC as an actual connector-based pipeline | ~20 min |

**Connects to:** [D2 Kafka](D2-Kafka.md) · [D3 Delivery semantics + idempotency](D3-Delivery-Semantics-Idempotency.md) · [B8 Encoding/schema evolution](../B-Data/B8-Encoding-Schema-Evolution.md) · [H2 Search](../H-Geo-Search-Counting/H2-Search.md) · [G5 Ledger/reconciliation](../G-Contention/G5-Ledger-Reconciliation.md)
