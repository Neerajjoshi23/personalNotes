# B2 · Indexes: make reads fast without lying about the cost

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** every DB-backed question: URL shortener (#1), Chat (#3), News feed (#4), Booking (#8), Location search (#9), KV store (#10), Autocomplete (#14), Post search (#17), Metrics (#20).

---

## Why this topic matters

An index is the difference between "scan 500 million rows" and "jump to the 50 rows you need". In interviews, indexes are how you justify that a database choice can actually serve the API you drew.

But indexes are not magic. They are **extra data structures** maintained on writes. Every index improves some reads and makes writes/storage/maintenance more expensive.

| Without index | With the right index |
|---|---|
| Scan all rows and filter | Seek to a range/key and read a small set |
| Query latency grows with table size | Query latency grows with result size + tree/log work |
| Writes are simple | Writes must update table + every index |
| Few operational knobs | Need index design, EXPLAIN, compaction/vacuum/rebuild awareness |

**Interview line:** "I'll create indexes from the API access patterns, not from column names. For the hot query `conversation_id + created_at`, the index order must match equality first, then range/order."

---

## Part 1: what an index really is

A database index is a redundant structure that maps searchable keys to rows/documents.

```text
Table: messages
(id, conversation_id, sender_id, created_at, body)

Index on (conversation_id, created_at DESC):
conversation_id=c7
  2026-09-30T18:00 -> row pointer 991
  2026-09-30T17:59 -> row pointer 982
  2026-09-30T17:58 -> row pointer 970
```

For this query:

```sql
SELECT id, sender_id, body, created_at
FROM messages
WHERE conversation_id = 'c7'
ORDER BY created_at DESC
LIMIT 50;
```

The DB can jump to the `c7` section and read the newest 50 entries. Without the index, it may scan and sort a huge table.

### The planner chooses a path

SQL is declarative: you describe what you want. The optimizer chooses how:

- sequential scan,
- index scan,
- bitmap index scan,
- nested loop/hash/merge join,
- sort or avoid sort via index order.

`EXPLAIN` tells you that chosen plan. You do not need to become a DBA for HLD, but you should know the basics:

```sql
EXPLAIN ANALYZE
SELECT * FROM bookings
WHERE show_id = 42 AND status = 'HELD'
ORDER BY expires_at
LIMIT 100;
```

Look for:

- **Seq Scan** on a huge table: maybe missing/unused index.
- **Index Scan** using the expected index.
- **Rows estimated vs actual:** bad estimates can lead to bad plans.
- **Sort** on a large set: maybe index order does not match `ORDER BY`.
- **Execution time + buffers:** real cost, not just theory.

---

## Part 2: B-trees, hash indexes and the left-prefix rule

### B-tree: the default OLTP index

Most relational indexes are B-tree/B+tree style: sorted keys in pages, with a shallow tree from root to leaves.

```text
                 [ root ]
              /     |      \
        [10..20] [21..40] [41..80]
          /  \       |       /  \
       leaves linked in sorted order  -> range scan is cheap
```

Why B-trees are popular:

- equality lookup: `id = 42`,
- range lookup: `created_at BETWEEN ...`,
- ordered scans: `ORDER BY created_at`,
- prefix of composite indexes,
- predictable read latency.

They are excellent for Postgres/MySQL OLTP workloads.

### Hash index: equality only

A hash index maps `hash(key) -> bucket -> row pointer`. It is good for equality and bad for range/order.

```text
user_id -> hash -> bucket -> rows
```

Use it mentally for KV stores and in-memory maps. In SQL interviews, B-tree is usually the safe default unless the product specifically exposes hash indexes.

### Composite indexes and column order

Composite index order matters. For an index:

```sql
CREATE INDEX idx_messages_conv_time
ON messages (conversation_id, created_at DESC);
```

Good:

```sql
WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 50
WHERE conversation_id = ? AND created_at < ?
```

Not good as the only index:

```sql
WHERE created_at > now() - interval '1 day'
```

The DB can efficiently use the **left prefix**: first column, then second within the first, and so on. General rule:

1. equality columns first,
2. then range/order column,
3. then included/covered columns if useful.

Examples:

| Query | Good index | Why |
|---|---|---|
| User's latest orders | `(user_id, created_at DESC)` | equality on user, order/range by time |
| Active holds for a show | `(show_id, status, expires_at)` | filter show/status, scan expiry order |
| Idempotency lookup | `(merchant_id, idempotency_key)` unique | scoped uniqueness |
| Feed page | `(user_id, rank_time DESC, item_id)` | seek user's feed, stable pagination |

### Covering indexes

A covering index contains all columns needed for the query, so the DB may avoid visiting the base table.

```sql
CREATE INDEX idx_url_code_cover
ON urls (short_code)
INCLUDE (long_url, status, expires_at);
```

For URL shortener redirects, this can make the hot read path very fast. But covering indexes are larger, so they cost memory/storage and writes.

**Interview line:** "For the redirect path, `short_code` is the lookup key. If this remains in Postgres, I would make it a unique index and potentially cover `long_url/status` so the hot read avoids extra heap lookups."

---

## Part 3: LSM-trees, SSTables and compaction

B-trees update pages in place. LSM-tree databases take a different approach: optimize writes by appending and merging later. This powers systems like Cassandra, RocksDB/LevelDB and many distributed KV stores.

### The write path

```text
write(key, value)
   │
   ├── append to WAL / commit log (durability)
   ├── update in-memory memtable (sorted)
   ▼
when memtable full -> flush immutable SSTable to disk

Disk:
SSTable_1  SSTable_2  SSTable_3 ...
```

An **SSTable** (sorted string table) is an immutable sorted file. Because files are immutable, writes are sequential and fast.

### The read path

To read a key, the DB may check:

1. memtable,
2. newest SSTable,
3. older SSTables,
4. maybe Bloom filters to skip files that cannot contain the key.

That means reads can become expensive if many SSTables overlap.

### Compaction

Compaction merges SSTables in the background:

```text
SSTable A + SSTable B + tombstones
          │
          ▼
new SSTable C with latest values, deleted keys removed
```

Compaction reduces read amplification and reclaims deleted data, but it consumes disk IO/CPU and creates write amplification.

### The three amplifications ⏭ *Skip for interviews*

| Cost | Meaning | B-tree tendency | LSM tendency |
|---|---|---|---|
| **Write amplification** | One logical write causes multiple physical writes | page split/WAL/index updates | WAL + flush + repeated compactions |
| **Read amplification** | One logical read touches many structures | usually low point/range read | may check memtable + SSTables unless compacted |
| **Space amplification** | Extra disk used by old versions/indexes | indexes + bloat | overlapping SSTables + tombstones until compacted |

LSM fits append-heavy workloads such as chat messages, metrics and KV stores. B-trees fit mixed OLTP with rich queries and stable latency. This is not absolute; engines are highly optimized.

---

## Part 4: secondary, full-text and geo indexes

### Primary vs secondary index

- **Primary index / clustering key:** determines physical or logical order/partition access. In Cassandra, the partition key and clustering columns define the main access path.
- **Secondary index:** another lookup path over the same data.

Secondary indexes are easy on one node and hard in a sharded system. If user data is sharded by `user_id`, a secondary query by `email` needs either:

- a local search on every shard,
- a global index mapping `email -> shard + user_id`,
- or a different primary key/table.

That connects directly to [B5 Sharding](B5-Sharding.md).

### Inverted index for full-text search

A full-text search index maps token → documents.

```text
"drawboard" -> [post17, post81]
"webrtc"    -> [post9, post17, post42]
"adobe"     -> [post17, post44]
```

Search systems add tokenization, stemming, ranking, filters, phrase queries and relevance scoring. For post search (#17), say Elasticsearch/OpenSearch is a derived index fed by events/CDC, not the primary write store.

### Geo indexes preview

Location search (#9) needs spatial indexing:

- geohash/S2 cells,
- quadtrees,
- PostGIS GiST/SP-GiST indexes,
- Redis GEO for simple radius queries.

The important B2-level point: latitude/longitude is not just two normal range predicates. A bounding box can use ordinary indexes as a first filter, but real proximity ranking needs geo-aware indexing. Full detail is in [H1 Geospatial](../H-Geo-Search-Counting/H1-Geospatial.md).

---

## Part 5: choosing in an interview / cheat sheet

| Scenario | Index choice | Why |
|---|---|---|
| Fetch row by ID | primary key / unique B-tree | exact lookup, uniqueness |
| URL shortener redirect | unique index on `short_code`; maybe covering include `long_url,status` | hottest read path is one key |
| Chat messages | `(conversation_id, created_at DESC, message_id)` or wide-column clustering | equality on conversation, time-ordered range |
| Feed page | `(user_id, rank_time DESC, item_id)` | stable pagination by user timeline |
| Booking holds | `(show_id, status, expires_at)` plus unique constraint on seat | find holds and enforce correctness |
| Idempotent payment | unique `(merchant_id, idempotency_key)` | retry returns same result, no double charge |
| Text search | inverted index | token lookup and ranking |
| Nearby drivers | geo index/geohash cells | spatial filtering before ranking |
| Metrics by time | time-partitioned/LSM/columnar index | high write rate and range-by-time scans |

### Index costs on writes

Every insert/update/delete must update relevant indexes. A table with 8 indexes may make writes much slower than a table with 2. Costs:

- more disk and memory,
- more WAL/replication bandwidth,
- slower inserts and updates,
- background maintenance (vacuum/compaction),
- lock/build overhead for new indexes,
- planner confusion if indexes overlap.

Do not index every column. Index the **promised API queries** and high-cardinality filters/orderings.

### EXPLAIN basics for interviews

You do not need exact planner math. Say this:

> "I would verify the hot queries with EXPLAIN ANALYZE: make sure the DB uses the composite index, estimate vs actual rows is close, no large sort appears on the hot path, and pagination uses a cursor rather than offset scanning deep pages."

### Common interview traps

- Indexing `(created_at, conversation_id)` for `WHERE conversation_id=? ORDER BY created_at`; wrong column order.
- Assuming an index always helps; low-selectivity columns like `status` alone may not.
- Forgetting write cost and storage cost.
- Saying "add an index" for full-text or geo without naming inverted/geo index types.
- Deep `OFFSET 1000000 LIMIT 50` pagination; use cursor/keyset pagination.
- Ignoring sharded secondary indexes; a local index on each shard is not a global lookup.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What is an index, in one precise sentence?</summary>

An index is a redundant data structure, maintained on writes, that maps one or more search keys to row/document locations so reads can avoid scanning the whole dataset.
</details>

<details><summary>2. For chat messages loaded by conversation and newest-first time, what composite index order do you choose?</summary>

`(conversation_id, created_at DESC, message_id)` or equivalent clustering. Equality column first (`conversation_id`), then range/order column (`created_at`), then a tiebreaker for stable pagination.
</details>

<details><summary>3. Why does a B-tree support range scans while a hash index does not?</summary>

B-tree leaves are sorted and linked, so after finding the first key the DB can scan forward. Hash indexes scatter keys by hash value, so adjacent values are not stored near each other.
</details>

<details><summary>4. What is an SSTable, and why do LSM databases use compaction?</summary>

An SSTable is an immutable sorted on-disk file flushed from a memtable. Compaction merges SSTables, keeps latest values, removes tombstones and reduces read/space amplification, at the cost of background IO/write amplification.
</details>

<details><summary>5. What is a covering index?</summary>

An index that contains all columns needed by a query, allowing the database to answer from the index alone without fetching the base row/table page. It speeds reads but increases index size and write cost.
</details>

<details><summary>6. Why can a secondary index be hard in a sharded database?</summary>

If data is partitioned by one key but queried by another, a local secondary index only helps within one shard. A global lookup needs fan-out to all shards, a global index, or a different table keyed by the query field.
</details>

<details><summary>7. What would you check in EXPLAIN ANALYZE for a hot query?</summary>

Whether it uses the expected index, avoids scanning/sorting huge row sets, has reasonable estimated vs actual rows, and returns in acceptable time. For pagination, check that it uses keyset/cursor predicates instead of deep offset scans.
</details>

<details><summary>8. Why is "index every field users filter by" a bad rule?</summary>

Each index costs storage and write/replication/maintenance overhead, and low-selectivity or wrong-order indexes may not help. Index the hot access patterns and verify with query plans.
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
| **DDIA ch 3: Storage and Retrieval** (1st ed) | Storage engines; especially hash indexes, SSTables/LSM-trees, B-trees and compaction | [PDF p.91](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=91>) |
| ↳ Data Structures That Power Your Database | hash indexes → SSTables/LSM-trees → B-trees → comparing B-trees and LSM-trees | [p.92](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=92>) |
| ↳ Transaction Processing or Analytics? | skim for why OLTP vs OLAP storage differs | [p.112](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=112>) |
| ↳ Column-Oriented Storage | skim as a preview for metrics/OLAP stores | [p.117](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=117>) |
| [Hello Interview: Database Indexing](https://www.hellointerview.com/learn/system-design/core-concepts/db-indexing) | Headings verified: How Database Indexes Work → Physical Storage and Access Patterns → Cost → Types of indexes → B-Tree Indexes → LSM Trees → Hash Indexes → Geospatial Indexes → Inverted Indexes → Index Optimization Patterns → Composite Indexes → Covering Indexes → Wrapping Up | ~30 min |
| [Use The Index, Luke: Anatomy of an Index](https://use-the-index-luke.com/sql/anatomy) | Main page plus headings/content around B-tree structure and "Clustered Indexes" | ~20 min |
| [Use The Index, Luke: The Where Clause](https://use-the-index-luke.com/sql/where-clause) | The Where Clause chapter; focus on equality/range predicates, combined indexes and why functions/expressions can block index use | ~25 min |

**Connects to:** [B1 Data Models](B1-Data-Models-DB-Choice.md) · [B5 Sharding](B5-Sharding.md) · [H1 Geospatial](../H-Geo-Search-Counting/H1-Geospatial.md) · [H2 Search](../H-Geo-Search-Counting/H2-Search.md) · [H6 Time-series](../H-Geo-Search-Counting/H6-Time-Series.md)
