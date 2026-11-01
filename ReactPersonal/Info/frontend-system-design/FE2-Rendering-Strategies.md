# FE2 · Rendering Strategies: picking where HTML and interactivity are born

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** News feed (FE Tier 1 / HLD #4), E-commerce product/checkout (FE Tier 1 / HLD #18), Photo sharing / Instagram (FE Tier 1 / HLD #11), Netflix / YouTube (FE Tier 2 / HLD #6), dashboards and data tables (FE Tier 2)

---

## Why this topic matters

Rendering strategy is the first major architecture choice in many frontend system design questions. It decides:

| Question | Rendering concern |
|---|---|
| E-commerce product page | SEO, LCP, inventory freshness, CDN cost |
| News feed | personalized data, scroll performance, stale pages |
| Netflix | logged-in shell, media-heavy route splits, CDN caching |
| Dashboard | auth-only UI, data freshness, client CPU |
| Marketing / docs | static generation, global edge cache |

The trap is treating CSR/SSR/SSG as a ranking. There is no universal winner. The right answer is usually **hybrid rendering per route and per component**.

**Interview line:** "I'll choose rendering per surface: public SEO pages can be static or server-rendered; logged-in dashboards can be CSR after an app shell; expensive interactive islands hydrate only when needed."

---

## Part 1: the vocabulary that actually matters

### CSR: Client-Side Rendering

The server sends a minimal HTML shell and JavaScript. The browser downloads JS, runs React, fetches data, then paints meaningful content.

```text
request -> HTML shell -> JS bundle -> data fetch -> render -> interactive
```

Pros:
- simple deployment through static hosting;
- cheap server side;
- excellent for auth-only apps and highly interactive dashboards;
- client routing after first load is fast.

Cons:
- weak initial LCP on slow devices if bundle/data are large;
- SEO/social previews need extra work;
- blank/skeleton screen risk;
- mobile CPU pays for rendering everything.

Use CSR for Adobe Connect-like authenticated meeting consoles where SEO is irrelevant and the long-lived session is interaction-heavy. Still split routes and pods: a meeting room should not download recording admin UI before join.

### SSR: Server-Side Rendering

The server renders HTML for the request. The browser can show content before the JS bundle finishes. React then hydrates the markup.

```text
request -> server fetch/render -> HTML with content -> JS -> hydrate -> interactive
```

Pros:
- better first meaningful content for dynamic pages;
- SEO and social crawlers see content;
- server can personalize safely using cookies;
- works well for e-commerce/product/public profile pages.

Cons:
- server cost and operational complexity;
- high TTFB if data dependencies are slow;
- hydration can be expensive: the app renders once on server and again on client;
- caching personalized SSR is harder.

### SSG: Static Site Generation

HTML is produced at build time and served from CDN.

Pros:
- very low TTFB and cheap global delivery;
- reliable under traffic spikes;
- simple cache story.

Cons:
- stale until rebuild;
- build times can grow;
- user-specific content still needs client fetching;
- not suitable for rapidly changing per-user feeds.

Use SSG for docs, landing pages, blog posts, category pages that change rarely.

### ISR / revalidation

Incremental Static Regeneration is the pattern of serving a cached static page and refreshing it after a TTL or trigger. The exact product name is framework-specific, but the system design idea is general: **static cache plus background regeneration**.

Use it for product pages or news articles where data changes but not on every request. The trade-off is staleness: price or inventory may need a dynamic client/server check even if the page shell is static.

### Streaming SSR

The server sends HTML chunks as they become ready. Above-the-fold content can arrive before slower sections.

```text
server starts response
  ├─ shell + header
  ├─ hero/product summary
  ├─ recommendations fallback
  └─ recommendations content later
```

Streaming helps when some data is slow but the page has useful early content. The trap: streaming improves perceived progress, but it does not automatically remove hydration cost.

### React Server Components (RSC)

RSC lets components run on the server and send a serialized component payload to the client. Server Components do not ship their code to the browser; Client Components handle state/effects/events.

Good fit:
- reading server data close to the data source;
- reducing client bundle size for non-interactive UI;
- composing server-rendered content with interactive client islands.

Trade-offs:
- mental model and framework coupling;
- server/client boundary constraints;
- caching and mutation flows need discipline;
- not a replacement for API design in all apps.

**Interview line:** "RSC helps reduce client JavaScript for data-heavy, mostly read-only sections, but any component with browser state or event handlers stays client-side. I would use it selectively, not as a magic performance switch."

---

## Part 2: hydration, partial hydration, progressive hydration and islands

SSR gives HTML. Hydration attaches event handlers and reconstructs the client-side component tree so the page becomes interactive.

```text
HTML visible  !=  interactive
hydration done => event handlers, state, effects work
```

Hydration cost is easy to underestimate. A page can have great FCP but poor INP if the main thread is busy parsing JS and hydrating many components.

### Full hydration

Traditional React SSR hydrates the app tree. This is straightforward but can be wasteful if most of the page is static.

### Progressive hydration ⏭ *Skip for interviews*

Hydrate important parts first, less important parts later. Example: hydrate product buy box before reviews carousel.

### Partial hydration ⏭ *Skip for interviews*

Only hydrate interactive regions. Static regions stay plain HTML. This reduces JS work but requires architectural support.

### Islands architecture ⏭ *Skip for interviews*

The page is mostly static/server-rendered HTML with independent interactive islands.

```text
Product page HTML
  ├─ static title/specs/reviews summary
  ├─ island: AddToCartButton
  ├─ island: ImageGallery
  └─ island: RecommendationsCarousel (loads later)
```

This is attractive for content-heavy pages with a few interactive widgets. It is less natural for a fully interactive app like DrawBoard or a meeting room, where almost every region reacts to shared state.

### Hydration pitfalls

- Server/client markup mismatch from time zones, random IDs, browser-only APIs.
- Duplicate data fetching: server fetches, then client refetches immediately.
- Large serialized data blobs in HTML.
- Hydrating below-the-fold widgets too early.
- Hidden CPU cost on low-end mobile devices.

React code that avoids browser-only hydration bugs:

```tsx
function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = React.useState<string>(() => new Date(iso).toUTCString());

  React.useEffect(() => {
    setText(new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)));
  }, [iso]);

  return <time dateTime={iso}>{text}</time>;
}
```

The server and client start from a deterministic UTC string; localization happens after hydration.

---

## Part 3: trade-offs on TTFB, FCP, LCP, INP, SEO and cost

| Strategy | TTFB | FCP/LCP | INP risk | SEO | Cost |
|---|---|---|---|---|
| CSR | low server TTFB, but shell only | can be poor until JS/data load | high if bundle large | weak unless pre-rendered | cheap server, more client CPU |
| SSR | can be slower if data waits | often better content LCP | hydration can hurt | strong | server compute per request |
| SSG | excellent from CDN | excellent for static content | low if JS small | strong | cheap, build cost |
| ISR | excellent when cached | good but possibly stale | same as page JS | strong | regeneration complexity |
| Streaming SSR | earlier visible chunks | improves perceived load | hydration still matters | strong | server streaming complexity |
| RSC / islands | depends on framework/cache | can reduce JS and LCP cost | often lower JS/INP | strong if server-rendered | server/framework complexity |

### TTFB

SSR can worsen TTFB if it waits for slow backend calls. Streaming or caching can fix this. SSG usually wins TTFB because CDN serves static HTML.

### FCP and LCP

SSR/SSG can show real content earlier. But LCP is often an image or hero block, so responsive images, priority hints and CDN caching matter as much as rendering mode.

### INP

INP punishes main-thread blocking after the page is visible. SSR can improve first paint but still ship a huge JS bundle that blocks input during hydration. Islands/RSC/code splitting reduce shipped JS and hydration work.

### SEO

Public indexable pages prefer SSR/SSG. Logged-in apps do not get SEO value from SSR, so justify it only for performance or sharing previews.

### Cost

CSR shifts work to the user's device. SSR shifts work to your servers. SSG/ISR shift work to build/regeneration and CDN. In interviews, mention cost when scale is large: a Netflix-like logged-in app with millions of sessions may not want SSR for every personalized route.

---

## Part 4: picking per question

### News feed

Private, personalized home feed:
- CSR or SSR app shell;
- client fetch first page with skeleton if auth-only;
- use SSR/streaming only if first content speed is a stated goal;
- virtualize list and optimize images.

Public profile or public post:
- SSR/SSG/ISR for SEO and share previews;
- hydrate interactions like follow/like/comment composer.

**Interview line:** "For the logged-in home feed, I won't choose SSR just for SEO because there is no SEO. I might server-render the first page if LCP on mobile is a hard requirement, but I'll still focus on JS size and virtualization for INP."

### E-commerce

- Category and product pages: SSG/ISR or SSR, because SEO and LCP matter.
- Price/inventory: dynamic revalidation or client/server check at add-to-cart.
- Checkout: authenticated, correctness-heavy, often CSR/SSR app flow; avoid stale inventory promises.

### Netflix / video app

- Marketing pages: SSG.
- Logged-in browse: CSR or SSR shell depending on device constraints.
- Player route: client-heavy; prioritize media startup, adaptive bitrate, route-level code splitting.
- Metadata pages can be cached; personalized rows are dynamic.

### Dashboard / Adobe admin console

- CSR is often enough: auth-only, highly interactive, no SEO.
- Server-rendering may help first load but can be wasted if every widget refetches.
- Key optimizations: route splitting, data cache, skeletons, cancellation, table virtualization.

### DrawBoard / collaborative editor

- Mostly CSR/client-heavy because canvas, CRDT state and realtime interaction dominate.
- SSR a landing/document metadata page if needed.
- Do not hydrate an entire whiteboard from HTML; load a snapshot/update log and let the client CRDT engine own interaction.

---

## Part 5: choosing in an interview / cheat sheet

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

### Common interview traps

- Saying SSR always improves performance; hydration can still hurt INP.
- Choosing SSG for data that must be fresh on every request.
- Ignoring server cost for personalized SSR at scale.
- Treating RSC as the same thing as SSR; RSC is a component/data transport model, SSR is HTML rendering.
- Forgetting that SEO is irrelevant for authenticated routes.
- Hydrating every below-the-fold widget immediately.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why can an SSR page have good FCP but bad INP?</summary>

HTML arrives early, so content is visible. But the browser may still parse a large JS bundle and hydrate a big component tree on the main thread. During that work, user input can be delayed, causing poor INP.
</details>

<details><summary>2. When would you choose SSG/ISR over SSR for an e-commerce page?</summary>

When product content is mostly cacheable and SEO/LCP matter. SSG/ISR serves from CDN cheaply. Dynamic fields such as price, inventory or promotions can be revalidated, embedded with short TTL, or checked during add-to-cart/checkout.
</details>

<details><summary>3. Explain the difference between SSR and RSC in one interview sentence.</summary>

SSR produces HTML for an initial request; RSC lets some React components execute on the server and send a component payload so their code/data work does not need to ship to the client. They can be combined but are not the same feature.
</details>

<details><summary>4. What is an island, and where is it useful?</summary>

An island is an independently hydrated interactive region inside otherwise static/server-rendered HTML. It is useful on content-heavy pages like product pages or docs where only widgets such as cart buttons, galleries or carousels need client JavaScript.
</details>

<details><summary>5. For a logged-in dashboard, why might CSR be the right default?</summary>

SEO does not matter, the UI is interaction-heavy, and data is user-specific. CSR with route splitting, request caching, cancellation and skeleton states can be simpler and cheaper than SSR for every personalized route.
</details>

<details><summary>6. What rendering approach fits DrawBoard or Figma-like canvas collaboration?</summary>

CSR for the core editor. The canvas/CRDT/realtime loop is client-heavy and highly interactive. SSR can still be used for landing pages or document metadata, but the editor should load a snapshot/update log and run locally.
</details>

<details><summary>7. Name two causes of hydration mismatch.</summary>

Rendering non-deterministic values such as `Date.now()` or random IDs on server and client; using browser-only state during server render; locale/time-zone differences; data that changes between server render and client hydration.
</details>

<details><summary>8. How do you connect rendering strategy to Core Web Vitals?</summary>

TTFB is affected by server work/cache; FCP/LCP improve when real content and hero assets arrive early; INP depends on JS size and hydration/main-thread work; CLS depends on stable layout regardless of rendering mode.
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
| [web.dev: Rendering on the Web](https://web.dev/articles/rendering-on-the-web) | "Terminology", "Server-side rendering", "Static rendering", "Server-side rendering versus static rendering", "Client-side rendering", "Rehydration combines server-side and client-side rendering", "Stream server-side rendering and rehydrate progressively", "Partial rehydration", "SEO considerations" | ~35 min |
| [React docs: Server Components](https://react.dev/reference/rsc/server-components) | "Server Components without a Server", "Server Components with a Server", "Adding interactivity to Server Components" | ~20 min |
| [Astro docs: Islands](https://docs.astro.build/en/concepts/islands/) | "A brief history", "What is an island?", "Island components", "Client Islands", "Benefits of client islands" | ~15 min |

**Connects to:** FE1 RADIO Framework · FE5 Performance · [C4 HTTP/CDN Caching](../../../SystemDesign/Notes/HLD/C-Caching/C4-HTTP-CDN-Caching.md) · [F2 Video Pipeline](../../../SystemDesign/Notes/HLD/F-Blobs-Fanout/F2-Video-Pipeline.md)
