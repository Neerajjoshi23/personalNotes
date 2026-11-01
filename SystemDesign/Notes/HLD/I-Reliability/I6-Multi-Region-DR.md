# I6 · Multi-Region + DR: surviving a region outage without pretending latency is free

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** global scale follow-ups, payment (#16), key-value store (#10), chat (#3), news feed (#4), YouTube / media (#6), Dropbox / file sync (#5).

---

## Why this topic matters

Most interview designs start in one region. Then the interviewer asks: **"What if the region goes down? What about global users?"** Multi-region design is the answer, but it is expensive and full of trade-offs.

You need vocabulary:

| Term | Meaning |
|---|---|
| Availability Zone (AZ) | Separate datacenter-like zone inside one region, low-latency connected |
| Region | Geographically separate cloud location, higher latency between regions |
| RPO | Recovery Point Objective: how much data loss is acceptable |
| RTO | Recovery Time Objective: how long recovery may take |
| Active-passive | One region serves traffic; another is standby |
| Active-active | Multiple regions serve production traffic |

For Adobe Connect, a regional outage could affect meetings, recordings, chat, and login. For DrawBoard, region choice affects collaboration latency and conflict handling. The right answer is rarely "just replicate everything everywhere synchronously".

**Interview line:** "I first define RPO/RTO per data class. Then I choose the cheapest DR pattern that meets those numbers: backup/restore, pilot light, warm standby, or multi-site active-active."

---

## Part 1: availability zones vs regions

### Availability zones

AZs are isolated facilities inside a region. They are designed so one zone can fail without taking down the others. Latency between AZs in the same region is usually low enough for synchronous-ish database replication, though you still pay latency.

Typical single-region highly available setup:

```
Region: ap-south-1
 ├─ AZ-a: app pods + DB primary
 ├─ AZ-b: app pods + DB standby
 └─ AZ-c: app pods + read replica / cache nodes

Regional load balancer routes across healthy AZs.
```

Use multiple AZs before you jump to multiple regions. Multi-AZ solves many machine/rack/AZ failures with less complexity than multi-region.

### Regions

Regions are geographically far apart. Cross-region latency can be tens to hundreds of milliseconds. That changes design:

- synchronous writes across regions hurt latency and availability;
- async replication introduces lag and possible data loss on failover;
- active-active writes create conflict resolution problems;
- operational runbooks become essential.

A region is a failure boundary and a latency boundary.

---

## Part 2: RPO and RTO drive the architecture

### RPO: how much data can you lose?

If backups run every 24 hours, RPO may be up to 24 hours. If async replication lags by 5 seconds, RPO might be seconds. If every committed write must survive regional failure, you need a much stronger and more expensive design.

| Data | Example RPO |
|---|---|
| Analytics events | minutes or hours may be acceptable |
| Feed cache | can be rebuilt; high RPO okay |
| Chat messages | seconds may be acceptable depending product |
| Payment ledger | near-zero data loss expected |
| Meeting recording chunks | depends on buffering and upload guarantees |

### RTO: how fast must you recover?

If restoring from backup takes 8 hours, RTO is hours. If a standby region is already warm, RTO can be minutes. If active-active is already serving, RTO can be near-zero for traffic, but data correctness may still need reconciliation.

| Workload | Possible RTO |
|---|---|
| Internal analytics | hours |
| Public marketing site | minutes |
| Checkout/payment | very low, but correctness first |
| Live meeting join | low; ongoing sessions may still drop |
| File download | low if blobs are replicated/CDN cached |

Do not give one RPO/RTO for the whole system. Separate data classes and user journeys.

**Interview line:** "For payment ledger I target near-zero RPO; for recommendation cache I can lose and rebuild it. Different data gets different DR treatment."

---

## Part 3: the four AWS DR strategies

AWS presents four common DR options, ordered by cost and recovery speed.

### 1. Backup and restore

```
Primary region -> periodic backups -> backup storage in DR region
Outage -> restore DB/app/data -> switch traffic
```

Pros:

- cheapest;
- simple for low-criticality workloads;
- good baseline for everything.

Cons:

- high RTO: restore takes time;
- RPO depends on backup frequency;
- backups can be broken if never tested.

Use for internal tools, analytics, low-traffic systems, and as a baseline even when you have stronger DR.

### 2. Pilot light

Keep the smallest critical core running in the DR region: data replication, minimal database, base network/security, maybe no full app fleet.

```
DR region:
  data replica + config + minimal core
  app capacity scaled near zero
Outage:
  scale app fleet, promote DB, route traffic
```

Pros: cheaper than full standby; faster than restore. Cons: still needs scaling and failover steps.

### 3. Warm standby

A smaller but complete version of production runs in the DR region.

```
Primary: full capacity
Standby: 20% capacity, live data replica
Outage: promote + scale to 100% + route traffic
```

Pros: lower RTO; systems are already running. Cons: more expensive; standby must be continuously patched and tested.

### 4. Multi-site active/active

Multiple regions serve production traffic simultaneously.

```
Users in India -> Mumbai/Singapore region
Users in US    -> Virginia/Oregon region
Global LB routes to nearest healthy region
```

Pros: lowest traffic failover time, good global latency. Cons: hardest data model: replication lag, conflicts, home-region routing, split-brain risks, and operational complexity.

---

## Part 4: active-passive vs active-active

### Active-passive

One region handles writes; another waits.

```
          writes/reads
Users ───────────────► Primary region
                         │
                         │ async replication
                         ▼
                      Standby region
```

Failover steps:

1. Detect primary outage.
2. Freeze or fence primary if reachable to avoid split brain.
3. Promote standby database / services.
4. Update global load balancer / DNS.
5. Scale capacity.
6. Verify health and data lag.

Pros: simpler data consistency. Cons: standby capacity may be idle; failover has RTO; async lag creates RPO.

### Active-active

Multiple regions serve reads and writes.

```
India users -> Region A accepts writes
US users    -> Region B accepts writes
Regions replicate changes asynchronously
```

Pros: lower user latency and better regional resilience. Cons: simultaneous writes can conflict.

Conflict-handling approaches:

| Approach | Use when | Trade-off |
|---|---|---|
| Home-region routing | Each user/account/document has one write region | Simpler; user far from home has higher latency |
| Single global writer per entity | Stronger ordering for that entity | Failover needed if writer region dies |
| CRDT/merge | Collaborative/offline data | Complex but great for DrawBoard-style sync |
| Last-write-wins | Low-value data only | Can silently lose updates |
| Synchronous global consensus | Very strong correctness | High latency and lower availability |

For most interview systems, active-passive or active-active with home-region routing is safer than unrestricted multi-master writes.
---

## Part 5: data replication across regions

Cross-region data is the hardest part of DR.

### Async replication and lag

Most cross-region replication is asynchronous:

```
write committed in primary
  ↓
replication stream ships later
  ↓
standby applies write
```

If primary dies before the write reaches standby, you may lose that write. That is your RPO. Monitor replication lag as a first-class metric.

### Data classes need different strategies

| Data class | Strategy |
|---|---|
| User profile | Primary DB async replica; failover with small RPO |
| Chat messages | Partition by conversation/home region; async replica; client retries/idempotency |
| Payment ledger | Stronger replication, immutable log, reconciliation, possibly region-limited writes |
| Blob/object storage | Cross-region replication + checksums + CDN |
| Cache/search index | Rebuild from source of truth or replicate asynchronously |
| CRDT document updates | Multi-writer merge, snapshots and update log |

### Home-region routing

Assign each entity a home region. All writes for that entity go there.

```
user_id hash / account setting -> home_region
conversation_id -> home_region
meeting_id -> home_region
```

Benefits:

- avoids most conflicts;
- keeps ordering for one entity;
- makes failover per entity possible.

Costs:

- remote users may pay extra latency;
- moving home region requires migration;
- if home region fails, you need a promotion/fencing plan.

### Reconciliation

Even with careful design, failover can create gaps. Plan reconciliation:

- compare provider records vs ledger;
- replay event logs;
- verify blob checksums;
- rebuild derived indexes;
- inspect DLQs;
- run consistency checks after failback.

For payment (#16), reconciliation is not optional. For feed cache, rebuilding is enough.

---

## Part 6: global load balancing, GeoDNS and failover drills

### Routing users

Global routing options:

| Tool | How it routes | Notes |
|---|---|---|
| GeoDNS | DNS answer depends on user geography / health | DNS caching means failover is not instant |
| Anycast / global accelerator | Same IP advertised from many locations | Faster failover, provider-managed |
| Global HTTP load balancer | Layer 7 routing by latency, region, health | Can do weighted/canary routing |
| CDN | Serves cached static/blob content near users | Dynamic writes still need origin strategy |

Low DNS TTL helps but does not guarantee instant client movement; resolvers and clients cache. Design failover expectations accordingly.

### Health checks

Do not route based only on "process is up". Health checks should test critical dependencies for that path.

- `/healthz` for process liveness;
- `/readyz` for serving readiness;
- synthetic canary requests for user-visible flows;
- regional dependency checks for DB/cache/queue;
- separate health for read-only degraded mode.

### Failover drills

A DR plan that has never been tested is a hope. Drills should answer:

1. Who can declare failover?
2. What metrics confirm primary is unhealthy?
3. How do we fence the old primary?
4. What is current replication lag?
5. How do we promote standby?
6. How do we route traffic?
7. What data validation happens after failover?
8. How do we fail back?

Run game days. Measure actual RTO/RPO. Update the runbook when reality differs from the document.

**Interview line:** "I include DR drills in the design. Backups and replicas do not count unless we regularly restore/promote them and measure actual RTO/RPO."

---

## Part 7: applying it to common interview systems

### Payment system (#16)

- Strongest RPO requirement.
- Keep immutable ledger entries and idempotency keys.
- Prefer home-region or single-writer per account/merchant.
- Reconcile with payment providers after failover.
- Never use last-write-wins for money.

### Chat (#3)

- Partition conversations by `conversation_id` and home region.
- Replicate message log asynchronously to DR.
- Client message IDs make retries idempotent.
- Presence can be regional and lossy; message history is more important.
- Active-active possible if conversations have a clear home region.

### Dropbox / file sync (#5)

- Blob storage cross-region replication.
- Metadata DB replication and backups.
- Chunk hashes/checksums verify integrity.
- CDN can keep downloads available for cached content.
- Conflict handling needed for offline edits.

### DrawBoard / collaborative editor (#12)

- CRDT updates can be accepted near users and merged, but room latency improves if a room has a home region.
- Store update log and snapshots in replicated storage.
- If AI participant fails regionally, degrade it; keep whiteboard sync.

---

## Part 8: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Internal low-criticality tool | Backup and restore | Cheapest; hours of RTO acceptable. |
| User-facing app with moderate DR needs | Pilot light | Faster than restore without full duplicate cost. |
| Revenue-critical app needing minutes RTO | Warm standby | Complete stack already running. |
| Global low-latency product | Active-active with home-region routing | Low latency while limiting conflicts. |
| Payment ledger | Strong single-writer/ledger + replication + reconciliation | Correctness over regional write latency. |
| Feed/search/cache | Rebuild derived data | Do not over-protect data that can be regenerated. |
| Media files | Cross-region object replication + CDN | Blob durability and download availability. |
| Live meetings | Multi-AZ first; regional failover for new sessions | Existing realtime sessions may drop; communicate limits. |

### Common interview traps

- Saying "multi-region" without defining RPO/RTO.
- Treating AZ and region as the same thing.
- Assuming DNS failover is instant.
- Synchronous global writes for every request without discussing latency/availability.
- Active-active writes with no conflict strategy.
- Replicating derived caches as if they were source-of-truth data.
- Never testing backup restore or regional promotion.

---

## Self-test (answer out loud first, then open)

<details><summary>1. AZ vs region?</summary>

An AZ is an isolated zone inside a region with low-latency regional networking. A region is geographically separate and has much higher latency. Multi-AZ is the first HA step; multi-region is for DR/global latency and is more complex.
</details>

<details><summary>2. RPO vs RTO?</summary>

RPO is how much data loss is acceptable. RTO is how long recovery may take. Example: async replication with 5 seconds lag gives roughly seconds of RPO; warm standby may give minutes of RTO.
</details>

<details><summary>3. Name the four AWS DR strategies in increasing cost/readiness.</summary>

Backup and restore, pilot light, warm standby, and multi-site active/active.
</details>

<details><summary>4. Why is active-active hard?</summary>

Multiple regions accept writes, so replication is asynchronous and concurrent updates can conflict. You need home-region routing, per-entity leaders, CRDT/merge logic, or another conflict strategy.
</details>

<details><summary>5. Why is payment different from feed cache in DR?</summary>

Payment ledger data needs near-zero loss, auditability, idempotency, and reconciliation. Feed cache is derived data; it can often be rebuilt from source-of-truth posts/follows.
</details>

<details><summary>6. What is home-region routing?</summary>

Assign each entity (user/account/conversation/document) to a home region and send all writes for that entity there. It preserves ordering and avoids most conflicts, at the cost of latency for remote users and migration complexity.
</details>

<details><summary>7. Why must DR plans include drills?</summary>

Because backups, replicas, IAM, DNS, and runbooks often fail in practice. Drills measure actual RTO/RPO and reveal missing steps before a real outage.
</details>

<details><summary>8. How would you make DrawBoard multi-region?</summary>

Give each room/document a home region for low-latency coordination, store CRDT updates and snapshots in replicated storage, use client retries/idempotent updates, and allow CRDT merge for offline/multi-writer cases. Degrade optional AI before core sync.
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
| [AWS: Disaster recovery options in the cloud](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html) | Exact headings: "Backup and restore", "Pilot light", "Warm standby", "Multi-site active/active"; h3 "AWS services" under each strategy and "AWS Elastic Disaster Recovery" under pilot light | ~30 min |
| [B4 Replication](../B-Data/B4-Replication.md) | Review replication lag, read-your-writes, multi-leader conflicts, quorum trade-offs. | local note |
| [I1 Leader election](I1-Leader-Election.md) | Review fencing/split-brain before discussing failover promotion. | local note |

**Connects to:** [B4 Replication](../B-Data/B4-Replication.md) · [B7 CAP](../B-Data/B7-CAP-Consistency.md) · [F1 Object storage](../F-Blobs-Fanout/F1-Object-Storage-Presigned-URLs.md) · [E3 Collaborative sync](../E-Realtime/E3-Collaborative-Sync.md) · [I1 Leader election](I1-Leader-Election.md) · Questions: Payment (#16), KV store (#10), Chat (#3), Dropbox (#5), YouTube (#6)