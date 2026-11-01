# FE1 · RADIO Framework: steering a frontend system design round

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** every FE system design question: News feed (FE Tier 1 / HLD #4), Chat app (FE Tier 1 / HLD #3), Collaborative editor / DrawBoard (FE Tier 1 / HLD #12), Autocomplete (FE Tier 1 / HLD #14), E-commerce (FE Tier 1 / HLD #18), Netflix / YouTube (FE Tier 2 / HLD #6)

---

## Why this topic matters

A frontend system design interview is not a React trivia round. It is a product-facing architecture round: can you turn a vague UI problem into requirements, modules, data shapes, APIs and deep dives while defending trade-offs under time pressure?

RADIO is the frontend version of the classic HLD framework:

| Letter | Output the interviewer should see | Failure mode it prevents |
|---|---|---|
| **R**equirements | scoped functional + non-functional goals | building the wrong app |
| **A**rchitecture | client modules, rendering path, data flow | jumping into components too early |
| **D**ata model | normalized entities, UI state, derived views | impossible cache updates later |
| **I**nterface definition | server APIs, realtime contracts, component APIs | hand-wavy integration |
| **O**ptimizations | performance, reliability, a11y, offline, security | shallow answer with no senior trade-offs |

For a working React/TypeScript engineer, the bar is not "what is SSR?" It is: **which rendering, state, network and performance choices fit this product, and what do you say when the interviewer changes scale?**

**Interview line:** "I'll use RADIO so we don't over-index on React components before agreeing on the product constraints. I'll time-box requirements, propose an architecture, lock the data model and API contracts, then deep-dive on performance and failure modes."

---

## Part 1: the time split and what to say in each RADIO step

In a 45-minute frontend system design round, spend roughly:

| Step | Time | What to produce |
|---|---:|---|
| Requirements | 5–7 min | use cases, scope, devices, scale, success metrics |
| Architecture | 10–12 min | module diagram + rendering/data flow |
| Data model | 6–8 min | entities, caches, local/UI state, URL state |
| Interface definition | 7–8 min | API contracts, events, component props if relevant |
| Optimizations / deep dives | 10–12 min | performance, reliability, accessibility, security, observability |

Do not treat this as a strict waterfall. The value is that you keep returning to the contract: if the data model says posts are normalized by ID, the API and React cache need to support that.

### R: Requirements

Ask questions that change the design, not questions that merely sound professional.

Strong questions:
- "Is this an **application** design or a **component API** design?" A news feed and a modal are graded differently.
- "Which surfaces matter: desktop web, mobile web, embedded webview?" This changes bundles, gestures, responsive images and a11y.
- "What is the first-class success metric: fast first load, low interaction latency, SEO, correctness, offline?"
- "What scale should I assume: feed with thousands of items, chat with realtime ordering, table with 100k rows?"
- "Can stale data be shown, and for how long?"
- "Which states must be designed: loading, empty, error, partial failure, permissions?"

Scope aggressively. If designing a feed, say whether you include post creation, comments, ads, ranking controls, stories, notifications and moderation. If designing a data table, say whether you include server-side filtering, column pinning, editing and exports.

**Interview line:** "For the first pass, I'll optimize the logged-in home feed: infinite scroll, media cards, likes/comments, and refresh. I'll call out where stories, ads and creation would plug in, but won't design them unless we have time."

### A: Architecture

Frontend architecture means the major runtime modules and how data moves through them. A good diagram is not a folder structure.

```text
Browser / App shell
  ├─ Routing + URL state
  ├─ Rendering strategy (CSR / SSR / streaming / islands)
  ├─ Feature modules (Feed, Composer, Notifications)
  ├─ Server-state cache (TanStack Query / Relay / Apollo)
  ├─ Client UI store (Zustand / Redux / context)
  ├─ Network layer (REST/GraphQL/BFF, retries, cancellation)
  ├─ Realtime client (WS/SSE, reconnect, dedup)
  └─ Performance layer (virtualization, image pipeline, code splitting, RUM)
```

Architecture answers should name boundaries:
- app shell vs feature modules;
- server state vs client state;
- critical path vs below-the-fold features;
- server-rendered data vs client-only interactions;
- realtime channel vs request/response APIs.

For Adobe Connect, this boundary thinking matters: meeting pods, chat, presence and recording controls should not all subscribe to a giant global store. Each pod can own UI state while shared meeting state comes from a normalized server cache and realtime event stream.

### D: Data model

Data model is the most skipped step in weak frontend answers. It decides whether optimistic updates, pagination and realtime merges are easy or painful.

Design three layers:

```text
Server entities       normalized, ID-addressable, cacheable
Derived views         ordered IDs, filters, cursors, unread counts
Local/UI state        composer text, selected tab, modal open, scroll anchor
```

For a feed:

```ts
type ID = string;

type User = { id: ID; name: string; avatarUrl: string };
type Post = {
  id: ID;
  authorId: ID;
  body: string;
  mediaIds: ID[];
  createdAt: string;
  viewer: { liked: boolean; saved: boolean };
  counts: { likes: number; comments: number };
};

type FeedPage = {
  ids: ID[];
  nextCursor?: string;
  fetchedAt: number;
};

type FeedCache = {
  usersById: Record<ID, User>;
  postsById: Record<ID, Post>;
  home: FeedPage[];
};
```

This is not academic. A like mutation updates `postsById[id].viewer.liked` and `counts.likes`; it does not search every page and duplicate post object.

### I: Interface definition

Interface definition covers both server-client APIs and component contracts. Choose the interface that matches the question.

For app questions:
- REST/BFF endpoints, GraphQL queries or RPC calls;
- pagination style and cursor semantics;
- mutation idempotency and optimistic response shape;
- realtime event names, ordering and dedup keys;
- error shape and retryability.

For component questions:
- props, controlled/uncontrolled state, render props or slots;
- keyboard interactions and ARIA roles;
- async data hooks;
- theming and composition points.

A strong API contract for infinite feed:

```ts
type FeedResponse = {
  items: PostDTO[];
  nextCursor?: string;
  serverTime: string;
};

type FeedClient = {
  getHomeFeed(input: { cursor?: string; limit: number; signal?: AbortSignal }): Promise<FeedResponse>;
  likePost(input: { postId: string; clientMutationId: string }): Promise<{ postId: string; liked: boolean; likeCount: number }>;
};
```

Notice `AbortSignal` and `clientMutationId`. They signal frontend maturity: cancellation and duplicate-safe mutation handling.

### O: Optimizations and deep dives

Pick deep dives based on the product and the evaluation axes, not randomly. Common buckets:
- **Performance:** Core Web Vitals, bundle splitting, list virtualization, images, fonts.
- **Network:** caching, prefetch, request dedup, retries, cancellation.
- **Realtime:** WebSocket/SSE reconnect, event ordering, idempotent reducers.
- **State correctness:** optimistic updates, rollback, invalidation, derived state.
- **UX quality:** loading skeletons, empty states, error recovery, a11y.
- **Scalability:** large lists, media-heavy pages, mobile CPU, memory leaks.
- **Observability:** RUM, interaction traces, error logging.

**Interview line:** "For deep dives, I would prioritize virtualization and image loading because the feed's LCP and scroll INP are the most user-visible risks; then I would cover optimistic likes and realtime invalidation because they are correctness risks."

---

## Part 2: how frontend system design is evaluated

Great frontend answers score on more than architecture. Think of six axes.

| Axis | What excellent looks like | Senior signal |
|---|---|---|
| Problem exploration | clarifies scope and constraints quickly | rejects unnecessary features politely |
| Architecture | simple module diagram with data/rendering flow | clear boundaries and failure isolation |
| Technical proficiency | accurate rendering, state, API and performance details | trade-offs tied to metrics |
| Exploration and trade-offs | compares viable choices | names when the choice changes |
| Product / UX sense | handles loading, errors, empty, a11y | designs degraded and partial states |
| Communication | structured, time-boxed, collaborative | narrates assumptions and checks in |

Do not try to win by dumping buzzwords. "Use SSR, React Query, WebSocket, Service Worker" is not a design. A design explains **why** SSR helps this page, **which** query keys are cached, **what** events flow over the socket, and **how** the service worker avoids stale writes.

### Application questions vs component questions

Frontend rounds come in two shapes.

**Application design:** news feed, chat app, photo sharing, Netflix, email client, data table. These need rendering strategy, data model, network layer, cache, performance and failure modes.

**UI component/API design:** image carousel, autocomplete, modal, dropdown, tabs. These need public API, controlled/uncontrolled modes, accessibility, keyboard support, async behavior, customization and testing.

For a component question, RADIO still works but the emphasis shifts:
- Requirements: controlled? accessible? virtualized? async? theming?
- Architecture: state machine, DOM structure, event handling.
- Data model: selected item, highlighted index, item registry.
- Interface: props/events/slots.
- Optimizations: keyboard, a11y, debounce, virtualization, SSR safety.

**Interview line:** "Since this is a component API question, I'll spend more time on props, keyboard behavior and ARIA than on backend API design."

---

## Part 3: common mistakes and how to recover

### Mistake 1: jumping into React components

Weak: "I'll create Feed.tsx, PostCard.tsx, Comment.tsx…"

Stronger: "The feature modules are Feed, Composer and Notifications. Feed consumes a paginated server-state cache; PostCard is an implementation detail after we agree on data shape and rendering."

Components matter, but they are usually too low-level for the first 15 minutes.

### Mistake 2: one solution with no trade-off

If you say "GraphQL is better" or "SSR is better", expect a follow-up. Good answers compare constraints:
- REST+BFF is simple and cacheable when screens map to endpoints.
- GraphQL shines when clients need flexible nested data and schema governance exists.
- SSR improves SEO/first paint but adds server cost and hydration complexity.
- CSR is cheap and interactive but may hurt LCP/SEO on content-heavy pages.

### Mistake 3: silent drawing

Narrate. Interviewers evaluate communication. A useful pattern:
1. state assumption;
2. make choice;
3. give reason;
4. name drawback;
5. ask if they want deeper detail.

Example: "I'll use cursor pagination because inserts at the top make offset pagination unstable. The drawback is cursors are opaque and make arbitrary page jumps harder; if the product needs page numbers, I would design a separate indexed table view."

### Mistake 4: rabbit holes

If asked to design chat, do not spend 12 minutes on pixel-perfect message bubble CSS. Time-box it:

**Interview line:** "Styling and message grouping are important, but the risky parts are ordering, reconnect and unread state. I'll cover those first and return to visual details if time permits."

### Mistake 5: ignoring degraded states

Senior frontend design includes partial failure:
- feed loads but comments fail;
- image loads slowly;
- websocket disconnects;
- mutation succeeds locally but fails on server;
- browser restores page from bfcache;
- user is on a slow mobile CPU.

These are not polish. They decide trust.

---

## Part 4: a worked mini-example — News feed through RADIO

Assume the prompt: "Design the frontend for a Twitter/Instagram-like news feed."

### Requirements

Functional:
- home feed with infinite scroll;
- post cards with text/media, author, timestamps;
- like/save/comment count interactions;
- pull-to-refresh or top refresh;
- open post detail.

Non-functional:
- fast first content on mobile;
- stable scroll and low INP;
- tolerate stale ranking for minutes, but user actions should feel immediate;
- accessible keyboard navigation and readable media alt text;
- support partial failures.

Out of scope for first pass: post creation, ads, stories, moderation, recommendations internals.

### Architecture

```text
Route: /home
  ├─ App shell (SSR/stream first page if SEO/public; CSR ok for private app)
  ├─ Feed feature
  │   ├─ useInfiniteQuery(['feed','home'], getHomeFeed)
  │   ├─ VirtualizedFeedList
  │   ├─ PostCard
  │   └─ FeedRefreshBanner
  ├─ Entity cache / query cache
  ├─ Network client with AbortController + auth + retry policy
  ├─ Realtime channel for invalidation: post.updated, post.deleted
  └─ RUM: LCP element, INP handlers, scroll memory
```

Rendering choice:
- logged-in private feed can be CSR with app shell + skeleton if SEO does not matter;
- public profile/feed should SSR or stream the first page for LCP/SEO;
- media and comments can hydrate progressively or lazy-load below the fold.

### Data model

```ts
type FeedQueryKey = ['feed', 'home', { ranking: 'top' | 'latest' }];

type FeedView = {
  pageParams: string[];
  pages: Array<{ ids: string[]; nextCursor?: string }>;
};

type OptimisticMutation = {
  id: string;
  entity: 'post';
  entityId: string;
  patch: Partial<Post>;
  inversePatch: Partial<Post>;
};
```

Design notes:
- store posts by ID or let the query cache behave as canonical server state;
- keep cursor pages as ordered IDs;
- maintain scroll anchor when prepending refreshed items;
- local state includes composer draft, visible media index, currently opened menu.

### Interface/API

```http
GET /api/feed/home?cursor=opaque&limit=20
```

```ts
type HomeFeedResponse = {
  items: Array<PostDTO & { author: UserDTO; media: MediaDTO[] }>;
  nextCursor?: string;
  generatedAt: string;
};
```

Realtime invalidation, not full feed streaming:

```ts
type FeedEvent =
  | { type: 'post.updated'; postId: string; version: number }
  | { type: 'post.deleted'; postId: string; version: number }
  | { type: 'new-items-available'; countHint?: number };
```

Do not auto-insert every new post at top while the user is reading; show "12 new posts" and preserve scroll. This is product sense.

### Optimizations

- LCP: SSR first page if public; prioritize hero/feed first image; preconnect to CDN; avoid huge client bundle.
- INP: virtualize long lists; avoid rerendering every post on like; memoize item rows carefully.
- CLS: reserve media dimensions; use skeletons with fixed aspect ratios.
- Network: cursor pagination; request dedup; abort stale page fetches; prefetch next page near sentinel.
- Correctness: optimistic like with rollback; ignore older realtime events by version.
- Observability: log slow interactions and feed error rates; track LCP element URL and query latency.

**Interview line:** "I would not push every realtime update into the visible list. I would use realtime as an invalidation and freshness signal, because preserving scroll position is more important than absolute feed freshness."

---

## Part 5: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| News feed | RADIO with heavy Data + Optimizations | pagination, normalized entities, virtualization, image performance |
| Chat app | emphasize Interface + Optimizations | realtime ordering, reconnect, optimistic send, unread state |
| Autocomplete | component/API variant of RADIO | debounce/cache/cancel, keyboard a11y, async states |
| Data table | Data + Interface first | server-side sort/filter, URL state, virtualization, column model |
| E-commerce product page | Rendering + Performance deep dive | SEO, SSR/SSG/ISR, image LCP, inventory freshness |
| DrawBoard/Figma | Architecture + realtime data model | CRDT updates, presence, snapshots, conflict-free local editing |

### Common interview traps

- Treating frontend system design as a list of React components.
- Skipping requirements and optimizing the wrong metric.
- Saying "global state" without splitting server, client, URL and form state.
- Choosing WebSocket for everything instead of asking whether invalidation is enough.
- Ignoring loading, empty, error, offline and accessibility states.
- Spending all the time on one rabbit hole and never reaching optimizations.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What are the five RADIO steps, and what artifact should each produce?</summary>

Requirements produce scoped functional/non-functional goals. Architecture produces module/rendering/data-flow diagrams. Data model produces entities, view state and local state. Interface definition produces APIs/events/component props. Optimizations produce prioritized deep dives: performance, reliability, a11y, realtime, caching and observability.
</details>

<details><summary>2. In a feed question, why is "components first" a weak start?</summary>

Because components do not settle the risky decisions: rendering strategy, pagination, entity shape, cache updates, realtime invalidation, media performance and failure states. Components are implementation details after the architecture and data flow are agreed.
</details>

<details><summary>3. Name three requirements questions that materially change a frontend design.</summary>

Is SEO/public sharing required? Is the primary metric first load, interaction latency, correctness or offline? What devices and network conditions matter? How fresh must data be? Is it an app design or component API design? What scale of list/items should be supported?
</details>

<details><summary>4. How does RADIO change for a modal/autocomplete component API question?</summary>

Architecture becomes DOM/state-machine/event architecture; data model is selected/highlighted/open state; interface definition becomes props/events/controlled modes/slots; optimizations focus on keyboard accessibility, ARIA, async states, debounce/cancel and customization.
</details>

<details><summary>5. What is a good interview line for choosing cursor pagination?</summary>

"I'll use cursor pagination because new items can be inserted while the user scrolls; offset pagination can duplicate or skip items. The trade-off is opaque cursors make arbitrary page jumps harder, which is acceptable for an infinite feed."
</details>

<details><summary>6. In the News feed example, why use realtime as an invalidation signal rather than auto-inserting posts?</summary>

Auto-inserting can move content while the user reads and destroy scroll context. A "new posts available" signal preserves UX while still giving freshness. The app can fetch and prepend only when the user chooses.
</details>

<details><summary>7. Which evaluation axis catches "I know the buzzwords but cannot defend trade-offs"?</summary>

Exploration and trade-offs, plus technical proficiency. The answer must compare choices and tie them to product constraints and metrics, not just name SSR, GraphQL, WebSocket or React Query.
</details>

<details><summary>8. What should you do if you realize you went too deep into a rabbit hole?</summary>

Recover explicitly: summarize the conclusion, park the detail, and return to the framework. Example: "The key point is that row virtualization protects INP; I'll stop there and cover API/error handling next."
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
| [GreatFrontEnd: Introduction](https://www.greatfrontend.com/front-end-system-design-playbook/introduction) | "Front end vs Back end / Full stack system design", "What you will learn in this guide", "How to use this guide" | ~10 min |
| [GreatFrontEnd: Types of questions](https://www.greatfrontend.com/front-end-system-design-playbook/types-of-questions) | "Applications", "Important areas", "UI components", "Customizing theming", "What to do during interviews?" | ~15 min |
| [GreatFrontEnd: RADIO framework](https://www.greatfrontend.com/front-end-system-design-playbook/framework) | "What is RADIO about?", "Using RADIO framework in interviews", all sections from "Requirements exploration" through "Optimizations and deep dive" | ~30 min |
| [GreatFrontEnd: Evaluation axes](https://www.greatfrontend.com/front-end-system-design-playbook/evaluation-axes) | "Problem exploration", "Architecture", "Technical proficiency", "Exploration and tradeoffs", "Product and UX sense", "Communication and collaboration" | ~20 min |
| [GreatFrontEnd: Common mistakes](https://www.greatfrontend.com/front-end-system-design-playbook/common-mistakes) | all mistake sections: jumping in, unstructured answers, one solution, silence, rabbit holes, buzzwords | ~15 min |
| [Frontend Interview Handbook: Front end system design](https://www.frontendinterviewhandbook.com/front-end-system-design) | "Front end system design examples", "RADIO Framework", "Things you would not have to do (probably)" | ~20 min |

**Connects to:** FE2 Rendering Strategies · FE3 State + Data Model · FE4 Network Layer · FE5 Performance · [E1 Polling/SSE/WebSocket](../../../SystemDesign/Notes/HLD/E-Realtime/E1-Polling-SSE-WebSocket.md) · [F3 Fan-out](../../../SystemDesign/Notes/HLD/F-Blobs-Fanout/F3-Fan-out.md)
