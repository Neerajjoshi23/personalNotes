# Progress Log - Phase 4 (Production hardening)

> Continue hardening the existing SoundBlend project; no new app.
> Phase 3 project status: only authentication remains, planned first for today.

## React - Phase 4

### 4.1 Render model, applied revision

**Completed:** 2026-10-25 - re-read and revised.

Already covered in [Phase 1, section 1.9: Render & commit, state as a snapshot](../Phase1/progressPhase1.md#19-render--commit-state-as-a-snapshot). Keep the existing summary there; no duplicate notes here.

### 4.2 Measured memoization

**Read:** [useMemo](https://react.dev/reference/react/useMemo) — fetched 2026-10-25 _(memo and useCallback basics are introduced inside this article; their own reference pages are still pending)_

- **useMemo** caches a calculation's result between renders. React reruns it only when a **dependency** changes, compared with **Object.is** (shallow, reference-based for objects/arrays/functions); otherwise it returns the stored value.
- The calculation function must be **pure**, take no arguments, and the dependency list must include **every reactive value** it reads (props, state, variables/functions declared in the component body). The linter enforces this.
- **Recalculation vs re-render are different problems.** useMemo skips repeated work inside a render; **memo** skips rendering a child when its props are unchanged. They combine: memo on the child only works if the array/object/function props you pass are reference-stable.
- **Code example:** useMemo + memo working together.

```jsx
const List = memo(function List({ items }) {
  // skipped when items keeps the same reference
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.text}</li>
      ))}
    </ul>
  );
});

function TodoList({ todos, tab, theme }) {
  // new array on every render unless memoized
  const visibleTodos = useMemo(() => {
    return filterTodos(todos, tab);
  }, [todos, tab]);

  return (
    <div className={theme}>
      <List items={visibleTodos} />
    </div>
  );
}
```

- **When it is worth it (article's list):** the calculation is noticeably slow and its dependencies rarely change; the value is passed to a **memo**-wrapped child; or the value is a dependency of another Hook (**useEffect**, another useMemo). Otherwise there is no benefit, though little harm besides readability.
- **How to judge "expensive":** wrap with console.time/timeEnd; roughly **1ms+** per interaction, or looping thousands of objects, is the threshold. Test in a production build with CPU throttling, not dev/Strict Mode.
- **useMemo does not speed up the first render**, only updates.
- **Effect dependency objects:** an object built in the component body is new every render, so an Effect depending on it fires every render. useMemo can stabilize it, but the better fix is to **move the object inside the Effect** and depend on primitives (like roomId). Reason: useMemo is an optimization, not a semantic guarantee; React may discard the cache and refire the Effect.
- **Memoizing a dependency of another Hook:** an object created in the body and used in a useMemo dependency list defeats that useMemo. Move the object creation **inside** the calculation and depend on the underlying primitives.
- **Functions:** a function prop is a new reference every render, breaking memo on the child. **useMemo can cache a function** by returning one, but that nesting is clunky. **useCallback** is the same thing without the wrapper: it returns your function (does not call it), and "doesn't do anything else."
- **Code example:** the two equivalent forms.

```jsx
// useMemo returns a function
const handleSubmit = useMemo(() => {
  return (orderDetails) => {
    post('/product/' + productId + '/buy', { referrer, orderDetails });
  };
}, [productId, referrer]);

// useCallback: same result, no nesting
const handleSubmit = useCallback((orderDetails) => {
  post('/product/' + productId + '/buy', { referrer, orderDetails });
}, [productId, referrer]);
```

- **Caveats:** top level only (no loops/conditions; for per-item memoization extract a child component or wrap it in memo). Strict Mode calls the calculation **twice** in dev to expose impurity. The cache can be discarded (dev file edits, suspending on initial mount), so never rely on it for correctness; use state or a ref if you need a guarantee.
- **Gotcha:** Forgetting the dependency array reruns the calculation every render.
- **Gotcha:** Writing the arrow body with braces and an object literal returns undefined; use an explicit return.
- **Gotcha:** Memoizing the list but passing a fresh object/inline function to the memo child silently breaks memo: one always-new prop defeats the whole thing.
- **Gotcha:** Mutating a prop inside the calculation (todos.push) shows up as a double-add under Strict Mode; mutate only objects you created within the calculation.
- **Gotcha:** Using a ref to dodge a dependency: the ref won't update when roomId changes and won't notify React, so the Effect keeps using stale options.
- **Debugging a broken memo:** log the dependency array across renders, store both as globals, and compare each entry with Object.is to find the one that changes.
- **Interview angle:** "useMemo vs memo?" → useMemo caches a value inside a component; memo skips re-rendering a component when props are shallow-equal. They pair because memo needs stable references.
- **Interview angle:** "useMemo vs useCallback?" → useMemo caches a computed result; useCallback caches the function itself. useCallback(fn, deps) equals useMemo(() => fn, deps).
- **Interview angle:** "Should you wrap everything in useMemo?" → No. Fix structure first (children as JSX, keep state local, pure rendering, avoid effect-driven state chains, trim effect deps), measure with the Profiler, then memoize where it shows up.
- **Interview angle:** "Why not useRef instead of useMemo for an effect dependency?" → A ref doesn't update from reactive values and doesn't trigger renders; useMemo recomputes when dependencies change.

**Recap — what the doc says to take away:**

- useMemo caches a calculation between re-renders until its dependencies change.
- Use it for genuinely slow calculations, for stable props to memo components, and for values used as Hook dependencies.
- Without a memo child, stabilizing values mostly doesn't matter; without profiling, you're guessing.
- Prefer restructuring (move objects into Effects/calculations, local state, children as JSX) over memoization.
- The React Compiler can auto-memoize values and functions, reducing manual useMemo/useCallback.

---

**Read (memo):** [memo](https://react.dev/reference/react/memo) — fetched 2026-10-25

- **memo** wraps a component so React skips re-rendering it when the parent re-renders and every prop is **shallowly equal** (**Object.is** per prop). Default React behavior is the opposite: a parent render re-renders all children recursively.
- **memo only guards against parent-driven renders.** The component **still re-renders on its own state change, on a context it consumes, and (per your note) on a store subscription** like a Zustand selector change. Only props are filtered.
- To react to **part** of a context, read it in an outer component and pass the needed piece down as a prop to a memoized child.
- **Minimize prop changes:** pass primitives instead of a whole object, or project to something that changes less (a boolean like hasGroups instead of the whole person). If an object is unavoidable, stabilize it with **useMemo**; for functions, declare them outside the component or use **useCallback**.
- **Custom comparator (arePropsEqual):** second argument to memo, returns true if output would be identical. Rare; the doc says measure that it is actually cheaper than re-rendering.
- **Code example:** state and context bypass memo, props respect it.

```jsx
const Greeting = memo(function Greeting({ name }) {
  const theme = useContext(ThemeContext); // theme change still re-renders
  const [greeting, setGreeting] = useState('Hello'); // own state still re-renders
  return (
    <h3 className={theme}>
      {greeting}, {name}!
    </h3>
  );
});
```

- **Gotcha:** An object, array, or inline function prop defined in the parent body is new every render, so memo is "completely useless" until you stabilize it.
- **Gotcha:** A custom comparator that ignores a function prop leaves the child calling a stale closure (old props/state). If you write one, compare **every** prop including functions.
- **Gotcha:** A deep-equality comparator can freeze the app if the data shape grows.
- **Gotcha:** memo is a hint, not a guarantee; React may still re-render, so correctness must not depend on it.
- **Interview angle:** "Does memo stop all re-renders?" → No, only parent-triggered ones with equal props. Own state, consumed context and store subscriptions still render it.
- **Interview angle:** "Why does memo sometimes do nothing?" → A prop is a new reference each render (object, array, inline function). Stabilize with useMemo/useCallback or pass primitives.
- **Interview angle:** "Do you need memo with React Compiler?" → Typically not; the compiler caches the JSX/values automatically, more broadly than memo.

**Read (useCallback):** [useCallback](https://react.dev/reference/react/useCallback) — fetched 2026-10-25

- **useCallback caches the function itself; useMemo caches the result of calling your function.** useCallback never calls it; it returns your function, and the same reference until dependencies change. Equivalent to useMemo(() => fn, deps).
- **It doesn't prevent creating the function** each render; React just hands back the cached one when deps are unchanged.
- **Worth it only when:** the function goes to a **memo** child, or it is a **dependency of another Hook** (useEffect, another useCallback/useMemo). Otherwise no benefit.
- **Code example:** useCallback paired with memo.

```jsx
const ShippingForm = memo(function ShippingForm({ onSubmit }) {
  // skipped when onSubmit keeps the same reference
  return <form onSubmit={onSubmit} />;
});

function ProductPage({ productId, referrer, theme }) {
  const handleSubmit = useCallback((orderDetails) => {
    post('/product/' + productId + '/buy', { referrer, orderDetails });
  }, [productId, referrer]);

  return (
    <div className={theme}>
      <ShippingForm onSubmit={handleSubmit} />
    </div>
  );
}
```

- **Updater function removes a dependency:** use setTodos(todos => [...todos, newTodo]) inside the callback so you don't depend on todos and the function stays stable.
- **Effect dependency:** same as with objects, a function used in an Effect refires it every render; prefer **moving the function inside the Effect** over wrapping it.
- **Custom hooks:** wrap functions you return in useCallback so consumers can optimize.
- **Gotcha:** Missing dependency array returns a new function each render.
- **Gotcha:** Can't call useCallback in a loop; extract an item component (or memo that component) instead.
- **Debugging:** log deps across renders and compare each with Object.is.
- **Interview angle:** "useMemo vs useCallback?" → useMemo caches a value (result of calling); useCallback caches the function reference without calling it.
- **Interview angle:** "useCallback without memo?" → Pointless for rendering; only helps if the child is memoized or the function is a Hook dependency.

**Recap — what the docs say to take away:**

- memo skips parent-driven renders when props are shallow-equal; own state, context and store subscriptions still render.
- Stable references (useMemo for values, useCallback for functions) are what make memo effective.
- Custom comparators are a rare last resort and must compare every prop.
- Restructure first (children as JSX, local state, effect-internal objects/functions), profile, then memoize.

**4.2 status:** memo, useMemo and useCallback read.

---

### 4.3 Profiling

**Read:** [Profiler](https://react.dev/reference/react/Profiler) — fetched 2026-10-26 _(React DevTools Profiler tab not covered by this page; the doc only points to it)_

- **Profiler** wraps a subtree and measures its rendering **programmatically**. It takes two props: a string **id** and an **onRender** callback that React calls every time something inside the tree **commits** an update.
- **onRender params:** **id** (which profiler, useful with several), **phase** (mount, update, or nested-update), **actualDuration**, **baseDuration**, **startTime**, **commitTime**.
- **actualDuration vs baseDuration is the key comparison.** actualDuration is ms spent rendering this update, so it shows how well memo/useMemo are working and should drop well below the mount value after first render. baseDuration is the estimated worst case, the sum of each component's most recent render time with no optimization. If actualDuration stays close to baseDuration on updates, memoization isn't helping.
- **commitTime is shared by all profilers in a commit**, so you can group their reports.
- **Multiple and nested profilers** are allowed to measure different parts (Sidebar, Content, Editor inside Content), but each adds CPU and memory overhead; use only where needed.
- **Code example:** logging or sending the metrics.

```jsx
function onRender(id, phase, actualDuration, baseDuration, startTime, commitTime) {
  console.log(id, phase, actualDuration, baseDuration);
  // or send to analytics here
}

<Profiler id="TrackList" onRender={onRender}>
  <TrackList />
</Profiler>
```

- **Gotcha:** Profiling is **disabled in production builds by default**. You need a special profiling build, so don't expect onRender to fire in a normal deploy.
- **Gotcha:** The callback fires on every commit in the subtree, so heavy work or network calls inside it distort the measurements. Aggregate or batch.
- **Gotcha:** Dev numbers are inflated (Strict Mode, dev checks). Judge on a profiling build with realistic devices.
- **Beyond the component:** DevTools Profiler tab is the interactive equivalent (flame graph, why a component rendered). Wrapped components also show in the **Components track** of React Performance tracks; in dev builds all components appear there.
- **Interview angle:** "How do you find unnecessary renders?" → Measure first: DevTools Profiler interactively, or the Profiler component for programmatic/CI numbers, then memoize where actualDuration is high on updates.
- **Interview angle:** "actualDuration vs baseDuration?" → actual is the cost of this update; base is the no-memoization worst case. A big gap means memoization is paying off.

**Recap — what the doc says to take away:**

- Wrap a subtree in Profiler with an id and onRender to get render timings per commit.
- Compare actualDuration against baseDuration to see if memoization works.
- It is off in production unless you use a profiling build, and it has overhead, so use it sparingly.
- For interactive inspection use the React DevTools Profiler tab.

---

### 4.4 Code splitting

**Read:** Already covered in [Phase 3, routing.md Topic 4: Protected Routes & Lazy Loading](../Phase3/routing.md) (sections 4-6: why route splitting matters, `React.lazy` + `Suspense`, route-object `lazy`). Cross-checked against [react.dev lazy](https://react.dev/reference/react/lazy) — fetched 2026-10-26. No duplicate notes of the routing material here; only the extra points from the lazy page:

- **lazy(load)** defers a component's code until its **first render**. `load` isn't called until then, and the promise and its result are **cached**, so it runs once.
- The module must **export the component as `default`** (React renders the resolved `.default`). For a named export, re-map it in the import.
- **Not only for routes.** The page's own example lazy-loads a conditionally shown component (MarkdownPreview behind a checkbox). For SoundBlend that fits **BlenderPage** or any heavy rarely-used panel.
- **Suspense** can wrap the lazy component or any ancestor, and its fallback should be a useful loading UI. After the first load, toggling the component again shows no fallback.
- **Rejected load:** React throws the reason to the nearest **Error Boundary**, which links to 4.5 (a failed chunk download needs a fallback/retry).
- **Code example:** top-level declaration.

```jsx
// module top level, never inside a component
const BlenderPage = lazy(() => import('./pages/BlenderPage'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <BlenderPage />
    </Suspense>
  );
}
```

- **Gotcha:** Declaring lazy **inside** a component creates a new component type each render, so all its state resets. Always declare at module top level.
- **Interview angle:** "What happens if a lazy chunk fails to load?" → The promise rejects and React throws it to the nearest Error Boundary; without one the tree unmounts.

---

### 4.5 Error boundaries and recovery

**Read:** [Component — Catching rendering errors with an Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary), `getDerivedStateFromError`, `componentDidCatch` — fetched 2026-10-26

- By default, an error thrown **during rendering** makes React remove the whole UI. An **Error Boundary** is a component that catches that error from any descendant (including distant ones) and shows a **fallback UI** for just that part.
- **It must be a class component.** There is no function-component equivalent yet; write one `ErrorBoundary` class and reuse it, or use the **react-error-boundary** package.
- **How it works:** a child throws in render, React calls **static getDerivedStateFromError(error)**, you return `{ hasError: true }`, React re-renders the boundary, and render returns the fallback instead of `this.props.children`.
- **getDerivedStateFromError must be pure** (render phase). Side effects like logging go in **componentDidCatch(error, info)**, which gives `info.componentStack`; use it for analytics. In dev, `React.captureOwnerStack()` adds the owner stack (not in production).
- **Code example:** the full boundary and its use.

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // pure: only returns state for the next render
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // side effects go here
    logErrorToMyService(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

<ErrorBoundary fallback={<p>Something went wrong</p>}>
  <Profile />
</ErrorBoundary>
```

- **Granularity:** you don't wrap every component. Place boundaries where an error message makes sense (the list of conversations, each message), not around every avatar. For SoundBlend that suggests one around the track list and one around each track/mixer control so one failed track doesn't take down the mixer.
- **What boundaries do NOT catch:**
  - **Event handlers** (no render in progress; use try/catch and set error state yourself)
  - **Asynchronous code** (setTimeout, requestAnimationFrame, plain promise callbacks); exception: errors thrown inside **startTransition** are caught
  - **Server-side rendering**
  - **Errors thrown in the boundary itself** (only descendants; an outer boundary must catch it)
- **Recovery (retry):** once hasError is true it stays true. The doc's example has no reset; add a way to clear it (a **reset** method that sets hasError false, a **key** change to remount, or react-error-boundary's reset props). This part is not in the Component page, so verify against the react-error-boundary docs.
- **Gotcha:** Fetch/audio failures in async code skip the boundary entirely, so the screen just shows nothing or stale data; handle them explicitly with error state (ties to 4.8).
- **Gotcha:** Putting the boundary around the component that throws, rather than above it, does nothing; it only catches errors from below.
- **Gotcha:** Using one app-level boundary only turns any small error into a full-page fallback.
- **Interview angle:** "Why a class?" → Only classes can define getDerivedStateFromError/componentDidCatch; the hooks API has no equivalent yet.
- **Interview angle:** "What does a boundary not catch?" → Event handlers, async code, SSR, and its own errors.
- **Interview angle:** "getDerivedStateFromError vs componentDidCatch?" → The first updates state to render the fallback (pure); the second is for side effects like logging.

**Recap — what the doc says to take away:**

- Wrap a subtree in an Error Boundary to show fallback UI instead of losing the whole screen.
- It needs getDerivedStateFromError (set error state) and optionally componentDidCatch (log).
- Choose boundary granularity by where an error message is useful.
- It doesn't cover event handlers, async code, SSR, or its own errors; handle those explicitly.

---

> **4.6 Testing, leveled up** is skipped for now; pick up later.

---

### 4.8 Async and lifecycle reliability

**Read:** [MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController), [MDN AbortSignal.any()](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static), [react.dev Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects), [MDN Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) — fetched 2026-10-29

- **AbortController** exists so you can cancel work you no longer want. You create one, pass `controller.signal` into the async call (for example the `signal` option of `fetch`), and when the user changes their mind or hits Cancel you call **controller.abort()**. The doc says abort() can cancel fetch requests, response-body consumption and streams.
- **A signal is one-shot.** Once aborted it stays aborted: every operation holding that signal is cancelled, and reusing the same signal is useless (a new fetch with it aborts immediately). To retry you **clean up what you attached, create a new AbortController, and use its new signal.**
- **AbortSignal.any([a, b])** merges signals into one that aborts when **any** input aborts (reason = the first one that aborted; already aborted if any input already was). Typical use: a long-lived **global** controller (app-level cancel) plus a **local** per-request one (this search was superseded).
- **Listener cleanup on a combined signal:** `any()` has no way to unsubscribe the combined signal from its sources. The doc says the links are **weak references**, so it isn't inherently blocked from garbage collection, but a **non-aborted combined signal stays alive** while its sources are alive **and** it has registered `abort` listeners. If the global signal never aborts, your listener and the combined signal can outlive the request. So **remove the listener when the operation finishes** (same advice as any AbortSignal). The local signal side is the same idea.
- **Code example:** combined signal with a listener removed in `finally`.

```js
async function doOperation(url, localSignal) {
  // aborts if either the global or the local controller aborts
  const signal = AbortSignal.any([
    globalController.signal,
    localSignal,
  ]);

  const onAbort = () => {
    console.log(`Aborted: ${url}`);
  };

  signal.addEventListener('abort', onAbort, { once: true });

  try {
    const response = await fetch(url, { signal });
    return await response.text();
  } finally {
    // global signal may live on, so detach our listener ourselves
    signal.removeEventListener('abort', onAbort);
  }
}
```

- **Cleanup is how Effects stay correct.** An Effect's cleanup must **stop or undo** what it started. The rule of thumb: the user must not be able to tell one run (production) from **setup → cleanup → setup** (Strict Mode in dev). The right question isn't "how do I run it once" but "how do I make it survive a remount".
- **Fetching in an Effect:** cleanup should **abort the fetch** or **ignore its result**. You can't undo a request that already went out, but you can make sure an irrelevant response doesn't touch state (Alice's response is dropped even if it lands after Bob's).
- **Code example:** the doc's ignore flag, then an abort version.

```jsx
useEffect(() => {
  let ignore = false;

  async function startFetching() {
    const json = await fetchTodos(userId);
    if (!ignore) {
      setTodos(json);
    }
  }

  startFetching();

  return () => {
    ignore = true;
  };
}, [userId]);
```

```jsx
useEffect(() => {
  const controller = new AbortController();

  fetch(`/api/search?q=${query}`, { signal: controller.signal })
    .then((res) => res.json())
    .then(setResults)
    .catch((error) => {
      // an aborted fetch rejects; expected, not a failure
      if (error.name !== 'AbortError') {
        setError(error);
      }
    });

  return () => {
    controller.abort();
  };
}, [query]);
```

- **Dev shows two fetches** in the Network tab (first Effect is cleaned up immediately). Production has one. The doc's fix for the noise is a library that **dedupes and caches** (TanStack Query in SoundBlend).
- **Same rule for every subscription:** listener added → cleanup removes it; animation started → cleanup resets; `showModal()` → cleanup closes. This is the rule behind clearing **timers**, removing **listeners**, and closing resources on unmount.
- **Why fetch-in-Effect is a weak default (page's list):** Effects don't run on the server, they create **waterfalls**, don't cache/preload, and the boilerplate to avoid **race conditions** is heavy.
- **User-gesture playback constraint:** autoplay means any playback started without the user asking, including a script calling `play()` outside an input handler. Audible playback is generally allowed only if muted/volume 0, the user **has interacted**, the site is allowlisted, or a Permissions Policy grants it.
- **`play()` returns a promise** that rejects with **NotAllowedError** when blocked. Show a play button instead of failing silently. No event reports autoplay success/failure; `navigator.getAutoplayPolicy()` can check.
- **Code example:** handling a blocked play().

```jsx
async function handlePlay() {
  try {
    await audioRef.current.play();
    setStatus('playing');
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      // blocked by autoplay policy: ask for a click
      setStatus('needs-gesture');
    } else {
      // load/decode failure: this track failed, not the whole mixer
      setStatus('error');
    }
  }
}
```

- **Gotcha:** Reusing an already-aborted controller's signal for the next request. It aborts instantly; create a new controller per request.
- **Gotcha:** Adding listeners to an `AbortSignal.any()` result and never removing them while the global signal lives on. They (and the combined signal) stay alive.
- **Gotcha:** Using a `useRef` flag to stop an Effect running twice in dev. It hides the log, not the bug: connections pile up as the user navigates.
- **Gotcha:** Treating an aborted fetch as a real error and flashing an error UI per keystroke. Filter the AbortError.
- **Gotcha:** Calling `play()` in an Effect on mount or route change. No user gesture, so it's blocked.
- **Interview angle:** "How do you cancel an obsolete search?" → AbortController in the Effect, abort in cleanup (or at least an ignore flag). Abort saves network work; ignore only protects state.
- **Interview angle:** "Can you reuse an aborted signal?" → No, aborted is permanent; make a new controller.
- **Interview angle:** "Why does my Effect run twice in dev?" → Strict Mode remount to expose missing cleanup; make setup → cleanup → setup indistinguishable from one run.
- **Interview angle:** "Why does audio not start?" → Autoplay policy needs a user gesture; handle the `play()` rejection with a visible control.

**Recap — what the docs say to take away:**

- abort() cancels the operation; signals are one-shot, so make a new controller to retry.
- `AbortSignal.any()` combines signals; remove listeners you add to it when the work ends.
- Every Effect that starts something needs a cleanup that stops or undoes it; for fetch, abort or ignore.
- Browsers block audible playback without a user gesture; handle the rejection and offer a control.

---

### 4.9 Optimistic mutations, when persistence exists

**Read:** [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) — fetched 2026-10-29

- **Optimistic update:** the UI acts as if the server operation already succeeded, before the server responds. No spinner wait. If the request succeeds, nothing visibly changes; if it fails, **roll back** to what the UI was before.
- TanStack offers two ways: **via the UI** (render the mutation's `variables` while pending) and **via the cache** (`onMutate` writes the query cache).
- **Via the UI** (simpler, no cache, no rollback): while `isPending`, render a temporary dimmed item from `variables`. On success the refetch replaces it; on error it disappears, or keep it with `isError` plus a **Retry** (`variables` aren't cleared on error). For another component, use **useMutationState** with a **mutationKey** and `status: 'pending'`; it returns an **array** (concurrent mutations), and `submittedAt` can be the key.
- **Via the cache** is for when multiple places on screen need the update. Phases:
  - **onMutate** (when mutate() is called): **cancelQueries** so a background refetch doesn't overwrite the optimistic value, **snapshot** with getQueryData, **setQueryData** with the new value, **return the snapshot**.
  - **onError** (server failed): restore the snapshot, show a non-blocking notification.
  - **onSettled** (always): **invalidateQueries** to resync with the server.
- **Code example:** cache-based optimistic update with rollback.

```jsx
const mutation = useMutation({
  mutationFn: updateDataOnServer,

  onMutate: async (newData) => {
    // 1. stop background refetches from breaking the illusion
    await queryClient.cancelQueries({ queryKey: ['myData'] });

    // 2. snapshot for rollback
    const previousData = queryClient.getQueryData(['myData']);

    // 3. change the cache right now
    queryClient.setQueryData(['myData'], newData);

    // 4. hand the snapshot to onError
    return { previousData };
  },

  onError: (err, newData, context) => {
    // third arg is whatever onMutate returned
    if (context?.previousData) {
      queryClient.setQueryData(['myData'], context.previousData);
    }
    showNotification('Changes could not be saved to the server.');
  },

  onSettled: () => {
    // always re-sync with the database
    return queryClient.invalidateQueries({ queryKey: ['myData'] });
  },
});
```

- **Note:** in the current docs the `onMutate` return value is named `onMutateResult` and the 4th arg is a `context` object holding `client`; older v5 code names the third arg `context`. Same data, different label.
- **When to use which:** one place shows it → `variables`. Several places → cache.
- **Rollback vs refetch:** a refetch alone often restores truth; roll back from the snapshot when the failure is a server problem that makes refetching unreliable.
- **SoundBlend angle (course note):** applies to server mutations such as favorites or saved mixes. Local mixer changes (volume, selection) are client state, not mutations.
- **Gotcha:** Skipping `cancelQueries`; a late refetch overwrites the optimistic value and the UI flickers.
- **Gotcha:** Not returning the snapshot from onMutate, so onError has nothing to restore.
- **Gotcha:** Not returning the invalidate promise; the mutation looks done while the refetch is still running.
- **Gotcha:** Concurrent optimistic updates on one key: restoring one snapshot can undo another in-flight change (the page links TkDodo's "Concurrent Optimistic Updates").
- **Interview angle:** "How do you do an optimistic update with rollback?" → onMutate: cancel, snapshot, set, return snapshot; onError restores; onSettled invalidates.
- **Interview angle:** "When skip the cache?" → One component shows the pending item; use `variables`, no rollback code.

**Recap — what the doc says to take away:**

- Two approaches: UI via `variables`, or cache via `onMutate`.
- Cache approach: cancel, snapshot, set, return snapshot; roll back in onError; always invalidate in onSettled.
- UI approach is simpler when one place displays the result.

---

### 4.10 Responsive rendering

**Read:** [useTransition](https://react.dev/reference/react/useTransition), [useDeferredValue](https://react.dev/reference/react/useDeferredValue) — fetched 2026-10-29

**useTransition**

- Splits updates into **urgent** (typing, clicks) and **non-urgent transitions** (heavy renders, navigation). It returns **isPending** and **startTransition**. Updates inside startTransition are **interruptible**: urgent work discards and restarts them, so the UI never freezes. (It marks *state updates* low priority; it doesn't speed up the fetch itself.)
- **Child-level `action` prop:** call useTransition inside a reusable child (a tab button) so it owns its local pending UI; because the parent's state update happens inside the awaited action, it is part of the transition.
- **Local pending state:** use `isPending` to style the clicked element immediately (spinner, opacity).
- **Prevents Suspense flashes:** React keeps already-revealed UI visible instead of replacing it with a big fallback until the new screen is ready. It only waits for **already revealed** content; a nested Suspense boundary isn't waited on.
- **Routers and error boundaries:** transitions keep navigation smooth and interruptible. If the function throws or rejects, the nearest **error boundary** shows its fallback (ties to 4.5). The standalone `startTransition` has no isPending and its errors can't reach a boundary.
- **Code example:** after-await scope loss.

```jsx
startTransition(async () => {
  await someAsyncFunction();

  // not a transition: scope is lost after the await
  setPage('/about');

  // re-wrap to keep it a transition
  startTransition(() => {
    setPage('/about');
  });
});
```

- **Gotchas (doc):** a **controlled text input** can't be driven by a transition (needs synchronous updates; use two states or useDeferredValue); updates after `await` need re-wrapping; the callback runs **immediately** (logs 1, 2, 3); updates inside `setTimeout` aren't transitions; multiple transitions are batched.
- **Race conditions:** rapid clicks can fire overlapping requests, and Actions don't guarantee completion order, so an older response can overwrite newer data. The doc points to **useActionState** and `<form>` actions, which handle ordering for you, or your own queue/abort logic.

**useDeferredValue**

- Takes a **value** and returns a copy that **lags behind**. Two passes: an **urgent pass** with the new real value and the **old** deferred one (cheap), then a **background pass** with the new deferred value, interruptible and restarted if the value changes again.
- **Code example:** deferring a slow list.

```jsx
const SlowList = memo(function SlowList({ text }) {
  // expensive render
  return <ul>{/* ... */}</ul>;
});

function App() {
  const [text, setText] = useState('');
  const deferredText = useDeferredValue(text);

  return (
    <>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <SlowList text={deferredText} />
    </>
  );
}
```

- **memo is mandatory** on the heavy child: during the urgent pass the deferred prop hasn't changed, so memo lets it skip rendering. Without memo nothing is gained.
- **Stale indicator:** no built-in flag; use `const isStale = text !== deferredText` and dim the old content.
- **With Suspense:** if the background render suspends, users keep seeing the **old value**, not the fallback.
- **React 19 `initialValue`:** `useDeferredValue(value, initialValue)` renders `initialValue` on first mount, then re-renders in the background with the real value. (The doc doesn't say "thread"; it's still React's scheduling on the same thread.)
- **Use it when** you only have a value or prop, not the setter. Don't pass setters into it.
- **Gotcha:** passing a **new object/array created during render** gives a new reference every render, causing unnecessary background re-renders (the doc says "unnecessary", not an infinite loop). Use primitives or objects created outside render.
- **Gotcha:** it does **not** prevent extra network requests; one request per keystroke still happens. Only display is deferred.

**Comparison**

| | useTransition | useDeferredValue | Debounce |
| --- | --- | --- | --- |
| Wraps | A state update (needs the setter) | A value or prop | A callback |
| Delay | Adaptive to device | Adaptive to device | Fixed timer |
| Interruptible | Yes | Yes | No, blocks when it runs |
| Pending flag | `isPending` | Compare value vs deferred | Manual |
| Goal | Keep UI responsive on actions | Keep UI responsive on heavy value-driven renders | Cut network/API calls |

- **Rule of thumb:** have the handler/setter → useTransition. Only a value or prop → useDeferredValue. Limit network requests → debounce plus abort (4.8). They can be combined.
- **Interview angle:** "useTransition vs useDeferredValue?" → Transition wraps the update; deferred value wraps the value. Both make rendering interruptible.
- **Interview angle:** "useDeferredValue vs debounce?" → Deferred is render-level, adaptive and interruptible; debounce is for non-render work like requests and still blocks when it fires.
- **Interview angle:** "Why can't I put an input in a transition?" → Input updates must be synchronous.

**Recap — what the docs say to take away:**

- Transitions and deferred values mark rendering low priority and interruptible so urgent input stays responsive.
- useTransition wraps a setter; useDeferredValue wraps a value, and the deferred child needs memo.
- Neither reduces network calls; keep debouncing/cancellation for requests.
- Mind async limits: after-await updates need re-wrapping, and ordering isn't guaranteed (use useActionState).
