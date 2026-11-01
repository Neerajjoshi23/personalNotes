# H1 · Geospatial: finding nearby places, drivers and friends without scanning the planet

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Location search / Uber / Yelp / nearby friends (#9), E-commerce / Gopuff (#18), Search (#17), Top-K/trending by region (#15), Frontend maps/location experiences

---

## Why this topic matters

"Find restaurants within 5 km" sounds like a normal database query until you have millions of places or drivers. Latitude and longitude are two dimensions on a sphere. A plain B-tree is one-dimensional. If you index `(lat, lon)` and ask for a circle, the database cannot magically jump to exactly the points inside the circle.

Geospatial design appears in Uber, Yelp, Tinder, nearby friends, delivery apps and any product with local inventory. The correct answer depends on whether data is mostly static places (Yelp) or high-frequency moving objects (Uber drivers updating every few seconds).

| Product | Data shape | Typical approach |
|---|---|---|
| Yelp/proximity search | Places change slowly; reads dominate | Geohash/S2/PostGIS/Elasticsearch geo index + filters/ranking |
| Uber matching | Drivers move every ~few seconds; low-latency writes | In-memory geo index by region/cell + periodic persistence |
| Nearby friends | Moving users, privacy, fan-out | Geohash/S2 cells + pub/sub or polling; privacy filters |
| Gopuff/local delivery | Stores/dark warehouses + inventory | Static service areas + nearest warehouse/store lookup |

**Interview line:** "For static POIs like Yelp, I'd use a geospatial index in PostGIS/Elasticsearch or geohash cells. For Uber drivers, I keep active driver locations in memory/Redis by cell because writes are too frequent for a normal relational index hot path."

---

## Part 1: why a lat/long B-tree index fails for radius search

A B-tree is great when your predicate matches its ordering.

```sql
CREATE INDEX idx_places_lat_lon ON places(lat, lon);
```

This helps queries like `WHERE lat BETWEEN a AND b` because latitude is the first sorted key. But a radius query is a circle:

```sql
SELECT *
FROM places
WHERE distance(lat, lon, :user_lat, :user_lon) <= 5000;
```

The database cannot use a normal B-tree to evaluate arbitrary `distance()` for every row without scanning many candidates. A common improvement is a bounding box:

```sql
WHERE lat BETWEEN :min_lat AND :max_lat
  AND lon BETWEEN :min_lon AND :max_lon
```

Then compute exact distance for candidates.

```
Bounding box candidate set

+-------------------+
|   .       .       |
|      ( circle )   |  points in box but outside circle are false positives
|   .       .       |
+-------------------+
```

This is okay for small datasets or selective boxes. It breaks down when:

- the bounding box covers a dense city center;
- longitude ranges behave differently near poles;
- you need sorted nearest results, not just filter;
- moving-object updates constantly rewrite index entries.

So most real systems map 2D space into **cells** or use a spatial index.

---

## Part 2: geohash: turn nearby coordinates into string prefixes

Geohash encodes latitude/longitude into a base32 string. Longer prefix = smaller cell.

```text
geohash("Bangalore") ≈ td...

td        big region
 td2      smaller
 td2m     smaller
 td2m6    city/neighborhood-ish
```

The key property: points near each other often share a prefix. So you can store places by geohash prefix and query the cells covering a radius.

Simple flow:

1. Convert user lat/lon to geohash at chosen precision.
2. Fetch points from that cell and neighboring cells.
3. Compute exact haversine/spherical distance.
4. Sort/filter final results.

```
Query point X near cell edge

+-----+-----+-----+
|     |     |     |
+-----+--X--+-----+   need neighbors, not only X's cell
|     |     |     |
+-----+-----+-----+
|     |     |     |
+-----+-----+-----+
```

Important caveats:

| Issue | Explanation | Fix |
|---|---|---|
| Precision trade-off | Small cells mean many neighbor lookups; large cells mean many false positives | Pick precision by radius and density |
| Edge problem | A nearby point may be in adjacent cell with different prefix | Always query neighboring cells |
| Prefix discontinuity | Some physically close cells do not share long prefix | Neighbor expansion + exact distance |
| Density variation | One city cell can contain thousands, rural cells few | Adaptive precision or better spatial tree |

Geohash is easy to explain and implement. It is a strong interview default for Yelp-style "nearby places" when you do not need advanced GIS operations.

### Precision intuition

Do not memorize exact sizes. Say the principle:

- shorter prefix: bigger area, fewer queries, more false positives;
- longer prefix: smaller area, more precise, more neighbor expansion;
- final distance check is mandatory.

In code, the chosen precision can be configured based on radius: 1 km, 5 km, 50 km.

---

## Part 3: quadtrees, S2 and H3

A quadtree recursively splits 2D space into four quadrants.

```
World
+-----------------------+
|          |            |
|   NW     |    NE      |
|----------+------------|
|   SW     |    SE      |
|          |            |
+-----------------------+
```

If a quadrant is too dense, split it again. This adapts naturally to cities: Manhattan cells become small; rural cells stay large.

| Quadtree type | Meaning | Use |
|---|---|---|
| Static | Built over mostly fixed points | Places/restaurants/properties |
| Dynamic | Supports frequent inserts/moves/deletes | Moving drivers, but implementation is harder |
| In-memory | Tree lives in service memory | Low-latency matching, needs replication/sharding |
| Persistent | Stored in DB/search index | Easier durability, slower updates |

Query flow:

1. Find tree cells intersecting search radius.
2. Fetch candidate points from those cells.
3. Exact distance filter and rank.

Quadtrees are intuitive and appear in Alex Xu's proximity-search chapter. The trade-off is operational complexity: balancing, splitting, merging, sharding and updating moving objects.

### S2 and H3: names + idea

S2 and H3 are production-grade spherical cell systems.

- **S2** projects the sphere onto cube faces and subdivides cells hierarchically. Used widely for geospatial indexing.
- **H3** uses hexagonal-ish cells at multiple resolutions. Useful for analytics, heatmaps and region aggregation.

You do not need implementation details for this roadmap. In an interview, saying "S2/H3 give hierarchical cells on the sphere, avoiding some rough edges of hand-rolled geohash" is enough.

---
## Part 4: Redis GEO and PostGIS

You usually should not hand-build geo indexing if your storage already has it.

### Redis GEO

Redis GEO stores members with longitude/latitude and supports radius/box style queries. Internally it uses sorted-set ideas with geohash-like encoding.

Good for:

- active driver locations;
- nearby online users;
- fast in-memory candidate lookup;
- ephemeral locations with TTL/heartbeat logic.

Example shape:

```text
GEOADD drivers:bangalore 77.5946 12.9716 driver:123
GEOSEARCH drivers:bangalore FROMLONLAT 77.60 12.97 BYRADIUS 3 km ASC COUNT 50
```

Caveat: Redis is memory-first. You still need durability/event logs if locations matter historically. For Uber-style matching, active locations can be ephemeral; trips and payments are durable elsewhere.

### PostGIS

PostGIS adds spatial types and indexes to Postgres. You can store a `geography(Point, 4326)` and query `ST_DWithin` / `ST_Distance` with spatial indexes.

Good for:

- static POIs/businesses;
- delivery zones/polygons;
- admin tools and analytics;
- strong consistency with relational filters.

Example shape:

```sql
SELECT id, name
FROM restaurants
WHERE ST_DWithin(location, ST_MakePoint(:lon, :lat)::geography, 5000)
ORDER BY ST_Distance(location, ST_MakePoint(:lon, :lat)::geography)
LIMIT 50;
```

PostGIS is a great answer for Yelp if scale is moderate to high and you want correctness + rich GIS. If you need global search ranking with text + geo filters, Elasticsearch/OpenSearch geo fields are also common.

---

## Part 5: high-frequency location updates and Uber-style matching

Uber drivers may update location every few seconds. If 1 million drivers update every 4 seconds, that is 250k location updates/sec before riders even search. You do not want every heartbeat to be a heavy relational index update.

A common design:

```
Driver app -> location gateway -> region/cell location service
                             -> in-memory/Redis geo index
                             -> async durable log for history/analytics

Rider request -> matching service -> nearby active drivers from cells
                              -> filters/ranking/dispatch
```

Data kept in hot index:

| Field | Why |
|---|---|
| driver_id | candidate identity |
| lat/lon or cell | nearby lookup |
| last_update_time | expire stale drivers |
| availability | only match online/available drivers |
| vehicle type | filter by product |
| heading/speed | improve ETA/matching |

Location updates are usually partitioned by geography:

- region/city shard: `bangalore`, `delhi`, `mumbai`;
- within region, geohash/S2/H3 cells;
- each shard has a primary in-memory index and replicas/failover;
- stale drivers expire if heartbeat is older than threshold.

Matching is more than nearest point:

1. Fetch candidates from rider's cell and neighboring cells.
2. Filter unavailable/stale/wrong product.
3. Estimate ETA using road network or simpler distance approximation.
4. Rank by ETA, driver utilization, fairness, cancellation risk.
5. Offer trip to one or a small batch; handle timeout/reject.

Do not over-promise exact nearest driver. Real dispatch optimizes ETA and marketplace health, not raw haversine distance.

**Interview line:** "Driver locations are hot, ephemeral state. I keep them in a region-sharded in-memory geo index with TTL heartbeats, and persist an async stream for analytics. Trip records themselves go to the durable database."

---

## Part 6: Yelp vs Uber: same geo idea, different system

| Dimension | Yelp / places search | Uber / driver matching |
|---|---|---|
| Data | Businesses, mostly static | Drivers, constantly moving |
| Read/write ratio | Read-heavy | Heavy writes + low-latency reads |
| Storage | PostGIS/Elasticsearch/geohash DB | In-memory/Redis geo per region + stream |
| Query | "restaurants within 5 km, ranked" | "available drivers near rider now" |
| Ranking | Text relevance, rating, distance, open now | ETA, availability, product, fairness |
| Freshness | Minutes/hours usually okay for place metadata | Seconds matter; stale driver is bad |
| Durability | Business data durable | Active location ephemeral; trips durable |
| Privacy | Business locations public | User/driver location sensitive |

Yelp query example:

```text
Input: lat/lon + radius + query="pizza" + filters
1. Use geo index to get candidates in radius
2. Apply text/category filters
3. Rank by relevance + rating + distance + open_now
4. Cache popular searches by area/query
```

Uber query example:

```text
Input: rider lat/lon + product=UberGo
1. Find active drivers in nearby cells
2. Remove stale/unavailable drivers
3. Estimate ETA
4. Dispatch to best candidate(s)
5. Lock/claim driver for this trip offer briefly
```

The same geospatial primitives appear, but the architecture changes because the update pattern changes.

---

## Part 7: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Small app, few thousand places | Bounding box + exact distance | Simple and enough |
| Yelp-scale static places | PostGIS / Elasticsearch geo / geohash index | Rich filters, read-heavy, durable data |
| Simple nearby lookup in cache | Geohash prefixes + neighbor cells | Easy to explain and shard |
| Dense/uneven spatial data | Quadtree or S2/H3 hierarchical cells | Adapts to density and sphere better |
| Active moving drivers | Region-sharded in-memory/Redis GEO + TTL | High write rate and low-latency matching |
| Geo analytics/heatmaps | H3/S2 cells, aggregate by resolution | Natural rollups and visualization |
| Polygon/service area checks | PostGIS | Mature GIS functions and indexes |

### Common interview traps

- Creating `(lat, lon)` B-tree index and assuming radius search is solved.
- Returning all points in a geohash cell without exact distance filtering.
- Forgetting neighboring cells and missing points near cell boundaries.
- Using the same design for Yelp places and Uber drivers.
- Persisting every driver heartbeat synchronously to the main SQL database.
- Ranking by straight-line distance when ETA/road network matters.
- Ignoring privacy and stale-location expiry for nearby friends/drivers.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why does a normal B-tree on <code>(lat, lon)</code> not solve radius search?</summary>

A B-tree orders one dimension first, then the next. A radius query is a 2D circular predicate, often wrapped in a distance function. The index can help with a bounding box but still returns false positives and struggles with dense areas and nearest-neighbor ranking.
</details>

<details><summary>2. What is the geohash edge problem?</summary>

A query point near a cell boundary may have nearby results in adjacent cells with different prefixes. If you search only the current geohash prefix, you miss them. Query neighboring cells and do exact distance filtering.
</details>

<details><summary>3. How do you choose geohash precision?</summary>

Based on radius and density. Larger cells mean fewer lookups but more false positives; smaller cells mean more neighbor queries. Always tune and exact-filter.
</details>

<details><summary>4. When is a quadtree better than a fixed grid/geohash?</summary>

When density varies a lot. A quadtree can split dense city regions into smaller cells while keeping sparse regions large, reducing candidate explosion.
</details>

<details><summary>5. What are S2 and H3 in one sentence?</summary>

They are hierarchical cell systems for indexing the Earth's surface; S2 uses sphere/cube-style cells, and H3 uses hexagonal-ish cells useful for aggregation and spatial analysis.
</details>

<details><summary>6. Why are active driver locations often stored in memory/Redis rather than only Postgres?</summary>

The write rate is very high and freshness matters in seconds. Active locations are ephemeral and need fast nearby lookup with TTL expiry. Durable trip/payment data still belongs in the database; location history can be streamed asynchronously.
</details>

<details><summary>7. Yelp vs Uber: what is the biggest architectural difference?</summary>

Yelp is read-heavy over mostly static places, so PostGIS/Elasticsearch/geohash indexes work well. Uber has constant moving-driver writes and low-latency matching, so it needs region-sharded in-memory geo indexes and stale heartbeat handling.
</details>

<details><summary>8. Why do you still compute exact distance after fetching by cell?</summary>

Cells are approximations. They include points outside the requested radius and can have irregular boundaries. Exact distance filtering removes false positives and gives correct sorting.
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
| [Hello Interview: Proximity Search](https://www.hellointerview.com/learn/system-design/deep-dives/proximity-search) | Headings: "Custom Spatial Trees", "Quadtrees", "k-d Trees and BKD Trees", "R-trees", "Encoded Keys", "Geohash", "S2", "H3", "Which Should You Use?" | ~45 min |
| [Redis geospatial docs](https://redis.io/docs/latest/develop/data-types/geospatial/) | Headings: "Redis geospatial", "Examples", "Learn more" | ~10 min |
| [PostGIS workshop: Spatial Indexing](https://postgis.net/workshops/postgis-intro/indexing.html) | Headings: "15. Spatial Indexing", "15.1. How Spatial Indexes Work", "15.2. Spatially Indexed Functions", "15.3. Index-Only Queries" | ~20 min |
| [PostGIS ST_DWithin](https://postgis.net/docs/ST_DWithin.html) | Headings: "Name", "Synopsis", "Description", "Examples" | ~10 min |
| **Alex Xu Vol 2, ch 1: Proximity Service** | Proximity service / geohash / quadtree design | [PDF p.9](<../../../Books/System Design Interview Vol 2 - Alex Xu.pdf#page=9>) |
| **Alex Xu Vol 2, ch 2: Nearby Friends** | Nearby friends, location updates and privacy/freshness trade-offs | [PDF p.43](<../../../Books/System Design Interview Vol 2 - Alex Xu.pdf#page=43>) |

**Connects to:** [B2 Indexes](../B-Data/B2-Indexes.md) · [C2 Redis](../C-Caching/C2-Redis.md) · [H2 Search](H2-Search.md) · [H4 Stream aggregation](H4-Stream-Aggregation.md) · [G2 Distributed locks + reservations](../G-Contention/G2-Distributed-Locks-Reservations.md) · Questions: Location search/Uber/Yelp (#9), Flash sale/local delivery (#18)
