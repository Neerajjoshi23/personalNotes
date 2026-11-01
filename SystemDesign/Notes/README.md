# System Design Notes: Index

One note per subtopic, written as a blog: the explanation, then a cheat sheet, a self-test, space for your own notes, and sources with exact pages or sections.
The roadmap and tracker are in [../system-design-roadmap.md](../system-design-roadmap.md) (interactive version: `../system-design-roadmap.html`).
The books are in `../Books/`. PDF page links (`#page=N`) open at the right page in Chrome and Edge; VS Code ignores the page number.

**⏭ Skip for interviews** on a heading = optional depth; read only if curious.

**Order:** Phase 1 LLD → Phase 2 HLD modules A→I → Phase 3 mocks.

**How to use a note:**
1. Read the note.
2. Open the sources it lists, at the listed pages or sections.
3. Answer the self-test without opening the `<details>` answers.
4. Write your own words under **My notes**.
5. Tick the item in the tracker.

---

## Phase 1: LLD (C++ now, Java later)

| # | Note | Covers |
|---|------|--------|
| L0 | [C++ OOP for LLD](LLD/L0-Cpp-OOP-for-LLD.md) | Abstract classes and interfaces, virtual destructors, `override`/`final`, the rules of 0/3/5, smart pointers, object slicing, relationships between classes |
| L1 | [Delivery](LLD/L1-Delivery.md) | How to run a 45–60 min LLD round |
| L2 | [OOP + SOLID](LLD/L2-OOP-SOLID.md) | The four pillars, SOLID, composition vs inheritance |
| L3 | [Patterns: overview](LLD/L3-Patterns.md) | Which pattern fits which question |
| L3a | [Creational patterns](LLD/L3a-Creational-Patterns.md) | Factory, Singleton, Builder, Prototype |
| L3b | [Behavioral patterns](LLD/L3b-Behavioral-Patterns.md) | Strategy, State, Observer, Command, Chain of Responsibility, Template Method |
| L3c | [Structural patterns](LLD/L3c-Structural-Patterns.md) | Decorator, Adapter, Composite, Facade, Proxy |
| L4 | [Concurrency](LLD/L4-Concurrency.md) | mutex, condition_variable, atomic, deadlocks, blocking queue, thread-safe booking, plus the Java equivalents |
| L5 | [Practice playbook](LLD/L5-Practice-Playbook.md) | Tier-1 and Tier-2 LLD questions: entities, patterns and follow-ups for each |

