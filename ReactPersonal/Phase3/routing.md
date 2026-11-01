# React Router — Topic 1: Setup & Basic Routes

## 1. Why a Router at All?

A React app is a single HTML page. Without a router:

```text
Every "page" is just conditional rendering
    ↓
No real URL changes
    ↓
No back/forward button support
No bookmarkable/shareable links
No browser history
```

React Router gives you real URLs mapped to components, using the browser's History API under the hood — no full page reload, but the URL bar actually changes.

---

## 2. The Modern Setup — `createBrowserRouter`

Current idiomatic React Router (v6.4+/v7) setup, config-first rather than JSX-first:

```tsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/about", element: <About /> },
  { path: "/users/:id", element: <UserDetail /> },
]);

function App() {
  return <RouterProvider router={router} />;
}
```

**Gotcha:** you'll also see the older JSX-based style (`<BrowserRouter>` + `<Routes>` + `<Route>`) in a lot of tutorials/StackOverflow answers:

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/about" element={<About />} />
  </Routes>
</BrowserRouter>
```

Both still work, but `createBrowserRouter` is the version that unlocks **loaders, actions, and `useNavigation` (pending states)** — the JSX-only style can't use those. Default to `createBrowserRouter` for anything new.

---

## 3. Route Matching Basics

```tsx
{ path: "/users/:id", element: <UserDetail /> }
```

- `:id` is a **dynamic segment / URL param** — matches any value at that position (`/users/42`, `/users/abc`).
- Static segments (`/about`) match exactly.
- Routes are matched by specificity, not declaration order (React Router v6+ scores routes and picks the best match — unlike v5 where order mattered and you needed `<Switch>`/`exact`).

---

## 4. Reading URL Params — `useParams`

```tsx
import { useParams } from "react-router-dom";

function UserDetail() {
  const { id } = useParams(); // string | undefined

  return <p>User ID: {id}</p>;
}
```

**Gotcha:** `useParams()` returns everything as `string | undefined`, even if your param is conceptually a number. `id` from `/users/42` is the string `"42"`, not the number `42` — you convert it yourself (`Number(id)`) if needed.

---

## 5. Reading Query Strings — `useSearchParams`

Different from URL params — this is for `?key=value` pairs, not `:id`-style path segments.

```tsx
import { useSearchParams } from "react-router-dom";

function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get("category"); // string | null

  function handleFilterChange(newCategory: string) {
    setSearchParams({ category: newCategory });
  }

  return <div>Filtering by: {category}</div>;
}
```

Mental model:

```text
useParams        → path segments        (/users/:id      → id)
useSearchParams  → query string          (?category=shoes → category)
```

---

## 6. Programmatic Navigation — `useNavigate`

```tsx
import { useNavigate } from "react-router-dom";

