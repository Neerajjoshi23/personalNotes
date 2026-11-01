# React + JS Learning Path — Neeraj

> **Goal:** Revise JS/React from basics → advanced, project-first, over ~5 months. End state = strong modern React + a frontend I'm proud of.
> **This doc = the map** (what to learn, in what order, where to read). Log learnings in `progress.md` (add a "React" section) just like the AI track.

---

## The setup that makes this worth it

**Audio Blend is the main project for Phases 3–5**: build its features, harden them, then review release quality. This track is frontend-only;

- **Your level:** in-between — can build simple apps, gaps everywhere. So Phase 0–1 is a _fast sweep_ (skim what you know, stop and drill where it's shaky), not a slow beginner crawl.
- **Your edge:** you're a frontend + **security** engineer at Adobe — it's your differentiator (most React devs can't do CSP/XSS/secure-auth well). Security now runs as its own standalone track — see [`security-learning-path.md`](security-learning-path.md) — rather than being woven inline here.
- **Timeline:** you manage the day-to-day. Below is _ordered_ (do phases in sequence), with rough effort weight — not fixed dates.

---

## Rule #1 — Project before polish

Don't binge tutorials. For each phase: skim the reading → build the phase project → hit a wall → read the specific doc that unblocks you. You already learn this way in Ed's course. Same here.

---

## The Spine — 6 phases

| Phase | Focus                                                                                                             | Primary source                                                                                                                                                                             | Project                                         | Weight                  |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ----------------------- |
| **0** | **JS/TS refresh** — the language React is built on                                                                | [javascript.info](https://javascript.info/) + [MDN JS Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)                                                                | JS katas + tiny vanilla app                     | ~1 wk _(revision pace)_ |
| **1** | **React fundamentals (revise)** — components, props, state, effects                                               | [react.dev Learn](https://react.dev/learn)                                                                                                                                                 | Reusable UI component kit                       | ~3 wk                   |
| **2** | **Core React patterns** — custom hooks, context, data fetching, lists/forms                                       | [react.dev](https://react.dev/learn) + [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview)                                                                   | Data-driven dashboard (GitHub repo explorer)    | ~4 wk                   |
| **3** | **Ecosystem & tooling** — Vite, TypeScript, routing, state, forms, auth                                           | [Vite](https://vite.dev/guide/) · [TS+React cheatsheet](https://react-typescript-cheatsheet.netlify.app/) · [React Router](https://reactrouter.com/)                                       | Audio Blend + Supabase auth and validated forms | ~3 wk                   |
| **4** | **Application quality** — resilience, measured performance, stronger tests, maintainable patterns                 | [react.dev perf](https://react.dev/learn/render-and-commit) · [patterns.dev](https://www.patterns.dev/) · [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) | Harden the same Audio Blend app                 | ~5 wk                   |
| **5** | **Release review** — a11y, monitoring, quality gates (security is its own track, see `security-learning-path.md`) | [Vercel](https://vercel.com/docs)                                                                                                                                                          | Release-quality Audio Blend                     | ~3 wk                   |

**How to work each phase:** skim reading → build the project → log learnings in `progress.md` → next phase.

**Deployment and unit tests are ongoing habits**, not activities postponed until Phase 4 or 5. Deploy each usable increment and add tests while building; the later phases deepen coverage and release confidence.

---

## Cross-cutting threads (not phases — they run through all of them)

An audit flagged these as spanning multiple phases rather than living in one. Pick them up as the projects demand — don't treat them as a separate block.

**🎨 Styling (start in Phase 1 — the component kit needs it):**

| Topic                                                                                     | Read                                                                                                       |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| CSS foundations refresh — **flexbox, grid, responsive, box model**                        | [MDN CSS layout](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout)                            |
| Pick **ONE** approach: **Tailwind** (utility, fast) or **CSS Modules** (scoped, zero-dep) | [Tailwind](https://tailwindcss.com/docs) / [Vite CSS Modules](https://vite.dev/guide/features#css-modules) |
| CSS-in-JS (styled-components) — _awareness only_, being phased out with Server Components | —                                                                                                          |

**♿ Accessibility — woven from Phase 1, deepened in Phase 5:** semantic HTML, labels, keyboard nav, focus. Build it into the component kit; don't bolt it on at the end.

**🛠️ Tooling (settle in Phase 3):** ESLint + Prettier, **React DevTools** (Components + Profiler tabs), npm scripts, browser DevTools.

**TypeScript:** formally introduced in Phase 3 — but once you switch, use it for everything after.

---

## Phase detail + what to actually read

### Phase 0 — JS/TS refresh (the "feel reliable" phase)

The React gaps are usually _JS_ gaps. This is the one place to be bulletproof — it's the most predictable part of any frontend interview. Primary source: **[javascript.info](https://javascript.info/)** (chapter names below) + [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript) for reference.

**Legend:** 🎯 = interview favorite (know cold) · ⭐ = also a React foundation · ➕ = nice-to-have, don't stress.

**Revision pace (for you — experienced, ~1 wk):** _skim & tick_ the non-🎯 rows (you'll recognize them from prod). Spend the saved time _drilling_ the 🎯 rows — closures, event loop, `this`/bind, events — plus the implement-this katas. Reading confirms recognition; katas build recall. When done, ask me for the **Phase 0 test**.

**A. Language mechanics**

| #   | Topic                                                                                           | Read                                               | Why                                                    |
| --- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| 0.1 | Types, primitives vs reference types, coercion, `==` vs `===`, `typeof` 🎯                      | js.info "JavaScript Fundamentals"                  | silent-bug class; reference types explain immutability |
| 0.2 | Scope (block/function/lexical), **hoisting, TDZ**, `var`/`let`/`const` 🎯                       | js.info "Variable scope, closure"                  | classic interview trap questions                       |
| 0.3 | Functions, arrow functions, **higher-order functions & callbacks** ⭐                           | js.info "Functions", "Advanced functions"          | every component/handler/hook is a function             |
| 0.4 | **Closures** 🎯⭐                                                                               | js.info "Variable scope, closure"                  | #1 source of stale-state bugs in hooks                 |
| 0.5 | **`this` binding** — implicit/explicit (**`call`/`apply`/`bind`**), arrow-fn `this`, `new` 🎯   | js.info "Object methods, this", "Function binding" | top interview topic; explains arrow-fn handlers        |
| 0.6 | **Prototypes & prototypal inheritance**, `class`, `instanceof` 🎯                               | js.info "Prototypes, inheritance", "Classes"       | "how does inheritance work in JS?" is asked constantly |
| 0.7 | Objects, **references vs copying, shallow vs deep copy** (`structuredClone`), immutability 🎯⭐ | js.info "Object references and copying"            | immutable state updates depend on this                 |

**B. Async (the event-loop cluster — your favorite)**

| #    | Topic                                                                               | Read                               | Why                                  |
| ---- | ----------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------ |
| 0.8  | **Event loop** — call stack, macro- vs micro-tasks, `setTimeout(…,0)` ordering 🎯⭐ | js.info "Event loop", "Microtasks" | _the_ async interview question       |
| 0.9  | **Promises, `async`/`await`, error handling** 🎯⭐                                  | js.info "Promises, async/await"    | all data fetching + effects          |
| 0.10 | `Promise.all` / `race` / `allSettled` / `any` 🎯                                    | js.info "Promise API"              | parallel fetches; common coding task |

**C. Data & modern syntax**

| #    | Topic                                                                     | Read                               | Why                                                       |
| ---- | ------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------- |
| 0.11 | **Array methods** — `map`/`filter`/`reduce`/`find`/`some`/`flat` 🎯⭐     | js.info "Array methods"            | list rendering = `map`; derived state = `filter`/`reduce` |
| 0.12 | Destructuring, spread/rest `...` ⭐                                       | js.info "Destructuring assignment" | props destructuring + immutable updates                   |
| 0.13 | Modern syntax: optional chaining `?.`, nullish `??`, template literals ⭐ | js.info + MDN                      | used constantly                                           |
| 0.14 | ES modules `import`/`export` ⭐                                           | js.info "Modules"                  | every React file is a module                              |
| 0.15 | `Map`/`Set`/`WeakMap`, `Symbol`, iterators/generators ➕                  | js.info "Data types"               | occasional; don't over-invest                             |

**D. Browser & DOM (you asked about this — now explicit)**

| #    | Topic                                                                                                                          | Read                                                                           | Why                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------- |
| 0.16 | **Events** — `addEventListener`, **bubbling/capturing, delegation**, `preventDefault`/`stopPropagation`, the event object 🎯⭐ | js.info "Introduction to Events", "Bubbling and capturing", "Event delegation" | React's synthetic events map directly to this       |
| 0.17 | DOM basics — query/create/modify nodes                                                                                         | js.info "Document"                                                             | you'll rarely touch it in React, but interviews ask |
| 0.18 | **Debounce & throttle** 🎯                                                                                                     | js.info "Decorators, forwarding, call/apply" (debounce/throttle)               | perf pattern + classic "implement it" task          |

**E. Security thread — moved out entirely**

All security topics now live in the standalone **[`security-learning-path.md`](security-learning-path.md)** track (this one's old 0.19 → its Phase 1, topic 1.2). Nothing security-specific is taught piecemeal in this file anymore; if it comes up here, it's a one-line callout, not a topic to sit with.

**F. Browser fundamentals (added from audit — explains React perf better than another hook tutorial)**

| #    | Topic                                                                                           | Read                                                                                                                                                            | Why                                                                    |
| ---- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 0.20 | **Critical rendering path** — HTML parse → DOM/CSSOM → render tree → layout → paint → composite | [web.dev "Critical Rendering Path"](https://web.dev/articles/critical-rendering-path)                                                                           | explains _why_ React batches and defers work                           |
| 0.21 | **Repaint vs reflow, layout thrashing**                                                         | [web.dev "Avoid large, complex layouts and layout thrashing"](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing)                        | root cause of most "janky UI" bugs, incl. in React                     |
| 0.22 | **HTTP basics** — methods, status codes, headers, caching (`Cache-Control`, `ETag`)             | [MDN HTTP overview](https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview) + [MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching) | every fetch/TanStack Query call rides on this                          |
| 0.23 | **CORS** — preflight, credentials, origins                                                      | [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)                                                                                       | you'll hit this the first time frontend/backend are on different ports |
| 0.24 | **Cookies vs `localStorage`/`sessionStorage`** — scope, expiry, `httpOnly`/`Secure`/`SameSite`  | [MDN Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)                                                                                        | sets up Phase 5's auth-storage topic (5.4)                             |
| 0.25 | **`fetch` lifecycle** — request/response streams, `AbortController`, timeouts                   | [MDN `fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)                                                                                  | supports Phase 4's request cancellation and async reliability (4.8)    |
| 0.26 | Web Workers — offloading heavy work off the main thread ➕                                      | [MDN Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)                                                           | awareness only; rarely needed day-to-day                               |

**🎯 Classic "implement this" challenges** (interviews love these — do them as your katas):
`debounce` · `throttle` · **deep clone** · **`curry`** · **`memoize`** · flatten a nested array · a `Promise.all` polyfill · an **event emitter** (pub/sub) · a `bind` polyfill.

**Reliability check — you're "done" with Phase 0 when you can:** explain a closure and a stale-closure bug · trace what logs first in a `setTimeout` + `Promise.then` + sync-code snippet · explain `call`/`apply`/`bind` · explain event delegation · and implement debounce + deep clone from scratch. That's the reliable bar — everything marked ➕ is genuinely optional.

**Project:** the 🎯 challenges above as katas + one tiny vanilla-JS app (e.g. a live-search list using debounce + event delegation) so you _feel_ what React removes.

**🎤 Interview checkpoint** _(mastered Phase 0 when you can answer these cold + build the project)_:

1. What is a closure? Write one, then show a stale-closure bug.
2. What logs first — `setTimeout(fn, 0)` or `Promise.resolve().then(fn)`? Explain the event loop (call stack, micro vs macro tasks).
3. `==` vs `===` — give a coercion gotcha.
4. What is `this` in a regular vs arrow function? How do `call`/`apply`/`bind` differ?
5. Explain prototypal inheritance. What does `new` actually do?
6. Shallow vs deep copy — how do you deep-clone, and why does it matter for state?
7. What is event delegation and why use it?
8. Implement from scratch: `debounce`, `deepClone`, `curry`, a `Promise.all` polyfill.

### Phase 1 — React fundamentals, revised

Primary source: **[react.dev/learn](https://react.dev/learn)** — work the "Learn React" left-nav top to bottom. Ignore old class-component tutorials entirely.

**Topics to read (tick when confident):**

| #    | Topic                                              | Read (react.dev page)                                              |
| ---- | -------------------------------------------------- | ------------------------------------------------------------------ |
| 1.1  | Components, import/export                          | "Your First Component", "Importing and Exporting Components"       |
| 1.2  | **JSX** — rules, `{}` expressions, attributes      | "Writing Markup with JSX", "JavaScript in JSX with Curly Braces"   |
| 1.3  | **Props** — passing, default, `children`           | "Passing Props to a Component"                                     |
| 1.4  | Conditional rendering                              | "Conditional Rendering"                                            |
| 1.5  | **Lists & keys** (reconciliation)                  | "Rendering Lists"                                                  |
| 1.6  | **Keeping components pure**                        | "Keeping Components Pure"                                          |
| 1.7  | Events                                             | "Responding to Events"                                             |
| 1.8  | **`useState` / state as memory**                   | "State: A Component's Memory"                                      |
| 1.9  | Render & commit, **state as a snapshot**           | "Render and Commit", "State as a Snapshot"                         |
| 1.10 | Batching / queueing state updates                  | "Queueing a Series of State Updates"                               |
| 1.11 | **Updating objects & arrays in state (immutably)** | "Updating Objects in State", "Updating Arrays in State"            |
| 1.12 | Choosing state structure, lifting state up         | "Choosing the State Structure", "Sharing State Between Components" |
| 1.13 | Preserving & resetting state                       | "Preserving and Resetting State"                                   |

**Project:** a small **UI component kit** — Button, Input, Modal, Tabs, Toast. Forces composition, props API design, `children`, styling (🎨 cross-cutting thread), and accessibility (♿) from day one. Note: **Modal & Toast need Portals (topic 2.11)** — build those two after Phase 2, or read 2.11 early.

**🧪 Testing, moved up (added from audit):** write a [Vitest](https://vitest.dev/guide/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) test for every component in the kit as you build it — not after. Small, stateless-ish components are the gentlest place to learn RTL's query-by-role philosophy (see the "Guiding Principles" doc). This is prep work for Phase 4's testing topic (4.6), not a separate detour.

**♿ Accessibility bar for this project (added from audit — not a someday-thread):** every component in the kit must satisfy: keyboard-operable (tab order, Enter/Space/Esc where relevant), visible focus state, semantic HTML element or correct ARIA role, and a label a screen reader can announce. Treat these as acceptance criteria, not polish.

**🎤 Interview checkpoint**:

1. What triggers a re-render in React?
2. Why do lists need `key`s? What breaks if you use the array index as key?
3. Controlled vs uncontrolled component — difference and when to use each?
4. Why must a component's render be pure? What counts as a side effect?
5. "State is a snapshot" — why doesn't `count` update on the line right after `setCount`?
6. Why must you update objects/arrays in state immutably?
7. Props vs state — when does data belong to which?
8. Build: a controlled form + a counter that increments correctly 3× in one handler.

### Phase 2 — Core React patterns

Primary source: react.dev **"Escape Hatches"** section + [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview) for server data.

**Topics to read (tick when confident):**

| #    | Topic                                                                                                                                              | Read                                                                                           |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 2.1  | **`useRef`** — values that don't trigger renders                                                                                                   | react.dev "Referencing Values with Refs"                                                       |
| 2.2  | Manipulating the DOM with refs (focus, scroll)                                                                                                     | react.dev "Manipulating the DOM with Refs"                                                     |
| 2.3  | **`useEffect` lifecycle** — when it runs, cleanup                                                                                                  | react.dev "Synchronizing with Effects", "Lifecycle of Reactive Effects"                        |
| 2.4  | ⭐ **You Might Not Need an Effect**                                                                                                                | react.dev "You Might Not Need an Effect"                                                       |
| 2.5  | Effect dependencies, separating events from effects                                                                                                | react.dev "Removing Effect Dependencies", "Separating Events from Effects"                     |
| 2.6  | ⭐ **Custom hooks** — extracting reusable logic                                                                                                    | react.dev "Reusing Logic with Custom Hooks"                                                    |
| 2.7  | **`useReducer`** — complex state transitions                                                                                                       | react.dev "Extracting State Logic into a Reducer"                                              |
| 2.8  | **`useContext`** — avoid prop-drilling (+ its limits)                                                                                              | react.dev "Passing Data Deeply with Context", "Scaling Up with Reducer and Context"            |
| 2.9  | **Data fetching**: queries, caching, query keys, invalidation, loading/error/empty states                                                          | TanStack Query "Overview" → "Queries" → "Query Keys" → "Caching"                               |
| 2.10 | Mutations & optimistic patterns (intro)                                                                                                            | TanStack Query "Mutations"                                                                     |
| 2.11 | **Portals** (`createPortal`) — render modals/toasts outside the parent DOM tree                                                                    | [react.dev `createPortal`](https://react.dev/reference/react-dom/createPortal)                 |
| 2.12 | **Refs through components** — `ref` as a prop (React 19 makes `ref` a normal prop; `forwardRef` is legacy), `useImperativeHandle`                  | [react.dev `forwardRef`](https://react.dev/reference/react/forwardRef)                         |
| 2.13 | 🏗️ **Architecture** — feature-based folder structure, presentational vs container components, a thin API/service layer, where constants/utils live | [Bulletproof React](https://github.com/alan2207/bulletproof-react) (structure + patterns docs) | added from audit — without this, every project past the component kit grows organically and gets painful to extend |

**Project:** **GitHub repo explorer** — search repos, list results, repo detail page, fetch via TanStack Query. Structure it with a **feature-based folder layout + API service layer** (topic 2.13) from the start, not bolted on after. These data-fetching and architecture skills carry forward into Audio Blend.

**🎤 Interview checkpoint**:

1. `useRef` vs `useState` — when do you reach for each?
2. When does `useEffect` run, and when does its cleanup run? What does the dependency array control?
3. Give two cases where you **don't** need an effect.
4. Why extract a custom hook? Write a `useDebounce` or `useFetch`.
5. `useReducer` vs `useState` — when is a reducer worth it?
6. What problem does Context solve, and what's its performance limitation?
7. What are query keys, and how does caching / invalidation work in TanStack Query?
8. Build: a `useDebouncedValue` hook used in the repo search.

### Phase 3 — Ecosystem & tooling (go TypeScript here)

This is where you become _professional-grade_. Non-negotiable phase.

**Topics to read (tick when confident):**

| #    | Topic                                                                                                                                              | Read                                                                                                                                        |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1  | **Vite** — project setup, dev server, build, env vars                                                                                              | [Vite "Getting Started" + "Env Variables"](https://vite.dev/guide/)                                                                         |
| 3.2  | **TS: typing props & `children`**                                                                                                                  | [TS+React cheatsheet "Function Components"](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/function_components) |
| 3.3  | **TS: typing hooks** — `useState`, `useRef`, `useReducer`                                                                                          | cheatsheet "Hooks"                                                                                                                          |
| 3.4  | **TS: typing events & forms**                                                                                                                      | cheatsheet "Forms and Events"                                                                                                               |
| 3.5  | TS: generics in components/hooks, discriminated unions                                                                                             | cheatsheet "Advanced" + [TS Handbook](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)                                   |
| 3.6  | **Routing** — routes, nested, URL params, navigation, loaders                                                                                      | [React Router "Tutorial" + "Routing"](https://reactrouter.com/)                                                                             |
| 3.7  | **State management** — when Context vs server-state vs client-state lib                                                                            | [Zustand](https://zustand.docs.pmnd.rs/) (start simple) or [Redux Toolkit](https://redux-toolkit.js.org/) (Adobe-scale)                     |
| 3.8  | **Forms** — React Hook Form (register, validation, submit)                                                                                         | [React Hook Form "Get Started"](https://react-hook-form.com/get-started)                                                                    |
| 3.9  | **Schema validation with Zod** as an input boundary — the _mechanics_ only here (`.parse`, `.safeParse`, inferred types);                          | [Zod "Basic usage"](https://zod.dev/)                                                                                                       |
| 3.10 | 🛠️ **ESLint + Prettier** — lint rules, format-on-save, `eslint-plugin-react-hooks`                                                                 | [ESLint](https://eslint.org/docs/latest/) + [Prettier](https://prettier.io/docs/)                                                           |
| 3.11 | **Deferred for now:** rendering strategies, hydration and Next.js. Not a Phase 3 completion requirement; revisit when a project needs a framework. | [react.dev "Creating a React App"](https://react.dev/learn/creating-a-react-app) + [Next.js docs](https://nextjs.org/docs)                  |

**Project:** **Audio Blend** in TypeScript: Jamendo search and track selection, routed search/mixer pages, typed Zustand state, individual/master playback controls, and **Supabase authentication with validated forms**. Use React Hook Form + Zod for the form workflow. Auth UI and route guards are not authorization: protect user-owned saved data with Supabase Row Level Security. Continue deployment and unit tests as features land.

**🎤 Interview checkpoint**:

1. How do you type a component's props and `children`?
2. How do you type `useState`, `useRef`, and an `onChange` event handler?
3. When do you use a generic in a component or hook?
4. Context vs a client-state lib (Zustand/Redux) vs server-state (Query) — how do you decide?
5. Walk through sign-in, session loading, sign-out and protected navigation in Audio Blend; explain why backend authorization is still needed.
6. Why validate form input with a schema (Zod) instead of ad-hoc checks?
7. Build: a typed, Zod-validated form with React Hook Form.

### Phase 4 — React application quality, resilience & performance

Primary sources: react.dev (render model), [patterns.dev](https://www.patterns.dev/), [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) + [Vitest](https://vitest.dev/).

**Read → apply to Audio Blend → verify the behavior.** Keep the same project: this phase makes its existing features dependable and polished. The examples below are implementation ideas, not claims that these features already exist.

**Topics to read (tick when confident):**

| #    | Topic                                                                                                                                                                                                        | Read                                                                                                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | **Render model, applied revision** _(4.1–4.3 are one block: why it renders → measure → memoize only if justified)_ — trace search, selection and playback updates; understand what triggers each render      | react.dev "Render and Commit"                                                                                                                                                                            |
| 4.2  | **Measured memoization** — `memo`, `useMemo`, `useCallback` only where profiling justifies them; avoid unnecessary shared-control renders                                                                    | [react.dev `useMemo`](https://react.dev/reference/react/useMemo), `useCallback`, `memo`                                                                                                                  |
| 4.3  | **Profiling** — verify narrow Zustand selectors isolate track updates; measure frequent progress updates before optimizing                                                                                   | React DevTools Profiler + [react.dev "Profiler"](https://react.dev/reference/react/Profiler)                                                                                                             |
| 4.4  | **Code splitting** — lazy-load `BlenderPage` with a useful `Suspense` fallback; deepen Phase 3 routing practice                                                                                              | [react.dev `lazy`](https://react.dev/reference/react/lazy)                                                                                                                                               |
| 4.5  | **Error boundaries and recovery** — contain rendering failures with fallback/retry UI; handle request, playback and event-handler failures explicitly, since boundaries do not normally catch those          | [react.dev Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)                                                                                 |
| 4.6  | **Testing, leveled up** — extend ongoing unit tests with user interactions, mocked requests/audio APIs, async states and failure paths                                                                       | Testing Library "Queries" + "Async Methods"; Vitest "Mocking"                                                                                                                                            |
| 4.8  | **Async and lifecycle reliability** — loading/error/empty states, obsolete-search cancellation, failed-track recovery, audio node/listener/timer cleanup and browser user-gesture playback constraints       | [MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) · react.dev effect cleanup |
| 4.9  | **Optimistic mutations, when persistence exists** — favorites or saved-mix edits with pending/error feedback and rollback; do not confuse local mixer changes with server mutations                          | TanStack Query "Optimistic Updates"                                                                                                                                                                      |
| 4.10 | **Responsive rendering** — understand `useTransition` vs `useDeferredValue`; apply to expensive results rendering if needed, not as a replacement for request debouncing/cancellation                        | [react.dev `useTransition`](https://react.dev/reference/react/useTransition), `useDeferredValue`                                                                                                         |
| 4.11 | **Selective React 19 APIs** — understand form Actions and `useActionState`; compare with the existing form stack without requiring a rewrite. `useOptimistic` overlaps 4.9; defer the `use` API until needed | [react.dev "React 19" blog](https://react.dev/blog/2024/12/05/react-19) + references                                                                                                                     |
| 4.12 | ~~**Focused E2E testing** — Playwright~~ **Deferred** — read when a team/project needs it; 4.6 (Testing Library + mocks) is the Phase 4 testing scope                                                        | [Playwright docs](https://playwright.dev/docs/intro)                                                                                                                                                     |

**Project:** **Harden Audio Blend**, not a new app. A useful extension is **named saved mixes**: persist selected track IDs and volume settings in Supabase, reopen them after sign-in, and handle save/load failures. Keep live `AudioContext`/audio nodes out of persisted state. Add favorites or "View All" pagination/infinite scroll only as the core workflow becomes reliable; provide a keyboard-accessible load-more control.

**Quality bar:** labelled, keyboard-operable controls with visible focus; clear loading/empty/error states; one failed track does not unnecessarily disable the whole mixer; deliberate playback behavior on navigation; no duplicated audio resources after remounting; measured rendering performance and tests for critical interactions.

**Deferred:** Playwright E2E (4.12) — pick it up only when needed.

**🎤 Interview checkpoint**:

1. What causes wasted re-renders, and how do you find them (tooling)?
2. When do `memo` / `useMemo` / `useCallback` help — and when are they premature?
3. `useTransition` vs `useDeferredValue` — what problem does each solve?
4. When would form Actions or `useActionState` help, and when would you keep your existing form stack?
5. RTL philosophy: why query by role/label instead of by test-id or implementation?
6. What errors do boundaries catch, and how do you handle failed searches, playback and saves separately?
7. Build: profile a track update, fix a demonstrated rendering bottleneck, and test a failure/retry or optimistic rollback flow.
8. Explain obsolete-request cancellation, audio cleanup and user-gesture playback restrictions.

### Phase 5 — Final release review

Review the already-deployed Audio Blend app: a11y, monitoring and quality gates. Deployment and unit tests continue throughout earlier phases; this is the final release pass, not their starting point.

**Topics to read (tick when confident):**

| #   | Topic                                                                                     | Read                                                 |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 5.1 | **Deploy** to Vercel — build, env vars, preview deploys                                   | [Vercel docs "Deployments"](https://vercel.com/docs) |
| 5.2 | **Accessibility** — semantic HTML, ARIA, keyboard nav, focus management                   | [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/)     |
| 5.3 | **Quality gates** — TS strict mode, test coverage on critical paths, Lighthouse/perf pass | Vitest coverage + Chrome Lighthouse                  |

**🎤 Interview checkpoint:**

1. Name key accessibility practices (semantic HTML, labels, keyboard nav, focus).
2. Ship it: deploy to Vercel with TS strict and tests passing.
3. Security questions live in [`security-learning-path.md`](security-learning-path.md) — that's the headline round now.

---

## Project Ladder (how you actually learn)

| #   | Project                                                          | After phase | New skill it forces                                                            | Converges with       |
| --- | ---------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------ | -------------------- |
| 1   | JS katas + tiny vanilla app                                      | 0           | Language fluency, DOM without React                                            | —                    |
| 2   | UI component kit                                                 | 1           | Composition, props API, a11y                                                   | reused everywhere    |
| 3   | GitHub repo explorer                                             | 2           | Data fetching, hooks, routing                                                  | "codebase" theme     |
| 4   | **Audio Blend + Supabase auth/forms**                            | 3           | TypeScript, routing, typed state, validation, auth                             | prod-grade habits    |
| 5   | **Harden the same Audio Blend app**                              | 4           | Resilience, measured performance, stronger tests, reliable saved-mix mutations | Phase 3 project      |
| 6   | **Audio Blend release review** (see `security-learning-path.md`) | 5           | Accessibility, security, monitoring, quality gates                             | Already-deployed app |

---

## What "skilled" means here (your definition, made concrete)

1. **Foundation** — you understand _why_ React re-renders, when effects run, how state flows — not just copy-paste patterns.
2. **A roadmap** — this doc; you can explain the modern React stack and defend your choices.
3. **A project you're proud of** — a deployed, tested, accessible Audio Blend with reliable playback and user-owned saved mixes.

---
