# A5 · Latency estimation: back-of-the-envelope maths that justifies architecture

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Every HLD question; especially URL shortener (#1), Chat (#3), News feed (#4), YouTube (#6), Web crawler (#7), Ad click aggregator (#20)

---

## Why this topic matters

Estimation is not about perfect numbers. It proves your architecture is directionally sane. If you choose one DB, can it handle reads" If you store videos, how much storage and bandwidth" If you cache feed pages, how big is the hot set?

**Interview line:** “I’ll estimate only where the number changes the design. The goal is order of magnitude: do we need cache, CDN, sharding or async workers?”

---

## Part 1: numbers worth remembering

Remember relative orders more than exact hardware values:

```text
CPU/cache << memory << SSD << same-region network << cross-region network << human-visible delay
```

Latency lessons: avoid cross-region calls on the synchronous path, cache hot reads, queue non-blocking work, serve static/media bytes from CDN, and batch when per-request overhead dominates.

| Latency / capacity | Rough value | Interview meaning |
|---|---:|---|
| L1 cache / mutex / memory | ns to ~100 ns | local work is tiny compared with IO |
| fast compression of 1 KB | few µs | cheap enough for many payloads |
| SSD random read | tens to hundreds of µs | slower than memory, faster than network/HDD |
| same-DC RTT | ~0.5 ms | chained calls create tail latency |
| HDD seek | 2-10 ms | avoid random HDD IO on hot paths |
| same-continent RTT | 20-50 ms | region choice matters |
| India <-> US RTT | 150-250 ms | keep off tight synchronous paths |

Availability is end-to-end:

| Availability | Downtime/year | Design implication |
|---|---:|---|
| 99% | 3.65 days | hobby/internal tools |
| 99.9% | 8.8 h | many business apps |
| 99.99% | 52.6 min | multi-AZ, failover, good ops |
| 99.999% | 5.3 min | very hard; automation and multi-region often matter |

Throughput rules of thumb:

| One machine, simple work | Rough throughput | Caveats |
|---|---:|---|
| Stateless app server | 1k-10k req/s | language, DB calls, payload, p99 target |
| Postgres/MySQL indexed reads | 5k-20k QPS | writes lower; indexes and pooling matter |
| Redis | ~100k ops/s | command mix, pipeline, network, memory |
| Kafka broker | hundreds of MB/s | disk, replication, partitions, batching |
| WebSocket connections/server | 10k-100k | memory, heartbeat, kernel tuning, fan-out |

**Interview line:** "I will not memorize exact timings; I will use ratios: memory beats SSD, same-region beats cross-region, and chained network calls dominate user latency."

---

## Part 2: powers of two and unit shortcuts

```text
2^10 ≈ 1 thousand
2^20 ≈ 1 million
2^30 ≈ 1 billion
2^40 ≈ 1 trillion
1 day = 86,400 seconds ≈ 100,000 seconds
100M requests/day / 100k seconds/day ≈ 1,000 QPS average
peak QPS often 2x-10x average
```

Storage shortcuts: KB/MB/GB/TB/PB are roughly thousand/million/billion/trillion/quadrillion bytes. This is enough to make most interview estimates fast.

---

## Part 3: estimation workflow

Template:

```text
Users:          X DAU
Actions/user:   Y/day
Requests/day:   X * Y
Average QPS:    requests/day / 100k
Peak QPS:       average * peak factor
Object size:    fields + metadata + index overhead
Storage/day:    objects/day * size
Bandwidth/sec:  QPS * response size
```

Then translate math into topology:

- high read QPS or hot small objects -> cache/CDN
- huge blob bandwidth -> object storage + CDN
- high fan-out writes -> queue/workers
- TB/year primary data -> retention/partition/shard plan
- cross-region latency -> regional reads/edge or async work
- strict correctness -> transactions/idempotency, not "more servers"

Stop once the design choice is clear.

---

## Part 4: worked example — URL shortener (#1)

Assume 100M redirects/day, 1M new links/day, ShortUrl row ~1 KB, analytics event ~200 B.

```text
Redirect average QPS = 100M / 100k ≈ 1,000 QPS
Peak redirect QPS    = 5x ≈ 5,000 QPS
Create average QPS   = 1M / 100k = 10 QPS
ShortUrl storage     = 1 GB/day, maybe ~1 TB/year with replicas/indexes
Analytics            = 100M * 200 B = 20 GB/day
```

Conclusion: redirect path is the scale path; create path can be simpler and strongly consistent.

For a larger 500M redirects/day version:

```text
redirect avg QPS = 5,000
redirect peak    = 25,000 QPS
25,000 / 2,000 safe req/s per app = 13 instances before headroom
with deploy/AZ/headroom -> roughly 25-30 redirect app instances
```

Cache sizing:

```text
100M hot entries * 300 B ≈ 30 GB raw
replication + overhead + headroom -> ~60-90 GB Redis memory
```

Design implications: Redis/CDN for hot redirects, DB index on `code`, analytics queue/stream, create endpoint with idempotency, shard mapping table only if storage/write estimates justify it.

---

## Part 5: worked example — Twitter-like feed (#4)

Assume 10M DAU, 10 feed opens/user/day, 20 items/request, 1 KB/item.

```text
Feed requests/day = 100M
Average QPS       = 1,000
Peak QPS          = 5,000-10,000
Response size     = 20 KB
Peak bandwidth    = 10,000 * 20 KB = 200 MB/s
```

Writes: 1M posters/day, 2 posts each, average 200 followers.

```text
Posts/day           = 2M
Post average QPS    = 20
Fan-out inserts/day = 2M * 200 = 400M
Fan-out avg QPS     = 4,000 inserts/sec
```

Conclusion: posting QPS is modest, but fan-out writes are huge. Use async workers and hybrid fan-out: push normal users, pull celebrities at read time.

---

## Part 6: worked example — chat (#3)

Assume 5M DAU, 40 messages/user/day, message + metadata ~1 KB.

```text
Messages/day     = 200M
Average send QPS = 2,000
Peak send QPS    = 10,000-20,000
Storage/day      = 200 GB/day
Year raw         = 73 TB/year before replicas/indexes
Delivery attempts/day at 1.5 deliveries/message = 300M
```

If there are 10M concurrent connections and one server safely holds 50k connections, that is 200 connection servers before headroom.

Design implications: partition by conversation ID, durable write before ack, WebSocket connection servers, pub/sub/queues for delivery, offline push async, archival/lifecycle storage. Chat shows why "QPS" is not one number.

---

## Part 7: how much estimation in interviews?

Spend time estimating when it decides cache vs no cache, SQL vs sharding, CDN/object storage, async fan-out, or the interviewer asks. Avoid fake precision and long arithmetic.

Good 20-second estimate:

> ?Assume 100M requests/day. A day is ~100k seconds, so average is ~1k QPS. Peak might be 5-10k. App servers can scale horizontally, but DB reads need cache because redirects are latency-sensitive and hot keys are likely.?

A server that can handle 10k cached `GET /health` requests may handle only hundreds of real requests if each does JSON serialization, auth, a DB query and a downstream call. Name the bottleneck: CPU, IO, memory, network or tail-latency headroom.

---

## Part 8: choosing in an interview / cheat sheet

| Estimate says | Design move | Why |
|---|---|---|
| 1k-10k simple API QPS | stateless horizontal app tier | easy scale-out |
| high read QPS, hot small objects | Redis/CDN/local edge cache | offload DB/app |
| GB/s of media/static bytes | CDN + object storage | app servers should not relay bytes |
| fan-out writes exceed post writes by 100x | queue workers + hybrid fan-out | remove work from request path |
| TB/year primary data | partition, retention, shard plan | storage/operability |
| cross-region call in critical path | move data/compute regional or async | latency |
| 99.99%+ target | multi-AZ, automation, failover, observability | ops requirements dominate |
| strict correctness | transactions/idempotency | scale is not the fix |

### Common interview traps

- Average QPS only; no peak/headroom.
- Exact-looking numbers from weak assumptions.
- Sizing app servers but not cache memory, storage growth or bandwidth.
- Forgetting indexes, replicas and retention.
- Treating app-server QPS as universal.
- Spending more time on arithmetic than decisions.

## Self-test (answer out loud first, then open)

<details><summary>1. Convert 100M requests/day to average QPS.</summary>

About 1,000 QPS because a day is roughly 100,000 seconds.
</details>

<details><summary>2. What is the downtime per year for 99.9% and 99.99% availability?</summary>

99.9% is about 8.8 hours/year. 99.99% is about 52.6 minutes/year.
</details>

<details><summary>3. Give a rough stateless app server throughput rule of thumb.</summary>

About 1k-10k requests/sec for simple work, with huge caveats for CPU, IO, payload size, downstream calls and p99 targets.
</details>

<details><summary>4. URL shortener with 1M creates/day and 100M redirects/day: optimize which path?</summary>

Redirects. Creates are ~10 QPS average; redirects are ~1,000 QPS average and latency-sensitive.
</details>

<details><summary>5. What reveals the celebrity problem in feed design?</summary>

Fan-out writes: posts/day multiplied by follower count. A celebrity post can require millions of timeline writes if using fan-out-on-write.
</details>

<details><summary>6. 25k peak QPS and 2k safe req/s per app server. How many before headroom?</summary>

13 servers (12.5 rounded up). With 2x headroom/AZ/deploy safety, around 25-30.
</details>

<details><summary>7. 100M cache entries at 300 B each: rough raw memory?</summary>

30 GB raw. With replication and overhead/headroom, plan roughly 60-90 GB or more depending Redis overhead.
</details>

<details><summary>8. Why estimate bandwidth separately from QPS?</summary>

High QPS with tiny responses and low QPS with huge media have different bottlenecks. Media bandwidth pushes you to CDN/object storage.
</details>

<details><summary>9. When stop estimating?</summary>

When the estimate has driven a design decision: cache, CDN, queue, shard, replica, region, retention or headroom.
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
| [System Design Primer: Appendix](https://github.com/donnemartin/system-design-primer#appendix) | Exact sections: “Appendix”, “Powers of two table”, “Latency numbers every programmer should know” | ~20 min |
| **Alex Xu Vol 1, ch 2: Back-of-the-envelope Estimation** | “Power of two”, “Latency numbers”, “Availability numbers”, “Example: Estimate Twitter QPS and storage”, “Tips” | [PDF p.34](<../../../Books/System Design Interview Vol 1 - Alex Xu.pdf#page=34>) |
| [System Design Primer: Back-of-the-envelope calculations](https://github.com/donnemartin/system-design-primer#back-of-the-envelope-calculations) | The interview approach section before Appendix | ~10 min |

**Connects to:** [A1 Delivery Framework](A1-Delivery-Framework.md) · [A7 Scaling Basics](A7-Scaling-Basics.md) · [F3 Fan-out](../F-Blobs-Fanout/F3-Fan-out.md) · [D1 Queues](../D-Async/D1-Queues.md) · [D2 Kafka](../D-Async/D2-Kafka.md) · [H4 Stream Aggregation](../H-Geo-Search-Counting/H4-Stream-Aggregation.md) · URL shortener (#1) · News feed (#4) · Chat (#3)
