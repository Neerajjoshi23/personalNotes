# H6 · Time-Series: storing metrics that never stop arriving

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Ad click aggregator / metrics monitoring (#20), Chat / realtime reliability (#3), YouTube / video pipeline (#6), every "how do you monitor this?" follow-up

---

## Why this topic matters

Time-series data is a stream of measurements indexed by time: CPU usage, request latency, WebRTC packet loss, ad clicks per minute, queue lag, active meetings. It is append-heavy, queried by time ranges, and often downsampled as it ages.

A normal OLTP database can store metrics at small scale. At product scale, metrics have special needs:

| Characteristic | Consequence |
|---|---|
| High write rate | Write-optimized ingestion and batching |
| Time-range queries | Partition by time; indexes organized around time |
| Repeated labels | Compression and columnar/series layout |
| Long retention | Downsampling and retention policies |
| Huge label combinations | Cardinality control matters as much as storage |
| Alerting | Recent windows must be queryable quickly |

For Adobe Connect, time-series thinking is everywhere: meeting join latency, WebRTC bitrate, packet loss, recording queue depth, pod errors and API latency.

---

## Part 1: time-series data model and storage shape

A metric sample usually looks like:

```text
metric:  http_request_duration_ms
labels:  service=room-service, route=/join, region=ap-south-1, status=200
value:   123
time:    2026-09-30T18:18:55Z
```

A **series** is one metric name plus one exact set of labels. Each series is an ordered list of timestamp/value points.

```
http_requests_total{service="api", region="in", status="200"}
  (10:00, 1234), (10:01, 1401), (10:02, 1510)

http_requests_total{service="api", region="in", status="500"}
  (10:00, 12), (10:01, 14), (10:02, 7)
```

This shape is append-heavy. Most writes are new points for recent time. Most reads are time-range scans for a few series or aggregations over labels.

Write-optimized storage patterns:

- Buffer recent samples in memory.
- Append to write-ahead log for durability.
- Store immutable time blocks/segments.
- Compact or merge blocks later.
- Keep an inverted index from labels to series ids.

This is why time-series databases feel different from OLTP row stores. They optimize the common path: append recent data, scan ranges, aggregate by labels.

**Interview line:** "Metrics are append-heavy and time-range queried, so I would store them as series blocks partitioned by time, not as random OLTP rows updated in place."

---

## Part 2: compression: why time-series can be small ⏭ *Skip for interviews*

Time-series compresses well because adjacent points are similar.

| Pattern | Compression idea |
|---|---|
| Timestamps are regular | Store deltas instead of full timestamps |
| Timestamp deltas are regular | Store delta-of-delta |
| Values change slowly | Store XOR/delta-like encodings |
| Labels repeat | Store label set once per series/block |

The Gorilla paper popularized efficient timestamp/value compression for monitoring-style data. The interview-level idea: if samples arrive every 10 seconds, timestamps are predictable, so you do not store the full timestamp each time. If CPU moves from 41.2 to 41.4, values are also compressible.

```
full timestamps: 1000, 1010, 1020, 1030
first delta:        10,   10,   10
delta-of-delta:       0,    0
```

Compression is one reason TSDBs can keep a lot of recent metrics cheaply. But compression does not save you from cardinality explosions: millions of unique label combinations create millions of series, each with metadata and indexing cost.

---

## Part 3: downsampling, rollups and retention

You rarely need 10-second raw samples forever. Keep high resolution while data is fresh; roll up old data.

| Age | Resolution | Example retention |
|---|---|---|
| 0-7 days | raw 10s/15s samples | debugging incidents |
| 7-30 days | 1-minute rollups | weekly analysis |
| 30-365 days | 1-hour rollups | capacity planning |
| >1 year | daily summaries | business trends |

Rollups store aggregates like min, max, avg, p95-ish summaries, count and sum. Be careful: percentiles are not generally mergeable by averaging p95s. Use histograms/sketches if percentile rollups matter.

Retention policies delete old raw blocks automatically. This is not just cost control; it keeps queries fast and metadata manageable.

For ad click aggregation, this overlaps with [H4 Stream Aggregation](H4-Stream-Aggregation.md): raw events are retained for replay/audit, while query-serving tables store pre-aggregated windows.

---

## Part 4: cardinality problems: labels can destroy you

Cardinality is the number of unique series. It is roughly:

```text
metric names x label value combinations
```

Safe labels:

- service
- region
- route template (`/rooms/:id/join`, not `/rooms/abc123/join`)
- status code
- browser family

Dangerous labels:

- userId
- requestId
- sessionId
- raw URL with ids
- email
- IP address
- meetingId if there are millions and each is short-lived

Bad example:

```text
http_latency_ms{userId="u123", requestId="r456", path="/rooms/abc123/join"}
```

Every request becomes a new series. Storage, index memory and query planning explode.

Better:

```text
http_latency_ms{service="room", route="/rooms/:roomId/join", region="ap-south-1", status="200"}
```

If you need per-user debugging, put it in logs/traces, not metric labels. This is an important interview line because many candidates say "add labels" without controlling cardinality.

---

## Part 5: pull vs push metrics collection

### Pull model

Prometheus popularized pull-based scraping:

```
Prometheus server -> GET /metrics on each target every 15s -> local TSDB
```

Pros:

- Central server controls scrape interval.
- Easy to know if a target is down: scrape fails.
- Targets expose simple HTTP metrics.
- Good for Kubernetes/service discovery.

Cons:

- Harder for short-lived jobs unless using a push gateway pattern.
- Network topology/firewalls may block server-to-target access.
- Very large fleets require sharding/federation/remote write.

### Push model

Apps push metrics to an agent/collector or SaaS endpoint.

```
app -> local agent/OpenTelemetry collector -> metrics backend
```

Pros:

- Works across NAT/firewalls and short-lived jobs.
- Local agent can batch, retry and enrich.
- Common for hosted monitoring platforms.

Cons:

- Harder to distinguish "no data" from "app is dead" unless heartbeat is explicit.
- Bad clients can overload the backend if not controlled.

In practice, systems mix both. Prometheus may scrape local exporters; agents may remote-write to long-term storage.

---

## Part 6: monitoring and alerting system design

A metrics monitoring design:

```
Services / hosts / browsers
  -> instrumentation libraries
  -> metrics endpoint or local collector
  -> ingestion service / Prometheus scrape
  -> time-series storage
  -> query API + dashboards
  -> alert evaluator
  -> notification system (PagerDuty/Slack/email)
```

Core requirements:

| Requirement | Design |
|---|---|
| High ingest | batch samples, compress, partition by time/tenant |
| Fast recent queries | keep recent blocks hot; cache dashboard queries |
| Long retention | downsample and remote storage |
| Alerting | evaluate rules on recent windows |
| Multi-tenant | tenant label + quotas + isolation |
| Reliability | backpressure, local buffering, drop policies for non-critical metrics |

Alerting should be tied to user impact, not just machine symptoms. Use SLIs/SLOs:

- Availability: successful requests / total requests.
- Latency: p95/p99 request duration.
- Error rate: 5xx or failed joins.
- Saturation: queue depth, CPU, memory, disk.

For Adobe Connect, a good alert is "join success rate in APAC below SLO for 5 minutes" rather than "CPU is 80%." CPU is a useful symptom, but users care about joining meetings.

Names to know:

| System | Note |
|---|---|
| Prometheus | Pull-based monitoring and PromQL; common in Kubernetes |
| InfluxDB | Time-series database with its own ecosystem |
| TimescaleDB | Postgres extension with hypertables and continuous aggregates |
| ClickHouse/Druid/Pinot | OLAP stores also used for event/time analytics |

---

## Part 7: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Kubernetes service metrics | Prometheus-style pull | Service discovery and scrape health are natural |
| Mobile/client telemetry | Push to collector | Clients are not scrapeable |
| Long-term infrastructure metrics | TSDB + remote storage + downsampling | Cost and retention control |
| Ad analytics by campaign/device/country | OLAP store or TSDB depending on query style | Dimension-heavy group-bys may fit OLAP better |
| Per-request debugging | Logs/traces, not labels | Avoid high-cardinality metrics |
| Percentile latency over long retention | Histograms/sketches + rollups | Do not average p95 values |
| Small monolith | Postgres/TimescaleDB may be enough | Avoid operating a large metrics stack prematurely |

### Common interview traps

- Putting `userId` or `requestId` in metric labels.
- Keeping raw high-resolution samples forever without retention/rollups.
- Averaging percentiles during downsampling.
- Confusing logs, metrics and traces; metrics are aggregate signals, not event details.
- Alerting on symptoms only, instead of user-facing SLOs.
- Ignoring backpressure/drop policy for telemetry spikes.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What makes time-series data different from normal OLTP rows?</summary>

It is mostly append-only, ordered by time, queried by time ranges, compressed across adjacent samples, and often aggregated/downsampled as it ages. OLTP systems optimize point reads/writes and transactions; TSDBs optimize ingest and range scans.
</details>

<details><summary>2. What is a series?</summary>

A metric name plus an exact set of label key/value pairs. Each unique label combination creates a separate stream of timestamp/value samples.
</details>

<details><summary>3. Explain delta-of-delta compression in words.</summary>

Instead of storing every full timestamp, store the difference between consecutive timestamps. If that difference is stable, store the change in the difference, which is often zero or small. Values can be compressed similarly when adjacent values change slowly.
</details>

<details><summary>4. Why are high-cardinality labels dangerous?</summary>

They create huge numbers of series, which increases memory, index size, storage, query planning cost and operational instability. User IDs, request IDs and raw paths should usually go to logs/traces, not metric labels.
</details>

<details><summary>5. Why downsample old metrics?</summary>

Old raw samples are expensive and rarely needed at full resolution. Rollups keep useful trends while reducing storage and speeding queries. Retention policies also remove data that no longer has debugging or business value.
</details>

<details><summary>6. Pull vs push metrics collection?</summary>

Pull means the monitoring server scrapes targets, making scrape failures visible and centralizing control. Push means apps/agents send metrics to a backend, which works better for clients, short-lived jobs or restricted networks. Many systems mix both.
</details>

<details><summary>7. Why shouldn't you average p95 latency from minute rollups to get hourly p95?</summary>

Percentiles are not generally mergeable by averaging. The true hourly p95 depends on the distribution of all samples. Use histograms or sketches if you need accurate percentile rollups.
</details>

<details><summary>8. Design one useful Adobe Connect alert.</summary>

Alert on user impact, e.g. "meeting join success rate in APAC is below 99% for 5 minutes" or "p95 join latency exceeds the SLO for 10 minutes," then use CPU/queue/network metrics as debugging signals.
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
| [Hello Interview: Time Series Databases](https://www.hellointerview.com/learn/system-design/deep-dives/time-series-databases) | Exact headings: "A Motivating Example"; "The Building Blocks" → "Append-Only Storage" / "LSM Trees" / "Delta Encoding and Compression" / "Time-Based Partitioning" / "Bloom Filters for Read Optimization" / "Downsampling and Rollups" / "Block-Level Metadata"; "Putting It Together" → "The Data Model" / "The Storage Engine" / "Query Execution" / "Worked Example: Multi-Tag Query" / "Where Things Break"; "Summary" | ~45 min |
| **Alex Xu Vol 2, ch 5: Design a Metrics Monitoring and Alerting System** | Whole chapter: data model, collection, storage, query service, alerting and scaling | [PDF p.135](<../../../Books/System Design Interview Vol 2 - Alex Xu.pdf#page=135>) · ~45 min |
| [H4 Stream Aggregation](H4-Stream-Aggregation.md) | Windows, pre-aggregation and stream processing for event metrics | Local note |
| [I4 Observability + SLOs](../I-Reliability/I4-Observability-SLOs.md) | SLIs/SLOs, alerting philosophy and incident debugging | Local note |

**Connects to:** [H4 Stream Aggregation](H4-Stream-Aggregation.md) · [H5 Approximate Counting](H5-Approximate-Counting.md) · [I4 Observability + SLOs](../I-Reliability/I4-Observability-SLOs.md) · Questions: Metrics monitoring / ad click aggregator (#20), Chat (#3), YouTube / video pipeline (#6)