# Progress Log — Phase 3 (Ecosystem & tooling)

> Companion to `react-learning-path.md`. Format: interview-answer angle summaries + katas worth redoing.
> Read-depth for this pass: Vite skimmed (prior idea) · TypeScript full read (no prior idea) · Routing & State mgmt light/fair read (some prior idea) · Forms/Zod/ESLint full read. Next.js (3.11) skipped entirely.

---

## React — Phase 3

_Topics to log as completed: 3.2–3.5 (TypeScript), 3.6 (Routing), 3.7 (State management), 3.8 (Forms), 3.9 (Zod), 3.10 (ESLint + Prettier)._

---

### 3.1 Vite

**Read:** [Vite Guide — Getting Started](https://vite.dev/guide/), [Env Variables and Modes](https://vite.dev/guide/env-and-mode) — fetched 2026-09-05 _(skimmed pass — prior familiarity)_

> Full notes (dev vs prod, build pipeline, hashes, pre-bundling, mental model): see [vite.md](./vite.md).

- Vite is a **dev server + build tool** — two different jobs: dev serves **native ESM modules on demand** with **HMR**; build (`npm run build`) bundles into `dist/` via **Rolldown** (transform, tree-shake, code-split, minify).
- **Production ≠ one giant bundle** — output is split into hashed chunks, and the hash in the filename is what busts the browser cache on deploy.
- Env vars live on **`import.meta.env`**, not `process.env`. Only **`VITE_`-prefixed** vars reach client code.
- **Gotcha:** Putting an API key behind a `VITE_` var — it gets statically inlined into the shipped bundle, visible in devtools.
- **Gotcha:** Node must be **20.19+ or 22.12+**, otherwise `npm create vite` fails.
- **Gotcha:** Mode is separate from `NODE_ENV` — `vite build --mode staging` loads `.env.staging`; precedence is `.env` → `.env.local` → `.env.[mode]` → `.env.[mode].local`.
- **Interview angle:** "Why is Vite's dev server fast?" → No upfront bundling; it serves source as native ESM on demand and pre-bundles only npm deps, and HMR swaps just the changed module.
- **Interview angle:** "Dev vs production in Vite?" → Dev = unbundled ESM + HMR for speed; build = bundled, tree-shaken, code-split, minified, hashed assets in `dist/` for small payloads and caching.
- **Interview angle:** "Secret in a `VITE_` env var — what's wrong?" → It's inlined into the JS bundle at build time, so it's public. Secrets belong behind a backend.

**Recap — what to remember:**

- Vite = dev server (ESM + HMR) + production builder (`dist/`).
- Pre-bundling exists for npm deps; hashes exist for caching.
- `VITE_` prefix is a security boundary, not a naming style.

---

### 3.2–3.5 TypeScript (core language) — concepts studied

**Source:** `Phase3/typscript/src/01_inference.ts` → `29_accessmodefier.ts` (29 self-written practice files) — logged 2026-09-26, concepts-only pass (no fresh WebFetch, this is my own completed practice code).

- **Type inference vs explicit annotation** — TS infers types for simple `let`/`const` from the assigned value; you must annotate function params/return types explicitly since TS can't predict future call-site inputs.
- **Primitives** — `string`, `number`, `boolean`, `bigint` (needs `n` suffix), `unique symbol` (a symbol subtype guaranteeing total uniqueness, good for private keys).
- **Special types** — `string | undefined` unions under `strictNullChecks`; `void` for functions that run but return nothing usable; `never` for functions that never return (throw/infinite loop) — narrows unreachable code; avoid `any` since it disables all safety checks.
- **Object types (`type` alias)** — `type` is erased at compile time, zero runtime cost. Covers optional (`?`) and `readonly` properties, nested object shapes, and method signatures declared without a body.
- **Index signatures vs `Record<K, V>`** — index signature (`{ [key: string]: number }`) allows arbitrary keys of a known value type; `Record<K, V>` locks the object down to a fixed union of literal keys only.
- **Utility types** — `Partial<T>` (all optional, for PATCH/edit forms), `Required<T>` (all mandatory), `Pick<T, K>` (keep only listed keys), `Omit<T, K>` (strip listed keys).
- **Literal types + `as const`** — `const` preserves literal type inference (`"left"` not `string`); `let`/`var` widen to the general type unless annotated or cast. `as const` freezes a `let`, and applied to arrays/objects it makes the _whole structure_ deeply readonly, not just the variable binding.
- **Type assertions (`as`) vs real type guards** — `as` is a compile-time-only override, no runtime check happens. A real type guard (`v is User`) must actually verify shape at runtime (`typeof`, `in`, etc.) — a fake guard that just `return true` compiles fine but crashes at runtime once types are erased.
- **Tuples vs unions** — tuple = fixed length + fixed per-position types; union = "one of these options." Tuples support labeled elements, optional trailing elements (`[string, string?]`), and `readonly` tuples that block mutation and `.push()`.
- **Unions in practice** — primitive unions (`string | number`), discriminated unions (shared literal tag like `status`, narrowed via `switch`), mixed object unions with no shared tag (narrowed via `"key" in obj`), and array unions (`(string | number)[]` vs `string[] | number[]` — the latter can't mix element types within one array instance).
- **Intersections (`&`)** — combines all members of both types; conflicting property types across an intersection collapse that property to `never` (an uncreatable object), unlike unions which just widen the type.
- **Arrays** — `T[]` and `Array<T>` are equivalent; mixed-literal arrays infer as a union array; `readonly T[]` / `ReadonlyArray<T>` strip mutator methods — you can still pass a mutable array into a function parameter typed `readonly T[]` (one-way safety).
- **`typeof` operator** — used both as a JS runtime check and, in TS type position, to derive a type from a runtime value (e.g. `type Role = (typeof roles)[number]` off an `as const` array).
- **Narrowing tools** — `in` operator narrows unions with no common property; optional chaining (`?.`) short-circuits on null/undefined; nullish coalescing (`??`) only falls back on `null`/`undefined` (not on falsy `0`/`false`/`""`).
- **Generics** — `<T>` preserves/locks onto whatever specific type was passed in (unlike `any`, which throws safety away, and unlike `unknown`, which forces validation before use). Supports multiple params (`<T, U>`), inference from nested object args, and constraints (`T extends HasLength`, `K extends keyof T`) to guarantee a shape or valid key lookup.
- **Built-in utility/inspection types** — `ReturnType<typeof fn>`, `Parameters<typeof fn>`, `InstanceType<typeof SomeClass>`, `ConstructorParameters<typeof SomeClass>`, `Exclude<T, U>`, `Extract<T, U>`, `NonNullable<T>`, `Awaited<T>` (unwraps a `Promise`'s resolved type; a no-op on non-Promise types).
- **Non-null assertion (`!`)** — tells the compiler "trust me, not null here," but performs zero runtime check — if the value actually is null, it still crashes at runtime; the type system just stops complaining.
- **Classes** — constructor parameter property shorthand (`constructor(public id: string)`), access modifiers `public`/`private`/`protected`, class fields initialize **before** the constructor body runs (even across `super()` calls), and method resolution always uses the actual runtime prototype (dynamic dispatch) — so a parent constructor calling `this.speak()` during construction still invokes the child's overridden `speak()`.
- **`interface` vs `type`** — `interface` supports declaration merging (redeclaring the same interface name auto-merges fields) and `extends`; `type` alone can express primitives, unions, and tuples that `interface` cannot. They're cross-compatible (`interface extends type`, `type` can intersect an `interface`).

---

### TypeScript + React (component patterns) — concepts studied

**Source:** `Phase3/typescript-react/my-react-practice/src/` — `App.tsx`, `ComponentsProps.tsx`, `RequiredOptionalProps.tsx`, `ChildrenReactNode.tsx`, `Event.tsx`, `InputField.tsx`, `InputContext.tsx`, `TypeReducer.tsx`, `UncontrolledComponents.tsx`, `AsConstExample.tsx` — logged 2026-09-26, concepts-only pass (own completed practice code, example-driven).

**Key things to keep in mind (this folder is heavily example-based, so these are the load-bearing patterns, not just definitions):**

- **`React.ComponentProps<"tag">` is the modern way to type "all native HTML attributes for this element."** `type ButtonProps = React.ComponentProps<"button"> & { color?: string }` gives you every native button attribute plus your custom props, spread onward via `{...rest}`.
- **React 19 drops `forwardRef` for plain function components** — `ref` can now be destructured directly out of props like any other prop (`function InputField({ label, ref, ...rest }: InputFieldProps)`) and passed straight to the DOM element.
- **`React.ComponentProps<typeof MyComponent>["propName"]`** lets you pull out the exact type of a single prop from an already-defined component, so a variant/union type only has to be defined once (`AsConstVariant` in `App.tsx` derived from `AsConstExample`'s `variant` prop).
- **`import type { ReactNode }`** — use `import type` for type-only imports (stripped at build, avoids bundling unnecessary runtime code); do **not** import the default `React` this way if you're also using JSX/runtime React APIs.
- **`children` typing** — type as `ReactNode` in a props interface (`children?: ReactNode`), can carry a JSX default value directly in destructuring (`children = <div>...</div>`).
- **Required vs optional props** — optional via `?`, with a real default supplied through destructuring default values (`defaultProp = "Default Value"`), not React's legacy `defaultProps` static.
- **Event typing is element-specific, not generic** — `React.ChangeEvent<HTMLInputElement>`, `React.ChangeEvent<HTMLSelectElement>`, `React.MouseEvent<HTMLButtonElement>`, `React.KeyboardEvent<HTMLInputElement>`, `React.SubmitEvent<HTMLFormElement>` — the generic parameter is the concrete HTML element type the event fired on, giving you a correctly typed `e.target`.
- **Controlled vs uncontrolled components** — controlled: state variable + `value`/`onChange` per field. Uncontrolled: `useRef<HTMLFormElement>` on the `<form>`, read everything at submit time via `new FormData(formRef.current!)` — no per-keystroke state, less re-rendering, good for simple/one-shot forms.
- **`useRef` typing pattern for DOM nodes** — `useRef<HTMLInputElement>(null)`, always null-checked (`if (ref.current)`) before use since the ref starts as `null` until mount.
- **`useRef` for values that persist across renders without re-rendering** — e.g. a timer ID (`useRef<ReturnType<typeof setTimeout> | null>(null)`) so a `useEffect` cleanup can clear a _previous_ timeout instead of leaking timers.
- **Typed `useReducer` + Context combo** — action type as a discriminated union (`{ type: "SET_INPUT"; payload: string } | { type: "RESET_INPUT" }`, no payload needed on some variants), reducer switches exhaustively on `action.type`, and `React.Dispatch<InputAction>` is the correct type for the exposed `dispatch` function passed through context.
- **Context typed as `T | null`, asserted non-null in the consuming hook** — `createContext<{ state; dispatch } | null>(null)`, then the custom hook (`useInputContext`) does `context!.state` — relies on the invariant that the hook is only ever called under the matching Provider.
- **`as const` + `Record<(typeof arr)[number], object>`** — lock an array of string literals with `as const`, derive a union type from it (`(typeof variants)[number]`), then use that exact union as the key type for a `Record` styling/lookup map — guarantees the lookup object can't miss or add an unlisted key.
- **`satisfies`** — validates a value against a type/constraint while preserving the narrower literal type inferred from the value itself (rather than widening it to the constraint's type), so downstream code that expects the narrow literal still works.

**Interview question list (both TS core + TS/React):**

- What's the actual difference between `interface` and `type`, and when would merging behavior matter?
- Why does `never` show up as a function return type, and how is it different from `void`?
- What's wrong with a type guard function (`x is Foo`) that just returns `true` unconditionally — walk through what breaks at runtime.
- Explain `as const` — why does it matter for both a single value and for arrays/objects, and how does it interact with tuple spreading into rest parameters?
- What's the difference between a discriminated union and a "mixed" union with no shared property, and how do you narrow each?
- Why does an intersection (`&`) of two types with the same key but conflicting value types collapse to `never`?
- `Partial<T>` vs `Required<T>` vs `Pick<T, K>` vs `Omit<T, K>` — when would you reach for each in a real form/API scenario?
- What does `K extends keyof T` buy you in a generic function signature, and why can't you just use `string` for `K`?
- Why did React 19 remove the need for `forwardRef` in most cases, and what changed about how `ref` is typed/passed?
- When would you choose an uncontrolled component (`useRef` + `FormData`) over a controlled one, and what's the tradeoff?
- What's the purpose of typing `useRef` as `<T | null>(null)` and always null-checking `.current`?
- Why type a React Context value as `T | null` and then use `!` in the consuming hook instead of just typing it as `T`?
- What does `React.ComponentProps<"button">` give you that a hand-written props interface wouldn't, and why is that safer against React/DOM attribute changes?
- What is `satisfies` doing that a plain type annotation wouldn't, in terms of preserving literal types?
- Class fields vs constructor body — which runs first, and why does calling an overridable method from a parent constructor still invoke the child's override?

---

### 3.7 State management — Zustand — concepts studied

**Source:** `Phase3/zustand.md` (self-written topic notes, Topics 1–7) — logged 2026-09-26, concepts-only pass. Topic 7 (Async Actions) was missing when reviewed and has been added directly into `zustand.md`.

- **Zustand is not required for state that only one component needs** — keep `useState` local; the actual problem Zustand solves is _sharing_ state, not storing it.
- **Prop drilling** — passing state through intermediate components that don't need it just to reach a deep child; Context can already solve this, so sharing state alone isn't a reason to reach for Zustand.
- **Zustand = dedicated store for shared app/client state** — components subscribe directly to what they need instead of the state traveling down the component tree.
- **Selectors are subscriptions, not one-time reads** — `useStore((state) => state.user)` means "subscribe this component to this slice of the store"; a component selecting `theme` doesn't re-render when unrelated `user` state changes.
- **Prefer narrow selectors over grabbing the whole store** — `useStore()` with no selector subscribes to everything; selecting only what's needed is the idiomatic pattern.
- **`create()`** returns a hook; the store returned from it holds both **state** (data) and **actions** (functions that call `set()` to update that data) — a common convention keeps them together in the same object.
- **`set()` has two forms** — object form for direct updates (`set({ theme: "dark" })`) and function form when the new value depends on the old (`set((state) => ({ count: state.count + 1 }))`) — same idea as `setCount(prev => prev + 1)` in React.
- **`set()` shallow-merges at the top level** — you only need to pass the keys you're changing; untouched top-level keys survive automatically. Nested objects still need manual spreading (`{ ...state.user, age: 24 }`) since the merge isn't deep.
- **`get()`** reads the current store state from inside an action — useful for guards (e.g. skip a fetch if one's already in flight) without needing `set()`'s callback form.
- **Store design rules** — keep related state + the actions that modify it together (e.g. a cart store owns `items`, `addItem`, `removeItem`); split unrelated domains into separate stores (`useAuthStore`, `useCartStore`, `useUIStore`) rather than one giant store; don't store derived/computed data (e.g. a cart `total`) if it can just be calculated from existing state in a selector.
- **TypeScript pattern** — `type Store = { ...state; ...actions }` then `create<Store>()((set, get) => ({...}))`; the double-call `create<T>()(...)` is Zustand's TS-specific API shape, not something to dig into further. Once the store type is defined, `set`, `get`, and every selector are fully typed with no manual annotation needed.
- **Async actions (Topic 7, added during this pass)** — the standard shape is a `loading / error / data` triple on the store; an async action calls `set()` before the request (`isLoading: true`) and again after success/failure, with the component never awaiting anything itself — it just triggers the action and reads state via selectors.
- **`get()` as a duplicate-request guard** — check `get().isLoading` at the top of an async action to skip firing a second identical request while one's already in flight.
- **Parallel requests** — `Promise.all([...])` inside one action keeps multiple independent fetches under a single loading flag instead of juggling one per request.
- **The critical architecture line: Zustand is for client state, not server state.** Data that lives on a server and can go stale (needs caching, refetch-on-stale, deduplication, pagination) belongs in a query library (TanStack Query/SWR/RTK Query) — Zustand has no opinion about freshness, it just stores whatever you `set()`. Real apps typically use both: Zustand for `isAuthenticated`/UI flags, a query library for actual fetched data.
- **`persist` middleware** — wraps a store definition so every `set()` also syncs to storage (default `localStorage`) and rehydrates automatically on load; component usage of the store doesn't change at all. `name` is the required, must-be-unique storage key — two stores sharing one `name` overwrite each other.
- **`partialize`** — controls exactly which fields of a persisted store actually get saved. **Gotcha:** without it, `persist` saves the whole store by default, including transient flags like `isLoading`/`error` — which then resurrect as stale/wrong state on the next page load. Good fits for persistence: theme, auth token, cart contents, draft input. Bad fits: loading/error flags, and anything that's actually server data (that belongs in a query library, not persisted client state).
- **Storage swap** — `createJSONStorage(() => sessionStorage)` swaps the default `localStorage` for `sessionStorage` (cleared when the tab closes) via the `storage` option.
- **Deferred on purpose (not yet needed)** — `devtools` middleware (Redux DevTools time-travel), the slices pattern (splitting one large store into composable pieces), and `immer` middleware (mutating-style updates for deep nested state). Pick these up only when a real project need for one appears.

**Interview question list:**

- When is Zustand actually the right call versus just using Context, or just `useState`?
- Why does a component using `useStore((state) => state.theme)` _not_ re-render when `state.user` changes, but a component doing `useStore()` with no selector would?
- Walk through why `set()` only requires the changed keys at the top level, but nested object updates still need manual spreading.
- What's `get()` for, and give a concrete case where you'd reach for it inside an action.
- Why keep actions inside the store instead of writing the update logic directly in the component?
- When would you split one Zustand store into several, versus keeping everything in one?
- Why shouldn't you store a value like a cart `total` in Zustand state if it can be derived from `items`?
- Walk through a `loading/error/data` async action end to end — what does `set()` get called with, and when?
- What's the actual difference in responsibility between Zustand and TanStack Query, and why would duplicating server data into Zustand be a mistake?
- What problem does the duplicate-request guard (`get().isLoading`) solve, and what would happen without it?
- Why would you use `partialize` with `persist`, and what goes wrong if you persist a store's `isLoading`/`error` flags along with everything else?

---

### 3.6 Routing — React Router — topics covered

**Source:** `Phase3/routing.md` (self-written topic notes, Topics 1–4) — logged 2026-09-27.

- Topic 1 — Setup & Basic Routes (`createBrowserRouter` vs `<Routes>/<Route>`, `useParams`, `useSearchParams`, `Link`/`NavLink`, `useNavigate`)
- Topic 2 — Nested Routes & Layouts (`<Outlet />`, `index: true`, layout routes with no `path`)
- Topic 3 — Loaders, Actions & Data APIs (fetch-before-render, `useLoaderData`, `<Form>`/`action`, `errorElement`, loaders-vs-TanStack-Query — Query preferred by default)
- Topic 4 — Protected Routes & Lazy Loading (wrapper-component route guard + `<Navigate replace>`, `React.lazy` + `Suspense`)

**Interview question list:**

- `createBrowserRouter` vs the older `<Routes>/<Route>` JSX style — what does the config-first approach unlock that the other can't?
- What's the difference between `useParams` and `useSearchParams`, and what type do values come back as from each?
- Why use `navigate("/login", { replace: true })` instead of a plain `navigate("/login")` for something like a post-login redirect?
- Why do nested routes exist, and what problem would you have without `<Outlet />`?
- What renders in `<Outlet />` when a URL matches a parent route exactly with no further segment?
- Walk through why a layout route doesn't need its own `path` — and how that same trick is reused for protected routes.
- What problem do loaders solve compared to fetching in `useEffect`, and why would you still default to TanStack Query over loaders in most apps?
- What's the gotcha with React Router's own `<Form>` component versus a plain HTML `<form>`?
- Walk through the protected-route pattern end to end — what triggers the redirect, and why does it need `replace`?
- Why does route-level code splitting matter, and what breaks if `React.lazy` is used without a `<Suspense>` ancestor?

---

Project -> Audio Blender

---

### 3.8 Forms — React Hook Form (register, validation, submit)

**Read:** [React Hook Form "Get Started"](https://react-hook-form.com/get-started) — fetched 2026-10-20

> The Get Started page covers register, validation rules, errors, Controller and resolvers. The `formState` / `reset` / `watch` / `setError` points below come from my own practice files `Phase3/forms-zod/01–03_*.tsx` (viewable at the lesson viewer, `npm run dev` in that folder), not from the fetched page.

- RHF is built on **uncontrolled inputs** — the value lives in the DOM and RHF reads it through a **ref** when it needs it, so typing doesn't re-render the form the way a `useState`-per-field form does.
- **`register("name")`** returns `{ name, onChange, onBlur, ref }` and I **spread** it onto a native input. The doc says every field must have a `name` as its registration key.
- **Code example:**

```tsx
const { register, handleSubmit } = useForm<Inputs>();

const onSubmit: SubmitHandler<Inputs> = (data) => {
  console.log(data); // only runs when validation passed
};

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    <input {...register("example")} />

    <input
      {...register("exampleRequired", { required: true })}
    />

    <input type="submit" />
  </form>
);
```

- Built-in rules follow the **HTML validation standard**: `required`, `min`, `max`, `minLength`, `maxLength`, `pattern`, `validate`. Once a schema resolver is used (3.9), these rule props are not needed — the **schema owns the rules** and `register` only supplies the name.
- **`handleSubmit`** calls `preventDefault`, runs validation, and calls my callback **only if valid**. It takes an optional **second callback** for the invalid case.
- **`formState.errors`** — each failing field shows up as `errors.field` with a `type` and a `message`. The message is whatever string I passed in the rule.
- **`formState` is a Proxy** — it only subscribes to the properties I **read during render**, which is how RHF avoids re-renders. `isDirty` is a boolean against the baseline; **`dirtyFields`** is what tells me _which_ fields changed; `isSubmitting` is true while an async `handleSubmit` callback is pending.
- **`defaultValues` are read once** on the first render (same idea as the `useState` initial value). **`reset(data)`** makes the new data the new baseline, so `isDirty` becomes false; `reset()` alone goes back to the original defaults.
- **Code example:**

```tsx
const { reset } = useForm<ProfileValues>({
  defaultValues: { displayName: "", bio: "" }, // read ONCE
});

useEffect(() => {
  fetchProfile().then((profile) => {
    reset(profile); // new baseline, isDirty is false
  });
}, [reset]);
```

- **`watch` vs `getValues` vs `useWatch`** — `watch("x")` re-renders the whole host component on every change; `getValues()` is a one-time read with **no subscription** (use it in handlers); **`useWatch({ control, name })`** inside a child component isolates the re-render to that child.
- **`setError`** attaches a server message to a field, or to the special **`root.serverError`** key when the failure is not tied to a field. Root errors are cleared on the next submit.
- **Controlled components** (MUI, react-select, shadcn Select, sliders) don't expose a native input ref, so `register` can't reach them — wrap them in **`Controller`** (render prop) or **`useController`** (hook, nicer for reusable fields). The doc says exactly this: if the component doesn't expose the input's `ref`, use `Controller`.
- **Code example:**

```tsx
<Controller
  name="volume"
  control={control}
  render={({ field, fieldState }) => (
    <div>
      <VolumeSlider
        value={field.value}
        onChange={field.onChange} // MUST pass the new value to RHF
        onBlur={field.onBlur}
      />

      {fieldState.error && (
        <p role="alert">{fieldState.error.message}</p>
      )}
    </div>
  )}
/>
```

- **Gotcha:** Passing `defaultValues` from an API response that arrives _later_ — the form still shows the empty defaults because they're read once. Use `reset(data)` or the `values` option.
- **Gotcha:** `watch()` at the top of a big form — the whole form re-renders on every keystroke. Use `useWatch` in a leaf component.
- **Gotcha:** Using `type="number"` without `valueAsNumber` — the runtime value is the **string** `"30"` even though the TS type says number. (This is the gap the Zod resolver closes.)
- **Gotcha:** Wiring a custom component with `register` — it has no ref or native events, so the value never reaches RHF. Also forgetting to pass the **new value** into `field.onChange`.
- **Gotcha:** After a successful save, not calling `reset(savedValues)` — `isDirty` compares against `defaultValues`, so the form stays dirty forever.
- **Gotcha:** Putting `value=` on a registered input — mixes controlled and uncontrolled and fights RHF.
- **Interview angle:** "Why is React Hook Form faster than a controlled form?" → Inputs are uncontrolled: values stay in the DOM, so typing doesn't re-render. Only subscribed state (errors, isDirty) causes renders, and `formState` is a Proxy that tracks just what I read.
- **Interview angle:** "My edit form shows empty fields after I fetch the data. Why?" → `defaultValues` are read once. Call `reset(data)` after the fetch, or pass the `values` option.
- **Interview angle:** "`watch` vs `getValues` vs `useWatch`?" → `watch` re-renders the host; `getValues` is a non-reactive read; `useWatch` isolates re-renders to the component calling it.
- **Interview angle:** "When do you need Controller?" → For controlled components that don't expose a native input ref. Native inputs use `register`.
- **Interview angle:** "How do you show server-side validation errors?" → `setError("field", ...)` for a field, `setError("root.serverError", ...)` otherwise.

**Recap — what the doc says to take away:**

- Register the field (name is required), spread the result, and let `handleSubmit` run validation and give me the data.
- Errors come from `formState.errors`; native rules or a schema resolver both feed it.
- Native inputs use `register`; controlled UI-library components use `Controller` / `useController`.
- Defaults are read once, `reset` moves the baseline, and subscribe only to what I need (`useWatch` in a leaf).

---

### 3.9 Schema validation with Zod (as an input boundary — mechanics only)

**Read:** [Zod — Introduction](https://zod.dev/), [Zod — Basics](https://zod.dev/basics) — fetched 2026-10-20

> The fetched pages gave the prose (parse/safeParse/async/infer/validate) but their code blocks came back stripped. Coerce, default, catch, refine, strictness, discriminated unions and the resolver points are from my own practice files `Phase3/forms-zod/04–11_*` (all run and checked in the lesson viewer on Zod 4.6).

- **Why Zod at all:** TypeScript types are **erased at compile time**. Anything crossing a runtime boundary (API response, `localStorage`, URL params, form input) is untyped. Zod validates at that boundary and then gives a **trusted typed value**; `as User` checks nothing.
- **Code example:**

```ts
import * as z from "zod";

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const fromBackend: unknown = { name: "Neeraj", age: "30" };

// `as` silences the compiler and checks nothing
const lied = fromBackend as { name: string; age: number };
console.log(typeof lied.age); // "string"

const result = UserSchema.safeParse(fromBackend);
console.log(result.success); // false, caught at the boundary
```

- **`.parse`** returns the data (the doc says a strongly-typed **deep clone** of the input) or **throws a `ZodError`**. **`.safeParse`** never throws and returns a **discriminated union**: success with `data`, or failure with `error` — so `result.success` narrows it.
- **Async:** if the schema has async refinements or transforms, the sync methods throw — use **`.parseAsync()` / `.safeParseAsync()`**. The doc also lists `.validate()` (boolean type guard, no error built, much faster on invalid input).
- **Errors:** `error.issues` is an array of `{ code, path, message }`. `z.flattenError(error)` gives `{ formErrors, fieldErrors }` for flat forms; `z.treeifyError` mirrors nesting; `z.prettifyError` is readable text for logs.
- **optional vs nullable vs nullish** — `optional` allows `undefined`, `nullable` allows `null`, `nullish` allows both. APIs return `null` for empty, forms give `""`/`undefined`: the wrong pick is a classic "valid data fails" bug.
- **`z.infer`, `z.input`, `z.output`** — `z.infer` equals `z.output` (after parsing). They differ with `transform`, `default` or `coerce`: input is what I may feed in, output is what I get back.
- **Code example:**

```ts
const Schema = z.object({
  nickname: z.string().default("anon"),
  nameLength: z.string().transform((s) => s.length),
});

type In = z.input<typeof Schema>;
// { nickname?: string | undefined; nameLength: string }

type Out = z.output<typeof Schema>;
// { nickname: string; nameLength: number }
```

- **`default` vs `catch`** — `default` only fills in when the input is **`undefined`** (any other value I pass overrides it, and an invalid value still fails). `catch` swallows **any validation failure** with a fallback value.
- **`coerce`** — forms, query params and env vars are all strings. With coerce the **input type becomes `unknown`** (Zod 4). `z.coerce.number()` uses `Number()`, so `""` becomes 0 and **passes**, and `"abc"` becomes NaN and fails.
- **Code example:**

```ts
const Age = z.coerce.number().int().min(0);

console.log(Age.safeParse("42").success); // true
console.log(Age.safeParse("abc").success); // false (NaN)
console.log(Age.safeParse("").data); // 0, empty field silently valid

const Bad = z.coerce.boolean();
console.log(Bad.parse("false")); // true (!!) any non-empty string is truthy

const Flag = z.stringbool();
console.log(Flag.parse("false")); // false
```

- **`refine`** is a custom boolean rule. A **cross-field** rule goes on the object and **must set `path`**, otherwise the issue has an empty path (root) and no field can show it. **`superRefine`** can add several issues from one check. In Zod 4 an object-level refine is **skipped on a type error** (wrong type / missing) but still runs when a field only fails a check like `min`, unless that check uses `abort: true`.
- **Code example:**

```ts
const SignUp = z
  .object({
    password: z.string().min(8),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"], // lands under the confirm field
  });
```

- **Object strictness** — the default `z.object` **strips** unknown keys silently (output only, no error); `z.strictObject` errors with `unrecognized_keys`; `z.looseObject` keeps them. Stripping helps block mass-assignment, but the server must still validate.
- **Composition** — keep one base schema and derive with `omit`, `pick`, `partial`, `extend`. **`z.discriminatedUnion("status", [...])`** looks at the tag first, gives focused errors, and lets TS narrow on the tag.
- **At the API boundary** — treat `res.json()` as `unknown`, check `res.ok` (fetch doesn't reject on 404/500), `safeParse`, and throw a typed `ApiError` on a shape mismatch. Validate only the fields I use, and `transform` API shape into app shape (snake_case to camelCase) in one place.
- **With React Hook Form** — `resolver: zodResolver(schema)` runs the schema (async) on the whole form and maps issues to errors by `path`. Form values are the **input**, `handleSubmit` receives the **output**:

```tsx
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<
  SignUpInput, // what the form HOLDS (raw strings)
  unknown, // resolver context, rarely used
  SignUpOutput // what handleSubmit's callback RECEIVES
>({
  resolver: zodResolver(signUpSchema),
});
```

- **Gotcha:** Writing the TS type by hand next to the schema — they drift. Derive it with `z.infer`.
- **Gotcha:** `z.coerce.number()` for a required age — an empty field becomes 0 and passes a `min(0)`. Check for empty first.
- **Gotcha:** `z.coerce.boolean()` on `"false"` — returns true. Use `z.stringbool()`.
- **Gotcha:** A cross-field `refine` without `path` — the error has nowhere to show in the form.
- **Gotcha:** Calling `.parse` on an async schema — it throws; use the async methods. Also an async refine runs on every validation, so debounce or check on submit.
- **Gotcha:** Optional text field in a form — an untouched input is `""`, not `undefined`, so `.optional()` still receives `""`.
- **Gotcha:** `.parse` inside a render with no try/catch or error boundary — a white screen.
- **Gotcha:** Using `catch` for money or security fields — it hides bad data.
- **Interview angle:** "TypeScript already checks types, why Zod?" → TS is compile-time only; data crossing a runtime boundary is untyped. Zod validates it and narrows it to a real type, and `z.infer` removes the duplicate type.
- **Interview angle:** "`parse` vs `safeParse`?" → `parse` throws a `ZodError`; `safeParse` returns a discriminated union and never throws. User input uses `safeParse`; internal invariants can use `parse`.
- **Interview angle:** "How do you integrate Zod with React Hook Form?" → `zodResolver(schema)`; types from `z.infer`, or `useForm<z.input, unknown, z.output>` when the schema uses coerce/transform/default.
- **Interview angle:** "Why can a cross-field error fail to appear on the right input?" → The refine's `path` becomes the RHF field name; without it the error is on the root.
- **Interview angle:** "Does client-side validation make it secure?" → No, it's UX. The server must validate again.

**Recap — what the doc says to take away:**

- Define a schema, parse data with it, and infer the static type from it.
- `parse` throws, `safeParse` returns a result; async schemas need the async versions.
- Input and output types can differ once transform/default/coerce are in play.
- Use Zod at trust boundaries (API, forms, storage, URL), and always validate on the server too.

---

### 3.10 ESLint + Prettier (lint rules, format-on-save, react-hooks plugin)

**Read:** [ESLint configuration files](https://eslint.org/docs/latest/use/configure/configuration-files), [Prettier rationale](https://prettier.io/docs/rationale), [Prettier — integrating with linters](https://prettier.io/docs/integrating-with-linters), [eslint-plugin-react-hooks](https://react.dev/reference/eslint-plugin-react-hooks) — fetched 2026-10-20

- ESLint is for **code quality** (bugs, bad patterns), Prettier is for **formatting** (whitespace, quotes, line wraps). Different jobs, so I don't let ESLint argue about style.
- ESLint now uses the **flat config**: a file named eslint.config.js that exports an array of config objects. Each object can have files, ignores, rules and plugins, and later objects override earlier ones for the files they match.
- A config object with only **ignores** is a global ignore (good for dist and build). An object with no files key applies to whatever files other objects already match.
- Rule severity is "off", "warn" or "error". Warn doesn't fail the process, error does, so CI normally cares about errors only.

```js
// eslint.config.js
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // global ignore — only the ignores key
  { ignores: ["dist"] },

  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    extends: [js.configs.recommended],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // the two rules that matter most for React
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);
```

- **eslint-plugin-react-hooks** ships two classic rules: rules-of-hooks (hooks only at the top level, only in components or custom hooks) and exhaustive-deps (dependency array must list everything the effect or callback reads).
- The recommended preset now also surfaces **React Compiler** diagnostics (purity, immutability, refs, set-state-in-effect, set-state-in-render, static-components). They work even if I haven't adopted the compiler.
- **Prettier is opinionated** on purpose: few options, output is deterministic. It prints on one line if it fits, collapses multiple blank lines, and keeps an object multi-line if there's a newline after the opening brace.
- **Prettier + ESLint together:** turn off ESLint's conflicting style rules with eslint-config-prettier and run Prettier separately. The docs say running Prettier as an ESLint rule (eslint-plugin-prettier) is generally not recommended — red squiggles everywhere and slower.
- **Format-on-save** is an editor setting (VS Code: Prettier as default formatter + format on save). CI should run the check command so the editor isn't the only gate.

```json
// package.json scripts
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

- **Gotcha:** I silence exhaustive-deps with an eslint-disable comment because the effect "keeps re-running". That hides a real stale-closure bug — the fix is to restructure (move the function inside the effect, use a functional update, or useCallback), not to disable the rule.
- **Gotcha:** I leave stylistic ESLint rules on next to Prettier, so the two tools reformat each other's output and the file flips on every save. Fix: add eslint-config-prettier last in the config so it wins.
- **Gotcha:** the ignores key placed inside an object that also has files or rules is not a global ignore — it only excludes files for that one object, so dist still gets linted.
- **Interview angle:** "ESLint vs Prettier — what's the difference?" → ESLint finds bugs and enforces code-quality rules; Prettier only reprints code in one consistent style. Use both, and let Prettier own formatting.
- **Interview angle:** "Why is exhaustive-deps important?" → Effects and callbacks capture values from the render they were created in. A missing dependency means the closure reads stale state or props. The rule statically catches that.

**Recap — what the doc says to take away:**

- ESLint = quality, Prettier = formatting; don't mix their jobs.
- Flat config is an array of objects with files, ignores, plugins and rules; later ones override.
- Turn on rules-of-hooks as error and exhaustive-deps as at least warn.
- Use eslint-config-prettier to avoid conflicts instead of running Prettier inside ESLint.
- Format on save in the editor, plus a check command in CI.

---

### Good tasks to redo later (worth repeating as katas)

- Build a profile edit form that loads data from a fake async API — first show the "empty fields" bug with async defaults, then fix it with `reset(data)` and with the `values` option, and confirm `isDirty` is false right after load.
- Put a `watch("bio")` at the top of a form with a console log in render, count renders per keystroke, then move it into a `useWatch` child and watch the parent stop re-rendering.
- Wrap a custom range slider with `Controller`, first wiring `register` (watch the value never reach RHF), then fix it with `field.onChange`.
- Build a sign-up form with RHF and a Zod schema, with a cross-field password `refine` whose error shows under the confirm field — then remove the `path` and watch the error vanish from the field.
- Reproduce the coerce traps: `z.coerce.number()` accepting `""` as 0 and `z.coerce.boolean()` turning `"false"` into true, then fix them with `z.string().min(1)` plus `pipe` and `z.stringbool()`.
- Write a schema with `default` and `transform`, then print `z.input` and `z.output` types side by side and use the three-generic `useForm` with it.
- Fetch a mock API that returns a drifted shape (id as number, missing fields) through a `fetchValidated` helper and show a safe UI message for each `ApiError` kind (network, http, shape).
- Parse an object with extra keys using default, strict and loose objects and compare the outputs.
- Write a useEffect that reads a prop but leaves it out of the dependency array, watch exhaustive-deps flag it, then fix it three ways (add dep, move function inside, functional update) instead of disabling the rule.
- Set up eslint.config.js from scratch with a global ignores object, then prove the difference by putting ignores inside a rules object and watching dist get linted.
- Add stylistic ESLint rules (semi, quotes) that fight Prettier, watch the file flip on save, then fix it with eslint-config-prettier.

_Next up: 3.11 Rendering strategies, hydration and Next.js (deferred — not a Phase 3 completion requirement)_

