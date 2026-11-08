# SoundBlend – Review (current state, URL params + Blend)

Format: what was built, then **Doubts / Notes** where I flag things to ask about or revisit.
Autocomplete is built (fetch, schema, query, dropdown). Keyboard navigation is not.

## 1. Routing – `App.tsx`
- `AuthProvider` wraps `RouterProvider` (inside `QueryClientProvider`), so auth state is mounted once.
- `AppLayout` (sidebar on `lg`+, top bar below) is a layout route; children render in its `<Outlet/>`:
  - Public: `/` `HomePage`, `/signin` `SignInPage`, `/signup` `SignUpPage`, `*` `NotFoundPage`.
  - Protected (pathless route with `ProtectedRoute`): `/Search` `SearchPage`, `/Search/:kind/:id` `DetailPage` (artist or album tracks), `/Blend` `BlendPage`.
- Pages are loaded with `React.lazy`. `wrapInSuspense` adds the `Suspense` fallback; `wrapWithBoundary` puts an `ErrorBoundary` **outside** `Suspense`, so a failed chunk load shows the error fallback.
- Nav links use `<Link>` (a typed URL reloads the page and wipes non-persisted state).

## 2. `SearchPage/Pages/SearchPage.tsx`

### 2.1 State and query
- The query now lives in the shared hook `Hooks/useTracksInfiniteQuery.ts` (`(filters, enabled = true)`), so `DetailPage`
  (and later Blend) reuse it. Same key, `getNextPageParam` and `staleTime` as described below.
- State: `search` (raw input text) and `viewMode` are local. `q`, `genre`, `mood`, `order`, `category` live in the **URL**.
- `useSearchParams` gives `params`. `activeSearch = params.get("q") ?? ""`; the four filters use `pick(list, value)`,
  which accepts only known values and otherwise falls back to the default (`list[0]`).
- `setParam(key, value, default)` copies the params (`new URLSearchParams(prev)`), **deletes** the key when the value equals
  the default (short URL, one URL per state, no `?q=` on load), else sets it. `replace: true` so history is not filled up.
- `debouncedSearch = useDebounce(search, 500)`; an effect writes it to `q` (`setParam("q", debounced.trim())`).
- `search` starts from `q`, so Back / refresh / shared link restores the text and results.
- `filters: FetchFilter = { query: activeSearch, genre, mood, order, category }` (typed, no `as` cast).
- `useInfiniteQuery`:
  - `queryKey: ["search-songs", filters]` – **offset is not in the key**; TanStack tracks pages itself.
  - `queryFn: ({ pageParam, signal }) => fetchJamendoSongs({ ...filters, offset: pageParam }, signal)`.
  - `initialPageParam: 0`.
  - `getNextPageParam`:
    1. `lastPage.data.length < Limit` -> `undefined` (short page = done; also the fallback when total is missing)
    2. total known and `loaded >= total` -> `undefined`
    3. otherwise next offset = `allPages.length * Limit`
  - `staleTime: Infinity`.
  - `enabled`: search text is non-empty, **or** (category is `tracks` and genre/mood is set).
- `hasMore = !!hasNextPage` (derived by us, not returned by the hook).
- `filtersKey` includes `activeSearch, genre, mood, order, category`; used as `key` for `PaginatedList`.

### 2.2 Search input
- `<form>` with input + Search button. Enter also submits.
- Typing: updates `search` only; after the 500ms debounce the effect writes `q` to the URL -> search runs.
- Submit: `setParam("q", search.trim())` -> immediate, no debounce wait.
- Searching the same text again does not refetch (`staleTime: Infinity` -> cache).

### 2.3 Dropdowns
- Category is a segmented tab group (`tracks` / `artists` / `albums`); genre, mood, order are selects.
- Genre, mood, order are **disabled unless category is `tracks`** (API only supports them on `/tracks`).
- Each change calls `setParam` -> URL changes -> new query key -> new fetch.

### 2.3.1 Autocomplete
- State: `open` (dropdown visibility). `autoCompleteSuggestions = useDebounce(search, 500).trim()`.
- `useQuery`:
  - `queryKey: ["autocomplete", { prefix, entity: category }]`
  - `queryFn: ({ signal }) => fetchAutoComplete(params, signal)`
  - `enabled: open && prefix.length >= 2` (Jamendo rejects prefixes shorter than 2)
  - `staleTime: 5 min`
