# F3 · Fan-out: getting one post into millions of feeds

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** News feed / Twitter timeline (#4), Instagram / photo sharing (#11), Chat (#3: group delivery), Notification system (#13), FB live comments variant

---

## Why this topic matters

A feed is not hard because of the post table. It is hard because one write can affect many readers. If Neeraj follows 500 people, his home timeline is a merge of their posts. If a celebrity has 50 million followers, one post can become a fan-out storm.

| Strategy | When it shines | Main pain |
|---|---|---|
| Fan-out on write (push) | normal users, fast feed reads | expensive writes for high-follower authors |
| Fan-out on read (pull) | celebrities, low write amplification | expensive reads and ranking at request time |
| Hybrid | real products | operational complexity |

This same shape appears in chat groups, notifications, activity feeds and Adobe Connect pods: one producer emits an event, many consumers need to see it, but not all producers/consumers have the same cardinality.

---

## Part 1: the core feed model

A feed system usually has four data sets:

1. **Post store:** canonical post content and metadata.
2. **Follower graph:** who follows whom.
3. **Feed cache:** per-user list of post ids ready to show.
4. **Ranking/feature data:** signals used to order or filter feed items.

```text
User posts ─► Post Service ─► Post DB
                    │
                    ▼
              Fan-out workers ─► Feed cache per follower
                    ▲
Follower graph ─────┘

Feed read ─► Feed Service ─► Redis list/zset of post IDs ─► Post cache/DB
```

Notice the feed cache stores **post IDs**, not full post bodies. That keeps each user's feed compact and lets you update a post's text/media in one canonical place. The read path hydrates IDs into post objects, usually via cache/batch fetch.

### Follower graph storage

The graph needs two common queries:

- `getFollowers(authorId)` for fan-out on write;
- `getFollowees(userId)` for fan-out on read or rebuild.

For moderate scale, a relational table works:

```sql
CREATE TABLE follows (
  follower_id BIGINT NOT NULL,
  followee_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX follows_by_followee ON follows (followee_id, follower_id);
```

At higher scale, shard by `followee_id` for write fan-out lookups and by `follower_id` for read-time lookups, or maintain two denormalized views. The important interview point: the access pattern decides the index.

**Interview line:** "I treat the post table as the source of truth and the feed as a derived, rebuildable cache of post ids. That makes fan-out fast without duplicating large content."

---

## Part 2: fan-out on write (push)

When Alice posts, the system immediately pushes Alice's post id into each follower's feed cache.

```text
Alice creates post P
      │
      ▼
Write Post DB ─► enqueue fanout(P, Alice)
                     │
                     ▼
           read Alice's followers
                     │
                     ▼
        for each follower F: LPUSH feed:F P
```

Read path becomes very fast:

```text
GET /feed?cursor=...
  1. read next N post ids from feed:userId
  2. batch fetch post objects from cache/DB
  3. apply light filtering/ranking
  4. return cursor
```

### Redis lists vs sorted sets

| Structure | Use | Trade-off |
|---|---|---|
| Redis list | newest-first timeline | simple, fast push/pop/range |
| Redis sorted set | score = time or ranking score | flexible ordering and cursor by score |
| Database table | durable feed inbox | slower but rebuildable/persistent |

A common design uses Redis for the hot recent feed and a durable backing store or rebuild mechanism. Keep only the most recent K post IDs per user in cache; old pages can be regenerated or read from colder storage.

### Write amplification

If Alice has 800 followers, push is fine. If Alice has 80 million followers, one post becomes 80 million writes. That is the celebrity problem.

Mitigations:

- async fan-out workers with rate limits;
- skip push for celebrities and pull them at read time;
- batch writes per shard;
- cap feed cache length;
- degrade notification fan-out separately from feed fan-out.

Push optimizes the common user read path, but it must not let one author overload the system.

---

## Part 3: fan-out on read (pull)

In pull mode, when Bob opens the app, the system fetches recent posts from Bob's followees and merges them.

```text
GET /feed for Bob
  ├─ get Bob's followees: A, C, D, ...
  ├─ fetch recent posts for each followee
  ├─ merge/rank
  └─ return first page
```

This avoids write amplification. A celebrity post is written once to the post store; followers pull it when they read. But the read path can be expensive if a user follows many people or if ranking needs many candidates.

Pull is good for:

- celebrities and high-follower accounts;
- users who rarely open the app;
- feeds with heavy personalized ranking where precomputing everything is wasteful;
- small systems where reads are not yet huge.

Pull can use precomputed author timelines: each author has a sorted set/list of recent posts. A feed read merges the top items from followed authors. This is similar to merging K sorted lists.

---

## Part 4: hybrid fan-out and the celebrity problem

Real systems usually combine both:

- **Normal authors:** push post ids to followers' feed caches.
- **Celebrity authors:** do not push to every follower; store in author timeline and pull during read.
- **Medium authors:** push to active followers only; pull for inactive users.

```text
Normal post P ──push──► follower feed caches
Celebrity post C ──store only──► celebrity author timeline

Feed read = cached inbox + pulled celebrity timelines + ranking
```

How to classify celebrities?

- follower count threshold;
- fan-out job latency/cost;
- recent engagement;
- special account type.

Do not hardcode the threshold in the interview. Say it is a tunable operational value.

### Ranking hook

Fan-out decides **candidate generation**. Ranking decides **final order**.

A simple feed can be reverse chronological. A modern feed may score candidates by freshness, affinity, media type, engagement probability, muted words, ads and safety filters.

A clean architecture keeps a ranking hook after candidate generation:

```text
Candidate IDs from feed cache + pulled timelines
      │
      ▼
Hydrate features (author, viewer, post stats)
      │
      ▼
Rank/filter/dedupe
      │
      ▼
Return page + cursor
```

In an interview, you can start chronological, then add ranking as a deep dive. Do not make the first diagram a giant ML platform unless asked.

---

## Part 5: pagination with cursors

Offset pagination breaks for feeds: new posts arrive while the user scrolls, causing duplicates or skips. Use cursor pagination.

For a chronological feed cache, the cursor can include:

- last seen timestamp or score;
- last seen post id as tie-breaker;
- source positions for hybrid feeds if merging multiple lists;
- maybe a snapshot time to avoid showing items newer than page 1 during the same scroll session.

Example response:

```json
{
  "items": ["p100", "p099", "p098"],
  "nextCursor": "score=1712345000&id=p098&snapshot=1712349999"
}
```

For Redis sorted sets, `ZREVRANGEBYSCORE`-style access maps well to score cursors. For lists, store index/opaque token carefully, but insertions at the head can shift indexes; score-based cursors are usually more robust.

### Feed cache structure

A practical Redis shape:

```text
feed:{userId}              sorted set: score=created_at or rank score, value=postId
author_timeline:{authorId} sorted set: score=created_at, value=postId
post:{postId}              cached post object or pointer to Post DB
```

Keep the cache bounded. The exact Redis command is less important than the concept: maintain a bounded, ordered inbox of IDs and trim old candidates.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| User with 500 followers posts | fan-out on write | cheap write, very fast reads |
| Celebrity posts | fan-out on read for that author | avoids millions of writes |
| User follows 5,000 accounts | hybrid + ranking candidate limits | read merge could be expensive |
| User rarely opens app | do not eagerly push unlimited history | wasted writes; rebuild/pull on login |
| Strict chronological feed | sorted by timestamp | simpler cursor and cache |
| Personalized feed | candidate cache + ranking stage | separate generation from scoring |

### Common interview traps

- Duplicating full post bodies into every feed instead of post IDs.
- Ignoring the celebrity problem after choosing push.
- Using offset pagination for a changing feed.
- Forgetting follower graph indexes for both followers and followees.
- Treating ranking as the same thing as fan-out.
- Not bounding per-user feed caches.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What is fan-out on write?</summary>

When an author creates a post, workers push that post id into each follower's feed cache immediately. Reads become fast because the feed is precomputed.
</details>

<details><summary>2. Why does fan-out on write fail for celebrities?</summary>

One post can require millions of cache writes, causing huge write amplification, slow fan-out jobs and hot shards. For high-follower authors, store the post once and pull it during reads.
</details>

<details><summary>3. Why store post IDs in the feed cache instead of full posts?</summary>

It avoids duplicating large content, keeps feed entries small, and lets edits/deletes/moderation update the canonical post. Reads hydrate IDs into post objects.
</details>

<details><summary>4. What does a hybrid feed read merge?</summary>

The user's precomputed inbox for normal authors plus recent posts from celebrity/high-fanout author timelines, then dedupes, ranks/filters and paginates the result.
</details>

<details><summary>5. Why are cursors better than offsets for feeds?</summary>

Feeds change while the user scrolls. Offsets shift when new posts arrive, causing duplicates/skips. Cursors based on score/timestamp/id can continue from the last seen item more reliably.
</details>

<details><summary>6. What two follower graph queries do you need?</summary>

`getFollowers(authorId)` for fan-out on write and `getFollowees(userId)` for fan-out on read/rebuild. Index or denormalize for both.
</details>

<details><summary>7. Where should ranking sit?</summary>

After candidate generation. Fan-out/cache produces candidate post IDs; ranking hydrates features, filters, scores and orders the final page.
</details>

<details><summary>8. How does this connect to chat?</summary>

Group chat delivery is also fan-out: one message must reach many recipients. Small groups can push to member inboxes; huge channels may use pull/pub-sub style delivery.
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
| [Hello Interview: FB News Feed](https://www.hellointerview.com/learn/system-design/problem-breakdowns/fb-news-feed) | Headings: "Users should be able to create posts", "Users should be able to friend/follow people", "Users should be able to view a feed", "Users should be able to page through their feed", deep dives on large following, large followers, async workers with hybrid feeds, and post cache | ~60 min |
| **Alex Xu Vol 1, ch 11: Design a News Feed System** | Feed publishing, newsfeed building, fanout service, cache, media in CDN, deep dive and wrap-up | [PDF p.166](<../../../Books/System Design Interview Vol 1 - Alex Xu.pdf#page=166>) |

**Connects to:** [C2 Redis](../C-Caching/C2-Redis.md) · [C3 Eviction + failure modes](../C-Caching/C3-Eviction-Failure-Modes.md) · [B4 Replication](../B-Data/B4-Replication.md) · [A6 API design](../A-Fundamentals/A6-API-Design.md) · [D1 Queues](../D-Async/D1-Queues.md) · Questions: News feed (#4), Instagram (#11), Chat (#3), Notification (#13)
