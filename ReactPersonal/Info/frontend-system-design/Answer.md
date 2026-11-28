### 1 · Autocomplete / Typeahead (Frontend System Design)
**Framework:** RADIO (`FE1`) · **Key Modules:** `FE3` State & Data Model · `FE4` Network Layer · `FE7` Accessibility (Combobox) · `FE10` Component API · `FE11` Observability

---

#### R · Requirements & Scope (5 min)
* **Core Functional Flows:**
  * Editable search input that queries async suggestions as the user types.
  * Keyboard and pointer selection of a suggestion (or submitting the raw typed query via `Enter`).
  * Recent/popular searches shown on focus when input is empty (`query.length < minChars`).
  * Cursor-based pagination (`Load more` / scroll-end) if the suggestion list has more pages.
* **Non-Functional Goals:**
  * **Low Interaction Latency (INP):** Typing must stay instantaneous (0ms input lag) while network requests debounce (`200–300ms`).
  * **Race-Free Correctness:** Stale responses (e.g., `"rea"` resolving after `"react"`) must never overwrite newer results.
  * **Full WAI-ARIA Accessibility (`FE7`):** Complete keyboard navigation + screen-reader announcements without losing typing focus.
  * **Resilience:** Explicit `idle` / `loading` / `empty` / `error` UI states; API failure never blocks raw form submission.
* **Out of Scope (First Pass):** Backend search ranking/indexing internals, fuzzy spelling correction engine, multi-select tag chips.

---

#### A · High-Level Client Architecture (8 min)

```text
<Autocomplete /> (Composite Widget)
  ├─ Input Controller (<input role="combobox">)
  │    └─ Updates inputValue immediately (0ms lag); tracks IME isComposing
  ├─ Debouncer & Gate (250ms delay, minChars = 2, normalized key)
  ├─ Server-State Cache & Request Manager (TanStack Query + AbortController)
  │    ├─ Prefix-cache optimistic filter (filters cached "rea" while "react" is in flight)
  │    └─ Cancels superseded in-flight requests via AbortSignal
  ├─ Listbox Popover (<ul role="listbox">, Portaled & flipped near viewport edges)
  │    └─ Renders <li role="option"> rows + loading / empty / inline error states
  └─ Live Region Announcer (<div role="status" aria-live="polite" className="sr-only">)
```

**Interview Line:** *"I separate immediate keystroke state from debounced network state so typing never blocks the main thread, and I keep real DOM focus on the `<input>` at all times while virtualizing the active option via `aria-activedescendant`."*

---

#### D · Data Model & State Ownership (`FE3` + `FE10`) (7 min)

Split state cleanly across **three ownership layers** so server cache, controllable props, and ephemeral UI highlight never collide:

```ts
// 1. Domain & Server Cache Entities (Owned by TanStack Query)
type SuggestionItem = {
  id: string;
  label: string;
  category?: string;
  subtitle?: string;
  /** Optional server-provided [start, end] match offsets for safe bolding without regex XSS */
  matchRanges?: Array<[number, number]>;
};

type AutocompletePage = {
  items: SuggestionItem[];
  nextCursor?: string;
};

// Normalized query key prevents duplicate cache entries for "React " vs "react"
// queryKey = ['autocomplete', normalizedQuery, scopeFilter]
// Configured with staleTime (3–5 min) + gcTime (time-based eviction) or bounded LRU map.

// 2. Controllable Component State (Owned by parent OR internal via useControllableState)
type ControllableState = {
  inputValue: string; // Current text in the search box
  isOpen: boolean;    // Whether the suggestion listbox popup is expanded
};

// 3. Ephemeral Internal UI State (Owned strictly inside <Autocomplete />)
type InternalUIState = {
  highlightedIndex: number; // -1 when nothing is highlighted; separate from committed selection!
  isComposing: boolean;     // Guards Enter key during IME (Hindi/CJK) character composition
  lastCommittedQuery: string; // Request-generation / current-input guard against stale renders
};
```

##### Key State Design Decisions
* **`highlightedIndex` vs. `inputValue`:** Pressing `ArrowDown` updates `highlightedIndex` (`0, 1, 2...`) without mutating `inputValue` or firing `onSelect` until the user explicitly presses `Enter` or clicks.
* **Derived Async Status (No Redundant `useState`):** Derive `'idle' | 'loading' | 'empty' | 'error' | 'success'` directly from TanStack Query's `isFetching`, `isError`, and `data.pages` so UI states cannot drift out of sync.
---

#### I · Interface Definition & Rich Accessibility Contract (`FE7` + `FE10`) (10 min)

##### 1. Network / BFF API Contract (`FE4`)
```http
GET /api/search/suggestions?q=react&cursor=324&limit=10
```
```ts
type FetchSuggestionsParams = {
  query: string;
  cursor?: string;
  limit: number;
  signal: AbortSignal; // Passed by TanStack Query to abort superseded calls
};

type FetchSuggestionsResponse = {
  items: SuggestionItem[];
  nextCursor?: string;
};
```

##### 2. Public Component Props Contract (`AutocompleteProps<T>`)
Supports both **uncontrolled** (`defaultValue`) and **controlled** (`value` + `onValueChange`) usage via `useControllableState`, plus custom item rendering:

```ts
type AutocompleteProps<T extends SuggestionItem = SuggestionItem> = {
  // Controllable state trios
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  // Selection & submission
  onSelect: (item: T) => void;
  onSubmitRawQuery?: (query: string) => void;

  // Data fetching & tuning
  fetchSuggestions: (params: FetchSuggestionsParams) => Promise<FetchSuggestionsResponse>;
  debounceMs?: number; // default: 250ms
  minChars?: number;   // default: 2

  // Customization & A11y requirements
  renderOption?: (item: T, state: { highlighted: boolean; selected: boolean }) => React.ReactNode;
  placeholder?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
};
```

##### 3. Rich Accessibility (`FE7`) DOM & Keyboard Blueprint
Why this matters: Moving real DOM focus into `<li>` options breaks typing and Backspace. Instead, we implement the **WAI-ARIA APG Editable Combobox with Listbox Popup** pattern:

```tsx
<div className="autocomplete-root">
  <label id={labelId} htmlFor={inputId}>Search</label>
  <input
    id={inputId}
    role="combobox"
    aria-autocomplete="list"
    aria-expanded={isOpen}
    aria-controls={listboxId}
    aria-activedescendant={
      isOpen && highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined
    }
    aria-busy={isFetching}
    value={inputValue}
    onChange={handleChange}
    onKeyDown={handleKeyDown}
  />

  {/* Polite live region announces async result counts without interrupting typing */}
  <div role="status" aria-live="polite" className="sr-only">
    {announcementText /* e.g., "8 suggestions available" or "No results found" */}
  </div>

  {isOpen && (
    <ul id={listboxId} role="listbox" aria-labelledby={labelId}>
      {items.map((item, index) => {
        const isHighlighted = index === highlightedIndex;
        return (
          <li
            key={item.id}
            id={`${listboxId}-option-${index}`}
            role="option"
            aria-selected={isHighlighted}
            // Prevents input blur from firing and closing the popover before onClick completes
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setHighlightedIndex(index)}
            onClick={() => commitSelection(item)}
          >
            {renderOption ? renderOption(item, { highlighted: isHighlighted, selected: false }) : item.label}
          </li>
        );
      })}
    </ul>
  )}
</div>
```

| Interaction / Attribute | Exact Purpose & Screen-Reader / Keyboard Contract |
| :--- | :--- |
| **`role="combobox"` + `aria-autocomplete="list"`** | Tells assistive tech this text box controls a dynamic popup list of matching suggestions. |
| **`aria-expanded` + `aria-controls`** | Announces open/collapsed state and links the `<input>` to `<ul id={listboxId}>`. |
| **`aria-activedescendant`** | **Virtual Focus:** Keeps real DOM focus inside `<input>` while telling screen readers which `<li role="option">` is currently highlighted. |
| **`ArrowDown` / `ArrowUp`** | Moves `highlightedIndex` (wrapping cleanly) and calls `scrollIntoView({ block: 'nearest' })`. |
| **`Enter`** | Ignored if `e.nativeEvent.isComposing` (IME); if `highlightedIndex >= 0`, commits that option; otherwise submits raw query. |
| **`Escape`** | First press closes listbox (`isOpen = false`, `highlightedIndex = -1`) while preserving typed text; second press clears input. |
| **`onMouseDown={e.preventDefault()}`** | Prevents mouse click on a suggestion from blurring `<input>` and unmounting the listbox before `onClick` fires. |
| **`role="status"` (`aria-live="polite"`)** | Announces result counts (*"10 suggestions available"*) after network load without stealing focus or interrupting speech. |

---

#### O · Optimizations, Edge Cases & Observability (`FE5` + `FE11`) (10 min)

1. **Multi-Layer Race Condition Protection (`FE4`):**
   * **Debounce (`250ms`):** Eliminates redundant calls during fast bursts.
   * **`AbortController`:** Cancels in-flight HTTP requests the moment a newer debounced query fires.
   * **Current-Input / Generation Guard:** Before rendering resolved items, verify the response query still matches the latest normalized input (protects against responses that resolve just before `abort()` lands).
2. **Perceived Zero-Latency (Prefix Cache Filtering):**
   * If `"rea"` is already cached and the user types `"react"`, immediately filter `"rea"`'s cached items on the client (or show `placeholderData: keepPreviousData`) while `"react"` fetches in the background—eliminating empty-dropdown flicker.
3. **Input, Layout & Scale Edge Cases:**
   * **`minChars` & Focus Behavior:** Skip network calls below `minChars` (e.g., `< 2` chars) and show locally persisted recent searches on focus.
   * **Safe Match Highlighting (`FE8`):** Highlight matched substrings using `matchRanges` or plain text splitting (`<mark>`)—never `dangerouslySetInnerHTML` on query strings (prevents DOM XSS).
   * **Viewport & Virtualization:** Render the listbox in a Portal with flip positioning near bottom viewport edges; virtualize rows (`@tanstack/react-virtual`) if `items.length > 100`.
   * **RTL & Mobile (`FE7`):** Use logical CSS (`padding-inline-start`), `dir="auto"` on user-generated labels, and `>= 44px` touch targets on mobile.