- `suggestions = prefix.length >= 2 ? (data?.results[category] ?? []) : []`; `showSuggestions = open && suggestions.length > 0`.
- Dropdown: absolutely positioned `<ul>` under the input (inside the `relative` wrapper).
  - Opens on focus / typing; closes on blur, Escape and submit.
  - Picking a suggestion sets `search` and `q` (searches immediately) and closes the list.
  - Uses `onMouseDown` + `preventDefault` so the input's blur does not close the list before the click lands.
  - `open` in `enabled` means picking a suggestion does not trigger another autocomplete fetch.
- Only `tracks`, `artists`, `albums` suggestions (the category); `tags` entity is not used.
- **Doubt/TODO:** no keyboard navigation (ArrowUp/Down/Enter) or ARIA roles (`listbox`/`option`) yet.

### 2.4 Render branches
1. `error` -> error message
2. `isFetching && allTracks.length === 0` -> skeleton list (`ListSkeleton`)
3. `allTracks.length > 0` -> list by `viewMode` (infinite or paginated)
4. `isFetching || data` -> empty state
5. otherwise -> idle state

### 2.5 Detail page (`Pages/DetailPage.tsx`)
- Route `/Search/:kind/:id`; `kind` must be `artists` or `albums`, otherwise "not found".
- Filters: `category: "tracks"`, empty query, genre/mood `"all"`, `order: "popularity_total"`, plus `artistId` or `albumId`.
- Calls `useTracksInfiniteQuery(filters)` and renders `InfiniteScrollList`; "Back" link to `/Search`.
- Title comes from the first loaded track (`artistName`, or `albumName` for albums), HTML-decoded; shown with the artwork.
- `Track` links non-track rows (artists, albums) to `/Search/${category}/${track.id}`.
- **Fixed:** Back used to remount `SearchPage` and reset its state. Committed search state is now in URL params, so Back restores it.
  `viewMode` is still local and resets on Back.

## 3. `Hooks/useDebounce.ts`
- **Fixed:** the `useRef` was removed; the effect cleanup clears the timer:
  `useEffect(() => { const id = setTimeout(...); return () => clearTimeout(id); }, [search, delay]);`
- Note: it is a *debounce* (fires once after a pause), not a throttle.

## 4. `Schema/jamendo.schema.ts`
- All Zod schemas live here; the app imports **types** from here.
- Every category (tracks, artists, albums) goes through `.transform` -> camelCase output, so `z.infer`/`z.output`
  types are consistent and the API's raw shape stays internal.
  - tracks: `id, name, artistName, albumName, artworkUrl, audio, duration, releaseDate`
  - artists: `id, name, artworkUrl, joinDate, website, shareUrl`
  - albums: `id, name, artistId, artistName, artworkUrl, releaseDate, shareUrl`
- `jamendoSchemaRegistry` maps category -> response schema; `CategoryType` derives from its keys.
- **Autocomplete schema:** `/autocomplete` returns `results` as an **object of string arrays**
  (`{ tags?, artists?, albums?, tracks? }`), only with the entities that matched, and as `[]` when nothing matches.
  - `JamendoAutocompleteSchema` = object with optional `string[]` keys.
  - `JamendoAutocompleteApiResponseSchema` = `createJamendoApiResponseSchema(JamendoAutocompleteSchema.or(z.array(z.never()).transform(() => ({}))))`
    so `results` is always an object (`[]` -> `{}`). The transform's return type is annotated so `results[category]` type-checks.
  - Lesson: `z.array(X)` means `[ X, X ]`; the API sends a single `X`. Compare brackets with the raw JSON.
  - It is **not** in `jamendoSchemaRegistry` (that is for the list endpoints that return paginated entities).
- The `[]` handling is only on autocomplete; tracks/artists/albums are covered by the early empty-results return in `fetchSongs`.
- `results_fullcount` is `number | string` (API returns a string). `results_count` is also allowed in headers.

### 4.1 `types.ts`
- All shared types in one file: `FetchParams` (with optional `artistId`, `albumId`), `FetchFilter`,
  `InfiniteQueryResponse`, `AutoCompleteParams`, `AutoCompleteResponse`. The list components and `fetchSongs`
  import from here (this removed the circular imports).

