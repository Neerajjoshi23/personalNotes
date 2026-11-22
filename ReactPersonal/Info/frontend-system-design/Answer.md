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
