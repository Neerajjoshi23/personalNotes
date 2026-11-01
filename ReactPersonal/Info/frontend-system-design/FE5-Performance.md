# FE5 · Performance: Core Web Vitals and the frontend trade-off toolbox

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** News feed (FE Tier 1 / HLD #4), Photo sharing / Instagram (FE Tier 1 / HLD #11), Image carousel (FE Tier 1), Data table (FE Tier 2), E-commerce (FE Tier 1 / HLD #18), Netflix / YouTube (FE Tier 2 / HLD #6), Autocomplete machine coding

---

## Why this topic matters

Frontend performance is not "make it fast". In an interview, performance means naming the metric, identifying the bottleneck and choosing an intervention that does not break UX or correctness.

Core Web Vitals give a shared vocabulary:

| Metric | User question | Common frontend causes |
|---|---|---|
| **LCP** (Largest Contentful Paint) | "When did the main content load?" | slow TTFB, render-blocking CSS/JS, unoptimized hero image |
| **INP** (Interaction to Next Paint) | "Did the page respond to input quickly?" | long JS tasks, hydration, rerender storms, heavy event handlers |
| **CLS** (Cumulative Layout Shift) | "Did the page jump around?" | images without dimensions, late ads/fonts, injected banners |

Performance work is system design because it changes architecture: SSR vs CSR, CDN caching, bundle boundaries, image pipeline, virtualization, state granularity and observability.

**Interview line:** "I'll optimize against the metric that matters for the product: LCP for product pages, INP for dashboards/tables, CLS for media feeds, and startup time for video/player flows."

---

## Part 1: Core Web Vitals — how to improve each

### LCP

LCP is usually text block or image/hero content. Improve it by shortening the critical path.

Levers:
- reduce TTFB with CDN/SSR caching or static generation;
- inline/preload critical CSS carefully;
- defer non-critical JS;
- optimize the LCP image: correct size, modern format, CDN, `fetchpriority="high"` when appropriate;
- avoid client-only rendering for public content-heavy pages;
- preconnect to critical origins.

```tsx
<img
  src="/cdn/products/shoe-800.avif"
  srcSet="/cdn/products/shoe-400.avif 400w, /cdn/products/shoe-800.avif 800w, /cdn/products/shoe-1200.avif 1200w"
  sizes="(max-width: 768px) 100vw, 50vw"
  width={800}
  height={600}
  fetchPriority="high"
  alt="Blue running shoe"
/>
```

Only prioritize the actual above-the-fold LCP candidate. Marking every image high priority makes priority meaningless.

### INP

INP is about responsiveness across the page lifecycle, not just first load.

Levers:
- ship less JavaScript;
- split routes and heavy widgets;
- virtualize long lists;
- move expensive work off the interaction path;
- avoid global rerenders on local interactions;
- debounce/throttle carefully;
- use transitions/deferred values for non-urgent updates;
- break long tasks.

React example for search filtering:

```tsx
function SearchableList({ rows }: { rows: Row[] }) {
  const [query, setQuery] = React.useState('');
  const deferredQuery = React.useDeferredValue(query);

  const visible = React.useMemo(
    () => filterRows(rows, deferredQuery),
    [rows, deferredQuery],
  );

  return <>
    <input value={query} onChange={e => setQuery(e.target.value)} />
    <Rows rows={visible} />
  </>;
}
```

This does not make filtering free; it makes typing feel higher priority. For huge data, move filtering server-side or to a worker.

### CLS

Levers:
- always set image/video width and height or aspect ratio;
- reserve ad/embed slots;
- use skeletons that match final layout;
- avoid inserting banners above existing content;
- use font loading strategies that reduce swap shifts.

Feed/card rule: every media container gets a known aspect ratio before the image loads.

```css
.mediaBox {
  aspect-ratio: 16 / 9;
  background: #eee;
  overflow: hidden;
}
.mediaBox img { width: 100%; height: 100%; object-fit: cover; }
```

---

## Part 2: bundle splitting, code splitting and lazy loading

Bundle size affects LCP, INP and memory. The senior question is not "can you use lazy?" It is **where should the boundary be?**

Good split boundaries:
- routes: settings/admin/player/editor;
- heavy components: charts, rich text editor, map, code editor;
- below-the-fold modules: reviews, recommendations;
- rarely used flows: export dialog, payment provider SDK.

```tsx
const RichTextEditor = React.lazy(() => import('./RichTextEditor'));

function Composer() {
  const [open, setOpen] = React.useState(false);
  return <>
    <button onClick={() => setOpen(true)}>Write</button>
    {open && (
      <React.Suspense fallback={<div>Loading editor…</div>}>
        <RichTextEditor />
      </React.Suspense>
    )}
  </>;
}
```

Trade-offs:
- too many tiny chunks add request overhead;
- lazy loading a near-immediate interaction can cause jank;
- prefetch chunks on intent when likely;
- monitor actual chunk usage and long tasks.

For Adobe Connect, split meeting room core from admin/reporting/recordings. Do not lazy-load the microphone permission prompt path if it blocks joining.

---

## Part 3: list virtualization and rendering large data

Virtualization renders only visible rows plus overscan. It is essential for feeds, tables and logs.

```text
100,000 rows in data
  -> 30 DOM rows rendered
  -> absolute positioning creates scroll height illusion
```

Use it when:
- DOM nodes grow into thousands;
- rows are complex cards;
- scrolling causes rerender/paint jank;
- memory becomes visible in profiles.

Trade-offs:
- dynamic row heights are harder;
- browser find-in-page may not see offscreen content;
- accessibility needs care with row counts and focus;
- preserving scroll position after prepends requires anchors;
- sticky headers/columns complicate layout.

For chat, virtualization must support reverse/infinite prepending and scroll anchoring. For data tables, combine virtualization with server-side sort/filter if row count is large.

**Interview line:** "I would virtualize the feed/table after a few dozen complex rows, but I would also call out accessibility and scroll anchoring because virtualization can break focus and browser search."

---

## Part 4: image optimization, fonts and caching headers

### Responsive images

The browser needs enough information to pick the right asset.

```html
<picture>
  <source type="image/avif" srcset="/hero-640.avif 640w, /hero-1280.avif 1280w" />
  <source type="image/webp" srcset="/hero-640.webp 640w, /hero-1280.webp 1280w" />
  <img src="/hero-1280.jpg" srcset="/hero-640.jpg 640w, /hero-1280.jpg 1280w" sizes="100vw" width="1280" height="720" alt="Team dashboard" />
</picture>
```

Use:
- `srcset`/`sizes` for resolution switching;
- `picture` for art direction or format fallback;
- AVIF/WebP when supported;
- width/height to prevent CLS;
- lazy loading for below-the-fold images;
- CDN transformations for size/format.

### Lazy loading

Native `loading="lazy"` is good for below-the-fold images and iframes. Do not lazy-load the LCP image. For carousels, eager-load current/next image and lazy-load distant slides.

### Fonts

Font mistakes cause LCP/CLS issues. Strategies:
- subset fonts;
- use `font-display` intentionally;
- preload critical font files if they are truly critical;
- prefer system fonts for internal tools when brand allows.

### Caching headers

Static hashed assets:

```http
Cache-Control: public, max-age=31536000, immutable
```

HTML/document responses:

```http
Cache-Control: no-cache
```

API data depends on freshness. For CDN/browser caching and stale-while-revalidate patterns, connect to [C4](../../../SystemDesign/Notes/HLD/C-Caching/C4-HTTP-CDN-Caching.md).

Rule: hashed JS/CSS/images can be cached for a long time; mutable HTML/API responses need validation or short TTLs.

---

## Part 5: measuring — RUM vs lab

### Lab tools

Lab tests run in controlled conditions. Good for reproducible debugging, CI budgets and before/after comparisons.

Examples: Lighthouse, WebPageTest, local performance profiles.

Limitations:
- one device/network profile;
- synthetic interactions may not match users;
- cannot see long-tail production issues.

### RUM (Real User Monitoring)

RUM measures real users, real devices, real networks.

Track:
- LCP value and element;
- INP value and interaction target;
- CLS sources;
- JS errors and resource failures;
- route, device class, connection type;
- backend request IDs/latency when possible.

```ts
function reportMetric(name: string, value: number, tags: Record<string, string>) {
  navigator.sendBeacon('/rum', JSON.stringify({ name, value, tags, ts: Date.now() }));
}
```

Privacy caveat: do not send PII or full URLs with sensitive query parameters. Sample high-volume events.

**Interview line:** "I would use lab tools to find regressions before release and RUM to verify real user impact, segmented by route/device/network. A performance fix that helps desktop Chrome but hurts low-end Android is not a win."

---

## Part 6: choosing in an interview / cheat sheet

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

### Common interview traps

- Optimizing average load time instead of LCP/INP/CLS and user journey.
- Lazy-loading the LCP image.
- Virtualizing without considering accessibility, focus and scroll anchoring.
- Shipping one giant app bundle to every route.
- Measuring only Lighthouse and ignoring real devices.
- Fixing performance by adding caches without invalidation strategy.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What are LCP, INP and CLS in plain language?</summary>

LCP measures when the main content appears. INP measures how quickly the page responds to user interactions across its lifecycle. CLS measures unexpected layout movement while the user is viewing the page.
</details>

<details><summary>2. Why can lazy loading hurt LCP?</summary>

If the LCP image is lazy-loaded, the browser deprioritizes it even though it is needed immediately. Above-the-fold hero/LCP assets should usually load eagerly and may need higher priority.
</details>

<details><summary>3. When should you virtualize a list?</summary>

When rendering many DOM nodes or complex rows causes memory, layout, paint or interaction jank. Feeds, logs, tables and chat histories are common. Consider trade-offs: dynamic heights, focus, find-in-page, accessibility and scroll anchoring.
</details>

<details><summary>4. What is a good cache header for hashed JavaScript assets?</summary>

`Cache-Control: public, max-age=31536000, immutable`, because the filename changes when content changes. Mutable HTML should not use that policy.
</details>

<details><summary>5. How do responsive images improve performance?</summary>

They let the browser download an appropriately sized asset for the viewport/DPR and choose modern formats or art-directed crops. This reduces bytes and can improve LCP while maintaining visual quality.
</details>

<details><summary>6. Lab vs RUM: when do you use each?</summary>

Lab tools are controlled and reproducible for debugging and CI budgets. RUM shows real users, devices, networks and long-tail issues. Use both: lab to diagnose, RUM to validate production impact.
</details>

<details><summary>7. A dashboard has poor INP when typing in a filter box. What do you inspect first?</summary>

Long tasks and rerenders triggered by each keystroke: expensive filtering, large table rerenders, global store updates, uncontrolled effects, heavy charts. Fix with server-side filtering, debouncing/deferred value, memoized selectors, virtualization or workers depending on scale.
</details>

<details><summary>8. Why should images have width/height or aspect ratio?</summary>

The browser can reserve the correct space before the image loads. This prevents layout shifts and improves CLS, especially in feeds and carousels.
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
| [web.dev: Web Vitals](https://web.dev/articles/vitals) | "Overview", "Core Web Vitals", "Lifecycle", "Tools to measure and report Core Web Vitals", "Recommendations for improving your scores", "Other Web Vitals" | ~25 min |
| [web.dev: Virtualize large lists with react-window](https://web.dev/articles/virtualize-long-lists-react-window) | "Why is this useful?", "react-window", "When to use fixed size lists", "When to use variable sized lists", "Grids", "Lazy loading on scroll", "Overscanning" | ~25 min |
| [web.dev: Browser-level image lazy loading](https://web.dev/articles/browser-level-image-lazy-loading) | "Why browser-level lazy loading?", "The loading attribute", "Relationship between the loading attribute and fetch priority", "Give your images dimension attributes", "Always eager-load images visible in the first viewport", "Graceful degradation" | ~20 min |
| [MDN: Responsive images](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images) | "Why responsive images?", "How do you create responsive images?", "Resolution switching: Different sizes", "Resolution switching: Same size, different resolutions", "Art direction", "Why can't we just do this using CSS or JavaScript?" | ~25 min |
| [HLD C4: HTTP/CDN Caching](../../../SystemDesign/Notes/HLD/C-Caching/C4-HTTP-CDN-Caching.md) | Cache-Control, ETag, CDN and stale-while-revalidate sections once that note is written | ~20 min |

**Connects to:** FE2 Rendering Strategies · FE4 Network Layer · [C4 HTTP/CDN Caching](../../../SystemDesign/Notes/HLD/C-Caching/C4-HTTP-CDN-Caching.md) · [F2 Video Pipeline](../../../SystemDesign/Notes/HLD/F-Blobs-Fanout/F2-Video-Pipeline.md) · [F3 Fan-out](../../../SystemDesign/Notes/HLD/F-Blobs-Fanout/F3-Fan-out.md)
