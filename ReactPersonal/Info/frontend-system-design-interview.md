# Frontend System Design — Interview Questions (with reference answers)

Built from my notes in [`frontend-system-design/`](frontend-system-design/) (FE1–FE13). Each topic has: the cheat sheet, the traps interviewers set, and self-test questions with spoken-tone answers. Full explanations, code and sources live in the notes; this file is for revision.

**How to use it:** pick one topic a day. Say each answer out loud before opening it. For question days, run the full RADIO routine below, then score yourself with the rubric at the end of this file. Related: [`interview-questions.md`](interview-questions.md) (JS / React / TS) and [`react-learning-path.md`](react-learning-path.md).

## RADIO in one card

| Step | Minutes | What to say |
|---|---|---|
| **R**equirements | 5 | Users, core flows, out of scope, devices, non-functional (perf, a11y, offline, i18n, scale) |
| **A**rchitecture | 10 | Components/modules, rendering strategy, where state lives, data flow |
| **D**ata model | 5 | Entities, normalized store, server vs client vs URL vs form state |
| **I**nterface | 10 | API shape (pagination, errors), component props/events, a11y attributes |
| **O**ptimizations | 10 | Performance, resilience, a11y, security, observability, trade-offs |
| Wrap-up | 5 | Failure modes, what you'd do next, what you'd measure |

End every answer with one line on how you'd **monitor it** (FE11) and one on **what fails** (offline, slow API, bad deploy).

---

## FE1

### ﻿# FE1 · RADIO Framework: steering a frontend system design round

#### Cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| News feed | RADIO with heavy Data + Optimizations | pagination, normalized entities, virtualization, image performance |
| Chat app | emphasize Interface + Optimizations | realtime ordering, reconnect, optimistic send, unread state |
| Autocomplete | component/API variant of RADIO | debounce/cache/cancel, keyboard a11y, async states |
| Data table | Data + Interface first | server-side sort/filter, URL state, virtualization, column model |
| E-commerce product page | Rendering + Performance deep dive | SEO, SSR/SSG/ISR, image LCP, inventory freshness |
| DrawBoard/Figma | Architecture + realtime data model | CRDT updates, presence, snapshots, conflict-free local editing |

#### Common interview traps

- Treating frontend system design as a list of React components.
- Skipping requirements and optimizing the wrong metric.
- Saying "global state" without splitting server, client, URL and form state.
- Choosing WebSocket for everything instead of asking whether invalidation is enough.
- Ignoring loading, empty, error, offline and accessibility states.
- Spending all the time on one rabbit hole and never reaching optimizations.

---

#### Questions

<details>
<summary>FE1.1 What are the five RADIO steps, and what artifact should each produce?</summary>

Requirements produce scoped functional/non-functional goals. Architecture produces module/rendering/data-flow diagrams. Data model produces entities, view state and local state. Interface definition produces APIs/events/component props. Optimizations produce prioritized deep dives: performance, reliability, a11y, realtime, caching and observability.

</details>

<details>
<summary>FE1.2 In a feed question, why is "components first" a weak start?</summary>

Because components do not settle the risky decisions: rendering strategy, pagination, entity shape, cache updates, realtime invalidation, media performance and failure states. Components are implementation details after the architecture and data flow are agreed.

</details>

<details>
<summary>FE1.3 Name three requirements questions that materially change a frontend design.</summary>

Is SEO/public sharing required? Is the primary metric first load, interaction latency, correctness or offline? What devices and network conditions matter? How fresh must data be? Is it an app design or component API design? What scale of list/items should be supported?

</details>

<details>
<summary>FE1.4 How does RADIO change for a modal/autocomplete component API question?</summary>

Architecture becomes DOM/state-machine/event architecture; data model is selected/highlighted/open state; interface definition becomes props/events/controlled modes/slots; optimizations focus on keyboard accessibility, ARIA, async states, debounce/cancel and customization.

</details>

<details>
<summary>FE1.5 What is a good interview line for choosing cursor pagination?</summary>

"I'll use cursor pagination because new items can be inserted while the user scrolls; offset pagination can duplicate or skip items. The trade-off is opaque cursors make arbitrary page jumps harder, which is acceptable for an infinite feed."

</details>

<details>
<summary>FE1.6 In the News feed example, why use realtime as an invalidation signal rather than auto-inserting posts?</summary>

Auto-inserting can move content while the user reads and destroy scroll context. A "new posts available" signal preserves UX while still giving freshness. The app can fetch and prepend only when the user chooses.

</details>

<details>
<summary>FE1.7 Which evaluation axis catches "I know the buzzwords but cannot defend trade-offs"?</summary>

Exploration and trade-offs, plus technical proficiency. The answer must compare choices and tie them to product constraints and metrics, not just name SSR, GraphQL, WebSocket or React Query.

</details>

<details>
<summary>FE1.8 What should you do if you realize you went too deep into a rabbit hole?</summary>

Recover explicitly: summarize the conclusion, park the detail, and return to the framework. Example: "The key point is that row virtualization protects INP; I'll stop there and cover API/error handling next."

</details>

**Note:** [full note](frontend-system-design/FE1-RADIO-Framework.md)

---

## FE2

### FE2 · Rendering Strategies: picking where HTML and interactivity are born

#### Cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Public product page | SSG/ISR or SSR | SEO, CDN, LCP; dynamic inventory handled separately |
| Logged-in dashboard | CSR with route splitting | no SEO; interaction and data freshness dominate |
| News article/blog/docs | SSG | stable content, cheap global CDN delivery |
| Personalized feed | CSR or SSR first page | personalization limits caching; optimize list/images |
| Slow mixed-data page | streaming SSR | show shell/critical content before slow sections |
| Content page with small widgets | islands / partial hydration | reduce JS and hydration work |
| Data-heavy read-only sections | RSC | fetch on server, ship less client JS |
| Collaborative canvas | CSR | high-frequency local interaction, realtime state, canvas APIs |

#### Common interview traps

- Saying SSR always improves performance; hydration can still hurt INP.
- Choosing SSG for data that must be fresh on every request.
- Ignoring server cost for personalized SSR at scale.
- Treating RSC as the same thing as SSR; RSC is a component/data transport model, SSR is HTML rendering.
- Forgetting that SEO is irrelevant for authenticated routes.
- Hydrating every below-the-fold widget immediately.

---

#### Questions

<details>
<summary>FE2.1 Why can an SSR page have good FCP but bad INP?</summary>

HTML arrives early, so content is visible. But the browser may still parse a large JS bundle and hydrate a big component tree on the main thread. During that work, user input can be delayed, causing poor INP.

</details>

<details>
<summary>FE2.2 When would you choose SSG/ISR over SSR for an e-commerce page?</summary>

When product content is mostly cacheable and SEO/LCP matter. SSG/ISR serves from CDN cheaply. Dynamic fields such as price, inventory or promotions can be revalidated, embedded with short TTL, or checked during add-to-cart/checkout.

