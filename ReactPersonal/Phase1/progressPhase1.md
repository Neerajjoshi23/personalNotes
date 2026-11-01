# Progress Log — Phase 1 (react.dev "Learn React")

> Companion to `react-learning-path.md`. Format: interview-answer angle summaries + katas worth redoing.

---

## React — Phase 1

### 1.1 Components, import/export
**Read:** [Your First Component](https://react.dev/learn/your-first-component), [Importing and Exporting Components](https://react.dev/learn/importing-and-exporting-components) — fetched 2026-07-25

- A component is just a JS function that returns markup (JSX), reusable as a UI building block.
- **Naming:** must start with a **capital letter** — this is how React tells custom components (`<Profile />`) apart from native HTML tags (`<div />`).
- **Defining a component (3 steps):** `export` it → `function ComponentName() {}` → `return` JSX.
- **Return statement gotcha:** multi-line JSX must be wrapped in `(...)`. Without parens, ASI silently inserts a semicolon after a bare `return` and the JSX on the next line is dropped — component renders nothing.
- **Never nest component definitions** — defining `function Profile() {}` inside another component's body is slow (recreated every render) and causes state/identity bugs. Always define components at the top level; pass data via props instead.
- **Default vs named exports:**
  - Default: `export default function Button() {}` → import as `import Button from './Button.js'` (max **one** default export per file, can rename freely on import).
  - Named: `export function Button() {}` → import as `import { Button } from './Button.js'` (unlimited per file, name must match).
- Common mistake: importing a default export with `{ }` syntax (or vice versa) — mismatched export/import style errors out.
- **Interview angle:** "Why must component names be capitalized?" → React's JSX-to-`createElement` compiler uses capitalization to decide whether to treat a tag as a host element (string) or a component reference (variable lookup). Lowercase = assumed HTML tag.

### 1.2 JSX — rules, `{}` expressions, attributes
**Read:** [Writing Markup with JSX](https://react.dev/learn/writing-markup-with-jsx), [JavaScript in JSX with Curly Braces](https://react.dev/learn/javascript-in-jsx-with-curly-braces) — fetched 2026-07-25

- JSX exists so **markup and the rendering logic that produces it stay co-located** in one file, instead of split across templates/controllers.
- **Three rules of JSX:**
  1. **Single root element** per return — wrap siblings in a `<div>` or a Fragment `<>...</>` (JSX compiles to a single JS object, so a function can't "return" multiple top-level elements).
  2. **All tags must close** — including self-closing ones (`<img />`, not `<img>`).
  3. **camelCase attributes** — `className` not `class`, `strokeWidth` not `stroke-width` (attributes become JS object keys; `class` is a reserved word). Exception: `aria-*` and `data-*` keep dashes.
- **Curly braces `{}`** escape into JS from two places: as text content (`<h1>{name}</h1>`) or right after `=` in an attribute (`src={avatar}`, not `src="{avatar}"`).
- Any expression works inside `{}` — variables, function calls, arithmetic, string concat. Not statements (no `if`/`for` directly inside).
- **Double curlies `{{ }}`** for inline style/object props — outer `{}` is JSX-escape, inner `{}` is the object literal itself: `style={{ backgroundColor: 'black' }}`.
- **Gotcha:** you cannot render a raw object as a child — `<h1>{person}</h1>` throws "Objects are not valid as a React child"; must access a primitive field (`{person.name}`).
- **Interview angle:** "What are the 3 rules of JSX, and why does React require a single root element?" → single-root is required because JSX transpiles to one `React.createElement(...)` call tree per return — you can't return two sibling objects from a function.

### 1.3 Props — passing, default, `children`
**Read:** [Passing Props to a Component](https://react.dev/learn/passing-props-to-a-component) — fetched 2026-07-25

- Props are passed like HTML attributes: `<Avatar person={{name:'Lin'}} size={100} />`.
- **Read via destructuring** in the function signature: `function Avatar({ person, size }) {}` — equivalent to (but cleaner than) `function Avatar(props) { props.person }`.
- **Default values:** `function Avatar({ size = 100 }) {}` — the default only kicks in for **missing or `undefined`** props. Explicitly passing `size={null}` or `size={0}` does **not** trigger the default (common trip-up).
- **Spread syntax** (`<Avatar {...props} />`) forwards all props concisely, but overusing it is a smell — usually means the component should be split, or content should be passed as `children` instead.
- **`children` prop:** anything nested between a component's opening/closing tags is automatically passed as the special `children` prop — e.g. `<Card><Avatar /></Card>` → inside `Card`, `children` is the `<Avatar />` element. This is how wrapper components (Card, Modal, Layout) stay generic.
- **Props are read-only and flow one-way** (parent → child). A component can never modify its own props — for data that changes over time, that's what state is for. To get "new" props, the parent must re-render and pass different values down.
- **Interview angle:** "Are props mutable?" → No — props are an immutable snapshot at a given render. If a child needs to change data over time, it needs its own state, and the parent must own/pass down updates instead. Also: "Why does `size={0}` not fall back to a default?" → defaults only apply for `undefined`, not falsy-but-defined values like `0`, `null`, `""`.

### 1.4 Conditional rendering
**Read:** [Conditional Rendering](https://react.dev/learn/conditional-rendering) — fetched 2026-07-25

- Conditional rendering is just **plain JS control flow** used inside JSX — no special React syntax, just `if`/ternary/`&&`.
- **`if`/`else`** — clearest for returning entirely different JSX trees; use when branches diverge a lot.
- **Ternary `? :`** — best when both branches are short and you need both a true and false output inline.
- **`&&`** — best when you either render something or render *nothing* (no meaningful "else" case).
- Returning `null` from a component is valid (renders nothing) but uncommon — prefer having the **parent** decide whether to include the component at all, since a component silently returning `null` can surprise other devs reading it.
- React treats `false`, `null`, `undefined` as **rendering holes** — nothing shows up for them.
- **Gotcha:** `count && <p>...</p>` — if `count` is `0`, JS doesn't short-circuit to "nothing," it evaluates to the number `0` itself, and React renders the literal `0` on screen. Always coerce to a real boolean: `count > 0 && <p>...</p>`.
- **Interview angle:** "Why does `messageCount && <Badge />` sometimes render a stray `0`?" → `&&` returns the left operand if falsy, not a rendering "nothing" — `0` is falsy but is still a valid renderable value in React, unlike `false`/`null`/`undefined`.

### 1.5 Lists & keys (reconciliation)
**Read:** [Rendering Lists](https://react.dev/learn/rendering-lists) — fetched 2026-07-25

- Render a list by `.map()`-ing data into JSX elements, usually wrapped straight in the parent tag: `<ul>{people.map(p => <li key={p.id}>{p.name}</li>)}</ul>`.
- **Every JSX element produced inside a `map()` call needs a `key`** — React uses it to identify which item is which across renders, independent of array position.
- **Keys must be stable and unique among siblings** — a real ID from your data (DB id, `crypto.randomUUID()`), never `Math.random()` (regenerates every render, so React treats every item as brand-new and remounts everything) and never array `index` **if the list can reorder/insert/delete** (index shifts under items, so React matches the wrong old state to the wrong new item).
- **Keys aren't passed as a prop** — `<Profile key={id} userId={id} />` means the component itself never sees `key`; if it needs the id, pass it again under a different prop name.
- **Gotcha:** arrow function with `{}` body inside `.map()` needs an explicit `return`, same trap as this file's earlier `App.jsx` bug — `data.map(item => { <li>{item}</li> })` silently returns `undefined` for every item (no error, just nothing renders).
- Rendering multiple sibling nodes per list item needs `<Fragment key={id}>...</Fragment>` explicitly — the shorthand `<>...</>` fragment can't take a `key`.
- **Interview angle:** "Why not just use the array index as key?" → index is really "position," not "identity" — if the list reorders/filters, index-as-key makes React match stale state/DOM (e.g. a text input's typed value) to the wrong item after the reorder. Only safe when the list is static and never reorders/mutates.
- **Interview angle:** "What actually breaks if keys are missing entirely?" → React falls back to index-based matching by default and logs a console warning; on reorder/insert/delete it can misattribute component state (classic symptom: wrong row highlighted, or input focus/value jumping to the wrong row) and forces more DOM work than necessary.

### 1.6 Keeping components pure
**Read:** [Keeping Components Pure](https://react.dev/learn/keeping-components-pure) — fetched 2026-07-25

- React assumes every component is a **pure function**: same props/state/context in → same JSX out, every time, like a math formula.
- **Pure means two things:** doesn't mutate anything that existed *before* it was called (no external state), and always produces the same output for the same input.
- **Mutating a variable declared outside the component during render is the classic violation** — e.g. a module-level `let guest = 0` that gets incremented inside the component body. Each render changes shared state, so output depends on *how many times* it's been called, not just its inputs.
- **Local mutation is fine** — creating a variable/array *inside* the render and pushing to it (e.g. building a list with a `for` loop) is safe, because nothing outside the function knows about it or depends on it.
- **Side effects (API calls, DOM manipulation, timers, mutating outside variables) don't belong in the render body at all** — they belong in an **event handler** (preferred, runs in response to user action) or `useEffect` (fallback, runs after render).
- **Strict Mode** intentionally calls each component function **twice in development only** specifically to surface impure components — if a component is pure, calling it twice changes nothing visible; if it's impure (like the mutating-guest-counter example), the output visibly breaks/doubles.
- **Gotcha:** purity bugs are often invisible until Strict Mode (or concurrent rendering) calls a component more than once — code that "seems to work" in a naive single-pass render can quietly rely on render count/order.
- **Interview angle:** "Why does React call components twice in development (Strict Mode)?" → to intentionally expose impure components — if a component's output changes purely from being invoked an extra time (not from new props/state), it's mutating something external during render, which breaks React's ability to skip/cache/interrupt renders safely.
- **Interview angle:** "Where should side effects like API calls go, and why not directly in the component body?" → render must stay pure/predictable so React can safely re-run, skip, batch, or interrupt it (needed for concurrent features and server rendering); side effects belong in event handlers or `useEffect`, which run *after* React has already decided what to render.

### 1.7 Events
**Read:** [Responding to Events](https://react.dev/learn/responding-to-events) — fetched 2026-07-25

- **Pass the function, never call it:** `onClick={handleClick}` runs on click; `onClick={handleClick()}` runs the function *immediately during render* and hands React whatever it returns (often `undefined`) as the handler — this is the same "curly-brace switches to JS mode, but you executed instead of referenced" family of mistake as earlier gotchas.
- **Convention, not enforced by React:** name the function `handleX` (`handleClick`, `handleSubmit`), name the *prop* you expose from a custom component `onX` (`onSmash`, `onPlayMovie`) — mirrors native DOM naming (`onClick`) so custom components feel consistent with built-ins.
- **Handlers can read props/state directly** since they're defined inside the component closure — no extra wiring needed, e.g. `() => alert(message)` where `message` is a prop.
- **Custom components forward handlers as ordinary props** — `<Button onClick={onClick}>` — React itself only recognizes `onClick`/`onChange`/etc. on actual DOM elements (`<button>`, `<input>`); on your own components, `onSmash`/`onClick`/anything is just a regular prop you chose to name that way.
- **Events bubble by default** — a click on a nested `<button>` fires its own `onClick`, then bubbles up and fires the parent `<div>`'s `onClick` too, child-to-parent order. `onScroll` is a notable exception — it does not bubble.
- **`e.stopPropagation()`** stops the bubble — parent handlers won't fire after a child calls this.
- **`e.preventDefault()`** is unrelated to bubbling — it stops the browser's own default behavior for that element (e.g. a `<form onSubmit>` reloading the page, an `<a>` navigating).
- **Gotcha:** `stopPropagation()` vs `preventDefault()` are commonly confused — one stops the event traveling to ancestors, the other stops the browser's built-in action; you can need either, both, or neither depending on the case.
- **Capture phase:** appending `Capture` to an event name (`onClickCapture`) fires it during the *downward* phase (parent-to-child), before the normal bubble-phase handler, and fires even if a descendant later calls `stopPropagation()` — an escape hatch for rare "I need to intercept before children can stop it" cases.
- **Event handlers are the correct home for side effects** — unlike the pure render body (1.6), handlers run in response to a real user action, so `fetch`, `alert`, timers, and state updates (`setState`) all belong here, not in the component's top-level render code.
- **Interview angle:** "What's the difference between `stopPropagation` and `preventDefault`?" → `stopPropagation` stops the event from bubbling to ancestor handlers; `preventDefault` stops the browser's own built-in behavior for that element (form submit reload, link navigation) — independent concerns, and you sometimes need both in the same handler.
- **Interview angle:** "Why does `onClick={handleClick()}` break things?" → the `()` invokes the function immediately, during render, instead of handing React a reference to call later on the actual click — a rendering-time bug, not a click-time one.

### 1.8 `useState` / state as memory
**Read:** [State: A Component's Memory](https://react.dev/learn/state-a-components-memory) — fetched 2026-07-25

- **The `useState` Hook provides two things:** a state variable to retain data between renders, and a state setter function to update the variable and trigger React to re-render the component.
- **Why a plain local variable can't do this job:**
  ```jsx
  let index = 0;
  function handleClick() {
    index = index + 1; // lost next render, and doesn't trigger a re-render either
  }
  ```
  React re-runs the whole component function from scratch on every render, so a normal `let`/`const` resets each time — and even if it didn't, mutating it wouldn't tell React "please redraw the screen."
- **Anatomy:**
  ```jsx
  const [value, setValue] = useState(initialValue);
  ```
  `useState` always returns a **2-item array** (destructured by position, not name) — current value first, setter function second. The argument is only used as the value on the very first render.
- **Rule of Hooks — call only at the top level, never inside `if`/`for`/nested functions.** React matches state variables to their `useState` calls purely by **call order** across renders — a conditional or looped `useState` call means the order can shift between renders, silently corrupting which state pairs with which variable.
- **State is private and isolated per component instance** — two `<Gallery />` elements each get their own independent state; a parent can't read or directly control a child's internal state (that's what lifting state up, topic 1.12, is for).
- **Gotcha:** reading the state variable *immediately after* calling its setter still gives the **old** value in that same function call — the update only applies starting from the *next* render, not synchronously mid-handler. If you need the fresh value right away, use a plain local variable instead of the just-set state.
- **Gotcha:** don't reach for `useState` for a value that's only used within one function call and never needs to persist across renders (e.g. a `prompt()` result used once) — a regular variable is simpler and avoids the "stale until next render" trap above.
- **Interview angle:** "Why doesn't a normal variable work for something like a counter?" → React re-renders the function from scratch each time, so a plain variable's mutations don't survive to the next render, and mutating it doesn't tell React to re-render at all — `useState` solves both problems (persistence + triggering a re-render).
- **Interview angle:** "Why can't hooks be called conditionally?" → React tracks hook state purely by the *order* hooks are called in on each render, not by name — an `if`/loop around a `useState` call can change that order between renders, causing React to hand back the wrong stored value for a given hook slot.

### 1.9 Render & commit, state as a snapshot
**Read:** [Render and Commit](https://react.dev/learn/render-and-commit), [State as a Snapshot](https://react.dev/learn/state-as-a-snapshot) — fetched 2026-07-25

- **Three-step lifecycle for anything showing up on screen: trigger → render → commit.** Trigger is what *asks* for a render (initial mount via `createRoot(...).render()`, or a `set` call); render is React *calling* your component functions; commit is React actually *touching the DOM*. Nothing on screen changes until commit.
- **Trigger:** the very first render is triggered by calling `root.render()`. Every render after that is triggered by a state setter — calling `setSomething` **queues** a render, it doesn't render synchronously right there.
- **Render is recursive:** React calls the component function, and if what it returns includes other components, React calls *those* too, all the way down, until it has the full tree of what should be on screen. This is pure calculation — **no DOM is touched during render**, it's all happening in memory.
- **Commit — initial mount vs re-render are different operations:** on the *first* render, React uses `appendChild()` to slam every DOM node onto the page at once. On a *re-render*, React only applies the **minimal diff** needed to make the DOM match the new render output — it does not rebuild everything from scratch.
- **Bailout example (why an `<input>` keeps your typed text):** if a component re-renders but a particular JSX element (like an `<input>`) is in the same position and unchanged, React leaves that actual DOM node alone — it doesn't wipe and recreate it, which is *why* uncontrolled input text survives a parent's re-render even though the component function ran again.
- **After commit, the browser repaints** — that's the actual pixels-on-screen step, and it's outside React's control entirely (plain browser behavior).
- **State as a snapshot — the mental model that explains "why doesn't my variable update":** calling a `set` function does **not** mutate the state variable in the currently-running function call. It only schedules a new render. The state variable value you're holding in this render is fixed — a **snapshot** — for the entire lifetime of that render's function call, including every event handler defined inside it.
- **The "substitution" trick for `setNumber(number + 1)` x3 in one handler:** since `number` is a snapshot fixed at, say, `0` for this whole handler, all three calls literally evaluate to `setNumber(0 + 1)` — same value, three times — so the counter increments by 1, not 3, no matter how many times you call the setter with the same stale variable in a row.
- **Async code closes over the snapshot, not "the future value":** a `setTimeout` or `.then()` inside a handler captures whatever `number`/`message`/etc. was during *that* render — even if state changes before the timeout fires, the alert/log still shows the old value, because the closure captured the snapshot, not a live reference.
- **Gotcha:** this is the single biggest source of "my `console.log` right after `setState` shows the old value" confusion — it's not a bug, it's the intended isolation model; each render (and everything defined inside it — handlers, closures, JSX) is a fully separate, frozen snapshot.
- **Gotcha — "parent re-rendered" ≠ "prop changed," and neither one resets child state:** by default, if a parent re-renders for *any* reason (even unrelated state ticking somewhere above it), React re-calls every child function underneath it too — **even if the props you pass down are the exact same value as last render.** There's no bailout unless the child is wrapped in `memo`. But re-calling the child's function does **not** reset its `useState` — the `useState(initialValue)` argument is only honored on the component's *first* mount; on every later re-render (parent-triggered or not), React hands back the already-stored value instead. So a child sitting at `count = 3` stays at `3` through any number of parent-driven re-renders, and its uncontrolled `<input>` text survives too (same commit-phase bailout as the Clock example above) — state and DOM only reset if the component actually **unmounts** (removed from the tree, or its `key`/type changes so React treats it as a new instance).
- **Gotcha — "stale local state from a prop" bug (the real-world version of the above):** seeding `useState` with a prop only initializes it **once**, on first mount — later prop changes are silently ignored because the child's the same instance, not a fresh one:
  ```jsx
  function Parent() {
    const [value, setValue] = useState("A");
    return (
      <>
        <button onClick={() => setValue("B")}>Change</button>
        <Child initial={value} />
      </>
    );
  }

  function Child({ initial }) {
    const [localValue, setLocalValue] = useState(initial); // only used on mount!
    return <p>{localValue}</p>;
  }
  ```
  Click the button → `Parent`'s state becomes `"B"` → `Child` re-renders with `initial="B"` → but `useState(initial)` is ignored on this call, so `localValue` is still stuck at `"A"`. The screen never updates to "B" even though the prop clearly changed.
  - **Fix 1 (react.dev's preferred fix) — reset via `key`:** `<Child key={initial} initial={initial} />`. Changing the `key` makes React treat it as a **brand-new instance** — old one unmounts, new one mounts fresh, so `useState(initial)` runs as a genuine first-mount with the new value. One render pass, no stale flash.
  - **Fix 2 (the `useEffect` sync, more code, discouraged as a default) — resync manually:**
    ```jsx
    useEffect(() => {
      setLocalValue(initial);
    }, [initial]);
    ```
    Works, but costs an **extra render pass**: `Child` first re-renders showing the *stale* `localValue` ("A") → commits → effect fires after commit → calls `setLocalValue("B")` → schedules a second render → *now* shows "B". User sees a brief flash of stale state, and you pay for two render+commit cycles instead of one. React.dev's "You Might Not Need an Effect" (2.4) explicitly lists "adjusting state based on props in an Effect" as an anti-pattern for exactly this reason — the `key` reset is the recommended way to avoid needing the effect at all.
- **Interview angle:** "Walk me through what happens between clicking a button and seeing the screen update." → trigger (setter call queues a render) → render (React recursively calls component functions to compute the new JSX tree, no DOM touched yet) → commit (React diffs and applies the minimal DOM mutations) → browser paints the result.
- **Interview angle:** "Why does calling `setNumber(number + 1)` three times in a row only add 1, not 3?" → because `number` is a snapshot value fixed for that entire render/handler — all three calls resolve against the same stale `number`, so they're functionally identical calls, not three sequential increments. (Fixed properly with the updater-function form, topic 1.10.)
- **Interview angle:** "Why does an `alert` inside a `setTimeout` show the old state value even after the state has since changed?" → the timeout's callback is a closure over that specific render's snapshot; state doesn't mutate in place, so the closure's captured variable stays frozen at whatever it was when the handler was created, regardless of what state becomes later.

### 1.10 Batching / queueing state updates
**Read:** [Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates) — fetched 2026-07-25

- **Batching:** React waits until *all* code in an event handler finishes running before processing state updates and re-rendering — it doesn't re-render after each individual `setX` call. Analogy from the docs: a waiter doesn't sprint to the kitchen the moment you name your first dish; they wait for your whole order, then place it once. Avoids wasted intermediate renders and "half-finished" renders with inconsistent state mid-handler.
- **This is exactly why 1.9's `setNumber(number + 1)` x3 problem happens:** since `number` is a snapshot fixed at `0` for the whole handler, all three calls are literally `setNumber(1)` three times — batching plus the snapshot model together mean only the *last* queued value for that variable "wins," giving `1`, not `3`.
- **The fix — updater function form `setNumber(n => n + 1)`:** instead of handing React a fixed replacement value, you hand it a function that says "whatever the state is *by the time this actually runs*, add 1 to it." React queues these functions and runs them **in order** at the next render, each one fed the *previous* updater's return value — not the stale snapshot. Three queued `n => n + 1` calls chain `0→1→1→2→2→3`, correctly landing on `3`.
- **Mixing plain values and updater functions in one handler — a replacement value clears everything queued before it:**
  ```jsx
  setNumber(number + 5);   // "replace with 5" — queue: [5]
  setNumber(n => n + 1);   // queue: [5, n=>n+1] → resolves to 6
  setNumber(42);           // plain replacement — DISCARDS everything queued before it
  // final result: 42
  ```
  Updater functions queued *after* a plain replacement still run against that replacement's result; a plain replacement queued *after* updater functions just wipes them and starts fresh from that fixed value.
- **Gotcha — batching does NOT span separate user interactions:** two separate clicks on a button are two separate handled events, each gets its own batch/render — React never merges state updates from click #1 with click #2. This is intentional: if click #1's handler disables a form, click #2 must see that disabled state rather than assuming click #1's queued updates haven't landed yet.
- **Gotcha — updater functions must stay pure**, same rule as the render body itself: only compute and return a new value, no side effects (fetches, DOM writes, more `setState` calls) inside them. Strict Mode deliberately calls each updater function twice (discarding the second run) specifically to catch impurity here, same trick as 1.6's double-invoke for components.
- **Naming convention:** since the state variable name (`number`) is already taken in scope, updater function params are typically named with the first letter (`n => n + 1`), a `prev` prefix (`prevNumber => ...`), or occasionally the full name shadowed intentionally — purely a readability convention, not enforced by React.
- **Interview angle:** "What's the difference between `setNumber(number + 1)` and `setNumber(n => n + 1)`, and why does it matter when called multiple times in one handler?" → the first captures a stale snapshot value at handler-creation time, so repeated calls just overwrite each other with the same computed value; the second queues a function that reads whatever value is *actually* accumulated so far in the queue, so repeated calls chain correctly. Always reach for the updater form when the new state depends on the previous state.
- **Interview angle:** "Does React batch state updates across two separate `onClick` events?" → No — batching is scoped to a single event handler's synchronous execution; separate discrete events (two clicks, a click then a later timeout) each get their own render, by design, so effects of an earlier interaction are guaranteed visible before a later one is processed.

### 1.11 Updating objects & arrays in state (immutably)
**Read:** [Updating Objects in State](https://react.dev/learn/updating-objects-in-state), [Updating Arrays in State](https://react.dev/learn/updating-arrays-in-state) — fetched 2026-07-25

- **Core rule: treat anything stored in state as read-only, even though JS objects/arrays are technically mutable.** Directly mutating a state object (`person.firstName = 'x'`) changes its contents but **not its reference** — and React's re-render check is a reference comparison (`Object.is`), so mutating in place is *invisible* to React. No `setX` call means no re-render gets queued, no matter how "correct" the data now looks in memory.
- **Correct pattern — always create a new object/array and pass that to the setter.** For a flat object, spread the old one and override just the changed field:
  ```jsx
  setPerson({
    ...person,             // copy all existing fields
    firstName: e.target.value  // override just this one
  });
  ```
- **Nested objects need spreading at *every* level, because spread is shallow.** Spreading only the top level and replacing a nested object wholesale silently **drops every other field on that nested object**:
  ```jsx
  // WRONG — loses artwork.title and artwork.image
  setPerson({ ...person, artwork: { city: 'New Delhi' } });

  // RIGHT — spread at each nesting level
  setPerson({
    ...person,
    artwork: { ...person.artwork, city: 'New Delhi' }
  });
  ```
- **Gotcha — "nesting" is really just separate objects referencing each other, not one deep structure.** If two different state objects happen to point at the *same* inner object (e.g. both share one `initialPosition` reference), mutating that inner object through one path silently corrupts the other — because there's really only one shared object underneath, not two independent copies. This is why the fix is always "create a new object," not "figure out which reference is safe to touch."
- **Local mutation is still fine** — same rule as 1.6's purity discussion: mutating a **freshly created** object/array that nothing else references yet is safe (e.g. building up `const next = {}; next.x = ...; setPosition(next)`). The rule only forbids mutating an object that's *already* sitting in state (or came in as props).
- **Arrays — same rule, but the trap is knowing which built-in methods secretly mutate.** JS array methods split into two camps:
  | Operation | Mutates (avoid) | Returns new array (prefer) |
  |---|---|---|
  | Add | `push`, `unshift` | `[...arr, item]` / `concat` |
  | Remove | `pop`, `shift`, `splice` | `filter` |
  | Replace | `splice`, `arr[i] = x` | `map` |
  | Sort/reverse | `reverse`, `sort` (in place!) | copy first (`[...arr]`), *then* sort/reverse the copy |
- **Gotcha — `sort()` and `reverse()` mutate the original array even though they don't "sound" destructive the way `push` does.** Always copy first: `const next = [...list]; next.reverse(); setList(next);` — calling `list.reverse()` directly mutates the state array in place, same invisible-to-React problem as object mutation.
- **Gotcha — `slice()` vs `splice()` are two different methods despite the near-identical name, and one of them will bite you if you confuse them:** `slice(start, end)` returns a **new** array (safe), `splice(start, deleteCount, ...items)` **mutates in place** (avoid in state). This is a classic naming trap specifically because they look so similar.
- **Updating an object nested *inside* an array — copying the array shell isn't enough.** `[...myList]` only copies the array container; each element inside is still the exact same object reference as before, so mutating `newList[0].seen = true` still mutates the original shared object even though you "copied the array." Correct approach: use `map()` to swap out just the changed item with a *new* object, leaving everything else untouched:
  ```jsx
  setMyList(myList.map(item =>
    item.id === targetId
      ? { ...item, seen: nextSeen }  // new object for the changed one
      : item                         // same reference for everything else
  ));
  ```
- **Immer (`useImmer`) as the escape hatch for deep nesting:** lets you write code that *looks* like direct mutation (`draft.artwork.city = 'x'`) against a special `draft` Proxy object; Immer records what you touched and builds a real new immutable object behind the scenes. Solves the verbosity of multi-level spreading, at the cost of a dependency and a bit of "magic" to explain to someone unfamiliar with it.
- **Interview angle:** "Why doesn't `person.name = 'new'` followed by nothing else trigger a re-render?" → React detects state changes via reference comparison, not deep value comparison; mutating in place keeps the same reference, so React has literally no signal a change occurred — you must call the setter with a new object/array reference for React to schedule a re-render.
- **Interview angle:** "Why is `[...array]` alone not enough to safely update an object nested inside that array?" → spread only copies one level deep (the array container itself); the objects inside are still the *same* references as before, so mutating an element after a shallow array copy still mutates the original shared object. Fix: use `map()` to swap in a brand-new object for the changed item.
- **Interview angle:** "Name three array methods that mutate in place that people forget mutate." → `sort()`, `reverse()`, and `splice()` are the classic surprises — none of them "sound" as destructive as `push`/`pop`, which is exactly why they cause subtle state bugs; always copy the array first if you need to sort/reverse it.

### 1.12 Choosing state structure, lifting state up
**Read:** [Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure), [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components) — fetched 2026-07-26

- **The overarching goal — "make state as simple as it can be, but no simpler."** Five concrete rules get you there: group related state, avoid contradictions, avoid redundant state, avoid duplication, avoid deep nesting. Each one is really about the same root idea — fewer independent things that can drift out of sync with each other.
- **Rule 1 — group state that always changes together.** If `x`/`y` (or any pair of variables) only ever update in the same handler, at the same time, merge them into one object (`{ x, y }`) instead of two separate `useState` calls. Prevents the bug where you update one and forget the other. Trade-off: updating just one field now means spreading the rest — `setPosition({ ...position, x: 100 })`, not `setPosition({ x: 100 })` (which would silently drop `y`).
- **Rule 2 — avoid contradictions (impossible states).** Two booleans like `isSending`/`isSent` can technically both be `true` at once even though that combination makes no real-world sense — the type system doesn't stop you from setting both. Fix: collapse them into one enum-like variable, `status: 'typing' | 'sending' | 'sent'`, then derive the booleans (`const isSending = status === 'sending'`) instead of storing them separately. Now the invalid combination simply cannot be represented.
- **Rule 3 — avoid redundant state: don't store what you can calculate during render.** Classic offender: storing `fullName` as its own `useState` alongside `firstName`/`lastName`, then manually syncing it in every handler. Just compute it inline every render: `const fullName = firstName + ' ' + lastName;` — no separate state, no possibility of it going stale.
- **Gotcha — don't mirror a prop into local state "just in case."** `useState(messageColor)` looks reasonable but only captures `messageColor` once (mount-time), same trap discussed back in 1.9's stale-derived-state bug — the local copy silently stops following the parent's updates. If you only need to read it, use the prop directly (no `useState` needed at all); if you genuinely need to freeze it at mount on purpose, rename the prop `initialColor`/`defaultColor` so the "one-time snapshot" intent is obvious to the next reader instead of looking like an accidental bug.
- **Rule 4 — avoid duplicating the same data across two state variables.** Storing both `items` (the full list) and `selectedItem` (a *copy* of one item's object) means editing `items` doesn't automatically update `selectedItem` — they're two separate references to what should be the same data, so they drift out of sync the moment one updates without the other. Fix: store only an ID (`selectedId`), then derive the object fresh every render: `const selectedItem = items.find(item => item.id === selectedId)`. Now there's exactly one source of truth (`items`), and `selectedItem` can never be stale because it's recalculated from the live list every time.
- **Rule 5 — avoid deeply nested/tree-shaped state; flatten it (normalize, like a database).** A tree where each node holds its children as nested objects makes any deep update require copying every ancestor level on the way back up to the root (same multi-level-spread pain as 1.11's nested-object problem, just recursive). Fix: flatten into a lookup table keyed by ID, where each node stores its children as an array of **IDs**, not nested objects — exactly how a relational database normalizes data:
  ```jsx
  const plan = {
    0: { id: 0, title: '(Root)', childIds: [1, 42] },
    1: { id: 1, title: 'Earth', childIds: [2, 10] },
    2: { id: 2, title: 'Africa', childIds: [] },
  };
  ```
  Updating a node now only ever touches **two levels** — the node itself and its direct parent's `childIds` array — never the whole ancestor chain.
- **Lifting state up — the mechanical recipe for sharing state between siblings** (this is exactly what you already built with `App`/`GetUserInfo`/`ShowUserInfo`, just now with an official name and step order):
  1. **Remove the state from the child** — delete its local `useState`, replace the value with an incoming prop instead.
  2. **Pass hardcoded values down from the common parent first** — just to confirm the wiring/structure works before adding real state.
  3. **Add real state to the common parent, and pass both the value and an event-handler callback down** — the child now reads state via props and requests changes by calling the handler prop, never by managing its own copy.
- **Controlled vs. uncontrolled, defined precisely via this recipe:** a component is **uncontrolled** when it manages its own local state internally (parent has no say); it becomes **controlled** once that state is lifted out and driven entirely by props from a parent. Neither is "better" universally — uncontrolled is simpler for a component used in isolation, controlled is required the moment two components need to coordinate.
- **Single source of truth principle:** for any given piece of state, exactly **one** component should "own" it — every other component that needs it either receives it as a prop (read) or receives a callback to request a change (write). Never let two components maintain their own independent copies of what's conceptually the same state.
- **Gotcha — data flows down, requests flow up, always.** A child never directly calls the parent's `setState` — it can only call a **callback prop** the parent handed it (e.g. `onShow`), and that callback is what actually calls `setState` up in the parent. The child triggers the *request*; the parent performs the *actual* state change. This is the same shape as your Contact Board's `addUserDetails` callback.
- **Interview angle:** "Why is storing both `isSending` and `isSent` as separate booleans a bad idea?" → it allows impossible combinations (both `true`, or both `false` mid-send) that have no real meaning — collapsing them into a single `status` enum makes invalid states unrepresentable instead of just "unlikely."
- **Interview angle:** "You have a list and a 'selected item' — should you store the selected item's object or its ID?" → store the ID, derive the object from the list on every render (`items.find(...)`). Storing the object directly duplicates data that can silently go stale if the underlying list updates and the stored copy doesn't.
- **Interview angle:** "What's the practical difference between a controlled and an uncontrolled component?" → uncontrolled manages its own state internally and the parent can't influence it; controlled has that state lifted out, driven entirely by props, so the parent fully dictates its behavior — necessary the moment sibling components need to stay in sync.

### 1.12b Controlled vs. uncontrolled — deeper dive (interview drill, no new fetch)

- **The core distinction is about *who owns the source of truth*, not "does it have an `<input>` tag."** For a native form element, controlled means the DOM node's displayed value is dictated by React state (via a `value` prop) instead of by the browser's own internal input state; uncontrolled means the browser owns it and React only seeds a `defaultValue` once, then steps back.
- **Controlled input, step by step:** keystroke → browser fires the native input event → React's synthetic `onChange` runs → you call the setter → state updates → component re-renders → `value={state}` gets handed back to the same DOM node → React re-applies it. The input only *looks* like it's typing naturally because the same character is being fed back fast enough — React is overwriting the node's value on every keystroke, not just reading it.
- **Uncontrolled input:** React renders once with `defaultValue`, then the DOM node manages its own value entirely on every keystroke. React never re-renders per keystroke and doesn't know the current value unless you go read it via a `ref` (or `FormData` on submit).
- **Gotcha — flipping modes at runtime.** Seeding state as `useState()` (starts `undefined`) then later resolving it to a string means the first render passes `value={undefined}` (uncontrolled-looking) and a later render passes `value={'something'}` (controlled) — React throws *"A component is changing an uncontrolled input to be controlled."* Fix: always initialize state to `''`, never `undefined`, for anything bound to `value`.
- **The pattern generalizes past `<input>` entirely — it's a component-authoring concept, not a DOM-forms concept.** Any custom component with an internal `useState` is "uncontrolled" from its parent's perspective; the same component with that state removed and driven by props instead is "controlled." A toggle button with no form element anywhere follows the identical shape:
  ```jsx
  // Uncontrolled — Toggle owns its own state
  function UncontrolledToggle() {
    const [isOn, setIsOn] = useState(false);
    return (
      <button onClick={() => setIsOn(!isOn)}>
        {isOn ? 'ON' : 'OFF'}
      </button>
    );
  }

  // Controlled — parent owns the state, Toggle just displays it
  function ControlledToggle({ isOn, onToggle }) {
    return (
      <button onClick={onToggle}>
        {isOn ? 'ON' : 'OFF'}
      </button>
    );
  }
  ```
- **Gotcha — "controlled" describes two different boundaries, and conflating them causes real confusion.** Boundary 1 (the `<input>` sense): is the DOM node's value governed by React state, or by the browser? That state can live locally in the *same* component and the input is still correctly called "controlled" — no parent required. Boundary 2 (the custom-component sense): is this state owned by *this* component, or lifted up and driven by a *parent* via props? A `ControlledInput` with `useState` local to itself is controlled at boundary 1 (React, not the DOM, owns the value) even though it's not controlled at boundary 2 (no parent is involved at all).
- **Interview angle:** "Is a controlled input always driven by a parent?" → No — the defining line is DOM-node-value-owned-by-React-state vs. DOM-node-value-owned-by-the-browser. Whether that state lives in the same component or gets lifted to a parent is a separate, orthogonal decision (state colocation vs. prop drilling), not part of the controlled/uncontrolled definition itself.
- **Interview angle:** "How would you design a custom component to support both controlled and uncontrolled usage?" → Accept an optional `value`/`onChange` pair; if `value` is provided, treat it as controlled and never touch internal state for it; if `value` is `undefined`, fall back to internal `useState` seeded from an optional `defaultValue`. Same pattern React's own `<input>` uses internally.

### 1.13 Preserving & resetting state
**Read:** [Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state) — fetched 2026-07-26

- **React ties state to a component's position in the render tree, not to the component instance itself.** State isn't "inside" the component — React holds it externally, keyed by "where this component sits." Same position across renders → React hands back the same state; different position → fresh state.
- **Rule 1 — same component type, same position → state survives, no matter how props change.** A `Counter` toggling between `isFancy={true}`/`isFancy={false}` at the exact same JSX slot keeps its click count — props changing doesn't reset state, only position/type changing does.
- **Rule 2 — different component type at the same position → React tears down the whole subtree and starts over.** Switching `{isPaused ? <p>...</p> : <Counter />}` at one slot means React unmounts `Counter` (state gone) when `<p>` shows, and mounts a brand-new `Counter` (fresh state) when it comes back — even though it "looks like" the same counter to a human reading the JSX.
- **Gotcha — "same JSX line" isn't the rule; "same position in the actual rendered tree" is.** Two `if`/`else` branches that each return a `<Counter />` as, say, the first child of a `<div>` do count as the same position (state preserved) — but if the surrounding structure differs between branches (e.g. one wraps it in an extra `<div>` and the other doesn't, or the sibling order changes), the tree shape itself differs and React resets state even though a `<Counter />` element visually appears in "the same place" in your source code.
- **Removing a component from the tree destroys its state completely** — e.g. unchecking a checkbox that conditionally renders `{showB && <Counter />}` doesn't "pause" `Counter`'s state, it deletes it; re-checking mounts a new instance starting from the initial value again.
- **`key` overrides position-based identity with an explicit, developer-chosen identity.** Same key at the same position → same identity → state preserved regardless of what else changes; different key (even same component type, same position) → React treats it as a different component entirely → forces a state reset.
- **Practical key use #1 — force a reset on purpose:** two sibling instances of the same component (e.g. a `Scoreboard` toggling between `<Counter key="Taylor" .../>` and `<Counter key="Sarah" .../>`) get independent, never-shared state specifically because the keys differ — switching "current player" doesn't leak one player's count into the other's.
- **Practical key use #2 — force a reset when switching data, like a chat draft:** without a key, switching the selected contact in a `Messenger` app reuses the same `Chat` component instance, so a half-typed message to contact A silently stays visible after switching to contact B (state carried over from the wrong context). Adding `<Chat key={to.id} contact={to} />` makes each contact's chat a distinct identity, so switching contacts always mounts a fresh, empty draft.
- **Gotcha — this same-position rule is *why* nested component definitions cause the mount code smell from 1.1/1.9's warning to bite here specifically:** defining a component function inside another component's body means a *new function* (a different "type," as far as React's identity check cares) gets created every render — so even though it's rendered at the exact same position every time, React sees a "different component type" each render and destroys/recreates the state on every single render, not just on genuine structural changes.
- **Interview angle:** "If two sibling components render the exact same JSX, like `<Counter />` twice in a list, do they share state?" → No — state is tied to *position* in the tree, and each renders at a distinct position, so each gets an entirely independent state slot even though the component type and props are identical.
- **Interview angle:** "Why would changing props on a component never reset its state, but changing its type at the same spot always does?" → React's default reconciliation check at a given tree position is "same component type here as last render?" — if yes, it reuses the existing instance and just re-renders with new props (state untouched); if no, it's treated as removal of the old tree + insertion of a new one, so state is destroyed regardless of any prop similarity.
- **Interview angle:** "How would you force two different data records rendered through the same component (e.g. switching selected contact) to *not* share leftover state/input values?" → give each record's rendered instance a unique `key` derived from stable data (`key={contact.id}`), not from position/index — this makes React treat each as a wholly distinct identity, guaranteeing a clean remount whenever the key changes even though it's structurally "the same component slot."

---

## Good tasks to redo later (worth repeating as katas)

- Build a small component tree (e.g. `Gallery` → multiple `Profile`s) split across files using **named exports** for reusable subcomponents and a **default export** for the page-level component — forces both export patterns.
- Deliberately break the "single root element" rule and the "nested component definition" rule to see the actual React error messages — helps recognize them fast later.
- Build a `Card` component that only knows about `children`, then wrap three different things in it (text, an image, a form) — drills the `children` prop pattern used everywhere (Modal, Layout, Toast later).
- Write an `Avatar`-style component with a default prop value, then explicitly call it with `size={0}` and `size={null}` to see the default-value gotcha firsthand.
- Build a message-count badge with `&&` using a raw `count` (not `count > 0`) to see the stray `0` render on screen firsthand.
- Render a list of items with `key={index}`, then add an "insert at front" button — watch state/input values attach to the wrong row after insert. Fix it by switching to a stable `id` key and see the bug disappear.
- Break the `.map()` arrow-function-with-braces-no-return bug on purpose again (this time in a list), to pattern-match it faster next time.
- Write a component that mutates a module-level `let counter` on each render, then wrap `<App />` in `<StrictMode>` and watch the count jump by 2s instead of 1s — feel the impurity bug directly instead of just reading about it.
- Move a `console.log('rendered')` + fake API call from inside a component body into a `useEffect` and compare when each one fires (render time vs after-commit).
- Nest a `<button>` inside a `<div>`, give both an `onClick` — see the bubbling order in the console, then add `e.stopPropagation()` in the button's handler and see the parent stop firing.
- Build a form with `onSubmit`, deliberately omit `e.preventDefault()` first to see the page reload/reset, then add it back.
- Write `onClick={handleClick()}` on purpose to see the "runs immediately on render" bug firsthand, then fix it to `onClick={handleClick}`.
- Build a counter with a plain `let count` variable first (no `useState`) — click the button, see the displayed number never actually change even though the variable is incrementing — then swap in `useState` and compare.
- Put a `useState` call inside an `if` on purpose to see React's "Rendered more/fewer hooks than expected" error firsthand.
- Reproduce the stale-read gotcha: call `setValue(newValue)` then immediately `console.log(value)` on the next line — confirm it logs the old value, not the new one.
- Build a `+3` button that calls `setNumber(number + 1)` three times in one handler — confirm it only adds 1, then explain why using the substitution trick.
- Build a form that `setTimeout`s an `alert` of a message/recipient after 5 seconds, change the recipient before it fires, and watch the alert still show the old recipient — connect it back to the snapshot model.
- Re-render a component with a controlled prop (like a live clock `<h1>{time}</h1>`) next to an uncontrolled `<input>` — type in the input, watch the clock update every second while your typed text survives, and explain why via the commit-phase bailout.
- Redo the `+3` kata from 1.9, but this time fix it: swap all three `setNumber(number + 1)` calls for `setNumber(n => n + 1)` and confirm the counter now correctly jumps by 3.
- Build a handler that mixes a plain replacement and an updater function — `setNumber(number + 5); setNumber(n => n + 1); setNumber(42);` — predict the final value before running it, then verify against the queue-processing table.
- Wrap an updater function in `<StrictMode>` and add a side effect inside it on purpose (e.g. a `console.log` or a fetch call) — watch it fire twice, connecting it back to the same double-invoke mechanism as 1.6's pure-render check.
- Build two buttons that both call `setCount(count + 1)` (non-updater form) rapidly in two separate clicks — confirm each click's render sees the correctly-updated prior value, proving batching doesn't bleed across separate events.
- Reproduce the classic mutation bug on purpose: mutate a state object directly (`person.firstName = 'x'`) inside a handler with no `setPerson` call after — confirm the screen never updates even though `console.log(person)` shows the new value.
- Build a two-level-nested object in state (e.g. `{ name, artwork: { title, city } }`), update only `city` via a shallow `setPerson({ ...person, artwork: { city: 'x' } })` — watch `title` silently disappear, then fix it with proper multi-level spreading.
- Recreate the shared-reference bug: create one `initialPosition` object, put it into two different pieces of state, mutate it through one path, and watch the other one change too — then fix it by giving each state its own object.
- Recreate the "artist add" duplicate-key bug from earlier in this session on purpose (module-scope counter reset via hot reload) and fix it with `crypto.randomUUID()` — ties 1.5's key-stability lesson directly into this topic.
- Build a todo-toggle feature (array of `{id, done}` objects) using the wrong approach first — `[...list]` then mutate the found item directly — confirm the "unrelated" original list also breaks, then fix it with `map()` returning a new object for the matched item only.
- Sort a list in a click handler using `list.sort()` directly on the state array (no copy) — watch for subtle bugs (e.g. two sort clicks with unrelated re-renders behaving oddly), then fix by copying first with `[...list]`.
- Deliberately confuse `slice()` and `splice()` in a "remove item" handler to see the mutation bug firsthand, then fix it using the correct one.
- Build a form with `isSending`/`isSent` as two separate booleans, force both `true` at once on purpose (call both setters in one handler) to see the impossible state, then refactor to a single `status` enum and show the bug can no longer happen.
- Build a `firstName`/`lastName` form storing `fullName` as its own redundant `useState`, break it by only updating `firstName`'s handler, then fix by computing `fullName` inline during render instead.
- Build a list + "selected item" feature the wrong way first (`selectedItem` as a stored object copy), edit the underlying list, and watch the selection go stale — then fix it by storing only `selectedId` and deriving the item via `.find()`.
- Take your Contact Board's `users` array and add a nested `address: { city, zip }` field per user — practice updating just `city` for one user immutably (combines 1.11's nested-object spreading with this topic's array-of-objects update).
- Take an existing uncontrolled component (local `useState` for open/closed) and manually run through the lifting-state-up recipe step by step (remove state → hardcode props → add real state + handler to parent) to feel the transition from uncontrolled to controlled directly.
- Build a component that toggles between two prop variants of the same component at the same JSX position (like the fancy/plain `Counter`) — confirm the click count survives the toggle, proving props changing alone never resets state.
- Build the `isPaused ? <p>...</p> : <Counter />` example — increment the counter, toggle to the paragraph and back, and confirm the count resets to 0, proving a type change at the same position wipes state even though a human would call it "the same slot."
- Recreate the Scoreboard "two players" example with `key="Taylor"`/`key="Sarah"` — increment one player's score, switch players, switch back, and confirm each player kept their own independent count.
- Recreate the chat-draft bug on purpose: build a `Messenger` with a `Chat` component with no `key`, type a partial message, switch contacts, and watch the draft persist into the wrong contact's chat — then fix it with `key={to.id}` and confirm each contact gets a clean draft.
- Define a component function *inside* another component's body (the classic 1.1 mistake) and give it local `useState` — type into an input inside it, trigger any parent re-render, and watch the input's value/state reset every single time, tying the "different type each render" identity rule directly to a visible bug.

*Next up: 2.1 `useRef` — values that don't trigger renders.*
