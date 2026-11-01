# A3 · HTTP versions + networking: enough layers to make good trade-offs

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Chat (#3), YouTube/Netflix (#6), API gateways, realtime systems, frontend performance, ChatGPT streaming (#24)

---

## Why this topic matters

You do not need to recite the OSI model in an HLD interview. You need to know which layer a problem belongs to. Reliable APIs, low-latency media, WebSockets, QUIC, L4/L7 load balancing and gRPC all become easier when the layers are clear.

**Interview line:** “For normal APIs I’ll use HTTPS. For bidirectional low-latency app events I’ll use WebSocket. For media I’ll separate control APIs from UDP/WebRTC media because retransmitting every packet hurts real-time quality.”

---

## Part 1: layers, only as needed

Use this simplified stack:

```text
Application: HTTP, gRPC, GraphQL, WebSocket, DNS
Transport:   TCP, UDP, QUIC
Network:     IP routing
Link:        Ethernet/Wi-Fi
Physical:    cable/radio
```

A browser request maps to browser HTTP + TLS over TCP/QUIC over IP. Layer awareness prevents category errors: DNS is naming, TCP is reliability/ordering, HTTP is application semantics, CDN is edge caching, and L7 load balancing needs application data. When an interviewer asks "L4 or L7?", they are asking how much of the request the routing layer must understand.

---

## Part 2: TCP vs UDP

| Feature | TCP | UDP |
|---|---|---|
| Connection | connection-oriented | connectionless |
| Reliability | retransmits lost bytes | no built-in retransmission |
| Ordering | ordered byte stream | independent datagrams |
| Uses | web APIs, DB, SSH | DNS, QUIC, live media, games |

TCP is the default for correctness: reliable ordered delivery. Its cost is overhead and transport head-of-line blocking. UDP is minimal, not ?bad?; protocols above it choose their own reliability. QUIC uses UDP but provides secure streams. WebRTC media uses UDP/SRTP because late audio/video packets may be less useful than skipped packets.

Adobe Connect mental model:

```text
control plane: HTTPS APIs for auth/meeting metadata/chat history
signaling:     WebSocket or HTTPS for SDP/ICE and meeting state
media plane:   WebRTC/SRTP over UDP when possible, TURN fallback over TCP/TLS 443
```

That separation is the key design insight: not every byte has the same correctness/latency requirement.

---

## Part 3: HTTP/1.1 vs HTTP/2 vs HTTP/3

HTTP/1.1 uses persistent connections and textual request/response semantics. On one connection, a slow response can block later responses:

```text
Req A -> slow Resp A
Req B waits
Req C waits
```

HTTP/2 keeps HTTP semantics but uses binary framing, header compression and multiplexed streams over one TCP connection. It fixes much of HTTP/1.1 request queueing, but not TCP-level head-of-line blocking: if a TCP packet is lost, later bytes for all streams on that connection wait.

HTTP/3 runs HTTP over QUIC over UDP. QUIC integrates TLS 1.3, multiplexes streams, and reduces TCP-level HOL because loss in one stream does not necessarily block unrelated streams.

| Context | Meaning |
|---|---|
| HTTP/1.1 HOL | later HTTP requests wait behind an earlier response on one connection |
| TCP HOL | lost TCP packet blocks later bytes from being delivered |

**Interview line:** "HTTP/2 removes the request-response queueing problem of HTTP/1.1, but not TCP's ordered-byte-stream blocking; HTTP/3/QUIC targets that lower-layer issue."

---

## Part 4: L4 vs L7

| LB type | Looks at | Can do | Best for |
|---|---|---|---|
| L4 | IP, port, TCP/UDP metadata | fast connection/packet distribution | raw TCP/UDP, high throughput |
| L7 | HTTP/gRPC/application data | path/header routing, TLS termination, WAF, auth hooks | APIs, gateways, microservices |

L4 distributes connections without understanding `/api/feed`. L7 can route by host/path/header or gRPC method:

```text
GET /api/payments -> payment service
GET /api/feed     -> feed service
```

API gateways are usually L7 reverse proxies plus policy: auth, rate limiting, request validation, routing, logging and tracing.

---

## Part 5: REST, gRPC and GraphQL transport basics

REST over HTTP models resources and is browser/proxy friendly. gRPC usually runs over HTTP/2 with Protobuf. Each RPC maps to an HTTP/2 stream, giving multiplexing, flow control and streaming modes.

```text
one HTTP/2 connection between services
  stream 1: GetUser unary request/response
  stream 3: StreamMessages server-streaming
  stream 5: UploadChunks client-streaming
  stream 7: Chat bidi-streaming
```

GraphQL is an application API style, often over HTTP, where clients select fields. It fits frontend aggregation/BFF layers, but query complexity, authorization and caching need care.

| Need | Good default |
|---|---|
| public browser API | REST/JSON |
| internal typed high-throughput API | gRPC/Protobuf |
| frontend screen-shaped aggregation | GraphQL or BFF |
| bidirectional live events | WebSocket |
| server-only push | SSE |

A common architecture is REST/GraphQL at the edge and gRPC between internal services.

---

## Part 6: where it matters

- **Chat (#3):** HTTPS for login/history; WebSocket for live sends, acks and typing; partition messages by conversation; reconnect/resume matters more than protocol trivia.
- **Video / meetings (#6):** playback uses HTTP/CDN for manifests and chunks; interactive meetings use WebRTC media over UDP where possible; control and media paths stay separate.
- **API gateway:** TLS termination, route matching, auth, rate limits, transformations and tracing are L7 concerns.
- **Frontend performance:** HTTP/2/3 reduce connection/multiplexing bottlenecks, but do not fix huge JSON, slow DB queries, excessive JavaScript or bad cache headers.

---

## Part 7: QUIC migration and browser protocol notes

QUIC identifies a connection with connection IDs rather than only `(src IP, src port, dst IP, dst port)`. If a phone moves from Wi-Fi to mobile data and its IP changes, QUIC can continue the logical connection after path validation instead of forcing a full TCP/TLS reconnect.

```text
Wi-Fi path:   phone:10.0.0.5:5555 -> edge:443   QUIC conn id = abc
mobile path:  phone:100.64.x:7777 -> edge:443   same QUIC conn id = abc
```

This matters for mobile apps, meetings and long-lived streams. It is not magic; middleboxes, server support and client support still matter.

HTTP/2 server push was intended to let servers proactively push resources before the browser asks. In practice it was hard to coordinate with browser caches and is largely deprecated in browsers. Prefer `preload`, `preconnect`, good cache headers and bundling strategy.

---

## Part 8: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Public CRUD API | REST/JSON over HTTPS | simple, debuggable |
| Internal service calls | gRPC over HTTP/2 | schema + efficiency |
| Flexible frontend aggregation | GraphQL/BFF | screen-shaped data |
| Bidirectional app events | WebSocket | full duplex |
| Server push only | SSE | simpler than WebSocket |
| Interactive media | WebRTC/UDP | low latency |
| Path/header routing | L7 LB/API gateway | application-aware |
| Raw TCP/UDP balancing | L4 LB | low overhead |
| Mobile long-lived streams | HTTP/3/QUIC where supported | stream loss isolation + migration |

### Common interview traps

- Reciting OSI layers without using them.
- Calling UDP ?unreliable therefore wrong?.
- Saying HTTP/2 removes all HOL blocking.
- Designing around HTTP/2 server push.
- Using WebSocket when SSE or polling is enough.
- Choosing GraphQL without query limits/caching story.
- Confusing gateway, reverse proxy and load balancer.

## Self-test (answer out loud first, then open)

<details><summary>1. Explain HTTP-level vs TCP-level head-of-line blocking.</summary>

HTTP-level HOL is a later request/response waiting behind an earlier one on an HTTP connection. TCP-level HOL is later bytes waiting because an earlier packet in the ordered byte stream was lost.
</details>

<details><summary>2. What does HTTP/2 fix, and what does it not fully fix?</summary>

HTTP/2 multiplexes HTTP streams and reduces HTTP/1.1 request queueing, but over TCP it can still suffer when packet loss blocks bytes for all streams.
</details>

<details><summary>3. Why can HTTP/3 improve loss behaviour?</summary>

HTTP/3 runs over QUIC/UDP. QUIC has independent streams, so loss in one stream need not block delivery of unrelated stream data.
</details>

<details><summary>4. What is QUIC connection migration?</summary>

QUIC can keep a logical connection using connection IDs even when the client's IP/port changes, such as moving from Wi-Fi to mobile data, after validating the new path.
</details>

<details><summary>5. Why not rely on HTTP/2 server push?</summary>

It performed poorly in practice, was hard to coordinate with browser caches, and has been removed/deprecated in major browser support. Prefer preload/preconnect and cacheable assets.
</details>

<details><summary>6. How does gRPC use HTTP/2?</summary>

Each RPC is an HTTP/2 stream over a shared connection, using Protobuf messages and supporting unary, server-streaming, client-streaming and bidirectional streaming.
</details>

<details><summary>7. When do you choose L7 over L4 load balancing?</summary>

When routing/policy depends on host/path/header/auth/gRPC method. Use L4 when you only need fast connection/packet distribution for TCP/UDP.
</details>

<details><summary>8. In WebRTC, what travels over UDP and what travels over HTTP/WebSocket?</summary>

Media commonly uses SRTP over UDP. Signaling/control uses HTTPS or WebSocket to exchange SDP/ICE and meeting state.
</details>

<details><summary>9. What is TURN fallback over TCP/TLS, and why is it a trade-off?</summary>

TURN relays media when direct UDP fails, often over TCP/TLS 443 for firewall traversal. It improves connectivity but adds latency, bandwidth cost and possible TCP HOL effects.
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
| [MDN: Evolution of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Evolution_of_HTTP) | Exact sections: “HTTP/1.1 – The standardized protocol”, “HTTP/2 – A protocol for greater performance”, “HTTP/3 - HTTP over QUIC” | ~25 min |
| [Hello Interview: Networking Essentials](https://www.hellointerview.com/learn/system-design/core-concepts/networking-essentials) | Full page: “Networking Layers”, “Network Layer Protocols”, “Transport Layer Protocols”, “Application Layer Protocols”, “Load Balancing”, “Common Deep Dives and Challenges” | ~40 min |
| [MDN: Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview) | “HTTP and connections”, “HTTP flow”, “HTTP Messages” | ~15 min |

**Connects to:** [A2 Request Flow](A2-Request-Flow.md) · [A4 DNS/CDN/LB/Proxy](A4-DNS-CDN-LoadBalancer-Proxy.md) · [A6 API Design](A6-API-Design.md) · [E1 Polling/SSE/WebSocket](../E-Realtime/E1-Polling-SSE-WebSocket.md) · [E2 Scaling WebSockets](../E-Realtime/E2-Scaling-WebSockets.md) · [F2 Video Pipeline](../F-Blobs-Fanout/F2-Video-Pipeline.md) · [FE9 Media](../../../../ReactPersonal/Info/frontend-system-design/FE9-Media.md) · Chat (#3) · YouTube (#6)