</details>

<details>
<summary>FE2.3 Explain the difference between SSR and RSC in one interview sentence.</summary>

SSR produces HTML for an initial request; RSC lets some React components execute on the server and send a component payload so their code/data work does not need to ship to the client. They can be combined but are not the same feature.

</details>

<details>
<summary>FE2.4 What is an island, and where is it useful?</summary>

An island is an independently hydrated interactive region inside otherwise static/server-rendered HTML. It is useful on content-heavy pages like product pages or docs where only widgets such as cart buttons, galleries or carousels need client JavaScript.

</details>

<details>
<summary>FE2.5 For a logged-in dashboard, why might CSR be the right default?</summary>

SEO does not matter, the UI is interaction-heavy, and data is user-specific. CSR with route splitting, request caching, cancellation and skeleton states can be simpler and cheaper than SSR for every personalized route.

</details>

<details>
<summary>FE2.6 What rendering approach fits DrawBoard or Figma-like canvas collaboration?</summary>

CSR for the core editor. The canvas/CRDT/realtime loop is client-heavy and highly interactive. SSR can still be used for landing pages or document metadata, but the editor should load a snapshot/update log and run locally.

</details>

<details>
<summary>FE2.7 Name two causes of hydration mismatch.</summary>

Rendering non-deterministic values such as `Date.now()` or random IDs on server and client; using browser-only state during server render; locale/time-zone differences; data that changes between server render and client hydration.

</details>

<details>
<summary>FE2.8 How do you connect rendering strategy to Core Web Vitals?</summary>

TTFB is affected by server work/cache; FCP/LCP improve when real content and hero assets arrive early; INP depends on JS size and hydration/main-thread work; CLS depends on stable layout regardless of rendering mode.

</details>

**Note:** [full note](frontend-system-design/FE2-Rendering-Strategies.md)

---

## FE3

### FE3 · State and Data Model: the client-side truth map

#### Cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Feed/post entities repeat across pages | normalize by ID or centralize cache update helpers | avoid divergent likes/authors |
| Chat send | optimistic message with client ID | instant UX + dedup with server ack |
| Payment/checkout | pessimistic confirmation | correctness beats fake success |
| Search filters/table state | URL state | shareable, refresh-safe, back/forward works |
| Modal hover/dropdown open | local component state | no global coupling |
| Large table derived rows | server query or memoized selector | avoid main-thread expensive recompute |
| Email unread count | server aggregate or selector | choose based on exactness and scale |
| DrawBoard presence | ephemeral realtime state | lossy and separate from CRDT document |

#### Common interview traps

- One global store for everything.
- Duplicating nested entities and then failing optimistic updates.
- Storing derived state that silently drifts.
- Forgetting rollback and pending states for optimistic mutations.
- Keeping filters only in component state when users expect shareable URLs.
- Treating realtime events as always ordered and exactly once.

---

#### Questions

<details>
<summary>FE3.1 Why is server state different from client/UI state?</summary>

Server state is owned by the backend, asynchronous, shared, stale-able and error-prone; the client caches it. UI state is owned by the current browser session and often local. Server state needs invalidation/refetch/mutations; UI state mostly needs predictable component coordination.

</details>

<details>
<summary>FE3.2 What belongs in URL state for a data table?</summary>

Filters, search query, sort, page/cursor if shareable, selected row only if deep-linking to it matters, and active tab/time range. Ephemeral hover or column resize drafts usually should not be in the URL unless the product requires persistence.

</details>

<details>
<summary>FE3.3 Why normalize feed data?</summary>

The same post/user/media can appear in multiple pages or surfaces. Normalization gives one entity identity by ID, so updates like likes, author avatar changes or deletions do not require finding and patching many duplicate nested objects.

</details>

<details>
<summary>FE3.4 Give the optimistic update lifecycle.</summary>

Cancel conflicting queries, snapshot previous data, apply optimistic patch, send mutation with an idempotency/client mutation ID, rollback on error, replace optimistic IDs with server IDs on success, and invalidate/refetch on settle if server truth may differ.

</details>

<details>
<summary>FE3.5 When should you avoid optimistic UI?</summary>

When fake success is harmful or correctness-critical: payment, inventory reservation, permission changes, destructive actions without undo, or operations likely to fail. Use pending states and server confirmation instead.

</details>

<details>
<summary>FE3.6 How do you model chat messages during reconnect?</summary>

Keep messages by ID plus ordered IDs, last seen server sequence, pending local messages with client IDs, and connection state. On reconnect, fetch gaps after the last acknowledged sequence and dedup incoming events by message ID/client ID.

</details>

<details>
<summary>FE3.7 What is derived state, and why is it dangerous to store?</summary>

Derived state is computed from other state, such as unread count or filtered rows. If stored separately, it can drift when updates forget to maintain it. Prefer selectors unless computation is expensive or the server provides an authoritative aggregate.

</details>

<details>
<summary>FE3.8 In DrawBoard, what is the difference between CRDT document state and presence?</summary>

The CRDT document is durable collaborative state that must converge correctly. Presence is ephemeral user status such as cursor/selection and can be lossy, expire quickly and be transported separately.

</details>

**Note:** [full note](frontend-system-design/FE3-State-Data-Model.md)

---

## FE4

### FE4 · Network Layer: the frontend's contract with unreliable systems

#### Cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Feed API | REST/BFF with cursor pagination | screen-shaped, cacheable, stable under inserts |
| Complex nested client with many surfaces | GraphQL | flexible queries + normalized cache if org supports it |
| Autocomplete | debounce + cache + abort stale requests | avoids races and excess calls |
| Infinite scroll | `useInfiniteQuery` style pages | dedup, page params, refetch model |
| Like/save mutation | optimistic + rollback + idempotency key | instant UX, safe retries |
| Payment/checkout | no blind retry without idempotency | duplicate charges/reservations are dangerous |
| Chat/DrawBoard | WebSocket with seq/dedup/reconnect | bidirectional realtime |
| Notification stream / LLM tokens | SSE | one-way server stream, simpler than WS |
| Large dashboard | BFF aggregation | client should not orchestrate many services |

#### Common interview traps

- Offset pagination for a constantly changing feed.
- Retrying non-idempotent mutations without idempotency keys.
- Ignoring AbortController and stale response races.
- Treating WebSocket messages as ordered/exactly-once forever.
- Global error toast for every partial failure.
- Overusing GraphQL/BFF without explaining operational trade-offs.

---

#### Questions

<details>
<summary>FE4.1 Why is cursor pagination better than offset pagination for feeds?</summary>

Feeds change while users scroll. Offset pagination can duplicate or skip items when inserts/deletes happen before the current page. Cursor pagination uses an opaque stable position, usually based on ranking/time/id, so the next page continues from the previous result set.

</details>

<details>
<summary>FE4.2 How do you prevent autocomplete race conditions?</summary>