function LoginForm() {
  const navigate = useNavigate();

  function handleSubmit() {
    // ...login logic
    navigate("/dashboard");
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

Common variants:

```tsx
navigate("/dashboard"); // go to a path
navigate(-1); // go back, like browser back button
navigate("/login", { replace: true }); // replace history entry, no back-button trap
```

**Gotcha:** `replace: true` matters for things like a login redirect — without it, hitting "back" after logging in takes the user back to the login page instead of out of the app.

---

## 7. Declarative Navigation — `<Link>` and `<NavLink>`

Never use a plain `<a href="...">` for internal navigation — it triggers a full page reload, defeating the purpose of an SPA router.

```tsx
import { Link, NavLink } from "react-router-dom";

<Link to="/about">About</Link>;

<NavLink
  to="/dashboard"
  className={({ isActive }) => (isActive ? "active-link" : "")}
>
  Dashboard
</NavLink>;
```

- `Link` — plain navigation, no active-state awareness.
- `NavLink` — same as `Link`, but exposes `isActive` (and `isPending` during a loader-based navigation) so you can style the "currently on this page" nav item.

---

## What You Should Know After Topic 1

- Why a router exists (real URLs, browser history, no full reload)
- `createBrowserRouter` config-first setup vs the older JSX `<Routes>`/`<Route>` style
- Dynamic segments (`:id`) vs query strings (`?key=value`) — and which hook reads which
- `useParams` values are always strings
- `useNavigate` for imperative redirects, `replace: true` gotcha
- `Link`/`NavLink` instead of `<a>` for internal navigation

---

# React Router — Topic 2: Nested Routes & Layouts

## 1. The Problem Nested Routes Solve

Without nesting, every route re-renders the *entire* page, including shared chrome (navbar, sidebar) that shouldn't change.

```text
❌ Flat routes — navbar/sidebar re-created per page
/dashboard        → <DashboardPage> (has its own navbar+sidebar+content)
/dashboard/settings → <SettingsPage> (has its own navbar+sidebar+content, duplicated)
```

Nested routes let a parent route render shared layout once, with only the inner content swapping.

---

## 2. `children` + `<Outlet />`

```tsx
const router = createBrowserRouter([
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    children: [
      { index: true, element: <DashboardHome /> },
      { path: "settings", element: <Settings /> },
      { path: "billing", element: <Billing /> },
    ],
  },
]);
```

```tsx
function DashboardLayout() {
  return (
    <div>
      <Sidebar />
      <main>
        <Outlet /> {/* the matched child route renders here */}
      </main>
    </div>
  );
}
```

Mental model:

```text
/dashboard/settings
       ↓
matches DashboardLayout (parent) + Settings (child)
       ↓
DashboardLayout renders once
       ↓
<Outlet /> is replaced with <Settings />
```

**Note the child paths are relative** — `path: "settings"` under a parent at `/dashboard` resolves to `/dashboard/settings`, you don't repeat the parent prefix.

---

## 3. `index: true` — The Default Child Route

```tsx
{ index: true, element: <DashboardHome /> }
```

This is the route that renders in the `<Outlet />` when the URL is exactly the parent path (`/dashboard`) with no further segment. It's mutually exclusive with `path` on the same route object — an index route has no `path` of its own.

---

## 4. Layouts Without Their Own URL Segment

A layout route doesn't have to correspond to a URL segment at all — it can just be a wrapper:

```tsx
const router = createBrowserRouter([
  {
    element: <AuthLayout />, // no `path` — just wraps children
    children: [
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
    ],
  },
]);
```

Useful for applying a shared layout (e.g. a centered auth-page shell) across multiple otherwise-unrelated paths.

---

## What You Should Know After Topic 2

- Why nested routes exist — avoid re-rendering shared layout chrome per page
- `<Outlet />` is where the matched child renders inside a parent layout
- `index: true` for the default child at the parent's exact path
- Child route `path`s are relative to the parent
- A layout route can omit `path` entirely and just wrap other routes

---

# React Router — Topic 3: Loaders, Actions & Data APIs

## 1. The Old Way vs the New Way

Old pattern — fetch data inside the component with `useEffect`:

```tsx
function UserDetail() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) return <p>Loading...</p>;
  return <p>{user.name}</p>;
}
```

This has the classic waterfall problem: **route renders first, then fetches** — you see a loading spinner *after* navigation, and the component has to own loading/error state manually.

---

## 2. Loaders — Fetch Before Render

```tsx
const router = createBrowserRouter([
  {
    path: "/users/:id",
    element: <UserDetail />,
    loader: async ({ params }) => {
      const response = await fetch(`/api/users/${params.id}`);
      if (!response.ok) throw new Response("Not Found", { status: 404 });
      return response.json();
    },
  },
]);
```

```tsx
import { useLoaderData } from "react-router-dom";

function UserDetail() {
  const user = useLoaderData(); // already resolved, no loading state needed here

  return <p>{user.name}</p>;
}
```

Mental model — the fetch happens **during navigation**, before the component mounts:

```text
User clicks link to /users/42
        ↓
   loader runs (fetches data)
        ↓
   navigation completes
        ↓
UserDetail renders with data already available
```

**Gotcha:** this shifts data-fetching ownership from the component to the route config. It's a different mental model from Phase 2's TanStack Query pattern (fetch inside the component/hook) — worth being deliberate about which one owns fetching in a given app, not mixing both randomly for the same data.

---

## 3. Showing a Pending State — `useNavigation`

Even though the loader blocks the render, you often still want a global "navigating..." indicator (e.g. a top progress bar) rather than a blank screen during a slow fetch:

```tsx
import { useNavigation } from "react-router-dom";

function RootLayout() {
  const navigation = useNavigation();

  return (
    <div>
      {navigation.state === "loading" && <TopProgressBar />}
      <Outlet />
    </div>
  );
}
```

`navigation.state` is one of `"idle" | "loading" | "submitting"`.

---

## 4. Actions — Mutations Tied to Routes

The `action` counterpart to `loader`, triggered by a `<Form>` submission (React Router's own `Form`, not a plain HTML form):

```tsx
import { Form, redirect } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/users/new",
    element: <NewUserForm />,
    action: async ({ request }) => {
      const formData = await request.formData();
      const name = formData.get("name");

      await fetch("/api/users", {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      return redirect("/users"); // navigate after the mutation succeeds
    },
  },
]);
```

```tsx
function NewUserForm() {
  return (
    <Form method="post">
      <input name="name" />
      <button type="submit">Create</button>
    </Form>
  );
}
```

**Gotcha — the easy-to-miss part:** `<Form>` from `react-router-dom` looks identical to a plain `<form>`, but it intercepts the submit, prevents the full-page POST, and routes it to the matching route's `action` instead. Using a plain `<form>` here would cause a real browser navigation/page reload — an easy copy-paste mistake if you're used to Phase 3's React Hook Form patterns, which are a completely separate, client-only mechanism with no route `action` involved.

---

## 5. Error Handling — `errorElement` / `useRouteError`

```tsx
{
  path: "/users/:id",
  element: <UserDetail />,
  loader: userLoader,
  errorElement: <UserErrorBoundary />,
}
```

```tsx
import { useRouteError } from "react-router-dom";

function UserErrorBoundary() {
  const error = useRouteError();

  if (error instanceof Response && error.status === 404) {
    return <p>User not found.</p>;
  }

  return <p>Something went wrong.</p>;
}
```

Throwing inside a `loader` or `action` (like the `throw new Response(...)` in section 2) is caught by the nearest `errorElement`, instead of crashing the whole app — similar spirit to a React error boundary, but routing-aware.

---

## 6. Where This Overlaps With TanStack Query — and Why Query Usually Wins

Both loaders and TanStack Query solve "get server data into a component," but they're not an even trade-off:

```text
React Router loaders          TanStack Query
   - tied to route navigation    - tied to component mount/hooks
   - no built-in caching         - caching, refetch, staleTime, dedup
   - refetch = re-run the        - refetch/invalidate/background
     whole navigation              refresh without navigating
   - no request dedup             - dedupes identical in-flight
                                    requests automatically
```

**Preference: default to TanStack Query for REST/API data, not loaders.** A loader re-fetches by re-running navigation logic; it has no concept of "this data is 30 seconds old, don't refetch," no automatic request dedup, and no easy way to revalidate in the background without the user navigating again. Query gives you all of that for free, plus it isn't coupled to the router at all — the same query hook works whether the data is used inside a routed page or a modal that has nothing to do with the URL.

Loaders are still worth knowing (interviews ask about them, and they matter if you're ever in a Remix-style app where they're the primary data layer), but for a React Router + TanStack Query stack, **treat loaders as something you're aware of, not something you reach for by default.** If a route needs data, wire it through a Query hook inside the component, the same pattern from Phase 2.

---

## What You Should Know After Topic 3

- Why loaders exist — fetch during navigation instead of after render, avoiding the render-then-fetch waterfall
- `useLoaderData()` reads what the loader returned, no local loading state needed
- `useNavigation().state` for a global pending indicator during a loader-blocked navigation
- `action` + React Router's own `<Form>` for mutations — and that plain `<form>` here breaks silently into a full page reload
- `errorElement` + `useRouteError` for route-level error handling, including thrown `Response`s for things like 404s
- The loaders-vs-TanStack-Query overlap, and why mixing both for the *same* data source needs a deliberate choice, not an accident

---

# React Router — Topic 4: Protected Routes & Lazy Loading

## 1. Protected/Private Routes — Why This Matters

Any app with auth needs a way to say "this route requires login" — otherwise an unauthenticated user can type the URL directly and land on a page meant to be gated. This is a routing concern first, an API-auth concern second (the API should *also* reject unauthorized requests independently — the route guard is a UX layer, not the security boundary).

## 2. Pattern — A Wrapper Component

The most common approach doesn't need a loader at all — a component that checks auth state and either renders its children or redirects:

```tsx
import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
```

Wired up as a layout route wrapping every route that needs auth:

```tsx
const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/settings", element: <Settings /> },
    ],
  },
]);
```

Mental model — this is the exact same "layout route with no `path`" trick from Topic 2 section 4, just used for a guard instead of visual chrome:

```text
User navigates to /dashboard
       ↓
ProtectedRoute checks isAuthenticated
       ↓
   false → <Navigate to="/login" />  (redirect, no Dashboard render)
   true  → <Outlet /> renders <Dashboard />
```

**Gotcha:** always pass `replace` on the redirect (same reasoning as Topic 1 section 6) — otherwise hitting back from `/login` re-triggers the redirect loop instead of leaving the app.

## 3. Loader-Based Alternative

If a project is already loader-heavy, the same idea can live in a loader instead:

```tsx
{
  path: "/dashboard",
  element: <Dashboard />,
  loader: () => {
    if (!isAuthenticated()) {
      return redirect("/login");
    }
    return null;
  },
}
```

Given the Query-first preference from Topic 3, **the wrapper-component approach is the better default** here — it doesn't require every protected route to carry its own loader, and it composes naturally with a Zustand auth store instead of needing auth state accessible from a plain function outside React.

---

## 4. Lazy-Loaded Routes — Why This Matters

Without lazy loading, the initial JS bundle includes every route's code up front, even routes the user may never visit in a given session. This directly connects to Phase 3.1's Vite code-splitting concept and Phase 4's `lazy`/`Suspense` topic — route-level splitting is the most common real-world place that pattern gets used.

## 5. Pattern — `React.lazy` + `Suspense`

```tsx
import { lazy, Suspense } from "react";

const Settings = lazy(() => import("./pages/Settings"));

const router = createBrowserRouter([
  {
    path: "/settings",
    element: (
      <Suspense fallback={<p>Loading...</p>}>
        <Settings />
      </Suspense>
    ),
  },
]);
```

Mental model:

```text
User navigates to /settings
       ↓
Settings.tsx hasn't been downloaded yet
       ↓
<Suspense> shows fallback
       ↓
chunk downloads
       ↓
Settings renders
```

**Gotcha:** every lazy route needs its own `<Suspense>` boundary (or share one wrapping the whole `<Outlet />` in a layout) — forgetting it doesn't crash, but `lazy` without a `Suspense` ancestor throws at render time.

## 6. Newer Alternative — `lazy` on the Route Object Itself

React Router (v6.4+) also supports lazy-loading the *route definition* itself, not just the component, which additionally splits out that route's `loader`/`action` code:

```tsx
{
  path: "/settings",
  lazy: async () => {
    const { Settings, settingsLoader } = await import("./pages/Settings");
    return { Component: Settings, loader: settingsLoader };
  },
}
```

This is worth knowing exists, but the plain `React.lazy` + `Suspense` pattern above is the one that shows up most often and the one to reach for first — this route-object form matters more once a route's loader code itself is heavy enough to be worth splitting separately.

---

## What You Should Know After Topic 4

- Why route guards exist, and that they're a UX layer, not a substitute for the API also enforcing auth
- The wrapper-component + `<Navigate replace>` pattern for protected routes, reusing the "layout route with no path" trick
- Why `replace` matters on the redirect (same reasoning as `useNavigate`'s `replace` option)
- The loader-based alternative for protecting a route, and why the wrapper component is still the better default in a Query-first, Zustand-auth-store setup
- Why route-level code splitting matters (smaller initial bundle) and how it connects to Vite's code-splitting concept
- `React.lazy` + `Suspense` for lazy-loaded route components, and the `Suspense`-boundary gotcha
- That a newer `lazy` route-object form exists for splitting loader/action code too, but isn't the default first move

---

# Still Deferred (intentionally, for later)

- **`useFetcher`** — for triggering a loader/action without a full navigation (e.g. a "like" button that updates data without changing the URL). Only relevant if the project ends up loader-heavy, which the Topic 3 preference argues against by default.
- **Data revalidation** (`shouldRevalidate`) — fine-tuning when a loader re-runs after an action. Same caveat as above.

Pick these up only if a real project ends up leaning on loaders/actions as its primary data layer.
