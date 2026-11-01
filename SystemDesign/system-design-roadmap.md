# System Design Roadmap (question-driven)

> **Start:** Oct 2026, at 30 min/day, and it runs in parallel with everything else (LLM, FastAPI, SQL).
> **Order (months are rough, not deadlines):** LLD (~Oct–Nov 2026, C++) → HLD (Feb – Sep 2027) → mocks + revision. Every block ends with questions to solve, and mocks start monthly from Module D of HLD.
> **Goal:** be interview-ready for HLD and LLD by **~Sep 2027** (a rough target, not a deadline).
> **Notes:** one blog-style note per subtopic in [`Notes/`](Notes/README.md). **Books:** `Books/`.
> **Old roadmap:** backed up in the Copilot session folder as `system-design-roadmap.backup.md`.

---

## 0. How this roadmap was built

1. **Collected the questions companies actually ask**, from 6 public question lists:

   | Code | Source | What it lists |
   |---|---|---|
   | **H** | Hello Interview problem breakdowns | ~32 HLD + ~9 LLD questions |
   | **X1 / X2** | Alex Xu, *System Design Interview* Vol 1 / Vol 2 | 12 + 13 chapters |
   | **P** | System Design Primer: solved questions plus the "additional questions" list | ~30 |
   | **G** | GeeksforGeeks, "Most commonly asked system design problems" | ~29 |
   | **D** | Design Gurus, *Grokking the System Design Interview* | ~30 |
   | **L** | Awesome Low-Level Design (ashishps1) + Hello Interview LLD | ~35 LLD |

2. **Counted how many sources ask each question.** Asked in 4 or more sources → Tier 1. Asked in 2–3 → Tier 2. Everything else → Tier 3 (usually a variant of a Tier 1 question).
3. **Listed the concepts each question needs** and counted how often each concept shows up. That count sets the topic order and how much time each topic gets.
4. **Added the fundamentals.** Interviewers rarely ask about these directly, but every answer depends on them: networking, estimation, data basics, consistency, reliability, security and observability.

**Key finding:** about 110 questions reduce to **~15 reusable patterns**. Learn the patterns, not 110 answers.

### Daily rule (30 min)
- **20 min:** read one exact section, as listed in the topic tables below.
- **10 min:** close the tab and write from memory: 3 bullets, plus one "where would this appear in a question?" line.
- **Question days:** spend 15 min drawing your own design first, *then* read the breakdown and write down what you missed. Score yourself with the rubric in **§8**, and redo anything scored below 12/16 within 2 weeks.
- **Every Sunday:** repeat one old question from memory (spaced repetition), or do 1 LLD Tier 2 question.

---

## ✅ Progress tracker (my order: LLD → HLD)

> To tick an item, change `- [ ]` to `- [x]`. In VS Code preview, and on GitHub, it shows as a checked box.
> The IDs (L1, B4…) point to the rows in §3–§4; that's where the resources are.

### Phase 1: LLD (~Oct–Nov 2026, in C++)
**Module L-A: Foundations**
- [x] L0 C++ OOP for LLD (interfaces, virtual destructor, smart pointers, slicing)
- [ ] L1 LLD interview delivery
- [ ] L2 OOP + SOLID
- [ ] Q: Tic-tac-toe / Connect Four / Snake & Ladder

**Module L-B: Patterns**
- [ ] L3 Patterns: Strategy · State · Observer · Factory · Singleton · Builder
- [ ] Q: Parking lot
- [ ] Q: Vending machine
- [ ] Q: Elevator
- [ ] L3 Patterns: Command · Decorator · Chain of Responsibility · Adapter · Composite
- [ ] Q: Logging framework
- [ ] Q: Pub-sub / notification
- [ ] Q: Splitwise

**Module L-C: Concurrency + final practice**
- [ ] L4 Concurrency basics (C++: `std::thread`, `mutex`)
- [ ] Q: Thread-safe blocking queue (producer–consumer)
- [ ] Q: Thread-safe TTL cache
- [ ] Q: LRU cache
- [ ] Q: Rate limiter (class level)
- [ ] Q: Movie ticket booking (BookMyShow)
- [ ] L5 Practice playbook: redo 2 questions from memory, self-graded with §8
- [ ] Mock: 1 LLD mock (45 min, with a peer or recorded)

### Phase 2: HLD (~Feb – Sep 2027)
**Module A: Fundamentals**
- [ ] A1 Delivery framework
- [ ] A2 Request flow
- [ ] A3 HTTP versions
- [ ] A4 DNS/CDN/LB
- [ ] A5 Estimation
- [ ] Numbers sheet (§7) memorised
- [ ] A6 API design
- [ ] A7 Scaling basics
- [ ] Q#1 URL shortener

**Module B: Data** (DDIA chapter numbers are 1st ed., the copy in the Books folder)
- [ ] B1 Data models
- [ ] B2 Indexes
- [ ] B3 Transactions
- [ ] B4 Replication
- [ ] B5 Sharding
- [ ] B6 Consistent hashing
- [ ] B7 CAP
- [ ] B8 Encoding
- [ ] B9 Real databases
- [ ] Q#10 KV store
- [ ] Q#22 Unique ID

**Module C: Caching**
- [ ] C1 Cache patterns
- [ ] C2 Redis
- [ ] C3 Eviction + failures
- [ ] C4 HTTP/CDN caching
- [ ] Q#2 Rate limiter