Debounce input, cancel stale requests with AbortController, and/or use a sequence guard so only the latest request updates UI. Cache results by query and avoid refetching identical active queries.

</details>

<details>
<summary>FE4.3 Which failures should a frontend retry automatically?</summary>

Transient, retryable failures such as network errors, timeouts, 429 with retry-after and 503, with capped exponential backoff and jitter. Do not auto-retry validation errors, unauthorized requests, or non-idempotent mutations without idempotency keys.

</details>

<details>
<summary>FE4.4 When is a BFF better than direct frontend calls to many services?</summary>

When the screen needs aggregated, client-specific data from multiple backend services, or when auth/session/internal APIs should be hidden. The BFF reduces client orchestration and shapes payloads for web performance.

</details>

<details>
<summary>FE4.5 WebSocket reconnect: what state must the client remember?</summary>

Connection status, last acknowledged sequence/version, seen event IDs for dedup, queued safe outbound messages if any, and enough room/entity identity to fetch gaps after reconnect.

</details>

<details>
<summary>FE4.6 Why might SSE be better than WebSocket for an LLM streaming UI?</summary>

The stream is mostly server-to-client tokens/events. SSE is simpler over HTTP, supports automatic reconnection semantics, and avoids maintaining bidirectional socket infrastructure unless the product needs client-to-server realtime messages.

</details>

<details>
<summary>FE4.7 What is request dedup, and when is it unsafe?</summary>

Request dedup shares one in-flight request among identical callers, usually by query key. It is safe for idempotent reads. It is unsafe for mutations unless the operation has an idempotency key and duplicate semantics are explicitly defined.

</details>

<details>
<summary>FE4.8 How should the UI behave if page 4 of an infinite feed fails?</summary>

Keep pages 1–3 visible, show an inline retry at the bottom, avoid a full-page error, preserve scroll, and log the failure. If retry succeeds, append page 4 normally.

</details>

**Note:** [full note](frontend-system-design/FE4-Network-Layer.md)

---

## FE5

### FE5 · Performance: Core Web Vitals and the frontend trade-off toolbox

#### Cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Public product page slow hero | optimize LCP image + SSR/SSG/cache | main content and SEO matter |
| Feed scroll jank | virtualization + memoized rows + image sizing | reduces DOM/main-thread work |
| Data table 100k rows | server sort/filter + row/column virtualization | client cannot render/filter all cheaply |
| Heavy chart/editor route | route/component code split | avoid shipping unused JS |
| Image carousel | preload current/next, lazy-load rest, fixed aspect ratio | balances UX and bandwidth |
| Dashboard bad typing latency | reduce rerenders, debounce/defer heavy work | INP is interaction-bound |
| Layout jumps in feed | dimensions/aspect ratio/skeletons | CLS prevention |
| Static assets | long cache with content hashes | fast repeat visits, safe invalidation |

#### Common interview traps

- Optimizing average load time instead of LCP/INP/CLS and user journey.
- Lazy-loading the LCP image.
- Virtualizing without considering accessibility, focus and scroll anchoring.
- Shipping one giant app bundle to every route.
- Measuring only Lighthouse and ignoring real devices.
- Fixing performance by adding caches without invalidation strategy.

---

#### Questions

<details>
<summary>FE5.1 What are LCP, INP and CLS in plain language?</summary>

LCP measures when the main content appears. INP measures how quickly the page responds to user interactions across its lifecycle. CLS measures unexpected layout movement while the user is viewing the page.

</details>

<details>
<summary>FE5.2 Why can lazy loading hurt LCP?</summary>

If the LCP image is lazy-loaded, the browser deprioritizes it even though it is needed immediately. Above-the-fold hero/LCP assets should usually load eagerly and may need higher priority.

</details>

<details>
<summary>FE5.3 When should you virtualize a list?</summary>

When rendering many DOM nodes or complex rows causes memory, layout, paint or interaction jank. Feeds, logs, tables and chat histories are common. Consider trade-offs: dynamic heights, focus, find-in-page, accessibility and scroll anchoring.

</details>

<details>
<summary>FE5.4 What is a good cache header for hashed JavaScript assets?</summary>

`Cache-Control: public, max-age=31536000, immutable`, because the filename changes when content changes. Mutable HTML should not use that policy.

</details>

<details>
<summary>FE5.5 How do responsive images improve performance?</summary>

They let the browser download an appropriately sized asset for the viewport/DPR and choose modern formats or art-directed crops. This reduces bytes and can improve LCP while maintaining visual quality.

</details>

<details>
<summary>FE5.6 Lab vs RUM: when do you use each?</summary>

Lab tools are controlled and reproducible for debugging and CI budgets. RUM shows real users, devices, networks and long-tail issues. Use both: lab to diagnose, RUM to validate production impact.

</details>

<details>
<summary>FE5.7 A dashboard has poor INP when typing in a filter box. What do you inspect first?</summary>

Long tasks and rerenders triggered by each keystroke: expensive filtering, large table rerenders, global store updates, uncontrolled effects, heavy charts. Fix with server-side filtering, debouncing/deferred value, memoized selectors, virtualization or workers depending on scale.

</details>

<details>
<summary>FE5.8 Why should images have width/height or aspect ratio?</summary>

The browser can reserve the correct space before the image loads. This prevents layout shifts and improves CLS, especially in feeds and carousels.

</details>

**Note:** [full note](frontend-system-design/FE5-Performance.md)

---

## FE6

### ﻿# FE6 · Offline + Storage: making a web app useful when the network lies

#### Cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| News feed should load on subway | App shell precache + stale-while-revalidate feed + cached images | Good UX; staleness acceptable. |
| Email client draft offline | IndexedDB drafts + outbox + conflict prompt on version mismatch | User work must survive refresh. |
| Chat send offline | IndexedDB outbox, idempotency key, optimistic bubble, retry/backoff | Send is append-only but needs dedupe. |
| Payment checkout | No offline submit; preserve form locally, submit online only | Avoid duplicate/invalid financial operations. |
| DrawBoard canvas | Yjs document persisted with IndexedDB + WebSocket sync | Offline concurrent edits are expected. |
| Recording playback thumbnails | Cache Storage for thumbnails; IndexedDB for metadata | HTTP responses vs queryable metadata. |
| Large local media processing | OPFS + worker | File-like access avoids loading whole blobs in memory. |

#### Common interview traps

- Treating `localStorage` as a database. It is sync string storage, not a durable queue.
- Saying "service worker caches everything" without versioning, invalidation or auth boundaries.
- Caching personalized responses under a key that can leak across users after logout.
- Forgetting POST retry idempotency. Timeout does not mean failure.
- Ignoring multiple tabs replaying the same queue.
- Using last-write-wins for collaborative editing or money.

---

#### Questions

<details>
<summary>FE6.1 Why is IndexedDB usually better than localStorage for an offline queue?</summary>

IndexedDB is async, transactional and can store structured records with indexes. `localStorage` is synchronous string key-value storage, blocks the main thread, has no transactions and is easy to corrupt from multiple tabs.

