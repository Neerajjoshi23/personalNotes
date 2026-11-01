# E2 · Scaling WebSockets: from one socket server to millions of live users

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Chat / WhatsApp / Slack / Discord (#3), Google Docs / collaborative editor (#12), FB live comments / online auction / online chess variants

---

## Why this topic matters

A single WebSocket demo is easy: one Node process, one room map, broadcast to connected clients. A production system is different. Connections are long-lived, servers are stateful, deploys must drain safely, and a message for one user may arrive on a different machine than the user's socket.

The basic scaling problem:

```
User A socket on Server 1
User B socket on Server 7
Message enters API on Server 3
How does it reach everyone in the room?
```

The usual answer is a **connection server tier** plus a **pub/sub backplane**.

```
Clients ── WebSocket ──► Connection servers ──► Redis/Kafka/pubsub ──► other connection servers
```

**Interview line:** "The WebSocket tier is stateful only for connections. Messages are persisted separately and fanned out through a pub/sub backplane so any server can deliver to its local sockets."

---

## Part 1: connection servers are a stateful tier

A WebSocket server holds live connection state:

```ts
type Connection = {
  socketId: string;
  userId: string;
  roomIds: Set<string>;
  lastPongAt: number;
  sendQueueBytes: number;
};
```

It is not like a stateless REST server where any request can hit any instance. While a socket is open, that instance owns:
- the TCP connection
- authentication context
- subscribed rooms/channels
- heartbeat timers
- per-connection back-pressure state

That does **not** mean business state should live only in memory. Chat messages, room membership and ACLs belong in durable stores. The socket server's memory is a cache of who is connected right now.

A clean separation:

| Layer | Owns |
|---|---|
| API / app services | auth, message creation, history reads, room membership changes |
| Database | durable messages, users, rooms, permissions |
| Connection servers | live sockets, subscriptions, delivery to connected clients |
| Pub/sub backplane | cross-server fan-out |

---

## Part 2: load balancers and sticky routing

### L4 vs L7

| LB type | Operates at | Pros | Cons |
|---|---|---|---|
| **L4** | TCP | Fast, simple, good for long-lived connections | Cannot route by URL/user easily |
| **L7** | HTTP/WebSocket upgrade | Can route by path, headers, cookies | More proxy behavior to configure |

For WebSocket, the LB must support upgrade and long idle timeouts. TLS often terminates at the LB.

### Sticky sessions

Sticky routing sends the same client to the same server. It helps if the server has local room state. But do not make correctness depend on stickiness alone:

- clients disconnect and reconnect
- deploys drain servers
- a server can die
- mobile networks change IP

A better rule: use stickiness as an optimization, and keep enough state in shared stores/backplane so reconnecting elsewhere works.

For collaborative systems like DrawBoard, you sometimes need **room affinity**: all clients for one board should reach the same room owner, or room updates must be replicated between owners. DrawBoard's current HLD accepts one Room Service instance; the scale-up path is hash `boardId -> room server` or share Yjs updates through Redis/pubsub.

---

## Part 3: pub/sub backplane for fan-out

When Server 1 receives a message for room R, Server 7 also needs to deliver it to its local clients in room R.

```
             ┌──────────────┐
Server 1 ───►│ room:R topic │───► Server 1 local sockets
             │ Redis/Kafka  │───► Server 7 local sockets
Server 7 ◄───│              │───► Server 9 local sockets
             └──────────────┘
```

Options:

| Backplane | Good for | Trade-offs |
|---|---|---|
| Redis Pub/Sub | low-latency ephemeral fan-out | no durable replay by default |
| Redis Streams | fan-out with stored stream | more operational logic than Pub/Sub |
| Kafka | durable ordered log, replay, high throughput | higher latency/complexity; partitioning matters |
| NATS / managed pubsub | simple messaging fabric | depends on ecosystem |

Chat often needs both durable storage and live fan-out:

```
1. User sends message over WebSocket or HTTP
2. Message service validates and stores in DB
3. Publish MessageCreated(roomId, messageId)
4. Connection servers subscribed to room deliver to local sockets
5. Offline users get push notification path
```

Do not use Redis Pub/Sub as the only storage for messages; if a server is down during publish, it misses the message. Durable history comes from DB/Kafka.

---

## Part 4: presence, heartbeats and connection registry

Presence is deceptively hard because disconnects are messy. A browser tab can close cleanly, a laptop can sleep, a mobile network can vanish, or a proxy can silently drop an idle connection.

### Heartbeats

```
Server -> ping every 25s
Client -> pong
If no pong for 2 intervals, close socket and mark offline
```

Some stacks use WebSocket protocol ping/pong; browser APIs do not expose protocol ping, so app-level heartbeat messages are common.

### Connection registry

A shared registry answers "is user U online, and where?"

```text
presence:user:123 -> {
  connections: [serverA/socket1, serverB/socket9],
  lastSeenAt: ...,
  status: online
}
```

Use TTLs so stale presence expires if a server dies before cleanup.

Important nuance: presence is **eventually consistent**. It is okay if a green dot is wrong for a few seconds. Do not run money or access control from presence state.

### Multi-device

A user can have phone + laptop + browser tabs. Decide whether presence is per user or per device/connection. Chat usually shows user-level online but delivers to all active devices.

---

## Part 5: back-pressure and slow clients

One slow client must not exhaust a server. If messages are produced faster than a socket can send, the server's per-connection buffer grows.

Policies:

| Message type | Policy |
|---|---|
| Chat message | Buffer up to a limit; then disconnect and let client catch up from history |
| Cursor position | Drop old positions; keep latest |
| Live comments | Sample/drop for overloaded viewer; history can be loaded later |
| Collaborative document update | Apply back-pressure carefully; disconnect/reconnect may resync from CRDT state |

Track per-connection `bufferedAmount` or send queue bytes. If it crosses a threshold, stop reading from upstream for that connection, drop low-value events or disconnect with a clear close code.

**Interview line:** "I won't let unbounded per-socket queues grow. For durable events the client can reconnect and catch up from message history; for ephemeral events we drop old ones."

---

## Part 6: deploys, draining and failures

### Draining

You cannot kill a WebSocket server like a stateless REST pod without disconnecting thousands of users. A safer deploy:

1. remove server from LB for new connections
2. tell clients `server_draining` or close with retryable code
3. allow short grace period
4. clients reconnect with backoff to other servers
5. force close remaining sockets

Clients must treat reconnect as normal. They send last seen message ID / room subscriptions again.

### Server failure

If a server dies, its sockets die. The registry TTL expires presence. Clients reconnect to another server and resume from durable history or CRDT state.

### Pub/sub failure

If the backplane is down, local sockets may still be connected but cross-server fan-out breaks. The system should surface degraded state, retry publishes, and rely on durable message history to repair gaps on reconnect.

---

## Part 7: millions of connections estimation

Back-of-envelope is enough for interviews. Suppose:

- 1 million concurrent WebSocket connections
- each connection costs ~50 KB of application+kernel memory after tuning (invented estimates vary; use this only as an interview placeholder)
- each server can safely hold 50k connections

Then:

```
1,000,000 / 50,000 = 20 servers
Add 30-50% headroom => ~30 servers
```

Traffic estimate:

```
heartbeat every 30s, 100 bytes each direction
1,000,000 * 200 bytes / 30s ≈ 6.7 MB/s just heartbeats
```

The exact numbers depend heavily on language/runtime, TLS, message size and kernel tuning. The interview point is not memorizing a number; it is remembering that idle connections are not free.

Slack's real-time messaging post is useful because it frames Slack's system as clients connecting to gateway servers, receiving events, and needing to send a message to a huge number of clients in real time.

---

## Part 8: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Small MVP chat | One WebSocket server + DB | Simple; okay before scale |
| Multi-server chat | WebSocket tier + DB + Redis/Kafka fan-out | Any server can deliver to local sockets |
| Live comments with millions of viewers | Partition by video/stream; co-locate viewers; pub/sub fan-out | Avoid every server processing every comment |
| Presence | Heartbeats + TTL registry | Handles unclean disconnects |
| Collaborative board | Room affinity or replicated Yjs updates | All participants need same document state |
| Deploy WebSocket tier | Drain before shutdown | Avoid mass abrupt disconnects |
| Slow clients | bounded queues + drop/disconnect policy | Prevent memory blowups |

### Common interview traps

- Treating WebSocket servers as stateless REST pods.
- Broadcasting every room event to every server for high-scale live comments.
- Using Redis Pub/Sub as durable message storage.
- Forgetting offline users and message history.
- Not handling slow clients and unbounded send buffers.
- Ignoring deploy draining and LB idle timeouts.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why is a WebSocket server stateful?</summary>

It owns live TCP/WebSocket connections, authenticated connection context, subscriptions, heartbeat timers and send buffers. Another server cannot send bytes on that socket unless messages are routed to the owning server.
</details>

<details><summary>2. Why is sticky routing not enough for correctness?</summary>

Connections can reconnect elsewhere after mobile network changes, deploys or server crashes. Correctness needs durable state and cross-server fan-out/resume, not only best-effort stickiness.
</details>

<details><summary>3. What does a pub/sub backplane do?</summary>

It carries room/user events between connection servers. A message received or created on one server is published to a topic; every server with local subscribers receives it and delivers to its sockets.
</details>

<details><summary>4. Why should chat messages be stored outside Redis Pub/Sub?</summary>

Redis Pub/Sub is ephemeral. If a subscriber is down, it misses the message. Durable chat history belongs in a database/log so clients can reconnect and catch up.
</details>

<details><summary>5. How do heartbeats help presence?</summary>

They detect dead connections that did not close cleanly. If the server stops receiving pongs, it closes the socket and lets presence expire or marks the user offline.
</details>

<details><summary>6. What would you do when a client's send buffer grows too large?</summary>

Apply a policy by event type: drop ephemeral updates, stop sending low-priority events, or disconnect the client and let it reconnect/catch up from durable history. Never allow unbounded memory growth.
</details>

<details><summary>7. How do you deploy a WebSocket server safely?</summary>

Drain it: remove from LB for new connections, notify/close existing sockets with a retryable reason, wait a grace period, then terminate. Clients reconnect and resume using cursors/subscriptions.
</details>

<details><summary>8. How would DrawBoard scale beyond one Room Service instance?</summary>

Either route all connections for a board to the same instance with consistent hashing, or replicate Yjs updates between instances through a pub/sub layer. The current HLD accepts one instance until scale demands this.
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
| [Slack Engineering: Real-time messaging](https://slack.engineering/real-time-messaging/) | Exact headings: **Server overview**, **Slack client set up**, **Send a message to a million clients in real time**, **Events** | ~25 min |
| [Hello Interview: Facebook Live Comments](https://www.hellointerview.com/learn/system-design/problem-breakdowns/fb-live-comments) | Exact headings: **High-Level Design**, **How can we ensure comments are broadcasted to viewers in real-time?**, **Good Solution: Websockets**, **Great Solution: Server Sent Events (SSE)**, **How will the system scale to support millions of concurrent viewers?**, **Great Solution: Partitioned Pub/Sub with Viewer Co-location** | ~35 min |

**Connects to:** [E1 Polling/SSE/WebSocket](E1-Polling-SSE-WebSocket.md) · [E3 Collaborative sync](E3-Collaborative-Sync.md) · [D2 Kafka](../D-Async/D2-Kafka.md) · [D3 Delivery semantics + idempotency](../D-Async/D3-Delivery-Semantics-Idempotency.md) · Questions: Chat (#3), Google Docs (#12)
