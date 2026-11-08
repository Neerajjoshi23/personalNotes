# React 19 - Notes (Phase 4.11)

Sources: React 19 blog, [useActionState](https://react.dev/reference/react/useActionState), [useOptimistic](https://react.dev/reference/react/useOptimistic), [useTransition](https://react.dev/reference/react/useTransition).

The 5 things worth knowing:

1. Async transitions (Actions)
2. `useActionState` + `<form action>`
3. `useOptimistic`
4. `ref` as a prop, `use()`
5. `useFormStatus` (plus small extras)

---

## 1. Async transitions ("Actions")

A function passed to `startTransition` can now be `async`. React calls such a function an **Action**.

```jsx
const [isPending, startTransition] = useTransition();

function save() {
  startTransition(async () => {
    await updateName(name);       // isPending stays true until this finishes
    startTransition(() => {       // re-wrap: see gotcha below
      setName(newName);
    });
  });
}
```

- Before React 19 the callback had to be sync, so you wrote your own `setLoading(true) ... setLoading(false)`.
- `isPending` is true for the whole async duration. If the function throws, the nearest **error boundary** shows its fallback.
- **Gotcha:** the transition context is lost after the first `await`. A state update after an `await` is NOT a transition unless you wrap it in another `startTransition` (this is a known limitation, not a bug).
- Anything that starts with the name "action" (an `action` prop) is by convention already called inside a transition.

---

## 2. `useActionState` and `<form action>`

### 2a. `<form action={fn}>`

`action` on a form can now be a **function** instead of a URL string.

```jsx
async function handleSubmit(formData) {
  await saveUser(formData.get("email"));   // "email" = the input's name attribute
}

<form action={handleSubmit}>
  <input name="email" />
  <button>Save</button>
</form>
```

- React calls it with a `FormData` object and does `preventDefault` for you (no page reload).
- It runs inside a transition, so it can be async and `isPending` works.
- After the action finishes, **uncontrolled** inputs are reset automatically. Gotcha: this also clears the fields when you only return a validation error. If you want to keep the typed value, return it from the action and use `defaultValue={state.email}`.
- `<button formAction={fn}>` lets different buttons run different actions.
- Same idea works for `<input type="submit" formAction>`.

### 2b. `useActionState`

```jsx
const [state, dispatchAction, isPending] = useActionState(reducerAction, initialState, permalink?);
```

| Part | Meaning |
| --- | --- |
| `reducerAction(previousState, actionPayload)` | Your function. **Previous state first**, then whatever you pass to `dispatchAction`. In a `<form>` the payload is the `FormData`. It can be async and can have side effects. |
| `initialState` | The value of `state` before the first call. |
| `state` | `initialState` at first, then whatever `reducerAction` last **returned**. |
| `dispatchAction` | Pass it as `<form action={dispatchAction}>`, or call it yourself. |
| `isPending` | True while any dispatched action is still running. |
| `permalink` (optional) | For Server Components + progressive enhancement: URL the browser goes to if the form is submitted before JS loads. Ignore it for client-only apps. |

Typical form usage:

```jsx
async function signup(prevState, formData) {
  const email = formData.get("email");
  try {
    await saveUser(email);
    return { ok: true, error: null, email: "" };
  } catch (e) {
    return { ok: false, error: e.message, email };
  }
}

function Signup() {
  const [state, formAction, isPending] = useActionState(signup, { ok: false, error: null, email: "" });

  return (
    <form action={formAction}>
      <input name="email" defaultValue={state.email} />
      <button disabled={isPending}>{isPending ? "Saving..." : "Save"}</button>
      {state.error && <p>{state.error}</p>}
    </form>
  );
}
```

**Using it without a form** (e.g. on a button click): `dispatchAction` must be called inside an Action, so wrap it:

```jsx
function handleClick() {
  startTransition(() => {
    dispatchAction({ type: "ADD" });
  });
}
```

Calling it outside a transition logs an error in development. In a `<form action>` you don't need `startTransition` because React already does it.

**Multiple action types:** pass an object with a `type` and use a `switch` inside the reducer action, like `useReducer`.

```jsx
async function cartAction(prevCount, action) {
  switch (action.type) {
    case "ADD":    return await addToCart(prevCount);
    case "REMOVE": return await removeFromCart(prevCount);
  }
}
```

**Important rules from the doc (caveats):**

- **Queued, sequential:** if you dispatch 4 times, React runs them one after the other, each getting the previous result as `previousState`. 4 clicks with a 1 second API take about 4 seconds. This is by design (it needs the previous result). To make the UI feel fast, combine with `useOptimistic`.
- It is "like `useReducer`, but the reducer can be async and do side effects". That is why the docs call it a *reducer action*.
- `reducerAction` is **not** run twice in StrictMode (it is meant for side effects).
- The return value type should match `initialState`.
- If you update other state after an `await` inside it, wrap that update in `startTransition` (same gotcha as section 1).
- If `reducerAction` **throws**, React cancels all queued actions and shows the nearest **error boundary**. So return errors as state (`{ error }`) for expected failures; only throw for unexpected ones.
- `dispatchAction` has a stable identity (safe to omit from effect dependencies).
- Top-level hook only (no loops or conditions).
- With Server Functions, `initialState` and the payload must be serializable.
- Race conditions: since actions are queued in order, an old response cannot overwrite a newer one. That is why 4.10 says to use `useActionState` for ordering.

---

## 3. `useOptimistic`

```jsx
const [optimisticState, setOptimistic] = useOptimistic(value, reducer?);
```

- `value`: the real value. It is what `optimisticState` equals when **no Action is pending**.
- `reducer(currentState, action)` (optional): a **pure** function that says how to compute the optimistic state, e.g. "add this todo to the list". Without it, whatever you pass to `setOptimistic` becomes the state.
- `setOptimistic` must be called **inside an Action** (a transition, or an `action` prop/`<form action>`). Outside it React warns and the value flashes briefly.
- It also accepts an updater function: `setOptimistic(n => n + 1)`.

```jsx
function Like({ liked, saveLike }) {
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(liked);

  function click() {
    startTransition(async () => {
      setOptimisticLiked(!liked);       // UI shows the new value now
      await saveLike(!liked);           // real request
      // parent updates `liked` when done
    });
  }
  return <button onClick={click}>{optimisticLiked ? "Unlike" : "Like"}</button>;
}
```

**How the flow works**

1. `setOptimistic("b")` makes React render `"b"` immediately.
2. While you `await`, `"b"` stays on screen.
3. When the Action finishes, the real state changes (`setValue(newValue)`).
4. React commits real `value` and `optimistic` **together in one render**. There is no extra "clear" render.

So optimistic state is **temporary**: it only lives while the Action runs. After that, you see `value`. If the server returned `"c"`, you see `"c"`, not `"b"`.

**What happens on failure**

- If the Action throws, the transition still ends and React renders with the current `value`.
- Since the parent only updates `value` on success, `value` is unchanged, so the UI **rolls back automatically** to what it was. Catch the error to show a message.

**What `value` means in different patterns**

- Hard-coded (`useOptimistic(false)`): after the Action it goes back to `false`. Good for "pending" flags.
- Prop/state (`useOptimistic(isLiked)`): after the Action it shows whatever the parent now holds.
- With reducer (`useOptimistic(items, fn)`): if `items` changes while the Action runs, React re-runs your reducer on the new `items`, so optimistic additions stay on top of fresh data.

**In `<form action>` you don't need `startTransition`:**

```jsx
async function submitAction(formData) {
  const newName = formData.get("name");
  setOptimisticName(newName);                // allowed: form actions are already transitions
  const saved = await updateName(newName);
  startTransition(() => action(saved));      // real state update after await needs re-wrap
}
```

**Typical use:** todo lists (show the item right away with a "sending..." style), likes, rename, chat messages. Pair with `useActionState` to avoid its slow queue feeling.

---

## 4. `ref` as a prop, and `use()`

**`ref` as a prop**

```jsx
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
<Input ref={myRef} />
```

- Function components receive `ref` like any prop, so `forwardRef` is not needed any more (it will be deprecated).
- Callback refs can now return a **cleanup function** (runs when the element is removed).

**`use()`**

- `use(Context)` works like `useContext` but may be called **inside conditions and loops** (rare in practice).
- `use(promise)` reads a promise's result; the component suspends until it resolves (shows nearest `<Suspense>` fallback). Rejection goes to the nearest error boundary.
- The promise should be created outside the component (e.g. in a parent or cache); a promise created during render creates a new one every render.

---

## 5. `useFormStatus` and small extras

**`useFormStatus`** (from `react-dom`): a child of a `<form>` can read the form's status without props.

```jsx
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();
  return <button disabled={pending}>{pending ? "Saving..." : "Save"}</button>;
}
```

- Must be rendered **inside** the `<form>` (it will not work in the same component that renders the form).
- Useful for design-system buttons that should not need an `isPending` prop.

- The blog describes it as reading the parent form "as if the form was a Context provider".

**Other additions listed in the blog**

- **Document metadata:** `<title>`, `<meta>`, `<link>` can be rendered in any component; React hoists them to `<head>` (works in client-only apps, streaming SSR, Server Components). Libraries like react-helmet still help for route-based overriding.
- **Stylesheets:** `<link rel="stylesheet" precedence="default">` lets React order stylesheets, dedupe them, and wait for them to load before revealing content that needs them (also inline `<style>`).
- **Async scripts:** `<script async src>` can be rendered anywhere in the tree and is deduplicated.
- **Resource preloading APIs** (`react-dom`): `preinit`, `preload`, `prefetchDNS`, `preconnect`.
- **`<Context>` as provider:** `<ThemeContext value="dark">` instead of `<ThemeContext.Provider>` (the old form will be deprecated later).
- **`useDeferredValue(value, initialValue)`:** `initialValue` is used on first render, then a background re-render uses the real value (already in 4.10).
- **`requestFormReset`** (`react-dom`): reset a form manually, since automatic reset happens only after a successful form Action.
- **Better errors:** hydration mismatch now logs one error with a diff; caught errors are logged once. New root options `onCaughtError` and `onUncaughtError` (plus `onRecoverableError`) to report errors.
- **Hydration and third-party scripts:** unexpected tags in `<head>`/`<body>` added by extensions or scripts are skipped instead of causing mismatch errors.
- **Static APIs:** `prerender` and `prerenderToNodeStream` in `react-dom/static` wait for data before returning HTML (for static generation).
- **Server Components and Server Actions (`"use server"`):** stable, but framework features (e.g. Next.js). `"use server"` marks Server Actions only; there is no directive for Server Components.
- Custom Elements (web components) support is also in React 19.

---

## Notes on the blog's own examples

- The blog's `useTransition` example calls `setError(error)` after `await updateName(name)` without re-wrapping, and its `useOptimistic` example calls `onUpdateName(updatedName)` after an `await`. These are **simplified**. The `useTransition` reference doc is the one that states the after-`await` limitation, so follow it: re-wrap updates you make yourself after an `await`.
- Blog on `use`: **promises created in render are not supported** (React warns about an uncached promise). Pass a promise from a Suspense-compatible library or framework that caches it.
- Blog on Actions: pending state starts with the request and resets when the **final state update is committed**; errors go to an Error Boundary and optimistic updates revert automatically.
- Blog says `useFormState` (Canary name) was renamed to `useActionState`.

---

## What is actually new?

In a client-only app the **capability** is not new (you could do all this with `useState` and `onSubmit`). What React 19 gives you is that **React now handles the plumbing**:

| Before | Now |
| --- | --- |
| `e.preventDefault()` | Automatic with `<form action>` |
| `setLoading(true/false)` with try/finally | `isPending` / `useFormStatus` |
| Controlled input per field | `FormData` read directly |
| Manual form reset | Automatic after the action |
| Manual rollback for optimistic UI | `useOptimistic` rolls back automatically |
| Race handling by hand | `useActionState` queues actions in order |
| API route + fetch for mutations | Server Actions (framework only) |

If you already use React Hook Form / TanStack Query the win is smaller; the biggest real win is Server Actions + progressive enhancement.

---

## Interview angles

- "What is an Action?" -> A function called inside a transition (async allowed). Gives pending state, error boundary handling, ordering.
- "Argument order in `useActionState`?" -> `(previousState, payload)`; payload is `FormData` in a form.
- "Why is `useActionState` slow with many clicks?" -> Calls are queued and run sequentially. Use `useOptimistic` to hide it.
- "What if the action fails in `useOptimistic`?" -> The transition ends, `value` is unchanged, UI rolls back.
- "Can I use `useFormStatus` in the same component as the form?" -> No, it must be in a child.
- "Do I still need `forwardRef`?" -> No for new code; `ref` is a prop.
