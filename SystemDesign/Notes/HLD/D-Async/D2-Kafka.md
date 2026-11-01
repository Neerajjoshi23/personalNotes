# D2 · Kafka: a durable log for events, replay and high-throughput pipelines

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Notification system (#13), News feed (#4), Web crawler (#7), Ad click aggregator (#20), Metrics monitoring (#20), Message queue (#23), most event-driven follow-ups

---

## Why this topic matters

Kafka is not just "a queue." Kafka is a **partitioned, replicated, durable log**. Producers append records to topics. Consumers read records at their own pace by tracking offsets. The same event stream can power notifications, search indexing, analytics, caches and audits.

Use Kafka when the interviewer wants:

- high-throughput event ingestion;
- multiple independent consumers;
- replay after a bug;
- ordered events per key;
- retention for hours/days/weeks;
- stream processing or analytics.

Do not use Kafka just because a job is async. For "send one email later", a simple queue is often better.

**Interview line:** "I'll use Kafka when the event history itself is valuable: multiple consumers need the same events, and I may need replay. If I only need one worker to do one job, I choose a simpler queue."

---

## Part 1: the log model

A Kafka topic is split into partitions. Each partition is an ordered append-only log.

```
topic: orders

partition 0: [0] [1] [2] [3] ...
partition 1: [0] [1] [2] [3] ...
partition 2: [0] [1] [2] [3] ...
```

Each record has:

- topic;
- partition;
- offset;
- key (optional);
- value/payload;
- timestamp;
- headers (optional).

The offset is the record's position within one partition. Offset 15 in partition 0 is unrelated to offset 15 in partition 1.

### Kafka vs a classic queue

In a classic queue, a worker consumes a message and the broker deletes/hides it. In Kafka, records remain for a retention period. Consumers remember how far they have read.

```
Kafka partition:  [0] [1] [2] [3] [4] [5]
consumer A offset ----------------^
consumer B offset --------^
```

That is why replay is natural. If a search indexer had a bug yesterday, reset its consumer group's offset and rebuild from the log.

---

## Part 2: topics, partitions, keys and ordering

### Topics

A topic is a named stream: `user-events`, `orders`, `ad-clicks`, `chat-messages`.

Pick topics by event meaning, not by consuming team only. `OrderCreated` should be an event other systems can understand; `email-service-input` is just an implementation queue.

### Partitions

Partitions are Kafka's unit of parallelism and ordering.

- More partitions -> more parallel consumers and producer throughput.
- Ordering is guaranteed **within a partition**, not across the topic.
- One partition is handled by at most one consumer in a consumer group at a time.

### Keys choose partitions

The producer can set a key. Kafka hashes the key to choose a partition, so all records with the same key go to the same partition.

| Use case | Key | Why |
|---|---|---|
| Chat messages | `conversationId` | preserve order per conversation |
| Payment ledger events | `accountId` | preserve order per account |
| User activity | `userId` | session/user timeline order |
| Ad clicks | maybe adId/campaignId or no key | balance throughput vs aggregation locality |

**Interview line:** "I do not need global ordering; I need per-entity ordering. I'll key by that entity so Kafka preserves order inside each partition while different entities process in parallel."

### Hot keys

If one key is extremely hot, it overloads one partition. Example: `campaignId=worldcup-final` for all ad clicks. Fixes include:

- choose a more granular key;
- split the hot key (`campaignId + randomBucket`);
- aggregate locally then emit reduced events;
- accept relaxed ordering for that hot entity.

Ordering and load balance are a trade-off.

---

## Part 3: consumer groups, offsets and rebalancing

A consumer group is a set of consumers cooperating to process a topic. Each partition is assigned to one consumer in the group.

```
Topic has 6 partitions

Group search-indexer:
  consumer A -> p0, p1
  consumer B -> p2, p3
  consumer C -> p4, p5

Group analytics:
  consumer X -> p0, p1, p2
  consumer Y -> p3, p4, p5
```

Each group gets its own offsets. Search indexing and analytics do not steal messages from each other.

### Rebalancing

When consumers join/leave or partitions change, Kafka reassigns partitions. That is a rebalance.

Rebalancing is necessary for elasticity, but it can pause processing and cause duplicate work if offsets are not committed carefully.

Worker flow:

1. poll records;
2. process side effects;
3. commit offsets.

If a consumer crashes after side effects but before commit, another consumer may reprocess those records. This is why idempotency matters.

### Lag

Consumer lag is "latest offset - committed/processed offset." It tells you how far behind a consumer group is.

Lag is one of the most important Kafka operational metrics. Alert on:

- lag growing continuously;
- oldest event age too high;
- one partition lagging much more than others;
- rebalance storms;
- DLQ/error topic growth.

---

## Part 4: retention and replay

Kafka retains records by time/size, independent of whether consumers have read them.

```
Retention = 7 days

Day 1 event can be replayed until Day 8, then deleted/compacted depending policy.
```

This is the feature that makes Kafka valuable for event-driven architecture:

- rebuild Elasticsearch index after mapping bug;
- recompute analytics after code fix;
- onboard a new consumer from yesterday's events;
- audit what happened.

### Log compaction ⏭ *Skip for interviews*

Kafka can compact a topic by key, keeping the latest value for each key. This is useful for changelog-like topics:

```text
user42 -> name=A
user42 -> name=B
user99 -> name=C

after compaction, latest per key remains eventually
```

Do not confuse compaction with normal time retention. Compaction is good for state snapshots/changelogs, not for event history where every event matters.

---

## Part 5: replication, ISR and acks

Kafka partitions are replicated across brokers. One replica is leader; followers replicate from it.

```
partition 0 replicas:
  broker 1: leader
  broker 2: follower, in-sync replica (ISR)
  broker 3: follower, in-sync replica (ISR)
```

Producers write to the leader. Consumers read from the leader by default. If the leader fails, an in-sync follower can become leader.

### Replication factor

Replication factor 3 is common: one leader + two followers. It tolerates broker failures better than RF=1, at storage/network cost.

### ISR ⏭ *Skip for interviews*

ISR means in-sync replicas: followers caught up enough to be eligible for safer leader election. If a follower falls too far behind, it leaves ISR.

### Producer acks

| `acks` | Meaning | Trade-off |
|---|---|---|
| `acks=0` | producer does not wait | fastest, can lose silently |
| `acks=1` | leader acknowledges after local write | can lose if leader dies before replication |
| `acks=all` | wait for all in-sync replicas required by config | strongest common setting, higher latency |

For important events, say `acks=all`, replication factor 3, and an appropriate `min.insync.replicas` so a single broker cannot acknowledge alone if policy requires more copies.

This still does not make your whole business workflow exactly-once. It makes Kafka's write more durable; consumers and external side effects still need idempotency/transactions.

---

## Part 6: why Kafka is fast ⏭ *Skip for interviews*

Kafka's throughput comes from design choices:

| Reason | Explanation |
|---|---|
| Sequential I/O | appending to log files is disk-friendly |
| OS page cache | Kafka relies heavily on filesystem cache instead of managing all cache itself |
| Batching | producers and consumers send/read batches, amortizing overhead |
| Compression | batches compress well, reducing network/disk |
| Zero-copy | data can move from disk/page cache to socket with fewer copies |
| Partition parallelism | many partitions spread load across brokers/consumers |

Interview phrasing:
> "Kafka is fast because it turns random message operations into sequential log appends and batched reads, then scales by partitioning."

Do not overpromise latency. Kafka can be low-latency, but its sweet spot is high-throughput durable streaming.

---

## Part 7: when to use Kafka vs a simple queue

### Use Kafka when

- multiple independent services need the same events;
- replay matters;
- throughput is high;
- retention is useful;
- order is needed per key;
- you are building analytics/stream processing;
- you need a central event backbone.

Examples:

- ad click aggregator (#20);
- metrics pipeline;
- CDC from DB to Elasticsearch/cache;
- news-feed event fan-out pipelines;
- audit/event history for orders.

### Use a simple queue when

- one message should be handled by one worker;
- you do not need replay after success;
- you want low operational overhead;
- job state/retry/DLQ is the main need;
- strict priority/delay queues are more important than log retention.

Examples:

- send a welcome email;
- generate a PDF;
- run a code submission;
- transcode a small job pipeline if replay/history is not central.

### Kafka as a work queue: possible but awkward

Kafka can power worker pools via consumer groups. But retries, delayed retries and per-message ack semantics are less direct than SQS/RabbitMQ. You often need retry topics and DLQ topics:

```
orders -> consumer
          | success -> commit offset
          | transient fail -> orders.retry.5m
          | permanent fail -> orders.dlq
```

That works, but it is more design than a simple queue.

---

## Part 8: partition count sizing ⏭ *Skip for interviews*

Partitions are parallelism. But more partitions are not free: they increase file handles, memory, metadata, rebalancing cost and recovery time.

Think from requirements:

1. Required throughput: MB/s and records/s.
2. Max throughput per partition in your environment.
3. Consumer parallelism needed.
4. Ordering key cardinality.
5. Future growth.

Simple interview formula:

```text
partitions >= max(
  throughput_needed / throughput_per_partition,
  max_consumers_needed_in_one_group
)
```

Then round up with headroom, but avoid absurd numbers. You can increase partitions later, but doing so can change key-to-partition mapping for future records, which can affect ordering assumptions.

Example:

```
Need 120 MB/s ingest
Assume 10 MB/s/partition safe target
Need at least 12 partitions
Want up to 20 consumers in analytics group
Choose 24 or 32 partitions with headroom
```

For a design interview, estimates matter more than exact numbers.

---

## Part 9: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Ad clicks / metrics | Kafka topic partitioned by campaign/ad/time-ish key | high throughput, analytics consumers, retention |
| Search indexing from DB changes | DB outbox/CDC -> Kafka -> indexer | replay after indexing bug |
| Chat messages | Kafka only for backend event pipeline; WebSocket for delivery | Kafka is not the client realtime protocol |
| Simple email job | SQS/RabbitMQ, not Kafka | one worker should do one job |
| Order events consumed by many services | Kafka | independent consumer groups |
| Need per-account order | key by `accountId` | partition ordering |
| Need strict global order | one partition, or avoid Kafka for that requirement | global order limits throughput |
| Critical event durability | RF=3, `acks=all`, min ISR | tolerate broker failure |

### Common interview traps

- Calling Kafka a queue and ignoring retention/replay.
- Claiming ordering across a whole topic. Ordering is per partition.
- Choosing a low-cardinality key that creates hot partitions.
- Adding more consumers than partitions and expecting more throughput in one group.
- Forgetting idempotent consumers because offset commits and side effects can be duplicated.
- Using Kafka for delayed per-message retries without explaining retry topics/DLQ.
- Saying `acks=all` gives end-to-end exactly-once for external systems.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What is Kafka's core abstraction?</summary>

A partitioned, replicated, append-only log. Topics are split into partitions; records are appended with offsets; consumers track offsets and can replay retained records.
</details>

<details><summary>2. Where does Kafka guarantee ordering?</summary>

Within a single partition only. To order events for an entity, use that entity ID as the key so all its records go to the same partition. Kafka does not guarantee global ordering across partitions.
</details>

<details><summary>3. What is a consumer group?</summary>

A set of consumers that cooperatively process topic partitions. Each partition is assigned to at most one consumer in the group at a time. Different consumer groups have independent offsets and each receive the full stream.
</details>

<details><summary>4. Why does Kafka make replay easy?</summary>

Records are retained by time/size independent of consumption, and consumers store offsets. Reset a consumer group's offset to an earlier point and it can read the retained log again.
</details>

<details><summary>5. Explain leader, ISR and `acks=all`.</summary>

Each partition has a leader replica handling reads/writes and follower replicas copying it. ISR is the set of replicas caught up enough to be considered in-sync. With `acks=all`, the producer waits for acknowledgement from the required in-sync replicas according to broker/topic settings, improving durability.
</details>

<details><summary>6. Why is Kafka high-throughput?</summary>

It uses sequential log appends, OS page cache, batching, compression, zero-copy transfer and partition parallelism. This amortizes overhead and keeps disk/network access efficient.
</details>

<details><summary>7. When would you choose SQS over Kafka?</summary>

For a simple work queue where one job should be processed by one worker, replay/history is not central, and you want managed low-ops retries/DLQ/visibility timeout semantics.
</details>

<details><summary>8. How do you size partition count in an interview?</summary>

Estimate required throughput and consumer parallelism. Choose partitions at least as high as throughput_needed / per_partition_capacity and max consumers needed in one group, with reasonable headroom. Mention the operational cost of too many partitions.
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
| [Hello Interview: Kafka deep dive](https://www.hellointerview.com/learn/system-design/deep-dives/kafka) | Exact headings: A Motivating Example, Basic Terminology and Architecture, How Kafka Works, When to use Kafka in your interview, Scalability, Fault Tolerance and Durability, Handling Retries and Errors, Performance Optimizations, Retention Policies | ~45 min |
| [Apache Kafka: Design](https://kafka.apache.org/43/design/design/) | Exact headings: Motivation, Persistence, Efficiency, The Producer, The Consumer, Consumer Position, Message Delivery Semantics, Replication, Replicated Logs: Quorums, ISRs, and State Machines | ~45 min |
| [Apache Kafka: API](https://kafka.apache.org/43/apis/) | Exact headings: Producer API, Consumer API, Streams API, Connect API, Admin API | ~10 min skim |
| [D1 Queues](D1-Queues.md) | Compare queue vs log before choosing Kafka | local note |

**Connects to:** [D1 Queues](D1-Queues.md) · [D3 Delivery semantics + idempotency](D3-Delivery-Semantics-Idempotency.md) · [D4 Outbox + CDC](D4-Outbox-CDC.md) · [B8 Encoding + schema evolution](../B-Data/B8-Encoding-Schema-Evolution.md) · [H4 Stream aggregation](../H-Geo-Search-Counting/H4-Stream-Aggregation.md)
