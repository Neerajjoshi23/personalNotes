# B1 · Data Models + DB Choice: pick the shape before the database

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** URL shortener (#1), Chat (#3), News feed (#4), Booking (#8), KV store (#10), Payment (#16), Post search (#17), Metrics/ad click (#20), basically every HLD question.

---

## Why this topic matters

Most weak HLD answers pick a database by brand name: "Postgres because SQL is consistent" or "Cassandra because it scales". Strong answers pick a **data model** first:

1. What are the entities?
2. What are the access patterns?
3. What invariants must never break?
4. What scale forces a different storage shape?

Only then do they say Postgres, DynamoDB, Cassandra, MongoDB, Elasticsearch, ClickHouse, InfluxDB, Neo4j or Redis.

| Interview pressure | Why DB choice matters |
|---|---|
| Correctness | Payments, bookings and inventory need constraints/transactions. |
| Query shape | Search, graph traversal and time-window metrics need specialised indexes. |
| Scale | A feed or chat message store may outgrow one machine or one SQL index. |
| Evolvability | Product fields change; schemas can help or slow you down. |

**Interview line:** "I'll start with access patterns, not the database product. If the core invariant is money or seat allocation, I bias toward relational transactions; if the core workload is high-volume append/read-by-key, I consider a wide-column or KV model."

---

## Part 1: the six data models you should recognise

A data model is the shape the database exposes to your application. The same product can support multiple models, but interviews usually expect these mental buckets.

| Model | Mental model | Strength | Weakness | Typical products |
|---|---|---|---|---|
| **Relational** | Tables, rows, columns, foreign keys, joins | Integrity, ad-hoc queries, transactions | Sharding and object nesting need work | Postgres, MySQL, SQL Server |
| **Document** | JSON-like documents grouped in collections | Flexible nested objects, fetch aggregate in one read | Joins and cross-document constraints are weaker | MongoDB, Couchbase |
| **Wide-column** | Partition key → ordered rows/columns | Massive writes, range reads within a partition | Query model must be designed upfront | Cassandra, HBase, Bigtable |
| **Key-value** | `key -> opaque value` | Simple, fast lookup, cache/session/state | No rich querying unless you build indexes yourself | Redis, DynamoDB-style access, Memcached |
| **Graph** | Nodes and edges with properties | Deep relationship traversal | Not for high-throughput simple OLTP by default | Neo4j, JanusGraph |
| **Search / time-series** | Inverted index or time-partitioned measurements | Text ranking, filtering, aggregations over time | Usually derived data, not source of truth | Elasticsearch/OpenSearch, ClickHouse, Prometheus, InfluxDB |

### Relational: when relationships and invariants matter

Relational databases are not "old"; they are the default for systems where correctness matters. They give you:

- **Schema-on-write:** bad data is rejected at write time.
- **Constraints:** primary keys, unique constraints, foreign keys, check constraints.
- **Joins:** combine normalized data without duplicating everything.
- **Transactions:** commit multiple changes atomically.

For BookMyShow (#8), payments (#16), user accounts and URL mappings (#1), Postgres is a strong default because you can encode invariants near the data.

```sql
CREATE TABLE bookings (
  id BIGSERIAL PRIMARY KEY,
  show_id BIGINT NOT NULL,
  seat_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('HELD', 'CONFIRMED', 'EXPIRED')),
  UNIQUE (show_id, seat_id) -- one active booking row pattern needs partial unique in real Postgres
);
```

### Document: when the aggregate is naturally nested

A document database stores a whole aggregate together. Think user profile, product catalog item, DrawBoard board settings, or a meeting recording metadata object.

```json
{
  "boardId": "b_123",
  "ownerId": "u_7",
  "title": "Architecture sketch",
  "permissions": [
    { "userId": "u_9", "role": "editor" },
    { "userId": "u_10", "role": "viewer" }
  ],
  "createdAt": "2026-09-30T12:00:00Z"
}
```

Fetching the board settings is one read. But if you often ask "show all boards where Neeraj is an editor", the embedded array becomes an indexing/query design issue. If permissions must be strongly consistent across many boards, relational may be simpler.

### Wide-column: when the partition is the product

Wide-column stores are built around **partition key + clustering key**. You design tables per query.

For chat (#3):

```text
partition key: conversation_id
clustering key: message_time DESC, message_id
row: sender_id, text/blob_ref, delivery_state
```

This is excellent for "load the last 50 messages in a conversation". It is not excellent for arbitrary joins like "messages sent by users who work at Adobe and reacted with emoji X" unless you build another table/index.

### Key-value: when the query is exactly one key

Key-value is not a poor version of SQL; it is a deliberate simplification. If your operation is `get(shortCode)` or `get(sessionId)`, a KV store or cache is hard to beat.

For URL shortener (#1):

```text
short_code -> { long_url, owner_id, created_at, expiry, status }
```

If you also need analytics by country, referrer and time, that is not the same KV table. Send click events to a stream/time-series/OLAP path.

### Graph: when the hard query is many-hop relationships

Graph databases shine when the relationship is the data: friends-of-friends, fraud rings, dependency graphs. A social network feed (#4) does **not automatically** need a graph DB; most feed systems precompute/fan-out timelines because the hot path is "show recent posts", not arbitrary graph traversal.

### Search and time-series are usually derived views

Elasticsearch is great for post search (#17) because it builds an inverted index: token → documents. Prometheus/InfluxDB/ClickHouse are great for metrics (#20) because they store time-ordered measurements and aggregate over windows.

But they are often **not** the source of truth. A common design is:

```text
Postgres / Cassandra source of truth
        │
        ├── CDC / event stream
        ▼
Elasticsearch search index or ClickHouse metrics table
```

That connects to [D4 Outbox + CDC](../D-Async/D4-Outbox-CDC.md) later.

---

## Part 2: schema-on-write vs schema-on-read

### Schema-on-write

Relational systems usually validate structure before accepting data.

```text
Client write -> DB checks columns/types/constraints -> commit or reject
```

Benefits:
- Bad data is caught early.
- Queries can rely on a known shape.
- Migrations are explicit and reviewable.
- Constraints protect you from app bugs.

Costs:
- Schema migrations can slow delivery.
- Rapidly changing product fields need careful versioning.
- Very sparse entities can become awkward.

### Schema-on-read

Document/data-lake style systems often allow flexible writes and interpret shape when reading.

```text
Client write -> store JSON/blob -> each reader decides how to interpret it
```

Benefits:
- Easy to add new optional fields.
- Good for semi-structured logs/events.
- Useful when producers evolve independently.

Costs:
- Every reader must handle old/missing/weird fields.
- Data quality bugs surface late.
- Analytics may contain silent type drift (`"42"` vs `42`).

**Interview line:** "For user-generated event logs I can accept schema-on-read and validate downstream. For payments or bookings I want schema-on-write, constraints and transactions because rejecting bad writes early is part of correctness."

### The pragmatic middle

Modern systems mix both:

- Postgres has strong schemas plus `JSONB` for flexible metadata.
- MongoDB supports schema validation and indexes.
- Kafka topics often use Avro/Protobuf schemas even though events are distributed.
- TypeScript apps validate API payloads with Zod/io-ts even when the DB is flexible.

For DrawBoard, the Yjs document updates are semi-structured binary updates, but board metadata, permissions and billing should still be relational.

---

## Part 3: normalisation, denormalisation and joins

### Normalisation: one fact in one place

Normalisation avoids duplicate facts. A `users` table stores the display name once; messages reference `user_id`.

```text
users(id, display_name, avatar_url)
messages(id, conversation_id, sender_id, body, created_at)
```

Pros:
- Update once, visible everywhere.
- Constraints prevent impossible references.
- Storage is smaller.
- Ad-hoc queries stay flexible.

Cons:
- Reads may need joins.
- At high scale, joins across shards become expensive.
- Historical snapshots need extra care: should an old invoice show the user's current name or the name at purchase time?

### Denormalisation: duplicate for read speed

Denormalisation stores a copy to make reads cheap.

```text
feed_items(user_id, post_id, author_name_snapshot, author_avatar_snapshot, text, created_at)
```

Pros:
- One read path is fast.
- Good for feeds, search documents, notification inboxes.
- Lets you precompute expensive joins.

Cons:
- Updates must fan out or tolerate stale copies.
- Backfills/reindexing become operational work.
- Bugs create inconsistent views.

### Joins: not bad, just a trade-off

A join is a way of combining facts at read time. It is perfect when:

- the data fits on one relational cluster,
- the query is indexed,
- the result set is bounded,
- the correctness of one source of truth matters.

It becomes painful when:

- the join crosses shards or services,
- the query scans huge tables,
- the hot path needs sub-10ms latency,
- the relation is many-to-many at huge fan-out.

A strong interview answer does not say "NoSQL has no joins, therefore faster". It says: "I will avoid **distributed joins on the hot path** by denormalising this particular read model."

### Aggregate boundary: the key design question

Ask: what object do I almost always read and write together?

- A product catalog item with variants and attributes? Document can fit.
- A payment ledger with account balances and entries? Relational tables with transactions fit.
- A chat conversation's messages? Wide-column partition by conversation fits.
- A search result? Derived search document fits.

---

## Part 4: choosing in an interview / cheat sheet

### Which DB for which interview question

| Question | Primary store | Supporting stores | Why |
|---|---|---|---|
| URL shortener (#1) | Postgres/MySQL for mappings at moderate scale; KV/DynamoDB-style at massive scale | Redis/CDN cache; analytics event store | Key lookup by short code; relational is fine until scale forces partitioned KV. |
| Chat (#3) | Cassandra/DynamoDB-style wide-column for messages; Postgres for users/workspaces | Redis for presence; object storage for media | Append-heavy, read recent messages by `conversation_id`; metadata needs relational constraints. |
| News feed (#4) | Postgres/Cassandra for posts; denormalized feed store/cache | Redis feed cache; object storage/CDN for media | Feed is a precomputed read model; source post data can be separate. |
| Booking (#8) | Postgres/MySQL | Redis only for cache/holds with DB authority | Seat uniqueness and payment state need transactions/locks/constraints. |
| Payments/wallet (#16) | Relational ledger (Postgres/MySQL) | Kafka/outbox for downstream; cache only for read views | Double-entry ledger and idempotency need durable ACID writes. |
| Metrics/ad clicks (#20) | Time-series/OLAP store (ClickHouse/Druid/Influx/Prometheus-style) | Kafka/Flink stream; object storage archive | High write volume, time-window aggregations, retention/downsampling. |
| Post search (#17) | Source in Postgres/Cassandra; Elasticsearch/OpenSearch index | CDC/outbox into search | Inverted index for text; DB remains source of truth. |
| KV store (#10) | Dynamo/Cassandra/RocksDB-like partitioned KV | Replication/quorum layer | The whole question is building a partitioned KV system. |

### SQL vs NoSQL myths

| Myth | Better version |
|---|---|
| "SQL does not scale." | SQL scales vertically, with replicas, partitioning and sharding; cross-shard joins/transactions are the hard part. |
| "NoSQL is faster." | NoSQL is faster for the access patterns it is designed for; it may be worse for ad-hoc queries and constraints. |
| "NoSQL means no schema." | There is always a schema; it may live in app code, docs, validators or consumers instead of the database. |
| "SQL is strongly consistent, NoSQL is eventually consistent." | Products vary. Postgres has strong transactions; MongoDB has transactions; Cassandra offers tunable consistency; DynamoDB has conditional writes/transactions. |
| "Joins are bad." | Local indexed joins are powerful. Distributed/hot-path joins are what you avoid. |
| "One database should do everything." | Serious systems combine source-of-truth stores with derived caches, search indexes and analytics stores. |

### Common interview traps

- Picking MongoDB because "JSON is flexible" when the core problem is seat/payment correctness.
- Picking Cassandra for payments without explaining idempotency, compare-and-set, ledger design and reconciliation.
- Saying "Elasticsearch database" as the only source of truth for user posts; search indexes are rebuildable derived data.
- Forgetting query direction: a schema designed for `user -> posts` may not answer `post -> comments` cheaply.
- Treating denormalisation as free. Every duplicate copy needs an update/rebuild/staleness story.
- Over-indexing before naming the access patterns. Indexes are part of the model, not decoration.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why is "which database should I use?" the wrong first question?</summary>

Because the right choice depends on access patterns and invariants. Start with entities, reads, writes, scale, consistency and failure requirements. Only then map to relational, document, KV, wide-column, graph, search or time-series.
</details>

<details><summary>2. Give one case where document storage is better than relational, and one where it is worse.</summary>

Better: a product catalog or board settings object that is usually fetched as one nested aggregate and has flexible optional fields. Worse: bookings/payments where cross-entity constraints, joins and transactions are core requirements.
</details>

<details><summary>3. What is schema-on-read, and what bug does it move from write time to read time?</summary>

Schema-on-read stores flexible data and interprets it when querying. It moves validation/type-shape bugs to readers: missing fields, old versions, strings where numbers were expected, and consumers disagreeing about meaning.
</details>

<details><summary>4. In a chat system, why might messages use a wide-column store while workspace/user data uses Postgres?</summary>

Messages are append-heavy and read by `conversation_id` with time ordering, which maps well to a wide-column partition. Workspace/user data has relationships, permissions and constraints, which are simpler in Postgres.
</details>

<details><summary>5. Normalisation vs denormalisation: what changes operationally?</summary>

Normalisation keeps one fact in one place and joins at read time. Denormalisation duplicates facts for faster reads, so writes/backfills must update multiple copies and readers may see stale data.
</details>

<details><summary>6. Why is Elasticsearch usually not the source of truth?</summary>

Search indexes are derived, optimized for token lookup/ranking and may lag or need rebuilding. Keep canonical posts/products/users in a durable source store, then feed Elasticsearch via CDC/outbox/events.
</details>

<details><summary>7. Which database would you choose for a payment ledger in an interview, and what phrase would you say?</summary>

A relational store such as Postgres/MySQL. Interview phrase: "The ledger is the source of truth, so I want ACID transactions, unique idempotency keys, immutable entries and constraints; caches/search/streams are derived."
</details>

<details><summary>8. What is the practical meaning of "NoSQL has no joins"?</summary>

It usually means the database does not make arbitrary joins cheap or central. You model data around queries, denormalise, maintain secondary views, or join in the application for small bounded cases.
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
| **DDIA ch 2: Data Models and Query Languages** (1st ed) | Whole chapter for relational vs document vs graph; focus on how data models shape query languages | [PDF p.49](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=49>) |
| ↳ Relational Model Versus Document Model | object-relational mismatch, many-to-one/many-to-many relationships, document vs relational trade-offs | [p.50](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=50>) |
| ↳ Query Languages for Data | declarative SQL vs imperative/query APIs; why query planners matter | [p.64](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=64>) |
| ↳ Graph-Like Data Models | property graphs and Cypher-style traversal; read as a preview, not a default choice | [p.71](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=71>) |
| [Hello Interview: Data Modeling](https://www.hellointerview.com/learn/system-design/core-concepts/data-modeling) | Headings verified: Database Model Options → Relational Databases (SQL) → Document Databases → Key-Value Stores → Wide-Column Databases → Graph Databases → Schema Design Fundamentals → Start with Requirements → Entities, Keys & Relationships → Indexing for Access Patterns → Normalization vs Denormalization → Scaling and Sharding → Conclusion | ~35 min |

**Connects to:** [B2 Indexes](B2-Indexes.md) · [B3 Transactions](B3-Transactions-Isolation.md) · [B4 Replication](B4-Replication.md) · [B5 Sharding](B5-Sharding.md) · [H2 Search](../H-Geo-Search-Counting/H2-Search.md) · [H6 Time-series](../H-Geo-Search-Counting/H6-Time-Series.md)
