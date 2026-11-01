# A6 · API design: interfaces interviewers can believe in

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Every HLD question; especially URL shortener (#1), Rate limiter (#2), Chat (#3), News feed (#4), Payment (#16), ChatGPT (#24)

---

## Why this topic matters

APIs are the contract between product and architecture. A good API tells the interviewer what resources exist, how clients retry, how pagination works, how errors/rate limits are exposed, and where REST/gRPC/GraphQL fits.

For a frontend engineer, API design directly affects React Query keys, infinite scroll, retry behaviour and UI error states.

**Interview line:** “I’ll define external APIs first because they lock the product contract. Internally we can choose REST, gRPC or events per boundary.”

---

## Part 1: REST resource modelling

Model resources, not UI button names.

```text
/users/{userId}
/conversations/{conversationId}/messages
/files/{fileId}/versions
/short-urls/{code}
/orders/{orderId}/payments
```

Avoid vague action endpoints like `/doCreateMessage`. Domain actions can still exist when they are real operations:

```http
POST /v1/bookings/{bookingId}:cancel
PATCH /v1/bookings/{bookingId} { "status": "cancelled" }
```

Use the first when cancellation triggers side effects like refund, inventory release and notifications.

```http
POST /v1/short-urls
GET /{code}
GET /v1/short-urls/{code}/analytics
GET /v1/conversations/{id}/messages?pageSize=50&pageToken=...
POST /v1/payments
GET /v1/payments/{paymentId}
```

Good resource modelling clarifies ownership: analytics belongs under `short-urls/{code}`, messages under a conversation, versions under a file, refunds under payments/orders depending on the domain.

---

## Part 2: HTTP verbs and status codes

| Verb | Meaning | Idempotent? |
|---|---|---|
| GET | read | yes |
| POST | create/action | no by default |
| PUT | replace | yes |
| PATCH | partial update | not always |
| DELETE | delete | yes by intent |

Common codes: `200` read/update, `201` created, `202` async accepted, `204` no body, `301/302` redirects, `400` invalid, `401` unauthenticated, `403` forbidden, `404` not found/hidden, `409` conflict/version/duplicate, `422` semantically invalid, `429` rate limited, `500/503` server/unavailable.

Pick conventional codes and explain client behaviour; do not burn interview time on purity debates.

---

## Part 3: pagination — offset vs cursor

Offset:

```http
GET /v1/posts?limit=20&offset=40
```

Simple and supports page numbers, but expensive for deep pages and unstable when new rows arrive.

Cursor:

```http
GET /v1/posts?pageSize=20&pageToken=opaque

{ "posts": [...], "nextPageToken": "opaque2" }
```

Cursor tokens encode a stable position such as `(createdAt, id)` plus filters and expiry. They should be opaque; sign/encrypt if clients must not tamper. Use cursor pagination for feeds, chat history, notifications and infinite scroll. Offset is acceptable for small stable admin tables.

Offset SQL:

```sql
SELECT id, author_id, body, created_at
FROM messages
WHERE conversation_id = $1
ORDER BY created_at DESC, id DESC
LIMIT 50 OFFSET 5000;
```

Cursor SQL:

```sql
SELECT id, author_id, body, created_at
FROM messages
WHERE conversation_id = $1
  AND (created_at, id) < ($2, $3)
ORDER BY created_at DESC, id DESC
LIMIT 50;
```

Index:

```sql
CREATE INDEX idx_messages_conversation_created_id
ON messages (conversation_id, created_at DESC, id DESC);
```

Google AIP-158 recommends `page_size`, `page_token`, `next_page_token`, token opacity and token expiry/backward compatibility.

---

## Part 4: versioning and compatibility

| Strategy | Example | Notes |
|---|---|---|
| URL version | `/v1/messages` | explicit public API choice |
| Header/media type | `Accept: application/vnd.example.v2+json` | cleaner URL, controlled clients |
| Field evolution | add optional fields | best minor-change path |
| New endpoint | `/v2/search` | semantic changes |
| Compatibility layer/BFF | mobile app versions differ | old clients live long |

Rules: adding optional response fields is usually safe; removing/renaming fields breaks clients; changing field meaning is dangerous; clients should ignore unknown JSON fields; servers should tolerate missing optional fields; Protobuf should never reuse field numbers.

For mobile and desktop clients, old versions live for months. Backward compatibility is a product requirement, not a nice-to-have.

---

## Part 5: idempotency keys

Network failures are ambiguous. Client sends `POST /payments`, server charges card, response is lost. Retry without idempotency can charge twice.

```http
POST /v1/payments
Idempotency-Key: 7b2f...uuid...

{ "amount": 5000, "currency": "INR", "orderId": "o123" }
```

Server stores key + user/account + request hash + in-progress/final status + response for a TTL. Retry with the same key and same request returns the stored result. Same key with a different body is rejected.

```text
Client -> POST key=K -> API inserts idempotency K in tx
API performs side effect once, stores response, commits
response lost
Client -> POST key=K again -> API returns stored response
```

```sql
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_json TEXT,
  status TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL
);
```

Applies to payments, order creation, short URL creation retries, message sends (`clientMessageId`) and upload finalize. If the side effect and idempotency record cannot be atomic, use a transactional outbox from [D4 Outbox + CDC](../D-Async/D4-Outbox-CDC.md).

---

## Part 6: REST vs gRPC vs GraphQL

| Style | Best for | Strength | Watch out |
|---|---|---|---|
| REST/JSON | public/browser APIs | simple, cacheable, debuggable | over/under-fetch, weak schema |
| gRPC/Protobuf | internal services | typed, efficient, streaming | browser/proxy complexity |
| GraphQL | frontend aggregation | client selects fields | query complexity, caching |

GraphQL often fits a BFF layer rather than every service. gRPC fits service-to-service. REST is a strong external default.

GraphQL N+1 example:

```graphql
query { feed { posts { id author { name avatarUrl } } } }
```

Naive resolver path:

```text
fetch 20 posts -> for each post fetch author -> 21 DB/service calls
```

Fix with batching/data loaders, pre-joins, service aggregation, auth at field/resource level, depth/complexity limits and persisted queries. Persisted queries store an approved query hash on the server; clients send the hash, reducing payload and preventing arbitrary expensive queries from anonymous clients.

---

## Part 7: rate-limit headers and problem+json errors

Rate limits should be visible:

```http
429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1720000000
```

For public HTTP APIs, RFC 9457 defines `application/problem+json`:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 30
```

```json
{
  "type": "https://api.example.com/problems/rate-limit-exceeded",
  "title": "Rate limit exceeded",
  "status": 429,
  "detail": "You can create 100 short URLs per hour.",
  "instance": "/v1/short-urls/requests/req_123",
  "requestId": "req_123"
}
```

For validation, add field errors. Good errors have a machine code/type, human message, request ID, optional details and no stack traces, SQL, secrets or internal hostnames. Frontend clients can map codes to retries, inline validation, toasts or auth redirects.

---

## Part 8: worked mini-APIs — URL shortener and chat

URL shortener create:

```http
POST /v1/short-urls
Authorization: ******
Idempotency-Key: <uuid>
Content-Type: application/json

{ "longUrl": "https://example.com/a/very/long/path", "customAlias": null, "expiresAt": null }
```

```http
201 Created
Location: /v1/short-urls/aB91kZ

{ "code": "aB91kZ", "shortUrl": "https://sho.rt/aB91kZ" }
```

Redirect is deliberately not the same JSON API:

```http
GET /aB91kZ
302 Found
Location: https://example.com/a/very/long/path
```

Management and analytics stay versioned and paginated:

```http
GET /v1/short-urls?page_size=50&page_token=opaque
GET /v1/short-urls/aB91kZ/analytics?from=2026-09-01T00:00:00Z&page_size=100&page_token=opaque
PATCH /v1/short-urls/aB91kZ { "status": "disabled" }
```

Chat uses REST for history and WebSocket for live delivery:

```http
GET /v1/conversations?limit=30&page_token=opaque
GET /v1/conversations/{conversation_id}/messages?page_size=50&page_token=opaque
POST /v1/conversations/{conversation_id}/messages
Idempotency-Key: <clientMessageId>

{ "clientMessageId": "uuid", "text": "hello", "attachments": [] }
```

```json
{ "type": "message_ack", "clientMessageId": "uuid", "messageId": "m_123", "serverTs": "2026-09-30T13:30:00Z" }
```

REST history gives replay/resume; WebSocket gives low-latency delivery. The WebSocket is not the source of truth; messages are persisted before durable ack.

---

## Part 9: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| feed/chat scroll | cursor pagination | stable under inserts |
| small admin table | offset pagination | simple pages |
| payment/order create | POST + Idempotency-Key | safe retries |
| public API | REST/JSON + `/v1` | adoption/debugging |
| internal calls | gRPC | typed efficient calls |
| frontend aggregation | GraphQL/BFF + limits | flexible screen-shaped data |
| long job | 202 + status endpoint/webhook | avoid blocking |
| rate limit | 429 + retry headers | clients back off |
| public error format | problem+json or consistent JSON error | predictable clients and logs |

### Common interview traps

- Offset pagination for feeds/messages.
- Unsafe POST retries for payments/orders.
- Inconsistent error formats.
- REST purity debates over behaviour.
- GraphQL without batching, auth and query limits.
- Forgetting versioning/backward compatibility.
- Treating WebSocket delivery as the source of truth.

## Self-test (answer out loud first, then open)

<details><summary>1. Give the URL shortener create and redirect endpoints.</summary>

`POST /v1/short-urls` with an `Idempotency-Key` creates a mapping. `GET /{code}` returns `302 Location: <longUrl>` for the public redirect.
</details>

<details><summary>2. Why is cursor pagination better for feeds/chat than offset?</summary>

New rows arrive while users scroll. Offset can duplicate/skip rows and becomes expensive for deep pages; cursor uses an indexed stable position such as `(created_at, id)`.
</details>

<details><summary>3. Write the cursor condition for descending chat history.</summary>

`WHERE conversation_id = $1 AND (created_at, id) < ($lastCreatedAt, $lastId) ORDER BY created_at DESC, id DESC LIMIT 50` with an index on `(conversation_id, created_at DESC, id DESC)`.
</details>

<details><summary>4. What are the idempotency-key steps?</summary>

Client sends key; server atomically records key/request hash/in-progress; performs side effect once; stores final response; retries with same key return stored result; same key with different body is rejected.
</details>

<details><summary>5. What is RFC 9457 problem+json?</summary>

A standard JSON error format with fields such as `type`, `title`, `status`, `detail` and `instance`; APIs can extend it with request IDs and field errors.
</details>

<details><summary>6. Name three API versioning strategies.</summary>

URL major versions (`/v1`), header/media-type versions, additive field evolution, new endpoints/resources, or BFF compatibility layers for old clients.
</details>

<details><summary>7. What is GraphQL N+1 and how do you fix it?</summary>

A resolver fetches child data once per parent row, causing many DB/service calls. Fix with batching/data loaders, joins/pre-aggregation, query planning and limits.
</details>

<details><summary>8. What are persisted GraphQL queries?</summary>

Approved queries stored server-side; clients send a hash/id. This reduces payload, enables allowlisting/CDN/WAF handling, and limits arbitrary expensive queries.
</details>

<details><summary>9. When return 202 Accepted?</summary>

When work is accepted but asynchronous, such as video transcode, export, code execution or long LLM job; provide a status endpoint/webhook.
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
| [Hello Interview: API Design](https://www.hellointerview.com/learn/system-design/core-concepts/api-design) | Full page: “API Types”, “REST”, “GraphQL”, “RPC”, “API Design Principles”, “Common API Patterns”, “Pagination”, “Idempotency Keys”, “Consistent Error Responses”, “Versioning Strategies”, “Rate Limiting and Throttling” | ~45 min |
| [Google AIP-158: Pagination](https://google.aip.dev/158) | Exact sections: “Guidance”, “Skipping results”, “Opacity”, “Expiring page tokens”, “Backwards compatibility” | ~20 min |
| [Google AIP-155: Request identification](https://google.aip.dev/155) | Exact sections: “Guidance”, “Stale success responses”, “Using UUIDs for request identification” | ~15 min |
| [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html) | Sections 3 and 3.1: problem detail object and members | ~15 min |

**Connects to:** [A1 Delivery Framework](A1-Delivery-Framework.md) · [A2 Request Flow](A2-Request-Flow.md) · [A3 HTTP Versions + Networking](A3-HTTP-Versions-Networking.md) · [D3 Delivery Semantics + Idempotency](../D-Async/D3-Delivery-Semantics-Idempotency.md) · [D4 Outbox + CDC](../D-Async/D4-Outbox-CDC.md) · [E1 Polling/SSE/WebSocket](../E-Realtime/E1-Polling-SSE-WebSocket.md) · [FE4 Network Layer](../../../../ReactPersonal/Info/frontend-system-design/FE4-Network-Layer.md) · URL shortener (#1) · Chat (#3) · Payment (#16)
