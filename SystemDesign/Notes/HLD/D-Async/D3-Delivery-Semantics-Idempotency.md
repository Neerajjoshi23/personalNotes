# D3 · Delivery Semantics + Idempotency: retries without duplicate damage

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Notification system (#13), Payment system / digital wallet / UPI (#16), Ad click aggregator (#20), Distributed job scheduler (#21), Message queue (#23)

---

## Why this topic matters

The moment you add queues, workers, webhooks or payment APIs, the system has to answer a brutal question: **what if the same work is attempted twice?** Networks drop responses, workers crash after doing side effects, brokers redeliver messages, and clients retry because they cannot tell whether the previous request succeeded.

Delivery semantics are the vocabulary for this:

| Promise | Meaning | Cost / risk |
|---|---|---|
| **At-most-once** | Try once; a message may be lost, but is not deliberately retried | Fast, but data loss is acceptable only for telemetry-like events |
| **At-least-once** | Retry until someone processes it; duplicates are possible | Default for serious systems; requires idempotent handlers |
| **Exactly-once** | Each logical effect happens once | Usually implemented as at-least-once **plus** idempotency, transactions, or deduplication |

Interviewers care because every real design has retries. If you say "we retry failed payments" but cannot explain idempotency keys, duplicate consumers and safe side effects, the design is unsafe.

**Interview line:** "I'll assume at-least-once delivery from the queue. Every handler is idempotent: it records a processed event ID in the same transaction as the side effect, so duplicates become no-ops."

---

## Part 1: delivery semantics in plain English

### At-most-once: no duplicate, but maybe missing

```
Producer ── send once ──► Broker ── deliver once ──► Consumer
             if anything fails, we may not retry
```

At-most-once is what you get if the producer or consumer acknowledges too early. Example: a metrics agent sends CPU usage every 10 seconds; losing one point is fine. It is **not** fine for "debit ₹500" or "send password reset email".

Where it fits:
- fire-and-forget analytics events where approximate counts are acceptable
- presence pings, typing indicators, cursor awareness updates
- lossy real-time streams where the next update supersedes the previous one

### At-least-once: no loss, but duplicates

```
1. Consumer receives message M
2. Consumer performs side effect
3. Consumer crashes before ack
4. Broker redelivers M
5. Consumer performs side effect again unless protected
```

At-least-once is the practical default for queues such as SQS, RabbitMQ and Kafka consumers. The broker keeps retrying until the consumer commits/acks. That is great for durability, but your handler must be safe under duplicates.

Examples of duplicate damage:
- payment captured twice
- notification sent twice
- inventory decremented twice
- ad click counted twice
- a job scheduler starting two copies of the same job

### Exactly-once: be precise about the boundary

"Exactly once" can mean different things:

1. **Exactly once delivery over a network** — impossible in the general case because sender and receiver can lose the ack and disagree about whether the work happened.
2. **Exactly once processing inside a system boundary** — possible when the system controls the log, offsets and output writes, such as Kafka transactions for read-process-write pipelines.
3. **Exactly once business effect** — achieved by idempotency keys, dedup tables, unique constraints and database transactions.

So in interviews, avoid magical claims. Say what boundary you mean.

**Interview line:** "I won't rely on exactly-once delivery. I'll design for at-least-once delivery and make the business operation exactly-once from the user's perspective using an idempotency key and a unique constraint."

---

## Part 2: idempotency keys for APIs (Stripe style)

An operation is **idempotent** if running it multiple times has the same effect as running it once. `GET /orders/123` is naturally idempotent. `POST /payments` is not unless we add a key.

Stripe's pattern: the client sends a unique key for one logical operation. The server stores the first result for that key. If the same key returns, it returns the same result instead of doing the work again.

```
Client                         API                         DB
  │ POST /payments             │                          │
  │ Idempotency-Key: k123      │                          │
  ├───────────────────────────►│ INSERT key k123          │
  │                            │ create payment           │
  │                            │ store response           │
  │ 201 payment=pay_1          │                          │
  ◄───────────────────────────┤                          │
  │ timeout / retry            │                          │
  │ POST /payments same key    │                          │
  ├───────────────────────────►│ key already exists       │
  │ 201 payment=pay_1          │ return stored response   │
  ◄───────────────────────────┤                          │
```

A safe API design usually stores:

```sql
CREATE TABLE idempotency_keys (
  key              text PRIMARY KEY,
  user_id          uuid NOT NULL,
  request_hash     text NOT NULL,
  status           text NOT NULL, -- in_progress, succeeded, failed
  response_body    jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL
);
```

Important details:

| Detail | Why it matters |
|---|---|
| Key is generated by the **client** for one logical operation | The client knows retries belong to the same intent |
| Store a request hash | Same key with different amount/currency is probably a client bug or attack |
| Store the final response | A retry can receive the same payment ID instead of a new one |
| Expire old keys | The table cannot grow forever; expiration is part of the API contract |
| Scope by user/merchant | Two clients accidentally using the same key should not collide globally |

AWS calls out an important nuance: two requests can have the same parameters but different intent. "Launch one EC2 instance" sent twice with different client request IDs may mean "launch two instances". Idempotency should be based on a **client request ID**, not only on payload equality.

**Retries safety rule:** retrying is good only after you can prove the retried operation is idempotent or guarded by a transaction.

---

## Part 3: idempotent consumers with dedup tables

API idempotency handles client-to-server retries. Queue idempotency handles broker-to-worker retries.

The classic pattern is a **processed messages** table. The consumer inserts the message ID and performs the side effect in the **same database transaction**.

```sql
BEGIN;

INSERT INTO processed_messages (consumer_name, message_id, processed_at)
VALUES ('email-sender', :event_id, now())
ON CONFLICT DO NOTHING;

-- If the insert affected 0 rows, this message was already processed.
-- Return success to the broker; do not do the side effect again.

UPDATE notifications
SET status = 'sent', sent_at = now()
WHERE id = :notification_id AND status <> 'sent';

COMMIT;
```

For a payment ledger, the dedup key is often an **event ID** or **operation ID** with a unique constraint:

```sql
CREATE TABLE ledger_entries (
  id uuid PRIMARY KEY,
  operation_id text NOT NULL UNIQUE,
  account_id uuid NOT NULL,
  amount_cents bigint NOT NULL,
  direction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

If the same operation is delivered twice, the second insert fails on `operation_id`, and the handler treats that as success because the desired effect already exists.

### Do not put the dedup write in a different system

Bad:

```
Redis SET processed:event123
Postgres INSERT ledger row
```

If Redis succeeds and Postgres fails, the retry sees "processed" and skips the real work. If Postgres succeeds and Redis fails, the retry performs the work twice. The dedup marker and the side effect must be in the same transactional boundary whenever possible.

If the side effect is external (email provider, payment gateway), you still push idempotency as close as possible to that provider: pass a provider idempotency key, or store an outbox row and let a sender retry with the same provider key.

---

## Part 4: Kafka idempotent producer and transactions, briefly

Kafka's delivery story has two sides:

### Producer side: idempotent producer

Kafka can assign producer IDs and sequence numbers so that if a producer retries a send after a transient error, the broker can discard duplicate records for the same partition. This protects against duplicate appends caused by producer retries.

What it does **not** solve:
- your database write outside Kafka
- duplicate business operations in a consumer
- cross-system side effects like sending email

### Consumer side: offsets are part of the problem

A consumer often does this:

```
read message at offset 42
write to DB
commit offset 43
```

Crash windows:
- crash before DB write → broker redelivers; fine
- crash after DB write but before offset commit → broker redelivers; duplicate unless handler is idempotent
- commit offset before DB write → message can be lost

So consumers should usually write the business result first, then commit offsets, and make the business write idempotent.

### Kafka transactions ⏭ *Skip for interviews*

Kafka transactions let a producer atomically write records to multiple partitions and commit consumed offsets with produced output. This is powerful for Kafka-in/Kafka-out stream processing:

```
input topic -> processor -> output topic
                also commits input offsets in the same Kafka transaction
```

That gives exactly-once processing **within Kafka topics**. Once you call an external database, payment gateway or email provider, you need that system's transaction/idempotency story too.

**Interview line:** "Kafka transactions help for read-process-write pipelines inside Kafka. For the database side effect, I still need an idempotent consumer or an outbox."

---

## Part 5: retries, backoff and safe failure handling

Retries are not a feature by themselves. Retrying a non-idempotent action can turn a transient network problem into corrupted state.

A retry-safe design has:

| Piece | Purpose |
|---|---|
| Timeout | Bound how long the caller waits; otherwise threads pile up |
| Retry budget | Avoid infinite retries during an outage |
| Exponential backoff + jitter | Avoid thundering herds where every client retries together |
| Idempotency key | Make repeated attempts the same logical operation |
| Dead-letter queue | Put poison messages somewhere inspectable after max attempts |
| Observability | Count retries, dedup hits and duplicate attempts |

Example notification flow:

```
Order service writes notification_outbox row
Publisher sends event to queue
Email worker receives at-least-once
Worker inserts processed(event_id) + marks notification SENT
If provider call times out, retry with the same provider idempotency key
After N failures, move to DLQ and alert
```

DrawBoard connection: awareness updates such as cursor positions can be at-most-once; the next cursor position supersedes the old one. Board content updates cannot be treated that casually. Yjs updates are designed to be safe to apply more than once, which is one reason CRDT sync is a good fit for collaborative editing.

Adobe Connect connection: real-time meeting events split similarly. A transient "user is typing" event can be dropped. A recording pipeline job or billing-related meeting entitlement update needs at-least-once plus idempotency.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Cursor positions / typing indicator | At-most-once or best effort | Latest update replaces old; loss is fine |
| Email / push notification | At-least-once + dedup by notification ID | Missing is bad; duplicate is annoying, so dedup |
| Payment capture | Client idempotency key + provider idempotency + ledger unique constraint | Duplicate charge is unacceptable |
| Kafka stream enrichment to another Kafka topic | Kafka idempotent producer + transactions | Boundary stays inside Kafka |
| Queue worker writing Postgres | At-least-once + processed_messages table in same DB transaction | Handles crash after side effect before ack |
| Analytics click count | At-least-once with event ID dedup, or approximate if business allows | Duplicates distort metrics |
| Job scheduler | Job execution ID with lease + idempotent step writes | Scheduler may start the same job twice after failover |

### Common interview traps

- Saying "exactly once" without defining the boundary.
- Retrying `POST /payments` without an idempotency key.
- Deduplicating in Redis while the real side effect is in Postgres, creating split-brain dedup state.
- Committing Kafka offsets before the DB write, causing message loss.
- Forgetting that webhooks are usually at-least-once; your webhook handler needs dedup too.
- Treating idempotency as "same parameters" instead of a client-supplied operation ID.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why is true exactly-once delivery over a network impossible in the general case?</summary>

Because the sender can lose the acknowledgement after the receiver performed the work. The sender cannot know whether to retry without risking a duplicate. We solve the business problem with idempotency, deduplication or transactions, not magical delivery.
</details>

<details><summary>2. A worker writes a DB row and crashes before acking the queue message. What delivery semantic is this, and what must the handler do?</summary>

This is at-least-once delivery. The broker will redeliver the message, so the handler must be idempotent: use a unique operation ID or processed-message table in the same transaction as the side effect.
</details>

<details><summary>3. What should the server do if the same idempotency key is reused with a different request body?</summary>

Reject it, usually with a 400 or conflict-style error. The key represents one logical intent; changing amount/currency/resource while reusing the key is ambiguous and dangerous.
</details>

<details><summary>4. Why is a client-supplied idempotency key better than hashing the request body?</summary>

Two identical-looking requests can be different intents, such as launching two identical instances. A client request ID lets the caller say "these attempts are the same operation" explicitly.
</details>

<details><summary>5. What does Kafka's idempotent producer protect against, and what does it not protect against?</summary>

It protects against duplicate records appended by producer retries to Kafka partitions. It does not make external database writes, payment captures or email sends exactly-once; consumers still need idempotency for side effects.
</details>

<details><summary>6. In a payment system, where would you put deduplication?</summary>

At multiple layers: API idempotency key for the client request, provider idempotency key for gateway calls, and a unique operation ID in the ledger table so duplicate messages cannot create duplicate ledger entries.
</details>

<details><summary>7. When is at-most-once acceptable?</summary>

When loss is acceptable and retrying would be wasteful: cursor positions, typing indicators, ephemeral presence pings or high-frequency telemetry where the next sample supersedes the lost one.
</details>

<details><summary>8. Why must the dedup marker and business side effect usually be in the same database transaction?</summary>

If they are written separately, one can succeed and the other fail. That can make retries skip work that never happened or repeat work that already happened. One transaction keeps the marker and effect consistent.
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
| [Kafka docs: Message Delivery Semantics](https://kafka.apache.org/43/design/design/#message-delivery-semantics) | Exact headings: **Message Delivery Semantics** and **Using Transactions** | ~20 min |
| [Kafka producer config: enable.idempotence](https://kafka.apache.org/43/configuration/producer-configs/#enable.idempotence) | Config entry `enable.idempotence`; skim with the Kafka semantics section | ~5 min |
| [Stripe: Designing robust and predictable APIs with idempotency](https://stripe.com/blog/idempotency) | Exact headings: **Planning for failure**, **Making liberal use of idempotency**, **Guaranteeing “exactly once” semantics**, **Being a good distributed citizen** | ~15 min |
| [AWS Builders' Library: Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) | Exact headings: **Retrying and side effects**, **Reducing client complexity**, **Retries and semantic equivalence**, **Late arriving requests**, **Same client request ID, different intent** | ~30 min |

**Connects to:** [D1 Queues](D1-Queues.md) · [D2 Kafka](D2-Kafka.md) · [D4 Outbox + CDC](D4-Outbox-CDC.md) · [I2 Timeouts/retries/backoff](../I-Reliability/I2-Timeouts-Retries-Backoff.md) · [G5 Ledger/reconciliation](../G-Contention/G5-Ledger-Reconciliation.md)