</details>

<details>
<summary>FE6.2 Which resources would you cache-first in a React app?</summary>

Versioned immutable assets such as hashed JS/CSS chunks, fonts and some thumbnails/images with eviction. Do not cache-first mutable API data unless there is an explicit expiry/revalidation plan.

</details>

<details>
<summary>FE6.3 A user sends a chat message offline, refreshes, then reconnects. What must be persisted?</summary>

The pending operation in IndexedDB: payload, idempotency key, creation time/order, status/attempt metadata and any temp client id used by the optimistic UI. On ack, replace the temp id with the server id.

</details>

<details>
<summary>FE6.4 Why is Background Sync not enough by itself?</summary>

Browser support and scheduling are not guaranteed. The app should also flush on startup, on network recovery and while the page is open. Background Sync is an optimization around a durable outbox, not the outbox itself.

</details>

<details>
<summary>FE6.5 Cache Storage vs IndexedDB: where would you store cached chat messages?</summary>

IndexedDB, because you need to query and merge messages by room, timestamp, cursor and server id. Cache Storage is better for HTTP response caching such as `/assets/app.js` or image requests.

</details>

<details>
<summary>FE6.6 How do you avoid double-sending offline operations from two tabs?</summary>

Use server-side idempotency keys as the correctness guarantee, plus client coordination such as IndexedDB leases, `BroadcastChannel`, or `navigator.locks` to reduce duplicate work.

</details>

<details>
<summary>FE6.7 When would you choose CRDTs over version conflict prompts?</summary>

When concurrent edits are normal and should merge automatically, such as text/canvas collaboration. For rare conflicts in CRUD forms, version checks plus a merge UI are simpler.

</details>

<details>
<summary>FE6.8 What should happen after logout in an offline-capable app?</summary>

Clear or partition user-specific caches, IndexedDB stores and pending queues; unregister or reset service-worker state if needed; keep only safe public assets. Never let the next user see cached private data.

</details>

**Note:** [full note](frontend-system-design/FE6-Offline-Storage.md)

---

## FE7

### ﻿# FE7 · Accessibility + i18n: designing UI that works for everyone, everywhere

#### Cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Autocomplete | Input focus + `role="combobox"` + `aria-activedescendant` + listbox options | Matches APG model and preserves typing focus. |
| Modal | `role="dialog"`, labelled title, focus trap, inert background, return focus | Modal means outside content is temporarily unavailable. |
| Tabs | `tablist` / `tab` / `tabpanel`, arrow key navigation | Distinct panels in one context. |
| Carousel | No auto-rotation by default; pause controls; reduced motion | Prevents disorientation and noisy announcements. |
| Dynamic chat | Polite live-region summaries + unread count | Announces new info without stealing focus. |
| Global app | Locale messages by namespace, `Intl`, logical CSS, RTL tests | Avoids English/layout assumptions. |
| Data table | Semantic table for real tabular data; grid only if spreadsheet-like interactive navigation is required | ARIA grid has a heavy keyboard contract. |

#### Common interview traps

- Adding ARIA roles to native elements unnecessarily and making semantics worse.
- Saying "screen-reader accessible" without a keyboard focus story.
- Building a modal that visually overlays but leaves background focusable.
- Autocomplete that moves DOM focus into options, breaking typing.
- Auto-playing carousel that ignores pause/reduced-motion.
- Concatenating translated strings or hard-coding left/right CSS.
- Relying only on automated accessibility scores.

---

#### Questions

<details>
<summary>FE7.1 Why is semantic HTML preferable to ARIA for basic controls?</summary>

Native elements already provide roles, names, keyboard behavior, focusability and browser/assistive-tech support. ARIA only changes semantics; it does not add behavior. A clickable div with `role="button"` still needs keyboard and disabled behavior implemented manually.

</details>

<details>
<summary>FE7.2 In an autocomplete, why use `aria-activedescendant`?</summary>

It lets DOM focus remain on the text input while assistive tech is told which option is currently active. That preserves typing and selection behavior without moving focus into the listbox for every arrow key press.

</details>

<details>
<summary>FE7.3 What are the minimum focus rules for a modal dialog?</summary>

Move focus into the dialog on open, trap Tab/Shift+Tab within it, make background content unreachable/inert, close with Escape if allowed, and return focus to the trigger when closed.

</details>

<details>
<summary>FE7.4 When should a live region be `assertive`?</summary>

Only for urgent information that should interrupt current screen-reader output, such as a critical error. Most status updates should be `polite`, and rapidly changing content should be summarized.

</details>

<details>
<summary>FE7.5 What does `prefers-reduced-motion` change in a carousel?</summary>

Avoid or greatly reduce animation and auto-rotation. State can still change, but movement should not be required for understanding and should not disorient the user.

</details>

<details>
<summary>FE7.6 Give three i18n bugs that are not "wrong translation".</summary>

Text expansion breaking layout, hard-coded left/right in RTL, incorrect date/number/time-zone formatting, pluralization bugs, concatenated strings with wrong word order, missing locale bundle fallback.

</details>

<details>
<summary>FE7.7 Why should a data table not always be an ARIA grid?</summary>

A semantic `<table>` is best for read-mostly tabular data. `role="grid"` implies spreadsheet-like interaction and a much heavier keyboard contract. Use it only when cells are actively navigable/editable.

</details>

<details>
<summary>FE7.8 What would you test manually before shipping an accessible modal/autocomplete component?</summary>

Keyboard-only open/use/close flow, visible focus, focus return, screen-reader names/roles/states, Escape/Tab behavior, no background focus leak, and behavior in at least one RTL or pseudo-localized layout if text is involved.

</details>

**Note:** [full note](frontend-system-design/FE7-Accessibility-i18n.md)

---

## FE8

### ﻿# FE8 · Frontend Security: browser defenses, sharp edges and interview trade-offs

#### Cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Render user chat text | React text interpolation | Escapes HTML by default. |
| Render user markdown/rich text | Safe document model or allowlist sanitizer + CSP | Markdown can produce HTML/links; treat as untrusted. |
| Auth for normal web app | HttpOnly Secure SameSite cookie, CSRF defense, rotation | Minimizes JS-readable tokens; handles sessions cleanly. |
| SPA needing bearer API calls | Memory access token + refresh cookie | Limits persistent token theft while supporting Authorization header. |
| Prevent clickjacking | CSP `frame-ancestors` allowlist | Modern framing control; use XFO for legacy if needed. |
| Cross-origin API | Explicit CORS allowlist + server auth | CORS controls browser reads, not authorization. |
| Embed third-party content | Sandboxed iframe, narrow permissions, verified messages | Isolation boundary. |
| CDN script | Bundle if possible; else SRI + CSP + vendor review | Third-party JS is high privilege. |

#### Common interview traps

