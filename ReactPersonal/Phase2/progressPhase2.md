# Phase 2 Progress — Core React Patterns

### 2.1 `useRef` — values that don't trigger renders

**Read:** [Referencing Values with Refs](https://react.dev/learn/referencing-values-with-refs) — fetched 2026-08-01

- `useRef(initialValue)` returns a plain mutable object shaped like
  ```js
  { current: initialValue }
  ```
  that survives across re-renders — same object identity every render, unlike a local `let` which resets to its initial value each time the function body runs.
- Mutating
  ```js
  ref.current = ref.current + 1
  ```
  does **not** schedule a re-render. Compare to `setState`, which always queues one — even if the new value is the same reference.
- Under the hood it's basically
  ```js
  function useRef(initialValue) {
    const [ref] = useState({ current: initialValue })
    return ref
  }
  ```
  so the "no re-render" behavior isn't magic — it's just that nothing ever calls the setter.
- **Gotcha:** using a ref to back something you render — e.g. a click counter shown in JSX — silently breaks. The state changes, but the DOM never updates because React was never told to re-render. This is the single most common "why isn't my UI updating" bug once someone reaches for `useRef` out of habit.
- **Gotcha:** a plain local variable declared inside the component function (not in a ref or state) does not persist between renders — e.g. a `let timeoutID` used to store a `setTimeout` handle gets wiped to its initial value on every re-render, so `clearTimeout` on it later does nothing.
- **Gotcha:** declaring a ref-like variable in module scope (outside the component) to "persist" it means every instance of that component shares the same value — two debounced buttons on the page will cancel each other's timers.
- Never read or write `ref.current` during rendering (the function body itself) — only in event handlers or effects. The one sanctioned exception is a lazy one-time init guard:
  ```js
  if (!ref.current) ref.current = new Thing()
  ```
  run inline in render but only on the very first pass.
- Refs update synchronously and immediately (`ref.current = 5` is instantly visible), unlike state, which is asynchronous/batched until the next render.
- **Interview angle:** "`useRef` vs `useState` — when do you reach for each?" → State for anything the JSX depends on (must trigger a re-render); refs for anything mutable that lives *outside* the render output — timer IDs, DOM nodes, previous-value tracking, instance-like mutable fields.
- **Interview angle:** "Does mutating a ref cause a re-render?" → No — that's the entire point of the hook; it's explicitly an escape hatch from React's data flow.

---

### 2.2 Manipulating the DOM with refs (focus, scroll)

**Read:** [Manipulating the DOM with Refs](https://react.dev/learn/manipulating-the-dom-with-refs) — fetched 2026-08-01

- Attach a ref to a JSX element with
  ```js
  <input ref={myRef} />
  ```
  and React populates
  ```js
  myRef.current
  ```
  with the actual DOM node — but only **after commit**. Before that first commit, and any time the node unmounts, `current` is `null`.
- Timing is precise: React sets DOM refs to `null` right before it updates the DOM, then re-populates them right after (the commit phase) — this is why you must never read a DOM ref during render, only from event handlers or effects.
- For a **dynamic list of refs** (e.g. one ref per list item), you can't call `useRef` inside `.map()` — that's a hooks-rules violation. Instead use a single ref holding a `Map`, and a ref-callback function per item:
  ```js
  function getMap() {
    if (!itemsRef.current) {
      itemsRef.current = new Map()
    }
    return itemsRef.current
  }
  ```
  ```js
  <li
    ref={(node) => {
      const map = getMap()
      map.set(item, node)
      return () => map.delete(item)
    }}
  />
  ```
- **Gotcha:** in Strict Mode (dev only), ref callbacks intentionally fire twice — this is React deliberately shaking out bugs in your cleanup logic, not a bug in React itself.
- **Gotcha:** batched state updates mean a ref-based DOM read (e.g. scrolling to the last list item right after adding one) can run *before* the DOM reflects the new state, so you scroll to the second-to-last item instead. Fix with
  ```js
  flushSync(() => {
    setTodos([...todos, newTodo])
  })
  ```
  which forces React to update the DOM synchronously before the next line runs.
- **Gotcha — the big one:** don't manually mutate DOM nodes React manages (e.g. calling `ref.current.remove()` on an element React also conditionally renders via `{show && <p ref={ref}>}`). React keeps its own internal model of the DOM tree; a manual removal desyncs that model from the real DOM, and a subsequent React-driven update can crash or produce visually broken output. The one safe case is manipulating a subtree React itself never touches — e.g. an empty container div you exclusively manage yourself via `appendChild`.
- Custom components don't receive a `ref` prop automatically — since React 19, `ref` is a normal prop, so a component just needs to accept and forward it (
  ```js
  function MyInput({ ref }) { return <input ref={ref} /> }
  ```
  ), which replaces the older `forwardRef` wrapper (`forwardRef` is now legacy).
- To expose a **restricted** imperative API instead of the raw DOM node (e.g. only allow `.focus()`, hide everything else), use `useImperativeHandle`:
  ```js
  useImperativeHandle(ref, () => ({
    focus() {
      realInputRef.current.focus()
    },
  }))
  ```
- **Interview angle:** "Why is `ref.current` `null` on first render?" → Refs to DOM nodes are only populated after commit — React hasn't touched the actual DOM yet during the render phase, so reading a ref there is always premature.
- **Interview angle:** "Give an example of when manipulating the DOM via a ref would break React." → Manually removing/appending a child on an element React also owns via conditional rendering — React's internal fiber tree no longer matches the real DOM, causing crashes or visual corruption on the next update.
- **Interview angle:** "How do you make sure a DOM read happens *after* a state update actually lands in the DOM?" → `flushSync` — forces the state update and its DOM commit synchronously, instead of letting React batch it.

---

### 2.3 `useEffect` lifecycle — when it runs, cleanup

**Read:** [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects), [Lifecycle of Reactive Effects](https://react.dev/learn/lifecycle-of-reactive-effects) — fetched 2026-08-02

- An Effect is for **side effects caused by rendering itself**, not by a specific user action. That's the line that separates it from an event handler.
  ```js
  // Event handler — caused by a click
  function handleClick() {
    fetch("/api/buy", { method: "POST" })
  }
  ```
  ```js
  // Effect — caused by rendering with a given roomId
  useEffect(() => {
    const connection = createConnection(roomId)
    connection.connect()
    return () => connection.disconnect()
  }, [roomId])
  ```
- Effects run **after commit** — after React has already updated the real DOM — never during render. That ordering is why it's safe to read/write DOM nodes or start network calls inside one, but not in the component body.
- **Not every Effect needs a cleanup function** — only Effects that need to *undo* something before running again. If the operation is idempotent (safe to call repeatedly with the latest value, no lingering state to unwind), skip cleanup entirely. Four recurring shapes of "what actually goes in an Effect":
  - **Controlling a non-React widget** — e.g. a third-party map instance stored in a ref, just re-issued with the latest value each time. No cleanup needed because calling `setZoomLevel` again is harmless:
    ```js
    useEffect(() => {
      const map = mapRef.current
      map.setZoomLevel(zoomLevel)
    }, [zoomLevel]) // no return — nothing to undo
    ```
  - **Subscribing to a browser event** — this *does* need cleanup, otherwise every re-run of the Effect stacks another listener on top of the last one instead of replacing it:
    ```js
    useEffect(() => {
      function handleScroll(e) {
        console.log(window.scrollX, window.scrollY)
      }
      window.addEventListener("scroll", handleScroll)
      return () => window.removeEventListener("scroll", handleScroll)
    }, [])
    ```
  - **Triggering an animation** — setup pushes a value in one direction, cleanup resets it, so mounting and un-mounting (or re-running) always leaves things in a known state:
    ```js
    useEffect(() => {
      const node = ref.current
      node.style.opacity = 1 // triggers the transition in
      return () => {
        node.style.opacity = 0 // resets on cleanup
      }
    }, [])
    ```
  - **Fetching data** — needs cleanup, but the cleanup isn't "undoing" a connection so much as marking the response as stale (see the `ignore` flag pattern below) — the docs are explicit that this is the weakest of the four patterns and you should reach for a framework's data layer or a cache library (TanStack Query, SWR) over hand-rolling it, because you also need to handle race conditions, caching, and deduping yourself.
- The dependency array controls re-run frequency:
  ```js
  useEffect(() => { /* runs after every render */ })
  ```
  ```js
  useEffect(() => { /* runs once, on mount only */ }, [])
  ```
  ```js
  useEffect(() => { /* runs on mount, and again whenever roomId changes */ }, [roomId])
  ```
  Comparison for each dependency uses
  ```js
  Object.is(prevValue, nextValue)
  ```
  same reference-equality check React uses elsewhere — which is why a freshly-created object or array literal as a dependency,
  ```js
  }, [{ roomId }])
  ```
  never equals the previous render's object and causes the Effect to re-run every single time.
- **Think in start/stop cycles, not mount/unmount.** The component lifecycle is mount → update → unmount; the Effect's lifecycle is a completely separate concern: start synchronizing → stop synchronizing, and that cycle can repeat many times over one component's life, once per dependency change:
  ```js
  useEffect(() => {
    const connection = createConnection(serverUrl, roomId) // START
    connection.connect()
    return () => {
      connection.disconnect() // STOP
    }
  }, [serverUrl, roomId])
  ```
  When `roomId` changes from `"general"` to `"travel"`, React runs the *old* cleanup first (disconnect from general), then the *new* Effect body (connect to travel) — not the other way around, and not both at once.
- **Reactive values are non-negotiable dependencies.** A "reactive" value is anything computed during render that can differ across renders — props, state, context, or any plain variable derived from those. If your Effect body reads it, the linter requires it in the array, full stop — you don't get to opt a reactive value out because "it doesn't need to trigger a re-run."
  ```js
  const settings = useContext(SettingsContext)      // reactive
  const url = serverUrl ?? settings.defaultServerUrl // also reactive — derived from reactive values
  useEffect(() => {
    const connection = createConnection(url, roomId)
    connection.connect()
    return () => connection.disconnect()
  }, [url, roomId]) // both required
  ```
  Two things are explicitly exempt because they're **not reactive** even though they look like they might be: a `ref.current` read (intentionally mutable, doesn't participate in render), and constants declared outside the component.
- **Gotcha — the "stale connection" bug:** omitting a reactive value from the array doesn't stop the code from using it — it just means the Effect keeps using the value from the render where it first closed over it. Example: a chat component that connects using `roomId` but lists `[]` as deps —
  ```js
  useEffect(() => {
    const connection = createConnection(serverUrl, roomId)
    connection.connect()
    return () => connection.disconnect()
  }, []) // BUG: roomId omitted
  ```
  The UI shows "Travel" as the selected room, but the actual socket connection never left "General" — a real, silent production bug, not just a lint nag.
- **Gotcha — the infinite loop.** Setting state unconditionally inside an Effect with no guard re-triggers a render, which re-runs the Effect, which sets state again:
  ```js
  useEffect(() => {
    setCount(count + 1) // re-render → Effect runs again → setCount again → ...
  })
  ```
  Docs' framing: "setting state in an Effect is like plugging a power outlet into itself."
- **Gotcha — using a ref as a "run once" guard doesn't fix anything, it just hides the symptom in dev:**
  ```js
  const connectionRef = useRef(null)
  useEffect(() => {
    if (!connectionRef.current) { // silences the double-connect log in Strict Mode...
      connectionRef.current = createConnection()
      connectionRef.current.connect()
    }
  }, [])
  ```
  ...but there's still no cleanup, so navigating away never disconnects. The dev-mode symptom (double "Connecting…" log) goes away, but the real bug (leaked connection) is still live in production.
- **Gotcha — race conditions in data fetching.** Fast prop changes (e.g. typing that changes a search query, or switching `userId` quickly) can fire multiple fetches; whichever *response* lands last wins, not whichever *request* was sent last — so a slow response for a stale query can overwrite fresh data. Guard with an `ignore` flag set in cleanup:
  ```js
  useEffect(() => {
    let ignore = false
    async function startFetching() {
      const json = await fetchTodos(userId)
      if (!ignore) {
        setTodos(json)
      }
    }
    startFetching()
    return () => {
      ignore = true // any in-flight response from this render is now discarded
    }
  }, [userId])
  ```
- **Gotcha — closures capture per-render snapshots.** Type "a", then "ab", then "abc" quickly into an input, each keystroke scheduling a 3-second timeout that logs the *current* `text`:
  ```js
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log("⏰ " + text) // this closure's own copy of text
    }, 3000)
    return () => clearTimeout(timeoutId)
  }, [text])
  ```
  Without a cleanup that clears the previous timeout, you don't get three logs of `"abc"` — you get `"a"`, `"ab"`, `"abc"`, one per render, because each Effect run closes over its own render's value of `text`. This is the same closure mechanic that causes stale-closure bugs elsewhere in React — it isn't unique to Effects.
- **Gotcha — Strict Mode double-invocation in dev is intentional, not a bug in your code.** In development only, React mounts, unmounts, then remounts a component once, specifically to prove your cleanup actually undoes what the Effect did:
  ```
  ✅ Connect     (dev-only synthetic mount)
  ❌ Disconnect  (dev-only synthetic unmount — tests your cleanup)
  ✅ Connect     (the real mount)
  ```
  If your Effect can't survive being started, stopped, and started again, it has a real bug that would also surface in production the first time a user navigates away and back. Don't suppress it — fix the cleanup.
- **Not every side effect belongs in an Effect.** Two common misfires:
  - App-wide initialization (checking an auth token, reading `localStorage` once) belongs at module load, not inside a component's Effect.
  - A side effect caused by *one specific user action* (e.g. a purchase POST on button click) belongs in the event handler, not an Effect with `[]` deps — "buying is not caused by rendering; it's caused by a specific interaction."
- **Gotcha — deriving state from other state doesn't need an Effect at all.** If the entire Effect body is just "recompute a value and call its setter," you've reinvented a value you could compute directly during render:
  ```js
  // ❌ unnecessary Effect
  useEffect(() => {
    setFullName(`${firstName} ${lastName}`)
  }, [firstName, lastName])
  ```
  ```js
  // ✅ just compute it inline, no Effect, no extra render
  const fullName = `${firstName} ${lastName}`
  ```
- **One Effect per synchronization concern.** Bundling unrelated logic (analytics logging + a socket connection) into a single Effect means adding a dependency one concern needs forces an unwanted re-run of the other:
  ```js
  // ❌ two unrelated concerns coupled together
  useEffect(() => {
    logVisit(roomId)
    const connection = createConnection(serverUrl, roomId)
    connection.connect()
    return () => connection.disconnect()
  }, [roomId])
  ```
  ```js
  // ✅ split — each can evolve its dependencies independently
  useEffect(() => {
    logVisit(roomId)
  }, [roomId])

  useEffect(() => {
    const connection = createConnection(serverUrl, roomId)
    connection.connect()
    return () => connection.disconnect()
  }, [serverUrl, roomId])
  ```
- **Interview angle:** "When does an Effect run relative to the DOM update?" → After commit — the DOM is already updated by the time the Effect body executes, which is why DOM reads/writes are safe there but not during render.
- **Interview angle:** "What's the actual bug if you omit a value the Effect reads from the dependency array?" → Not just a lint warning — the Effect's closure keeps referencing the value from whatever render it last ran in, so behavior silently goes stale even though the UI looks up to date (e.g. still connected to the old chat room after the visible room name has changed).
- **Interview angle:** "Why does React deliberately mount, unmount, then remount components in development?" → To stress-test that your cleanup function fully reverses what the Effect's setup did — a real bug (e.g. a leaked connection) that would otherwise only appear the first time an actual user navigates away and back in production.
- **Interview angle:** "How do you avoid a race condition when fetching data tied to a fast-changing prop?" → A boolean `ignore` flag set to `true` in the cleanup function, checked before calling `setState` in the async callback — any in-flight response from a superseded render gets silently discarded instead of overwriting fresher data.
- **Interview angle:** "Give an example of a side effect that should NOT be in an Effect." → A POST request triggered by a button click — that's caused by a discrete user interaction, not by rendering, so it belongs in the click handler, not in a `useEffect` with an empty dependency array.

---

### 2.4 ⭐ You Might Not Need an Effect

**Read:** [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) — fetched 2026-08-02

- **Core filter to apply before writing any Effect:** an Effect is for synchronizing with something *outside* React — a server connection, the DOM, a browser API, a non-React widget. If nothing external is involved, you almost certainly don't need one — you need a plain calculation, an event handler, or a different hook (`useMemo`, `key`, `useSyncExternalStore`).
- **Gotcha — the universal cost of an unnecessary Effect:** every wrong example below shares the same failure mode — component renders once with a stale/default value, the Effect fires *after* commit, calls a setter, and React re-renders a second time with the correct value. That's a visible flash of wrong UI plus a wasted render pass, not just "extra code."

**1. Computing a derived value for render**
```js
// ❌ extra state + extra render pass
const [fullName, setFullName] = useState("")
useEffect(() => {
  setFullName(firstName + " " + lastName)
}, [firstName, lastName])
```
```js
// ✅ just compute it — one render, always in sync, no Effect at all
const fullName = firstName + " " + lastName
```

**2. Caching an expensive computation**
```js
// ❌ Effect + state for something that's just a pure calculation
const [visibleTodos, setVisibleTodos] = useState([])
useEffect(() => {
  setVisibleTodos(getFilteredTodos(todos, filter))
}, [todos, filter])
```
```js
// ✅ useMemo — recomputes only when todos/filter actually change, no extra render
const visibleTodos = useMemo(
  () => getFilteredTodos(todos, filter),
  [todos, filter]
)
```
- **Gotcha:** don't reach for `useMemo` reflexively — measure first with `console.time()`/`console.timeEnd()`. Unless you're looping over thousands of items, the "expensive" calculation usually isn't.

**3. Resetting all state when a prop changes**
```js
// ❌ Effect resets state after userId changes — but children flash stale state first,
// and you'd have to repeat this reset in every nested component that holds related state
useEffect(() => {
  setComment("")
}, [userId])
```
```js
// ✅ key forces React to treat it as a brand-new component instance —
// all of Profile's internal state (comment included) resets automatically, no Effect needed
<Profile userId={userId} key={userId} />
```

**4. Adjusting (not fully resetting) state when a prop changes**
```js
// ❌ stale render → Effect fires → second render
useEffect(() => {
  setSelection(null)
}, [items])
```
```js
// ✅ best option — derive it, don't store/adjust it at all
const [selectedId, setSelectedId] = useState(null)
const selection = items.find((item) => item.id === selectedId) ?? null
// if the selected item vanishes from `items`, selection naturally becomes null
```
- **Gotcha:** if you truly must compare against the previous props value during render (not just derive), you're allowed to call a setter directly in the render body — but only for that same component's own state, and only guarded by a comparison so it doesn't loop:
  ```js
  const [prevItems, setPrevItems] = useState(items)
  if (items !== prevItems) {
    setPrevItems(items)
    setSelection(null)
  }
  ```
  This is a narrow, explicitly-sanctioned exception — don't generalize it into "I can setState during render whenever I want."

**5. Sharing logic between multiple event handlers**
```js
// ❌ Effect fires on EVERY render where product.isInCart is true —
// including a page reload, not just an actual "Buy" click
useEffect(() => {
  if (product.isInCart) {
    showNotification(`Added ${product.name} to cart!`)
  }
}, [product])
```
```js
// ✅ extract the shared behavior into a plain function, call it from each handler
function buyProduct() {
  addToCart(product)
  showNotification(`Added ${product.name} to cart!`)
}
function handleBuyClick() { buyProduct() }
function handleCheckoutClick() { buyProduct(); navigateTo("/checkout") }
```
- **Interview-grade litmus test:** "Does this code need to run because the component was *displayed*, or because of a specific *user interaction*?" Effects answer the first question; event handlers answer the second.

**6. Sending a POST request**
```js
// ❌ ties the POST to a state change instead of the click that caused it —
// now the "cause" of the network call is buried in a dependency array
useEffect(() => {
  if (jsonToSubmit !== null) {
    post("/api/register", jsonToSubmit)
  }
}, [jsonToSubmit])
```
```js
// ✅ registration is a direct response to submit — put it in the handler
function handleSubmit(e) {
  e.preventDefault()
  post("/api/register", { firstName, lastName })
}
```
- **Gotcha:** an *analytics* "page visited" POST is the correct opposite case — that genuinely belongs in an Effect with `[]` deps, because it should fire because the component was displayed, not because of any specific click.

**7. Chains of Effects adjusting state off each other**
```js
// ❌ setCard → render → Effect bumps goldCardCount → render →
//    Effect bumps round → render → Effect sets isGameOver → render.
// Four extra render passes for what is conceptually one game move, and it breaks
// the moment you add a feature like replaying game history.
useEffect(() => {
  if (card?.gold) setGoldCardCount((c) => c + 1)
}, [card])
useEffect(() => {
  if (goldCardCount > 3) {
    setRound((r) => r + 1)
    setGoldCardCount(0)
  }
}, [goldCardCount])
useEffect(() => {
  if (round > 5) setIsGameOver(true)
}, [round])
```
```js
// ✅ one event handler, one batched update, isGameOver derived instead of stored
const isGameOver = round > 5
function handlePlaceCard(nextCard) {
  if (isGameOver) throw Error("Game already ended.")
  setCard(nextCard)
  if (nextCard.gold) {
    if (goldCardCount < 3) {
      setGoldCardCount(goldCardCount + 1)
    } else {
      setGoldCardCount(0)
      setRound(round + 1)
    }
  }
}
```
- **Gotcha:** inside that handler, `round` and `goldCardCount` are snapshots from this render — same "state as a snapshot" rule from Phase 1, not something new to Effects.

**8. Initializing the application**
```js
// ❌ In dev, Strict Mode fires this Effect twice — if checkAuthToken()
// or loadDataFromLocalStorage() aren't idempotent, the second call can
// invalidate a token the first call just validated.
useEffect(() => {
  loadDataFromLocalStorage()
  checkAuthToken()
}, [])
```
```js
// ✅ module-level code runs once per page load, not once per component mount —
// exactly the semantics "initialize the app" actually needs
if (typeof window !== "undefined") {
  checkAuthToken()
  loadDataFromLocalStorage()
}
function App() { /* ... */ }
```

**9. Notifying a parent of a state change**
```js
// ❌ child updates → renders → Effect fires → calls onChange → parent updates →
// parent re-renders. Two renders and a lag for something that's really one event.
useEffect(() => {
  onChange(isOn)
}, [isOn, onChange])
```
```js
// ✅ update child state and notify the parent in the same event — React batches both,
// one render pass, immediate notification
function updateToggle(nextIsOn) {
  setIsOn(nextIsOn)
  onChange(nextIsOn)
}
```
- **Even better, when it fits:** make the component fully controlled (no internal state at all — `isOn` lives only in the parent) and skip the internal `useState` entirely.

**10. Passing fetched data up to a parent via a callback**
```js
// ❌ data flow becomes down (props) AND up (via onFetched Effect callback) —
// now you have to trace two directions to find where data actually comes from
function Child({ onFetched }) {
  const data = useSomeAPI()
  useEffect(() => {
    if (data) onFetched(data)
  }, [onFetched, data])
}
```
```js
// ✅ fetch at the level that needs to share the data, pass it straight down —
// data flow stays one direction the whole way
function Parent() {
  const data = useSomeAPI()
  return <Child data={data} />
}
```

**11. Subscribing to a value that lives outside React (e.g. `navigator.onLine`)**
```js
// ❌ hand-rolled subscription — easy to get the cleanup wrong, and doesn't
// account for server rendering (navigator.onLine doesn't exist on the server)
useEffect(() => {
  function updateState() { setIsOnline(navigator.onLine) }
  updateState()
  window.addEventListener("online", updateState)
  window.addEventListener("offline", updateState)
  return () => {
    window.removeEventListener("online", updateState)
    window.removeEventListener("offline", updateState)
  }
}, [])
```
```js
// ✅ useSyncExternalStore is the purpose-built hook for "read + subscribe to an
// external store" — handles SSR (third argument) and avoids the boilerplate
function subscribe(callback) {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}
function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine, // client snapshot
    () => true,              // server snapshot
  )
}
```

**12. Fetching data — the one case where an Effect genuinely IS the right tool**
```js
// ❌ no race-condition guard: typing "hello" fires requests for "h", "he", "hel",
// "hell", "hello" — if the "hell" response arrives after the "hello" response,
// the UI ends up showing results for "hell" even though the input says "hello"
useEffect(() => {
  fetchResults(query).then((json) => setResults(json))
}, [query])
```
```js
// ✅ ignore flag discards any response whose request has since been superseded
useEffect(() => {
  let ignore = false
  fetchResults(query).then((json) => {
    if (!ignore) setResults(json)
  })
  return () => { ignore = true }
}, [query])
```
- **Gotcha:** this is explicitly called out as the *weakest* of the patterns here — the docs recommend a framework's built-in data layer or a cache library (TanStack Query, SWR) over hand-writing this, precisely because you also need caching, deduping, and loading/error states on top of the race-condition fix.

**Interview angle:** "What's the single question that tells you whether code belongs in an Effect?" → Is this synchronizing with something outside React (a connection, subscription, non-React widget), or can it be expressed as a plain calculation, a derived value, or something caused by a specific event? Only the first case is an Effect.

**Interview angle:** "Why does resetting state via `useEffect` on a prop change perform worse than using `key`?" → The Effect version renders once with stale state, then the Effect fires post-commit and triggers a second render — `key` instead tells React to unmount/remount a fresh instance in one pass, with correctly-initialized state from the start.

**Interview angle:** "A junior engineer chains three `useEffect`s, each setting state that the next one depends on. What's wrong with this, and what's the fix?" → Each state update triggers its own render, so what's conceptually one state transition becomes several renders in sequence — worse, it's brittle to future features (e.g. replaying past moves) since the "logic" is smeared across dependency arrays instead of living in one place. Fix: compute all the resulting state in a single event handler using batched updates.

**Interview angle:** "When *is* `useEffect` the right call for data fetching, given this whole topic is about avoiding Effects?" → Fetching is a synchronization with an external system (the network), so it's a legitimate use — but a naive version is still buggy (race conditions on fast-changing dependencies) unless you add an `ignore`-flag cleanup, or better, delegate to a data-fetching library that already solves this.

---

### 2.5 Effect dependencies, separating events from effects

**Read:** [Removing Effect Dependencies](https://react.dev/learn/removing-effect-dependencies), [Separating Events from Effects](https://react.dev/learn/separating-events-from-effects) — fetched 2026-08-02

- **Dependencies are not a preference — they're a mechanical consequence of the code.** You don't get to "pick" a shorter dependency array because the long one is annoying; the array is required to exactly match every reactive value the Effect body reads. To remove a dependency, you change the *code* first (so it genuinely no longer reads that value), and the array shrinks as a result — never the other way around.
- **Object and function dependencies are a recurring trap** because a literal recreates a brand-new reference on every render, so `Object.is` comparison never matches the previous render's version, and the Effect re-runs every time regardless of whether the *values inside* actually changed:
  ```js
  // ❌ options is a new object every render → Effect re-runs on every render
  function ChatRoom({ roomId }) {
    const options = { serverUrl: serverUrl, roomId: roomId }
    useEffect(() => {
      const connection = createConnection(options)
      connection.connect()
      return () => connection.disconnect()
    }, [options])
  }
  ```
  ```js
  // ✅ construct the object INSIDE the Effect — only roomId (a primitive) is a dependency
  function ChatRoom({ roomId }) {
    useEffect(() => {
      const options = { serverUrl: serverUrl, roomId: roomId }
      const connection = createConnection(options)
      connection.connect()
      return () => connection.disconnect()
    }, [roomId])
  }
  ```
- Same fix applies one level up if the object arrives **as a prop** you don't control — destructure the primitives out of it before the Effect, and depend on those primitives instead of the object reference:
  ```js
  // ✅ depend on roomId/serverUrl (primitives), not options (object identity)
  function ChatRoom({ options }) {
    const { roomId, serverUrl } = options
    useEffect(() => {
      const connection = createConnection({ roomId, serverUrl })
      connection.connect()
      return () => connection.disconnect()
    }, [roomId, serverUrl])
  }
  ```
- **Reading state to compute the next state doesn't need that state as a dependency** — use the updater-function form instead, which is a pattern carried over from Phase 1's state-as-a-snapshot rules:
  ```js
  // ❌ messages is read directly → Effect must depend on it → reconnects on every new message
  useEffect(() => {
    connection.on("message", (msg) => setMessages([...messages, msg]))
    return () => connection.disconnect()
  }, [roomId, messages])
  ```
  ```js
  // ✅ updater function reads the latest messages without the Effect needing to know about it
  useEffect(() => {
    connection.on("message", (msg) => setMessages((msgs) => [...msgs, msg]))
    return () => connection.disconnect()
  }, [roomId])
  ```
- **This is the same event-vs-Effect line from 2.3/2.4, just given its vocabulary: "reactive" vs "non-reactive" logic.** 2.3 already drew this boundary ("buying is not caused by rendering; it's caused by a specific interaction"), and 2.4's litmus test ("displayed vs. specific interaction") is the identical distinction under a different name — nothing new here conceptually. Code inside an event handler runs once, in response to one interaction — it never "reacts" to a later prop/state change on its own. Code inside an Effect is reactive by design — it deliberately re-runs whenever a dependency changes. What genuinely *is* new in this article is the next-level problem: what do you do when a **single** Effect needs to be reactive to one dependency but *not* reactive to another value it also reads — that's the case 2.3/2.4 never addressed, because until now the only tools were "move it to a handler" or "put it in the Effect," with no way to be selective within one Effect:
  ```js
  // ❌ theme is only used to pick a notification color, but including it as a
  // dependency means the chat RECONNECTS every time the user just switches theme
  function ChatRoom({ roomId, theme }) {
    useEffect(() => {
      const connection = createConnection(serverUrl, roomId)
      connection.on("connected", () => {
        showNotification("Connected!", theme)
      })
      connection.connect()
      return () => connection.disconnect()
    }, [roomId, theme])
  }
  ```
- **`useEffectEvent` is the tool built for exactly this split** — it lets a piece of logic always read the *latest* props/state without forcing the surrounding Effect to re-run when that value changes:
  ```js
  // ✅ onConnected always sees the current theme, but isn't a reactive dependency itself
  function ChatRoom({ roomId, theme }) {
    const onConnected = useEffectEvent(() => {
      showNotification("Connected!", theme)
    })
    useEffect(() => {
      const connection = createConnection(serverUrl, roomId)
      connection.on("connected", () => {
        onConnected()
      })
      connection.connect()
      return () => connection.disconnect()
    }, [roomId]) // theme correctly omitted — reconnect only tracks roomId
  }
  ```
- **Rules for Effect Events, all three non-negotiable:**
  1. Only ever call one from inside an Effect — it's not a general-purpose function, it's a non-reactive escape hatch scoped to one Effect.
  2. Never pass an Effect Event down as a prop or into another Hook — declare it right next to the Effect that uses it, every time (even inside a custom hook, the Effect Event is declared inside that hook, alongside its own Effect).
  3. Always omit it from the dependency array — it's non-reactive by definition, so the linter doesn't (and shouldn't) ask for it.
- **Gotcha — a single Effect Event can hold one value frozen and another value live, at the same time, and which one you get depends entirely on *how* you read it:**
  ```js
  function Page({ url }) {
    const { items } = useContext(ShoppingCartContext)
    const numberOfItems = items.length

    const onVisit = useEffectEvent((visitedUrl) => {
      logVisit(visitedUrl, numberOfItems)
    })

    useEffect(() => {
      onVisit(url)
    }, [url])
  }
  ```
  - `visitedUrl` — passed in **explicitly as a parameter**. It's captured by an ordinary JS closure the instant the Effect runs, so it's permanently tied to *that specific render's* `url` — it does not update even if `url` changes later, because nothing re-assigns that closed-over binding.
  - `numberOfItems` — read **directly inside the Effect Event's own body**, not passed as a parameter. This one is live: React re-evaluates Effect Event bodies against the component's current render every time you *call* the function, not the render where it was declared. So it always reflects whatever `numberOfItems` is at the moment `onVisit()` actually executes.

  The gap between "when the Effect fired" and "when the Effect Event actually runs" is easiest to see with an async delay in the middle, e.g. a `setTimeout`:
  ```js
  useEffect(() => {
    setTimeout(() => {
      onVisit(url) // still the url from when this Effect ran, 5s ago
    }, 5000)
  }, [url])
  ```
  If the user navigates to a new page during those 5 seconds, this pending Effect re-runs with the new `url`, scheduling a *second* timeout — but the *first* timeout is never cancelled (no cleanup here), so it still fires 5 seconds after it started, logging the *old* `visitedUrl` it was always going to log. Meanwhile, if `numberOfItems` changed during that same 5-second window (e.g. the user added another item to the cart), the log line reflects the *new*, current `numberOfItems` — because that read happens live, inside the Effect Event body, at the moment the timeout actually fires, not when it was scheduled.
  - **Why pass `url` explicitly instead of just reading it live too?** Because `url` is the very same reactive value the surrounding Effect depends on (`[url]`) — the whole reason this Effect re-ran in the first place. Passing it in as a parameter makes it unmistakable in the code that this particular log entry is *about* that triggering `url`, and protects against someone later "simplifying" the code by deleting the parameter and reading `url` directly from outer scope, which would silently turn a correctly-scoped log entry into a subtly wrong one.
  - **Rule of thumb:** if a value is the reason the Effect re-ran (i.e. it's already in the dependency array), pass it into the Effect Event as a parameter to freeze it to that specific trigger. If a value should always reflect "right now" regardless of which render started this Effect, read it directly inside the Effect Event's body instead.
- **Gotcha — the one thing that never gets a pass: suppressing the linter.**
  ```js
  // ❌ NEVER do this — it doesn't remove the bug, it just hides it
  useEffect(() => {
    const id = setInterval(onTick, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  ```
  In the docs' own timer example, suppressing the lint rule here means `onTick` forever closes over the *initial* `count` and `increment` from the first render — the displayed counter increments by exactly 1, forever, no matter what the user later sets `increment` to. The fix isn't to add the missing dependency (that would reconnect/reset the interval on every tick) — it's to move the reactive read into an Effect Event, which is the actually-correct tool for "read the latest value, don't react to it."
- **Separate Effects when they serve unrelated purposes**, even if they happen to share a dependency — bundling them means a change relevant to only one drags the other along for no reason:
  ```js
  // ❌ two independent fetches coupled into one Effect
  useEffect(() => {
    fetch(`/api/cities?country=${country}`)
    if (city) {
      fetch(`/api/areas?city=${city}`)
    }
  }, [country, city])
  ```
  ```js
  // ✅ split by purpose — the areas fetch only reruns for city changes, not country changes
  useEffect(() => {
    fetch(`/api/cities?country=${country}`)
  }, [country])
  useEffect(() => {
    if (city) fetch(`/api/areas?city=${city}`)
  }, [city])
  ```

**Interview angle:** "Your Effect re-runs on every single render even though its dependency array isn't empty — why?" → Almost always an object or function literal in the array, recreated fresh every render, so `Object.is` never matches the prior render's reference — fix by moving the literal inside the Effect or depending on its primitive fields instead.

**Interview angle:** "How do you read the latest value of a prop or piece of state inside an Effect without making the Effect reactive to it?" → `useEffectEvent` — it always sees the current value on each call, but is explicitly exempt from the dependency array, so it doesn't force the Effect to re-run when that value changes.

**Interview angle:** "What's actually wrong with `// eslint-disable-next-line react-hooks/exhaustive-deps`?" → It doesn't remove the underlying bug, it hides it — the Effect keeps a stale closure over whatever value it "lied" about, producing behavior that silently diverges from the current render's state (the classic case: a timer that only ever uses the very first render's `increment` value).

**Interview angle:** "When should two related fetches live in the same Effect vs. two separate Effects?" → Same Effect only if they represent one indivisible synchronization; separate Effects when each has its own independent trigger — otherwise a dependency change meant for one unnecessarily reruns the other.

**Recap — what the docs say to take away:**
- Dependencies reflect the code; you fix the mismatch by changing the code, never by editing the array in isolation or suppressing the linter.
- Object/function literals as dependencies are a near-universal cause of over-firing Effects — move them inside the Effect, or depend on their primitive fields instead.
- Reading state just to compute the next state doesn't need that state as a dependency — use the updater-function form.
- Event handlers are non-reactive (run once per interaction); Effects are reactive by design (re-run per dependency change) — the friction appears when one Effect needs to be reactive to some inputs but not others.
- `useEffectEvent` is the sanctioned way to read a "latest value" inside an Effect without that value becoming a dependency — but it can only be called from inside an Effect, never passed around, and is always omitted from the dependency array.
- Separate Effects by purpose, even when they'd share a dependency, so each can evolve independently.

---

### 2.6 ⭐ Custom hooks — extracting reusable logic

**Read:** [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) — fetched 2026-08-02

- **Custom hooks share stateful *logic*, not state itself.** Two components calling the same custom hook get two completely independent copies of whatever `useState`/`useEffect` live inside it — nothing is shared between them by default:
  ```js
  function StatusBar() {
    const isOnline = useOnlineStatus() // its own state
  }
  function SaveButton() {
    const isOnline = useOnlineStatus() // a different, separate state
  }
  ```
  If both components appear to "update together," that's not because they share state — it's because each one independently subscribed to the *same external thing* (`window`'s online/offline events), so both copies of state happen to receive the same signal at the same time. If you actually need shared state (not just shared logic), that's state lifting, not a custom hook.
- **The `use` prefix isn't a style nicety — the linter depends on it.** `eslint-plugin-react-hooks` uses the name to know a function follows the Rules of Hooks (no conditional calls, etc.) and to check that any Hooks it calls internally are handled correctly:
  ```js
  // ✅ starts with use → linter treats it as a Hook, enforces Hook rules on it
  function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(true)
    useEffect(() => { /* ... */ }, [])
    return isOnline
  }
  ```
  ```js
  // ❌ calls useState internally but doesn't start with "use" → linter can't verify it, real bug
  function getOnlineStatus() {
    const [isOnline] = useState(true) // linter error: hook called outside a Hook/component
  }
  ```
- **Gotcha — the reverse mistake is just as real: don't prefix a function `use` if it doesn't call any Hooks.** Naming a pure helper `useSorted` forces it to follow Hook-calling rules it doesn't actually need (e.g. can't call it conditionally), for zero benefit:
  ```js
  // ❌ no hooks inside — doesn't need to be a Hook, and now can't be called conditionally
  function useSorted(items) {
    return items.slice().sort()
  }
  ```
  ```js
  // ✅ plain function — can be called anywhere, including inside an if
  function getSorted(items) {
    return items.slice().sort()
  }
  function List({ items, shouldSort }) {
    let displayedItems = items
    if (shouldSort) {
      displayedItems = getSorted(items) // fine — not a Hook
    }
  }
  ```
- **Extracting an Effect into a named hook is a communication tool as much as a DRY tool.** Compare the same logic inline vs. extracted:
  ```js
  // Before: the Effect's *purpose* is buried in its implementation
  function StatusBar() {
    const [isOnline, setIsOnline] = useState(true)
    useEffect(() => {
      function handleOnline() { setIsOnline(true) }
      function handleOffline() { setIsOnline(false) }
      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)
      return () => {
        window.removeEventListener("online", handleOnline)
        window.removeEventListener("offline", handleOffline)
      }
    }, [])
    return <h1>{isOnline ? "✅ Online" : "❌ Disconnected"}</h1>
  }
  ```
  ```js
  // After: the component just states its intent — "I need online status" —
  // and the subscription mechanics are hidden inside the hook entirely
  function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(true)
    useEffect(() => {
      function handleOnline() { setIsOnline(true) }
      function handleOffline() { setIsOnline(false) }
      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)
      return () => {
        window.removeEventListener("online", handleOnline)
        window.removeEventListener("offline", handleOffline)
      }
    }, [])
    return isOnline
  }
  function StatusBar() {
    const isOnline = useOnlineStatus()
    return <h1>{isOnline ? "✅ Online" : "❌ Disconnected"}</h1>
  }
  ```
  Bonus of the extracted version: if you later upgrade the *implementation* (e.g. swap manual event listeners for `useSyncExternalStore`), every calling component stays untouched — they only ever depended on the hook's return value, never its internals.
- **Custom hooks re-run on every render of the calling component and always see that render's latest props/state** — same rules as any other hook call, nothing special:
  ```js
  export function useChatRoom({ serverUrl, roomId, onReceiveMessage }) {
    const onMessage = useEffectEvent(onReceiveMessage)
    useEffect(() => {
      const connection = createConnection({ serverUrl, roomId })
      connection.connect()
      connection.on("message", (msg) => { onMessage(msg) })
      return () => connection.disconnect()
    }, [roomId, serverUrl])
  }
  // usage — changing either roomId or serverUrl in the parent auto-reconnects
  useChatRoom({
    roomId,
    serverUrl,
    onReceiveMessage(msg) { showNotification("New message: " + msg) },
  })
  ```
- **This is the exact same `useEffectEvent` pattern from 2.5, just applied one level up — wrapping a function *prop* passed into a custom hook.** Not new mechanics, same fix for the same problem: an inline function like `onReceiveMessage` gets a fresh reference every render, so putting it straight in the dependency array reconnects the chat on every single render regardless of whether `roomId`/`serverUrl` changed:
  ```js
  // ❌ onReceiveMessage recreated every render → reconnects every render
  useEffect(() => {
    const connection = createConnection({ serverUrl, roomId })
    connection.connect()
    connection.on("message", (msg) => { onReceiveMessage(msg) })
    return () => connection.disconnect()
  }, [roomId, serverUrl, onReceiveMessage])
  ```
  ```js
  // ✅ wrap it — onMessage always calls the latest onReceiveMessage, but isn't a dependency
  const onMessage = useEffectEvent(onReceiveMessage)
  useEffect(() => {
    const connection = createConnection({ serverUrl, roomId })
    connection.connect()
    connection.on("message", (msg) => { onMessage(msg) })
    return () => connection.disconnect()
  }, [roomId, serverUrl])
  ```
- **Custom hooks aren't limited to Effects — plain shared stateful logic works the same way**, e.g. a controlled-input hook returning spreadable props:
  ```js
  export function useFormInput(initialValue) {
    const [value, setValue] = useState(initialValue)
    function handleChange(e) { setValue(e.target.value) }
    return { value, onChange: handleChange }
  }
  // two independent calls → two independent input states
  function Form() {
    const firstNameProps = useFormInput("Mary")
    const lastNameProps = useFormInput("Poppins")
    return (
      <>
        <input {...firstNameProps} />
        <input {...lastNameProps} />
        <p>Good morning, {firstNameProps.value} {lastNameProps.value}.</p>
      </>
    )
  }
  ```
- **Gotcha — don't build generic "lifecycle" hooks that hide what's actually happening.** `useMount`, `useEffectOnce`, `useUpdateEffect` sound convenient but fight React's own model instead of working with it, and often quietly break the dependency rules along the way:
  ```js
  // ❌ generic wrapper — and it's already lying to the linter: fn is used but omitted
  function useMount(fn) {
    useEffect(() => {
      fn()
    }, []) // missing dependency: fn
  }
  ```
  Prefer specific, high-level hooks named for what they actually do —
  ```js
  useData(url)
  useImpressionLog(eventName, extraData)
  useChatRoom(options)
  ```
  — over anything trying to simulate a class-component lifecycle method.
- **Not every duplication needs to become a hook.** Extract when the logic is genuinely reused across components, or when hiding the complexity clarifies intent (as with `useOnlineStatus`) — a small amount of repeated logic used in exactly one place doesn't need the extra indirection of a hook just for its own sake.
- **Custom hook bodies must stay pure**, same rule as component bodies from Phase 1 — no side effects during the synchronous part of the hook's execution, only inside its `useEffect`s (if any) or the event handlers it returns.

**Interview angle:** "Do two components using the same custom hook share state?" → No — they share the *logic*, but each call gets its own independent state. Any apparent synchronization between them comes from both subscribing to the same external source, not from a shared variable.

**Interview angle:** "Why does React enforce the `use` naming prefix instead of just detecting Hook calls automatically?" → It's the mechanism the linter relies on to apply the Rules of Hooks (no conditional/looped calls, etc.) — without a naming signal, there'd be no reliable way to tell a Hook-calling function from a plain one at lint time.

**Interview angle:** "You pass an inline callback prop into a custom hook that uses it inside an Effect — what breaks, and how do you fix it?" → The inline function is a new reference every render, so if it's in the dependency array the Effect (e.g. a chat connection) re-runs every render regardless of whether anything meaningful changed — fix by wrapping the callback in `useEffectEvent` inside the hook, same pattern as any other Effect Event use.

**Interview angle:** "When should you *not* extract a custom hook?" → When you'd just be wrapping a single Effect used in exactly one place with a generic, lifecycle-flavored name (`useMount`, `useEffectOnce`) — that adds indirection without hiding real complexity or enabling reuse, and tends to paper over missing/incorrect dependencies instead of fixing them.

**Recap — what the doc says to take away:**
- Custom hooks let components share *logic*, never state — each call is independently stateful.
- The `use` prefix is required tooling signal for the linter, not decoration — and a function with no hook calls inside shouldn't wear the prefix either.
- Extracting a hook turns "how" (implementation) into "what" (intent) from the calling component's point of view, and makes later implementation upgrades (e.g. to `useSyncExternalStore`) invisible to every caller.
- Hooks re-run every render and always see the calling component's latest props/state — same reactivity rules as any other hook.
- Function props passed into a hook and used inside its Effects need the same `useEffectEvent` treatment as any other non-reactive value used in an Effect.
- Design hooks around concrete use cases; avoid generic lifecycle wrappers that fight React's model instead of expressing one.

---

### 2.7 `useReducer` — complex state transitions

**Read:** [Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer) — fetched 2026-08-03

- A **reducer** is just a pure function that takes
  ```js
  (currentState, action) => nextState
  ```
  — you move "how state changes" out of every event handler and into one place, so handlers only describe **what happened**, not **how to compute the next state**.
- The migration is three mechanical steps: swap
  ```js
  setTasks([...tasks, newTask])
  ```
  for
  ```js
  dispatch({ type: 'added', id: nextId++, text })
  ```
  → write a
  ```js
  function tasksReducer(tasks, action) { switch (action.type) { ... } }
  ```
  → wire it up with
  ```js
  const [tasks, dispatch] = useReducer(tasksReducer, initialTasks)
  ```
  which is a drop-in replacement for
  ```js
  const [tasks, setTasks] = useState(initialTasks)
  ```
- **Reducers must stay pure** — same inputs, same output, no side effects (no fetches, timeouts, mutation, `console.log`-as-debugging). This isn't a style preference: reducers run during rendering, so an impure one breaks the same assumptions a non-pure component body would. React actually calls your reducer twice in Strict Mode dev builds specifically to catch this.
- **Gotcha:** because reducers run during render, an action handler that reaches for `Math.random()`, mutates the input array in place (`tasks.push(...)` instead of returning a new array), or fires a network call inside the `switch` will produce subtle bugs that only show up under Strict Mode's double-invoke or React's future concurrent rendering — not in a naive dev test.
- **Gotcha:** naming an action too close to the state change itself (e.g. `'set_field'` fired five times for one form reset) throws away the readability win reducers exist for — one user interaction should map to one action, e.g. `'reset_form'`, even if it changes several fields at once.
- The name "reducer" comes directly from `Array.prototype.reduce` — both take an accumulated value plus one new input and fold them into the next accumulated value; a reducer is just that pattern applied to UI state over a sequence of dispatched actions instead of over an array.
- **Interview angle:** "`useReducer` vs `useState` — when is a reducer worth it?" → When one component has many event handlers all touching related state, or when the *sequence* of what happened matters for debugging — a reducer gives you a single, loggable list of actions instead of scattered `setX` calls across handlers.
- **Interview angle:** "Why must reducers be pure?" → Because React may call them more than once per action (Strict Mode double-invoke, or future replay/time-travel debugging use cases) — an impure reducer with side effects would fire those side effects twice, or produce a different result depending on how many times React happens to call it.

**Recap — what the doc says to take away:**
- Consolidate scattered `setX` calls into one reducer function.
- Dispatch actions that describe **what happened**, not **how state changes**.
- Keep the reducer pure — no side effects, immutable updates only.
- Design actions around one user interaction each, not one state field each.
- Reducers are plain functions — test them standalone with no component/render involved.

---

### 2.8 `useContext` — avoid prop-drilling (+ its limits)

**Read:** [Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context), [Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context) — fetched 2026-08-03

- **Prop drilling** is passing a value through several components that don't use it themselves, purely so a deeply nested descendant can read it. Context exists specifically to skip that chain.
- Three-step API, and this is worth having cold:
  ```js
  export const LevelContext = createContext(1) // 1. create, with a default
  ```
  ```js
  const level = useContext(LevelContext) // 2. read, in any descendant
  ```
  ```js
  <LevelContext value={level}>{children}</LevelContext> // 3. provide, from an ancestor
  ```
- **Nearest provider wins** — React walks up the tree from the reading component and uses whatever `<Context value={...}>` is closest, ignoring anything further out. If there's no provider at all above it, `useContext` falls back to the default passed into `createContext(default)`.
- A component can **both read and re-provide** the same context with a transformed value — e.g. a `Section` reading `level` from context and providing `level + 1` to its own children. This is how nesting depth (headings, menus) can auto-increment without every call site passing an explicit number — same mental model as CSS property inheritance cascading down the tree.
- **Gotcha:** reaching for context the moment you're annoyed about passing a prop two levels down is premature — react.dev explicitly says try passing props normally first, then try restructuring so the component receiving the prop is passed in as `children` (so the parent that already has the data can render the child directly, with no pass-through layer at all) — context is the last resort, not the first instinct.
- **Gotcha — the real limit, worth calling out unprompted since it's the #1 follow-up interview question:** every consumer of a context re-renders whenever that context's value changes, with no built-in way to subscribe to just part of it. A context holding `{ user, theme, cart }` means a component that only cares about `theme` still re-renders on every cart update. This is why context is fine for rarely-changing values (theme, current user, locale) but a poor fit for frequently-changing state on its own — pairing it with `useReducer` (topic 2.7) or splitting into multiple smaller contexts is the usual fix.
- Context isn't limited to primitive values — you can pass objects, arrays, or even setter functions (`setTheme`) through it, which is exactly how the common "context + reducer" pattern shares both state and a `dispatch` function app-wide.
- **Interview angle:** "What problem does Context solve, and what's its performance limitation?" → Solves prop drilling by letting any descendant read a value directly from an ancestor without every component in between forwarding it; the limitation is that every consumer re-renders on any change to the context value, with no fine-grained subscription — that's the trade you're making.
- **Interview angle:** "How would you combine Context with `useReducer`?" → Provide both `state` and `dispatch` down through one (or two split) contexts, so any descendant can read state and dispatch actions without prop-drilling either — this is the de facto "poor man's Redux" pattern before reaching for an actual state library.
- **The reducer+context combo uses *two* contexts, not one** — one for the state value, one for the `dispatch` function — specifically so a component that only ever dispatches (never reads state) doesn't need to subscribe to state changes at all:
  ```js
  export const TasksContext = createContext(null)
  export const TasksDispatchContext = createContext(null)
  ```
  ```js
  const [tasks, dispatch] = useReducer(tasksReducer, initialTasks)
  return (
    <TasksContext value={tasks}>
      <TasksDispatchContext value={dispatch}>
        {children}
      </TasksDispatchContext>
    </TasksContext>
  )
  ```
- **The idiomatic finishing move is to hide all of this wiring behind a provider component plus a pair of custom hooks**, so calling components never import `useContext`/`createContext` directly — they just say what they need:
  ```js
  // TasksContext.js — all the wiring lives in one file
  export function TasksProvider({ children }) {
    const [tasks, dispatch] = useReducer(tasksReducer, initialTasks)
    return (
      <TasksContext value={tasks}>
        <TasksDispatchContext value={dispatch}>
          {children}
        </TasksDispatchContext>
      </TasksContext>
    )
  }
  export function useTasks() {
    return useContext(TasksContext)
  }
  export function useTasksDispatch() {
    return useContext(TasksDispatchContext)
  }
  ```
  ```js
  // App.js — no reducer, no context, no dispatch in sight
  <TasksProvider>
    <h1>Day off in Kyoto</h1>
    <AddTask />
    <TaskList />
  </TasksProvider>
  ```
  ```js
  // AddTask.js — reads the custom hook, not the raw context
  const dispatch = useTasksDispatch()
  dispatch({ type: 'added', id: nextId++, text })
  ```
- This is the same custom-hooks material from 2.6, just applied to context instead of an Effect: `useTasks`/`useTasksDispatch` are Custom Hooks (they call `useContext` internally), so the `use` prefix and Rules of Hooks apply to them exactly as they would to `useOnlineStatus`.
- **Gotcha:** this pattern scales horizontally, not by nesting one giant context — a real app has *many* independent provider/reducer pairs (tasks, user settings, modal state), each scoped to its own concern, not one mega-context holding everything.
- **Interview angle:** "Why split state and dispatch into two separate contexts instead of one object?" → A component that only dispatches actions (e.g. `AddTask`) would otherwise re-render on every state change just because it's subscribed to the same context that holds the state — splitting means dispatch-only consumers never re-render when state updates, since `dispatch`'s reference never changes between renders.
- **Interview angle:** "What's the point of wrapping `useContext(TasksContext)` in a `useTasks()` custom hook instead of calling `useContext` directly in every component?" → It hides the existence of the context entirely — calling components just say "give me the tasks" or "give me dispatch," and the provider's internals (which context object, how many of them, the reducer itself) can be refactored later without touching a single caller.

**Recap — what the docs say to take away:**
- Context lets a component provide a value to its entire subtree, no matter how deep.
- Three steps: `createContext` → `useContext` in the reader → `<Context value={...}>` in the provider.
- Context passes straight through intermediate components — they don't need to know it exists.
- Try passing props, or passing JSX as `children`, before reaching for context.
- Context works well paired with state/reducers, letting descendants read and update shared state without prop-drilling.
- Split state and dispatch into two separate contexts so dispatch-only consumers don't re-render on state changes.
- Push all the `createContext`/`useReducer`/provider wiring into one file, exposed as a provider component plus small custom hooks (`useTasks`, `useTasksDispatch`) — components consume intent, not implementation.
- The pattern scales by adding more independent context/reducer pairs per concern, not by growing one shared context.

---

### 2.9 Data fetching: queries, caching, query keys, invalidation

**Watched:** [React Query (TanStack) Full Course Tutorial in One Video](https://www.youtube.com/watch?v=KrruJTTwOgU) — Thapa Technical, ~3.5 hrs — transcript reviewed 2026-08-03. Covers setup through `useMutation`; infinite scroll / final polish not yet reviewed.

- **What it is:** TanStack Query and "React Query" are the same library — TanStack is just the vendor-neutral name (there are Vue/Svelte/Solid adapters too), so don't confuse it with MEAN/MERN-style "stack" naming; there's no separate backend piece, it's a frontend-only library for managing **server state** in your React app — the state that represents data fetched from an API, as opposed to local UI state (`useState`) or shared client state (Context).
- **Why it exists / what problem it solves:** before it, fetching data meant hand-rolling the same pattern every time — `axios`/`fetch` call, a `useState` for the data, another pair of `useState`s for `isLoading`/`isError`, a `useEffect` to trigger the call on mount, manual re-fetch logic, manual cache invalidation. None of that is *impossible* without TanStack — people did (and still do) all of it with plain `useState`/`useEffect`/Context or Redux — but it's a lot of repeated boilerplate per API call. TanStack's whole pitch is collapsing that boilerplate into a couple of hooks.
- **Where/when to use it:** anywhere a component needs data from a server/API — dashboards, lists with pagination or infinite scroll, detail pages, search-as-you-type, anything with polling/real-time-feeling updates (stock tickers, live counters). It specifically is *not* a replacement for local UI state or client-only global state (e.g. theme, modal open/closed) — those still belong to `useState`/Context/Zustand; TanStack's job is exclusively the server-data layer.
- **What it offers out of the box** (the actual advantages, not hype): built-in `isPending`/`isError`/`error` state per query (no manual loading/error `useState`s); automatic caching so repeat requests for the same data return instantly from cache instead of re-hitting the server; automatic background refetching to keep cached data eventually-consistent without a manual refresh; simple config-driven polling (`refetchInterval`) instead of hand-rolled `setInterval` + cleanup; and straightforward primitives for pagination and infinite scroll. Net effect: the same data-fetching feature that might take 40-50 lines of manual `useState`/`useEffect`/try-catch typically drops to a handful of lines.
- **Setup:** `QueryClientProvider` wraps the app and takes one prop, `client`, whose value is a `new QueryClient()` instance you create yourself — same shape as any other provider pattern (Context provider, Router provider): one component handing a shared instance down to every descendant. That `QueryClient` instance is the actual engine — it owns caching, background refetching, and query/mutation state; the provider's only job is exposing it.
- **`useQuery` replaces the manual trio:** old-school data fetching needed a data `useState`, an `isLoading`/`isError` pair of `useState`s, and a `useEffect` to kick off the call on mount. `useQuery({ queryKey, queryFn })` collapses all of that — no state variable to hold the response, no effect to trigger the call. You mentally map `queryKey` → "the dependency array that decides when to refire" and `queryFn` → "the effect body," but that's a learning crutch, not literally what's implemented.
- **`useQuery` return value is destructured directly** — `data`, `isPending` (renamed from `isLoading` in v5 — v4 called it `isLoading`, and there's a separate legacy `isInitialLoading` that got folded in), `isError`, and `error` all come back out of the box. You never write your own loading/error state — you just branch render output on the booleans TanStack already computed.
- **DevTools** is a separate install (`@tanstack/react-query-devtools`), imported and rendered once near the root (`initialIsOpen` controls default visibility). It gives you a Query Explorer (queryKey, status, `isFetching`, data, GC time) and a Data Explorer per query — replaces manually poking the Network tab or `console.log`-ing responses to see what's cached.
- **GC time (`gcTime`, formerly `cacheTime` pre-v5):** how long a query's data stays in the cache after it's unused before being garbage-collected. Default is 5 minutes. This is the "how long is old data kept around at all" knob — separate from staleTime, which is "how long is kept data still trusted as correct."
- **staleTime:** a config option that says how long fetched data is considered fresh before TanStack will bother refetching it in the background. Default is `0` — meaning data is stale the instant it arrives, so TanStack refetches on every remount/refocus even though it shows you the cached data instantly while that background refetch is in flight (you never see a loading spinner for it — cache-then-silently-update). Setting `staleTime: 10000` (10s) means: for 10 seconds after a successful fetch, revisiting the query returns cache with **zero** network request; after 10s, the next access still shows cache instantly but *also* fires a background refetch to catch anything that changed server-side.
- **Cache-first render + background refetch is the whole value proposition:** first visit to a query shows a loading state (nothing cached yet); every subsequent visit shows cached data immediately with no loading flicker, while a background request (governed by staleTime) silently checks for updates and swaps them in if the response changes. This is why TanStack "feels instant" compared to hand-rolled fetch+useEffect, which always re-shows a loading state per mount.
- **Polling via `refetchInterval`:** pass a millisecond value as an option to `useQuery` and it auto-refetches on that cadence — this is the whole mechanism behind stock-ticker-style UIs (Groww, Zerodha) that update "by themselves." Note: `staleTime` must not be set higher than the poll interval, or the poll requests will still fire on schedule but change nothing meaningful since the data's still considered fresh regardless.
- **`refetchIntervalInBackground: true`** keeps the interval firing even when the component isn't the active tab/isn't mounted-and-focused; by default polling pauses when you navigate away, so this is an explicit opt-in for "keep polling no matter what."
- **Query keys are the cache identity, not just a label:** the array you pass as `queryKey` is compared for change; if the *value* inside it changes, TanStack treats it as a new/different query and refires `queryFn`. This is why a dynamic detail page (`/rq/:id`) needs the `id` folded into the query key array (e.g. `['post', id]`) — without it, clicking between cards reuses the exact same cached query and never refetches the new id's data, even though the component visibly shows a different route.
- **Pagination is bolt-on state, not a TanStack primitive:** page number is tracked with a plain `useState`, and the *only* TanStack-specific requirement is that the page number must also be included in the query key — otherwise incrementing it updates the state (and re-renders the "Page N" label) but never triggers a refetch, since the query key TanStack is watching hasn't changed.
- **`keepPreviousData` (a `useQuery` option) removes the loading flash between pages:** without it, every page change shows a momentary loading state before the next page's data appears; with it, the previous page's data stays on screen until the new page's data is ready, then swaps in — much better perceived performance for paginated UIs.
- **`useMutation` is for the other three CRUD operations** — create, update, delete — anything that *changes* server data rather than just reading it. `useQuery` never applies here; the mental split is "read = query, write = mutation."
- **`useMutation({ mutationFn, onSuccess, onError, onSettled })`:** `mutationFn` is the only required field (no `queryKey`/`mutationKey` required — `mutationKey` is optional, just for cache identification if you need it). Unlike a query, a mutation is **never auto-executed** — you get back an object (commonly destructured as a named `const`, e.g. `deleteMutation`) and you must explicitly call `.mutate(argument)` yourself, typically from an event handler, passing whatever the `mutationFn` needs (e.g. the id to delete).
- **`onSuccess(data, variables)` callback:** fires after the mutation resolves successfully; `data` is the mutation's response/confirmation, `variables` is what you passed into `.mutate(...)` (e.g. the deleted id) — this is where you reconcile the UI/cache, since the mutation itself doesn't touch cached query data automatically.
- **📖 Docs gap — `useMutation` has a full status API the tutorial never showed, only its side-effect callbacks:**
  - **Status booleans/`status` string**, same shape as `useQuery`: `isIdle`/`'idle'` (never called, or after a `reset()`), `isPending`/`'pending'` (in flight), `isSuccess`/`'success'` (`data` holds the response), `isError`/`'error'` (`error` holds the failure). The tutorial's `deleteMutation`/`updateMutation` in `FetchRQ.jsx` destructure only `mutate`, never touching `isPending`/`isError` — meaning that code has no way to disable the button mid-delete or show a per-row error, even though the mutation object already carries that state for free.
  - **`mutate(variables)` vs `mutateAsync(variables)`:** `mutate` is fire-and-forget — no promise, never throws, which is *why* the tutorial's code leans entirely on `onSuccess`/`onError` for follow-up logic. `mutateAsync` returns a real promise you can `await`/try-catch at the call site — useful for sequencing multiple mutations, e.g. "delete this, then only if that succeeds, also update something else."
  - **`reset()`:** clears a mutation's `data`/`error` and returns it to `isIdle`. Not automatic — unlike a query, a mutation's success/error state doesn't clear itself on its own, so a failed delete's error message would linger on screen until you call `deleteMutation.reset()` (e.g. on dismiss, or right before retrying).
  - **Full callback signatures — the tutorial's version drops arguments it never needed (yet):** `onMutate(variables)` fires *before* the request goes out and is the actual mechanism for optimistic updates — whatever it returns becomes the `context` argument threaded through the other three callbacks, which is the rollback handle if `onError` needs to undo an optimistic change. Full signatures: `onMutate(variables)` → `onError(error, variables, context)` → `onSuccess(data, variables, context)` → `onSettled(data, error, variables, context)`. `FetchRQ.jsx`'s `onSuccess: (data, id) => {...}` only used the first two params because it never used `onMutate`, so there was no `context` to receive.
  - **Retry:** mutations do **not** retry by default (queries retry 3× by default) — opt in explicitly with `retry: n` in the `useMutation` config if a flaky write should be retried automatically.
- **`useQueryClient()` hook gives you `queryClient.setQueryData([queryKey], updaterFn)`** to manually patch the cache after a mutation succeeds — e.g. filtering the deleted id out of the cached `['post']` array — as an alternative to `invalidateQueries`. `setQueryData` updates the UI instantly from the mutation's own result, with **zero** extra network round-trip.
- **📖 Docs gap — `invalidateQueries` (not demoed in the tutorial at all, only `setQueryData`):** `queryClient.invalidateQueries({ queryKey: [...] })` does two distinct things, not one: (1) it marks the matching query **stale**, and this overrides whatever `staleTime` you'd configured — even a `staleTime: Infinity` query gets treated as expired the instant you invalidate it; (2) **only if** that query is currently active (some mounted component is actually calling `useQuery` with that key right now) does it *also* trigger an immediate background refetch. If nothing is currently rendering that query, invalidation just leaves it marked stale — no network call happens until some component mounts and calls `useQuery` with that key again. So "invalidate" does **not** unconditionally mean "an API call happens right now" — it means "the next time this data is looked at, treat it as expired," and that lookup might be immediate (active query) or much later (inactive query).
- **`setQueryData` vs `invalidateQueries` — when to reach for which:** `setQueryData` is the right call when the mutation's own response already contains everything you need to update the cache (e.g. delete confirms the id, so you already know what to filter out) — instant UI update, no extra request. `invalidateQueries` is the right call when you *don't* trust that you can correctly reconstruct the new cache state yourself (e.g. a create/update where the server might compute or default fields you don't have locally) — simpler and more correct, at the cost of a real network round-trip on the next active use.
- **Gotcha:** forgetting to fold a route param (`id`) into the query key is a silent bug, not a crash — the page still renders, it just always shows the *first* cached card's data because TanStack sees the same `queryKey` on every navigation and serves the same cache entry.
- **Gotcha:** setting a non-zero `staleTime` and expecting polling (`refetchInterval`) to show new data faster than the staleTime window — the interval fires the request, but if staleTime hasn't been designed with the interval in mind you can end up re-requesting fresh data that then gets treated as still-fresh-so-ignore on the next check, defeating the point.
- **Gotcha:** naming the `useMutation` config's function key anything other than exactly `mutationFn` — the property name is not "whatever you want, we'll call it the mutation function," it's a fixed key TanStack looks for; a typo there fails silently with no fired mutation and an easy-to-miss error.
- **Interview angle:** "What's the difference between `useQuery` and `useMutation`?" → `useQuery` is for reads (GET) and auto-fires based on `queryKey`/`queryFn`; `useMutation` is for writes (POST/PUT/PATCH/DELETE), never auto-fires, and you explicitly call `.mutate()` — usually from an event handler — then reconcile the cache yourself in `onSuccess`.
- **Interview angle:** "Explain `staleTime` vs `gcTime` (cacheTime)." → `staleTime` controls how long cached data is trusted as up-to-date before a background refetch is triggered on next access; `gcTime` controls how long unused data is kept in the cache at all before being evicted. Data can be in cache (within `gcTime`) but already stale (past `staleTime`) at the same time — those are two independent clocks.
- **Interview angle:** "Why do query keys matter, and what happens if you get them wrong?" → They're the cache's identity function — same key means same cached entry means no refetch; wrong or missing key components (like leaving out a dynamic `id`) means either false cache hits (stale/wrong data shown) or unnecessary refetches, depending on which way you get it wrong.
- **Interview angle:** "How would you update the UI immediately after a successful delete mutation without waiting for a manual refetch?" → Use `onSuccess` on the `useMutation` call to call `queryClient.setQueryData([queryKey], (old) => old.filter(...))`, patching the cached array directly instead of calling `invalidateQueries` (which, for an actively-rendered query, would trigger a real network round-trip before the UI reflects the change).
- **Interview angle:** "Does calling `invalidateQueries` always trigger an immediate API call?" → No — it always marks the query stale (overriding `staleTime`), but the actual refetch only fires immediately if a component is currently rendering that query. For an inactive/unmounted query, invalidation just flags it stale; the real network call waits until something mounts and reads that query key again.
- **Interview angle:** "How do you show a per-row loading/error state during a delete, and how do you clear an error after showing it?" → Read `isPending`/`isError`/`error` directly off the mutation object returned by `useMutation` (no extra `useState` needed) to drive the button/row UI, and call the mutation's `reset()` when the user dismisses the error or retries — mutation error/success state doesn't clear itself the way a query's does.

**Recap — what I actually walked away having learned:**
- `QueryClientProvider` + a `QueryClient` instance is the one-time setup; everything else hangs off that shared instance.
- `useQuery({ queryKey, queryFn })` replaces `useState` + `useEffect` + manual loading/error state for reads, and gives you `data`/`isPending`/`isError`/`error` for free.
- Two independent cache clocks matter: `staleTime` (is the data still trustworthy) and `gcTime` (is the data still in memory at all) — confusing the two is the most common source of "why is it still refetching/why did my cache disappear" confusion.
- Query keys are the actual cache identity — anything the query result depends on (an id, a page number) has to be part of the key, or the cache silently serves the wrong entry.
- Polling (`refetchInterval`, optionally `refetchIntervalInBackground`) is how real-time-feeling UIs (stock tickers) are built on top of a plain REST GET.
- Pagination's page state is just `useState` — TanStack's only requirement is including that state in the query key; `keepPreviousData` is what removes the loading flash between page changes.
- Mutations (`useMutation`) cover create/update/delete, never auto-run, require an explicit `.mutate()` call, and need you to manually reconcile the cache afterward — either via `setQueryData` (instant, no round-trip, but you must construct the new cache state yourself) or `invalidateQueries` (simpler and safer, but only refetches immediately if the query is currently active — otherwise it just marks stale for next time).
- `useMutation` carries the same `isPending`/`isSuccess`/`isError`/`data`/`error` status shape as `useQuery` (the tutorial never used these, only the `onSuccess`/`onError`/`onSettled` callbacks) — plus `mutateAsync` for promise-based sequencing, `reset()` to manually clear stale success/error state, and `onMutate`/`context` as the actual plumbing behind optimistic updates. Confirmed straight from the [TanStack Mutations docs](https://tanstack.com/query/latest/docs/framework/react/guides/mutations) since the tutorial only demoed the side-effect-callback half.

---

## 🎥 External resource — status

**TanStack Query full-course video:** ["React Query (TanStack) Full Course Tutorial in One Video"](https://www.youtube.com/watch?v=KrruJTTwOgU) — Thapa Technical, ~3.5 hrs. Setup → `useQuery` → DevTools → GC time → stale time → polling → query keys → pagination → `useMutation` logged above as 2.9. Remaining ground (infinite scroll, deploy) still to be reviewed and logged, likely as part of 2.10 or a follow-up note once watched.

---

### 2.11 Portals (`createPortal`) — render modals/toasts outside the parent DOM tree

**Read:** [createPortal](https://react.dev/reference/react-dom/createPortal) — fetched 2026-08-03

- `createPortal(children, domNode, key?)` renders `children` into a **different physical DOM node** than where the component is defined, while keeping it in the **same spot in the React tree**:
  ```js
  <div>
    <p>This child is in the parent div.</p>
    {createPortal(
      <p>This child is in the document body.</p>,
      document.body
    )}
  </div>
  ```
- **The split that makes portals worth having:** DOM placement and React-tree placement stop being the same thing. Physically the content lives wherever `domNode` points; logically it's still a child of the component that called `createPortal` — so it still reads context from its real React ancestors, and events on it still bubble through the React tree, not the DOM tree.
- **Gotcha — event bubbling follows the React tree, which surprises people the first time:** a portaled button inside
  ```js
  <div onClick={handleClick}>
    {createPortal(<button>Click me</button>, document.body)}
  </div>
  ```
  still fires `handleClick` on click, even though in the actual DOM that button is a sibling of `<div>`, not a descendant. If you don't want that, stop propagation inside the portal or move the portal call higher in the tree.
- **Why this exists — the actual use case:** a modal/tooltip/dropdown nested deep inside a component with `overflow: hidden` or a low `z-index` container can't visually escape that ancestor no matter what CSS you throw at it. A portal sidesteps the problem entirely by rendering into `document.body` (or any other node), so the visual stacking context is no longer inherited from the logical parent.
- **Gotcha — portals don't inherit CSS from their DOM parent, only from React context.** Moving content to `document.body` also moves it out of any ancestor's CSS cascade (class-based styles, CSS variables scoped to a wrapper) — style it explicitly, don't assume it "just still looks the same."
- **Gotcha — the target DOM node must already exist, and changing which node you pass on a later render recreates the portal's content** from scratch rather than moving it — so the target node reference itself should be stable across renders (e.g. resolved once via `document.getElementById`, not recomputed).
- **Gotcha — accessibility doesn't come for free.** The doc calls this out explicitly for the modal use case: you own keyboard focus management (trapping focus while open, restoring it on close) and are expected to follow the [WAI-ARIA Modal Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal) — `createPortal` only solves DOM placement, not any of the interaction/accessibility contract a real modal needs.
- **Interview angle:** "If a portaled child and its logical parent both have click handlers, which fires?" → Both — event bubbling in React follows the component tree, not the rendered DOM tree, so a portal doesn't insulate you from ancestor event handlers just because it's rendered elsewhere in the document.
- **Interview angle:** "Why reach for a portal instead of just raising `z-index`?" → `z-index` can't beat an ancestor with `overflow: hidden` or a `position` context that clips/contains it — a portal escapes the DOM subtree entirely rather than trying to out-stack it within the same subtree.
- **Interview angle:** "What does `createPortal` *not* solve for you when building a modal?" → Accessibility — focus trapping/restoration and ARIA modal semantics are still entirely on you; the function only relocates where the markup physically renders.

**Recap — what the doc says to take away:**
- `createPortal(children, domNode)` splits DOM location from React-tree location.
- Context and event bubbling still follow the React tree; CSS inheritance and physical layout follow the DOM tree.
- The main real-world driver is escaping a clipping/stacking ancestor (modals, tooltips, dropdowns).
- The target DOM node must be stable and already exist — swapping it recreates the portal's contents.
- Portals hand you DOM placement only — accessibility (focus, ARIA) is still your responsibility.

---

### 2.12 Refs through components — `ref` as a prop (React 19 makes `ref` a normal prop; `forwardRef` is legacy), `useImperativeHandle`

**Read:** [forwardRef](https://react.dev/reference/react/forwardRef) — fetched 2026-08-03

- **The problem `forwardRef` was built for:** a `ref` attached to a custom component doesn't automatically reach the DOM node inside it — by default a component has no way to receive the `ref` its parent attached at all. Pre-React 19, the fix was wrapping the component:
  ```js
  const MyInput = forwardRef(function MyInput(props, ref) {
    const { label, ...otherProps } = props
    return (
      <label>
        {label}
        <input {...otherProps} ref={ref} />
      </label>
    )
  })
  ```
  giving the render function a second argument, `ref`, that only exists because of the wrapper — it's not a normal prop in this model.
- **React 19 deletes the need for the wrapper entirely — `ref` just becomes a normal prop your function component can destructure like any other:**
  ```js
  function MyInput({ label, ref, ...otherProps }) {
    return (
      <label>
        {label}
        <input {...otherProps} ref={ref} />
      </label>
    )
  }
  ```
  `forwardRef` still works (nothing breaks), but the doc is explicit that it's legacy — there's no reason to reach for it in new React 19 code, since the whole problem it solved (no path for `ref` to arrive as a prop) no longer exists.
- **Forwarding through multiple layers is just forwarding the same prop further down** — no different from passing any other prop through an intermediate component:
  ```js
  function FormField({ ref, ...props }) {
    return <MyInput ref={ref} {...props} />
  }
  ```
- **`useImperativeHandle` restricts what a ref actually exposes**, instead of handing the parent the raw DOM node (and therefore every native method/property on it):
  ```js
  function MyInput({ ref, ...props }) {
    const inputRef = useRef(null)
    useImperativeHandle(ref, () => ({
      focus() {
        inputRef.current.focus()
      },
      scrollIntoView() {
        inputRef.current.scrollIntoView()
      },
    }), [])
    return <input {...props} ref={inputRef} />
  }
  ```
  The parent calling `ref.current.focus()` works, but `ref.current.value` or `ref.current.remove()` don't exist — you've defined the entire public surface area yourself.
- **Gotcha — the real reason to bother with `useImperativeHandle` instead of just exposing the DOM node:** handing out the raw node means every future refactor of the component's internals (swap the wrapping `<label>`, restructure the markup) is a potential breaking change for every caller holding that ref. A restricted handle is a real API contract you control; a raw DOM node is an accidental one.
- **Gotcha — imperative refs are the exception, not the default tool.** The doc's own line: only use a ref for behavior you genuinely can't express declaratively — focusing, scrolling into view, triggering a one-off animation, selecting text. If the "imperative" thing you want is really just a state toggle (open/closed, expanded/collapsed), that belongs in a prop like `isOpen`, not an imperative `{ open(), close() }` handle.
- **Gotcha — only expose refs from low-level, reusable components (buttons, text inputs), not application-level ones (an `Avatar`, a `Comment`).** The lower-level the component, the more likely "focus/scroll/select" is a legitimate cross-cutting need; an application-specific component exposing its internals just recreates the same fragile-refactor problem one level up.
- **Gotcha — Strict Mode double-calls the render function in dev**, same reason as reducers (topic 2.7) — to catch impurities. This is a dev-only artifact, not a production concern, and not a sign your component is broken.
- **Gotcha — "why is my ref always `null`?" has three recurring causes, in order of how often they actually happen:**
  1. Forgot to attach the received `ref` to anything —
     ```js
     // ❌ ref parameter exists but is never used
     function MyInput({ label }, ref) {
       return <label>{label}<input /></label>
     }
     ```
  2. The element carrying the ref is conditionally rendered and currently absent:
     ```js
     // ❌ ref is null whenever showInput is false
     {showInput && <input ref={ref} />}
     ```
  3. The ref is attached correctly, but a child component *between* it and the caller (e.g. a `Panel` that conditionally renders its `children`) is itself hiding the element — the ref target genuinely isn't mounted, not a wiring mistake at the top level.
- **Interview angle:** "Why is `forwardRef` considered legacy in React 19?" → `ref` became a normal prop that any function component can destructure directly — the wrapper existed only to smuggle a `ref` argument in outside the normal props object, and that workaround is no longer necessary.
- **Interview angle:** "Why would you use `useImperativeHandle` instead of just forwarding the raw DOM ref?" → To define a deliberate, minimal API (e.g. only `focus()`/`scrollIntoView()`) instead of exposing the entire DOM node — this keeps the component's internal markup free to change later without breaking every consumer holding a ref to it.
- **Interview angle:** "A component wrapped for ref-forwarding still returns `null` for its ref — what are the usual suspects?" → Either the received `ref` was never attached to an actual element, the element carrying it isn't currently rendered (conditional rendering), or an intermediate child component is itself conditionally hiding the target element.

**Recap — what the doc says to take away:**
- `forwardRef` existed to give a component a second `ref` argument outside normal props — React 19 makes `ref` an ordinary prop, so the wrapper is legacy, not required.
- `ref` forwarding through multiple components is just prop-passing, nothing more exotic.
- `useImperativeHandle` restricts the exposed ref API — expose `focus()`, not the whole DOM node — protecting future refactors of the component's internals.
- Reach for imperative refs only for things that genuinely can't be props (focus, scroll, select, one-off animation) — anything state-shaped belongs in a declarative prop instead.
- Only reusable, low-level components should expose refs at all; application-level components shouldn't.
- A `null` ref is almost always one of three things: never attached, conditionally unrendered, or hidden by an intermediate component.

---

### 2.13 🏗️ Architecture — feature-based folder structure, presentational vs container components, a thin API/service layer, where constants/utils live

**Read:** [Bulletproof React — Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md), [Bulletproof React — Components and Styling](https://github.com/alan2207/bulletproof-react/blob/master/docs/components-and-styling.md) — fetched 2026-08-03

- **Two tiers, not one flat `src`:** shared folders (`components/`, `hooks/`, `lib/`, `types/`, `utils/`, `stores/`, `config/`, `assets/`) sit alongside a `features/` folder, and each feature under
  ```
  features/[feature-name]/
  ```
  gets its own scoped `api/`, `components/`, `hooks/`, `stores/`, `types/`, `utils/` — populate only the ones a given feature actually needs, not the full set every time.
- **Unidirectional flow is the actual rule, not the folder names:**
  ```
  shared → features → app
  ```
  Shared code is importable by anything. A feature can import shared code but never another feature. `app` (routes, root component, providers, router config) sits on top and imports from both — nothing imports from `app`.
- **The flow is lint-enforced, not just a convention** — `import/no-restricted-paths` fails the build if `features/cart` reaches into `features/checkout`. That's the load-bearing detail: without an enforced boundary, "delete the folder, delete the feature" stops being true because features quietly couple to each other over time.
- **Thin API layer, feature-scoped by default:** a feature's `api/` folder holds its request functions and query hooks — this is literally where your 2.9 `useQuery`/`useMutation` calls live. Only pull a dedicated top-level `api/` folder out when multiple features genuinely share the same endpoints; don't pre-build a shared layer before that's true.
- **Constants/utils follow the same default-local rule:** something one feature uses privately stays in that feature's `utils/`; promote to the shared top-level `utils/` only once a second feature actually needs it — resist the urge to guess at reuse up front.
- **Avoid barrel files** (`index.ts` re-exporting everything) — the docs call this out specifically because it breaks Vite's tree-shaking; prefer direct imports from the actual file.
- **Composition over prop explosion:** when a component's prop list balloons, the fix is composition — passing `children`/slots instead of more props — not a bigger props interface.
- **Gotcha — presentational vs. container components isn't actually in this source.** It's an older, pre-hooks-era pattern (a "container" holds state/logic, a "presentational" component only renders JSX from props) that Bulletproof React's model has effectively superseded: instead of a wrapper container component whose only job is holding logic, you extract a custom hook (
  ```js
  const { data, isPending } = useThing()
  ```
  ) and call it directly inside the component that needs the JSX — same separation of concerns, one fewer component in the tree.
- **Interview angle:** "How do you stop a React codebase from turning into a tangle of cross-feature imports as it grows?" → A unidirectional architecture (shared → features → app) plus an ESLint rule like `import/no-restricted-paths` that fails the build on a violation — the discipline has to be enforced by tooling, not just documented as a convention.
- **Interview angle:** "Where does an API call for a specific feature belong, and when do you promote it to a shared layer?" → Inside that feature's own `api/` folder by default; only extract a shared top-level `api/` once multiple features are genuinely calling the same endpoints — premature sharing just recouples features you were trying to keep independent.
- **Interview angle:** "Is the presentational/container component split still relevant with hooks?" → Mostly superseded — a custom hook now does what a container component used to do (own the state/logic), called directly from the component that renders the JSX, so you don't need an extra wrapper component just to separate concerns.

**Recap — what the docs say to take away:**
- Split `src` into shared modules and `features/`, with each feature holding only the scoped subfolders it needs.
- Enforce one-directional imports (shared → features → app) with lint, not just convention, so features stay independently deletable.
- Keep API calls, types, and utils feature-local by default; promote to shared only once genuinely reused across features.
- Skip barrel files — they undermine tree-shaking.
- Composition (children/slots) beats a growing props list.
- The classic presentational/container split isn't part of this model — custom hooks now play that role.

---

### Good tasks to redo later (worth repeating as katas)

- Build a stopwatch: `useRef` for the interval ID (no re-render needed), `useState` for the displayed elapsed time (needs re-render) — forces you to feel *why* each hook is the right tool for its half of the problem.
- Build a debounced button component and deliberately break it first by declaring the timeout ID as a module-level `let` — reproduce the "all buttons share one timer" bug, then fix it with a per-instance `useRef`.
- Build a dynamic list (e.g. add/remove todo items) where clicking a "scroll to newest" button sometimes lands one item short — reproduce the batching gotcha, then fix it with `flushSync`.
- Implement the `Map`-of-refs pattern for a list of DOM nodes from scratch without looking at the docs.
- Build a `ChatRoom` component that connects on mount and disconnects on unmount via a fake `createConnection(roomId)`. Deliberately ship it with `[]` as the dependency array while the body reads `roomId` — confirm in the console that switching rooms in the UI never actually reconnects the "socket." Then add `roomId` back and watch the cleanup/connect ordering log correctly.
- Reproduce the infinite-loop gotcha on purpose: `useEffect(() => setCount(count + 1))` with no dependency array — watch React (or the browser) choke, then fix it by adding a real guard/dependency.
- Build a live search box that fetches suggestions per keystroke with an artificial random delay per request (`setTimeout` in your fake fetch). Type fast and confirm without an `ignore` flag a stale, slow response can overwrite a fresher one — then add the `ignore` flag and confirm it can't happen anymore.
- Build the "3 timeouts, 3 different logged values" kata from the docs: an input bound to `text` state, an Effect that logs `text` after a 3-second timeout with no cleanup. Type fast, watch it log every intermediate value instead of just the final one — this is the closure-capture gotcha in miniature.
- Take a component with one Effect doing two unrelated things (e.g. logging + subscribing) and split it into two Effects — notice how much easier it becomes to reason about each one's dependency array in isolation.
- Take a `FullName` form with an Effect that syncs `firstName + lastName` into a `fullName` state variable — delete the Effect and the state variable entirely, replace with a single derived `const`. Add a console log inside the Effect first so you can literally watch the extra render disappear once it's gone.
- Build a `ProfilePage({ userId })` that resets a `comment` text field on user switch two ways: first via `useEffect(() => setComment(""), [userId])`, then refactor to `<Profile userId={userId} key={userId} />`. Add a console log in `Profile`'s render to prove the `key` version never even renders the stale comment.
- Reproduce the "notification fires on page reload" bug from the shared-event-handler-logic example: an Effect that shows a toast when `product.isInCart` is true. Refresh the page while an item is already in the cart and watch the toast appear uninvited — then fix it by moving the notification into the actual click handler.
- Build the chain-of-Effects game example (card → goldCardCount → round → isGameOver) exactly as broken, and count the renders per card placement with a render-counter ref. Then collapse it into one `handlePlaceCard` event handler and confirm the render count drops to one.
- Reproduce the "object dependency" over-firing bug on purpose: pass `{ serverUrl, roomId }` as an inline object literal in the dependency array of a chat-connect Effect, add a console log inside the Effect, and watch it fire on every render even when neither value changed. Fix it by moving the object construction inside the Effect body.
- Build the theme/reconnect kata from the docs: a `ChatRoom({ roomId, theme })` where a naive Effect reconnects on every theme toggle. Reproduce the bug first (log "reconnecting" on theme change), then fix it with `useEffectEvent` so only `roomId` changes trigger a reconnect.
- Reproduce the timer bug from the "never suppress the linter" gotcha: a `Timer` with `count` and `increment` state, an Effect with `eslint-disable-next-line` and `[]` deps calling `setCount(count + increment)` on an interval. Change `increment` mid-run and confirm the displayed count keeps incrementing by the *original* value — then fix it properly with `useEffectEvent`.
- Extract a `useOnlineStatus` hook from scratch, call it in two sibling components (e.g. `StatusBar` and `SaveButton`), and add a console log inside the hook's `useState` initializer to prove each call creates its own independent state — even though both UIs visibly update in sync.
- Deliberately name a plain sorting/filtering helper `useSorted` and try calling it inside an `if` — watch the linter flag it — then rename it `getSorted` and confirm the conditional call is fine.
- Build a `useChatRoom({ serverUrl, roomId, onReceiveMessage })` hook exactly as broken (no `useEffectEvent`, `onReceiveMessage` in the dependency array) and add a connect/disconnect console log — trigger a re-render unrelated to `roomId`/`serverUrl` (e.g. a sibling state update causing this component to re-render) and watch it reconnect anyway. Fix with `useEffectEvent`.
- Build `useFormInput(initialValue)` returning `{ value, onChange }`, spread it onto two different `<input>`s in one form, and confirm editing one never affects the other's value.
- Build a `tasksReducer` for a todo list with `'added'`/`'changed'`/`'deleted'` actions, then deliberately break purity by having the `'added'` case push a `Date.now()` timestamp read *inside* the reducer — confirm in Strict Mode you can see it double-fire, then fix it by generating the timestamp in the dispatching event handler instead and passing it in the action.
- Take a form with five separate `useState` fields and one "reset" button that currently calls `setX`/`setY`/etc. five times — refactor to `useReducer` with a single `'reset_form'` action, and notice the handler shrinks to one line.
- Build the classic prop-drilling-then-context refactor from scratch: a `Heading` three levels deep needs a `level` prop — first thread it through manually as a prop three times, then replace with `createContext`/`useContext`/provider and confirm the intermediate components no longer mention `level` at all.
- Build a small theme toggle using Context + `useReducer` together (context provides both `theme` and `dispatch`) — this is the pattern to have muscle memory for before reaching for Zustand/Redux in Phase 3.
- Prove the context re-render cost to yourself: put `{ count, theme }` in one context, add a render-counter `console.log` to a component that only reads `theme`, and watch it log on every `count` update — then split into two contexts and watch the log stop firing for unrelated updates.
- Build a `Modal` with `createPortal(children, document.body)`, nest its trigger button inside a wrapper `<div>` with `overflow: hidden`, and confirm the modal visually escapes it while a `console.log` in the wrapper's `onClick` still fires when you click inside the modal — proves DOM placement and React-tree placement are independent.
- Take that same modal and deliberately skip focus management — tab through the page with it open and watch focus leave the modal entirely — then fix it with a basic focus trap.
- Build a `MyInput` component two ways: first with `forwardRef`, then refactored to destructure `ref` directly as a normal prop (React 19 style) — confirm both let a parent call `.focus()` on the underlying `<input>`.
- Reproduce each of the three "ref is always null" bugs on purpose (unattached ref, conditionally-unrendered element, ref hidden behind an intermediate conditional child) and fix each one.
- Build a `MyInput` that exposes only `focus()` and `scrollIntoView()` via `useImperativeHandle`, then try (and fail) to access `ref.current.value` from the parent — confirms the handle is a real restricted API, not just a thin wrapper around the DOM node.
- Take the GitHub repo explorer project idea and actually scaffold it: `features/repos/{api,components,hooks}` plus a top-level `components/`/`utils/`, then deliberately import something from a sibling feature folder and watch `import/no-restricted-paths` (once configured) fail the build.

_Next up: 2.10 Mutations & optimistic patterns (intro) — plus infinite scroll / deploy segments of the TanStack video still to review_
