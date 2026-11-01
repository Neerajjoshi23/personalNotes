# FE11 · Observability and Resilience: how do you know it works, and what happens when parts fail?

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Video conferencing (FE Tier 1), Checkout / payments (FE Tier 2), News feed (FE Tier 1 / HLD #4), Chat app (FE Tier 1 / HLD #3), Email client (FE Tier 2), every "how would you monitor this?" follow-up

---

## Why this topic matters

Every frontend design round ends with some version of "how do you know it works in production?" and "what happens when the payment widget / CDN / API is down?". A senior answer is not "we use Sentry". It is: what signals you collect, what you deliberately do not collect, how an error gets tied to a release and a backend trace, and how the UI degrades instead of dying.

The frontend is the one tier you do not control. Your code runs on devices, networks, browser versions and extensions you will never see. You cannot SSH in. Telemetry is your only window.

| Area | Interview risk |
|---|---|
| Error capture | silent failures, unreadable minified stacks, thousands of duplicate alerts |
| RUM | averages that hide the slow tail, metrics lost on tab close |
| Analytics | blocking the main thread, schema drift, tracking without consent |
| Tracing | frontend error with no way to find the backend cause |
| Resilience | one failed widget white-screens the page, retry storms, no rollback |
| SLOs | alerting on noise, finding out from Twitter before a dashboard |

**Interview line:** "I'll treat observability as part of the design, not an add-on: errors, RUM and product events flow through one small telemetry module that is non-blocking, sampled, PII-scrubbed and tagged with release, route and trace ID. Resilience is the other half: every dependency gets a timeout, a fallback and a kill switch."

---

## Part 1: the three questions and the signals

Production debugging always asks, in order:

1. **Is it broken?** (detection: alert fires before users complain)
2. **Who is affected?** (scope: which release, route, browser, region, % of sessions)
3. **Why?** (diagnosis: stack, breadcrumbs, trace, recent deploy or flag change)

| Signal | Answers | Example | Cost profile |
|---|---|---|---|
| Errors | broken? why? | uncaught exceptions, failed promises, render crashes | low volume, high value, keep ~100% (with dedup) |
| Performance (RUM) | broken? who? | LCP, INP, CLS, API latency from real users | high volume, **sample** |
| Product analytics | who? did the feature work? | `checkout_step_completed` | high volume, schema-governed, needs consent |
| Logs | why? | structured client log at `warn`/`error` | sample hard; debug logs off by default |
| Traces | why? (cross-tier) | `traceparent` on API calls | sample; correlate by ID |

### What to capture, what NOT to

Capture: release version, route (templated, not raw URL), user-agent family, device class, connection type, session ID, anonymous user ID, feature-flag state, error + stack + breadcrumbs, request ID of failing calls.

Do not capture:
- PII: emails, names, card numbers, tokens, form field values, full URLs with `?token=` or `?email=`;
- request/response bodies by default;
- session-replay of password, payment or health fields (mask by default, allow-list to unmask);
- everything "because the browser exposes it". web.dev says it directly: "don't just track data because it's there, ensure the data will be used before consuming resources tracking it."

Cost levers: sampling (by session, not by event, so a session stays coherent), rate-limits per error fingerprint, dropping known-noise errors (extension errors, `ResizeObserver loop` style benign errors), shorter retention for logs than for aggregated metrics.

**Interview line:** "Errors I keep nearly everything but dedup by fingerprint. RUM and analytics I sample by session. Anything that could contain PII is scrubbed on the client before it leaves the browser, because scrubbing on the server is too late."

---

## Part 2: error capture in the browser

### The three nets

```ts
// 1. Synchronous errors outside React (and errors in event handlers, timers)
window.addEventListener('error', (e) => {
  report({ type: 'error', message: e.message, error: e.error, source: e.filename, line: e.lineno });
});

// 2. Promise rejections nobody handled (every forgotten await/catch)
window.addEventListener('unhandledrejection', (e) => {
  report({ type: 'unhandledrejection', error: e.reason });
});

// 3. Resource load failures (img/script/css): 'error' does not bubble, so capture phase
window.addEventListener('error', (e) => {
  const t = e.target as HTMLElement;
  if (t && t !== (window as any) && 'src' in t) report({ type: 'resource', src: (t as any).src });
}, true);
```

MDN on `unhandledrejection`: it fires when a Promise with no rejection handler is rejected, and "Promise rejections that originate from a cross-origin script won't fire this event" because the event can leak data. That is the same reason cross-origin script errors show up as the useless `Script error.` unless the script is served with CORS headers and `crossorigin`. It is cancelable: `preventDefault()` stops the default console output, so only do that if you are logging it yourself.

### React error boundaries

Per the [React Component docs](https://react.dev/reference/react/Component): an error boundary is a class component defining `static getDerivedStateFromError` (pure, switches to fallback UI) and optionally `componentDidCatch(error, info)` (the place to log to a reporting service).

```tsx
class Boundary extends React.Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    report({ type: 'render', error, componentStack: info.componentStack, boundary: this.props.name });
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
```

What each net misses:

| Net | Misses |
|---|---|
| Error boundary | event handlers, asynchronous code (`setTimeout`, `requestAnimationFrame`; exception: errors inside `startTransition`), server-side rendering, errors thrown in the boundary itself (all from the React docs' list) |
| `window.error` | promise rejections, anything wrapped in try/catch that swallows it |
| `unhandledrejection` | cross-origin script rejections, rejections you caught and ignored |
| Both | **handled** errors that are still product failures (a 500 you caught and showed a toast for). Report those explicitly. |

Gotcha from the same page: in development, errors caught by `componentDidCatch` still bubble to `window.onerror`; in production they do not. So do not rely on the window handler to see render crashes; the boundary must report itself. There is no function-component equivalent yet, so write one reusable class (or use `react-error-boundary`).

**Interview line:** "Error boundaries cover render-phase errors only. I add `window.error` and `unhandledrejection` as the safety net, and I explicitly report handled-but-important failures like a failed payment call."

### Grouping, fingerprinting

One bug on 50,000 sessions must be one issue, not 50,000 alerts. Trackers group by a fingerprint, typically derived from the (symbolicated) stack frames plus error type. Things that break grouping: minified stacks (frame names change every build), dynamic data in the message (`User 8841 not found`), and wrapping errors with new messages. Mitigate: normalize messages, set explicit fingerprints for known classes (`['api', 'checkout', status]`), and always capture the original error as `cause`.

### Source maps and release tagging

Minified stacks are useless; source maps map them back. Two options:

| Option | Pros | Cons |
|---|---|---|
| Upload maps to the tracker at build time (CI) | maps never public; tracker symbolicates server-side | needs CI step; must upload before errors arrive |
| Host maps publicly next to the JS | zero build integration | anyone can read your original source; leaks internal comments and paths |

Sentry's docs say uploading as part of the build is strongly recommended, notes hosting publicly is possible for browser apps, and by default links maps to builds by injecting **Debug IDs** into the output, so a map matches the exact build, not a filename guess. Only production builds generate maps for upload. Common failure: "Source maps not applying: verify artifacts are uploaded before errors occur."

My default: generate maps in CI, upload to the tracker, **do not deploy** `.map` files to the CDN. Tag every event with a `release` (git SHA or semver) so "this error started in release X" is one query. web.dev makes the same point for performance: "create a unique version for each deployed change and then track that version", because deploy-date comparisons break under CDN and service-worker caching.

### Breadcrumbs and context

Breadcrumbs are the trail before the crash: last N navigations, clicks (element selector only, never text), console warnings, failed fetches (URL path + status, no body), flag changes. Cap them (e.g. 50) and scrub them.

Context to attach to every event: `release`, `env`, templated `route`, `sessionId`, anonymous `userId` (hashed), `flags`, `online` state, `traceId` of the last failing request.

---

## Part 3: RUM — real-user performance

Definitions and thresholds live in [FE5 Part 1](./FE5-Performance.md) and lab-vs-RUM in FE5 Part 5. This part is the pipeline.

```ts
import { onLCP, onINP, onCLS } from 'web-vitals/attribution';

function send(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name, value: metric.value, id: metric.id,
    route: templatedRoute(), release: RELEASE,
    device: deviceClass(), conn: (navigator as any).connection?.effectiveType,
    attribution: metric.attribution, // LCP element, INP target, CLS source
  });
  // sendBeacon survives unload; fetch+keepalive when you need non-POST / headers
  navigator.sendBeacon('/rum', body) ||
    fetch('/rum', { method: 'POST', body, keepalive: true });
}
onLCP(send); onINP(send); onCLS(send);
```

Why each piece:

- **web-vitals library** computes metrics the way Chrome's field tools do, and handles browser quirks. The README says to call each `onX` once per page load, since each creates a `PerformanceObserver` and listeners for the page lifetime.
- **Attribution build** (`web-vitals/attribution`) adds a diagnostic `attribution` property so you learn *why* (which element, which interaction, which resource), at a cost the README puts at about 1.5K brotli'd. Use it if you will actually read it.
- **`reportAllChanges`** is for debugging; the README says it is generally not needed or recommended for production.
- **Send when the page is hidden.** CLS and INP are only final late. web.dev: `beforeunload`/`unload` are unreliable (especially mobile) and hurt bfcache; send on `visibilitychange` when state becomes `hidden`. MDN's sendBeacon page says the same and gives the payload limit (about 64 KiB queued). `sendBeacon` is POST-only; for other methods, custom headers or reading the response, use `fetch` with `keepalive: true`.
- **Percentiles, not averages.** web.dev: averages "don't represent any single user's session". Report p75 (the Core Web Vitals pass bar), watch p90/p95 for the slow tail. Keep the metric `id` so you can rebuild distributions.
- **Segment** by route (templated), device class, connection type, country, release, experiment arm. A global p75 that is green can hide a red checkout route on low-end Android.
- **Sample** by session (e.g. 10%) once volume is high. Never sample errors the same way.
- **Do not hurt the page you measure.** web.dev: load analytics async and last, avoid long tasks, use `sendBeacon` and `requestIdleCallback`. Inline only code that truly must run early.
- **Experiment groups must be assigned server-side**, per web.dev, because client-side A/B tools block rendering and hurt LCP.

⏭ *Skip for interviews:* soft navigations (`reportSoftNavs`), CrUX vs your own RUM discrepancies. Just know CrUX is Chrome-only sampled data and your RUM sees every browser.

**Interview line:** "Lab catches regressions before release, RUM tells me if real users got faster. I ship web-vitals with attribution, send on `visibilitychange` via `sendBeacon`, tag with release and route, and look at p75 per segment, never the mean."

---

## Part 4: analytics event design

Product analytics answers "did the feature work for users", and it shares the pipe with errors and RUM. Design it like an API, because the data team is your client.

### Schema and versioning

```ts
type AnalyticsEvent = {
  v: 2;                       // schema version, bump on breaking change
  name: 'checkout_step_completed'; // verb_noun, from a typed registry
  id: string;                 // uuid, for dedup on retry
  ts: number;                 // client time; server adds receivedAt
  sessionId: string;
  anonId: string;             // never raw email or user ID in the payload
  route: string;              // templated
  release: string;
  props: { step: 'address' | 'payment' | 'review'; durationMs: number };
};
```

Rules: names from a typed registry (compile-time error on typos), additive changes only inside a version, `id` for idempotent ingestion, client timestamp plus server receive time (device clocks lie), no free-text props.

### Batching and queueing

```ts
const queue: AnalyticsEvent[] = [];
export function track(e: AnalyticsEvent) {
  if (!consent.analytics) return;
  queue.push(e);
  if (queue.length >= 20) schedule();
}
function schedule() { 'requestIdleCallback' in window ? requestIdleCallback(flush) : setTimeout(flush, 0); }
function flush() {
  if (!queue.length) return;
  const batch = queue.splice(0, 50);
  const ok = navigator.sendBeacon('/events', JSON.stringify({ batch }));
  if (!ok) persist(batch); // IndexedDB, retry next session
}
setInterval(flush, 10_000);
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
```

- **Batch** to cut request count; flush on size, interval and `hidden`.
- **Offline-safe:** if send fails or `navigator.onLine` is false, persist to IndexedDB and drain on reconnect, with the same `id` so the server dedups.
- **Consent:** no consent, no non-essential events (and no analytics cookies/IDs). Error reporting for operating the service is often treated differently from marketing analytics, but that is a legal call; design a consent gate that is one boolean the telemetry module checks.
- **Main thread:** build payloads in idle time, keep the SDK small and lazy-loaded, never `JSON.stringify` huge objects inside an input handler (it shows up in INP).
- **Trade-off:** larger batches mean fewer requests but more loss if the tab dies; the `visibilitychange` flush plus a short interval bounds the loss.

---

## Part 5: distributed tracing and client logging

### W3C Trace Context

The browser starts a trace by sending a `traceparent` header on API calls. From the [W3C Trace Context](https://www.w3.org/TR/trace-context/) spec (Recommendation, 23 November 2021), version `00` format is `version-trace-id-parent-id-trace-flags`:

```http
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
```

- `trace-id`: 16-byte ID shared by every hop of the request tree (32 hex chars);
- `parent-id` (span ID): 8-byte ID of the caller's span (16 hex chars);
- `trace-flags`: `01` = sampled, `00` = not sampled.

Each backend service keeps the trace-id, creates its own span ID and forwards. The spec's examples show the same trace-id with a new parent-id at each hop.

```ts
async function tracedFetch(url: string, init: RequestInit = {}) {
  const traceId = randomHex(16), spanId = randomHex(8);
  const headers = new Headers(init.headers);
  headers.set('traceparent', `00-${traceId}-${spanId}-${sampled ? '01' : '00'}`);
  try {
    const res = await fetch(url, { ...init, headers });
    if (!res.ok) setLastFailure({ traceId, status: res.status });
    return res;
  } catch (e) { setLastFailure({ traceId, status: 0 }); throw e; }
}
```

Correlating a frontend error to a backend trace: attach the failing request's `traceId` (and the server's `x-request-id` echo, see FE4 `ApiError.requestId`) to the error event. Support clicks the trace link and sees the slow DB span.

Gotchas:
- Cross-origin APIs: a custom `traceparent` header triggers a **CORS preflight**; the API must allow it in `Access-Control-Allow-Headers`. Rolling this out to third-party origins will fail, so restrict to your own origins.
- Sampling decision: decide once at the root (the browser) and propagate via the flag, or let the backend decide; do not make each tier decide independently or you get half-traces.
- Privacy: the spec has a dedicated privacy section; trace IDs are identifiers, so do not derive them from user data and do not put PII in `tracestate` or baggage.

⏭ *Skip for interviews:* `tracestate` vendor key format, `traceparent` version negotiation, OpenTelemetry JS SDK internals. Know that OTel's browser SDK can do the injection for you.

### Client logging levels and sampling

| Level | Sent to server? | Notes |
|---|---|---|
| `error` | yes, ~100% | becomes an error event, deduped |
| `warn` | sampled (e.g. 10%) | degraded paths: fallback used, retry succeeded |
| `info` | sampled hard / breadcrumb only | key lifecycle events |
| `debug` | never in prod unless a per-session switch is on | enable via flag or query param for a support session |

Use a tiny logger wrapper so call sites say `log.warn('fallback_used', {dep: 'avatar-cdn'})`, with structured fields, a global scrubber and a rate limit per message key (so a render-loop log cannot DDoS your own ingest).

---

## Part 6: resilience patterns on the client

Observability tells you something broke. Resilience decides what the user sees while it is broken. Assume every dependency (API, CDN, third-party script, WebSocket) will fail.

### Timeouts

No `fetch` without a deadline. A hung request is worse than a failed one because the UI sits in a spinner forever.

```ts
const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
// or combine with a user-cancel controller via AbortSignal.any([user.signal, AbortSignal.timeout(8000)])
```

Budget timeouts top-down: if the page needs data in 3 s, a 30 s fetch timeout is a bug.

### Retries with backoff and jitter

Already covered in [FE4 Part 3](./FE4-Network-Layer.md): retry only transient failures, cap attempts, exponential backoff **with jitter**, idempotency keys for mutations. Observability add-on: log each retry at `warn` with attempt number, and track "success after retry" rate; a rising value is an early warning before hard failures appear. Backend view in [I2](../../../SystemDesign/Notes/HLD/I-Reliability/I2-Timeouts-Retries-Backoff.md).

### Circuit breaker for flaky third parties

If the chat widget or recommendations API has failed 5 times in 30 s, stop calling it for a while instead of making every page view pay the timeout.

```ts
class Breaker {
  private fails = 0; private openUntil = 0;
  constructor(private max = 5, private coolMs = 30_000) {}
  async run<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    if (Date.now() < this.openUntil) return fallback();          // open: skip the call
    try { const r = await fn(); this.fails = 0; return r; }       // closed or half-open success
    catch { if (++this.fails >= this.max) this.openUntil = Date.now() + this.coolMs; return fallback(); }
  }
}
```

States: closed (normal), open (fail fast, serve fallback), half-open (after cooldown let one probe through). Trade-off: a too-sensitive breaker hides a dependency that was only briefly slow. Keep it per dependency and per tab; do not share state across tabs unless you need to.

### Graceful degradation and fallback UI

Decide per feature what "degraded" means before building it:

| Dependency fails | Degrade to |
|---|---|
| recommendations | hide the rail, page still works |
| avatar/image CDN | initials placeholder |
| analytics / chat widget script | do nothing, never block the page |
| search suggestions | plain submit-on-enter |
| payment provider's card iframe | message + alternative method, never a blank form |
| video HD stream | lower resolution, then audio-only |

### Error boundary granularity

One boundary at the root means any crash white-screens the app. A boundary around every component is noise. Place them at **feature seams**:

```tsx
<Layout>                                   {/* root boundary: last resort, "reload" page */}
  <Boundary name="nav"><Nav/></Boundary>
  <Boundary name="feed" fallback={<FeedRetry/>}><Feed/></Boundary>
  <Boundary name="recs" fallback={null}><Recommendations/></Boundary>
</Layout>
```

Rules: critical path (checkout form) gets its own boundary with a retry and a support-friendly error ID; decorative widgets get `fallback={null}`; every boundary reports with its `name`; a "Try again" button should reset boundary state, ideally remount with a changed `key`. Route-level boundaries also catch failed lazy chunk loads (a classic post-deploy error, see below).

### Feature-flag kill switch

Every risky feature ships behind a remotely controlled flag that can be turned off without a deploy. The flag service is itself a dependency: cache the last known flags, define a safe default when the fetch fails (usually "off" for new features, "on" for existing ones), and keep the flag payload tiny so it does not delay first render.

### Safe rollout and rollback

- **Canary / staged rollout:** 1% then 10% then 50% then 100%, gated by release-health metrics (Part 7). Assign cohorts server-side or at the edge.
- **Rollback:** serving the previous build must be one action. Keep old hashed assets on the CDN for a while: users with the old HTML still request old chunks, and users with new HTML must not 404 on chunks that were deleted. A `ChunkLoadError` spike right after deploy is the signature; handle it by catching the dynamic import failure and prompting a reload (once, with a loop guard).
- **Version skew:** old tab open for days talks to a new API. Send the client `release` on requests so the server can warn or force-refresh.

### Stale-while-error

If revalidation fails, keep showing the last good data with a "last updated" hint rather than an empty error state. Same idea as HTTP `stale-if-error`, and what query libraries do by default (keep cached `data` while `error` is set). Right for feeds and dashboards; wrong for balances, inventory or payment amounts, where stale data is a correctness bug.

**Interview line:** "Every dependency gets a timeout, a fallback and a way to turn it off. Failures are scoped: a broken recommendations rail should cost me a rail, not the checkout."

---

## Part 7: SLOs for the frontend

SLI = what you measure; SLO = target for it; alert = when you are burning the budget too fast.

| SLI | Definition | Example SLO |
|---|---|---|
| Error-free sessions | sessions with no unhandled error / total sessions | >= 99.5% over 28 days |
| Crash-free page views per critical route | checkout route sessions without a render crash | >= 99.9% |
| LCP p75 | per route, per device class | <= 2.5 s |
| INP p75 | per route, per device class | <= 200 ms |
| Critical-flow success | `checkout_started` to `order_confirmed` rate excluding user abandon | no regression > X points vs baseline |
| API success as seen by client | non-5xx and non-network-failed calls / total | >= 99.9% |

Alerting on regressions after deploy (release health):
- compare the new release's error-free-session rate and p75 vitals against the previous release over the same window, not against an absolute number alone;
- alert on **new issues** (fingerprint first seen in this release) and on **regressed issues**, not on every error;
- alert on burn rate (error budget used too fast), not on a single spike; require minimum sample size so 3 sessions on a canary do not page anyone;
- tie the alert to the rollout: canary fails the gate, auto-pause or auto-rollback.

Trade-off: very tight SLOs create alert fatigue and slow shipping; SLOs on low-traffic routes are statistically noisy, so widen the window or aggregate.

**Interview line:** "My frontend SLIs are error-free sessions and p75 LCP/INP per critical route, compared release-over-release. A canary that regresses those gates the rollout automatically."

---

## Part 8: worked mini-example (RADIO): "Monitor and harden a checkout page"

**R: Requirements.** Functional: user pays; no double charges. Non-functional: 99.9% of checkout sessions complete without a crash, LCP p75 under 2.5 s on mobile, no PII in telemetry, survive payment-provider hiccups. Scope: web checkout, not the payment backend.

**A: Architecture.** One `telemetry` module (errors, RUM, events) behind a consent gate and PII scrubber; a typed `HttpClient` (FE4) that adds `traceparent`, timeouts, retry policy and normalized `ApiError`; per-feature error boundaries; flag client with cached defaults.

**D: Data model / events.** `checkout_viewed`, `step_completed{step}`, `payment_submitted`, `payment_failed{kind}`, `order_confirmed`, each with `v`, `id`, `sessionId`, `release`, `route`. Errors carry `traceId`, `release`, breadcrumbs.

**I: Interface / UX.** Payment iframe fails to load: show fallback method and a "contact support" with an error ID, not a blank form. Submit is idempotent (idempotency key, button disabled, no blind retry; FE4). Offline: queue analytics, block submit with a clear message.

**O: Optimizations and hardening.**
- Monitor: error-free sessions on `/checkout`, p75 INP on the submit button, funnel drop-off per step, `payment_failed` by kind (provider vs validation vs network).
- Alerts: new-fingerprint error in canary, funnel conversion drop vs previous release, `ChunkLoadError` spike.
- Harden: timeout 10 s on payment call and then show "check your order status" instead of retrying, circuit breaker on address autocomplete (fall back to manual entry), kill switch for the new payment method, 5% canary with automatic rollback, stale-while-error is **not** used for totals.
- Video-conferencing variant: same shape, different SLIs: join success rate, time-to-first-frame, media reconnect rate, audio-only fallback rate, device-permission failure rate; `getStats()` data sampled to RUM; degrade HD to SD to audio-only; breaker on third-party background-blur model; kill switch for experimental codecs.

---

## Part 9: choosing in an interview / cheat sheet

| Question | Answer |
|---|---|
| How do I catch all errors? | `error` + `unhandledrejection` + error boundaries + explicit reports for handled failures |
| Why are stacks unreadable? | minified; upload source maps in CI, link by Debug ID/release, do not serve maps publicly |
| How to send data on tab close? | `sendBeacon` / `fetch keepalive` on `visibilitychange: hidden`, never `unload` |
| Averages or percentiles? | percentiles, p75 for vitals, look at p95 for tail |
| Link frontend error to backend? | `traceparent` on requests, store trace ID on the error |
| Flaky third party? | timeout, circuit breaker, fallback UI, kill switch |
| One widget crashed, page blank? | boundary granularity at feature seams |
| Bad deploy? | canary + release-health gate + one-step rollback, keep old assets |
| Stale data on failure? | stale-while-error for feeds, never for money |
| What not to log? | PII, bodies, form values, sensitive URLs |

### Common interview traps

- "We'll use Sentry" with no mention of release tags, source maps, sampling or PII.
- Believing error boundaries catch event-handler and async errors.
- Shipping `.map` files publicly and calling it done.
- Reporting averages, or sending metrics on `unload`.
- Sampling errors the same way as analytics, so rare crashes disappear.
- Retrying without timeouts, jitter or idempotency (FE4).
- One root error boundary, or a boundary around everything.
- No rollback story: deleting old chunks on deploy and then wondering about `ChunkLoadError`.
- Alerting on raw error counts instead of new/regressed issues and rates.
- Sending `traceparent` to third-party origins and breaking CORS.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Which errors does a React error boundary NOT catch, and what covers them?</summary>

Event handlers, asynchronous code like `setTimeout`/`requestAnimationFrame` callbacks (except inside `startTransition`), server-side rendering, and errors in the boundary itself. Cover them with `window.addEventListener('error')`, `unhandledrejection`, try/catch with explicit reporting in handlers, and a root-level boundary as last resort.
</details>

<details><summary>2. How do you make minified production stacks readable without exposing your source?</summary>

Generate source maps in the production build, upload them to the error tracker from CI (Debug IDs or release tag link each map to the exact build), and do not deploy the `.map` files to the public CDN. Upload must happen before errors arrive. Hosting maps publicly works but exposes original source.
</details>

<details><summary>3. Why send RUM on `visibilitychange` with `sendBeacon` instead of `unload`?</summary>

`unload`/`beforeunload` are unreliable (especially on mobile, where the app can be killed without events) and block bfcache eligibility. `visibilitychange` to `hidden` is the last reliable moment. `sendBeacon` queues an async POST (about 64 KiB) that the browser delivers without delaying navigation; use `fetch` with `keepalive` if you need headers or other methods.
</details>

<details><summary>4. Why p75 and not the average for Web Vitals, and how do you avoid a green dashboard hiding a bad segment?</summary>

Averages do not represent any user's session and outliers skew them. Report percentiles (p75 is the pass bar, check p90/p95), keep per-instance IDs to build distributions, and segment by route, device class, connection and release so low-end mobile on checkout cannot hide behind a healthy global number.
</details>

<details><summary>5. How do you correlate a frontend error with a backend trace?</summary>

Generate a W3C `traceparent` (`00-<32 hex trace-id>-<16 hex parent-id>-<flags>`) on API calls, have services propagate the trace ID, and attach the trace ID (and request ID) of the failing call to the error event. Remember CORS preflight for the custom header on cross-origin APIs and keep IDs free of user data.
</details>

<details><summary>6. A third-party recommendations API starts timing out. What does the client do?</summary>

Per-call timeout, limited retries with backoff and jitter, a circuit breaker that opens after repeated failures and serves a fallback (hide the rail) during cooldown, an error boundary with `fallback={null}` around the widget, a `warn` log with the dependency name, and a kill switch flag to disable the feature remotely.
</details>

<details><summary>7. A deploy goes out and `ChunkLoadError` spikes. Why, and what do you do?</summary>

Users with the old HTML request hashed chunks that were deleted (or new HTML requests chunks not yet on the CDN). Keep old assets for a retention window, make rollback one action, catch dynamic import failures at the route boundary and offer a single guarded reload, and gate canaries on release-health so the spike pauses the rollout.
</details>

<details><summary>8. Name four frontend SLIs and how you would alert on a regression after deploy.</summary>

Error-free sessions %, crash-free critical-route views, LCP and INP p75 per route/device, and critical-flow completion (checkout funnel). Compare the new release against the previous one over the same window, alert on new or regressed issue fingerprints and on budget burn rate with a minimum sample size, and wire the alert to pause or roll back the canary.
</details>

---

## My notes (write from memory after reading)

- 
- 
- 

**One thing I'd have got wrong before reading this:**

---

## Sources / read more

All pages below were fetched and read while writing this note.

| Source | What to read | Where / time |
|---|---|---|
| [web.dev: Best practices for measuring Web Vitals in the field](https://web.dev/articles/vitals-field-measurement-best-practices) | "Avoid averages", "Ensure you can report a distribution", "Send your data at the right time", "Version your changes", "Run experiments", "Ensure measurement doesn't affect performance" | ~20 min |
| [web-vitals README (GitHub)](https://github.com/GoogleChrome/web-vitals) | "Install and load the library" (attribution build), "Basic usage", "Report the value on every change", "Send the results to an analytics endpoint" | ~25 min |
| [W3C Trace Context](https://www.w3.org/TR/trace-context/) | `traceparent` header (version-format, trace-id, parent-id, trace-flags), examples, privacy considerations. Skim `tracestate` | ~30 min |
| [MDN: Window unhandledrejection event](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event) | "Usage notes", "Basic error logging", "Preventing default handling" | ~10 min |
| [MDN: Navigator.sendBeacon()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon) | "Description", "Sending analytics at the end of a session", "Legacy events" | ~10 min |
| [React: Component (error boundaries)](https://react.dev/reference/react/Component) | `componentDidCatch`, `static getDerivedStateFromError`, "Catching rendering errors with an Error Boundary" and its note on what boundaries do not catch | ~20 min |
| [Sentry: Source Maps for Browser JavaScript](https://docs.sentry.io/platforms/javascript/sourcemaps/) | "Uploading Source Maps", Debug IDs note, "Other Tools" (public hosting), "Troubleshooting" | ~15 min |

Not fetched (so not cited as a source): MDN Reporting API; Sentry grouping docs. The grouping/fingerprinting, breadcrumb, circuit-breaker, SLO and rollout guidance above is general practice from my own knowledge, not quoted from these pages.

**Connects to:** [FE4 Network Layer](./FE4-Network-Layer.md) · [FE5 Performance](./FE5-Performance.md) · [I2 Timeouts/Retries/Backoff](../../../SystemDesign/Notes/HLD/I-Reliability/I2-Timeouts-Retries-Backoff.md) · FE3 State + Data Model
