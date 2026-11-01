# H5 · Approximate Counting: tiny memory, useful answers

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Top-K / trending / leaderboard (#15), Web crawler dedup (#7), Ad click aggregator / metrics monitoring (#20), News feed / Twitter (#4), URL shortener analytics (#1)

---

## Why this topic matters

At scale, exact counts can be too expensive. "How many unique users saw this ad?" and "what are the top trending hashtags this minute?" may involve millions of events per second. You often need an answer that is **small, fast and close enough**.

Approximate data structures trade accuracy for memory and speed.

| Question | Exact approach | Approximate approach |
|---|---|---|
| Have we seen this URL? | Hash set of all URLs | Bloom filter |
| How many distinct users? | Hash set of user ids | HyperLogLog |
| How often did item X appear? | Map item → count | Count-min sketch |
| What are heavy hitters? | Count every item then sort | Sketch + min-heap / Space-Saving-style top-K |

The interview skill is not memorizing formulas. It is knowing when approximation is acceptable, what error direction to expect, and where exactness is still required.

---

## Part 1: exact vs approximate counting

Exact counts are simple until cardinality explodes.

```text
exact frequency:  map<string, long> counts
exact distinct:   set<userId> uniqueUsers
```

Problems:

- Memory grows with the number of unique keys.
- Hot keys can create write contention.
- Cross-shard exact top-K requires expensive merging.
- Distinct counts over many dimensions (`adId x country x device x minute`) multiply storage.

Approximate structures bound memory in advance. They answer with a known error shape:

| Structure | Error shape |
|---|---|
| Bloom filter | False positives possible; false negatives not if used correctly |
| Count-min sketch | Overestimates counts; never underestimates with non-negative increments |
| HyperLogLog | Approximate distinct count with small relative error |

**Interview line:** "For billing and money I keep exact data. For dashboards, trending and abuse heuristics, I can use approximate structures because bounded error is acceptable and memory is predictable."

---

## Part 2: count-min sketch

A count-min sketch estimates item frequencies with a 2D array of counters and multiple hash functions.

```
width = w, depth = d

        columns 0..w-1
row 0: [0 0 0 0 0 ...]
row 1: [0 0 0 0 0 ...]
row 2: [0 0 0 0 0 ...]
```

On update `add(item, +1)`: hash item with each row's hash function and increment the selected counter in that row.

```
add("react")
row0[hash0("react") % w] += 1
row1[hash1("react") % w] += 1
row2[hash2("react") % w] += 1
```

On query `count(item)`, read the counters selected by each hash and return the **minimum**. Why minimum? Collisions only add counts from other items, so each row may overestimate. Taking the minimum chooses the least polluted estimate.

```
actual("react") = 100
row estimates = [100, 108, 103, 145]
answer = min = 100
```

The error-bound idea: with width roughly proportional to `1 / epsilon` and depth roughly proportional to `log(1 / delta)`, the estimate is at most `actual + epsilon * totalEvents` with probability at least `1 - delta`. You do not need to derive it; just know that more width reduces collision error and more depth reduces probability of a bad estimate.

Count-min sketch works for **non-negative increments**. If you decrement or mix positive and negative updates, the simple overestimate guarantee changes.

If two shards use the same width, depth and hash functions, merge by adding counters cell-by-cell. That makes it useful for distributed streams: each worker keeps a local sketch, then aggregate sketches periodically.

---

## Part 3: heavy hitters / top-K with a min-heap

Count-min sketch estimates the frequency of any item, but it does not by itself list the top items. You need candidate tracking.

```
for each event item:
  sketch.add(item)
  estimated = sketch.count(item)
  if item already in heap: update its score
  else if heap.size < K: push(item, estimated)
  else if estimated > heap.min.score: replace heap min with item
```

The min-heap holds K candidates with their estimated counts. The sketch answers "how big is this candidate?" The heap answers "which candidates are currently biggest?"

This is useful for trending hashtags, top search queries, popular videos and abuse signals.

Caveats:

- A low-frequency item can be overestimated due to collisions and enter the heap.
- If an item was not tracked as a candidate early, you need logic to add it when its estimate grows.
- For exact leaderboards, use exact counters / sorted sets. For trending detection, approximation is often fine.

In practice, systems also use time windows. Keep one sketch per minute or use decayed counts. Top-K for "last hour" can merge recent minute sketches or maintain a stream processor with windowed state.

---

## Part 4: HyperLogLog for distinct counts

Distinct counting asks: "how many unique users/items are in this stream?" Exact answer needs a set. HyperLogLog (HLL) gives a compact estimate.

Intuition:

- Hash each user id uniformly.
- Very rare hash patterns imply many distinct inputs.
- HLL tracks the maximum number of leading zero bits seen in many buckets/registers.
- Combine registers to estimate cardinality.

You do not need to implement HLL in interviews. Know the use case and API.

Redis exposes HLL through:

```text
PFADD page:2026-09-30 user123 user456 user789
PFCOUNT page:2026-09-30
PFMERGE page:week39 page:2026-09-30 page:2026-10-01 ...
```

Use cases:

| Metric | Why HLL fits |
|---|---|
| Daily active users | Unique users, small error acceptable |
| Unique ad viewers | Dashboard estimate; billing may need stricter path |
| Unique IPs hitting endpoint | Abuse/traffic analytics |
| Unique search users per query | Product analytics |

Trade-off: HLL gives cardinality, not membership. You cannot ask "was user123 included?" after adding them. For membership, use a set or Bloom filter.

---

## Part 5: Bloom filter recap and space/accuracy trade-offs

A Bloom filter tests set membership compactly.

- Add: hash item with k functions and set k bits.
- Query: if any bit is 0, item is definitely not present. If all are 1, item is probably present.

```
add("urlA") -> set bits [3, 19, 44]
contains("urlB") -> all bits set? maybe yes -> false positive possible
```

No false negatives if you never delete and use the same hash functions. False positives increase as the filter fills. Counting Bloom filters support deletion by using counters instead of bits, but with more memory and complexity.

Where it appears in system design:

- Web crawler URL dedup: avoid crawling the same URL repeatedly.
- Cache penetration protection: quickly reject keys that definitely do not exist.
- Time-series / LSM systems: avoid unnecessary disk reads for blocks that cannot contain a key.

### Space/accuracy trade-off table

| Need | Pick | Memory grows with | Wrong answer risk |
|---|---|---|---|
| Exact membership | Hash set | Unique items | None, but expensive |
| Probable membership | Bloom filter | Configured bits | False positives |
| Exact frequency | Hash map | Unique items | None |
| Approx frequency | Count-min sketch | width x depth | Overestimate |
| Exact distinct | Hash set | Unique items | None |
| Approx distinct | HyperLogLog | fixed registers | Small relative error |

For interviews, always state whether approximation can affect user-visible correctness. A false positive in a crawler means maybe you skip a URL. Acceptable? Usually yes at massive scale if tuned. A false positive in "has this payment been processed?" is not acceptable.

---

## Part 6: trending topics / top-K design sketch

Goal: return top K trending topics over windows like last 5 minutes, hour and day.

```
post/tweet events
  -> Kafka
  -> stream processor
      - extract hashtags/topics
      - update per-window count-min sketches
      - maintain top-K candidate heaps
  -> Redis / OLAP store
  -> API: GET /trending?window=1h&country=IN
```

Key design points:

| Concern | Design |
|---|---|
| High write volume | Partition stream by topic hash or region |
| Windows | Per-minute sketches; merge for 5m/1h/day or use stream windows |
| Top-K query | Precompute and cache top lists; do not scan all topics per request |
| Regional trends | Include country/language in key; avoid global-only ranking |
| Spam | Downrank suspicious accounts; require unique users, not raw posts only |
| Freshness | Short windows and frequent publish; maybe compare to baseline |

A useful trend score is not just raw count. `#cricket` may always be high in India. Trending usually means "higher than its baseline". You can compare current window to previous windows, or use velocity.

Exact vs approximate choice:

- Exact Redis sorted sets (`ZINCRBY`) are fine for moderate scale and exact leaderboards.
- Count-min sketch + heap helps when the item universe is huge and memory must be bounded.
- HLL helps count unique users per topic so one bot cannot dominate with repeated events.

**Interview line:** "For trending, I would keep raw events for audit, precompute top-K per window and region, use sketches/HLL where memory is a bottleneck, and use exact counters for final small candidate sets if product correctness needs it."

---

## Part 7: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Exact bank/payment count | Exact DB/ledger | Approximation is unacceptable |
| Dashboard unique visitors | HyperLogLog | Small memory, acceptable error |
| Web crawler dedup | Bloom filter + persistent URL store | Avoid many duplicates cheaply |
| Trending hashtags at huge scale | Count-min sketch + candidate heap + HLL unique users | Bounded memory and spam resistance |
| Leaderboard with prizes | Exact sorted set / DB | User-visible ranking must be correct |
| Per-shard traffic summary | Mergeable sketches | Easy distributed aggregation |
| Cache nonexistent keys | Bloom filter | Prevent DB hits for impossible keys |

### Common interview traps

- Using approximate counts for money, inventory or prize-winning leaderboards.
- Forgetting that count-min sketch overestimates because of collisions.
- Thinking HyperLogLog can answer membership questions.
- Returning top-K from a sketch without tracking candidates.
- Ignoring time windows; all-time top-K is not the same as trending.
- Not mentioning spam/bot resistance for trends.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What does count-min sketch store?</summary>

A 2D array of counters with multiple hash functions. Each update increments one counter per row. A query hashes the item in every row and returns the minimum counter as the estimated frequency.
</details>

<details><summary>2. Why does count-min sketch overestimate, not underestimate?</summary>

Counters can include collisions from other items, so they can be higher than the true count. With non-negative increments, the true item's own increments are always included, so the estimate is not below the true count.
</details>

<details><summary>3. What do width and depth control in a count-min sketch?</summary>

More width reduces collision error; more depth reduces the probability that every row is badly polluted. The standard guarantee is roughly true count plus epsilon times total events with probability at least 1 minus delta.
</details>

<details><summary>4. Why do you need a heap or candidate set for top-K?</summary>

A sketch estimates counts for keys you ask about; it does not enumerate all keys. A heap/candidate tracker remembers likely heavy hitters so you can return a top-K list.
</details>

<details><summary>5. What is HyperLogLog good for, and what can it not answer?</summary>

It estimates distinct cardinality, like unique visitors, using tiny memory. It cannot tell whether a specific user was included and it does not store the original members.
</details>

<details><summary>6. Bloom filter false positives vs false negatives?</summary>

A normal Bloom filter can say "probably present" for an item that was never added (false positive). If used correctly without deletion, it does not say "definitely absent" for an added item (no false negatives).
</details>

<details><summary>7. How would you design trending topics for the last hour?</summary>

Ingest events, extract topics, partition the stream, maintain per-window counts/sketches and candidate heaps, optionally HLL for unique users, publish top-K per region/language/window to Redis or an OLAP store, and keep raw events for replay/audit.
</details>

<details><summary>8. When would Redis sorted sets beat approximate structures?</summary>

When scale is moderate or the result must be exact, such as a visible leaderboard or prize ranking. `ZINCRBY` and `ZREVRANGE` are simpler and exact, though memory grows with the number of members.
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
| [Hello Interview: Top K](https://www.hellointerview.com/learn/system-design/problem-breakdowns/top-k) | Exact headings: "High-Level Design" → all-time top K and tumbling windows; "Potential Deep Dives" → "Cache the Top K" / "Precompute the Top K" / "Maintain Aggregates for Each Window" / "Do Aggregation in Memory with Flink" / "What if we need to support sliding windows?" / "Can we make use of approximations" / "Real-time OLAP"; "Final Design" | ~45 min |
| [Redis HyperLogLog docs](https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/) | HyperLogLog page: commands `PFADD`, `PFCOUNT`, `PFMERGE`, memory/accuracy notes | ~20 min |
| [Wikipedia: Count–min sketch](https://en.wikipedia.org/wiki/Count%E2%80%93min_sketch) | Exact headings: "Data structure" → "Point Query" / "Inner Product" / "Merging Streams"; "Reducing bias and error". Open in browser if Wikipedia rate-limits. | ~20 min |
| [H4 Stream Aggregation](H4-Stream-Aggregation.md) | Windows and stream processing context for top-K over time | Local note |

**Connects to:** [H4 Stream Aggregation](H4-Stream-Aggregation.md) · [H6 Time-Series](H6-Time-Series.md) · [D2 Kafka](../D-Async/D2-Kafka.md) · Questions: Top-K / trending / leaderboard (#15), Web crawler (#7), Metrics (#20)