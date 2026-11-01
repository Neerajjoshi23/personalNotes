# FE13 · Frontend Architecture at Scale: boundaries, deploys, flags and tests for many teams

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Dashboard / Adobe admin console (FE Tier 1), E-commerce (FE Tier 2), any "large app, many teams" or staff-level architecture question, Design system follow-ups, Migration / rewrite questions

---

## Why this topic matters

Senior rounds stop asking "how do you build this feature" and start asking "how do twenty engineers across five teams ship this product without breaking each other". The answer is not a framework. It is boundaries, ownership, release mechanics and safety nets.

| Pressure | What it forces |
|---|---|
| More teams in one repo | merge conflicts, accidental coupling, slow CI |
| Different release needs | one team blocked by another team's broken branch |
| Big blast radius | one bad deploy takes down the whole console |
| Long-lived code | upgrades and rewrites that cannot stop the world |
| Risky launches | need to ship dark, ramp slowly, roll back without a deploy |

**Interview line:** "I start from a modular monolith and only split deployables when team autonomy or release independence is the real bottleneck. Architecture is a response to a measured pain, not a starting position."

---

## Part 1: why architecture questions come up, and what actually forces a split

### Modular monolith first

One repo, one build, one deploy, but strict internal module boundaries. You get cheap refactors, one version of every dependency, one UX, atomic changes across modules, and simple debugging.

What forces a split (each is a real, nameable pain):

| Signal | Split into |
|---|---|
| Teams block each other's releases | independently deployable apps (micro-frontends) |
| CI takes 40 minutes because everything rebuilds | monorepo with task graph + cache, not necessarily more apps |
| One area needs a different release cadence (compliance, legacy) | separate deployable for that area |
| Gradual migration off an old stack | strangler-style composition |
| Org boundary (acquired product, another BU) | integration at a runtime boundary |

What does **not** justify a split: "microservices are cool", "we want different frameworks", a team of eight.

### Four words to use precisely

- **Ownership:** a path or module has named owners (CODEOWNERS), and they review changes there.
- **Blast radius:** how much breaks if this change is wrong. Smaller deployables and flags shrink it.
- **Independent deploy:** a team can ship to production without coordinating with another team.
- **Coupling vs cohesion:** split along business capability (billing, users, reports), not along technical layers.

**Interview line:** "Splitting by layer, like a components team and a services team, makes every feature cross every team. I split by vertical slice so one team can own a feature end to end."

---

## Part 2: code organization, boundaries and monorepos

### Feature-based folders with a public API

```text
src/
  app/              shell: routing, providers, layout
  features/
    users/
      index.ts      <- public API: the only file others may import
      api/          queries, mutations, types
      components/
      hooks/
      internal/     private helpers
    billing/
    reports/
  shared/           ui primitives, utils, http client (no domain logic)
```

Rules that make it real:

1. A feature exports through `index.ts` only. No deep imports like `features/users/internal/x`.
2. `shared` never imports from `features`. `features` do not import each other's internals.
3. Features talk through the public API, URL state or events, not each other's stores.
4. Domain logic lives in the feature; `shared` holds only generic UI and utilities.

### Enforce it, do not just document it

Boundaries that are not linted rot within a quarter. Use lint rules (for example `eslint-plugin-boundaries`, `no-restricted-imports`, or Nx-style module-boundary tags) and make CI fail.

```js
// .eslintrc excerpt: nobody reaches into another feature's internals
'no-restricted-imports': ['error', {
  patterns: ['@/features/*/internal/*', '@/features/*/components/*'],
}],
```

Add CODEOWNERS so a boundary change needs the owning team's approval.

### Monorepo vs polyrepo

| | Monorepo | Polyrepo |
|---|---|---|
| Cross-package change | one atomic PR | coordinated PRs and version bumps |
| Dependency versions | one version policy, easy to enforce | drift per repo |
| Tooling | one lint/test/TS config to maintain | each repo different |
| CI cost | grows without affected-only + caching | per-repo, small |
| Autonomy | weaker by default (shared main) | strong |
| Access control | coarser (needs CODEOWNERS) | per-repo permissions |