- Saying "React prevents XSS" without mentioning `dangerouslySetInnerHTML`, URL schemes, markdown and direct DOM APIs.
- Using CSP as the only XSS defense.
- Storing long-lived tokens in `localStorage` without acknowledging XSS theft.
- Confusing CORS with CSRF.
- Reflecting arbitrary origins with credentials enabled.
- Accepting any `postMessage` or using `'*'` for sensitive messages.
- Forgetting that frontend environment variables are public.

---

#### Questions

<details>
<summary>FE8.1 Why does React's default escaping not eliminate XSS?</summary>

It only protects normal text interpolation. XSS can still enter through `dangerouslySetInnerHTML`, unsafe markdown/HTML renderers, dangerous URL schemes, direct DOM APIs, third-party scripts or library bugs.

</details>

<details>
<summary>FE8.2 What is the difference between reflected, stored and DOM-based XSS?</summary>

Reflected comes from the current request and is immediately reflected; stored is persisted server-side and shown later to users; DOM-based is caused by client JavaScript moving attacker-controlled data from a source like URL/hash/storage into a dangerous sink.

</details>

<details>
<summary>FE8.3 What do CSP nonces and `strict-dynamic` do?</summary>

A nonce allows only inline scripts with the server-generated per-response nonce. `strict-dynamic` lets trust flow from a nonce-bearing script to scripts it loads, avoiding brittle host allowlists. CSP still complements, not replaces, sanitization.

</details>

<details>
<summary>FE8.4 Why are HttpOnly cookies safer than localStorage for session tokens?</summary>

JavaScript cannot read HttpOnly cookies, so XSS cannot directly exfiltrate the token. Cookies are ambient credentials, so SameSite and CSRF defenses are still required. LocalStorage tokens are directly readable by any injected JS.

</details>

<details>
<summary>FE8.5 Why is CORS not a CSRF defense?</summary>

CORS mainly controls whether browser JavaScript can read a cross-origin response. CSRF is about causing the browser to send a state-changing request with cookies. Many CSRF requests do not need to read the response.

</details>

<details>
<summary>FE8.6 How do you safely receive `postMessage` events?</summary>

Check `event.origin` against an expected origin, validate the message schema/type, ignore unknown commands, and never treat message data as trusted HTML or executable instructions. Send sensitive messages with a specific `targetOrigin`, not `'*'`.

</details>

<details>
<summary>FE8.7 When might `frame-ancestors 'none'` be the wrong answer?</summary>

When the product intentionally supports trusted embedding, such as an enterprise portal or LMS embedding a recording. Then use a strict allowlist and preferably a separate reduced-privilege embed surface.

</details>

<details>
<summary>FE8.8 What is SRI useful for, and what does it not solve?</summary>

SRI verifies that a CDN resource matches an expected hash, preventing unexpected bytes from executing. It does not make the library itself safe, handle dynamic third-party scripts well, or replace dependency review and CSP.

</details>

**Note:** [full note](frontend-system-design/FE8-Frontend-Security.md)

---

## FE9

### ﻿# FE9 · Media on the Web: streaming, buffering and real-time trade-offs

#### Cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Short marketing clip | Progressive MP4 with range support | Simple, low operational complexity. |
| Netflix/YouTube playback | HLS/DASH adaptive streaming + CDN + MSE player | Scales and adapts quality per user/network. |
| iOS Safari HLS | Native HLS where available | Better platform support and battery behavior. |
| Browser DASH/HLS custom player | MSE via player library | JS controls manifest, ABR, buffering. |
| Two-way meeting | WebRTC + SFU | Sub-second latency and interactivity. |
| Massive one-way live event | Low-latency HLS/DASH + CDN | Scale beats sub-second latency. |
| Premium protected content | HLS/DASH + DRM/EME + license server | Content policy and device compatibility. |
| Recording search/jump | Captions/transcript + thumbnail sprites | Better navigation and accessibility. |

#### Common interview traps

- Saying "use WebRTC for Netflix". CDN-backed HTTP streaming is the scalable playback choice.
- Saying "use HLS for Zoom" without addressing seconds of latency.
- Ignoring captions and accessibility in a media UI.
- Building custom controls without keyboard/screen-reader behavior.
- Starting at 1080p before bandwidth is known, causing slow startup/rebuffer.
- Treating DRM as impossible-to-break security instead of distribution control.
- Forgetting media analytics; without QoE metrics you cannot tune ABR or CDN choices.

---

#### Questions

<details>
<summary>FE9.1 Progressive download vs adaptive streaming: what is the core difference?</summary>

Progressive download fetches one media file, usually with range requests. Adaptive streaming uses manifests plus many small segments at multiple bitrates; the player chooses segment quality over time based on bandwidth, buffer and device.

</details>

<details>
<summary>FE9.2 What does MSE let a JavaScript player do?</summary>

MSE lets JavaScript append fetched media segments into `SourceBuffer`s connected to a `MediaSource`, which feeds an HTML media element. This enables custom HLS/DASH playback, ABR, buffering and recovery logic.

</details>

<details>
<summary>FE9.3 What should an ABR algorithm optimize first: quality or avoiding stalls?</summary>

Avoiding stalls. Users generally prefer temporary lower quality over rebuffering. A good player starts conservatively, watches throughput/buffer health and steps quality up when safe.

</details>

<details>
<summary>FE9.4 Why are HLS/DASH easier to scale than WebRTC for playback?</summary>

They use normal HTTP segments that CDNs can cache and serve to many viewers. WebRTC is real-time peer/SFU traffic and is not naturally CDN-cacheable.

</details>

<details>
<summary>FE9.5 When is WebRTC the right answer?</summary>

For two-way or highly interactive real-time media: meetings, calls, screen sharing, active collaboration. Latency and bidirectional adaptation matter more than CDN cacheability.

</details>

<details>
<summary>FE9.6 What are captions, and why are they part of system design?</summary>

Captions are synchronized text tracks including speech and important non-speech audio. They affect accessibility, search, transcript navigation, storage/processing pipelines and player UI, so they are not an afterthought.

</details>

<details>
<summary>FE9.7 What does DRM/EME do and not do?</summary>

EME lets the browser play encrypted media through a CDM after license acquisition. It helps enforce distribution policy for premium content, but it does not make screen capture impossible and adds compatibility/operational complexity.

</details>

<details>
<summary>FE9.8 What media metrics would you instrument in the frontend?</summary>

Startup time/time to first frame, startup failure, rebuffer count/duration, bitrate/resolution over time, dropped frames, quality switches, segment/manifest/license errors and CDN used.

</details>

**Note:** [full note](frontend-system-design/FE9-Media.md)

---

## FE10

### FE10 · Component and design-system API design: modal, select, toast, library

#### Cheat sheet

