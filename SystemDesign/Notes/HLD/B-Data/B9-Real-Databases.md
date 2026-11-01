# B9 · Real Databases: picking the right storage tool in interviews

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** every HLD question: URL shortener (#1), Chat (#3), News feed (#4), Dropbox (#5), Booking (#8), KV store (#10), Instagram (#11), Payment (#16), Search (#17), Metrics (#20).

---

## Why this topic matters

Interviewers do not expect you to know every internal detail of every database. They expect a practical answer to:

> Why this database for this access pattern, and what limits will you hit?

A strong answer sounds like: "Postgres for transactional booking state; Redis for short-lived seat holds; Elasticsearch for search; Kafka to move changes; object storage for blobs." A weak answer says "NoSQL because it scales".

| DB | Best mental model | Interview default |
|---|---|---|
| Postgres | relational source of truth | bookings, payments, users, metadata |
| MySQL | relational OLTP workhorse | similar to Postgres, common in web stacks |
| DynamoDB | managed key-value/document at huge scale | serverless KV, carts, sessions, high-QPS access patterns |
| Cassandra | wide-column, write-heavy, multi-node | time-ordered events, chat messages, metrics-like writes |
| MongoDB | document database | flexible JSON-like product/content documents |
| Redis | in-memory data structures | cache, rate limit, leaderboard, locks with caveats |
| Elasticsearch | inverted index/search engine | search, filtering, log exploration |
| Time-series DB | timestamp-first metrics store | monitoring, IoT, analytics windows |

**Interview line:** "I'll keep the system of record in Postgres because I need transactions and constraints, use Redis as a cache/ephemeral coordination layer, and project searchable fields into Elasticsearch asynchronously via CDC."

---

## Part 1: Postgres and MySQL

### Postgres

**Data model:** relational tables, rows, SQL, constraints, indexes, transactions. Also has JSONB, full-text search, geospatial via PostGIS, and many extensions.

Strengths:

- ACID transactions and strong constraints;
- joins and ad-hoc SQL;
- B-tree indexes, partial indexes, expression indexes, JSONB GIN indexes;
- good default for system-of-record data;
- replication and read replicas;
- mature operations and ecosystem.

Limits:

- horizontal write scaling is not automatic;
- very high write throughput may require partitioning/sharding or a different store;
- cross-shard joins/transactions are hard;
- not a search engine replacement at very large text-search scale;
- not an in-memory cache.

Scaling model: start with one primary, indexes, connection pooling, read replicas and partitioning. For larger systems, shard by tenant/user/entity or use a distributed SQL system if strict SQL at scale is required.

Use Postgres for booking/payments/inventory, users/accounts/orders, metadata for blobs, and the source of truth before projecting to caches/search. For Neeraj: Supabase is Postgres. DrawBoard's durable board metadata, auth and storage references fit here; Yjs realtime updates may live elsewhere or be persisted as snapshots/update logs.

### MySQL

**Data model:** relational SQL, usually InnoDB storage engine for transactions and indexes.

Strengths: proven OLTP database for web apps, ACID with InnoDB, B-tree indexes and replication, huge operational familiarity, common in interview/company architectures.

Limits are similar to Postgres: a single primary is the write bottleneck unless sharded; schema migrations at scale need care; complex analytics should move to OLAP/search stores.

Scaling model: primary-replica replication, read replicas, partitioning, application-level sharding, Vitess-style sharding in large MySQL shops.

Postgres vs MySQL rarely decides the interview. Say "a relational DB like Postgres/MySQL" unless a feature matters. Pick Postgres when you want richer SQL/extensions/JSONB/PostGIS; pick MySQL when aligning with a company stack or Vitess examples.

---

## Part 2: DynamoDB

**Data model:** tables with items. Each item is a map of attributes. The primary key is either:

- partition key only: `pk`;
- partition key + sort key: `(pk, sk)`.

DynamoDB is not "query anything later". You model access patterns first.

```text
Table: App
PK                    SK                         Attributes
USER#42               PROFILE                    name, email
USER#42               ORDER#2026-09-30#99        amount, status
ORDER#99              METADATA                   userId, status
ROOM#abc              MSG#000001                 sender, text
```

### Partition key and sort key

The **partition key** decides physical partitioning and must have high cardinality. A hot partition key can throttle you.

The **sort key** orders items within a partition and enables range queries:

```text
PK = ROOM#abc, SK begins_with MSG#
=> fetch messages in one room ordered by message id/time
```

### GSIs and LSIs

- **GSI (Global Secondary Index):** different partition/sort key; eventually consistent; separate throughput/scaling. Use to support another access pattern.
- **LSI (Local Secondary Index):** same partition key as table, different sort key; must be created with table; lets you query alternate ordering within same partition.

### Single-table design basics

Single-table design stores multiple entity types in one table so related items can be fetched with a small number of partition queries. You use prefixed keys like `USER#42`, `ORDER#99`, `ROOM#abc`.

Good: predictable high-scale access, few network calls, serverless operations. Hard: requires knowing access patterns upfront, ad-hoc queries are painful, GSIs are not free, hot keys require careful design, and transactions exist but are not the main mental model.

Use DynamoDB for shopping carts, session/profile lookups, serverless high-QPS APIs, key-value access with predictable queries, and idempotency records with TTL. Avoid it as the first choice for relational booking/payment flows requiring rich constraints and joins.

---

## Part 3: Cassandra

**Data model:** wide-column. A table has a primary key split into:

- **partition key:** decides which nodes own the row group;
- **clustering columns:** sort data inside the partition.

```sql
CREATE TABLE messages_by_room (
  room_id text,
  bucket_date date,
  message_time timestamp,
  message_id uuid,
  sender_id text,
  body text,
  PRIMARY KEY ((room_id, bucket_date), message_time, message_id)
);
```

Here `(room_id, bucket_date)` is the partition key and `(message_time, message_id)` are clustering columns. This supports "messages for room X on date D ordered by time".

Strengths:

- high write throughput;
- horizontal scaling by adding nodes;
- multi-AZ/multi-region replication;
- tunable consistency (`ONE`, `QUORUM`, `ALL`);
- no single leader bottleneck for writes.

Limits:

- query-first modeling; no arbitrary joins;
- secondary indexes are limited compared with relational DBs;
- large partitions hurt;
- deletes/tombstones need care;
- lightweight transactions exist but should not be the default.

### Write path

Cassandra is optimized for writes:

```text
client write
  -> coordinator node
  -> commit log (durability)
  -> memtable (in memory)
  -> flush to SSTables on disk
  -> compaction merges SSTables later
```

This is LSM-tree style. Writes are append-friendly; reads may check memtables, SSTables and Bloom filters, then compacted data over time.

Use Cassandra for chat messages at huge scale, metrics/events with known query patterns, IoT/time-series-like writes, and feeds/events where AP/tunable consistency is acceptable. Avoid it for payments, booking uniqueness and workflows that need joins and strict transactions.

---

## Part 4: MongoDB

**Data model:** BSON documents grouped into collections.

```json
{
  "_id": "post_1",
  "authorId": "u1",
  "caption": "...",
  "media": [{ "url": "...", "w": 1080, "h": 1080 }],
  "tags": ["travel", "goa"]
}
```

Strengths: natural for nested JSON-like objects, flexible schema during product iteration, good document-level reads/writes, secondary indexes, aggregation pipeline and sharding support.

Limits: document growth and unbounded arrays can hurt; joins exist but are not the core strength; multi-document transactions exist but if you rely on them everywhere, relational may fit better; flexible schema can become accidental schema chaos.

Scaling model: replica sets for HA; sharding by shard key for scale. Shard key choice is as important as partition key choice in Dynamo/Cassandra.

Use MongoDB for product catalogs, content documents, flexible profiles and CMS-like data. Do not pick it just because "JSON" if the question needs strict relational constraints.

---

## Part 5: Redis

**Data model:** in-memory data structures: strings, hashes, lists, sets, sorted sets, streams, bitmaps, HyperLogLog, GEO.

Strengths:

- extremely low latency;
- TTL built in;
- atomic operations on single keys/scripts;
- data structures map to interview patterns:
  - strings/hashes: cache/session;
  - sorted sets: leaderboard;
  - counters: rate limiter;
  - streams/pub-sub: lightweight messaging;
  - GEO: nearby queries.

Limits:

- memory is expensive;
- persistence/replication exist but Redis is usually not the durable source of truth for critical money/bookings;
- cluster multi-key operations need hash-slot awareness;
- locks need fencing tokens and careful TTL handling.

Scaling model: single node, replicas, Sentinel/failover, Cluster sharding by hash slots. In interviews, use Redis mostly as cache/ephemeral fast state, and keep a durable database behind it.

Cross-link: [C2 Redis](../C-Caching/C2-Redis.md) will go deeper.

---

## Part 6: Elasticsearch and time-series databases

### Elasticsearch

**Data model:** JSON documents indexed into inverted indexes and columnar structures for search/filter/aggregation.

Strengths: full-text search, relevance ranking, filters/faceting, log/search exploration, autocomplete/search use cases with analyzers.

Limits: not the source of truth, indexing is near-real-time, updates are heavier than pure KV writes, and correctness should come from DB + CDC replay, not manual dual writes.

Use for post search (#17), product search, logs, support search. Feed/search systems often write to Postgres/Cassandra first, then index into Elasticsearch asynchronously via [D4 Outbox + CDC](../D-Async/D4-Outbox-CDC.md).

### Time-series DBs

**Data model:** measurements/metrics with timestamps, labels/tags and values.

Strengths: high-ingest timestamped data, retention policies, downsampling/rollups, time-window queries and compression.

Examples: Prometheus for metrics, InfluxDB/TimescaleDB/ClickHouse-style systems depending workload.

Limits: not for arbitrary OLTP relationships; high-cardinality labels can explode cost; exact per-event transactions are not the goal.

Use for metrics monitoring (#20), observability, IoT and analytics counters.

---

## Part 7: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Payment ledger | Postgres/MySQL + transactions; maybe append-only ledger table | correctness, constraints, audits |
| Ticket booking | Postgres/MySQL for inventory; Redis for short holds/cache | CP final write, fast temporary state |
| Chat messages at massive scale | Cassandra/DynamoDB with room/user partitioning | high write volume, known access patterns |
| User profile/session lookup | Postgres if relational; DynamoDB if serverless KV scale | access pattern decides |
| Feed cache | Redis + durable DB/log behind it | low latency, rebuildable |
| Search posts/products | Elasticsearch fed from source DB | inverted index and ranking |
| Metrics | Prometheus/Influx/time-series store | timestamp windows and retention |
| Product catalog with flexible attributes | MongoDB or Postgres JSONB | document shape; choose based on query/transaction needs |
| URL shortener mapping | DynamoDB/Cassandra/Postgres depending scale | simple key lookup; cache in Redis/CDN |

### Common interview traps

- "NoSQL scales" with no access pattern. Name the partition key and query shape.
- Picking Cassandra/DynamoDB for transactions with joins and constraints.
- Using Elasticsearch as the primary database.
- Using Redis as the only store for money/inventory.
- Forgetting hot partitions in DynamoDB/Cassandra.
- Designing MongoDB documents with unbounded arrays that grow forever.
- Ignoring operational maturity: the best theoretical DB may be worse than boring Postgres for the team.

---

## Self-test (answer out loud first, then open)

<details><summary>1. When is Postgres the best default?</summary>

When you need a reliable source of truth with transactions, constraints, SQL queries and moderate-to-high but not infinite write scale: users, orders, payments, bookings, blob metadata and most product backends.
</details>

<details><summary>2. What are DynamoDB partition and sort keys?</summary>

The partition key decides physical partitioning and equality lookup. The optional sort key orders items within a partition and enables range/prefix queries inside that partition. Together they define the primary access pattern.
</details>

<details><summary>3. GSI vs LSI in DynamoDB?</summary>

A GSI has its own partition/sort key and supports a different access pattern, with separate scaling and eventual consistency. An LSI keeps the same partition key as the base table but uses a different sort key, and must be created with the table.
</details>

<details><summary>4. Cassandra partition key vs clustering key?</summary>

The partition key determines which nodes store the rows. Clustering columns determine the sorted order within that partition and support range scans inside it. Model tables around queries.
</details>

<details><summary>5. Explain Cassandra's write path briefly.</summary>

A write goes to a coordinator, is appended to the commit log for durability, written to an in-memory memtable, flushed later to immutable SSTables, and compacted in the background. This append-friendly LSM path gives high write throughput.
</details>

<details><summary>6. Why not use Elasticsearch as the source of truth?</summary>

It is optimized for search/indexing and is usually near-real-time. Durable correctness, constraints and recovery should live in a primary DB/log; Elasticsearch should be rebuildable from that source.
</details>

<details><summary>7. Redis is fast. Why not store bookings only in Redis?</summary>

Redis is usually used for cache/ephemeral state. Bookings need durable transactions, auditability and correctness under failover. Use Redis for seat holds or availability cache, but finalize in a durable transactional database.
</details>

<details><summary>8. What is the main interview rule for picking DynamoDB/Cassandra?</summary>

State the access pattern and partition key first. These databases are powerful when queries are predictable and partitioning is well-designed; they are painful for ad-hoc joins and changing query patterns.
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
| [Hello Interview: DynamoDB](https://www.hellointerview.com/learn/system-design/deep-dives/dynamodb) | Exact headings: "The Data Model", "Partition Key and Sort Key", "Secondary Indexes", "Accessing Data", "CAP Theorem", "Architecture and Scalability", "Fault Tolerance and Availability", "Advanced Features" | ~35 min |
| [AWS DynamoDB: Core components](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html) | Exact headings: "Tables, items, and attributes", "Primary key", "Secondary indexes", "DynamoDB Streams" | ~15 min |
| [Hello Interview: Cassandra](https://www.hellointerview.com/learn/system-design/deep-dives/cassandra) | Exact headings: "Cassandra Basics", "Data Model", "Primary Key", "Partitioning", "Replication", "Consistency", "Query Routing", "Storage Model", "Gossip", "Fault Tolerance" | ~35 min |
| [PostgreSQL docs: What is PostgreSQL?](https://www.postgresql.org/docs/current/intro-whatis.html) | Exact heading: "1. What Is PostgreSQL?" (free alternative to paid HI Postgres page) | ~5 min |
| [PostgreSQL docs: Indexes](https://www.postgresql.org/docs/current/indexes.html) | Exact heading: "Chapter 11. Indexes" | ~10 min |
| [PostgreSQL docs: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) | Exact headings: "13.2. Transaction Isolation", "Read Committed Isolation Level", "Repeatable Read Isolation Level", "Serializable Isolation Level" | ~15 min |
| [MongoDB: Data modeling introduction](https://www.mongodb.com/docs/manual/core/data-modeling-introduction/) | Exact headings: "Use Cases", "Developing with a Flexible Data Model", "Document Relationships", "Schema Design: Differences Between Relational and Document Databases" | ~15 min |
| [Redis data types](https://redis.io/docs/latest/develop/data-types/) | Read the data type overview: strings, hashes, lists, sets, sorted sets, streams, geospatial, probabilistic structures | ~15 min |
| [Elastic: Search solutions](https://www.elastic.co/docs/solutions/search) | Exact headings: "What you can build", "Search use case documentation", "Search concepts", "Elasticsearch as a vector database" | ~10 min |
| [InfluxDB data elements](https://docs.influxdata.com/influxdb/v2/reference/key-concepts/data-elements/) | Exact headings: "Timestamp", "Measurement", "Fields", "Tags" | ~10 min |
| [Prometheus overview](https://prometheus.io/docs/introduction/overview/) | Exact headings: "What is Prometheus?", "Features", "What are metrics?", "Components", "Architecture", "When does it fit?", "When does it not fit?" | ~15 min |
| **DDIA ch 3 + ch 7** | Storage/indexing and transactions as the free deep alternative for SQL databases | [ch3 p.91](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=91>) · [ch7 p.243](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=243>) |

**Connects to:** [B1 Data models](B1-Data-Models-DB-Choice.md) · [B2 Indexes](B2-Indexes.md) · [B3 Transactions + isolation](B3-Transactions-Isolation.md) · [B4 Replication](B4-Replication.md) · [B5 Sharding](B5-Sharding.md) · [C2 Redis](../C-Caching/C2-Redis.md) · [H2 Search](../H-Geo-Search-Counting/H2-Search.md) · Questions: all HLD questions, especially Booking (#8), KV store (#10), Payment (#16), Search (#17)