Monorepo mechanics worth knowing:

- **Workspaces** (npm/pnpm/yarn) link local packages so `@acme/ui` resolves to the folder.
- **Task graph + cache:** Turborepo's docs frame the problem as thousands of tasks across workspaces, and its answer is scheduling tasks for parallelism plus a (remote) cache so CI does not repeat work. Nx is the same idea with richer project graph and boundary tooling.
- **Affected-only runs:** build and test only packages whose inputs changed, plus dependents.
- **Shared packages:** `ui`, `config` (eslint/tsconfig), `api-client`, `utils`. Keep them small and stable.

### Versioning shared packages

| Style | Use when |
|---|---|
| Workspace "latest" (no publish) | one deployable app, all consumers rebuild together |
| Fixed/independent semver + changesets | packages consumed by multiple deployables or externally |

Trade-off: in-repo "always latest" is easy but a breaking change hits everyone at once; semver gives consumers a choice at the cost of version drift.

**Interview line:** "Monorepo is about tooling and atomic change, not about deploy topology. I can have a monorepo that ships one app or ten. Splitting deployables is a separate decision."

---

## Part 3: micro-frontends

Martin Fowler's article (Cam Jackson, Thoughtworks) defines them as "an architectural style where independently deliverable frontend applications are composed into a greater whole". Its stated benefits mirror microservices: incremental upgrades, simple decoupled codebases, independent deployment, autonomous teams. Teams should form around vertical slices of business functionality, not a "styling team".

The natural shape: one **container (shell) app** owns common chrome, auth and navigation, and mounts a micro-frontend per page or area.

### Integration styles

| Style | How | Pros | Cons |
|---|---|---|---|
| Build-time packages | each MFE published as an npm package, container depends on all | single bundle, deduped deps | lockstep release: any change means rebuilding and redeploying everything. The article recommends strongly against it |
| Server/edge composition | server includes fragments per route (SSI, edge includes) | SEO/SSR friendly, no client framework coupling | server infra, caching and fragment latency |
| iframes | each MFE is its own page in a frame | strong isolation of CSS and globals | routing, deep links, history, responsiveness, shared auth and a11y get awkward |
| Runtime via JavaScript | script tag exposes a global mount function; container calls it | flexible and independently deployable. Fowler calls it the default and most common | you design the contract and lifecycle yourself |
| Web Components | each MFE defines a custom element | platform-standard contract, shadow DOM style isolation | SSR and framework interop rough edges |
| Module Federation | webpack builds act as containers that expose and consume modules at runtime | shared deps via share scope, typed-ish imports | version skew, build tooling coupling, debugging |

### Module Federation in one screen

From the webpack docs: multiple separate builds form a single application. Each build acts as a container that can **expose** modules and **consume** others; remote modules load asynchronously at runtime through chunk loading (an `import()`), so a remote is never a synchronous import.

```js
// shell: webpack.config.js
new ModuleFederationPlugin({
  name: 'shell',
  remotes: { reports: 'reports@https://reports.example.com/remoteEntry.js' },
  shared: { react: { singleton: true, requiredVersion: '^18.0.0' } },
});

// somewhere in the shell
const Reports = React.lazy(() => import('reports/ReportsPage'));
```

Things to say out loud:

- **Share scope:** shared modules are provided to and consumed from one scope; a consumer gets the highest version that satisfies its `requiredVersion`, and an already-loaded version is never replaced.
- **`singleton`:** for libraries that must exist once (React, router, design-system context). Mismatch then means a warning or failure, not silent duplication.
- **Async boundary:** the "shared module not available for eager consumption" error is fixed by a `bootstrap` file behind a dynamic `import()`.
- **Unique names:** every build needs a distinct `output.uniqueName`, or two builds collide at runtime.
- **Dynamic remotes:** the remote URL can come from config at runtime, which is how you point the shell at a canary or a rollback version without rebuilding it.

### Shared concerns (what the shell owns)