| Situation | Choice | Why |
|---|---|---|
| Simple widget, few use cases | Props + `children` | Least ceremony |
| Parts share state, consumer reorders or wraps | Compound components + context | Flexible, no prop drilling |
| Per-item look, library owns state | Render prop (`renderOption`) | Markup stays with the consumer |
| Many teams, many brands | Headless core + styled layer | One behavior, many skins |
| Swap element or reuse your own Button | `asChild` (or typed `as`) | Keeps behavior and a11y, changes markup |
| Coordinate with other UI | Controlled (`value` + `onChange`) | Parent owns truth |
| Easy default use | Uncontrolled (`defaultValue`) | Zero config |
| Re-skin, dark mode | Tokens + CSS variables | No re-render, SSR friendly |
| One-off style fix | `className` merged | No new prop |
| Toast from anywhere | Global store + one Toaster + live region | Decouples caller from UI |
| Choose a value from few fixed options | Native `<select>` first | Free a11y and mobile UX |

#### Common interview traps

- Starting with internals and never showing a usage snippet.
- Prop explosion instead of composition.
- Only controlled or only uncontrolled, and no mention of `useControllableState`.
- Copying a prop into state and syncing with an effect (two sources of truth).
- `cloneElement`/`Children.map` composition that breaks when a child is wrapped.
- A `div` with `onClick` as a trigger; ARIA added without keyboard behavior.
- Setting `aria-modal` without actually blocking the background.
- Trapping focus but not restoring it on close.
- A toast that holds a required action, or that is not in a live region.
- Forgetting portals, z-index and stacking contexts for overlays.
- Ignoring SSR (`window` at module scope, random ids).
- Treating a public prop rename as a patch release.
- Building a custom select when a native `<select>` meets the requirements.

---

#### Questions

<details>
<summary>FE10.1 What do interviewers grade in a component question that they do not in an application question?</summary>

The public API surface, state ownership (controlled vs uncontrolled), extensibility without forking, accessibility baked into the component, and library concerns such as re-renders, bundle size and SSR safety. The server, data model and scale parts are mostly absent.

</details>

<details>
<summary>FE10.2 Explain controlled vs uncontrolled, and how a component supports both.</summary>

Uncontrolled: the component owns the state internally (`defaultValue`); easy to use but the parent cannot coordinate it. Controlled: the parent passes `value` and handles `onChange`; flexible but more boilerplate. A library supports both with a `useControllableState` hook: if `value` is defined use it, otherwise use internal state, and call `onChange` in both modes. Decide at mount and warn on switching.

</details>

<details>
<summary>FE10.3 Why prefer context-based compound components over `React.Children.map` + `cloneElement`?</summary>

With `cloneElement`, only direct children receive the injected props, so wrapping a part in a `div` breaks it, and the shallow prop merge can cause name collisions. Context reaches any depth and lets consumers wrap, reorder and conditionally render parts. Memoize the context value and split contexts if re-renders become a problem.

</details>

<details>
<summary>FE10.4 What does `asChild` do, and what must the child component do for it to work?</summary>

The part renders no DOM element of its own; it clones its child and passes it the props and behavior (handlers, aria attributes). The child must spread all props onto its DOM node and forward the ref. If you change the element type you are responsible for keeping it accessible (for example, a tooltip trigger must stay focusable). In React 19, `ref` is a normal prop, so function components no longer need `forwardRef`; React 18 peers still do.

</details>

<details>
<summary>FE10.5 How do you avoid prop explosion while still supporting customization?</summary>

Few enumerated variant props (`variant`, `size`), design tokens and CSS variables for look, `data-*` state attributes for styling hooks, composition (children, slots, compound parts) for structure, extending native element props, and a merged `className` escape hatch. Add a prop only when behavior changes, not for appearance.

</details>

<details>
<summary>FE10.6 Modal: list the accessibility behavior the component must own.</summary>

Role `dialog` with `aria-modal="true"` and a label (`aria-labelledby` pointing to a visible title or `aria-label`); focus moves inside on open (least destructive action for irreversible dialogs); Tab and Shift+Tab stay inside; Escape closes; a visible close control; focus returns to the invoking element on close unless it no longer exists. Only set `aria-modal` if the background is truly blocked and obscured. Details in FE7.

</details>

<details>
<summary>FE10.7 Design the data flow of a Select/combobox: where do `value`, `open` and the highlighted option live, and how is the highlight exposed to a screen reader?</summary>

`value` and `open` are controllable state (value/defaultValue/onValueChange, open/defaultOpen/onOpenChange). The highlighted index is internal (optionally controllable) state. DOM focus stays on the combobox element and the highlighted option is exposed through `aria-activedescendant`, with `aria-expanded` and `aria-controls` pointing to the listbox. Editable variants add `inputValue` and `aria-autocomplete`. Virtualize long lists and abort stale async requests.

</details>

<details>
<summary>FE10.8 Design a toast system: what are the parts, and what are the accessibility rules?</summary>

A global store with a queue (cap visible toasts, dedupe), one `Toaster` at the root rendering into a fixed portal viewport, timers that pause on hover, focus and window blur, and an imperative `toast.show()` API. Accessibility: an `aria-live` region, distinguish urgent (announced immediately, user-triggered) from background messages, keyboard route to the viewport (hotkey, made discoverable), labelled close button, and any action must be safe to ignore because of the time limit. If a response is required, use an alert dialog instead.

</details>

**Note:** [full note](frontend-system-design/FE10-Component-API-Design-System.md)

---

## FE11

### FE11 · Observability and Resilience: how do you know it works, and what happens when parts fail?

#### Cheat sheet

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

#### Common interview traps

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

#### Questions

<details>
<summary>FE11.1 Which errors does a React error boundary NOT catch, and what covers them?</summary>

Event handlers, asynchronous code like `setTimeout`/`requestAnimationFrame` callbacks (except inside `startTransition`), server-side rendering, and errors in the boundary itself. Cover them with `window.addEventListener('error')`, `unhandledrejection`, try/catch with explicit reporting in handlers, and a root-level boundary as last resort.

</details>

<details>
<summary>FE11.2 How do you make minified production stacks readable without exposing your source?</summary>

Generate source maps in the production build, upload them to the error tracker from CI (Debug IDs or release tag link each map to the exact build), and do not deploy the `.map` files to the public CDN. Upload must happen before errors arrive. Hosting maps publicly works but exposes original source.

</details>

<details>
<summary>FE11.3 Why send RUM on `visibilitychange` with `sendBeacon` instead of `unload`?</summary>

`unload`/`beforeunload` are unreliable (especially on mobile, where the app can be killed without events) and block bfcache eligibility. `visibilitychange` to `hidden` is the last reliable moment. `sendBeacon` queues an async POST (about 64 KiB) that the browser delivers without delaying navigation; use `fetch` with `keepalive` if you need headers or other methods.

</details>

<details>
<summary>FE11.4 Why p75 and not the average for Web Vitals, and how do you avoid a green dashboard hiding a bad segment?</summary>

Averages do not represent any user's session and outliers skew them. Report percentiles (p75 is the pass bar, check p90/p95), keep per-instance IDs to build distributions, and segment by route, device class, connection and release so low-end mobile on checkout cannot hide behind a healthy global number.