> Frontend system design notes (FE1–FE13) moved to `ReactPersonal\Info\frontend-system-design\`.

## Phase 2: HLD

### A: Fundamentals
| # | Note |
|---|------|
| A1 | [Delivery framework](HLD/A-Fundamentals/A1-Delivery-Framework.md) |
| A2 | [Request flow](HLD/A-Fundamentals/A2-Request-Flow.md) |
| A3 | [HTTP versions and networking](HLD/A-Fundamentals/A3-HTTP-Versions-Networking.md) |
| A4 | [DNS, CDN, load balancer, proxy](HLD/A-Fundamentals/A4-DNS-CDN-LoadBalancer-Proxy.md) |
| A5 | [Latency and estimation](HLD/A-Fundamentals/A5-Latency-Estimation.md) |
| A6 | [API design](HLD/A-Fundamentals/A6-API-Design.md) |
| A7 | [Scaling basics](HLD/A-Fundamentals/A7-Scaling-Basics.md) |

### B: Data
| # | Note |
|---|------|
| B1 | [Data models and choosing a DB](HLD/B-Data/B1-Data-Models-DB-Choice.md) |
| B2 | [Indexes](HLD/B-Data/B2-Indexes.md) |
| B3 | [Transactions and isolation](HLD/B-Data/B3-Transactions-Isolation.md) |
| B4 | [Replication](HLD/B-Data/B4-Replication.md) |
| B5 | [Sharding](HLD/B-Data/B5-Sharding.md) |
| B6 | [Consistent hashing](HLD/B-Data/B6-Consistent-Hashing.md) |
| B7 | [CAP and consistency models](HLD/B-Data/B7-CAP-Consistency.md) |
| B8 | [Encoding and schema evolution](HLD/B-Data/B8-Encoding-Schema-Evolution.md) |
| B9 | [Real databases](HLD/B-Data/B9-Real-Databases.md) |

### C: Caching
| # | Note |
|---|------|
| C1 | [Cache patterns](HLD/C-Caching/C1-Cache-Patterns.md) |
| C2 | [Redis](HLD/C-Caching/C2-Redis.md) |
| C3 | [Eviction and failure modes](HLD/C-Caching/C3-Eviction-Failure-Modes.md) |
| C4 | [HTTP and CDN caching](HLD/C-Caching/C4-HTTP-CDN-Caching.md) |

### D: Async
| # | Note |
|---|------|
| D1 | [Queues](HLD/D-Async/D1-Queues.md) |
| D2 | [Kafka](HLD/D-Async/D2-Kafka.md) |
| D3 | [Delivery semantics and idempotency](HLD/D-Async/D3-Delivery-Semantics-Idempotency.md) |
| D4 | [Outbox and CDC](HLD/D-Async/D4-Outbox-CDC.md) |
| D5 | [Async request-reply](HLD/D-Async/D5-Async-Request-Reply.md) |

### E: Real-time
| # | Note |
|---|------|
| E1 | [Polling, SSE, WebSocket](HLD/E-Realtime/E1-Polling-SSE-WebSocket.md) |
| E2 | [Scaling WebSockets](HLD/E-Realtime/E2-Scaling-WebSockets.md) |
| E3 | [Collaborative sync (OT/CRDT, DrawBoard)](HLD/E-Realtime/E3-Collaborative-Sync.md) |

### F: Blobs and fan-out
| # | Note |
|---|------|
| F1 | [Object storage and presigned URLs](HLD/F-Blobs-Fanout/F1-Object-Storage-Presigned-URLs.md) |
| F2 | [Video pipeline](HLD/F-Blobs-Fanout/F2-Video-Pipeline.md) |
| F3 | [Fan-out](HLD/F-Blobs-Fanout/F3-Fan-out.md) |
| F4 | [File sync](HLD/F-Blobs-Fanout/F4-File-Sync.md) |

### G: Contention
| # | Note |
|---|------|
| G1 | [Locking](HLD/G-Contention/G1-Locking.md) |
| G2 | [Distributed locks and reservations](HLD/G-Contention/G2-Distributed-Locks-Reservations.md) |
| G3 | [Virtual waiting room](HLD/G-Contention/G3-Virtual-Waiting-Room.md) |
| G4 | [Sagas](HLD/G-Contention/G4-Sagas.md) |
| G5 | [Ledger and reconciliation](HLD/G-Contention/G5-Ledger-Reconciliation.md) |

### H: Geo, search, counting
| # | Note |
|---|------|
| H1 | [Geospatial](HLD/H-Geo-Search-Counting/H1-Geospatial.md) |
| H2 | [Search](HLD/H-Geo-Search-Counting/H2-Search.md) |
| H3 | [Autocomplete](HLD/H-Geo-Search-Counting/H3-Autocomplete.md) |
| H4 | [Stream aggregation](HLD/H-Geo-Search-Counting/H4-Stream-Aggregation.md) |
| H5 | [Approximate counting](HLD/H-Geo-Search-Counting/H5-Approximate-Counting.md) |
| H6 | [Time series](HLD/H-Geo-Search-Counting/H6-Time-Series.md) |

### I: Reliability
| # | Note |
|---|------|
| I1 | [Leader election and coordination](HLD/I-Reliability/I1-Leader-Election.md) |
| I2 | [Timeouts, retries, backoff](HLD/I-Reliability/I2-Timeouts-Retries-Backoff.md) |
| I3 | [Circuit breaker and bulkhead](HLD/I-Reliability/I3-Circuit-Breaker-Bulkhead.md) |
| I4 | [Observability and SLOs](HLD/I-Reliability/I4-Observability-SLOs.md) |
| I5 | [Microservices boundaries](HLD/I-Reliability/I5-Microservices-Boundaries.md) |
| I6 | [Multi-region and DR](HLD/I-Reliability/I6-Multi-Region-DR.md) |

---

## Editing these notes
- They are yours: rewrite freely while learning. Keep the **My notes** section for your own wording; it is the part that sticks.
- If a source moves (URL 404), replace it in the Sources table.
- `Questions/` is empty for now. Put your own walkthroughs of the §1 questions there (for example `Q01-URL-Shortener.md`) once the related modules are done.