## 5. `api/fetchSongs.ts`
1. Build URL via `getFixedUrl(path)`: `BASE_URL/<path>` with `client_id`, `format=json`, `limit`.
2. `fetchJamendoSongs` also adds `fullcount=true` and `offset` (default 0).
3. `namesearch` when the trimmed query is non-empty.
   - `artist_id` (with `type=single albumtrack`, so singles are included) and `album_id` when passed (detail pages).
4. `tags` (genre), `fuzzytags` (mood), `order` only for `tracks`.
5. Response handling, in this order:
   - `!response.ok` -> throw
   - `headers.status === "failed"` -> throw `error_message` (Jamendo returns HTTP 200 on errors)
   - no results -> `{ totalItems: "0", data: [] }` (Zod not run)
   - `safeParse` fails -> `console.error` + throw "Invalid response format"
6. Success -> `{ totalItems: headers.results_fullcount ?? "0", data }`.

### 5.1 `fetchAutoComplete(params, signal)`
- `getFixedUrl("autocomplete")` + `prefix` + `entity` (the category). No `fullcount`/`offset` (not needed here).
- `fetch(url, { signal })` -> TanStack aborts the in-flight request when the key changes or the component
  unmounts (less wasted network; stale responses are ignored anyway).
- Same `!ok` and `status === "failed"` checks, then `safeParse` with the autocomplete schema.
- Returns `{ results }` where `results` is always an object.
- Jamendo `limit` is applied per entity (and is not strict).

- **Fixed (cleanups):**
  - `rawResponse: any` -> typed `RawResponse` (`headers?`, `results?: unknown`); the list check uses `Array.isArray`.
  - `getFixedUrl` throws if `VITE_JAMENDO_CLIENT_ID` is missing.
  - `signal` is now passed to `fetchJamendoSongs` (from the infinite query), so stale search requests are aborted too.
  - `releasedate_desc` / `name_asc` order values are only valid for tracks (already tracks-only).

## 6. Components

### 6.1 `PaginatedList`
- Props: `pages`, `hasMore`, `isFetchingNextPage`, `fetchNextPage`, `category`.
- Shows `pages[current].data`; Prev / Next.
- Prev: `current > 0` -> `current - 1`.
- Next: ignore if a page is fetching; if not on the last loaded page -> `+1`; else if `hasMore` -> fetch, then `+1`
  **only if the fetch did not error**.
- `current = Math.min(page, pages.length - 1)` guard.
  - `key={filtersKey}` already resets `page` on filter change, so the guard does not matter for that.
  - It matters only if `pages.length` shrinks while mounted and the key is unchanged (refetch with finite
    `staleTime`). With `staleTime: Infinity` it is effectively unreachable. Kept as a cheap safety net.

### 6.2 `InfiniteScrollList` (virtualised)
- `start = max(0, floor(scrollTop / ROW_HEIGHT) - OVERSCAN)`
- `end = min(length, ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN)`
- Outer div: `ref`, `onScroll` -> `scrollTop = e.currentTarget.scrollTop` (how far the inner content is scrolled).
- `ResizeObserver` on mount keeps `viewportHeight` current.
- `<ul>` height = `length * ROW_HEIGHT` (the "canvas"); each row `position: absolute; top = index * ROW_HEIGHT`.
- Sentinel + `IntersectionObserver` (`rootMargin: 100px`) -> `fetchNextPage()` when near the bottom.
  The observer is re-created after each page load so a still-visible sentinel triggers the next page.
- No `key` needed: on filter change the parent shows the loading branch, so the list unmounts and remounts.
- `ROW_HEIGHT` (68) is fixed; row content must stay within that height (`Track` rows are `h-14`).

### 6.3 `Track.tsx`
- `artworkUrl` for the image (fallback placeholder).
- Subtitle by shape: `artistName` (tracks, albums) else `website ?? joinDate ?? "Artist profile"`.
- Audio controls, duration and the "Blend" / "Added" button only for `tracks`. The button adds/removes the track in the
  store (`inBlend` selector); disabled when the blend is full (`MAX_TRACK` = 7) and the track is not in it.