</details>

<details>
<summary>FE11.5 How do you correlate a frontend error with a backend trace?</summary>

Generate a W3C `traceparent` (`00-<32 hex trace-id>-<16 hex parent-id>-<flags>`) on API calls, have services propagate the trace ID, and attach the trace ID (and request ID) of the failing call to the error event. Remember CORS preflight for the custom header on cross-origin APIs and keep IDs free of user data.

</details>

<details>
<summary>FE11.6 A third-party recommendations API starts timing out. What does the client do?</summary>

Per-call timeout, limited retries with backoff and jitter, a circuit breaker that opens after repeated failures and serves a fallback (hide the rail) during cooldown, an error boundary with `fallback={null}` around the widget, a `warn` log with the dependency name, and a kill switch flag to disable the feature remotely.

</details>

<details>
<summary>FE11.7 A deploy goes out and `ChunkLoadError` spikes. Why, and what do you do?</summary>

Users with the old HTML request hashed chunks that were deleted (or new HTML requests chunks not yet on the CDN). Keep old assets for a retention window, make rollback one action, catch dynamic import failures at the route boundary and offer a single guarded reload, and gate canaries on release-health so the spike pauses the rollout.

</details>

<details>
<summary>FE11.8 Name four frontend SLIs and how you would alert on a regression after deploy.</summary>

Error-free sessions %, crash-free critical-route views, LCP and INP p75 per route/device, and critical-flow completion (checkout funnel). Compare the new release against the previous one over the same window, alert on new or regressed issue fingerprints and on budget burn rate with a minimum sample size, and wire the alert to pause or roll back the canary.

</details>

**Note:** [full note](frontend-system-design/FE11-Observability-Resilience.md)

---

## FE12

### FE12 · Canvas and graphics rendering: how an editor draws 10,000 things at 60fps

#### Cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Flowchart, < ~1k nodes, needs accessibility/CSS | SVG | DOM per shape, native export |
| Whiteboard, thousands of shapes, freehand | Canvas 2D via Konva | retained model + layers + hit canvas, cheap redraw |
| Map / Figma scale / heavy filters | WebGL/WebGPU | GPU batching; accept shader and text complexity |
| Spreadsheet grid | Canvas, draw only visible cells; DOM overlay for the editing cell | cull by scroll window; text edit needs a real input |
| Zoom feels wrong | `zoomAt` fixing the world point under cursor | scale about origin drifts |
| Blurry on retina | backing store x dpr, `setTransform(dpr...)` | CSS px vs physical px |
| Janky drag | move node to a drag layer, mutate directly, `batchDraw` | avoid redrawing the whole scene per move |
| 10k+ shapes hit-testing | R-tree (rbush) candidates + precise test | O(log n) vs O(n) |
| Fast strokes look jagged | `getCoalescedEvents` + smoothing + capture | browser coalesces moves |
| Undo in collaborative board | per-user `Y.UndoManager`, one gesture = one transaction | never undo others' work |
| Exporting | content-bounds render to offscreen canvas; SVG needs separate renderer | canvas keeps no vectors |

#### Common interview traps

- Choosing SVG/DOM for a whiteboard without quoting an element-count reason (or choosing WebGL "because Figma").
- Calling `setState` on every pointermove and re-rendering the React tree.
- Storing screen coordinates in the document, or making viewport/selection part of collaborative state.
- Zooming about the origin; ignoring `devicePixelRatio` changes and `ResizeObserver`.
- An always-on rAF loop that burns CPU while idle.
- Linear hit-testing with no tolerance margin and no z-order.
- Writing every stroke point into the CRDT instead of using awareness + one write on pointer-up.
- Many full-size layers (each costs a scene canvas and a hit canvas; mobile Safari can blank the canvas).
- Forgetting `pointercancel`, pointer capture, and `touch-action: none`.
- Saying "canvas isn't accessible" and stopping there, with no DOM fallback plan.

---

#### Questions

<details>
<summary>FE12.1 When would you choose SVG over Canvas for an editor, and when does that stop working?</summary>

SVG when the scene is small (diagrams, around a thousand nodes or fewer) and you want per-shape DOM events, CSS, accessibility and trivial vector export. It degrades as node count and update frequency grow, because every shape is a DOM node the browser must style, lay out and hit-test. Canvas draws pixels into one bitmap, so cost scales with what you draw per frame, not with how many nodes exist.

</details>

<details>
<summary>FE12.2 What are the three kinds of state in a collaborative canvas, and where does each live in DrawBoard?</summary>

Document state (shapes, props, z-order) lives in the Yjs `Y.Doc` and must converge. View state (viewport, selection, active tool) is local, in Zustand, never synced. Ephemeral state (in-progress stroke, remote cursors, marquee) lives in refs and Yjs awareness: lossy and never saved. The canvas pixels are a cache of these, not a source of truth.

</details>

<details>
<summary>FE12.3 Write the zoom-around-cursor logic in words.</summary>

Compute the world point under the cursor with the current viewport (`(cursor - offset) / scale`). Apply the new clamped scale. Set the new offset so that same world point maps back to the cursor: `offset = cursor - world * newScale`. Anything else makes content slide away from the pointer.

</details>

<details>
<summary>FE12.4 How do you make the canvas sharp on a HiDPI screen, and what can break it later?</summary>

Set `canvas.width/height` to CSS size times `devicePixelRatio`, set CSS width/height to the CSS size, and set the context transform to the ratio. It breaks when the ratio changes (browser zoom, moving to another monitor; watch with `matchMedia` on resolution) or when the container resizes (use `ResizeObserver`; setting `width` clears the canvas, so redraw immediately).

</details>

<details>
<summary>FE12.5 A user drags one shape among 5,000 and the board stutters. What do you change?</summary>

Stop re-rendering through React on each pointermove; mutate the node/draft imperatively and schedule one redraw per frame. Move the dragged shape to a dedicated active layer so the static scene layer is not redrawn per move, cache expensive static shapes, set `listening(false)` on layers that do not need events, cull off-screen shapes using a spatial index, and commit to the `Y.Doc` once at drag end (or throttled).

</details>

<details>
<summary>FE12.6 Explain the hit-testing options and what you would use for DrawBoard.</summary>