| Concern | Guidance |
|---|---|
| Routing | shell owns top-level routes; MFEs own sub-routes. Fowler: use the URL as the communication channel, and treat routes as a contract with tests |
| Auth | shell owns login and token; inject it into MFEs on mount. Users authenticate once |
| Shared state | avoid it. Pass data down through the mount contract, or use events/URL. Fowler compares shared state across MFEs to a shared database across microservices |
| Design system | shared library of UI-only components; harvest components after real usage instead of building a giant platform first; give it a custodian team |
| Styling | pick any isolation (CSS modules, CSS-in-JS, shadow DOM, naming), as long as teams cannot collide |
| Backend | a BFF per MFE when every feature needs backend changes (see FE4 Part 1) |

### Costs and when NOT to use

- **Payload duplication:** each build may bundle its own React. Sharing fixes bytes but re-introduces a version contract. Fowler's point: measure, since independent bundles also act as natural code splitting.
- **UX inconsistency:** different teams drift on spacing, loading and error states without strong design-system governance.
- **Environment differences:** an MFE developed standalone can break in the real shell (global CSS, shared libs). Integrate early in a production-like environment.
- **Operational complexity:** more repos, pipelines, domains, observability. Fowler asks if you have the automation and governance maturity.

Do NOT use micro-frontends when: one team, one product, deploys are fine, the bottleneck is CI speed (use a monorepo task cache), the problem is code quality (use lint boundaries), or the app is small. A modular monolith plus flags covers most "independent release" needs.

**Interview line:** "I'd say micro-frontends are an organizational scaling tool. If I cannot name the teams blocked by each other, I would not pay the runtime integration cost."

### ⏭ *Skip for interviews*: single-spa, import maps, Native Federation

Frameworks like single-spa, import-map-based loading and Native Federation (standards-based federation without webpack) exist. Know the names; the concepts above (shell, contract, shared deps, runtime load) are what interviewers probe.

---

## Part 4: build and deploy

This extends FE5 Part 4 (cache headers) and FE4 Part 4 (error handling). The question: what happens to users while you deploy?

### Content-hashed assets, immutable caching, HTML no-cache

web.dev's HTTP cache guide: put a fingerprint in the filename (`style.x234dff.css`), then serve with `Cache-Control: max-age=31536000` (optionally `immutable`). HTML cannot be versioned in its URL, so use `no-cache` (revalidate, not "do not store"; `no-store` means never store at all).

```http
# /assets/app.4f3a9c.js
Cache-Control: public, max-age=31536000, immutable
# /index.html
Cache-Control: no-cache
```

Rule: the HTML is the pointer; the hashed files are the data. Update the pointer last.

### Atomic deploys

Upload all new hashed assets first, then flip the HTML (or the manifest) in one step. Never overwrite or delete old assets while old HTML may still point at them.

| Approach | Behavior |
|---|---|
| Upload assets, then HTML | safe: old and new both resolvable |
| Overwrite in place | users get new HTML with old chunk, or the reverse |
| Delete old assets immediately | stale tabs 404 on lazy chunks |
| Immutable release folders + pointer swap | easiest rollback |

### Version skew and stale tabs

A tab opened yesterday still runs yesterday's JS. When the user clicks a route, it requests a lazy chunk by an old hash. If the host deleted it, the dynamic import fails ("ChunkLoadError", "Failed to fetch dynamically imported module").

Vite's build guide covers this: it emits a `vite:preloadError` event when dynamic imports fail to load; calling `event.preventDefault()` stops the error from being thrown, and the example reloads the page. It also notes the hosting service may delete previous deployments' assets, and that you must set `Cache-Control: no-cache` on HTML, otherwise old assets will still be referenced.

```ts
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  // better than a silent reload: unsaved work may exist
  showToast('A new version is available', { action: 'Reload', onClick: () => location.reload() });
});
```

Recovery ladder:

1. Keep previous release assets for a retention window (days), so most stale tabs still work.
2. Catch chunk failures, then prompt a reload (links to the FE4 error-handling idea: scoped error, clear recovery action). Auto-reload only when no unsaved state; guard against reload loops with a one-shot sessionStorage flag.
3. For long-lived dashboards, poll a `/version.json` (served `no-cache`) and show a non-blocking "update available" banner.
4. API compatibility: new frontend must tolerate old backend and the reverse, because the deploys are not simultaneous. Version or additively evolve APIs.

### CDN, previews, rollback, source maps

- **CDN:** put hashed assets on the CDN with long TTL; HTML either short TTL with revalidation or purged on deploy. Mind `public` vs `private` for personalized responses.
- **Preview deployments:** every PR gets a unique URL (immutable build per commit). Reviewers and QA test the real artifact; e2e runs against it. In micro-frontends, point the shell at a preview remote via a dynamic remote URL.
- **Rollback:** with immutable builds, rollback means repointing HTML/manifest to the previous build, not rebuilding. Pair with flags so many "rollbacks" need no deploy at all.
- **Source maps:** upload to the error tracker (FE11 observability) keyed by release id; do not serve publicly if code is sensitive, or restrict by auth/IP. Tag errors with the release so you can see "errors spike in build X".
- **Build once, configure at runtime:** do not bake environment into the bundle if you promote the same artifact across stages. Fetch runtime config (`/config.json`) or inject it into HTML.

**Interview line:** "Hashed assets are immutable, HTML is no-cache, and I deploy assets before the pointer. Then a stale tab is just a version-skew problem, solved with retention plus a reload prompt, not a surprise white screen."

---

## Part 5: feature flags, gradual rollout and experimentation

OpenFeature's intro describes a feature flag as "an if/else statement that can be controlled at runtime", used for hiding work in progress, canary releases, A/B testing, safely degrading during an outage, and restricting access by user traits. Flags are dynamic and context-aware.

### Flag types

| Type | Purpose | Lifetime | Example |
|---|---|---|---|
| Release | ship code dark, enable gradually | short, delete after 100% | `new-reports-table` |
| Ops / kill switch | turn off a risky or failing dependency | long-lived | `disable-export-service` |
| Experiment | assign users to variants, measure metrics | until decision | `onboarding-v2` A/B |
| Permission / entitlement | who may use a feature (plan, role, org) | long-lived | `sso-config-enabled` |

Keep these separate: a permission flag is product logic and needs security enforced on the server; a release flag is temporary scaffolding.

### Evaluation: client vs server

| | Server-side evaluation | Client-side evaluation |
|---|---|---|
| Rules and secrets | stay private | rules exposed, or only resolved values sent |
| Latency | no extra round trip if done in BFF/SSR | needs flags fetched before render |
| Flicker | none if resolved before HTML | possible flash of old UI |
| Freshness | per request | needs streaming/polling to update |

OpenFeature models this with SDK paradigms (server vs client) and an **evaluation context** (user, org, plan, region) passed into evaluation; **providers** adapt a vendor; **hooks** add logging/telemetry; **events** signal provider ready or flag config changed.

Practical rules:

1. Resolve flags once at app start (or in the BFF/SSR), put them in context, and render after ready; show a skeleton instead of default-then-swap.
2. For SSR/edge, evaluate on the server and embed the values in the HTML so hydration matches (see FE2 hydration pitfalls). A client-only flag that changes rendered output causes mismatches.
3. Never trust a client flag for security. Hiding a button is UX; the API must enforce.
4. Default to a safe value if the flag service is down (usually "off" for new, "on" for kill-switch protections), and set a timeout so the app does not wait forever.

```tsx
function ReportsPage() {
  const useNewTable = useFlag('new-reports-table', false); // safe default
  return useNewTable ? <ReportsTableV2 /> : <ReportsTableV1 />;
}
```

### Gradual rollout

Ladder: internal staff, then 1%, 5%, 25%, 50%, 100%, watching error rate, latency and business metrics at each step. Bucket **deterministically** by a stable id (hash of user or org id plus flag key) so users do not flip between variants across sessions. For B2B consoles, roll out by **org/tenant**, not by user, so one company sees a consistent product.

