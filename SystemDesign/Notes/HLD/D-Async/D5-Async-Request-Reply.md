# D5 · Async Request-Reply: saying yes now and finishing later

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** YouTube / video upload (#6), Web crawler (#7), Online judge / LeetCode (#19), Distributed job scheduler (#21), ChatGPT-style LLM app (#24)

---

## Why this topic matters

Some requests cannot finish inside one HTTP request/response cycle. Video transcoding can take minutes. A code judge may wait in a sandbox queue. An LLM generation may stream for 30 seconds or run as a background batch. A crawler job may fan out to millions of URLs.

If the API keeps the client waiting until completion, you get timeouts, wasted connections and terrible UX. The better pattern is:

1. accept the request quickly
2. create a **job ID**
3. process asynchronously
4. let the client learn the result via polling, webhook or push

```
Client ── POST /transcodes ──► API ── enqueue job ──► Workers
Client ◄── 202 Accepted + jobId + statusUrl
Client ── GET /jobs/{id} ────► status: queued/running/done/failed
```

**Interview line:** "The upload API returns 202 with a job ID. The actual transcode runs from a queue; the client polls a status endpoint or receives a webhook when the job finishes."

---

## Part 1: 202 Accepted + status endpoint

HTTP `202 Accepted` means the server accepted the request for processing, but processing has not completed. It is not a promise of success; it is a promise that a job exists and can be tracked.

Typical response:

```http
HTTP/1.1 202 Accepted
Location: /jobs/job_123
Retry-After: 5
Content-Type: application/json

{
  "jobId": "job_123",
  "status": "queued",
  "statusUrl": "/jobs/job_123",
  "cancelUrl": "/jobs/job_123/cancel"
}
```

The status resource should be stable and explicit:

```json
{
  "jobId": "job_123",
  "type": "video_transcode",
  "status": "running",
  "progress": 42,
  "createdAt": "2026-09-30T12:00:00Z",
  "updatedAt": "2026-09-30T12:03:00Z",
  "result": null,
  "error": null
}
```

Possible states:

```
queued -> running -> succeeded
                 └-> failed
queued/running -> cancel_requested -> cancelled
```

API design points:
- `POST /jobs` or domain-specific `POST /videos/{id}/transcodes`
- `GET /jobs/{jobId}` for status
- `DELETE /jobs/{jobId}` or `POST /jobs/{jobId}:cancel` for cancellation
- `Retry-After` hints polling cadence
- idempotency key on job creation prevents duplicate jobs after client retry

---

## Part 2: polling, webhooks, SSE and WebSocket

There are four ways to deliver completion back to the client.

| Pattern | How it works | Use when | Watch out for |
|---|---|---|---|
| **Polling** | Client calls `GET /jobs/{id}` every few seconds | Browser clients, simple UX, jobs take seconds/minutes | Too-frequent polling creates load |
| **Webhook** | Client provides callback URL; server POSTs when done | Server-to-server integrations | Receiver downtime, retries, signature verification |
| **SSE** | Server streams status events over HTTP | One-way browser updates, LLM token streaming | Browser connection limits, reconnect logic |
| **WebSocket** | Full-duplex connection | Interactive jobs needing bidirectional control | Stateful connection tier, scaling complexity |

Polling is often the correct default in interviews because it is simple, robust and works through proxies. Add webhooks for external partners and push for rich browser UX.

### Polling example

```ts
async function waitForJob(jobId: string, signal: AbortSignal) {
  let delayMs = 2000;

  while (true) {
    const res = await fetch(`/jobs/${jobId}`, { signal });
    if (!res.ok) throw new Error(`status failed: ${res.status}`);
    const job = await res.json() as { status: string; result?: unknown; error?: string };

    if (job.status === "succeeded") return job.result;
    if (job.status === "failed" || job.status === "cancelled") {
      throw new Error(job.error ?? job.status);
    }

    const retryAfter = Number(res.headers.get("Retry-After"));
    const wait = Number.isFinite(retryAfter) ? retryAfter * 1000 : delayMs;
    await new Promise((resolve, reject) => {
      const id = setTimeout(resolve, wait);
      signal.addEventListener("abort", () => { clearTimeout(id); reject(signal.reason); }, { once: true });
    });
    delayMs = Math.min(delayMs * 1.5, 15000);
  }
}
```

### Webhook completion

For server-to-server flows, store a callback URL and send signed events:

```http
POST /client-webhook/transcode
X-Signature: hmac-sha256=...
Idempotency-Key: event_abc

{ "eventId": "event_abc", "jobId": "job_123", "status": "succeeded" }
```

The receiver must deduplicate webhook event IDs because webhooks are normally at-least-once.

---

## Part 3: backend shape for long-running jobs

A reliable async request-reply backend usually has these boxes:

```
Client
  │ POST /jobs
  ▼
API ── insert job row ──► Jobs DB
  │
  └── enqueue job_id ───► Queue ──► Workers ──► Object store / DB result
                              │
                              └──── update job status/progress
```

Why both DB and queue?
- The DB is the durable state users can query.
- The queue is the work dispatch mechanism.

A job row might contain:

```sql
CREATE TABLE jobs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  status text NOT NULL,
  progress int NOT NULL DEFAULT 0,
  input jsonb NOT NULL,
  result jsonb,
  error text,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  UNIQUE (user_id, idempotency_key)
);
```

Creation should be transactional with enqueueing. For high correctness, use [D4 Outbox + CDC](D4-Outbox-CDC.md): insert the job row and outbox event in one transaction, then publish to the queue.

Workers update status carefully:
- claim a queued job with a lease or queue visibility timeout
- set `running`
- periodically heartbeat/progress
- write result and set `succeeded`
- on retry, check whether result already exists

---

## Part 4: timeouts, cancellation and retries

### Timeouts

There are two timeouts:

| Timeout | Meaning |
|---|---|
| Request timeout | How long the API waits to accept/create the job |
| Job timeout | Maximum time the background work may run |

The API should not wait for the whole job, but job execution still needs a deadline. A stuck video transcode or code sandbox should not run forever.

### Cancellation

Cancellation is a state transition, not just closing a browser tab.

```
Client -> POST /jobs/{id}:cancel
API -> status = cancel_requested
Worker sees flag -> stops if safe -> status = cancelled
```

Some jobs cannot stop instantly. A video encoder might finish the current segment. A payment capture might be impossible to cancel after it reaches the gateway; you may need a refund flow instead.

### Retries

Retry worker failures only if the job is idempotent or split into idempotent steps. If a worker writes an output file, write to a deterministic location like `outputs/{jobId}/...` so a retry overwrites or reuses the same result instead of creating duplicates.

Poison jobs go to a failed state or DLQ with an inspectable error.

**Interview line:** "Cancellation is best effort. The status endpoint can show `cancel_requested`; the worker must reach a safe checkpoint before marking `cancelled`."

---

## Part 5: client UX patterns

Async request-reply is as much UX as backend.

Good UX:
- show the job immediately in a list with `queued`
- show progress if meaningful, otherwise show phases (`uploading`, `queued`, `processing`, `finalizing`)
- persist job ID in the URL or local state so refresh does not lose it
- handle `failed` with retry options and clear error messages
- allow cancellation when safe
- reduce polling when the tab is hidden
- use push only when it improves experience enough to justify complexity

Examples:

### Video upload/transcode (#6)

```
1. Client uploads raw video to object storage via presigned URL
2. Client calls POST /videos/{id}/transcodes
3. API returns 202 + jobId
4. Workers transcode into HLS renditions
5. Status endpoint returns progress / playback URL
```

### LeetCode / code judging (#19)

```
POST /submissions -> 202 + submissionId
GET /submissions/{id} -> queued/running/accepted/wrong_answer/time_limit
```

The sandbox worker must isolate untrusted code, enforce CPU/memory/time limits, and make result writes idempotent by `submissionId`.

### ChatGPT-style LLM app (#24)

Two modes:
- interactive chat: stream tokens with SSE while the model runs
- batch generation: return job ID and notify when complete

If the user navigates away, the backend may continue the generation and persist the final answer under the conversation/job ID.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Job takes seconds/minutes and client is a browser | 202 + job ID + polling | Simple and reliable through HTTP |
| Partner system needs completion notice | Webhook + signed at-least-once delivery | Server-to-server callback; no polling required |
| LLM token streaming | SSE | One-way ordered text stream; simpler than WebSocket |
| Interactive remote control | WebSocket | Client and server both send frequent messages |
| Video upload/transcode | Presigned upload + async transcode job | Avoids request timeout and handles worker queue |
| Code judge | Submission ID + sandbox worker + status endpoint | Long-running and needs retry/isolation |
| Expensive report generation | Job row + object store result link | Result can be downloaded later |

### Common interview traps

- Returning `200 OK` while the job is still only queued, making clients think it finished.
- Not using idempotency keys on job creation, causing duplicate jobs after retry.
- Polling every 100 ms from thousands of clients.
- Forgetting cancellation and job timeouts.
- Storing only queue state but no durable job row for users to query.
- Treating webhooks as exactly-once; they need signatures and deduplication.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What does HTTP 202 mean in this pattern?</summary>

The request was accepted for processing, but processing has not completed and may still fail. The response should include a job ID or status URL so the client can track progress.
</details>

<details><summary>2. Why do you usually need both a jobs table and a queue?</summary>

The jobs table is durable user-visible state and stores status/result/errors. The queue dispatches work to workers. A queue message alone is not a good status API.
</details>

<details><summary>3. How do you avoid duplicate jobs when the client retries <code>POST /jobs</code> after a timeout?</summary>

Require an idempotency key and enforce a unique constraint such as `(user_id, idempotency_key)`. A retry returns the existing job ID instead of creating a second job.
</details>

<details><summary>4. Polling vs webhook: when do you pick each?</summary>

Polling is best for browser clients and simple UX. Webhooks are best for server-to-server integrations where the receiver has a stable public callback URL and can verify signatures/deduplicate events.
</details>

<details><summary>5. Why is cancellation not the same as closing the HTTP connection?</summary>

The job runs independently in a worker. Closing the connection only stops the client waiting. Cancellation must be stored as job state so the worker can notice and stop at a safe checkpoint.
</details>

<details><summary>6. For ChatGPT streaming, why might SSE be enough?</summary>

The main flow is one-way ordered data from server to browser: tokens and status events. SSE uses normal HTTP, reconnects naturally, and is simpler than a full-duplex WebSocket.
</details>

<details><summary>7. What should a status endpoint return after a job succeeds?</summary>

A terminal `succeeded` status plus result metadata: output URL, IDs, summary, timestamps. Large artifacts should live in object storage, with the status endpoint returning a link or reference.
</details>

<details><summary>8. How does this note connect to D4 outbox?</summary>

Job creation often needs to insert a job row and enqueue work atomically. An outbox row in the same DB transaction can later publish the queue message without dual-write bugs.
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
| [Azure Architecture Center: Async Request-Reply pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/async-request-reply) | Exact headings: **Context and problem**, **Solution**, **Problems and considerations**, **When to use this pattern**, **Workload design**, **Example** | ~25 min |

**Connects to:** [D1 Queues](D1-Queues.md) · [D3 Delivery semantics + idempotency](D3-Delivery-Semantics-Idempotency.md) · [D4 Outbox + CDC](D4-Outbox-CDC.md) · [E1 Polling/SSE/WebSocket](../E-Realtime/E1-Polling-SSE-WebSocket.md) · [F2 Video pipeline](../F-Blobs-Fanout/F2-Video-Pipeline.md)