Linear bbox scan is O(n); a spatial index like rbush returns candidates in a tiny box in logarithmic-ish time and also serves culling and marquee; a colour-picking hit canvas (Konva's built-in approach) gives pixel-accurate hits for arbitrary shapes at the cost of an extra canvas per layer. Konva handles shape-level hits out of the box, but DrawBoard builds its own selection and handle logic: rbush for candidates, precise geometry for the final hit, topmost z wins, tolerance in world units (divided by zoom) per D9.

</details>

<details>
<summary>FE12.7 Why does one gesture equal one undo step in DrawBoard, and how do you guarantee it?</summary>

Users expect undo to revert a whole stroke, drag or resize, not a fragment. A stroke is written once on pointer-up. For drags/resizes that write continuously, wrap writes in one transaction origin and call `UndoManager.stopCapturing()` on pointer-up so the next change starts a new step. `Y.UndoManager` tracks only the local origin's changes, so undo never reverts a collaborator's work and creates a new reversing change that syncs normally.

</details>

<details>
<summary>FE12.8 Why are draft strokes sent through awareness instead of the document?</summary>

A draft is not a finished shape and nobody else should edit it. Writing every point into the `Y.Doc` would create hundreds of durable CRDT updates, bloating history, saves and sync traffic. Awareness is ephemeral and lossy, shows a live preview, disappears if the author disconnects, and the finished simplified stroke is written once on pointer-up.

</details>

**Note:** [full note](frontend-system-design/FE12-Canvas-Graphics-Rendering.md)

---

## FE13

### FE13 · Frontend Architecture at Scale: boundaries, deploys, flags and tests for many teams

#### Cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| 1 team, 1 product | single app, feature folders | split costs more than it saves |
| 5-30 devs, slow CI | monorepo + affected-only + remote cache | fixes build pain without new deployables |
| Teams blocked on shared release | independent deployables (runtime composition) | decouple release trains |
| Migrate off legacy app | strangler via shell + MFE or iframe | incremental, no big-bang rewrite |
| Shared React across remotes | Module Federation `singleton` + `requiredVersion` | one copy, explicit version contract |
| Stale tab after deploy | retain old assets + `preloadError` handler + version banner | avoids chunk 404 white screens |
| Risky new feature | release flag + tenant rollout + kill switch | decouple deploy from release |
| Experiment | deterministic bucketing + exposure event + guardrails | trustworthy metrics |
| Test strategy | static + integration (RTL + MSW) heavy, few e2e | best confidence per minute |
| Enforce boundaries | lint rules + CODEOWNERS in CI | docs alone do not hold |

#### Common interview traps

- Jumping to micro-frontends without naming the organizational problem.
- Build-time npm packages per MFE and calling it "independent" (it is lockstep).
- Sharing a global store across micro-frontends.
- Caching HTML with a long TTL, or deleting old assets at deploy time.
- Treating flags as security; leaving flags in forever.
- Client-side flag changes that cause SSR hydration mismatch or UI flicker.
- Assigning experiment users without logging exposure.
- An e2e-heavy pyramid that is slow and flaky, with no static or integration layer.
- Shared design-system components that contain domain logic (`ProductTable`).
- Ignoring that frontend and backend deploys are not atomic.

---

#### Questions

<details>
<summary>FE13.1 What actually justifies splitting a frontend into independently deployable apps?</summary>

A real organizational or release bottleneck: teams blocked by each other's release trains, different cadences or compliance needs, an incremental migration off legacy, or org boundaries. Slow CI alone is better solved by a monorepo with task caching, and code quality by lint boundaries. Otherwise stay a modular monolith.

</details>

<details>
<summary>FE13.2 How do you keep module boundaries from rotting inside a monolith?</summary>

Feature folders with a single public `index.ts`, lint rules that forbid deep imports and `shared` importing `features`, CODEOWNERS for review, and CI failing on violations. Documented rules without enforcement erode.

</details>

<details>
<summary>FE13.3 Why does Fowler recommend against build-time integration of micro-frontends?</summary>

Publishing each MFE as an npm package consumed by the container creates a lockstep release process: to ship any change you must rebuild and redeploy everything. That recreates the coupling micro-frontends were meant to remove. Integrate at runtime (JS mount contract, web components, iframes, federation, or server composition).

</details>

<details>
<summary>FE13.4 In Module Federation, how are shared dependencies resolved, and what can go wrong?</summary>

Builds provide and consume modules through a share scope; a consumer receives the highest version that satisfies its `requiredVersion`, and an already-loaded version is never replaced. `singleton` forces one copy. Problems: version skew between remotes, eager-consumption errors (fix with an async bootstrap boundary), colliding `uniqueName`s, and shared-version coupling that brings back lockstep upgrades.

</details>

<details>
<summary>FE13.5 Which cache headers do you use for hashed assets versus HTML, and why?</summary>

Hashed assets: `Cache-Control: public, max-age=31536000, immutable`, because the filename changes when content changes. HTML: `no-cache` (revalidate every time), because its URL is not versioned and it points at the current hashed assets. `no-store` would disable caching entirely, which is stronger than needed.

</details>

<details>
<summary>FE13.6 A user keeps a tab open across a deploy and clicks a lazy route; it fails. What do you do?</summary>

It is version skew: old JS requests a chunk that was deleted. Retain previous assets for a window, listen for `vite:preloadError` (or the bundler's equivalent), call `preventDefault`, and prompt the user to reload (auto-reload only if no unsaved work, with a loop guard). Ensure HTML is `no-cache`. Optionally poll a version file for a banner. Keep APIs backward compatible.

</details>

<details>
<summary>FE13.7 Name the four flag types and how long each should live.</summary>

Release (short, delete at 100%), ops/kill-switch (long-lived), experiment (until the decision), permission/entitlement (long-lived, enforced server-side). Mixing them causes confusion and leftover debt, so tag type, owner and expiry.

</details>

<details>
<summary>FE13.8 What do you test at each layer of the testing trophy, and what CI gates do you add?</summary>

Static: types, lint, boundaries. Unit: pure logic. Integration (Testing Library + MSW): features as users use them, with the network mocked. E2E: a few critical journeys against a preview deploy. Visual regression for design-system components. Gates: typecheck, lint, tests, bundle-size budget, Lighthouse/Web Vitals trend, axe checks, and contract validation between frontend and API.

</details>

**Note:** [full note](frontend-system-design/FE13-Frontend-Architecture-at-Scale.md)

---

## Self-grading rubric (score each 0 / 1 / 2, total /16; redo anything below 12 within 2 weeks)

| # | Axis | 0 | 1 | 2 |
|---|---|---|---|---|
| 1 | Requirements | Jumped straight to components | Listed some | Functional + non-functional, devices, out-of-scope |
| 2 | Interface / component API | Missing | Present but vague | Props, events, API shape with pagination and errors |
| 3 | Architecture | Didn't cover the requirements | Works, with gaps | Covers every requirement, data flow clear |
| 4 | Data model + state | "Global state" | Entities named | Server / client / URL / form state split, cache and invalidation |
| 5 | Deep dives | None | One, shallow | 2+ hard parts handled well (perf, a11y, offline, realtime) |
| 6 | Metrics | None | Named a metric | Chose LCP / INP / CLS or product metric and tied it to a decision |
| 7 | Trade-offs + failures | None | Named a few | Why and what it costs; failure and degraded states covered; monitoring named |
| 8 | Communication + time | Ran over, or silent | Mostly on time | Followed the time split, checked in, clear wrap-up |