### Experiments (A/B)

- **Assignment:** deterministic hashing on a stable unit (user, or org for B2B), sticky across devices when logged in.
- **Exposure event:** log when a user actually *sees* the variant, not when assigned. Otherwise metrics dilute.
- **Metrics:** one primary metric, guardrail metrics (errors, latency, support tickets), a planned sample size and duration. Avoid peeking and stopping early.
- **Interaction:** concurrent experiments on the same surface confound each other; use layers or mutual exclusion.

### Cleanup of stale flags

Flags are debt. Each release flag gets an owner, an expiry date and a ticket to remove the dead branch. Lint or a CI report for flags older than N days. Test both branches while the flag lives, because the old path rots fastest.

**Interview line:** "Deploy is not release. I deploy dark, enable by tenant in steps with a kill switch ready, and delete the flag when it hits 100%."

### ⏭ *Skip for interviews*: OpenFeature provider internals

Writing a custom provider, hooks lifecycle stages, and the OFREP wire protocol are worth a glance only if the company uses OpenFeature. The vendor-neutral API idea is the interview point.

---

## Part 6: testing strategy at the architecture level

Kent C. Dodds's testing trophy has four layers, bottom to top: static, unit, integration, end-to-end. It is a guide to return on investment where return is confidence and investment is time, anchored on "the more your tests resemble the way your software is used, the more confidence they can give you". He explicitly defines unit as one unit with collaborators absent or mocked, and integration as multiple units working together, and he warns the definitions are loose and the percentages are a distraction compared with fast, reliable tests that fail for useful reasons.

| Layer | Tooling | What to test | Do not test |
|---|---|---|---|
| Static | TypeScript, ESLint, boundary rules, format | type errors, dead code, forbidden imports | n/a |
| Unit | Vitest/Jest | pure logic: reducers, formatters, permission checks, parsers | trivial components, implementation details |
| Integration | Testing Library + MSW | a page/feature with real components, hooks and mocked network: user types, clicks, sees result | child component internals |
| E2E | Playwright/Cypress | few critical journeys: login, create, pay, export, across the real stack | every edge case (slow, flaky) |
| Visual regression | Playwright screenshots, Chromatic/Storybook | design-system components, layout-sensitive pages | dynamic data without fixtures |

### Integration with Testing Library and MSW

MSW docs: it intercepts requests at the network level using the Service Worker API in the browser (and an environment-close approach in Node), works with any client (fetch, Axios, React Query, Apollo), and makes API mocking a standalone, reusable layer shared across development, integration tests, e2e and Storybook.

```ts
// handlers.ts: single source of truth for API mocks
export const handlers = [
  http.get('/api/users', () => HttpResponse.json([{ id: '1', name: 'Asha' }])),
];

// users.test.tsx
test('shows users and handles failure', async () => {
  render(<UsersPage />);
  expect(await screen.findByText('Asha')).toBeVisible();

  server.use(http.get('/api/users', () => new HttpResponse(null, { status: 500 })));
  user.click(screen.getByRole('button', { name: /retry/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load/i);
});
```

Query by role and text, the way users and assistive tech do; this also keeps accessibility honest (FE7).

### Contract tests

The frontend and backend (or two micro-frontends) agree on a shape. Options:

