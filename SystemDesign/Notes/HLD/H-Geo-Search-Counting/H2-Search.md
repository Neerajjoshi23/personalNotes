# H2 · Search: from keywords to ranked posts

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Post / tweet search (#17), News feed / Twitter (#4), Yelp / location search (#9), Web crawler (#7), Instagram / photo sharing (#11)

---

## Why this topic matters

Most product search is **not** a SQL `LIKE '%word%'` problem. Users expect typo-tolerant, ranked, filterable results in tens of milliseconds while writes keep happening in the primary product database. That is why search usually becomes a **derived data system**: Postgres/MySQL stores the source of truth, and a search index stores a query-optimised view.

| Requirement | What search adds |
|---|---|
| Keyword lookup | Inverted index: term → matching documents |
| Relevance | Ranking: term frequency, rarity, field boosts, freshness, popularity |
| Filters | Precomputed doc values / bitsets for author, time, language, privacy |
| Scale | Shards, replicas, caches, async indexing |
| Product correctness | CDC / outbox so search eventually matches the primary DB |

For an interview, search is a great place to show that you know the difference between **transactional data** and **derived indexes**. It also connects to your DrawBoard/Adobe world: a meeting product may store recordings, transcripts and chat in Postgres/S3, but search over transcripts belongs in a search index.

---

## Part 1: the inverted index mental model

A relational index maps from a key to rows. A search index maps from **terms** to documents. The core structure is the **inverted index**.

```
Documents
D1: "redis cache patterns"
D2: "postgres full text search"
D3: "cache invalidation and search indexing"

Inverted index
and      -> [D3]
cache    -> [D1, D3]
full     -> [D2]
indexing -> [D3]
postgres -> [D2]
redis    -> [D1]
search   -> [D2, D3]
text     -> [D2]
```

In a real engine, each posting is richer than just a document id:

```
term -> [
  { docId: 42, termFrequency: 3, positions: [7, 18, 91], fields: title|body },
  { docId: 99, termFrequency: 1, positions: [4], fields: body }
]
```

Positions enable phrase queries like `"system design"`. Field information lets `title:redis` rank higher than `body:redis`. The engine can intersect postings lists for `redis AND cache`, union them for `redis OR cache`, and subtract for `redis NOT cluster`.

A simple query flow:

```
query text -> analyzer -> terms -> postings lists -> filter -> score -> top N docs
                          "cache"      [D1,D3]     author=me   BM25       page
```

**Interview line:** "I'll keep the source of truth in the primary DB, but search will read from an inverted index because keyword lookup is term-to-document, not row-to-key. The search index is a derived view kept in sync asynchronously."
### Tokenisation and analyzers

Search quality starts before indexing. An **analyzer** turns raw text into canonical terms. Elasticsearch analyzers are a pipeline: character filters, tokenizer, then token filters.

| Step | Example | Why it matters |
|---|---|---|
| Character filter | strip HTML, normalize quotes | User-visible text often contains markup or pasted content |
| Tokenizer | split "Connect-Pro meeting" into words | Defines what a searchable unit is |
| Lowercase / normalise | `Search` → `search` | Case-insensitive matching |
| Stop-word removal | drop "the", "a" sometimes | Smaller index; can hurt phrase queries if overdone |
| Stemming / lemmatisation | `running` → `run` | Better recall; can hurt precision |
| Synonyms | `tv` ↔ `television` | Product-specific relevance |
| Edge n-grams | `ad`, `ado`, `adob`, `adobe` | Autocomplete-style prefix matching |

The analyzer used at **index time** and **query time** must be compatible. If posts are indexed with stemming but queries are not, matching becomes confusing. Multilingual products often use different analyzers per language.

For posts/tweets, you usually index multiple fields: `authorName`, `body`, `hashtags`, `mentions`, `createdAt`, `likeCount`, `visibility`, maybe `language`. Hashtags and usernames need special tokenisation: `#SystemDesign` should probably be searchable as `systemdesign`, `system`, and `design` depending on product needs.

---

## Part 2: ranking basics: TF-IDF and BM25 without the maths rabbit hole

A search engine could return every document containing `redis`, but users want the **best** documents first. Ranking asks: "given this query, which document is most relevant?"

The classic intuition is TF-IDF:

| Idea | Meaning |
|---|---|
| Term frequency (TF) | If `redis` appears many times in a document, the document is probably about Redis |
| Inverse document frequency (IDF) | If a term is rare across the corpus, it is more informative than a common term |
| Field boost | A match in title/hashtags/author can matter more than a match in body |
| Length normalisation | A long document should not win just because it has more words |

BM25 is the modern default scoring idea in Elasticsearch/Lucene. You do not need to derive it in an HLD interview. Say: it is a TF-IDF-like ranking function that saturates term frequency and normalises document length, so repeating a word 100 times does not make a bad post rank first.

Production ranking then adds product signals:

| Signal | Example use |
|---|---|
| Freshness | Tweets/posts usually favour recent results |
| Engagement | Likes, replies, shares, click-through rate |
| Social graph | Posts by people you follow score higher |
| Personalisation | Your language, location, blocked users, past clicks |
| Safety / policy | Hide private, deleted, spam or reported content |

A common scoring shape is:

```text
final_score = text_score
            + freshness_boost
            + social_boost
            + engagement_boost
            - spam_penalty
```

Be careful: likes are high-write-volume counters. The primary search document should not be reindexed on every like. Either batch engagement updates, maintain separate ranking features, or accept slight staleness.

For pagination, never say "offset 1,000,000" for large result sets. Deep offsets force the engine to score and skip many hits. Prefer `search_after` / cursor pagination with a stable sort key like `(score, createdAt, docId)`. For feeds and search, also define what happens if the index changes between pages: usually cursor-based pagination gives a stable-enough user experience, not a serializable snapshot.

---

## Part 3: Elasticsearch architecture and near-real-time indexing

Elasticsearch is a distributed search engine built on Lucene. The terms to know:

| Term | Meaning |
|---|---|
| Document | JSON object you index and search |
| Index | Logical collection of documents, like `posts_v7` |
| Mapping | Field types and analyzers: text, keyword, date, geo, numeric |
| Primary shard | A partition of an index that owns writes for its slice |
| Replica shard | Copy of a primary shard for availability and read scaling |
| Node | Server in the cluster |
| Coordinating node | Receives a query, fans out to shards, merges top results |

```
Client
  |
  v
Coordinating node
  |-- query shard 0 primary/replica -> local top 20
  |-- query shard 1 primary/replica -> local top 20
  |-- query shard 2 primary/replica -> local top 20
  v
merge, rerank, return global top 20
```

### Shards and replicas

Sharding splits the index. If `posts` has 6 primary shards, each document routes to one shard, often by hashing document id or a routing key. Replicas copy primaries. Replicas help reads and availability, but every write must also replicate, so replicas are not free.

Too few shards: one shard grows huge and hard to move. Too many shards: cluster metadata, heap usage and query fan-out overhead go up. In an interview, you do not need exact shard sizing. Say you would start with a reasonable shard count based on expected data and reindex/roll over by time or version when needed.

### Near-real-time refresh

Elasticsearch is **near-real-time**, not instantly consistent. A write is indexed into Lucene segments and becomes searchable after a refresh. The default refresh interval is commonly around one second, but teams tune it. Lower refresh interval gives fresher search but costs more CPU/IO; higher interval improves indexing throughput but increases visible lag.
This is the right consistency story for posts/tweets: after creating a post, the author can see it from the primary DB immediately, while global search may show it after a short delay. For legal, payment or moderation workflows, you may need stricter read paths.

### Mappings matter

`text` fields are analyzed for full-text search. `keyword` fields are exact values for filters, sorting and aggregations. A typical post mapping might have:

```json
{
  "body":      { "type": "text", "analyzer": "english" },
  "hashtags":  { "type": "keyword" },
  "authorId":  { "type": "keyword" },
  "createdAt": { "type": "date" },
  "likeCount": { "type": "long" },
  "visibility":{ "type": "keyword" }
}
```

A bad mapping is painful to fix because changing analyzers usually requires **reindexing** into a new index, then switching an alias (`posts_current`) to the new index. That is a good interview deep dive: blue/green index migration.

---

## Part 4: keeping search in sync with the primary DB

The primary DB owns correctness. Search is derived. The hard part is not building an inverted index; it is keeping it up to date when posts are created, edited, deleted, liked and permissioned.

Bad approach:

```
app -> write DB
app -> write Elasticsearch
```

If the DB write succeeds but the Elasticsearch write fails, search misses the post. If Elasticsearch succeeds but the DB transaction rolls back, search shows a ghost. Retrying inside the request path makes latency and failure handling worse.

Better approaches:

### Option A: transactional outbox

```
App transaction:
  INSERT post
  INSERT outbox_event(type='PostCreated', post_id=...)

Outbox relay -> Kafka/SQS -> indexer -> Elasticsearch
```

The DB write and event write commit together. A relay publishes outbox rows. The indexer is idempotent: indexing `post_id=42` twice overwrites the same document.

### Option B: CDC from the database log

```
Postgres WAL / MySQL binlog -> Debezium/Kafka -> indexer -> Elasticsearch
```

CDC reads the database's change log, so it captures changes without asking every application path to publish events. It is excellent when many services write the same tables. The trade-off is operational complexity and schema evolution.

### Deletes, privacy and ordering

Search bugs are often privacy bugs. If a post becomes private or deleted, the index must hide it quickly. Design for:

- **Tombstones:** delete events should remove or mark the document, not be ignored because the DB row is already gone.
- **Ordering:** an old `PostUpdated` event should not overwrite a newer `PostDeleted`. Include version/updatedAt and reject stale events.
- **Backfill:** if the index is corrupted or mapping changes, run a batch reindex from the source DB.
- **Dead-letter queue:** poison events should not stop all indexing; alert and fix them.
- **Lag metrics:** measure DB commit timestamp → searchable timestamp.

For DrawBoard, the same pattern would index board titles, comments or transcripts from Supabase/Postgres. The room service should not synchronously write a search engine for every whiteboard stroke; search indexes human-readable metadata and text, not the CRDT update stream itself.

---

## Part 5: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Small admin app, a few thousand rows | Postgres full-text search | Simpler ops; transactional enough; good for basic keyword search |
| Product search over posts/tweets with ranking | Elasticsearch/OpenSearch | Inverted index, ranking, analyzers, filters, distributed search |
| Prefix autocomplete | Trie / prefix index / edge n-grams | Query is prefix lookup, not full document ranking |
| Search must hide private/deleted content | Filter in the index plus DB fallback for sensitive reads | Search is derived and can lag; permissions need explicit design |
| Heavy write counters like likes | Batch feature updates or separate ranking store | Reindexing every like is expensive |
| Multi-tenant SaaS | Tenant filter in every query, maybe routing by tenant | Prevent cross-tenant leaks and reduce shard fan-out |
| Deep pagination | Cursor / `search_after` | Offset pagination is expensive and unstable |

### When Postgres full-text is enough

Use Postgres full-text search when:

- The dataset is modest and fits the DB's CPU/IO budget.
- You need simple keyword search, not complex relevance tuning.
- You value transactional freshness and simpler operations.
- Search traffic is not the dominant load.
- You can live with Postgres ranking primitives and GIN indexes.

Move to Elasticsearch/OpenSearch when:

- Search needs separate scaling from OLTP writes.
- Relevance, analyzers, synonyms, typo tolerance, highlighting or faceting matter.
- Query traffic or corpus size would hurt the primary DB.
- You need many replicas for low-latency search.

**Interview line:** "I would start with Postgres FTS for an internal tool, but for public tweet search I would use Elasticsearch because ranking, analyzers, filters, pagination and independent scaling matter more than strict transactional freshness."

### Common interview traps

- Saying `LIKE '%term%'` for large full-text search.
- Forgetting that search is **eventually consistent** with the primary DB.
- Reindexing on every like/view counter update.
- Using offset pagination for deep result pages.
- Filtering private content only in the application after fetching too many hits.
- Ignoring analyzer choice, so hashtags, usernames and languages behave badly.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What is an inverted index, and why is it better than a normal DB index for keyword search?</summary>

An inverted index maps each term to the documents containing it, often with positions and term frequencies. Keyword search starts from terms, so this avoids scanning rows or doing slow substring matches. A normal DB index maps field values to rows and is not enough for multi-term relevance-ranked text search.
</details>

<details><summary>2. What is an analyzer? Give three decisions it makes.</summary>

An analyzer converts raw text into indexable/searchable tokens. It decides tokenisation, lowercasing/normalisation, stemming or lemmatisation, stop-word handling, synonyms, and sometimes edge n-grams for prefixes.
</details>

<details><summary>3. Explain TF-IDF/BM25 in interview words.</summary>

Documents score higher when query terms appear in important fields and appear enough times, but rare terms matter more than common terms. BM25 is a TF-IDF-like ranking function that prevents term-frequency spam and normalises document length.
</details>

<details><summary>4. Why is Elasticsearch called near-real-time?</summary>

A document write is not necessarily searchable immediately. It becomes visible after the index refresh cycle creates/searches new segments. This is often around a second but is tunable. Lower delay costs throughput; higher delay improves indexing efficiency.
</details>
<details><summary>5. Why is dual-writing to the DB and search index risky?</summary>

One write can succeed while the other fails, leaving DB and search inconsistent. A DB rollback can leave a ghost search document, or an index failure can hide a committed post. Use outbox or CDC so the search update is derived reliably from committed DB changes.
</details>

<details><summary>6. A deleted private post still appears in search. What design points should you mention?</summary>

Deletes/privacy changes need tombstone or update events, version checks so stale updates cannot resurrect deleted content, fast indexing priority for safety events, tenant/user visibility filters in the index, and lag/failed-event alerts. For very sensitive data, verify permissions against the primary store before showing details.
</details>

<details><summary>7. Why is deep offset pagination bad for search?</summary>

The engine still has to collect, sort and skip all earlier hits, which is expensive and unstable as the index changes. Use cursor pagination such as `search_after` with a deterministic sort key like score, timestamp and document id.
</details>

<details><summary>8. When is Postgres full-text search the right answer?</summary>

For smaller or internal systems where simple keyword search is enough, operational simplicity matters, freshness matters, and the primary DB can handle the load. Move to Elasticsearch when relevance tuning, distributed scale, analyzers, faceting or independent search scaling become important.
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
| [Hello Interview: Elasticsearch](https://www.hellointerview.com/learn/system-design/deep-dives/elasticsearch) | Exact headings: "Basic Concepts" → "Documents" / "Indices" / "Mappings and Fields"; "Basic Use" → "Set a Mapping" / "Search" / "Pagination and Cursors"; "How it works"; "Cluster Architecture" → "Node Types" / "Data Nodes" / "Coordinating Nodes"; "In Your Interview" | ~45 min |
| [Hello Interview: FB Post Search](https://www.hellointerview.com/learn/system-design/problem-breakdowns/fb-post-search) | Exact headings: "High-Level Design" → "Create an Inverted Index" / "Multiple Indexes"; "Potential Deep Dives" → "Use a distributed cache alongside our search service" / "Use a CDN to cache at the edge" / "Bigrams or Shingles" / "Two stage architecture"; "Final Design" | ~45 min |
| [PostgreSQL docs: Full Text Search](https://www.postgresql.org/docs/current/textsearch.html) | Chapter 12 overview: use it to compare Postgres FTS against a dedicated search engine | ~20 min |

**Connects to:** [B2 Indexes](../B-Data/B2-Indexes.md) · [D4 Outbox + CDC](../D-Async/D4-Outbox-CDC.md) · [C1 Cache patterns](../C-Caching/C1-Cache-Patterns.md) · [H3 Autocomplete](H3-Autocomplete.md) · Questions: Post / tweet search (#17), News feed (#4), Web crawler (#7)