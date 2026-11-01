# G3 · Virtual Waiting Room: survive the ticket drop before users hit your database

> **Status:** [ ] Read the blog ? [ ] Read the sources ? [ ] Self-test passed · **Date:** ___
> **Used in:** Ticket / hotel booking (#8), E-commerce / flash sale (#18), Rate limiter (#2), YouTube / live event launch (#6), Distributed job scheduler overload follow-ups (#21)

---

## Why this topic matters

A flash sale is not just "high QPS". It is a synchronized stampede: millions of users refresh at the same second because the sale starts at 10:00. If every request reaches the booking service and database, the system fails before your clever seat-locking logic matters.

A virtual waiting room moves the first control point **to the edge**. Users wait in a queue-like experience, and only a controlled number receive short-lived admission tokens to enter the booking flow.

| Mechanism | Goal | Example |
|---|---|---|
| Rate limiting | Cap requests per user/IP/API key | Stop one bot from sending 10k requests/s |
| Load shedding | Drop low-priority work when overloaded | Return 503 before DB pool melts |
| Virtual queue | Smooth a crowd into an admission rate | Let 5k users/min enter checkout |
| Reservation TTL | Protect individual seats after admission | Hold seat for 10 minutes |

**Interview line:** "For a Ticketmaster drop, I protect the booking DB by admitting users at the edge with signed tokens. The waiting room absorbs the spike; the core system sees a controlled arrival rate instead of the raw crowd."

---

## Part 1: what surge traffic does to a booking system

Normal scaling assumes requests are somewhat spread out. Ticket drops violate that assumption.

```
10:00 sale opens

Users/bots ───────► CDN/API gateway ───────► app servers ───────► booking DB
  5M refreshes       if no waiting room        connection pool       locks + rows
  in seconds         everything passes         saturates             time out
```

The failure is often nonlinear:

1. App servers saturate CPU or threads.
2. Latency rises.
3. Users retry, and clients/bots multiply traffic.
4. DB connection pools fill.
5. Locks are held longer because transactions are slow.
6. More requests time out and retry.
7. The system spends most work failing.

Google SRE's overload chapter warns about this retry amplification and the danger of measuring only QPS. A service can serve 10k QPS when each request costs 2 ms, but collapse at 2k QPS when requests trigger DB locks or expensive queries.

So the design target is not "handle every request". It is **keep the critical path healthy**:

- browsing/cache endpoints can serve stale or cached data;
- booking attempts are admitted at a safe rate;
- DB write concurrency stays below the lock/connection limit;
- users see honest progress instead of random timeouts.

For Adobe Connect, the parallel is a large webinar join: you want a lobby/admission flow to protect meeting-control services, while media edges scale separately. For DrawBoard, you might throttle room joins or AI-participant requests before they overload the collaboration room service.

---

## Part 2: virtual waiting room architecture

The waiting room sits before the expensive system, usually at CDN edge, API gateway, or a small stateless admission service.

```
                 ┌─────────────────────────────┐
User request ───►│ Edge / Gateway              │
                 │ - bot checks                │
                 │ - rate limit                │
                 │ - waiting-room cookie       │
                 └──────────────┬──────────────┘
                                │ admitted token?
                  no            │ yes
                  ▼             ▼
           Waiting room UI   Booking app/API ───► reservation DB
           position + ETA    verifies token       protected capacity
```

Core entities:

| Entity | Meaning |
|---|---|
| `waiting_room_id` | Sale/drop/event being protected |
| `visitor_id` | Stable anonymous ID in signed cookie; later linked to logged-in user |
| `enqueue_time` | When the visitor entered |
| `priority_class` | Optional: general sale, presale, accessibility, VIP, fraud risk |
| `admission_token` | Signed short-lived token allowing access to booking APIs |
| `admission_window` | Time slice during which a batch may enter |

A simple flow:

1. Before sale opens, users can load the waiting room page. Static assets are CDN-cached.
2. At sale start, the edge assigns each visitor a queue position or randomized rank.
3. Admission controller computes safe rate, for example "2,000 users per minute".
4. Selected visitors receive signed admission tokens valid for a few minutes.
5. Booking APIs require a valid token and reject direct bypass.
6. Once inside, normal reservation logic from [G2](G2-Distributed-Locks-Reservations.md) protects individual seats.

Token contents can be a signed JWT or opaque server-side ID:

```json
{
  "waiting_room_id": "concert-2027-delhi",
  "visitor_id": "v_abc",
  "user_id": "u_123",
  "admitted_at": "2027-03-01T10:05:00Z",
  "expires_at": "2027-03-01T10:10:00Z",
  "scope": ["view_seats", "create_hold"]
}
```

Keep it short-lived. Do not let a token become a permanent privilege or transferable ticket. Bind it to user/session/device signals where appropriate.

---

## Part 3: admission control, tokens and protecting the DB

A virtual queue is useful only if it controls the actual bottleneck. If the bottleneck is the reservation DB, admit based on DB-safe concurrency, not just web-server CPU.

Useful signals:

| Signal | Why it matters |
|---|---|
| DB connection pool utilization | Close to 100% means requests will queue and time out |
| Lock wait time / transaction duration | Long waits mean contention is already hurting |
| Checkout error rate | Payment/reservation dependencies may be overloaded |
| p95/p99 latency | Better overload signal than average latency |
| Queue depth in async components | Slow consumers mean pressure is moving downstream |

Admission algorithms:

- **Fixed rate:** admit N users/minute. Simple and predictable.
- **Token bucket:** allow bursts up to bucket size, refill at safe rate.
- **Feedback controller:** reduce admission when DB latency/error rate rises; increase slowly when healthy.
- **Partitioned admission:** each event/drop has its own budget so one hot concert does not starve all traffic.

```
Every 10 seconds:
  if db_p95 > target or error_rate > threshold:
      admission_rate = max(min_rate, admission_rate * 0.7)
  else:
      admission_rate = min(max_rate, admission_rate + step)
```

This is deliberately conservative. During overload, you shed or queue work **before** it enters the expensive path. Google SRE's guidance is similar: when overloaded, fail early and cheaply rather than accepting work that will time out after consuming resources.

Booking API check:

```text
POST /reservations
Authorization: user session
X-Admission-Token: signed-token

Gateway verifies:
- token signature
- waiting_room_id matches event
- not expired
- not already consumed if single-use
- request rate within admitted session budget
```

The token does not guarantee a seat. It only gives permission to try. Seat correctness still comes from reservation rows, constraints and payment idempotency.

---

## Part 4: fairness, bots and rate limiting vs queuing

Rate limiting and waiting rooms solve different problems.

| Situation | Rate limiter | Waiting room |
|---|---|---|
| One bot floods login | Great: throttle by IP/user/device | Not enough |
| 3 million real users arrive at 10:00 | Would reject most users unfairly | Great: order/admit them gradually |
| Expensive booking DB needs 5k attempts/min | Per-user rate limit does not control total | Admission rate controls total |
| API abuse after admission | Still needed | Waiting room only gates entry |

Fairness choices are product decisions:

| Policy | Pro | Con |
|---|---|---|
| First-come-first-served | Feels intuitive | Rewards fastest network/bots; pre-open refresh wars |
| Randomized at sale start | Fairer for users already waiting | Harder to explain; late arrivals need separate policy |
| Lottery | Strong bot resistance for limited inventory | Less "queue progress" feeling |
| Priority tiers | Supports presale/VIP/accessibility | Must be transparent to avoid distrust |

Common design for ticket drops:

- Pre-waiting-room opens before sale.
- Everyone present at sale time is randomized into an order.
- Late arrivals join after that randomized cohort.
- Admission tokens are non-transferable and short-lived.
- Bots are filtered with device fingerprinting, CAPTCHA/challenges, velocity rules and account reputation.

Do not claim perfect fairness. Say what fairness means for your product and what abuse you are mitigating.

**Interview line:** "A rate limiter stops individual abuse; a waiting room controls aggregate concurrency. I need both: rate limiting at the edge for bots, and admission tokens to cap how many buyers reach the reservation DB."

---

## Part 5: pre-scaling, load shedding and graceful degradation

A waiting room is not a substitute for capacity planning. It buys control, but the admitted path must still be ready.

Pre-scale before a known drop:

- Warm CDN cache for event pages, images, seat-map shells.
- Scale stateless app servers and gateway workers.
- Increase DB read replicas for browsing/search where safe.
- Precompute seat-map fragments or availability summaries.
- Warm Redis keys and connection pools.
- Coordinate with PSP/payment provider if checkout spike is expected.
- Run a game day/load test with realistic retries and bot traffic.

Graceful degradation:

| Feature | During drop |
|---|---|
| Event details | Serve cached/CDN version |
| Search | Maybe stale; keep booking path isolated |
| Recommendations | Disable |
| Seat map | Coarse availability or cached sections; refresh via SSE/poll |
| Checkout | Highest priority; shortest path |
| Analytics | Buffer async; drop non-critical events if necessary |

Load shedding should be intentional:

```
if request is not admitted:
  return waiting room page / 429 with retry-after
elif dependency unhealthy:
  return fast 503 + keep user in queue
else:
  process booking attempt
```

A bad failure mode is letting users through and then failing at payment confirmation. It is better to slow admission than to create thousands of half-complete reservations and angry users.

Tie this to [G2 reservations](G2-Distributed-Locks-Reservations.md): the waiting room controls **who may attempt**; the reservation pattern controls **which seat is held**; sagas/ledger patterns control **what happens after payment**.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Known concert drop at 10:00 | Pre-waiting-room + randomized order + edge admission tokens | Handles synchronized surge fairly and protects DB |
| Normal API abuse from one client | Token bucket / sliding-window rate limiter | Cheaper than queuing everyone |
| DB p99 rising during sale | Reduce admission rate; shed non-critical endpoints | Protects critical booking path |
| Sold-out event with millions still waiting | Stop admission, show sold-out state, expire queue | Honest UX; avoids useless load |
| Multiple hot events | Per-event waiting rooms and budgets | One event cannot consume all booking capacity |
| Payment provider slowing down | Slow checkout admission; keep holds short and idempotent | Avoids many stuck payment flows |

### Common interview traps

- Putting the waiting room after the app servers, so the app still receives the full stampede.
- Confusing per-user rate limiting with aggregate admission control.
- Letting admitted tokens be reused, shared or valid for too long.
- Admitting based on web-tier CPU while the true bottleneck is DB lock wait time.
- Forgetting bots and fairness policy.
- Building a queue but allowing direct API calls to bypass it.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why does a ticket drop overload systems more violently than steady 10k QPS traffic?</summary>

Because traffic is synchronized. Many users and bots refresh at the same second, retries amplify latency, DB locks are held longer, and connection pools saturate. The system can collapse even if average daily traffic is manageable.
</details>

<details><summary>2. What is the main job of a virtual waiting room?</summary>

To absorb the raw crowd before it reaches expensive services and admit users at a controlled rate using short-lived tokens. It protects the booking DB and dependencies from overload.
</details>

<details><summary>3. How is a waiting room different from a rate limiter?</summary>

A rate limiter caps individual or key-based request rates. A waiting room controls aggregate admission and preserves a user-facing order/progress experience during a legitimate crowd surge. Flash sales usually need both.
</details>

<details><summary>4. What should an admission token contain or prove?</summary>

It should prove the visitor/user was admitted for a specific waiting room/event, within a short expiry window, with allowed scopes. It should be signed or server-verifiable and hard to transfer or reuse.
</details>

<details><summary>5. Which metrics should control admission rate?</summary>

Downstream health metrics: DB connection utilization, lock wait time, transaction latency, reservation error rate, checkout dependency health and p95/p99 latency. Not just edge QPS.
</details>

<details><summary>6. Why is "first come first served" not always fair for ticket drops?</summary>

It rewards users with faster networks, aggressive refresh scripts and bots. Many systems randomize everyone present before sale start, then queue late arrivals after them.
</details>

<details><summary>7. What happens when the event sells out while users are still waiting?</summary>

Stop admission for that event, show a clear sold-out or waitlist state, and expire the queue. Continuing to admit users only creates load and frustration.
</details>

<details><summary>8. Where do reservations fit relative to the waiting room?</summary>

The waiting room decides who may enter the booking flow. Reservation rows then hold specific seats with `status` and `expires_at`. The waiting room does not guarantee inventory.
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
| [Hello Interview: Ticketmaster](https://www.hellointerview.com/learn/system-design/problem-breakdowns/ticketmaster) | Headings: "Understanding the Problem", "High-Level Design", and under "Potential Deep Dives": "How do we improve the booking experience by reserving tickets?", "How is the view API going to scale...", "How will the system ensure a good user experience during high-demand events...", "Virtual Waiting Queue for Extremely Popular Events" | ~45 min |
| [Google SRE Book: Handling Overload](https://sre.google/sre-book/handling-overload/) | Headings: "Chapter 21 - Handling Overload", "The Pitfalls of Queries per Second", "Deciding to Retry" | ~30 min |

**Connects to:** [G2 Distributed locks + reservations](G2-Distributed-Locks-Reservations.md) · [G4 Sagas](G4-Sagas.md) · [D1 Queues](../D-Async/D1-Queues.md) · [I2 Timeouts/retries/backoff](../I-Reliability/I2-Timeouts-Retries-Backoff.md) · [I3 Circuit breaker/bulkhead](../I-Reliability/I3-Circuit-Breaker-Bulkhead.md) · Questions: Ticket booking (#8), Flash sale (#18), Rate limiter (#2)