- shared typed schema (OpenAPI/GraphQL schema to generated types) so the compiler catches drift;
- schema validation at the boundary (zod) in dev/test to catch backend deviations;
- consumer-driven contracts (Fowler's article suggests them for MFE integration) so a team states what it needs from another without spinning up every app;
- MSW handlers generated from or validated against the same schema, so mocks cannot lie for long.

### CI gates

| Gate | Catches | Notes |
|---|---|---|
| Typecheck + lint (incl. boundary rules) | type errors, forbidden imports | fast, run first, affected-only |
| Unit + integration tests | logic and feature regressions | parallelized and cached by the monorepo task runner |
| Bundle-size budget | accidental heavy import (moment, lodash full) | fail PR if entry chunk grows beyond threshold; report per-route |
| Lighthouse CI / Web Vitals check | LCP, CLS, TBT regressions on key pages | lab only, noisy; trend it, do not gate on a single run (FE5 Part 5) |
| E2E smoke against preview deploy | real integration, deploy-time breakage | small critical-path suite |
| Accessibility check (axe) | basic a11y regressions | automated catches only part of issues |

Flaky tests are worse than missing tests: quarantine quickly, track flake rate, never normalize "just rerun it".

**Interview line:** "Static analysis and integration tests give most of my confidence per minute. I keep e2e to a handful of money-path journeys against a preview deploy, and I use MSW so the same mocks serve dev, tests and Storybook."

---

## Part 7: cross-cutting platform concerns (brief)

| Concern | Position |
|---|---|
| Auth/session across apps | one owner (shell or auth SDK). Prefer HttpOnly cookie sessions for same-site apps; otherwise shell injects short-lived tokens. Single refresh logic, one logout broadcast (BroadcastChannel/storage event). See FE8 |
| i18n | central message catalogs per feature, lazy-loaded per locale and route; one shared formatting layer for dates/numbers; pseudo-localization in CI. See FE7 |
| Error and observability hooks | shell provides error boundary, logger, tracer; every MFE/feature reports with release id, feature name, owner team, request id. See FE11 observability |
| Design system | versioned package or federated container; tokens first, UI-only components, custodian team, visual regression in CI. See FE10 design system |
| Dependency upgrades | automated PRs (Renovate/Dependabot), one policy for shared singletons (React, router), codemods, canary the upgrade behind a flag or on one remote first. Avoid "big bang" majors across all teams |

Governance in one line: a thin platform (shell, design system, build config, observability, flags) owned by a platform team, thick vertical features owned by product teams.

---

## Part 8: worked mini-example through RADIO

**Prompt:** "Design the frontend architecture for a large admin console used by many teams." (Think Adobe Admin Console: users, products, storage, security, billing, reports, many owning teams, enterprise tenants.)

### R: Requirements

- Functional: shell with nav and org switcher; areas such as Users, Products, Security, Reports, Billing; role-based visibility; heavy tables and forms.
- Non-functional: many teams shipping weekly, enterprise tenants who need predictable change, auth-only (no SEO), a11y and i18n required, low blast radius, fast rollback.
- Clarify: how many teams, are areas independently owned, any legacy app to embed, release cadence needs, compliance windows?

### A: Architecture

- Start with a **modular monolith in a monorepo**: shell + feature packages (`users`, `products`, `reports`, ...), shared `ui`, `api-client`, `config`. Lint boundaries and CODEOWNERS.
- Escalate selectively: if two or three areas truly need independent deploys (or an embedded legacy app), extract **those** as runtime-integrated remotes (Module Federation or a JS mount contract) behind the shell. Everything else stays in the monolith.
- Shell owns: auth, org/tenant context, nav, error boundary, flags provider, telemetry, shared singletons (React, router, design system).
- Rendering: CSR with route-level splitting (FE2 dashboard guidance, FE5 Part 2); skeletons; no SSR needed.

### D: Data

- One typed network layer (FE4) with request IDs, cancellation, retry policy; query cache keyed by tenant + resource. Each feature owns its queries and exposes hooks via its public API.
- A BFF aggregates screen-shaped data for heavy areas such as the overview and reports.
- Cross-area communication via URL (`/users/42`), events and the mount contract; no shared global store.

### I: Interface

- Contract between shell and area: `mount(el, { basePath, user, tenant, flags, telemetry })` and `unmount(el)`, or the equivalent React component props. Version this contract and test it.
- Public API per feature; routes as contract (`/users/:id` is stable).
- Flags: release flags per area, kill switches per backend dependency, permission flags from entitlements. Roll out by tenant.

### O: Optimization and operations

- Deploy: hashed assets, HTML `no-cache`, assets-then-pointer, retention window, `preloadError` toast, version banner.
- Per-area pipelines with preview deployments; shell pins or dynamically resolves remote versions (canary tenants first, then all).
- CI: affected-only typecheck/lint/test, bundle budgets per area, Playwright smoke on preview, visual regression for the design system.
- Observability: release id and owning team on every error and web-vital; per-area dashboards and alerts.
- Trade-offs to state: modular monolith first (simple, atomic) vs micro-frontends (autonomy, complexity); shared singleton React (small, coupled upgrades) vs per-remote copies (isolated, heavy); tenant-based rollouts (consistent) vs user-based (finer).

**Interview line:** "I'd begin with one deployable and hard boundaries, measure where teams block each other, and only then carve out the two areas that need their own release train, keeping auth, design system and telemetry in a thin shell."

---

## Part 9: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| 1 team, 1 product | single app, feature folders | split costs more than it saves |
| 5-30 devs, slow CI | monorepo + affected-only + remote cache | fixes build pain without new deployables |
| Teams blocked on shared release | independent deployables (runtime composition) | decouple release trains |
| Migrate off legacy app | strangler via shell + MFE or iframe | incremental, no big-bang rewrite |
| Shared React across remotes | Module Federation `singleton` + `requiredVersion` | one copy, explicit version contract |
| Stale tab after deploy | retain old assets + `preloadError` handler + version banner | avoids chunk 404 white screens |
| Risky new feature | release flag + tenant rollout + kill switch | decouple deploy from release |
| Experiment | deterministic bucketing + exposure event + guardrails | trustworthy metrics |
| Test strategy | static + integration (RTL + MSW) heavy, few e2e | best confidence per minute |
| Enforce boundaries | lint rules + CODEOWNERS in CI | docs alone do not hold |

### Common interview traps

- Jumping to micro-frontends without naming the organizational problem.
- Build-time npm packages per MFE and calling it "independent" (it is lockstep).
- Sharing a global store across micro-frontends.
- Caching HTML with a long TTL, or deleting old assets at deploy time.
- Treating flags as security; leaving flags in forever.
- Client-side flag changes that cause SSR hydration mismatch or UI flicker.
- Assigning experiment users without logging exposure.
- An e2e-heavy pyramid that is slow and flaky, with no static or integration layer.
- Shared design-system components that contain domain logic (`ProductTable`).
- Ignoring that frontend and backend deploys are not atomic.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What actually justifies splitting a frontend into independently deployable apps?</summary>

A real organizational or release bottleneck: teams blocked by each other's release trains, different cadences or compliance needs, an incremental migration off legacy, or org boundaries. Slow CI alone is better solved by a monorepo with task caching, and code quality by lint boundaries. Otherwise stay a modular monolith.
</details>

<details><summary>2. How do you keep module boundaries from rotting inside a monolith?</summary>

Feature folders with a single public `index.ts`, lint rules that forbid deep imports and `shared` importing `features`, CODEOWNERS for review, and CI failing on violations. Documented rules without enforcement erode.
</details>

<details><summary>3. Why does Fowler recommend against build-time integration of micro-frontends?</summary>

Publishing each MFE as an npm package consumed by the container creates a lockstep release process: to ship any change you must rebuild and redeploy everything. That recreates the coupling micro-frontends were meant to remove. Integrate at runtime (JS mount contract, web components, iframes, federation, or server composition).
</details>

<details><summary>4. In Module Federation, how are shared dependencies resolved, and what can go wrong?</summary>

Builds provide and consume modules through a share scope; a consumer receives the highest version that satisfies its `requiredVersion`, and an already-loaded version is never replaced. `singleton` forces one copy. Problems: version skew between remotes, eager-consumption errors (fix with an async bootstrap boundary), colliding `uniqueName`s, and shared-version coupling that brings back lockstep upgrades.
</details>

<details><summary>5. Which cache headers do you use for hashed assets versus HTML, and why?</summary>

Hashed assets: `Cache-Control: public, max-age=31536000, immutable`, because the filename changes when content changes. HTML: `no-cache` (revalidate every time), because its URL is not versioned and it points at the current hashed assets. `no-store` would disable caching entirely, which is stronger than needed.
</details>

<details><summary>6. A user keeps a tab open across a deploy and clicks a lazy route; it fails. What do you do?</summary>

It is version skew: old JS requests a chunk that was deleted. Retain previous assets for a window, listen for `vite:preloadError` (or the bundler's equivalent), call `preventDefault`, and prompt the user to reload (auto-reload only if no unsaved work, with a loop guard). Ensure HTML is `no-cache`. Optionally poll a version file for a banner. Keep APIs backward compatible.
</details>

<details><summary>7. Name the four flag types and how long each should live.</summary>

Release (short, delete at 100%), ops/kill-switch (long-lived), experiment (until the decision), permission/entitlement (long-lived, enforced server-side). Mixing them causes confusion and leftover debt, so tag type, owner and expiry.
</details>

<details><summary>8. What do you test at each layer of the testing trophy, and what CI gates do you add?</summary>

Static: types, lint, boundaries. Unit: pure logic. Integration (Testing Library + MSW): features as users use them, with the network mocked. E2E: a few critical journeys against a preview deploy. Visual regression for design-system components. Gates: typecheck, lint, tests, bundle-size budget, Lighthouse/Web Vitals trend, axe checks, and contract validation between frontend and API.
</details>

---

## My notes (write from memory after reading)

- 
- 
- 

**One thing I'd have got wrong before reading this:**

---

## Sources / read more

Fetched live while writing this note. Not fetched: nx.dev docs (Nx statements above are from general knowledge, not a cited page). FE10 and FE11 notes were not present yet, so they are referenced by name, not link.

| Source | What to read | Where / time |
|---|---|---|
| [Martin Fowler: Micro Frontends](https://martinfowler.com/articles/micro-frontends.html) | "Benefits", "Integration approaches" (all five), "Shared component libraries", "Cross-application communication", "Testing", "Downsides" (payload size, environment differences, operational and governance complexity) | ~40 min |
| [webpack: Module Federation](https://webpack.js.org/concepts/module-federation/) | "Motivation", "Low-level concepts", "Share scopes" (which copy wins), "Use cases", "Dynamic Remote Containers", "Troubleshooting" (eager consumption, uniqueName) | ~30 min |
| [web.dev: Prevent unnecessary network requests with the HTTP Cache](https://web.dev/articles/http-cache) | "Long-lived caching for versioned URLs", "Server revalidation for unversioned URLs", "Summary" | ~15 min |
| [Vite: Building for Production](https://vite.dev/guide/build.html) | "Load Error Handling" (`vite:preloadError`, no-cache HTML), "Chunking Strategy" | ~10 min |
| [OpenFeature: Introduction](https://openfeature.dev/docs/reference/intro) | "What are feature flags?", "What is OpenFeature?" (Evaluation API, Evaluation Context, Providers, Hooks, Events) | ~15 min |
| [Kent C. Dodds: The Testing Trophy and Testing Classifications](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) | trophy layers, unit vs integration definitions, "Conclusion" (confidence vs time) | ~15 min |
| [Turborepo: Introduction](https://turborepo.com/docs) | "The monorepo problem", "The monorepo solution" (remote cache, task scheduling) | ~10 min |
| [MSW: Introduction](https://mswjs.io/docs/) | "Features" (Agnostic, Seamless, Reusable), then the Quick start | ~20 min |
| [FE5 Performance](FE5-Performance.md) | Part 2 (split boundaries), Part 4 (caching headers), Part 5 (RUM vs lab) | ~15 min |

**Connects to:** FE2 Rendering Strategies · FE3 State + Data Model · FE4 Network Layer · FE5 Performance · FE7 Accessibility + i18n · FE8 Frontend Security · FE10 Design System · FE11 Observability · [I2 Timeouts/Retries/Backoff](../../../SystemDesign/Notes/HLD/I-Reliability/I2-Timeouts-Retries-Backoff.md)