**Module D: Async**
- [ ] D1 Queues
- [ ] D2 Kafka
- [ ] D3 Delivery semantics
- [ ] D4 Outbox + CDC
- [ ] D5 Async request-reply
- [ ] Q#13 Notification
- [ ] Q#7 Web crawler
- [ ] Q#23 Message queue (optional)
- [ ] Mock: HLD mock 1 (one after every module from here on, using a Tier 1 question you've already done)

**Module E: Real-time**
- [ ] E1 Polling/SSE/WebSocket
- [ ] E2 Scaling WebSockets
- [ ] E3 Collaborative sync
- [ ] Q#3 Chat
- [ ] Q#12 Google Docs (DrawBoard)
- [ ] Cold Q (no reading first): FB live comments or online chess
- [ ] Mock: HLD mock 2

**Module F: Blobs + fan-out**
- [ ] F1 Object storage
- [ ] F2 Video pipeline
- [ ] F3 Fan-out
- [ ] F4 File sync
- [ ] Q#5 Dropbox
- [ ] Q#6 YouTube
- [ ] Q#4 News feed
- [ ] Q#11 Instagram
- [ ] Q#25 Zoom / meeting recording (my Adobe Connect edge)
- [ ] Cold Q (no reading first): Spotify or Strava
- [ ] Mock: HLD mock 3

**Module G: Contention**
- [ ] G1 Locking
- [ ] G2 Distributed locks
- [ ] G3 Virtual waiting room
- [ ] G4 Sagas
- [ ] G5 Ledger
- [ ] Q#8 Ticket booking
- [ ] Q#16 Payment
- [ ] Q#18 Flash sale
- [ ] Cold Q (no reading first): Airbnb or online auction
- [ ] Mock: HLD mock 4

**Module H: Geo, search, counting**
- [ ] H1 Geospatial
- [ ] H2 Search
- [ ] H3 Autocomplete
- [ ] H4 Stream aggregation
- [ ] H5 Approximate counting
- [ ] H6 Time-series
- [ ] Q#9 Uber
- [ ] Q#15 Top-K
- [ ] Q#14 Autocomplete
- [ ] Q#20 Ad click
- [ ] Q#17 Post search
- [ ] Cold Q (no reading first): Food delivery (Swiggy / Zomato) or Tinder
- [ ] Mock: HLD mock 5

**Module I: Reliability + coordination**
- [ ] I1 Leader election
- [ ] I2 Retries/backoff
- [ ] I3 Circuit breaker
- [ ] I4 Observability
- [ ] I5 Microservices
- [ ] I6 Multi-region/DR
- [ ] Q#21 Job scheduler
- [ ] Q#19 LeetCode
- [ ] Q#24 ChatGPT
- [ ] Q#26 RAG / document Q&A with vector search (my LLM edge)
- [ ] Cold Q (no reading first): Stock exchange / Robinhood
- [ ] Mock: HLD mock 6

### Phase 3: Mocks + revision (~late 2027)
- [ ] Redo all 12 Tier 1 HLD questions from memory (45-min timer)
- [ ] Redo #25 Zoom / recording and #26 RAG from memory (your two "edge" answers)
- [ ] Redo 4 LLD questions from memory in C++ (optional: one in Python or TS)
- [ ] 5 mock interviews (HLD)
- [ ] 3 mock interviews (LLD)


---

## 1. Market question bank, ranked by frequency

### 1.1 Backend / HLD questions

**Tier 1 — asked everywhere (4 or more sources). Must do.**

| # | Question | Sources | Main patterns it tests |
|---|---|---|---|
| 1 | URL shortener (Bitly, TinyURL, Pastebin) | H X1 P G D | unique IDs, read-heavy caching, DB choice, redirect 301/302 |
| 2 | Rate limiter (distributed) | H X1 P G D | token bucket / sliding window, Redis, API gateway |
| 3 | Chat (WhatsApp, Messenger, Slack, Discord) | H X1 P G D | WebSocket, presence, message ordering, fan-out, offline delivery |
| 4 | News feed / Twitter timeline | H X1 P G D | fan-out on write vs read, cache, pagination, celebrity problem |
| 5 | Dropbox / Google Drive | H X1 P G D | large blobs, presigned URLs, chunking, sync, metadata DB |
| 6 | YouTube / Netflix / TikTok | H X1 G D | upload pipeline, transcoding queue, HLS/adaptive bitrate, CDN |
| 7 | Web crawler | H X1 P D | queues, politeness, dedup (Bloom filter), distributed workers |
| 8 | Ticket / hotel booking (Ticketmaster, BookMyShow) | H X2 G D | contention, locks, transactions, reservation TTL, virtual queue |
| 9 | Location search (Uber, Yelp, proximity, nearby friends) | H X2 G D | geohash / quadtree, frequent location writes, matching |
| 10 | Distributed key-value store / distributed cache | H X1 P D | consistent hashing, replication, quorum, eviction |
| 11 | Instagram / photo sharing | H P G D | = feed + blob storage + CDN |
| 12 | Google Docs / collaborative editor | H P D | OT/CRDT, WebSocket, versioning, presence (**= your DrawBoard**) |

**Tier 2 — asked often (2–3 sources). Do after Tier 1.**

| # | Question | Sources | Main patterns it tests |
|---|---|---|---|
| 13 | Notification system | H X1 G | queues, fan-out, retries, idempotency, user preferences |
| 14 | Search autocomplete / typeahead | X1 G D | trie / prefix index, top-k per prefix, caching |
| 15 | Top-K / trending / leaderboard | H X2 P | stream aggregation, Redis sorted sets, count-min sketch |
| 16 | Payment system / digital wallet / UPI | H X2 G | idempotency, ledger, reconciliation, sagas, exactly-once |
| 17 | Post / tweet search | H P D | inverted index, Elasticsearch, indexing via CDC |
| 18 | E-commerce / flash sale / Gopuff | H G D | inventory contention, cache, queue-based load leveling |
| 19 | Online judge (LeetCode) / code editor | H G D | job queue, sandbox workers, leaderboard |
| 20 | Ad click aggregator / metrics monitoring | H X2 | stream processing, windows, time-series DB, OLAP |
| 21 | Distributed job scheduler | H G | leader election, at-least-once, retries, cron in DB |
| 22 | Unique ID generator | X1 P | Snowflake IDs, clock issues |
| 23 | Distributed message queue (Kafka) | X2 G | log, partitions, consumer groups, delivery semantics |
| 24 | ChatGPT-style LLM app | H D | streaming (SSE), long-running jobs, GPU queue, rate limits (**your LLM edge**) |

**Your edge — treat as Tier 1 even though few lists ask them.** They come from your own work, so you can go deeper than any breakdown, and interviewers often ask "design something you've built".

| # | Question | Why it's yours | Main patterns it tests |
|---|---|---|---|
| 25 | Zoom / video conferencing + meeting recording | You work on WebRTC recording at Adobe Connect | signaling over WebSocket, mesh vs SFU vs MCU, UDP media + TURN fallback, simulcast / adaptive quality, recording bot → object storage → transcode pipeline → HLS playback, presence, scaling SFUs by region |
| 26 | RAG / document Q&A with vector search | Your LLM course + LangGraph work | ingestion pipeline (queue → chunk → embed), vector index (ANN / HNSW, pgvector vs a vector DB), hybrid search (BM25 + vectors), per-tenant access control on retrieval, LLM gateway (rate limits, fallbacks, caching), streaming answers (SSE), evaluation + observability, cost per query |

Resources for #25:
- Your own Adobe Connect knowledge.
- Notes [E1](Notes/HLD/E-Realtime/E1-Polling-SSE-WebSocket.md), [E2](Notes/HLD/E-Realtime/E2-Scaling-WebSockets.md), [F1](Notes/HLD/F-Blobs-Fanout/F1-Object-Storage-Presigned-URLs.md), [F2](Notes/HLD/F-Blobs-Fanout/F2-Video-Pipeline.md).

Resources for #26:
- Your LLM course (RAG week).
- Notes [H2 Search](Notes/HLD/H-Geo-Search-Counting/H2-Search.md), [D1 Queues](Notes/HLD/D-Async/D1-Queues.md), [D5 Async request-reply](Notes/HLD/D-Async/D5-Async-Request-Reply.md), [E1](Notes/HLD/E-Realtime/E1-Polling-SSE-WebSocket.md) (SSE streaming).
- Eugene Yan's "Patterns for Building LLM-based Systems", section "Retrieval-Augmented Generation": https://eugeneyan.com/writing/llm-patterns/

**Tier 3 — variants or niche. Only if time or your target company asks for them.**

| Question | Really just… |
|---|---|
| FB live comments, online auction, online chess | Chat + realtime (#3). Live comments is free on Hello Interview (H), so it's a good cheap extra. |
| Airbnb, airline, restaurant booking | Booking (#8) + location search (#9) |
| Spotify, Reddit, Tinder, Strava | Feed (#4) + blobs (#6) + location (#9) |
| Google News, camelcamelcamel | Crawler (#7) + notification (#13) |
| Food delivery (Swiggy, Zomato, DoorDash) | Uber (#9) + flash sale (#18) + notification (#13). Very common in India; it's the cold question after Module H. |
| Robinhood, stock exchange | Payment (#16) + realtime. Niche. |
| Google Maps routing, S3 internals, Gmail, recommendation system | Niche. Skip unless you're targeting that company. (Zoom moved up to #25: it's your work edge.) |

### 1.2 LLD / OOD questions (L)

| Tier | Questions |
|---|---|
| 1 | Parking lot, Elevator, Movie ticket booking (BookMyShow), Vending machine, LRU cache, Rate limiter (class level), Splitwise, Tic-tac-toe / Connect Four / Snake & Ladder, Logging framework, Pub-sub / notification |
| 2 | Library management, ATM, Hotel / car rental, Inventory, In-memory file system, Amazon locker, Stack Overflow, Task manager (Jira-lite), Chess, Coupon / discount engine, Meeting-room / calendar scheduler |
| Concurrency | Thread-safe blocking queue, TTL cache, concurrent hashmap basics, producer–consumer, thread-safe singleton, booking race condition |

---

## 2. Concept frequency: what the questions actually test

The count is how many **Tier 1 + Tier 2** backend questions (out of 24) need the concept. It decides where the time goes.

| Concept | Needed by (#) | Priority |
|---|---|---|
| Caching (Redis, cache-aside, CDN, eviction) | ~22 | ★★★ |
| Data modeling + DB choice (SQL vs NoSQL) + indexes | 24 (all) | ★★★ |
| Queues / async / event streams (Kafka, SQS) | ~14 | ★★★ |
| Sharding + consistent hashing + replication | ~14 | ★★★ |
| Real-time delivery (WebSocket, SSE, long-poll, pub/sub) | ~9 | ★★★ |
| Contention: transactions, locks, isolation, reservations | ~7 | ★★★ |
| Idempotency, retries, delivery semantics | ~8 | ★★★ |
| Large blobs (object storage, presigned URLs, multipart, CDN) | ~6 | ★★ |
| Geospatial indexing (geohash, quadtree, PostGIS / Redis GEO) | ~6 | ★★ |
| Stream aggregation / top-K / approximate counting | ~5 | ★★ |
| Search (inverted index, trie, Elasticsearch) | ~5 | ★★ |
| Fan-out (push vs pull, hybrid) | ~5 | ★★ |
| Long-running workflows (sagas, orchestration, Temporal) | ~5 | ★★ |
| Unique ID generation | ~4 | ★ |
| Coordination (leader election, distributed locks, ZooKeeper) | ~4 | ★ |
| Sync / conflict resolution (OT / CRDT) | ~3 | ★ (you already know this from DrawBoard) |
| Video pipeline (transcoding, HLS / adaptive bitrate) | ~2 | ★ |
| Ledger / reconciliation | ~2 | ★ |

**Fundamentals: rarely asked directly, but used in every answer**

| Fundamental | Why it matters |
|---|---|
| How a request travels (DNS → TCP → TLS → HTTP → LB → app → DB) | The skeleton of every diagram you'll draw |
| Latency numbers + back-of-envelope estimation | Justifies "we need cache/shards" with numbers |
| API design (REST / gRPC / GraphQL, pagination, versioning, idempotency keys) | Step 2 of every interview |
| Load balancing (L4 vs L7), reverse proxy, API gateway | In every diagram |
| CAP / PACELC, consistency models | Every "SQL or NoSQL?" and "what if a node dies?" answer |
| Transactions + isolation levels | Booking, payments, inventory |
| Encoding / serialization and schema evolution (JSON / Protobuf / Avro) | Kafka, gRPC, APIs |
| Reliability: timeouts, retries + backoff, circuit breaker, bulkhead, load shedding | Every "what can fail?" deep dive |
| Observability: logs, metrics, traces, SLO / SLA / SLI | The "how do you know it works?" question |
| Security basics: authN/authZ, TLS, secrets, OWASP | Already covered in `ReactPersonal\Info\security-learning-path.md`; just link to it |
| OS / concurrency basics: process vs thread, locks, race conditions | LLD concurrency round |

---

## 3. LLD / OOD track (Phase 1)

Format per subtopic (same in §3–§4): **what to understand** → **exact resource section** → **questions it prepares you for**.
Abbreviations used in §3–§4:
- `HI` = https://www.hellointerview.com/learn/system-design
- `HIL` = https://www.hellointerview.com/learn/low-level-design
- `SDP` = https://github.com/donnemartin/system-design-primer
- `DDIA` = *Designing Data-Intensive Applications*, **1st ed.** (the copy in `Books/`). All chapter numbers in this file use the 1st ed. `(optional)` in a Resource cell means skip it unless curious (see §5).
- Locked Hello Interview pages are marked 🔒 and have a free alternative.

Language: **C++17** (your strongest language; the L0 note is done). LLD rounds usually let you pick the language. TypeScript is accepted in frontend-role LLD rounds, but C++ shows more: ownership, interfaces, concurrency.

| # | Subtopic | Understand | Resource (exact section) | Prepares for |
|---|---|---|---|---|
| L0 | C++ OOP for LLD | Abstract classes as interfaces, virtual destructor, `override`/`final`, rule of 0/3/5, smart pointers, object slicing, composition vs aggregation vs association | [L0 note](Notes/LLD/L0-Cpp-OOP-for-LLD.md) (links to exact learncpp / cppreference / C++ Core Guidelines sections) | Writing any LLD answer in C++ |
| L1 | LLD interview delivery | Requirements → entities → class diagram → code → extend | `HIL/in-a-hurry/delivery` | All LLD |
| L2 | OOP + SOLID | Encapsulation, composition over inheritance, SOLID with examples | `HIL/in-a-hurry/oop-concepts` + `HIL/in-a-hurry/design-principles` | All LLD |
| L3 | Must-know patterns (by frequency) | **Strategy, State, Observer, Factory, Singleton, Builder**, then Command, Decorator, Chain of Responsibility, Adapter, Composite | `HIL/in-a-hurry/patterns`; Refactoring Guru page per pattern (read "Problem → Solution → Structure → code example", C++ tab): https://refactoring.guru/design-patterns/strategy, state, observer, factory-method, singleton, builder, command, decorator, chain-of-responsibility, adapter, composite | Parking lot (Strategy), Elevator + Vending machine (State), Notification (Observer), Logger (Chain of Responsibility + Singleton), File system (Composite), Undo (Command) |
| L4 | Concurrency | **C++:** `std::thread`, `mutex` + `lock_guard`/`unique_lock`, `condition_variable`, `atomic`, deadlock + lock ordering | [L4 note](Notes/LLD/L4-Concurrency.md) (C++ code); `HIL/concurrency/intro` | Booking race condition, blocking queue, TTL cache |
| L5 | Practice problems | Tier 1 list in §1.4 | [L5 playbook](Notes/LLD/L5-Practice-Playbook.md); `HIL/problem-breakdowns/elevator`, `connect-four`, `amazon-locker` (free); https://github.com/ashishps1/awesome-low-level-design (problems + solutions) | — |

✅ **Questions after each block** (same as the tracker):
- **After L0–L2 (Module L-A):** Tic-tac-toe / Connect Four / Snake & Ladder. No patterns needed; practise clean entities and responsibilities.
- **After the first pattern batch (L-B):**
  - Parking lot (Strategy for pricing and spot choice)
  - Vending machine (State)
  - Elevator (State + Strategy for scheduling)
- **After the second pattern batch (L-B):**
  - Logging framework (Chain of Responsibility + Singleton)
  - Pub-sub / notification (Observer)
  - Splitwise (Strategy for split types)
- **After L4 (Module L-C):**
  - Thread-safe blocking queue
  - TTL cache
  - LRU cache
  - Rate limiter
  - BookMyShow (the seat-hold race condition)
  - Then L5: redo 2 questions from memory, self-grade with §8, and do 1 LLD mock.
- **Tier 2** (Library, ATM, Hotel, Inventory, File system, Amazon locker, Stack Overflow, Task manager, Chess): on Sundays, only if time allows.

---

## 4. HLD topics in learning order (Phase 2)

### Module A: Fundamentals and the interview framework

| # | Subtopic | Understand | Resource (exact section) | Prepares for |
|---|---|---|---|---|
| A1 | Interview delivery framework | Requirements → core entities → API → high-level design → deep dives; functional vs non-functional requirements | `HI/in-a-hurry/introduction` + `HI/in-a-hurry/delivery` (full) | Every question |
| A2 | How a request travels | DNS resolution, TCP handshake, TLS, HTTP request/response, keep-alive | https://github.com/alex/what-happens-when (sections from "DNS lookup" to "HTTP protocol"); MDN HTTP Overview: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview | Every question; frontend performance questions |
| A3 | HTTP/1.1 vs 2 vs 3, networking layers | Multiplexing, head-of-line blocking, QUIC; L4 vs L7 | MDN "Evolution of HTTP": https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Evolution_of_HTTP; `HI/core-concepts/networking-essentials` (full) | Chat, video, API gateway |
| A4 | DNS, CDN, load balancer, reverse proxy | Round-robin vs least-connections, health checks, push vs pull CDN | SDP `#domain-name-system`, `#content-delivery-network`, `#load-balancer`, `#reverse-proxy-web-server` | URL shortener, YouTube, Instagram |
| A5 | Latency numbers + estimation | Memory vs SSD vs network; QPS, storage and bandwidth maths | SDP `#appendix` ("Powers of two table" and "Latency numbers every programmer should know"); Alex Xu Vol 1 ch 2 | Every question (the scale step) |
| A6 | API design | REST resources, pagination (cursor vs offset), versioning, gRPC vs REST vs GraphQL | `HI/core-concepts/api-design` (full); AIP-158 pagination: https://google.aip.dev/158; AIP-155 idempotency: https://google.aip.dev/155 | Every question (the API step) |
| A7 | Scaling basics (the big picture) | Vertical vs horizontal, stateless app tier, read replicas, cache, CDN, queues | Alex Xu Vol 1 ch 1 "Scale from zero to millions"; SDP solution "Design a system that scales to millions of users on AWS" | Every question |

✅ **End of Module A:** attempt **URL shortener (#1)** with just this knowledge, then read `HI/problem-breakdowns/bitly`.

### Module B: Data, the biggest block because every question needs it

| # | Subtopic | Understand | Resource | Prepares for |
|---|---|---|---|---|
| B1 | Data models and DB choice | Relational vs document vs wide-column vs KV vs graph; when to pick which | `HI/core-concepts/data-modeling` (full); DDIA ch 2 (skim the graph section) | All |
| B2 | Indexes | B-tree vs LSM, composite index, covering index, geo and full-text index types | `HI/core-concepts/db-indexing` (full); *(optional)* https://use-the-index-luke.com/ ("Anatomy of an index" + "The Where clause"); *(optional)* DDIA ch 3 "Storage and Retrieval" | All; search; location search |
| B3 | Transactions + isolation | ACID, read committed vs repeatable read vs serializable, lost update, write skew, `SELECT … FOR UPDATE` | Postgres isolation docs: https://www.postgresql.org/docs/current/transaction-iso.html; DDIA ch 7 "Weak Isolation Levels" (read committed, snapshot isolation, lost updates, write skew); *(optional)* "Serializability" internals (2PL, SSI) | Booking, payment, flash sale |
| B4 | Replication | Leader–follower, multi-leader, leaderless, replication lag, read-your-writes, quorum (W + R > N) | DDIA ch 5: "Leaders and Followers", "Problems with Replication Lag", and the quorum parts of "Leaderless Replication"; *(optional)* rest of ch 5; SDP `#replication` (under `#database`) | KV store, feed, chat |
| B5 | Sharding | Key-based vs range, hot keys, resharding, secondary indexes on shards | `HI/core-concepts/sharding` (full); DDIA ch 6 "Partitioning"; Azure sharding pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/sharding | KV, chat, URL shortener, feed |
| B6 | Consistent hashing | Ring, virtual nodes, rebalancing | `HI/core-concepts/consistent-hashing` (full); Alex Xu Vol 1 ch 5 | KV store, cache, crawler |
| B7 | CAP / consistency models | CP vs AP; strong vs eventual; PACELC | `HI/core-concepts/cap-theorem` (full); SDP `#cap-theorem`, `#consistency-patterns`, `#availability-patterns` | KV, payments, booking |
| B8 | Encoding + schema evolution | JSON vs Protobuf vs Avro; forward/backward compatibility | B8 note cheat sheet; DDIA ch 4 "Thrift and Protocol Buffers" (field tags and evolution); *(optional)* rest of ch 4 | Kafka, gRPC APIs, events |
| B9 | Deep dives: real databases | What each is good at, and its limits | `HI/deep-dives/dynamodb`, `HI/deep-dives/cassandra` (free); Postgres page 🔒, so use DDIA ch 2/7 instead | Picking a database in any question |

✅ **Questions in this block:**
- After B6: **KV store (#10)**. Read Alex Xu Vol 1 ch 6, then `HI/deep-dives/dynamodb`.
- After B7: **Unique ID generator (#22)**. Read Alex Xu Vol 1 ch 7 and https://github.com/twitter-archive/snowflake (README).

### Module C: Caching

| # | Subtopic | Understand | Resource | Prepares for |
|---|---|---|---|---|
| C1 | Cache patterns | Cache-aside, write-through, write-behind; TTL; invalidation | `HI/core-concepts/caching` (full); Azure cache-aside: https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside; SDP `#cache` | 22 of 24 questions |
| C2 | Redis as a Swiss-army knife | Strings, hashes, sorted sets (leaderboards), streams, pub/sub, GEO, locks | `HI/deep-dives/redis` (full); sorted sets: https://redis.io/docs/latest/develop/data-types/sorted-sets/ | Leaderboard, rate limiter, location search, chat presence |
| C3 | Eviction + failure modes | LRU / LFU, thundering herd, cache stampede, hot keys, cache penetration | Redis eviction: https://redis.io/docs/latest/develop/reference/eviction/; Alex Xu Vol 1 ch 6 (skim) | Distributed cache, feed |
| C4 | HTTP / CDN caching | Cache-Control, ETag, stale-while-revalidate, edge caching | MDN HTTP caching: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching; CloudFront "How CloudFront delivers content" | YouTube, Instagram, frontend questions |

✅ **Question:** **Rate limiter (#2)**. Attempt it yourself, then read `HI/problem-breakdowns/distributed-rate-limiter`, Alex Xu Vol 1 ch 4, and Stripe's post: https://stripe.com/blog/rate-limiters.

### Module D: Async, queues and streams

| # | Subtopic | Understand | Resource | Prepares for |
|---|---|---|---|---|
| D1 | Why queues | Decoupling, load leveling, retries, dead-letter queue (DLQ), back-pressure | SDP `#asynchronism`; Azure queue-based load leveling: https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling | Notification, crawler, YouTube, flash sale |
| D2 | Kafka model | Log, partitions, keys and ordering, consumer groups, offsets, retention | `HI/deep-dives/kafka` (full); *(optional)* Kafka design docs: "Motivation", "The Producer", "The Consumer" | Most event-driven questions |
| D3 | Delivery semantics + idempotency | At-most / at-least / exactly-once; dedup keys; idempotent consumers | Kafka docs "Message Delivery Semantics"; Stripe idempotency: https://stripe.com/blog/idempotency; AWS Builders' Library "Making retries safe with idempotent APIs" | Payments, notification, ad click |
| D4 | Outbox + CDC | Dual-write problem, transactional outbox, change data capture | https://microservices.io/patterns/data/transactional-outbox.html; *(optional)* DDIA ch 11 "Change Data Capture" section | Search indexing, notification, payments |
| D5 | Async request-reply | 202 Accepted + status polling / webhook | https://learn.microsoft.com/en-us/azure/architecture/patterns/async-request-reply | YouTube upload, LeetCode, ChatGPT |

✅ **Questions:**
- **Notification system (#13):** Alex Xu Vol 1 ch 10 (Hello Interview's version is 🔒).
- **Web crawler (#7):** `HI/problem-breakdowns/web-crawler` + Alex Xu Vol 1 ch 9 + Bloom filter basics (Wikipedia "Bloom filter", intro + "Algorithm description").
- **Message queue (#23):** Alex Xu Vol 2 ch 4 (optional).
- **Mock 1.** From here on, finish every module with one HLD mock on a Tier 1 question you've already done, graded with §8.

### Module E: Real-time delivery

| # | Subtopic | Understand | Resource | Prepares for |
|---|---|---|---|---|
| E1 | Polling vs long-poll vs SSE vs WebSocket | When each fits; connection cost; load balancing sticky sessions | SDP `#communication`; MDN SSE: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events; MDN "Writing WebSocket client applications" | Chat, live comments, Uber, ChatGPT |
| E2 | Scaling WebSockets | Connection servers + pub/sub backplane (Redis / Kafka), presence, heartbeats | Slack engineering "Real-time messaging" post; `HI/problem-breakdowns/fb-live-comments` (free, and the best free substitute for 🔒 realtime-updates) | Chat, live comments, Google Docs |
| E3 | Collaborative sync | OT vs CRDT, server authority, snapshots + update log | Figma "How Figma's multiplayer technology works"; **your own `DrawBoard` HLD + Decisions docs** | Google Docs, drawing tool |

✅ **Questions:**
- **Chat / WhatsApp (#3):** `HI/problem-breakdowns/whatsapp` + Alex Xu Vol 1 ch 12.
- **Google Docs (#12):** explain your DrawBoard HLD out loud in 35 min. Hello Interview's version is 🔒.
- **Cold question:** FB live comments or online chess (see the cold-question rule in §5).
- **Mock 2.**

### Module F: Blobs, media and fan-out

| # | Subtopic | Understand | Resource | Prepares for |
|---|---|---|---|---|
| F1 | Object storage + presigned URLs | Upload directly to S3, multipart, resumable uploads, metadata in DB | S3 presigned URL + multipart upload docs; Azure valet-key: https://learn.microsoft.com/en-us/azure/architecture/patterns/valet-key | Dropbox, YouTube, Instagram |
| F2 | Video pipeline | Transcoding DAG, chunks, HLS / adaptive bitrate, CDN | Apple HLS overview page; `HI/problem-breakdowns/youtube` | YouTube / Netflix |
| F3 | Fan-out | Push (fan-out on write) vs pull vs hybrid; celebrity problem; feed cache | `HI/problem-breakdowns/fb-news-feed`; Alex Xu Vol 1 ch 11 | Feed, Instagram, Twitter |
| F4 | File sync | Chunking, dedup by hash, delta sync, conflict handling | `HI/problem-breakdowns/dropbox`; Alex Xu Vol 1 ch 15 | Dropbox |

✅ **Questions:**
- **Dropbox (#5):** `HI/problem-breakdowns/dropbox` + Alex Xu Vol 1 ch 15.
- **YouTube (#6):** `HI/problem-breakdowns/youtube` + Alex Xu Vol 1 ch 14.
- **News feed (#4):** `HI/problem-breakdowns/fb-news-feed` + Alex Xu Vol 1 ch 11.
- **Instagram (#11):** a feed + blobs combination; do it from memory without reading anything.
- **Zoom / meeting recording (#25, your edge):** needs E1–E2 (signaling, connection servers) and F1–F2 (recording → storage → transcode → HLS). Draw the Adobe Connect-style design from your own knowledge first, then check it against the pattern list in §1.1.
- **Cold question:** Spotify or Strava.
- **Mock 3.**

### Module G: Contention and correctness

| # | Subtopic | Understand | Resource | Prepares for |
|---|---|---|---|---|
| G1 | Pessimistic vs optimistic locking | `FOR UPDATE`, version column / compare-and-swap (CAS), when each fits | Postgres explicit locking docs (row-level locks); DDIA ch 7 "Preventing Lost Updates" | Booking, inventory, auction |
| G2 | Distributed locks + reservations | Redis lock with TTL, fencing tokens, "hold seat for 10 min" | Kleppmann "How to do distributed locking": https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html | Ticketmaster, flash sale |
| G3 | Virtual waiting room / load shedding | Queue users at the edge, admission control | `HI/problem-breakdowns/ticketmaster` (deep dives section) | Ticketmaster, flash sale |
| G4 | Sagas + compensation | Orchestration vs choreography, compensating steps | https://microservices.io/patterns/data/saga.html; Azure compensating transaction pattern; `HI/deep-dives/temporal` | Payments, e-commerce order, Uber trip |
| G5 | Ledger + reconciliation | Double-entry bookkeeping, immutable entries, daily reconciliation | Modern Treasury "Accounting for Developers, Part I"; Alex Xu Vol 2 ch 11 (Payment) | Payment, wallet |

✅ **Questions:**
- **Ticket booking (#8):** `HI/problem-breakdowns/ticketmaster`.
- **Payment system (#16):** Alex Xu Vol 2 ch 11 (Hello Interview's version is 🔒).
- **Flash sale / e-commerce (#18):** `HI/problem-breakdowns/gopuff`.
- **Cold question:** Airbnb or online auction.
- **Mock 4.**

### Module H: Special indexes: geo, search, counting

| # | Subtopic | Understand | Resource | Prepares for |
|---|---|---|---|---|
| H1 | Geospatial | Geohash, quadtree, S2 (just the name), Redis GEO / PostGIS; handling frequent location updates | `HI/deep-dives/proximity-search` (full); Alex Xu Vol 2 ch 1 | Uber, Yelp, Tinder, Gopuff |
| H2 | Search | Inverted index, tokenization, ranking basics, Elasticsearch, index via CDC | `HI/deep-dives/elasticsearch` (full); `HI/problem-breakdowns/fb-post-search` | Post search, Yelp |
| H3 | Autocomplete | Trie with top-k per node, precomputed prefix table, cache at edge | Alex Xu Vol 1 ch 13 | Typeahead (backend) |
| H4 | Stream aggregation | Tumbling / sliding windows, pre-aggregation, Flink (concept), OLAP stores | `HI/problem-breakdowns/ad-click-aggregator`; *(optional)* DDIA ch 11 "Uses of Stream Processing" + "Reasoning About Time" | Ad clicks, metrics, top-K |
| H5 | Approximate counting | Count-min sketch, HyperLogLog, heavy hitters | `HI/problem-breakdowns/top-k`; Wikipedia "Count–min sketch" (intro); Redis HyperLogLog docs page | Top-K, trending, unique visitors |
| H6 | Time-series | Downsampling, retention, write-optimized storage | `HI/deep-dives/time-series-databases` (free) | Metrics monitoring |

✅ **Questions:**
- **Uber (#9):** `HI/problem-breakdowns/uber`.
- **Top-K (#15):** `HI/problem-breakdowns/top-k`.
- **Autocomplete (#14):** Alex Xu Vol 1 ch 13.
- **Ad click aggregator (#20):** `HI/problem-breakdowns/ad-click-aggregator` + Alex Xu Vol 2 ch 6.
- **Post search (#17):** `HI/problem-breakdowns/fb-post-search`.
- **Cold question:** Food delivery (Swiggy / Zomato) or Tinder.
- **Mock 5.**

### Module I: Coordination, reliability and operations

| # | Subtopic | Understand | Resource | Prepares for |
|---|---|---|---|---|
| I1 | Leader election + coordination | ZooKeeper / etcd idea, leases, split brain | Azure leader election: https://learn.microsoft.com/en-us/azure/architecture/patterns/leader-election; DDIA ch 9 "Distributed Transactions and Consensus" (read the intro only) | Job scheduler, KV store |
| I2 | Timeouts, retries, backoff + jitter | Retry storms, deadlines | AWS Builders' Library "Timeouts, retries, and backoff with jitter" | Every "what fails?" deep dive |
| I3 | Circuit breaker, bulkhead, load shedding | Failure isolation, graceful degradation | Fowler CircuitBreaker; Azure bulkhead; *(optional)* Google SRE book "Handling Overload" + "Addressing Cascading Failures" (read up to "Latency and Deadlines") | Every deep dive |
| I4 | Observability + SLOs | Logs / metrics / traces; SLI / SLO / SLA; error budgets | OpenTelemetry "Observability primer"; *(optional)* SRE book ch "Service Level Objectives" + "Monitoring Distributed Systems" | Metrics monitoring, every "how do you know?" question |
| I5 | Microservices boundaries | Monolith first, API gateway, BFF, CQRS, event sourcing (concept only) | Fowler MonolithFirst; Sam Newman BFF; `HI/deep-dives/api-gateway`; *(optional)* Azure CQRS + event sourcing pages | Architecture discussions |
| I6 | Multi-region + disaster recovery (DR) | Active–passive vs active–active; RPO / RTO | AWS "Disaster recovery options in the cloud" (the four-strategies section) | Payment, KV, "global scale" follow-ups |

✅ **Questions:**
- **Job scheduler (#21):** attempt it yourself; Hello Interview's version is 🔒, so use I1 + D1–D3 to self-check.
- **LeetCode (#19):** `HI/problem-breakdowns/leetcode`.
- **ChatGPT (#24):** design it yourself using D5 + E1 + your LLM knowledge. Eugene Yan's "Patterns for Building LLM-based Systems": https://eugeneyan.com/writing/llm-patterns/
- **RAG / document Q&A (#26, your edge):** design it yourself using:
  - H2: search, extended with vectors and hybrid ranking
  - D1: the ingestion queue
  - D5 + E1: streamed answers
  - I2–I4: LLM gateway retries, fallbacks, evals and tracing

  Check your design against Eugene Yan's RAG section and your LLM course's RAG week.
- **Cold question:** Stock exchange / Robinhood.
- **Mock 6.**

---

## 5. Flow (no week targets; move on when the module's questions score ≥ 12/16 on §8)

| Phase | Covers | Questions solved along the way |
|---|---|---|
| **1. LLD (C++)** | L-A foundations → L-B patterns → L-C concurrency | Tic-tac-toe → Parking lot, Vending machine, Elevator → Logger, Pub-sub, Splitwise → Blocking queue, TTL cache, LRU, Rate limiter, BookMyShow → **LLD mock** |
| **2. HLD** | Modules A → I | A: #1 · B: #10, #22 · C: #2 · D: #13, #7 (+ **mock**) · E: #3, #12 (+ cold Q, mock) · F: #5, #6, #4, #11, **#25** (+ cold Q, mock) · G: #8, #16, #18 (+ cold Q, mock) · H: #9, #15, #14, #20, #17 (+ cold Q, mock) · I: #21, #19, #24, **#26** (+ cold Q, mock) |
| **3. Mocks + revision** | All Tier 1 from memory, 2 a week out loud with a 45-min timer; LLD redone from memory in C++ | Job search when you decide |

**Rules that replace the schedule:**
- **Pace.** The plan assumes 30 min a day. The months in the phase titles are rough guides, not deadlines. At 30 min a day, Phase 1 (about 20 LLD items plus the long L0 note) will likely run into December; that's fine. At 1 hour a day it fits Oct–Nov. If you have 1–1.5 hours, the same flow just finishes sooner. Don't add more reading; spend the extra time on more questions and mocks.
- **Mocks.** Do 1 after LLD, then 1 after every HLD module from D onward. Use a peer, Pramp, or a recorded 45-min solo run, and grade with §8.
- **Cold questions.** From Module E on, each module also has one Tier 3 question done **cold**: no reading before or during, 45-min timer, graded with §8. Afterwards, list which patterns you used and which you missed. This checks that you can work out a question you haven't seen from the patterns, not just recall an answer you've read.
- **Reading depth.** Every topic has **must-read** sources, which are enough for interviews. "Optional depth" marks reading you only do if curious (see the table below). The notes already summarise the deep parts.
- **Sundays.** Do 1 old question redone from memory, or 1 LLD Tier 2 question.
- **If you fall behind:** drop Tier 3 questions and optional-depth reading first. Never drop the "attempt it yourself before reading" step.

**Optional depth: skip for interviews, read only if curious**

| Topic | Must-read (enough) | Optional depth |
|---|---|---|
| B2 Indexes | Hello Interview indexing page; B-tree vs LSM | use-the-index-luke, DDIA storage chapter |
| B3 Transactions | Isolation levels, lost update, write skew, `FOR UPDATE` | DDIA serializability internals (2PL, SSI) |
| B4 Replication | Replication lag, read-your-writes, quorum, leader failover | The rest of the DDIA replication chapter |
| B8 Encoding | JSON vs Protobuf, and "add fields, never reuse tags" | The full DDIA encoding chapter |
| D2 Kafka | Hello Interview Kafka page | Kafka design docs |
| D4 Outbox + CDC | microservices.io transactional outbox | DDIA CDC section |
| H4 Stream aggregation | Ad-click aggregator breakdown | DDIA stream analytics / reasoning about time |
| H6 Time-series, I6 DR | One paragraph each (see the notes' cheat sheets) | Everything else |
| I3 / I4 Reliability | One line each: circuit breaker, bulkhead, SLO / error budget | SRE book chapters |
| I5 Microservices | Monolith first, BFF, API gateway; CQRS / event sourcing as definitions only | Azure CQRS / event sourcing pages |
| L3 Patterns | Strategy, State, Observer, Factory, Singleton, Builder, Command, Decorator, Chain of Responsibility (the Logging framework question needs it) | Adapter, Composite (learn them last) |

Keep **E3 (Figma / DrawBoard)** and **F2 (video pipeline)** at full depth. They back your two edge answers, DrawBoard and Zoom (#25).

**Books:** Alex Xu Vol 1 + Vol 2 and DDIA 1st ed. (read only the must-read sections). All are in `Books/`. Everything else above is free.

---

## 6. Resource index (all links checked Sep 2026)

| Resource | Use for |
|---|---|
| Hello Interview system design: https://www.hellointerview.com/learn/system-design | In-a-hurry, core concepts, deep dives, free breakdowns |
| Hello Interview LLD: https://www.hellointerview.com/learn/low-level-design | LLD framework, patterns, concurrency intro |
| System Design Primer: https://github.com/donnemartin/system-design-primer | Fundamentals sections (A4, A5, B7, D1, E1) |
| Alex Xu Vol 1 and Vol 2 (books) | Question walkthroughs |
| DDIA 1st ed. (book, in `Books/`) | Data depth, must-read sections only (see §5 table) |
| ByteByteGo System Design 101: https://github.com/ByteByteGoHq/system-design-101 | Visual revision cheat sheets (optional) |
| Azure Architecture patterns: https://learn.microsoft.com/en-us/azure/architecture/patterns/ | Queue load leveling, valet key, leader election, bulkhead, CQRS, sharding, async request-reply, cache-aside, compensating transaction |
| microservices.io: outbox, saga | Consistency across services |
| AWS Builders' Library | Retries / backoff, idempotency |
| Google SRE book: https://sre.google/sre-book/table-of-contents/ | SLOs, monitoring, overload, cascading failure |
| Stripe blog: idempotency, rate limiters | Payments, rate limiter |
| Kleppmann: distributed locking | Booking contention |
| Modern Treasury: Accounting for Developers | Ledger |
| Figma multiplayer, Slack real-time messaging | Real-time case studies |
| web.dev, MDN | Networking, HTTP caching |
| Refactoring Guru: https://refactoring.guru/design-patterns | Patterns (use the C++ code tab) |
| Awesome LLD: https://github.com/ashishps1/awesome-low-level-design | LLD problems + solutions |
| Your own docs: `ReactPersonal\Projects\DrawBoard\` (PRD, HLD, Decisions) | Your answer to "Design Google Docs / Figma" |
| Your own: `ReactPersonal\Info\security-learning-path.md` | Auth, sessions, OWASP (security fundamentals) |
| Your own: Adobe Connect work (WebRTC, recording) | Your answer to "Design Zoom / meeting recording" (#25) |
| Your own: LLM course (RAG, LangGraph weeks) | Your answer to "Design a RAG / document Q&A system" (#26) |

---

## 7. Numbers to memorise (one page)

Order-of-magnitude only. Say "roughly" in the interview. The A5 note explains where they come from.

| Latency | ≈ |
|---|---|
| L1 cache reference | 1 ns |
| Mutex lock/unlock | 25 ns |
| Main memory reference | 100 ns |
| Compress 1 KB (fast codec) | 2–3 µs |
| Read 1 MB sequentially from memory | ~10 µs |
| SSD random read | 16–100 µs |
| Round trip within one data centre | 0.5 ms |
| Read 1 MB sequentially from SSD | ~50 µs–1 ms |
| Disk seek (HDD) | 2–10 ms |
| Round trip, same continent | 20–50 ms |
| Round trip, cross-continent (e.g. India ↔ US) | 150–250 ms |

| Throughput rule of thumb (one machine, simple work) | ≈ |
|---|---|
| Stateless app server | 1k–10k req/s |
| Postgres / MySQL (indexed point reads) | 5k–20k QPS reads; writes lower |
| Redis | ~100k ops/s |
| Kafka broker | hundreds of MB/s |
| WebSocket connections per server | 10k–100k (memory bound) |

| Conversions | ≈ |
|---|---|
| Seconds in a day | 86,400 ≈ **10⁵** |
| 1M requests/day | ≈ 12 req/s (use ~10) |
| 100M requests/day | ≈ 1,000–1,200 req/s average; peak 2–10× |
| 2¹⁰ / 2²⁰ / 2³⁰ / 2⁴⁰ | thousand / million / billion / trillion (KB / MB / GB / TB) |
| char / int / long / UUID / timestamp | 1–2 B / 4 B / 8 B / 16 B / 8 B |

| Availability | Downtime per year | per month |
|---|---|---|
| 99% | 3.65 days | 7.3 h |
| 99.9% | 8.8 h | 43.8 min |
| 99.99% | 52.6 min | 4.4 min |
| 99.999% | 5.3 min | 26 s |

---

## 8. Question-day routine + self-grading rubric

**45-minute split (HLD):** requirements 5 → entities + API 5 → high-level design 15 → deep dives 15 → wrap-up 5 (failures, trade-offs, what you'd do next).
**LLD split:** requirements 5 → entities + class diagram 10 → core code 20 → walk through a use case 5 → extensions + testing 5.

**Drills to do on every question day** (these are the skills reading doesn't train):
1. **Estimation, 5 min:** QPS (average and peak), storage per year, bandwidth. Stop once the numbers have changed the design (cache? shard? CDN? queue?).
2. **Trade-off lines:** for every major choice, say one sentence on why and one on what it costs (for example, "Fan-out on write keeps reads fast, but a celebrity post means millions of writes, so celebrities use pull.").
3. **Failure-mode pass:** go through the list and say what happens and what you'd do:
   - cache down
   - DB primary down
   - queue backed up
   - a dependency is slow
   - a whole region is down
   - a client retries twice
4. **LLD only:** draw the class diagram before code, then say how you'd extend it (a new vehicle type, a new payment method) and how you'd unit-test the core class.

**Rubric: score each 0 / 1 / 2. Total out of 16. Redo anything below 12 within 2 weeks.**

| # | Axis | 0 | 1 | 2 |
|---|---|---|---|---|
| 1 | Requirements | Jumped straight to boxes | Listed some | Functional + non-functional, scale numbers, explicit out-of-scope |
| 2 | Entities + API / class diagram | Missing | Present but vague | Clean, with pagination, idempotency and errors (HLD); clear responsibilities (LLD) |
| 3 | High-level design | Didn't cover the requirements | Works, with gaps | Covers every requirement, and the data flow is clear |
| 4 | Data | No schema or DB choice | DB chosen without reasons | Schema, keys and indexes, DB choice justified, sharding key if needed |
| 5 | Deep dives | None | One, shallow | 2+ of the question's hard parts, handled well |
| 6 | Estimation | None | Numbers but no conclusion | The numbers drove a design decision |
| 7 | Trade-offs + failures | None | Named a few | Why and what it costs for major choices; failure-mode pass done |
| 8 | Communication + time | Ran over, or silent | Mostly on time | Followed the time split, checked in with the interviewer, clear wrap-up |

Log each attempt as one line in the question's note or in `Notes/Questions/`: date, score, and the one thing to fix next time.