- One track plays at a time (`isPlaying` / `onPlay` / `onPause` lifted to the list).
- Names are HTML-decoded (`utils/decodeHtml.ts`), since Jamendo returns entities like `&amp;`.

## 6.4 Blend store – `Store/useTracks.ts` (Zustand)
- State: `tracks: TrackControl[]` (track + `isIncluded` + `volume`), `isMasterPlaying`, `masterVolume`.
- `addTrack` returns `false` for a duplicate or a full list. Volumes are clamped to [0, 1].
- `deleteTrack` / `toggleIndividualInclusion` set `isMasterPlaying` to false when no included track remains
  (the rule lives in the store, not in a page effect).
- `persist` (`track-store`) with `partialize`: only `tracks` and `masterVolume` are saved.

## 6.5 Blend page – `BlendPage/`
- `BlendPage` subscribes to the id list (joined string, so only added/removed tracks re-render the list), master play,
  master volume and `hasActive`. Empty state links to `/Search`. Play is disabled when nothing is included.
- `BlendTrackRow` reads its own track from the store, owns one `<audio loop>` and:
  - effect 1: `el.volume = masterVolume * volume`
  - effect 2: plays when `isMasterPlaying && isIncluded`, else pauses
- Blending = several `<audio>` playing at once. Web Audio (`createMediaElementSource`) was dropped: Jamendo audio hosts
  send no CORS headers, so `crossOrigin="anonymous"` fails. Limits: no EQ/effects, small sync drift, `volume` ignored on iOS Safari.
- Deleting a playing track needs no explicit pause: the row unmounts, the `<audio>` leaves the DOM and the browser pauses it.

## 7. Auth (Supabase) and error handling

### 7.1 Supabase client – `superbaseclient.ts`
- One shared `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`. Only the anon key is used in the browser; the session is persisted in `localStorage` and tokens refresh automatically.

### 7.2 `Auth/`
- `Context/AuthContext.ts`: context with `user`, `session`, `loading`.
- `Provider/AuthProvider.tsx`: reads `getSession()` once, then subscribes to `onAuthStateChange` (unsubscribed on cleanup). `loading` stays true until the first session is known, so a refresh does not flash the login page. `useAuth()` throws outside the provider.
- `Components/ProtectedRoute.tsx`: loader while `loading`; no session -> `<Navigate to="/signin" replace state={{ from: location }} />`; else `<Outlet />`. The guard is a route wrapper, **not** a navigate call in `AppLayout`'s render (that was a side effect in render and redirected on every refresh).
- `Pages/SignInPage.tsx` / `Pages/SignUpPage.tsx`: React Hook Form. Rules: valid email, password >= 6 chars, sign-up also needs a matching confirmation. Supabase errors are shown via `setError("root", ...)`. Sign-up shows a "check your email" screen when no session comes back (email confirmation on). `authStyles.ts` holds the shared Tailwind classes.
- Return-to flow: the guard stores `from` (the full location) in router state (kept in the history entry, not in the URL). `getFromPath` turns it into `pathname + search + hash` (default `/`). After login or sign-up the page sees the session and renders `<Navigate to={from} replace />`. The Sign In / Sign Up links pass `state={location.state}`, so `from` survives switching pages. `replace` keeps the login page out of Back history.
- Email confirmation opens a new tab where router state is lost, so sign-up passes `emailRedirectTo: origin + from`. After confirming, the user lands on the page they wanted, already signed in. The redirect URL must be in Supabase's allowed Redirect URLs (`http://localhost:5173/**`).
- All auth text, validation messages and the password minimum come from `t()` (`auth.*` keys in `SearchPage/constants/messages.ts`).
- `AppLayout` shows a Sign Out button (sidebar and top bar) only when there is a session. `HomePage` shows Sign In / Sign Up only when logged out. The homepage stays public.

### 7.3 Error boundary – `components/ErrorBoundary.tsx`
- Class component with `getDerivedStateFromError` (shows the fallback), `componentDidCatch` (logs error + component stack) and a "Try again" button that resets its state.
- Catches render/lifecycle errors in its subtree (including failed lazy chunks). It does not catch event handlers or async code.

## 8. Open items
- Unit tests (Vitest + React Testing Library, mocked Supabase client) for the auth context, `ProtectedRoute`, the forms and `ErrorBoundary`.