4. **Failure Modes & Observability (`FE11`):**
   * **Degraded Mode:** If the suggestion API times out or errors, show a subtle inline message inside the popover (*"Suggestions unavailable — press Enter to search"*) so core search never breaks.
   * **RUM Metrics:** Track **keystroke-to-suggestion latency (p75 / p95)**, **API error / abort rates**, and **zero-result query rate** (to tune backend search relevance).
<details>
<summary>2 · News Feed — Part 1: R · A · D (Requirements, Architecture & Data Model)</summary>

**Framework:** RADIO (FE1) · **Key Modules:** FE2 Rendering Strategies · FE3 State & Data Model · FE4 Network Layer · FE5 Performance · FE6 Offline & Storage · FE7 Accessibility · FE8 Security · FE11 Observability

---

###### R · Requirements & Scope (5 min)
* **Core Functional Flows:**
  * Infinite-scroll feed of news cards (`image`, `title`, `summary`, `source`, `publishedAt`, `viewer.liked`, `viewer.saved`).
  * Filter & sort controls: `category` (`politics`, `sports`, `markets`, etc.), `country`, `dateRange` (`createdFrom` / `createdTo`), and `sort` (`popular` | `recent`), defaulting to recent popular news.
  * Clicking a card opens an **Article Detail** view (`/article/:slug`), plus lightweight card interactions (`like` / `bookmark`).
  * Non-disruptive feed refresh via a *"New stories available"* banner (never auto-inserting items above the user's reading position).
* **Non-Functional Goals:**
  * **Public vs. Logged-In Split (FE2):** Fast **LCP (< 2.5s)** and SEO/social previews for public visitors; personalized ranking for authenticated users.
  * **Interaction Responsiveness (INP < 200ms):** Smooth scrolling across thousands of cards and instant filter switches.
  * **Zero Layout Shift (CLS < 0.1):** Reserved media aspect ratios and matching skeletons before images load.
  * **Full WAI-ARIA Accessibility (FE7):** Semantic feed/article structure, keyboard navigation across virtualized cards, screen-reader media alt text, and polite live-region announcements.
  * **Resilience & Offline (FE6 / FE11):** Graceful partial-page error recovery + offline reading of already-cached stories.
* **Out of Scope (First Pass):** Article CMS/authoring, nested comment threads, video streaming player internals, ML recommendation ranking logic.

---

###### A · High-Level Client Architecture (10 min)
```text
Browser / App Shell
  ├─ Routing & URL State (/?category, ?country, ?from, ?to, ?sort, /article/:slug)
  ├─ Rendering Strategy Split (FE2)
  │    ├─ Public Feed & Article Detail ──► SSR / ISR (SEO + fast LCP)
  │    └─ Logged-In Home Feed ──────────► CSR + Route Code Splitting
  ├─ Feed Feature Module
  │    ├─ FilterBar (WAI-ARIA controls -> syncs URL search params)
  │    ├─ FeedRefreshBanner ("New stories" pill -> preserves scroll anchor)
  │    ├─ VirtualizedFeedList (renders visible viewport + overscan)
  │    └─ NewsCard (fixed aspect-ratio media, optimistic like/bookmark)
  ├─ Server-State Cache (TanStack Query: infinite cursor pages + entity patches)
  ├─ Freshness Channel (SSE / background poll -> invalidation flag only)
  ├─ Network Client (REST/BFF, AbortController, retries, HttpOnly auth, RUM)
  └─ Service Worker + IndexedDB (SWR feed cache + offline article storage)
```

**Interview Line:** *"I separate URL filter state, server-cached cursor pages, and local UI state, and pick rendering per route: SSR/ISR for public SEO/LCP pages and CSR with virtualization for the authenticated personalized feed."*

---

###### D · Data Model & State Ownership (FE3) (5 min)
Split state across **three ownership layers** so shareable filters, paginated entities, and local UI never collide:

```ts
// 1. URL State (Shareable, refresh-safe, Back/Forward friendly)
type FeedUrlFilters = {
  category?: string;
  country?: string;
  createdFrom?: string; // ISO date
  createdTo?: string;   // ISO date
  sort: 'popular' | 'recent'; // default: 'popular'
};

// 2. Domain & Server Cache Entities (Owned by TanStack Query)
type Source = { id: string; name: string; logoUrl: string };

type NewsArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body?: string; // populated on article detail fetch
  category: string;
  country: string;
  publishedAt: string;
  source: Source;
  coverImage?: {
    url: string;
    width: number;
    height: number;
    alt: string;
  };
  viewer: { liked: boolean; saved: boolean };
  counts: { likes: number };
};

type FeedPage = {
  items: NewsArticle[];
  nextCursor?: string;
  serverTime: string;
};

// Query key encodes auth scope + normalized URL filters so user caches stay isolated
// queryKey = ['feed', viewerId ?? 'public', normalizedFilters]

// 3. Derived & Local UI State
type FeedUIState = {
  newStoriesCount: number;    // toggled by SSE/poll; shows refresh pill instead of auto-inserting
  scrollAnchorId?: string;    // restores position when returning from /article/:slug
  focusedCardIndex: number;   // tracks keyboard focus across virtualized rows
};
```

**Key State Design Decisions:**
* **Normalized Entity Updates Across Surfaces:** When a user likes/bookmarks a card, update the matching `NewsArticle` across both `['feed', ...]` pages and `['article', slug]` cache entries in `onMutate` (with snapshot rollback on error) so feed and detail views never diverge.
* **Derived Feed Items (No Duplicate State):** Flatten `data.pages.flatMap((p) => p.items)` (deduplicated by `article.id`) via a memoized selector rather than copying items into a separate `useState` array.
</details>
<details>
<summary>2 · News Feed — Part 2: I · O (Interface, Accessibility Blueprint & Optimizations)</summary>

###### I · Interface Definition & Accessibility Contract (FE4 + FE7) (10 min)

###### 1. REST / BFF API Contract
```http
GET  /api/feed?category=markets&country=IN&createdFrom=2026-11-01&sort=popular&cursor=opaque&limit=20
GET  /api/articles/:slug
POST /api/articles/:id/bookmark
POST /api/articles/:id/like
```

```ts
type FetchFeedParams = FeedUrlFilters & {
  cursor?: string;
  limit: number;
  signal: AbortSignal; // Cancels stale filter/page fetches when user changes filters rapidly
};

type FetchFeedResponse = {
  items: NewsArticle[];
  nextCursor?: string;
  serverTime: string;
};

type ToggleInteractionInput = {
  articleId: string;
  active: boolean;
  idempotencyKey: string; // Prevents duplicate toggles on flaky network retries
};

// Lightweight SSE invalidation stream (signals freshness without jumping scroll)
type FeedFreshnessEvent =
  | { type: 'new-stories'; countHint: number }
  | { type: 'article.updated'; articleId: string; counts: { likes: number } };
```

###### 2. Rich Accessibility (FE7) DOM & Keyboard Blueprint
Why this matters: Infinite virtualized feeds can trap screen-reader users, lose focus when offscreen items unmount, or spam speech output during live updates. We implement the **WAI-ARIA Feed Pattern** + semantic controls:

```tsx
<section aria-label="News filters">
  {/* Native <select> / <fieldset> controls give free keyboard & screen-reader semantics */}
  <label htmlFor="filter-category">Category</label>
  <select id="filter-category" value={filters.category} onChange={handleCategoryChange}>
    <option value="">All Categories</option>
    <option value="politics">Politics</option>
    <option value="sports">Sports</option>
    <option value="markets">Stock Market</option>
  </select>
  {/* Country, Date Range (<input type="date">), and Sort radio/select controls */}
</section>

{/* Polite live region announces filter updates & new story availability without stealing focus */}
<div role="status" aria-live="polite" className="sr-only">
  {announcement /* e.g., "Showing 20 popular articles in Markets" or "5 new stories available" */}
</div>

{newStoriesCount > 0 && (
  <button type="button" onClick={handleRefreshFeed}>
    {newStoriesCount} new stories available — Refresh feed
  </button>
)}

{/* WAI-ARIA Feed container */}
<div role="feed" aria-busy={isFetchingNextPage} aria-label="News stories">
  {visibleVirtualItems.map((article) => (
    <article
      key={article.id}
      aria-posinset={article.absoluteIndex + 1} // Exact 1-based position even when virtualized!
      aria-setsize={totalKnownCount ?? -1}     // -1 tells screen readers total length is unknown/infinite
      aria-labelledby={`title-${article.id}`}
      aria-describedby={`summary-${article.id}`}
      tabIndex={0}
      onKeyDown={handleArticleKeyDown}         // PageDown / PageUp jumps to next/prev article
    >
      {article.coverImage && (
        <div className="media-box" style={{ aspectRatio: '16 / 9' }}>
          <img
            src={article.coverImage.url}
            alt={article.coverImage.alt}
            width={article.coverImage.width}
            height={article.coverImage.height}
            loading={article.absoluteIndex < 2 ? 'eager' : 'lazy'}
            fetchPriority={article.absoluteIndex === 0 ? 'high' : 'auto'}
          />
        </div>
      )}
      <h2 id={`title-${article.id}`}>
        <a href={`/article/${article.slug}`}>{article.title}</a>
      </h2>
      <p id={`summary-${article.id}`}>{article.summary}</p>
      <button
        type="button"
        aria-pressed={article.viewer.saved}
        aria-label={article.viewer.saved ? `Remove ${article.title} from bookmarks` : `Bookmark ${article.title}`}
        onClick={() => toggleBookmark(article)}
      >
        {article.viewer.saved ? 'Saved' : 'Save'}
      </button>
    </article>
  ))}
</div>
```

| Attribute / Interaction | Exact Purpose & Screen-Reader / Keyboard Contract |
| :--- | :--- |
| **`role="feed"` + `<article>`** | Groups dynamically loading articles into a structured feed landmark for assistive technology. |
| **`aria-posinset` + `aria-setsize="-1"`** | Preserves true item position (e.g., *"Article 42"*) even though virtualization only mounts ~15 DOM nodes; `-1` signals an open-ended infinite stream. |
| **`aria-busy={isFetchingNextPage}`** | Tells screen readers more articles are loading when the user scrolls near the bottom sentinel. |
| **`PageDown` / `PageUp` (APG Feed Keys)** | Lets keyboard users jump cleanly from one `<article>` card to the next/previous card without tabbing through every inner link/button. |
| **Native `<select>` / `<input type="date">`** | Gives built-in keyboard, mobile picker, and label semantics for category/country/date filters without custom ARIA overhead. |
| **`aria-pressed` on Like / Bookmark** | Announces toggle button state (*"Save, toggle button, not pressed"* -> *"pressed"*). |
| **Virtualization Focus Guard** | Never unmount the currently focused `<article>` while keyboard focus is inside it, and restore focus by `article.id` when returning from `/article/:slug`. |

---

###### O · Optimizations, Resilience & Observability (FE5 + FE6 + FE8 + FE11) (10 min)
1. **Core Web Vitals (`LCP`, `CLS`, `INP`):**
   * **LCP:** SSR/ISR first page on public routes; `fetchPriority="high"` + eager loading **only** on the first 1–2 above-the-fold card images; responsive `srcset`/`sizes` + AVIF/WebP CDN transforms; `preconnect` to image CDN.
   * **CLS:** Every card media container reserves `aspect-ratio: 16 / 9` (`width`/`height` attributes) before image bytes arrive; skeletons match exact card height; *"New stories"* pill floats or sits in a reserved slot instead of pushing content down.
   * **INP:** Windowed virtualization (`@tanstack/react-virtual` with dynamic height measurement) keeps DOM nodes capped (~20–30 cards); `React.memo` on `NewsCard` with primitive/stable callbacks prevents liking one card from re-rendering the list; route-split `/article/:slug`.
2. **Network & Pagination Resilience (FE4):**
   * **Cursor Pagination + Prefetch:** Opaque cursor prevents duplicate/skipped articles when breaking news inserts at the top; prefetch next page via `IntersectionObserver` ~2 viewports before the bottom; cap retained pages (`maxPages`) to bound mobile memory.
   * **Cancellation:** Pass `AbortSignal` into `fetch` so rapid filter/date/sort changes abort superseded requests immediately.
   * **Partial Page Failure:** If page 4 fails, keep pages 1–3 visible and render an inline *"Failed to load more — Retry"* button at the bottom instead of a full-screen error.
3. **Offline Reading & Logout Hygiene (FE6 + FE8):**
   * **Service Worker:** `Cache-First` for hashed JS/CSS chunks; `Stale-While-Revalidate` for `/api/feed` GETs and article thumbnails; `IndexedDB` outbox with `Idempotency-Key` for offline bookmarks.
   * **Security & Logout Cleanup:** Sanitize any rich HTML on `/article/:slug` with DOMPurify (or structured `RichNode` AST), validate external source links (`https:`/`http:` only), and wipe user-scoped `Cache Storage` + `IndexedDB` feed stores on logout.
4. **Observability & Monitoring (FE11):**
   * **RUM Web Vitals:** Track **LCP, INP, and CLS at p75 / p95** segmented by route (`public-feed` vs. `home-feed`), device class, and connection speed—sent via `navigator.sendBeacon` on `visibilitychange: hidden`.
   * **Feed Health SLIs:** Track `feed_load_error_rate`, `image_error_rate`, filter-change latency, and attach `traceparent` headers to correlate slow feed queries with backend traces.
</details>
<details>
<summary>3 · Chat App — Realtime Messaging (Frontend System Design · RADIO · Spoken-First Summary)</summary>

**Framework:** RADIO (FE1) · **Key Modules:** FE2 Rendering · FE3 State & Data Model · FE4 Network + Realtime · FE5 Performance · FE6 Offline & IndexedDB · FE7 Accessibility · FE8 Security · FE11 Observability

---

###### R · Requirements & Scope (5 min) — What to Say First
* **Core Functional Flows:**
  * Room/conversation sidebar (sorted by latest activity + unread badge) and an active message thread.
  * Text messages with delivery states (`sending` -> `sent` -> `delivered`/`read`), bidirectional infinite scroll (older history upward, new messages downward), and unread divider (`New messages`).
  * Ephemeral realtime indicators: typing indicators and online presence.
  * Offline message queueing: user can hit Send offline/mid-blip and the message reliably delivers on reconnect.
* **Non-Functional Goals:**
  * **Instant Send Latency (< 50ms UI feedback):** Optimistic local append with crash-safe durability.
  * **Strict Ordering & Zero Duplicates:** Messages never reorder randomly or appear twice when HTTP ack and WebSocket broadcast race.
  * **Smooth Scroll & Low INP:** Virtualized long threads + scroll anchoring so reading history never jumps when new messages arrive.
  * **Accessibility (FE7) & Security (FE8):** Polite screen-reader summaries (never reading every incoming message mid-sentence) + strict XSS sanitization on user text/links.
* **Out of Scope (First Pass):** End-to-end encryption key exchange, voice/video calling (WebRTC), message search indexing, media transcoding pipelines.

**Interview Opener:** *"Since this is an authenticated workspace where realtime ordering, offline durability, and scroll stability matter far more than SEO, I'll optimize for CSR + IndexedDB hydration, dual REST + WebSocket transport, and sequence-based reconciliation."*

---

###### A · High-Level Client Architecture (8 min)
```text
Browser / App Shell (CSR + Route/Feature Code Splitting)
  ├─ URL State (/rooms/:roomId) ──► Active room selection (refresh & Back/Forward safe)
  ├─ UI & Feature Modules
  │    ├─ RoomListSidebar (virtualized if 100s of rooms, unread badges, presence dots)
  │    ├─ MessageThread (bidirectional virtualizer + scroll anchor + "↓ N new messages" pill)
  │    └─ Composer (local draft per room + attachment uploader + optimistic send)
  ├─ Client State & Storage Layer
  │    ├─ Normalized Message Store (messagesById + orderedIdsByRoom + lastAckSeq)
  │    ├─ Ephemeral Realtime Store (typingByRoom + presence with short TTL)
  │    └─ IndexedDB Outbox & Room Cache (survives refresh/crash; coordinated across tabs)
  └─ Dual Transport Layer
       ├─ WebSocket Client (live messages, acks, read receipts, typing; exponential backoff + jitter)
       └─ REST / BFF Client (upward history pagination, reconnect gap-fill, media presigned uploads)
```

**Key Architecture Talking Points:**
1. **Why CSR (FE2):** Authenticated app with zero SEO value; shipping a lightweight shell + hydrating cached rooms from **IndexedDB** immediately makes startup feel instant.
2. **Why Dual Transport (`WebSocket` + `REST`):** WebSocket handles low-latency bidirectional events (`send`, `ack`, `typing`, `read`); REST handles cacheable pagination (`beforeSeq`), reconnect gap-fill (`afterSeq`), and file uploads.
3. **Ephemeral vs. Durable Split:** Never mix `typing...` or `online` dots into your durable message store—keep them in an in-memory map with a ~5s expiry TTL and never persist or gap-fill them.

---

###### D · Data Model & State Ownership (FE3) (7 min)
```ts
// 1. URL State: /rooms/:roomId (deep-linkable, survives refresh)

// 2. Durable Domain & Room State (Normalized + IndexedDB backed)
type Message = {
  id: string;                 // canonical server ID (initially equals clientId while sending)
  clientId: string;           // client UUID = Idempotency-Key for dedup
  roomId: string;
  senderId: string;
  text: string;
  status: 'sending' | 'sent' | 'failed';
  serverSeq?: number;         // authoritative server ordering per room (assigned on ack)
  createdAt: string;
};

type RoomState = {
  roomId: string;
  messagesById: Record<string, Message>;
  orderedIds: string[];       // sorted by serverSeq; local 'sending' items pinned at tail
  lastAckSeq: number;         // highest contiguous serverSeq seen -> drives gap-fill
  lastReadSeq: number;        // drives "Unread messages" divider & badge count
};

// 3. Local & Ephemeral UI State
type ChatUIState = {
  draftByRoom: Record<string, string>;
  isAtBottom: boolean;        // controls auto-scroll vs. floating "↓ N new messages" pill
  unreadWhileScrolledUp: number;
  connectionStatus: 'connected' | 'reconnecting' | 'offline';
  typingByRoom: Record<string, Record<string, number>>; // userId -> expiresAt timestamp
};
```

**Key Data Model Talking Points:**
* **Why `clientId` + `serverSeq`:** Client clocks lie—never sort messages by client timestamp. Sort confirmed messages by monotonic `serverSeq` (per room) and keep unconfirmed `sending` messages at the bottom until `serverSeq` arrives.
* **Normalized `messagesById`:** Edits, deletes, and read receipts patch one object in $O(1)$ instead of scanning arrays.

---

###### I · Interface Definition & Protocols (FE4 + FE7) (10 min)
* **REST Endpoints (History & Recovery):**
  * `GET /api/rooms/:id/messages?beforeSeq={oldestSeq}&limit=30` — upward scroll pagination.
  * `GET /api/rooms/:id/messages?afterSeq={lastAckSeq}` — **reconnect gap-fill** to fetch missed messages.
  * `POST /api/rooms/:id/messages` (with `Idempotency-Key: clientId`) — HTTP fallback/durable send path.
* **WebSocket Event Contract (Bidirectional):**
  * **Client -> Server:** `message.send` (`{ clientId, roomId, text }`), `receipt.read` (`{ roomId, upToSeq }`), `typing.start` (throttled once every 3s).
  * **Server -> Client:** `message.ack` (`{ clientId, serverId, serverSeq }`), `message.new` (`Message`), `receipt.updated`, `typing.update`.
* **Accessibility Contract (FE7 — Say These 3 Points):**
  * **No Live-Region Spam:** Use a single `aria-live="polite"` status announcer for **summaries only** (*"3 new messages in Design Team"* when unfocused/scrolled up)—never read every incoming message aloud while the user is typing.
  * **Keyboard & Focus:** `Enter` sends (unless `Shift+Enter` for newline or `isComposing` during Hindi/CJK IME input); `Escape` returns focus to the composer; visible focus rings across room items and message actions.
  * **Semantic Landmarks:** `<nav aria-label="Conversations">` for room list, `<main>` + `role="log"` for active message history, and clear accessible labels on attachment/send buttons.

---

###### O · Optimizations, Failure Modes & Observability (FE5 + FE6 + FE8 + FE11) (10 min)
1. **Optimistic Send + IndexedDB Outbox + Two-Channel Dedup (FE6):**
   * On Send: generate `clientId` UUID -> render bubble immediately (`status: 'sending'`) -> write to **IndexedDB outbox** (async, non-blocking, unlike `localStorage`) -> transmit over WebSocket (or HTTP POST).
   * **Crash / Offline Recovery:** Flush pending IndexedDB outbox on **app startup**, on `online` event, and on WebSocket reconnect. Use **`navigator.locks`** so multiple open tabs don't replay the same outbox simultaneously.
   * **Two-Channel Dedup:** Whether `message.ack` or room broadcast `message.new` arrives first, match by `clientId` -> swap in `serverId` + `serverSeq`, flip `status: 'sent'`, remove from IndexedDB outbox, and ignore the second duplicate arrival.
2. **Reconnect Ordering & Gap-Fill (FE4):**
   * On disconnect: show a subtle non-blocking *"Reconnecting…"* status bar (composer stays usable!). Reconnect with **exponential backoff + jitter** to avoid thundering herd.
   * While gap-filling: buffer incoming live WS events -> call `GET /rooms/:id/messages?afterSeq={lastAckSeq}` -> merge buffered + fetched messages -> deduplicate by `serverId`/`clientId` -> sort by `serverSeq`.
3. **Scroll Anchoring & Bidirectional Virtualization (FE5):**
   * Virtualize messages (`@tanstack/react-virtual`) so 10,000+ messages in a room keep DOM nodes (~30–50) and **INP** fast.
   * **Prepending older messages:** Record `scrollHeight` before prepend and adjust `scrollTop` by the delta so the user's viewport stays locked on the same message.
   * **Incoming new messages:** Auto-scroll **only** if `isAtBottom === true`; otherwise increment `unreadWhileScrolledUp` and show a floating *"↓ New messages"* pill.
4. **Security & Logout Hygiene (FE8) + Observability (FE11):**
   * **Security:** Escape plain text by default; sanitize any markdown/links with DOMPurify + allowlist `https:`/`http:` URLs (`rel="noopener noreferrer"`); wipe user IndexedDB rooms/outbox on logout.
   * **Observability (RUM SLIs):** Measure **send-to-ack latency (p75 / p95)**, **reconnect gap-fill duration**, **outbox failure rate**, and **scroll INP**—sent via `navigator.sendBeacon` on `visibilitychange: hidden`.
</details>
<details>
<summary>5 · E-commerce Storefront & Checkout (Frontend System Design · RADIO · Spoken-First Summary)</summary>

**Framework:** RADIO (FE1) · **Key Modules:** FE2 Hybrid Rendering · FE3 State & SKU Model · FE4 Network & Idempotency · FE5 LCP & Image Pipeline · FE7 Accessibility · FE8 Payment/XSS Security · FE11 Observability

---

###### R · Requirements & Scope (5 min)
* **Core Functional Flows:**
  * **Discovery:** Home, Category (`/c/:slug`), and Search/Filter (`/search?q=...&sort=&brand=`) with URL-synced facets.
  * **Product Detail Page (`/p/:slug`):** High-res image gallery, variant selector (`color` / `size` -> `skuId`), live price/inventory check, and `Add to Cart`.
  * **Cart & Checkout (`/cart`, `/checkout`):** Guest-to-logged-in cart merge, address/shipping selection, coupon validation, and safe payment submission -> Order Confirmation (`/orders/:id`).
* **Non-Functional Goals:**
  * **SEO + Fast LCP (< 2.5s) on Public Catalog (FE2 + FE5):** Crawlability, rich social/structured metadata, and sub-second CDN delivery for category/product pages.
  * **Zero Layout Shift (CLS < 0.1):** Reserved gallery/card aspect ratios and skeleton slots for dynamic price/promo blocks.
  * **Checkout Correctness & Safety (FE4 + FE8):** Zero double-charges, no stale stock/price surprises, PCI-isolated card inputs, and full WAI-ARIA form/gallery accessibility (FE7).
* **Out of Scope (First Pass):** Seller inventory ERP, warehouse fulfillment routing, recommendation ML models, complex multi-currency tax engines.

**Interview Opener:** *"E-commerce mixes two opposite constraints: public catalog pages need CDN speed, SEO, and fast hero LCP, while cart and checkout need strict freshness, zero double-charges, and PCI isolation—so I'll use a hybrid rendering strategy per surface."*

---

###### A · High-Level Client Architecture (8 min)
```text
Browser / App Shell
  ├─ Hybrid Rendering Split (FE2)
  │    ├─ Home & Category (/c/:slug) ───────► SSG / ISR (CDN cached, SEO + fast TTFB)
  │    ├─ Product Detail (/p/:slug) ────────► ISR HTML Shell + Dynamic Price/Stock Island
  │    ├─ Search Results (/search?...) ─────► SSR / Streaming SSR (dynamic query facets)
  │    └─ Cart & Checkout (/cart, /checkout) ► CSR (auth-only, Cache-Control: no-store)
  ├─ Catalog & PDP Feature Modules
  │    ├─ FacetSidebar & SortBar (syncs URL search params; AbortController on rapid filter)
  │    ├─ ProductGallery (eager LCP main image + srcset/AVIF + thumbnail preloading)
  │    └─ VariantBuyBox (resolves color+size -> skuId; live stock/price revalidation)
  ├─ Cart & Checkout Feature Modules (Lazy-Loaded Route Split)
  │    ├─ CartStore (Guest localStorage -> POST /api/cart/merge on login -> Server Query)
  │    └─ CheckoutFlow (RHF + Zod validation, PSP Hosted Iframe SDK, Idempotency-Key)
  └─ Network & Observability Layer (typed fetch, retries on safe GETs only, RUM Web Vitals)
```

---

###### D · Data Model & State Ownership (FE3) (7 min)
```ts
// 1. URL State (Shareable, Back/Forward & SEO friendly)
type CatalogUrlParams = {
  q?: string;
  category?: string;
  brand?: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'rating';
  page?: number;
};

// 2. Domain & Server Cache Entities (TanStack Query)
type SkuVariant = {
  skuId: string;
  attributes: { color?: string; size?: string };
  priceCents: number;
  compareAtPriceCents?: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  maxPurchasableQty: number;
};

type ProductDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  images: Array<{ url: string; alt: string; width: number; height: number }>;
  variants: SkuVariant[];
  defaultSkuId: string;
};

// 3. Cart & Checkout State
type CartItem = {
  skuId: string;
  productId: string;
  title: string;
  variantLabel: string;
  unitPriceCents: number; // server-authoritative snapshot
  qty: number;
};

type CheckoutSession = {
  checkoutAttemptId: string; // UUID -> sent as Idempotency-Key on payment
  addressId?: string;
  shippingMethodId?: string;
  couponCode?: string;
  serverTotals: { subtotalCents: number; taxCents: number; shippingCents: number; totalCents: number };
};
```

**Key Data Model Talking Points:**
* **Product vs. SKU Split:** A product page (`/p/:slug`) holds shared metadata/images, while **inventory, price, and Add-to-Cart bind to a concrete `skuId`** (`color` + `size`). Disable unavailable combinations upfront so users don't hit dead ends.
* **Server-Authoritative Pricing:** Never compute final totals on the client—send `{ skuId, qty, couponCode, addressId }` and render `serverTotals` returned by the BFF.

---

###### I · Interface Definition & Accessibility Contract (FE4 + FE7) (10 min)
* **REST / BFF Endpoints:**
  * `GET /api/products/:slug/availability` — lightweight non-cached (`no-store`) live stock/price endpoint hydrated on PDP mount so ISR HTML never sells out-of-stock SKUs.
  * `POST /api/cart/items` & `POST /api/cart/merge` — merges `guestCartId` items into authenticated user cart on login.
  * `POST /api/checkout/quote` — validates address, coupon, and stock, returning canonical `serverTotals`.
  * `POST /api/checkout/orders` (Header: `Idempotency-Key: checkoutAttemptId`) — creates order + confirms payment intent safely.
* **Accessibility Contract (FE7 — Say These 3 Points):**
  * **Variant & Filter Controls:** Use semantic `<fieldset>` + `<legend>` + radio inputs (`aria-checked`, `aria-disabled`) for size/color swatches so screen readers announce *"Size Large, unavailable"*.
  * **Accessible Checkout Forms:** Associate every `<label htmlFor>`, link field errors via `aria-describedby` + `aria-invalid="true"`, and move focus to the first invalid field (or error summary banner) on submit failure.
  * **Live Cart Feedback:** Announce *"Added Blue Running Shoe, Size 10 to cart"* via `aria-live="polite"` without trapping focus.

---

###### O · Optimizations, Safe Checkout & Observability (FE5 + FE8 + FE11) (10 min)
1. **5-Layer Safe Buying Architecture (FE4 + FE8):**
   * **Pessimistic Payment Submission:** Never optimistically confirm an order—disable Pay immediately (`isSubmitting`), show explicit processing feedback, and navigate to `/orders/:id` only on canonical `200 OK`.
   * **Idempotency Keys:** Generate `checkoutAttemptId` UUID per checkout session; if network drops or user refreshes mid-request, retrying with the same `Idempotency-Key` returns the existing order without double-charging (regenerate a new UUID only if the user edits cart/address).
   * **No Blind Auto-Retries on Payment:** Retry safe `GET`s with backoff, **never** auto-retry `POST /checkout/orders` without idempotency + explicit state verification (`GET /checkout/status/:attemptId`).
   * **PCI-DSS Scope Isolation:** Mount payment provider hosted fields (e.g., Stripe Elements iframe) lazily on `/checkout`—raw card PAN/CVV never enters React state or JS memory.
   * **Price / Stock Drift Guard (`409 Conflict`):** If price or inventory changes right before Pay, highlight the exact item delta and require explicit user confirmation before charging.
2. **Core Web Vitals (`LCP`, `CLS`, `INP`) on PDP & Catalog (FE5):**
   * **LCP:** ISR/CDN HTML + `fetchPriority="high"` + `loading="eager"` **only** on the primary hero product image (`srcset`/`sizes` + AVIF/WebP); lazy-load below-the-fold reviews and recommendations.
   * **CLS:** Reserve exact `aspect-ratio` on product cards and gallery containers, and reserve fixed height for dynamic price/discount badges so live availability hydration doesn't shift the Buy button.
   * **INP:** Route-split `/checkout` and heavy payment SDKs off the storefront bundle; cancel superseded catalog facet requests via `AbortController`.
3. **Observability & Funnel SLIs (FE11):**
   * Track **LCP/INP/CLS segmented by route** (`category` vs. `pdp` vs. `checkout`), plus funnel conversion & failure SLIs: `pdp_availability_error_rate`, `add_to_cart_latency`, `checkout_409_drift_rate`, and `payment_failure_rate` (with `requestId` for support).
</details>
