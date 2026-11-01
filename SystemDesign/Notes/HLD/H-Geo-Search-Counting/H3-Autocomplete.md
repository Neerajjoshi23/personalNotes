# H3 · Autocomplete: typeahead that feels instant

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Search autocomplete / typeahead (#14), Frontend autocomplete machine-coding, News feed / Twitter (#4), Yelp / location search (#9), E-commerce / flash sale (#18)

---

## Why this topic matters

Autocomplete looks small, but it tests a full system design loop: latency, indexing, ranking, caching, personalization and frontend request control. Users type one character at a time; if every keystroke hits a database scan, the system dies and the UI feels bad.

| User expectation | Backend implication |
|---|---|
| Suggestions in <100 ms | In-memory prefix lookup and caching |
| Good top results | Offline aggregation of query frequency/clicks |
| Fresh enough | Periodic rebuild or streaming updates for popular terms |
| Personalized | Blend global top-K with user/location/context |
| Safe UI | Debounce, cancel stale requests, keyboard accessibility |

In interviews, autocomplete is usually not "search all documents". It is "given prefix `sys`, return the top suggestions such as `system design`, `system design roadmap`, `system design interview`." That makes it a prefix-index problem.

---

## Part 1: trie with top-K cached per node

A trie stores characters on edges and prefixes as paths. Each node can cache the top suggestions for that prefix.

```
(root)
  |
  s
  |
  y
  |
  s  -- topK: ["system design", "system design interview", "syslog"]
  |
  t
  |
  e
  |
  m  -- topK: ["system design", "system design roadmap", "system requirements"]
```

Query flow:

1. Normalize the user input: lowercase, trim, maybe language-specific rules.
2. Walk the trie by characters of the prefix.
3. Return the node's cached `topK` list.
4. Apply optional filters/personalization.

Without cached top-K, the server would walk the entire subtree under the prefix and rank many candidates at request time. That is too slow for hot prefixes like `a` or `the`. With cached top-K, lookup is roughly proportional to prefix length.

```ts
type Suggestion = { text: string; score: number; type: "query" | "user" | "hashtag" | "place" };
type TrieNode = { children: Map<string, TrieNode>; top: Suggestion[] };
```

The expensive part is **building** the trie, not querying it. For each candidate phrase, insert it into the trie and update top-K at every prefix node. If you do this online for every query, writes are expensive. Most large systems build or refresh suggestions offline.

**Interview line:** "For typeahead I won't query the posts table. I'll maintain a prefix index where each prefix node already has the top K suggestions, so serving a request is just normalize, traverse the prefix and return a cached list."

Different products autocomplete different entities:

| Product | Suggestions |
|---|---|
| Search engine | Past popular queries |
| Twitter/X | Hashtags, users, search queries |
| Yelp | Businesses, categories, cuisines, locations |
| Adobe Connect | meeting names, participants, rooms, recordings |
| DrawBoard | board titles, collaborators, templates |

The data model should include `type`, `locale`, `country`, `safeSearch`, and maybe `tenantId` so the same prefix does not leak private names across tenants.

---

## Part 2: prefix hash table alternative

A trie is not the only answer. You can precompute a simple prefix table:

```
"s"    -> [system design, spotify, slack]
"sy"   -> [system design, system requirements, syslog]
"sys"  -> [system design, system design interview, syslog]
"syst" -> [system design, system design roadmap]
```

This can live in Redis, a key-value store, CDN edge KV, or in-memory service. It is conceptually simpler than a trie and often easier to shard, cache and deploy.

| Approach | Pros | Cons |
|---|---|---|
| Trie | Compact for shared prefixes; supports walking and updates | More custom data structure; sharding and serialization are trickier |
| Prefix hash table | Simple `GET autocomplete:en:sys`; easy to cache | Duplicates suggestions across prefixes; many keys |
| Search engine edge n-grams | Reuse Elasticsearch/OpenSearch | Heavier; ranking/prefix tuning can be less predictable |

For interviews, trie with top-K is the canonical answer because it demonstrates the data structure. For production, a prefix table is often easier if the maximum prefix length is bounded, for example 20 characters. You generate prefixes only up to a limit; after that, call the full search service.

Memory trade-off: storing top 10 suggestions for every prefix duplicates the same popular phrase many times. That is okay because reads are extremely latency-sensitive. You choose memory to save CPU and tail latency.

---

## Part 3: data collection and offline aggregation pipeline

Autocomplete quality comes from logs, not from the trie itself. The pipeline typically looks like:

```
Client search box
  -> query events: prefix, submitted query, clicked result, user locale, timestamp
  -> Kafka / queue
  -> batch or stream aggregation
  -> candidate generation + scoring
  -> build prefix index
  -> publish new index version to serving fleet / cache
```

Signals:

| Signal | Meaning |
|---|---|
| Query frequency | Popular queries should appear early |
| Click-through | Suggestions that lead to clicks are useful |
| Freshness | Trending topics should rise quickly |
| Geographic / language | `jaguar` differs by region and language |
| Safety | Remove spam, abuse, adult or policy-blocked terms |
| Business rules | Promote verified entities, not scam copies |

A simple scoring formula can be described without pretending it is exact:

```text
score = weighted_query_count + click_success_score + freshness_boost + personalization_boost - spam_penalty
```

Large systems often use two layers:

1. **Offline daily/hourly build** for stable global suggestions.
2. **Near-real-time overlay** for fast-moving trends, stored separately and merged at serving time.

This avoids rebuilding a huge trie for every viral hashtag. The serving service merges `globalTopK(prefix)` with `realtimeTopK(prefix)` and returns the final list.

Treat the autocomplete index like a versioned artifact: build `suggestions_v42`, validate quality and size, upload it, warm serving nodes, flip an active version pointer, and keep the old version for rollback. This is safer than mutating a single live trie in place.

---

## Part 4: sharding, caching and personalization

Common sharding strategies:

| Strategy | How | Trade-off |
|---|---|---|
| By first character(s) | `a-m` on one group, `n-z` on another | Simple; hot letters/prefixes can be skewed |
| By normalized prefix hash | hash(`prefix`) % N | Balanced; related prefixes on different nodes |
| By language/region first | `en-IN`, `en-US`, `hi-IN` | Good relevance; duplicated storage |
| Replicate all hot prefixes | Every node has top prefixes | Great latency for hot traffic; memory cost |

Autocomplete has a skew problem: short prefixes like `a`, `s`, `new`, `the` are extremely hot. Replicate or edge-cache them. Longer prefixes are less hot and can go to the origin service.

```
Browser cache -> CDN/edge cache -> autocomplete service -> prefix store
       hot prefixes       popular global        long-tail
```

Cache layers:

- **Browser memory:** if the user backspaces from `syst` to `sys`, reuse the previous response.
- **Edge/CDN:** cache anonymous global suggestions for hot prefixes by locale.
- **Service memory:** load trie/prefix table into RAM.
- **Redis:** optional shared cache if serving nodes cannot hold the whole index.

Cache key must include anything that changes the answer: prefix, locale, country, safe-search, tenant, entity type and maybe logged-in segment. Be careful with personalization: fully personalized responses are harder to cache at the edge.

A good design separates **candidate generation** from **ranking/filtering**.

```
1. Candidate generation: global top 50 for prefix "ad"
2. Filters: tenant, safe search, blocked users, entity type
3. Personalization: boost Adobe Connect rooms I recently joined
4. Return top 10
```

For multi-tenant products, filtering is correctness, not ranking. Never let a private meeting title appear because it was globally popular. You may maintain separate tenant indexes for enterprise tenants or apply strict tenant filters before returning.

---

## Part 5: frontend side: making typeahead feel right

Even a perfect backend can feel broken if the UI fires too many requests or renders stale results.

**Debounce.** Wait for the user to pause typing before calling the API, commonly around 150-300 ms. Too short overloads the backend; too long feels laggy.

**Cancel stale requests.** If the user types `s`, then `sy`, then `sys`, the `s` request might return last. The UI must ignore or cancel stale responses. Use `AbortController` or a monotonically increasing request id.

```ts
let active: AbortController | null = null;
async function load(prefix: string) {
  active?.abort();
  active = new AbortController();
  const res = await fetch(`/api/suggest?q=${encodeURIComponent(prefix)}`, { signal: active.signal });
  return res.json();
}
```

**Keyboard and accessibility.** Autocomplete is a mini combobox. It needs arrow up/down, Enter, Escape, ARIA combobox/listbox roles, active descendant, screen-reader-friendly loading/no-results states, and no mouse-only interactions.

Cross-link this to frontend notes: [FE4 Network Layer](../../../../ReactPersonal/Info/frontend-system-design/FE4-Network-Layer.md) for request cancellation, caching and retries, and [FE7 Accessibility + i18n](../../../../ReactPersonal/Info/frontend-system-design/FE7-Accessibility-i18n.md) for combobox keyboard/a11y.

**Interview line:** "On the frontend I would debounce input, cancel stale requests with AbortController, cache recent prefixes in memory, and implement the box as an accessible combobox rather than just a div list."

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Global search query suggestions | Offline-built trie or prefix hash table with top-K | Fast, predictable reads |
| Enterprise private data | Tenant-specific index or strict tenant filter | Prevents suggestion leaks |
| Trending hashtags | Real-time overlay merged with offline index | Fresh without rebuilding everything |
| Long prefix after 20 chars | Fall back to full search | Prefix table explosion is unnecessary |
| Very hot short prefixes | Edge/browser/service cache | Reduces tail latency and origin QPS |
| Need typo tolerance | Search engine or fuzzy matching after prefix candidates | Trie alone matches prefixes, not misspellings |
| Small app | Postgres query or Redis sorted sets may be enough | Avoid custom infra until needed |

### Common interview traps

- Querying the main database for every keystroke.
- Forgetting to precompute top-K; traversing a huge subtree per request.
- Sharding by first letter without handling hot prefixes.
- Returning personalized/private suggestions from a globally cached response.
- Ignoring frontend race conditions where old responses overwrite new results.
- Treating autocomplete and full-text search as the same system.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why does each trie node cache top-K suggestions?</summary>

Without cached top-K, a request for a prefix may need to scan a huge subtree and rank candidates at query time. Caching top-K makes serving roughly proportional to prefix length plus K, which is what typeahead latency needs.
</details>

<details><summary>2. When would you prefer a prefix hash table over a trie?</summary>

When operational simplicity matters: precompute `prefix -> suggestions` keys, store them in Redis/KV/CDN, and serve with a simple get. It duplicates data across prefixes but is easy to shard, cache and deploy.
</details>

<details><summary>3. What logs feed the offline autocomplete pipeline?</summary>

Typed prefixes, submitted queries, clicked results, impressions, locale/country/device, timestamp, user segment and abuse signals. The pipeline aggregates frequency, CTR, freshness and safety before building the next index version.
</details>

<details><summary>4. How do you handle trending topics without rebuilding the full trie every minute?</summary>

Maintain a small near-real-time overlay of trending suggestions per prefix and merge it with the offline global top-K at serving time. Periodic full builds absorb stable trends later.
</details>

<details><summary>5. Why are short prefixes a scaling problem?</summary>

They are extremely hot and match many candidates. Replicate or cache them at browser/edge/service layers, and avoid expensive subtree scans. Longer prefixes are less frequent and more selective.
</details>

<details><summary>6. What must be included in an autocomplete cache key?</summary>

Anything that changes the answer: normalized prefix, locale/language, country, safe-search, tenant, entity type, and possibly user segment. Fully personalized suggestions should be cached carefully or only on the client/service.
</details>

<details><summary>7. What are the three frontend must-haves for typeahead?</summary>

Debounce requests, cancel or ignore stale responses, and implement keyboard/a11y behavior as a combobox. Browser memory caching for recent prefixes is also useful.
</details>

<details><summary>8. How would you prevent private meeting titles from leaking in suggestions?</summary>

Use tenant-specific indexes or apply tenant/permission filters before returning. Do not put private entities in a globally cached prefix list. Cache keys must include tenant or avoid edge caching private responses.
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
| **Alex Xu Vol 1, ch 13: Design Search Autocomplete System** | Whole chapter: requirements, trie, data gathering service, query service, storage, scale and follow-ups | [PDF p.200](<../../../Books/System Design Interview Vol 1 - Alex Xu.pdf#page=200>) · ~45 min |
| [H2 Search](H2-Search.md) | Parts 1-2 for analyzers, ranking and how autocomplete differs from full-text search | Local note |
| [FE4 Network Layer](../../../../ReactPersonal/Info/frontend-system-design/FE4-Network-Layer.md) | Request cancellation, client caching and network race handling | Local note |
| [FE7 Accessibility + i18n](../../../../ReactPersonal/Info/frontend-system-design/FE7-Accessibility-i18n.md) | Combobox keyboard accessibility and locale-aware UX | Local note |

**Connects to:** [H2 Search](H2-Search.md) · [C1 Cache patterns](../C-Caching/C1-Cache-Patterns.md) · [FE4 Network Layer](../../../../ReactPersonal/Info/frontend-system-design/FE4-Network-Layer.md) · [FE7 Accessibility + i18n](../../../../ReactPersonal/Info/frontend-system-design/FE7-Accessibility-i18n.md) · Questions: Autocomplete (#14), Yelp / location search (#9), Frontend autocomplete machine-coding