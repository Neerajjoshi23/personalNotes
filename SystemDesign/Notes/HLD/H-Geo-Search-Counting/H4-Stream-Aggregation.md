# H4 · Stream Aggregation: counting events while time is still moving

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Ad click aggregator / metrics monitoring (#20), Top-K / trending / leaderboard (#15), Payment fraud checks (#16), Notification analytics (#13)

---

## Why this topic matters

Many systems are not asking "what is the current row?" They are asking "how many things happened in the last minute/hour/day?" Examples: ad clicks per campaign, API errors per service, active users per minute, trending hashtags, meeting join failures in Adobe Connect.

You can answer those questions with a nightly batch job, but interviews usually push toward **fresh metrics at scale**. That is stream aggregation: consume an unbounded event stream and continuously update windowed counts.

| Problem | Stream aggregation concept |
|---|---|
| Count clicks per ad per minute | Windowed aggregation |
| Handle late mobile events | Event time, watermarks, late-event policy |
| Serve dashboards quickly | Pre-aggregated OLAP/time-series store |
| Avoid double-counting retries | Idempotency and exactly-once-ish processing |
| Keep latency low | Flink/Kafka Streams-style stateful processing |

---

## Part 1: batch vs stream, and why pre-aggregation exists

A batch job processes a bounded dataset:

```sql
SELECT ad_id, date_trunc('hour', clicked_at) AS hour, count(*)
FROM ad_clicks
WHERE clicked_at >= now() - interval '1 day'
GROUP BY ad_id, hour;
```

Good for correctness, backfills and daily reports. Bad when advertisers want a dashboard that updates every few seconds.

A stream processor consumes events as they arrive:

```
click events -> Kafka -> stream processor -> per-minute counts -> OLAP/TSDB -> dashboard
```

It keeps state like:

```
(adId=123, window=10:03) -> 8,921 clicks
(adId=123, window=10:04) -> 4,102 clicks
```

Why not query raw events every time? Because raw event volume is huge. Dashboards query the same aggregates repeatedly. Pre-aggregation converts billions of events into thousands/millions of rollup rows.

**Interview line:** "I would store raw clicks durably for replay, but dashboards should read pre-aggregated window tables, not scan the raw click table for every query."

| Architecture | How it works | Trade-off |
|---|---|---|
| Lambda | Batch layer for correctness + speed/stream layer for freshness | Powerful but two code paths to maintain |
| Kappa | Single streaming pipeline; replay the log for backfills | Simpler if the log is retained long enough |

For an interview, start with a stream pipeline for real-time aggregates and raw-event retention for backfill/replay. If exact historical correction matters, add a batch backfill path.

---

## Part 2: windows: tumbling, sliding and session

A window groups events over time before aggregation.

| Window | Meaning | Example |
|---|---|---|
| Tumbling | Fixed, non-overlapping buckets | clicks per minute: 10:03:00-10:03:59 |
| Sliding / hopping | Fixed size, overlapping windows | last 5 minutes updated every 1 minute |
| Session | Dynamic gap-based window | user activity session ends after 30 min idle |

```
Tumbling 1-minute:
[10:00-10:01) [10:01-10:02) [10:02-10:03)

Sliding 5-minute every 1-minute:
[10:00----------------10:05)
      [10:01----------------10:06)
            [10:02----------------10:07)

Session:
click click click ---- idle gap ---- click click
[      session 1     ]              [ session 2 ]
```

For ad clicks, tumbling windows are common because advertisers ask for counts per minute/hour/day. Sliding windows are useful for alerts: "error rate over the last 5 minutes." Session windows are useful for user behaviour analysis.

You often aggregate at multiple granularities:

| Table | Retention | Use |
|---|---|---|
| raw_click_events | 7-30 days or longer | replay, audit, abuse investigation |
| ad_clicks_1m | 7 days | fresh dashboard |
| ad_clicks_1h | 1 year | reporting |
| ad_clicks_1d | years | billing/business analytics |

Rollups can be derived from smaller windows: 1-hour = sum of sixty 1-minute buckets. This is cheaper than scanning raw events.

---

## Part 3: event time, processing time, watermarks and late events

This is the part that separates a senior answer from "Kafka + consumers".

- **Event time:** when the click actually happened, according to the event timestamp.
- **Processing time:** when the stream processor sees the event.

If a phone is offline, a click at 10:03 may arrive at 10:20. If you aggregate by processing time, the 10:20 bucket gets a fake spike. If advertisers care about when the click happened, use event time.

```
actual click:       10:03:12
network delay:      12 minutes
processor receives: 10:15:45

Event-time window:      10:03
Processing-time window: 10:15
```

A watermark is the system saying: "I believe I have seen almost all events up to time T." It lets the processor close old windows while allowing some out-of-order delay.

```
events seen up to 10:08
watermark = 10:06  (allow 2 minutes lateness)
close windows <= 10:06
keep 10:07+ open
```

Late events still happen. Choose a policy:

| Policy | Use when |
|---|---|
| Drop very late events | Metrics tolerate small error and need simplicity |
| Update old aggregate and publish correction | Dashboards/billing need better accuracy |
| Keep raw log and run backfill | Historical reports must be correct |

For ad billing, be careful: user-facing dashboards can be near-real-time and corrected later, but billing should use a stricter finalized dataset after a delay and fraud checks.

**Interview line:** "I'll aggregate by event time, use watermarks to close windows, and keep raw clicks so late events or bugs can be corrected by replay/backfill. The dashboard may be near-real-time; billing waits for finalized aggregates."

---

## Part 4: Flink concept, exactly-once and OLAP stores

Apache Flink is a distributed stream processor for stateful event-time pipelines. You define operators like map/filter/keyBy/window/aggregate. Flink partitions state by key, keeps local state for windows, advances watermarks and checkpoints state so jobs can recover.

```
Kafka click topic
  -> parse + validate
  -> keyBy(adId, minuteWindow)
  -> aggregate count/sum(unique-ish)
  -> sink to ClickHouse/Druid/Pinot/warehouse
```

You do not need to know Flink APIs deeply for HLD. Know why it exists: doing windowed, stateful, fault-tolerant stream processing is hard to hand-roll with plain consumers.

"Exactly-once" is a dangerous phrase. In practice it means the framework can make state updates and source offsets consistent, often using checkpoints and replay. External side effects still need idempotent writes or transactions.

For a click aggregator:

- Every event has a stable `clickId` or `impressionId`.
- The stream job checkpoints input offsets and aggregate state.
- Sink writes are idempotent/upserts: `(adId, windowStart)` gets set/merged deterministically.
- Retries should not double-count the same click.

If the sink is not transactional with the stream processor, the safe line is: "effectively-once with idempotent writes and dedup keys." That is more honest than promising magic exactly-once across every external system.

Aggregates need fast group-by queries. Names to know:

| Store | Good at |
|---|---|
| ClickHouse | Columnar analytics, high ingest, SQL group-bys |
| Apache Druid | Real-time OLAP, time-partitioned segments, dashboards |
| Apache Pinot | Low-latency analytics, user-facing metrics |
| TimescaleDB | Time-series extension on Postgres, continuous aggregates |

For ad click aggregation, OLAP stores are a strong fit because advertisers query dimensions: campaign, ad, country, device, time range. For infrastructure metrics, Prometheus/TSDB-style systems are also relevant; that is [H6 Time-Series](H6-Time-Series.md).

---

## Part 5: ad click aggregation design sketch

A clean design:

```
Browser/app click
  -> click redirect service
      - validate impressionId
      - write click event to Kafka (durable)
      - redirect to advertiser URL
  -> stream processor
      - dedupe by clickId/impressionId
      - event-time window by adId/campaignId
      - emit 1m aggregates
  -> OLAP store (ClickHouse/Druid/Pinot)
  -> advertiser dashboard API
```

Core entities:

```text
ClickEvent(clickId, impressionId, adId, campaignId, userOrDeviceHash,
           eventTime, country, device, ipPrefix, userAgent)

Aggregate(adId, campaignId, windowStart, windowSize, clicks, uniqueUsersMaybe)
```

Important deep dives:

| Concern | Design |
|---|---|
| Redirect latency | Ingest event asynchronously; do not block redirect on OLAP write |
| Durability | Kafka/queue ack before redirect if loss is unacceptable, or local buffering with trade-off |
| Abuse | impressionId, rate limits, bot filters, invalid-click pipeline |
| Low-latency query | Pre-aggregate 1m rows and store in OLAP |
| Reprocessing | Raw events retained so corrected jobs can replay |
| Backpressure | Queue absorbs spikes; autoscale consumers; shed dashboard refresh if needed |

Adobe Connect analogy: meeting quality dashboards count joins, disconnects, packet-loss samples and recording pipeline failures. The raw events are high volume; the operations dashboard wants pre-aggregated windows by meeting, region, service and time.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Daily business report | Batch aggregation | Simple and correct enough |
| Live advertiser dashboard | Stream aggregation + OLAP store | Fresh metrics and fast group-by |
| Billing | Raw events + delayed finalized batch/stream output | Correctness over freshness |
| API error alert | Sliding window by event time or processing time | Detect recent spikes |
| User sessions | Session windows | Dynamic length based on inactivity |
| Massive dimensions | ClickHouse/Druid/Pinot | Columnar storage handles filters/group-bys |
| Need replay after bug | Kappa-style log replay or batch backfill | Recompute aggregates from raw events |

### Common interview traps

- Aggregating by processing time when the product needs event time.
- Saying "exactly once" without idempotent event IDs or sink semantics.
- Querying raw click events for every dashboard page.
- Forgetting late events, watermarks and correction/backfill policy.
- Mixing real-time dashboard numbers with billing-grade finalized numbers.
- Building a custom stream processor when Flink/Kafka Streams would be the right abstraction.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why do dashboards read pre-aggregated tables instead of raw events?</summary>

Raw event volume is too high and dashboards repeat similar group-by queries. Pre-aggregation turns many events into compact window rows, giving lower latency and lower query cost. Raw events are still kept for replay/audit.
</details>

<details><summary>2. Tumbling vs sliding vs session windows?</summary>

Tumbling windows are fixed and non-overlapping. Sliding/hopping windows overlap and are useful for rolling metrics. Session windows have no fixed duration; they group activity until an inactivity gap occurs.
</details>

<details><summary>3. Event time vs processing time: why does it matter?</summary>

Event time is when the event happened; processing time is when the system sees it. Network delay, offline clients and replays can make them differ. Using processing time can create fake spikes or wrong buckets.
</details>

<details><summary>4. What is a watermark?</summary>

A watermark is a progress marker saying the system believes most events up to time T have arrived. It lets event-time windows close while still allowing bounded out-of-order data. Very late events need a policy: drop, correct or backfill.
</details>

<details><summary>5. What does exactly-once really require?</summary>

Consistent checkpointing of input offsets and processor state, plus idempotent or transactional sink writes. Across arbitrary external systems, it is safer to say effectively-once with stable event IDs, deduplication and idempotent upserts.
</details>

<details><summary>6. Why is Flink useful here?</summary>

It handles stateful, partitioned, event-time stream processing with windows, watermarks and checkpoints. Hand-rolling that with simple consumers becomes hard once you need correctness and recovery.
</details>

<details><summary>7. Where would ClickHouse/Druid/Pinot fit?</summary>

As the analytics/OLAP store behind dashboards. The stream processor writes windowed aggregates or events into them; dashboard APIs run low-latency group-by/filter queries.
</details>

<details><summary>8. Why should ad billing not use the same number as a live dashboard?</summary>

Live dashboards may be approximate, delayed or later corrected for late events and fraud. Billing needs finalized, auditable numbers after dedupe, validation and a lateness/fraud window.
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
| [Hello Interview: Ad Click Aggregator](https://www.hellointerview.com/learn/system-design/problem-breakdowns/ad-click-aggregator) | Exact headings: "Understanding the Problem"; "High-Level Design" → "Server side redirect" / "Separate Analytics Database with Batch Processing" / "Real-time Analytics With Stream Processing"; "Potential Deep Dives" → scale, data loss, abuse, low-latency metrics; "Final Design" | ~45 min |
| **DDIA 1st ed, ch 11: Stream Processing** | "Processing Streams"; "Uses of Stream Processing"; "Stream analytics"; "Reasoning About Time"; "Event time versus processing time"; "Knowing when you're ready"; "Whose clock are you using, anyway?"; "Types of windows"; "Fault Tolerance"; "Microbatching and checkpointing"; "Distributed transactions"; "Idempotence"; "Rebuilding state after a failure" | [p.486](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=486>) → [p.501](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=501>) |
| **Alex Xu Vol 2, ch 6: Design Ad Click Event Aggregation** | Whole chapter: requirements, API, aggregation service, message queue, database choices, correctness and scaling | [PDF p.163](<../../../Books/System Design Interview Vol 2 - Alex Xu.pdf#page=163>) · ~45 min |
| [H5 Approximate Counting](H5-Approximate-Counting.md) | Approximate heavy hitters and distinct counts for high-volume streams | Local note |
| [H6 Time-Series](H6-Time-Series.md) | Metrics stores, retention, rollups and alerting | Local note |

**Connects to:** [D2 Kafka](../D-Async/D2-Kafka.md) · [D3 Delivery semantics + idempotency](../D-Async/D3-Delivery-Semantics-Idempotency.md) · [H5 Approximate Counting](H5-Approximate-Counting.md) · [H6 Time-Series](H6-Time-Series.md) · Questions: Ad click aggregator / metrics monitoring (#20), Top-K (#15)