# E1 · Polling, SSE and WebSocket: choosing the right real-time pipe

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Chat / WhatsApp / Slack / Discord (#3), Location search / Uber tracking (#9), Google Docs / collaborative editor (#12), ChatGPT-style LLM app (#24), FB live comments / online auction / online chess variants

---

## Why this topic matters

"Real-time" is not one technology. It is a spectrum of freshness, directionality and connection cost. A ChatGPT response streaming tokens, Uber driver location updates, live comments and a collaborative whiteboard all feel real-time, but they do not need the same transport.

| Need | Usually pick |
|---|---|
| Rare updates, simplest infra | Short polling |
| Update as soon as available, still request/response-ish | Long polling |
| Server → browser stream | SSE |
| Browser ↔ server full-duplex | WebSocket |
| Browser ↔ browser low-latency media/data | WebRTC data channels / media |

Interviewers care because a wrong transport infects the whole design. WebSockets are powerful but stateful and expensive to scale. SSE is perfect for ChatGPT-style server streaming but weak for bidirectional chat. Polling is boring but often the correct MVP.

**Interview line:** "For ChatGPT token streaming I'd use SSE: one ordered server-to-client stream over HTTP. For chat messages I'd use WebSocket because clients also send frequent events like messages, typing and read receipts."

---

## Part 1: short polling and long polling

### Short polling

The client asks every N seconds.

```
Client ── GET /notifications?since=123 ──► Server
Client ◄─ [] or new items ───────────────── Server
(wait 5s, repeat)
```

Pros:
- easiest to build and debug
- works through every proxy/load balancer
- no long-lived connection state
- good for low-frequency updates

Cons:
- wasteful when nothing changes
- average latency is half the polling interval
- synchronized clients can create traffic spikes

Use it for: order status, background job status, occasional notifications, admin dashboards.

### Long polling

The client sends a request; the server holds it until data arrives or a timeout expires.

```
Client ── GET /events?cursor=123 ──► Server holds request
                  new event arrives
Client ◄─ event + nextCursor ─────── Server
Client immediately opens next request
```

Pros:
- lower latency than short polling
- still uses HTTP request/response
- fallback when WebSocket/SSE is not available

Cons:
- server holds many open requests
- reconnect loop is application-owned
- each event often creates a new HTTP request

Long polling was common before WebSocket support became universal. It is still a valid fallback for locked-down enterprise networks.

---

## Part 2: SSE (Server-Sent Events)

SSE is a browser API (`EventSource`) for a **server-to-client** event stream over HTTP. The client cannot send arbitrary messages on the same connection; it uses normal `fetch` for client-to-server actions.

Handshake:

```http
GET /stream HTTP/1.1
Accept: text/event-stream
Cache-Control: no-cache
```

Server response:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: token
id: 42
data: {"text":"hello"}

: heartbeat

```

Browser client:

```ts
const events = new EventSource("/api/chat/stream?conversationId=abc", {
  withCredentials: true,
});

events.addEventListener("token", (event) => {
  const payload = JSON.parse((event as MessageEvent).data) as { text: string };
  appendToken(payload.text);
});

events.onerror = () => {
  setConnectionState("reconnecting"); // browser will retry automatically
};

function stopStreaming() {
  events.close();
}
```

SSE details worth saying in interviews:
- messages are UTF-8 text frames separated by blank lines
- `id:` lets the browser send `Last-Event-ID` on reconnect
- comments (`: heartbeat`) keep proxies from closing idle streams
- browser reconnect is built in
- works well with HTTP infrastructure, but some proxies buffer unless configured not to

SSE is a great fit for ChatGPT (#24): the browser sends a prompt with `POST /messages`, then opens or receives an SSE stream of tokens and final metadata.

---

## Part 3: WebSocket

WebSocket upgrades an HTTP connection into a persistent, full-duplex TCP-like channel.

Handshake:

```http
GET /rooms/123/socket HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: ...
Sec-WebSocket-Version: 13
Authorization: Bearer <jwt>

HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
```

After that, both sides can send frames whenever they want.

TypeScript client:

```ts
type ServerMsg =
  | { type: "message"; id: string; text: string }
  | { type: "presence"; userId: string; state: "online" | "offline" }
  | { type: "pong"; ts: number };

const ws = new WebSocket("wss://api.example.com/rooms/123/socket");

ws.addEventListener("open", () => {
  ws.send(JSON.stringify({ type: "join", roomId: "123" }));
});

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data) as ServerMsg;
  if (msg.type === "message") renderMessage(msg);
});

