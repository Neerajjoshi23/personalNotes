# D1 · Queues: decouple work so spikes do not break the system

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Notification system (#13), Web crawler (#7), YouTube / Netflix (#6), Flash sale (#18), Online judge (#19), ChatGPT-style LLM app (#24), Message queue (#23)

---

## Why this topic matters

A queue is what you add when doing work synchronously would make the user wait, overload a dependency, or fail during spikes. It turns "do this now" into "record this work durably, then workers process it at a controlled rate."

| Without queue | With queue |
|---|---|
| API waits for email/SMS/video transcode | API accepts request and returns quickly |
| sudden spike hits DB/worker directly | queue buffers spike |
| failed downstream loses work | retry/DLQ can preserve work |
| producers and consumers must scale together | producers and consumers scale independently |

**Interview line:** "I'll put a queue between the request path and the slow/variable worker path, so user-facing latency stays low and workers can drain at their own rate."

---

## Part 1: why queues exist

### Decoupling

The producer should not know which worker runs the job, whether it is currently up, or how many workers exist.

```
API server -> queue -> email workers
                 |
                 +-> retry / DLQ / metrics
```

In a notification system (#13), the API records "send notification" and returns. Email/SMS/push workers handle provider rate limits, retries and templates separately.

### Load leveling

Queues smooth spikes. If a flash sale receives 100k checkout attempts in 10 seconds but inventory can safely process 2k/s, the queue absorbs the burst and workers drain it at 2k/s.

This is not infinite capacity. It changes failure from "everything falls over" to "latency/backlog grows." You still need admission control, queue length alerts and sometimes a waiting room.

### Retry and buffering failures

If a downstream SMS provider is down for 5 minutes, queued messages can retry later. Without a queue, every request either blocks or fails.

### Back-pressure

A queue gives a visible backlog. When it grows too large, the system can:

- slow producers;
- reject low-priority work;
- scale workers;
- shed optional jobs;
- tell users "processing may take longer."

Back-pressure is what prevents hidden overload.

---

## Part 2: queue models and vocabulary

### Point-to-point queue

Each message is processed by one consumer.

```
          +-> Worker A
Queue ----+-> Worker B
          +-> Worker C

Message 42 goes to exactly one worker instance.
```

Use for jobs: send one email, transcode one video chunk, crawl one URL, run one code submission.

### Pub/Sub

Each subscriber group gets a copy of the event.

```
Event: OrderCreated
       |
       +-> email service
       +-> analytics service
       +-> warehouse service
```

Use when multiple independent systems react to the same fact. Pub/Sub may be implemented by SNS, Kafka topics, Redis Pub/Sub, NATS, etc. Check delivery guarantees; Redis Pub/Sub is not durable.

### Message queue vs log

A classic queue is work-oriented: consume and delete/ack. A log is history-oriented: append, retain and let consumers track offsets.

| Dimension | Message queue | Log / stream |
|---|---|---|
| Primary mental model | jobs waiting to be done | ordered record of events |
| After consume | often deleted/hidden | retained for time/size |
| Replay | awkward or unavailable | first-class |
| Consumers | competing workers | independent consumer groups |
| Examples | SQS, RabbitMQ queue | Kafka, Kinesis, Redis Streams-ish |

This distinction explains when to use Kafka (D2) instead of a simple queue.

---

## Part 3: delivery mechanics: ack, visibility timeout, DLQ

### Ack

Workers should only acknowledge after processing succeeds. If they ack before side effects, a crash can lose work. If they ack after side effects, a crash between side effect and ack can duplicate work. That is why D3 idempotency matters.

```
receive message
process side effect
ack message
```

### Visibility timeout

In systems like SQS, receiving a message hides it for a period. If the worker does not delete/ack it before timeout, the message becomes visible again.

```
t=0     worker receives M, hidden for 60s
t=30    worker succeeds, deletes M       -> done

or

t=0     worker receives M
t=60    worker crashed/no delete
t=61    M visible again for another worker
```

Set visibility timeout longer than normal processing time, or extend it while working. Too short causes duplicate processing; too long delays retry after worker death.

### Dead-letter queue (DLQ)

Poison messages fail repeatedly because the payload is invalid or the code cannot handle it. Infinite retries waste capacity and block progress.

After N attempts, send the message to a DLQ for inspection/replay:

```
main queue -> worker -> fail
                  |
                  v
             retry count >= 5?
                  |
                  v
                DLQ
```

DLQ is not a trash can. It needs alerts, dashboards and a replay path after fixing the bug.

### Poison messages

A poison message can be:

- malformed JSON;
- a valid event for an unsupported schema version;
- a job that always violates a downstream constraint;
- one giant payload that OOMs workers;
- a message that triggers a code bug.

Defenses: schema validation, max payload size, retry limits, DLQ, idempotent processing, and deploy rollback.

---

## Part 4: ordering and back-pressure

### Ordering

Queues often preserve order only under constraints. Global ordering kills throughput because everything must pass through one lane.

Useful interview rule:

> "I need ordering per entity, not globally."

Examples:

- chat messages ordered per conversation;
- payment ledger entries ordered per account;
- video chunks ordered per video or segment pipeline stage;
- crawler politeness ordered per domain.

If order matters per key, partition or route by that key. Kafka does this with partitions; SQS FIFO uses message group IDs; RabbitMQ can route to queues.

### Retries break naive ordering

If message 2 fails and message 3 succeeds, have you violated order? It depends on the domain. For bank ledger, maybe yes. For sending marketing emails, probably no.

When strict order matters, one failed message may block later messages for that key. This is a trade-off, not a bug.

### Back-pressure

Back-pressure means producers feel downstream overload instead of blindly adding infinite work.

Signals:

- queue depth;
- oldest message age;
- worker CPU/error rate;
- DLQ growth;
- provider throttling;
- time to drain backlog.

Actions:

- scale workers if downstream can handle it;
- reduce producer rate;
- prioritize important queues;
- drop optional/expired work;
- degrade UI ("we'll notify you when ready");
- move users to a waiting room for flash sale.

---

## Part 5: SQS vs RabbitMQ vs Kafka at a glance

| System | Best for | Mental model | Notes |
|---|---|---|---|
| SQS | managed job queue, simple async workers | pull queue with visibility timeout | very low ops; standard queues are at-least-once and best-effort ordering; FIFO queues exist with throughput trade-offs |
| RabbitMQ | routing-heavy work queues, request/reply, protocols | broker with exchanges/queues/acks | flexible routing and priorities; you operate the broker; good for traditional enterprise queues |
| Kafka | event log, replay, analytics pipelines, many consumers | partitioned durable log | high throughput, retention, consumer groups; more operational/model complexity |

Interview shortcuts:

- For "send emails after signup", SQS is enough.
- For "route messages by topic/priority with complex broker semantics", RabbitMQ is plausible.
- For "store event history and let many systems replay it", Kafka.

Do not choose Kafka just because it is famous. For a small notification worker, a simple queue is easier and better.

---

## Part 6: where queues appear in common questions

### Notification system (#13)

```
API -> notifications table/outbox -> queue -> workers -> provider
                                      |
                                      +-> retries / DLQ
```

Queue decouples user action from slow providers. You need idempotency because providers may receive duplicate sends.

### Web crawler (#7)

Queues hold URLs to crawl. You often need per-domain politeness queues so one domain is not hammered.

```
frontier queues by domain -> crawler workers -> parser -> discovered URLs -> dedup -> frontier
```

Add a Bloom filter/dedup store before enqueueing discovered URLs.

### YouTube transcoding (#6)

Upload completes, then enqueue transcoding jobs. Workers produce multiple resolutions/bitrates. Queue lets expensive CPU/GPU work scale independently.

```
upload -> metadata DB -> transcode queue -> workers -> object storage -> notify
```

### Flash sale (#18)

Queues can level load, but they do not by themselves solve inventory correctness. Use a queue/waiting room to meter requests; use DB locks/reservations for stock.

### Online judge (#19)

Submissions go to a queue. Sandbox workers pull jobs, run code with limits, store result. Priority queues may separate premium/contest submissions.

### ChatGPT-style LLM app (#24)

GPU inference is scarce. A queue protects GPUs and lets the UI show position/status. For streaming token output, combine queue for admission with SSE/WebSocket for response delivery.

---

## Part 7: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| User request triggers slow side effect | Queue + workers | keeps request latency low |
| Downstream has rate limits | Queue with controlled worker concurrency | avoids provider throttling |
| Need retries | Ack after success + retry policy + DLQ | avoids losing transient failures |
| Need per-user/per-order ordering | partition/group by entity ID | avoids global ordering bottleneck |
| Need many systems to replay events | Kafka/log, not simple queue | retention and independent offsets |
| Need simple managed queue | SQS | low operational overhead |
| Need complex broker routing | RabbitMQ | exchanges/routing/acks |
| Need flash-sale protection | waiting room + queue + DB correctness | queue levels load; DB enforces stock |

### Common interview traps

- Saying "queue gives exactly once." Most queues are at-least-once; consumers must be idempotent.
- Ignoring visibility timeout/ack timing.
- Forgetting DLQ and poison messages.
- Assuming global ordering while also claiming high throughput.
- Letting queue backlog grow without back-pressure or user-visible status.
- Using Kafka for a simple background job when SQS/RabbitMQ is enough.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Give three reasons to put a queue between API and worker.</summary>

Decouple producer and worker, level load during spikes, enable retries/buffering when downstream fails, reduce user-facing latency, and allow workers to scale independently.
</details>

<details><summary>2. What is visibility timeout?</summary>

After a worker receives a message, the queue hides it for a configured time. If the worker does not ack/delete before the timeout, the message becomes visible again for retry. Too short causes duplicates; too long delays recovery.
</details>

<details><summary>3. Why do queues usually require idempotent consumers?</summary>

Because messages can be delivered more than once: worker crashes after side effect but before ack, visibility timeout expires, or broker retries. The consumer should dedup by message/job ID or make the side effect naturally idempotent.
</details>

<details><summary>4. What is a DLQ, and what should happen after a message enters it?</summary>

A dead-letter queue stores messages that exceeded retry limits or could not be processed. It should alert operators, preserve the payload/error, and support replay after the bug/data issue is fixed.
</details>

<details><summary>5. Message queue vs log: explain in one paragraph.</summary>

A message queue is job-oriented: workers compete for messages, ack them and remove them. A log is history-oriented: events are appended and retained; each consumer group tracks its own offset and can replay. Kafka is a log; SQS/RabbitMQ queues are classic job queues.
</details>

<details><summary>6. How do you preserve ordering without destroying throughput?</summary>

Require ordering per entity, not globally. Partition/group by `conversationId`, `accountId`, `videoId`, etc. Messages for one key are ordered; different keys process in parallel.
</details>

<details><summary>7. For YouTube upload, where does the queue fit?</summary>

After upload and metadata write, enqueue transcode jobs. Workers consume jobs, create renditions/thumbnails, store outputs in object storage, update status and notify users. The queue absorbs spikes and isolates CPU/GPU-heavy work.
</details>

<details><summary>8. Why is a queue not enough for flash-sale inventory correctness?</summary>

The queue meters load but does not enforce "only N items sold." Inventory correctness needs a transactional reservation/lock/atomic decrement in the source of truth. The queue reduces pressure on that critical section.
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
| [System Design Primer: Asynchronism](https://github.com/donnemartin/system-design-primer#asynchronism) | Message queues and task queues subsections under Asynchronism; skim pros/cons | ~15 min |
| [Azure: Queue-Based Load Leveling pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling) | Exact headings: Context and problem, Solution, Problems and considerations, When to use this pattern, Workload design, Example | ~20 min |
| **Alex Xu Vol 2, ch 4: Distributed Message Queue** | Optional scanned chapter for question walkthrough; focus on requirements, high-level design and consumer/producer flow | [PDF p.97](<../../../Books/System Design Interview Vol 2 - Alex Xu.pdf#page=97>) |
| [D2 Kafka](D2-Kafka.md) | Read next to separate simple queues from partitioned logs | local note |

**Connects to:** [D2 Kafka](D2-Kafka.md) · [D3 Delivery semantics + idempotency](D3-Delivery-Semantics-Idempotency.md) · [D4 Outbox + CDC](D4-Outbox-CDC.md) · [D5 Async request-reply](D5-Async-Request-Reply.md) · [G3 Virtual waiting room](../G-Contention/G3-Virtual-Waiting-Room.md)
