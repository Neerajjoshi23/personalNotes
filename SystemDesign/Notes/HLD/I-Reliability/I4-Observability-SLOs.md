# I4 · Observability + SLOs: knowing whether users are actually okay

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Metrics monitoring (#20), every "how do you know it works?" follow-up, chat (#3), payment (#16), YouTube / video (#6), LeetCode (#19), ChatGPT-style LLM app (#24).

---

## Why this topic matters

A system design answer is incomplete if it only says how requests flow when everything works. Interviewers often ask: **"How will you monitor this? What alerts would you set? How do you debug a production issue?"**

Observability is the answer: collect enough signals to understand the system from the outside. SLOs are the contract: define what "good" means for users.

For Neeraj, this is not abstract. At Adobe, using Splunk to debug by **host, timestamp, request ID, and log message** is observability in practice. The system design version is: design the logs, metrics, traces, dashboards, and alerts before the incident.

| Question | Observability answer |
|---|---|
| Is the service healthy? | SLIs and SLO dashboard |
| Why is this user request slow? | Distributed trace with spans |
| Which host produced this error? | Structured logs with host + trace ID |
| Should we page someone? | Symptom-based alert tied to user impact |
| Can we ship more features? | Error budget remaining |

**Interview line:** "I monitor user-visible SLIs first: availability, latency, and correctness. Then I use logs and traces to debug causes, but I alert on symptoms, not every internal error."

---

## Part 1: logs vs metrics vs traces

The three pillars answer different questions.

| Signal | Shape | Best for | Example |
|---|---|---|---|
| Logs | Discrete events with fields | Debugging exact failures | `payment_failed order=99 provider=stripe trace_id=...` |
| Metrics | Numeric time series | Dashboards, alerts, trends | `http_requests_total`, `p95_latency_ms` |
| Traces | Request path across services | Finding where time/error happened | API span → DB span → payment span |

### Logs

Good logs are structured, not free-text only.

```json
{
  "ts": "2026-09-30T18:20:01.421Z",
  "level": "ERROR",
  "service": "connect-room-api",
  "host": "room-api-17",
  "env": "prod",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "meeting_id": "m_123",
  "user_id": "u_42",
  "event": "recording_start_failed",
  "error_class": "StorageTimeout",
  "latency_ms": 842
}
```

This is why Splunk queries work: you can filter by host, timestamp, meeting ID, trace ID, error class, and environment. Avoid logs that only say `failed`.

Log rules:

- include correlation / trace ID everywhere;
- include stable entity IDs, not raw PII;
- use levels consistently;
- sample noisy success logs;
- never log secrets, tokens, or full payment details;
- make error logs actionable: dependency, operation, status, latency.

### Metrics

Metrics are aggregated numbers over time. They are cheap to store and ideal for alerting.

Common metric types:

- counter: only increases (`requests_total`),
- gauge: current value (`queue_depth`),
- histogram: distribution (`request_duration_seconds`),
- summary: client-side quantiles (less portable than histograms).

Metrics tell you **that** something changed; logs/traces help explain **why**.

### Traces

A trace follows one request across services. Each span records an operation, timing, status, and attributes.

```
trace_id=abc
└─ API /messages POST         120ms
   ├─ auth.check              12ms
   ├─ db.insert_message       35ms
   ├─ kafka.publish           18ms
   └─ push_service.send       45ms
```

For microservices, traces are the fastest way to answer: "Which dependency made this request slow?" For frontend, browser performance entries and Web Vitals can be linked to backend trace IDs.

---

## Part 2: correlation IDs, trace IDs and OpenTelemetry

A **correlation ID** is an ID you put in every log for one logical request. A **trace ID** is the distributed tracing version of that idea, usually following the W3C `traceparent` format.

```
Browser creates/receives traceparent
  ↓
API logs trace_id and creates span
  ↓
Service calls DB/payment with propagated context
  ↓
Every log line can be joined to the same trace
```

OpenTelemetry (OTel) is the standard instrumentation ecosystem for traces, metrics, and logs. It gives you:

- APIs/SDKs to create spans and metrics,
- auto-instrumentation for HTTP, DB clients, queues,
- a collector to receive, process, sample, and export telemetry,
- vendor-neutral export to systems such as Prometheus, Jaeger, Grafana, Datadog, Splunk, Honeycomb, etc.

### Why OTel matters in interviews

It avoids saying "we use tool X" as if the tool solves the design. Say the design:

1. Generate/propagate trace context at the edge.
2. Instrument inbound and outbound calls.
3. Emit structured logs with trace IDs.
4. Export metrics/traces/logs via OpenTelemetry Collector.
5. Store metrics for alerts and traces/logs for debugging.

**Interview line:** "I do not need every vendor detail; I need consistent trace context propagation and structured telemetry at service boundaries. OpenTelemetry is the standard way to instrument that."

---

## Part 3: RED, USE and golden signals

You need a small vocabulary for what to measure.

### RED: request-driven services

RED is great for APIs:

| Signal | Meaning | Example |
|---|---|---|
| Rate | Requests per second | `http_requests_total` by route/status |
| Errors | Failed requests | 5xx rate, failed payment attempts |
| Duration | Latency distribution | p50/p95/p99 request latency |

Use RED for chat APIs, URL shortener redirects, feed reads, search queries, and BFF endpoints.

### USE: resource-driven debugging

USE is great for hosts and infrastructure:

| Signal | Meaning | Example |
|---|---|---|
| Utilization | How busy resource is | CPU %, disk %, DB connection pool usage |
| Saturation | Work queued because resource is full | run queue, queue depth, connection waiters |
| Errors | Resource-level failures | disk errors, network drops, OOM kills |

Use USE when debugging "host-17 is slow" in Splunk/Grafana.

### Golden signals

Google SRE's four golden signals:

- **Latency**: successful and failed request latency separately.
- **Traffic**: demand on the system.
- **Errors**: failed requests or incorrect results.
- **Saturation**: how close the system is to capacity.

For a queue/worker system, add queue depth and **oldest message age**. Queue length alone can be misleading: a queue of 10 old stuck payment jobs matters more than a queue of 10 fresh analytics events.

---

## Part 4: SLI, SLO, SLA and error budgets

These terms are often confused.

| Term | Meaning | Example |
|---|---|---|
| SLI | The measurement | % of `/sendMessage` requests succeeding under 300 ms |
| SLO | Internal target for the SLI | 99.9% over 28 days |
| SLA | External contract with consequences | 99.5% monthly uptime or service credit |
| Error budget | Allowed unreliability | 0.1% failures if SLO is 99.9% |

### Good SLIs are user-centric

For chat:

- message send availability: accepted and durably stored,
- message delivery latency: p99 under X seconds for online recipients,
- WebSocket connection success rate,
- offline delivery delay.

For DrawBoard:

- update accepted by room service,
- update fan-out latency to other participants,
- document load success,
- sync correctness signals such as unresolved update backlog.

For payment:

- payment initiation success,
- ledger write correctness,
- webhook processing delay,
- reconciliation mismatch count.

### Error budget

If the SLO is 99.9%, the system can be "bad" for 0.1% of valid events in the window. Error budgets turn reliability into a product decision:

- budget healthy: ship features faster;
- budget burning fast: freeze risky launches, fix reliability;
- budget exhausted: reliability work has priority.

This is better than arguing "should we deploy?" from vibes.

### Alerting on burn rate ⏭ *Skip for interviews*

A burn-rate alert asks: are we consuming the budget too fast? Example: if a 30-day budget is being burned at 10x for 10 minutes, page; if at 2x for 6 hours, ticket or page depending on severity.

You do not need exact formulas in an HLD interview unless asked. The important idea: alert on user impact and speed of budget burn.

---

## Part 5: alerting on symptoms, dashboards for diagnosis

A common monitoring mistake is paging on every cause: CPU high, disk high, one pod restarting, dependency error. That creates noisy alerts and alert fatigue.

SRE's rule: **page on symptoms, not causes**.

| Symptom alert | Diagnostic dashboard |
|---|---|
| User-facing availability below SLO | Per-route errors, dependency errors, deploy markers |
| p99 latency above SLO | Latency by route, DB latency, pool wait, queue age |
| Payment reconciliation mismatches | Ledger writes, provider webhooks, retry/DLQ counts |
| Message delivery delayed | WebSocket fan-out latency, Kafka lag, push provider errors |

Causes still matter, but they belong in dashboards and lower-priority alerts unless they are guaranteed to become user impact.

### A dashboard layout that works in interviews

For a service dashboard:

1. SLO panel: availability, latency, error-budget burn.
2. Traffic: RPS by route/status/tenant.
3. Latency: p50/p95/p99, split success vs error.
4. Errors: 4xx vs 5xx, top error classes.
5. Dependencies: DB/cache/queue/provider latency + error rate.
6. Saturation: CPU, memory, connection pool, queue depth/age.
7. Deploy markers: correlate spikes with releases.
8. Logs/traces links: click from metric spike to exemplars/traces.

For frontend, add Web Vitals, JS errors, route-level API failures, and browser/device breakdowns.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| API service | RED + golden signals + trace IDs | User-facing request health. |
| Host debugging | USE metrics + structured logs by host | Find resource saturation and bad nodes. |
| Microservice latency | Distributed tracing | Shows which span/dependency is slow. |
| Queue/worker | Queue depth, oldest age, success/failure, DLQ | Queue age reflects user delay. |
| Payment system | Correctness SLIs + reconciliation alerts | Latency is not enough; money must match. |
| Adobe Connect incident | Splunk query by timestamp/host/meeting/trace ID + dashboard | Fast path from symptom to exact logs. |
| DrawBoard realtime | Update fan-out latency, socket disconnects, room server errors | Measures collaboration experience. |

### Common interview traps

- Saying "we use Prometheus/Grafana/Splunk" without defining what to measure.
- Alerting on CPU alone instead of user-visible symptoms.
- Logging unstructured strings with no trace ID or entity IDs.
- Mixing 4xx user errors with 5xx server errors in the same availability SLI.
- Using averages instead of percentiles; p99 is what users complain about.
- Forgetting correctness SLIs for payments, booking, and ledgers.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Logs vs metrics vs traces: one sentence each.</summary>

Logs are structured events for debugging exact cases. Metrics are aggregated numeric time series for dashboards and alerts. Traces follow one request across services to show where time and errors occurred.
</details>

<details><summary>2. What fields should a production error log include?</summary>

Timestamp, level, service, environment, host, trace/correlation ID, span ID if available, stable entity IDs, operation/event name, error class/message, dependency/status, and latency. Avoid secrets and raw sensitive data.
</details>

<details><summary>3. What is OpenTelemetry?</summary>

A vendor-neutral standard and tooling ecosystem for instrumenting, collecting, processing, and exporting traces, metrics, and logs. It helps propagate trace context and avoid vendor-specific instrumentation.
</details>

<details><summary>4. RED vs USE?</summary>

RED measures request services: rate, errors, duration. USE measures resources: utilization, saturation, errors. Use RED for APIs and USE to debug hosts/pools/disks/CPU.
</details>

<details><summary>5. SLI vs SLO vs SLA?</summary>

SLI is the measured indicator, SLO is the internal target for that indicator, and SLA is an external contract with consequences. Example: request success under 300 ms is SLI; 99.9% is SLO; customer credit terms are SLA.
</details>

<details><summary>6. What is an error budget?</summary>

The amount of unreliability allowed by the SLO. A 99.9% SLO gives a 0.1% error budget. If it burns too quickly, teams slow launches and prioritize reliability.
</details>

<details><summary>7. Why alert on symptoms?</summary>

Symptoms reflect user impact. Causes like CPU or pod restarts are diagnostic and can be noisy. Page when users are affected or the error budget is burning fast; use dashboards to find causes.
</details>

<details><summary>8. How would you debug a failed Adobe Connect recording start?</summary>

Start from the symptom dashboard, find the time window, trace ID or meeting ID, then query structured logs in Splunk by timestamp, host, service, meeting ID, and error class. Use the trace to see whether storage, DB, or recording worker caused the delay/failure.
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
| [OpenTelemetry: Observability primer](https://opentelemetry.io/docs/concepts/observability-primer/) | Exact headings: "What is Observability?", "Reliability and metrics", "Understanding distributed tracing"; h3 "Logs", "Spans", "Distributed traces" | ~20 min |
| [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/) | Exact headings: "Service Level Terminology", "Indicators", "Objectives", "Agreements", "What Do You and Your Users Care About?", "Collecting Indicators", "Aggregation", "Standardize Indicators", "Defining Objectives", "Choosing Targets", "Control Measures", "SLOs Set Expectations" | ~45 min |
| [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) | Exact headings: "Definitions", "Bigtable SRE: A Tale of Over-Alerting", "Gmail: Predictable, Scriptable Responses from Humans", "The Long Run" | ~30 min |

**Connects to:** [I2 Timeouts, retries and backoff](I2-Timeouts-Retries-Backoff.md) · [I3 Circuit breaker + bulkhead](I3-Circuit-Breaker-Bulkhead.md) · [H6 Time-series](../H-Geo-Search-Counting/H6-Time-Series.md) · [D2 Kafka](../D-Async/D2-Kafka.md) · Questions: Metrics monitoring (#20), Chat (#3), Payment (#16), LeetCode (#19)