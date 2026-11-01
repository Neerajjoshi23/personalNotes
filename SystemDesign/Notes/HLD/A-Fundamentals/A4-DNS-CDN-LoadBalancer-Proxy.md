# A4 · DNS, CDN, load balancer and proxy: the traffic-control layer

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** URL shortener (#1), YouTube/Netflix (#6), Instagram (#11), News feed (#4), API gateway/rate limiter (#2), global users follow-ups

---

## Why this topic matters

Most HLD diagrams have the same front door:

```text
User -> DNS -> CDN/edge -> load balancer/reverse proxy/API gateway -> services
```

These components decide where traffic goes, what can be cached, how failures are hidden, and which requests reach your app at all.

| Component | Job | Interview value |
|---|---|---|
| DNS | name to address | global routing, failover, CDN entry |
| CDN | serve content near users | latency + origin offload |
| Load balancer | distribute traffic | scale + availability |
| Reverse proxy | public front for services | TLS, routing, compression, caching |
| Forward proxy | proxy for clients | corporate egress, privacy/filtering |
| API gateway | L7 API policy | auth, rate limits, observability |

**Interview line:** “I’ll separate global routing, edge caching and service routing: DNS gets the user to a nearby edge or LB, CDN serves cacheable content, and the L7 gateway routes authenticated API traffic.”

---

## Part 1: DNS — records, TTL, GeoDNS and failover limits

DNS records:

| Record | Meaning | Use |
|---|---|---|
| A / AAAA | hostname -> IPv4/IPv6 | direct service address |
| CNAME | alias -> canonical name | `www` to CDN hostname |
| NS | authoritative nameserver | delegation |
| MX | mail exchange | email systems |
| TXT | text | verification, SPF/DKIM |

TTL controls resolver caching. Low TTL shifts traffic faster but increases DNS load. High TTL is efficient but slows incident response. DNS failover is not instant because browsers, OSes, recursive resolvers and sometimes applications cache answers.

GeoDNS returns different answers by geography:

```text
India -> Mumbai/Singapore edge
US    -> Virginia/California edge
EU    -> Frankfurt/London edge
```

GeoDNS reduces round trip time but is coarse; load balancers still make live per-request decisions. DNS is also often the way you enter a CDN: your `www.example.com` CNAME points to the CDN provider, and the provider answers with an edge location.

Anycast advertises the same IP prefix from multiple locations. Internet routing tends to take the nearest/cheapest path to an edge. It is excellent for CDN/DNS/DDoS edge, but BGP is not application-aware; your application still needs health checks, regional capacity and failover logic.

---

## Part 2: CDN — pull, push, edge caching and origin shield

A CDN is a globally distributed cache. Users fetch from a nearby edge; origin is contacted on miss.

```text
User requests /assets/app.hash.js
edge miss -> pulls from origin -> caches -> later users hit edge
```

Pull CDN is the default for most sites, images, JS/CSS and public media. Push CDN uploads content ahead of time; it can fit explicit publishing pipelines but is operationally heavier.

| Content | Cache policy |
|---|---|
| hashed JS/CSS/images | long `public, immutable` TTL |
| public videos/thumbnails | long CDN TTL |
| URL-shortener stable redirects | possible with careful invalidation |
| personalized feed API | private/no shared cache by default |
| auth/session responses | no public caching |

For React apps: content-hashed assets can live at CDN for a year; `index.html` usually needs short TTL/revalidation so deploys can point to new hashes.

Origin shield reduces cache stampedes:

```text
User -> nearest edge -> shield edge -> origin
                 miss        miss once
```

Use it for video chunks, image variants, downloads and hot public assets. Trade-off: one extra hop on shield miss, and the shield region must be chosen near origin. CDN failure modes include stale deploys, private-data leaks through wrong cache keys, origin overload on low hit ratio, and invalidation delays.

---

## Part 3: load balancers — algorithms, health checks, draining and TLS

```text
            +--> app-1
Client -> LB +--> app-2
            +--> app-3
```

Pick the algorithm based on request shape:

| Algorithm | Fits | Avoid when |
|---|---|---|
| Round robin | homogeneous servers, short similar requests | long-lived or uneven requests |
| Weighted round robin | mixed instance sizes or gradual rollout | weights are stale/manual |
| Least connections | WebSocket, uploads, long polling | connection count does not reflect CPU/latency |
| Least response time / EWMA | latency-sensitive APIs | can overreact during transient spikes |
| Random two choices | large fleets with low coordination | needs enough targets to work well |
| Consistent hashing | cache affinity, shard routing, sticky by key | hot keys or frequent membership changes |
| IP hash / cookie stickiness | legacy sessions, connection placement | stateless tier is possible |

Health checks can be TCP checks, HTTP `/healthz`, readiness, or liveness. A bad health check can cause an outage: if every app declares itself unhealthy because one downstream is flaky, the LB has no targets. Prefer shallow liveness, meaningful readiness and circuit breakers for downstream failure.

Connection draining stops new traffic while in-flight requests or long-lived connections finish. Without draining, deploys break uploads, payments, WebSocket sessions and long polls.

TLS can terminate at CDN/edge, regional L7 LB/gateway, service/app, or inside a service mesh with mTLS. Public L7 termination centralizes certs and enables path/header routing, WAF, auth hooks and observability; internal TLS/mTLS may still be used for sensitive systems.

Global layers choose a region; regional LBs distribute to healthy zonal/app targets. If you draw one LB for a global product, say which role it plays.

---

## Part 4: reverse proxy vs forward proxy vs API gateway vs service mesh

Reverse proxy represents servers:

```text
Client -> reverse proxy -> internal services
```

Jobs: TLS termination, routing, compression, static files, buffering, hiding topology.

Forward proxy represents clients:

```text
Client -> forward proxy -> internet
```

Jobs: corporate filtering, egress control, privacy, sometimes caching.

API gateway is a reverse proxy plus API policy:

```text
Client -> API gateway -> services
          auth, rate limit, validation, routing, logs, traces
```

Service mesh handles east-west service-to-service traffic: mTLS, retries, timeouts, circuit breaking and traffic splits.

```text
Internet client
  -> CDN
  -> API gateway / reverse proxy     (north-south)
      -> service A
      -> service B <-> mesh sidecars (east-west)
```

Use an API gateway when client-facing APIs need shared auth/rate-limit/observability. Use a service mesh when internal service-to-service concerns become hard to manage consistently. Do not add both by default for a small monolith.

---

## Part 5: how to draw the front door in real designs

Avoid a single magic "LB" box when the front door matters:

```text
Browser
  -> DNS / GeoDNS / anycast edge
  -> CDN edge  ---- static assets / public media / sometimes public redirects
  -> L7 gateway / reverse proxy ---- auth, rate limit, routing, TLS termination
      +--> service A
      +--> service B
      +--> WebSocket gateway
```

URL shortener:

```text
DNS -> CDN/edge -> redirect service -> Redis -> DB
```

CDN can cache stable hot redirects; Redis caches mappings; DB is source of truth. Disabled/expired links need short TTL or invalidation.

YouTube/Netflix:

```text
DNS/GeoDNS -> CDN edge -> video chunks
API traffic -> gateway -> metadata/recommendation services
```

Video bytes should come from CDN/object storage, not app servers.

Chat:

```text
DNS -> regional LB -> WebSocket gateway -> connection servers -> pub/sub backplane
```

Sticky routing may help connections, but messages/presence cannot live only in one process.

Quick rule: DNS chooses a destination before connection, CDN answers cacheable bytes near the user, LB/proxy chooses a healthy backend, and gateway applies API rules.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| global static assets | pull CDN + long TTL | origin offload |
| public media | CDN + object storage + origin shield for hot libraries | bandwidth/latency |
| regional routing | GeoDNS/anycast + regional LB | reduce RTT |
| HTTP path routing | L7 LB/reverse proxy | application-aware |
| raw TCP/UDP | L4 LB | lower overhead |
| long-lived connections | least-connections or hashing | round-robin can skew load |
| same user/backend | sticky only if necessary | prefer stateless |
| shared auth/rate policy | API gateway | one API front door |
| service-to-service policy | service mesh when ops need it | east-west mTLS/retries/timeouts |
| corporate egress | forward proxy | client-side proxy |

### Common interview traps

- Treating DNS failover as instant.
- Public-caching personalized responses.
- Saying round-robin when long-lived connections need least-connections or hashing.
- Relying on sticky sessions instead of stateless apps.
- Confusing reverse proxy, forward proxy, API gateway and service mesh.
- Putting business logic in the gateway.
- Drawing one "LB" box for a global system without saying if it is global, regional, L4 or L7.

## Self-test (answer out loud first, then open)

<details><summary>1. Why is DNS failover not instant?</summary>

DNS answers are cached by browsers, OSes, recursive resolvers and sometimes applications. TTL changes do not force every client to refresh immediately.
</details>

<details><summary>2. When would you choose least-connections over round-robin?</summary>

For long-lived or uneven requests such as WebSocket, long polling or uploads, where active connection count is a better load signal than simple rotation.
</details>

<details><summary>3. What is connection draining?</summary>

Stop sending new traffic to an instance while allowing in-flight requests or long-lived connections to finish before shutdown, usually with a grace period.
</details>

<details><summary>4. What is the risk of a too-deep health check?</summary>

If every instance depends on the same flaky downstream for readiness, the LB may remove the entire fleet, turning a partial dependency issue into full outage.
</details>

<details><summary>5. What is CDN origin shield?</summary>

A parent cache between edge caches and origin. It collapses misses/revalidations so many edges do not stampede the origin.
</details>

<details><summary>6. API gateway vs service mesh?</summary>

API gateway handles north-south client API policy (auth, rate limit, routing). Service mesh handles east-west service-to-service traffic (mTLS, retries, timeouts, traffic splitting).
</details>

<details><summary>7. What is anycast good for?</summary>

Advertising the same IP from multiple locations so users route to a nearby edge. Great for CDN/DNS/DDoS edge, but not application-aware by itself.
</details>

<details><summary>8. When can CDN caching be dangerous?</summary>

For personalized/authenticated responses without correct `Cache-Control`, `Vary` and cache-key design; it can leak private data.
</details>

<details><summary>9. Where can TLS terminate, and why might you terminate at the L7 gateway?</summary>

At CDN, LB/gateway, or app. L7 termination centralizes certs and enables path/header routing, WAF, auth hooks and observability; internal TLS/mTLS may still be used.
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
| [System Design Primer: Domain name system](https://github.com/donnemartin/system-design-primer#domain-name-system) | Exact section: “Domain name system” | ~10 min |
| [System Design Primer: Content delivery network](https://github.com/donnemartin/system-design-primer#content-delivery-network) | Exact section: “Content delivery network” | ~15 min |
| [System Design Primer: Load balancer](https://github.com/donnemartin/system-design-primer#load-balancer) | Exact section: “Load balancer”, including Layer 4 and Layer 7 paragraphs | ~20 min |
| [System Design Primer: Reverse proxy](https://github.com/donnemartin/system-design-primer#reverse-proxy-web-server) | Exact sections: “Reverse proxy (web server)” and “Load balancer vs reverse proxy” | ~15 min |
| [Hello Interview: Networking Essentials](https://www.hellointerview.com/learn/system-design/core-concepts/networking-essentials) | “Load Balancing”, “Types of Load Balancing”, “Regionalization and Latency” | ~15 min |

**Connects to:** [A2 Request Flow](A2-Request-Flow.md) · [A3 HTTP Versions + Networking](A3-HTTP-Versions-Networking.md) · [A7 Scaling Basics](A7-Scaling-Basics.md) · [C4 HTTP/CDN caching](../C-Caching/C4-HTTP-CDN-Caching.md) · [E2 Scaling WebSockets](../E-Realtime/E2-Scaling-WebSockets.md) · [I3 Circuit breaker/bulkhead](../I-Reliability/I3-Circuit-Breaker-Bulkhead.md) · [I6 Multi-region DR](../I-Reliability/I6-Multi-Region-DR.md) · URL shortener (#1) · YouTube (#6)
