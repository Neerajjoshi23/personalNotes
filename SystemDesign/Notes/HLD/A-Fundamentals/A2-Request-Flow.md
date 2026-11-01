# A2 · Request flow: from browser click to database row and back

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Every question; especially URL shortener (#1), Chat (#3), News feed (#4), YouTube (#6), Instagram (#11), frontend performance questions

---

## Why this topic matters

Every HLD diagram starts with a request. If you understand what happens between a browser and your app, your diagrams become real instead of box art.

For a frontend engineer, map Chrome DevTools to system design:

| DevTools timing | System-design meaning |
|---|---|
| DNS Lookup | name resolution, CDN/LB entry point |
| Initial connection | TCP handshake, RTT, connection reuse |
| SSL | TLS handshake and certificate validation |
| Request sent | usually small except uploads |
| Waiting / TTFB | LB + app + cache/DB/downstream time |
| Content download | payload size, compression, CDN, bandwidth |

When an interviewer asks “why is this slow?”, this note gives you the vocabulary to split the path instead of guessing.

**Interview line:** “On the critical path the browser may pay DNS, TCP and TLS unless it reuses a connection; then the request hits CDN/LB, app servers, cache or database, and the response travels back. I’ll optimize the slowest segment of that path.”

---

## Part 1: the full path at a glance

```text
User action in React
  -> browser cache / service worker / connection pool
  -> DNS: api.example.com -> IP address
  -> TCP handshake: SYN, SYN-ACK, ACK
  -> TLS handshake: certificate + shared keys
  -> HTTP request: method, path, headers, body
  -> CDN / reverse proxy / load balancer
  -> app service
  -> cache / DB / queue / downstream service
  -> HTTP response
  -> browser parses JSON/HTML/assets and updates UI
```

Modern browsers do not repeat every step for every request. DNS is cached. TCP/TLS connections are pooled. HTTP/2 and HTTP/3 multiplex many requests. Still, this path is the baseline mental model.

Interview habit: draw **client-to-edge** separately from **edge-to-data**, then ask whether setup, backend work or payload transfer dominates latency.

---

## Part 2: DNS resolution

DNS maps a hostname to records. A browser usually checks browser cache, OS cache and a recursive resolver before anyone walks the root/TLD/authoritative chain.

```text
Browser cache?
  -> OS cache?
  -> recursive resolver cache?
  -> root: "who knows .com?"
  -> .com TLD: "who knows example.com?"
  -> authoritative NS: "api.example.com = 203.0.113.10"
```

| Record | Meaning | HLD use |
|---|---|---|
| A / AAAA | name -> IPv4/IPv6 | service address |
| CNAME | alias -> canonical name | point `www` to CDN |
| MX | mail server | email design |
| TXT | arbitrary text | verification, SPF/DKIM |
| NS | authoritative nameserver | delegation |

DNS answers have TTL. Low TTL shifts traffic faster but does not force every client to refresh instantly; some resolvers and apps cache longer than expected. GeoDNS can return different answers by region, getting Indian users to a nearby CDN edge instead of a far origin.

In DevTools, DNS is visible only on a cache miss. Repeated API calls to the same origin often show 0 ms DNS.

---

## Part 3: TCP handshake, keep-alive and pooling

TCP gives reliable ordered bytes. A cold connection starts with one RTT:

```text
Client                         Server
  | -------- SYN -------------> |
  | <----- SYN + ACK ---------- |
  | -------- ACK -------------> |
```

If the user is in India and the server is in the US, that RTT alone can be ~150-250 ms. For small API calls, setup can dominate actual app work.

TCP also handles retransmission, ordering and congestion control. The downside is transport head-of-line blocking: if an earlier packet is missing, later bytes wait at the receiver.

HTTP keep-alive and browser connection pools avoid paying setup repeatedly. A warm pooled connection skips DNS/TCP/TLS and goes straight to HTTP framing.

```text
Cold request: DNS + TCP + TLS + HTTP + backend + download
Warm request:             HTTP + backend + download
```

Implications: reuse one origin when possible, avoid unnecessary origins, use `preconnect` only for critical hosts, prefer HTTP/2/3 for multiplexing, and pool backend/DB connections.

---

## Part 4: TLS handshake

TLS provides encryption, integrity and server authentication. In HTTPS, HTTP runs inside TLS.

Simplified TLS 1.3 flow:

```text
ClientHello: supported versions/ciphers, SNI, random/key share
ServerHello: chosen cipher, certificate, key share
Client validates certificate chain + hostname
Both sides derive symmetric keys
Encrypted HTTP begins
```

| Mode | Typical setup before encrypted app data | Notes |
|---|---|---|
| TLS 1.2 full handshake | often 2 RTTs after TCP | older, more round trips |
| TLS 1.3 full handshake | 1 RTT after TCP | modern default |
| TLS resumption | 0-1 RTT | reuses prior session ticket/PSK |
| TLS 1.3 0-RTT | app data can be sent early | replay risk; only safe for idempotent requests |

0-RTT is attractive but dangerous for non-idempotent writes. A replayed `POST /payments` or `POST /messages` can duplicate side effects unless protected by [A6 API Design](A6-API-Design.md) idempotency keys and replay defenses.

TLS can terminate at the CDN, load balancer or app. L7 termination enables path/header routing, WAF rules, compression and central cert management. End-to-end TLS or mTLS improves internal protection when the threat model requires it.

---

## Part 5: HTTP request/response

HTTP messages are headers plus optional body:

```http
GET /v1/feed?pageSize=20&pageToken=abc HTTP/2
Authorization: ******
Accept: application/json
```

```http
200 OK
Content-Type: application/json
Cache-Control: private, max-age=30

{ "items": [ ... ], "nextPageToken": "def" }
```

Design-relevant details: method semantics, auth/idempotency/rate-limit/cache headers, body size, status code and cache-control. TTFB usually includes LB time, app queueing, auth, cache lookup, DB/downstream calls and SSR if present. If TTFB is high, shrinking images will not fix the root cause.

---

## Part 6: LB -> app -> cache/DB -> back

Typical backend path:

```text
Client -> CDN/edge -> LB/reverse proxy -> stateless app
          -> Redis/Memcached -> primary DB/read replica
          -> queue/stream/downstream service -> response back
```

Reads and writes often have different critical paths. Reads usually authenticate, check cache, fall back to an indexed DB/read-replica query, fill cache and return. Writes validate, run a DB transaction, publish side effects, update/invalidate cache and return.

URL shortener redirects should be cache-heavy and analytics-async. Payments should prioritize durability and idempotency. Large downloads should use object storage + CDN/presigned URLs instead of app-server byte relay.

---

## Part 7: DevTools Timing tab mapped to the path

Chrome's Timing tab maps cleanly to system design:

| DevTools phase | System meaning | Usual fix |
|---|---|---|
| Queueing / Stalled | browser waits for priority/socket/service-worker/proxy | fewer competing requests, HTTP/2/3, reuse |
| DNS Lookup | hostname resolution | fewer origins, better DNS/CDN, prefetch/preconnect |
| Initial connection | TCP handshake | keep-alive, regional edge, HTTP/3 where supported |
| SSL | TLS handshake/cert validation | TLS 1.3, resumption, reuse |
| Request sent | upload bytes | direct uploads, compression, smaller payload |
| Waiting (TTFB) | LB/app/cache/DB/downstream work | cache, indexes, async work, scale app tier |
| Content Download | response transfer | pagination, compression, CDN, media pipeline |

Zero DNS/connection/SSL usually means reuse. High TTFB points to backend work. High download points to payload size. Adobe Connect/WebRTC note: control APIs use HTTPS, while audio/video often uses WebRTC media over UDP/SRTP and TURN fallback.

---

## Part 8: where hops can be cached or skipped

```text
Browser/service-worker cache:  skip network for cacheable responses
DNS cache:                     skip resolver chain
Connection pool/TLS resumption: skip or shorten TCP/TLS
HTTP cache / CDN:              skip origin/app
Reverse proxy cache:           skip app for selected responses
Redis/app cache:               skip DB/read replica
DB buffer cache/index:         reduce disk/IO
```

Examples: React hashed assets skip app via browser+CDN cache; URL shortener redirects use Redis/CDN and queue analytics; chat history uses a warm connection, cursor pagination and an index on `(conversation_id, created_at, id)`.

**Interview line:** "I will read the waterfall by phase: if setup phases dominate, optimize reuse/region; if TTFB dominates, optimize backend; if download dominates, optimize payload and CDN."

---

## Part 9: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| static assets | CDN + long TTL + content-hashed filenames | avoid app/origin load |
| browser API | HTTPS + keep-alive + REST/JSON | simple and debuggable |
| large upload | direct object-storage upload | avoid app bandwidth bottleneck |
| many repeated calls | same origin + connection reuse + HTTP/2/3 | reduce handshakes |
| slow TTFB | profile app/cache/DB path | frontend cannot fix backend wait alone |
| global users | GeoDNS/CDN/regional placement | reduce RTT |
| replay-sensitive writes | avoid 0-RTT or require idempotency | prevent duplicate side effects |

### Common interview traps

- Saying "request hits server" while skipping DNS/TCP/TLS when latency matters.
- Ignoring connection reuse.
- Treating TTFB as purely frontend.
- Sending uploads through app servers unnecessarily.
- Adding CDN for private dynamic responses without cache-key/privacy design.
- Forgetting L7 LBs terminate TLS and can route by HTTP fields.

## Self-test (answer out loud first, then open)

<details><summary>1. What are the cold-path steps before an HTTPS request returns data?</summary>

Browser/OS cache checks, DNS resolution, TCP 3-way handshake, TLS handshake/certificate validation, HTTP request, edge/LB/app/cache/DB work, response download.
</details>

<details><summary>2. Recursive vs iterative DNS?</summary>

The browser asks a recursive resolver to find the answer. That resolver may iteratively ask root, TLD and authoritative nameservers, caching the result by TTL.
</details>

<details><summary>3. How many RTTs does TCP setup cost?</summary>

The TCP 3-way handshake costs one RTT before application data can flow.
</details>

<details><summary>4. TLS 1.2 vs TLS 1.3 in latency terms?</summary>

TLS 1.3 usually needs fewer round trips than TLS 1.2 for a full handshake, and resumption can reduce it further. TLS 1.3 0-RTT can send early data but has replay risks.
</details>

<details><summary>5. DevTools shows high Queueing/Stalled but zero DNS/SSL. What might be happening?</summary>

The browser already has cached DNS/TLS, but the request is waiting on connection limits, priorities, a service worker, proxy/cache negotiation, or main-thread scheduling.
</details>

<details><summary>6. DevTools shows high TTFB. Which part of the system do you inspect first?</summary>

The backend critical path: LB/app queueing, auth/session lookup, cache miss, DB/indexes, downstream calls, server rendering, or overloaded workers.
</details>

<details><summary>7. Name three places a request can be skipped by caching.</summary>

DNS resolver cache skips nameserver lookups, connection pool skips TCP/TLS setup, CDN/browser HTTP cache skips origin/app, Redis skips DB.
</details>

<details><summary>8. Why is 0-RTT unsafe for arbitrary POST requests?</summary>

Early data can be replayed. Non-idempotent writes need idempotency keys/replay protection or should avoid 0-RTT.
</details>

<details><summary>9. Why do large uploads often bypass app servers?</summary>

They consume app bandwidth and memory. Presigned uploads send bytes to object storage while the app handles auth and metadata.
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
| [What happens when…](https://github.com/alex/what-happens-when) | Exact sections: “DNS lookup”, “ARP process”, “Opening of a socket”, “TLS handshake”, “HTTP protocol”, “HTTP Server Request Handle” | ~45 min; skim hardware/rendering parts |
| [MDN: Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview) | “Components of HTTP-based systems”, “Basic aspects of HTTP”, “HTTP flow”, “HTTP Messages”, “APIs based on HTTP” | ~25 min |
| **Alex Xu Vol 1, ch 1: Scale From Zero To Millions** | Backend path sections: “Load balancer”, “Cache”, “Content delivery network”, “Stateless web tier” | [PDF p.5](<../../../Books/System Design Interview Vol 1 - Alex Xu.pdf#page=5>) |

**Connects to:** [A3 HTTP Versions + Networking](A3-HTTP-Versions-Networking.md) · [A4 DNS/CDN/LB/Proxy](A4-DNS-CDN-LoadBalancer-Proxy.md) · [A6 API Design](A6-API-Design.md) · [C4 HTTP/CDN caching](../C-Caching/C4-HTTP-CDN-Caching.md) · [FE4 Network Layer](../../../../ReactPersonal/Info/frontend-system-design/FE4-Network-Layer.md) · [FE5 Performance](../../../../ReactPersonal/Info/frontend-system-design/FE5-Performance.md)