const heartbeat = window.setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "ping", ts: Date.now() }));
  }
}, 25000);

ws.addEventListener("close", () => {
  window.clearInterval(heartbeat);
  scheduleReconnectWithBackoff();
});
```

WebSocket fits:
- chat (#3)
- collaborative editing (#12)
- multiplayer games / online chess
- bidirectional live dashboards
- Adobe Connect-style meeting control messages (media itself uses WebRTC)

It is not automatically better. A WebSocket server is stateful: it holds a connection object, user identity, subscriptions and back-pressure state. That affects load balancing and deploys, covered in [E2 Scaling WebSockets](E2-Scaling-WebSockets.md).

---

## Part 4: WebRTC data channels, briefly

WebRTC is mainly for browser-to-browser audio/video/data with NAT traversal. Adobe Connect lives in this world for real-time meetings. WebRTC **data channels** can carry arbitrary data peer-to-peer, usually over SCTP/DTLS, and can be ordered/unordered, reliable/unreliable.

Use WebRTC data channels when:
- peers already have a WebRTC session for media
- ultra-low-latency peer-to-peer data matters
- server bandwidth should not relay every packet

Do not pick WebRTC as the default for chat or server-authoritative collaboration. You still need signaling, NAT traversal, TURN relays for hard networks, and a server story for persistence/authorization. DrawBoard explicitly avoids peer-to-peer `y-webrtc` because server-enforced access control and durable saves matter more than peer-to-peer latency.

---

## Part 5: connection costs, proxies and reconnection

### Connection costs

| Transport | Server state | Client-to-server | Server-to-client | Typical cost |
|---|---|---|---|---|
| Short polling | None between requests | HTTP request | HTTP response | More request overhead |
| Long polling | Held request | New HTTP request after each response | Response when event/timeout | Many open requests |
| SSE | One HTTP stream | Separate `fetch` | Stream | One open response per client |
| WebSocket | One upgraded connection | Same connection | Same connection | Stateful connection memory |

For millions of connections, memory and file descriptors matter. Even idle connections consume kernel and application resources. Heartbeats also create background traffic.

### Load balancers and proxies

Real-time connections are sensitive to infrastructure:
- L7 proxies may buffer SSE unless `X-Accel-Buffering: no` or equivalent is configured
- idle timeouts close quiet connections unless heartbeats are sent
- WebSocket requires `Upgrade` headers to pass through
- TLS termination may happen at the load balancer
- L4 load balancers preserve TCP but know less about HTTP routing

### Reconnection

Clients must reconnect with backoff and resume from a cursor.

| Transport | Resume mechanism |
|---|---|
| Polling | `since` cursor or timestamp |
| Long polling | cursor in every request |
| SSE | `Last-Event-ID` or app cursor |
| WebSocket | reconnect then send last seen event/message ID |

Without a cursor, reconnect causes gaps or duplicate UI events. Duplicates are okay if messages have IDs and the client de-dups.

---

## Part 6: which to pick per interview question

### Chat (#3)

Pick WebSocket for active chat rooms: full-duplex messages, typing indicators, read receipts and presence. Use HTTP for history pagination and media uploads. Use push notifications for offline users.

### Live comments / FB live

SSE can be excellent for one-to-many comment delivery because most viewers only receive. Posting a comment can be a normal HTTP POST. At very high scale, fan-out and pub/sub partitioning matter more than whether the edge stream is SSE or WebSocket.

### Uber tracking (#9)

Driver app sends frequent location updates to the backend. Rider app receives updates. Mobile constraints matter; many designs use WebSocket or MQTT-like persistent connections, but polling every few seconds can be acceptable for MVP rider tracking. Do not require sub-100ms latency for a car on a map.

### ChatGPT streaming (#24)

Use SSE for token stream. The browser sends the prompt with HTTP, then receives `token`, `tool_call`, `done` and `error` events. If you later need bidirectional voice or live interruption semantics, consider WebSocket/WebRTC.

### Google Docs / DrawBoard (#12)

Use WebSocket because clients constantly send and receive document updates and awareness. DrawBoard uses a Yjs provider over WebSocket to exchange binary updates and ephemeral awareness.

---

## Part 7: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Background job status | Polling | Simple, durable, no stateful connection tier |
| Rare notifications | Short polling or push notification | Low frequency; no need for WebSocket |
| ChatGPT token streaming | SSE | One-way ordered stream over HTTP |
| Live comments for viewers | SSE | Many receivers, few senders; POST for comments |
| Chat app active room | WebSocket | Full-duplex low-latency events |
| Collaborative editor / whiteboard | WebSocket | Bidirectional sync + awareness |
| Video/audio meeting | WebRTC media; WebSocket for signaling/control | Media has different transport needs |
| Enterprise fallback | Long polling | Works where WebSocket is blocked |

### Common interview traps

- Choosing WebSocket for every real-time problem.
- Forgetting reconnect/resume cursors and causing message gaps.
- Ignoring proxy idle timeouts and heartbeats.
- Sending high-frequency cursor updates through durable queues when best-effort is fine.
- Using SSE for bidirectional chat and then inventing a second channel without saying so.
- Using peer-to-peer WebRTC when the system needs server authority, audit or persistence.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Short polling vs long polling: what changes?</summary>

Short polling asks every fixed interval whether anything changed. Long polling holds the request open until data arrives or a timeout, then the client immediately opens the next request. Long polling reduces latency and empty responses but holds server resources.
</details>

<details><summary>2. Why is SSE a good fit for ChatGPT token streaming?</summary>

The stream is mostly one-way from server to browser, ordered, text-friendly and benefits from built-in browser reconnect. The prompt can be sent with normal HTTP, so full-duplex WebSocket is not required for the basic case.
</details>

<details><summary>3. What happens during a WebSocket handshake?</summary>

The client sends an HTTP request with `Upgrade: websocket` and `Connection: Upgrade`. If accepted, the server returns `101 Switching Protocols`; after that both sides exchange WebSocket frames over the same connection.
</details>

<details><summary>4. Why do real-time clients need a resume cursor?</summary>

Connections drop. On reconnect, the client must tell the server the last event/message it processed so the server can send missed events and the client can deduplicate repeats.
</details>

<details><summary>5. Why not use WebRTC data channels for DrawBoard by default?</summary>

Peer-to-peer makes server-enforced access control and durable persistence harder. DrawBoard needs a Room Service to authorize users, reject viewer edits, hold a live Y.Doc for late joiners and save content.
</details>

<details><summary>6. What infrastructure settings commonly break SSE/WebSocket?</summary>

Proxy buffering, idle timeouts, missing WebSocket upgrade forwarding, low file descriptor limits, and load balancer behavior that routes reconnects without considering room state.
</details>

<details><summary>7. For live comments, why might SSE beat WebSocket?</summary>

Most clients are viewers receiving comments; posting can be a normal HTTP request. SSE gives efficient one-way delivery with simpler client/server semantics than a full-duplex socket.
</details>

<details><summary>8. Which transport would you choose for Adobe Connect media, and which for meeting control messages?</summary>

Media should use WebRTC. Meeting control/chat/presence can use WebSocket or another reliable signaling channel, because those are small bidirectional events rather than audio/video streams.
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
| [System Design Primer: Communication](https://github.com/donnemartin/system-design-primer#communication) | Exact headings from README: **Communication**, **Hypertext transfer protocol (HTTP)**, **Transmission control protocol (TCP)**, **User datagram protocol (UDP)** | ~15 min |
| [MDN: Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) | Exact headings: **Receiving events from the server**, **Creating an EventSource instance**, **Listening for message events**, **Sending events from the server**, **Event stream format**, **Fields** | ~25 min |
| [MDN: Writing WebSocket client applications](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications) | Exact headings: **Creating a WebSocket object**, **Listening for the open event**, **Sending messages**, **Receiving messages**, **Handling disconnect**, **Security considerations** | ~20 min |
| [MDN: Using WebRTC data channels](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels) | Exact headings: **Creating a data channel**, **Automatic negotiation**, **Manual negotiation**, **Buffering**, **Security** | ~15 min |

**Connects to:** [D5 Async request-reply](../D-Async/D5-Async-Request-Reply.md) · [E2 Scaling WebSockets](E2-Scaling-WebSockets.md) · [E3 Collaborative sync](E3-Collaborative-Sync.md) · [FE4 Network layer](../../../../ReactPersonal/Info/frontend-system-design/FE4-Network-Layer.md)
