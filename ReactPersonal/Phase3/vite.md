# Vite ? full notes (moved from progressPhase3.md)

### 3.1 Vite

**Read:** [Vite Guide — Getting Started](https://vite.dev/guide/), [Env Variables and Modes](https://vite.dev/guide/env-and-mode) — fetched 2026-09-05 _(skimmed pass — prior familiarity)_

## What is Vite?

**Vite is a frontend build tool + development server** used to develop and build modern frontend applications such as React apps.

It mainly solves two problems:

1. **Development** → give us a fast local development environment.
2. **Production** → transform and optimize our source code into files that can be deployed to real users.

---

# Why do we need Vite?

Our React source code is not simply ready to be deployed directly to the browser.

Example:

```jsx
function App() {
  return <h1>Hello</h1>;
}
```

A real application also contains:

```text
JS / JSX
CSS
Images
npm dependencies
imports between modules
TypeScript
etc.
```

A build tool handles these things and prepares the application for the browser.

---

# Development vs Production

This is the most important Vite concept.

## Development

When we run:

```bash
npm run dev
```

Vite starts a **development server**.

Vite uses **native ES Modules (ESM)** and serves our source modules **on demand** rather than first creating one huge bundle.

Conceptually:

```text
Browser
   ↓
requests App.jsx
   ↓
Vite transforms/serves it
   ↓
Browser sees imports
   ↓
requests other modules
   ↓
Vite serves them
```

This makes development startup and updates very fast.

### HMR

Vite also provides **HMR (Hot Module Replacement)**.

When we change:

```text
Button.jsx
```

Vite can update the affected module in the running application instead of rebuilding/reloading the entire application.

```text
Change code
    ↓
Vite
    ↓
Update affected module
    ↓
Browser updates
```

**I have seen this working literally many times in my company** — changing React code and immediately seeing the UI update in the running local application is the practical experience of Vite's development server + HMR.

---

# Production

When the application is ready to deploy:

```bash
npm run build
```

Vite creates a **production build**, usually inside:

```text
dist/
```

Example:

```text
dist/
├── index.html
└── assets/
    ├── index-abc123.js
    ├── index-def456.css
    └── logo-xyz789.png
```

These are the files that can be deployed to a web server/static hosting/CDN.

## What happens during the production build?

Vite processes and optimizes our application:

```text
React source
     ↓
     Vite
     ↓
transform
optimize
tree-shake
code-split
minify
process assets
     ↓
   dist/
     ↓
deploy
```

### 1. Transform

Things such as JSX/TypeScript need to be transformed into browser-compatible JavaScript.

```jsx
<h1>Hello</h1>
```

gets transformed as part of the build process into JavaScript the browser can execute.

---

### 2. Bundling

The application may contain hundreds/thousands of modules:

```text
App
 ├── Navbar
 ├── Dashboard
 ├── API
 ├── Components
 └── ...
```

The production build analyzes these modules and creates optimized output files.

**Important:** production does NOT necessarily mean "one giant JS file."

Modern builds can produce multiple optimized chunks.

---

### 3. Code splitting

Different parts of an application can become different chunks.

For example:

```text
home.js
dashboard.js
settings.js
admin.js
```

A user doesn't necessarily need the JavaScript for every page immediately.

```text
Open Home
   ↓
download home.js

Open Admin later
   ↓
download admin.js
```

This reduces the initial amount of JavaScript the browser needs to download.

---

### 4. Tree shaking

Unused code can be removed.

```text
math.js

add()        ← used
subtract()   ← unused
multiply()   ← unused
divide()     ← unused
```

Production output can remove the unused exports.

```text
Final output

add()
```

---

### 5. Minification

Code is made smaller by removing unnecessary whitespace, shortening where possible, etc.

```text
Development:

function calculateTotal(price, quantity) {
    return price * quantity;
}
```

Production:

```text
function calculateTotal(e,t){return e*t}
```

Smaller files → less data to download.

---

### 6. Asset processing

Vite also handles assets such as:

```text
CSS
images
fonts
etc.
```

and puts the required production files into `dist/`.

---

# Why production builds use hashes

You may see:

```text
index-abc123.js
index-def456.css
logo-xyz789.png
```

The hash helps with **browser caching**.

If the application changes, the generated filename can change:

```text
index-abc123.js
        ↓
index-9f72ab.js
```

The browser recognizes it as a different file and downloads the new version.

**This is also something I have seen literally many times in company production/deployment builds** — generated asset filenames containing hashes are a normal part of frontend production output.

---

# Important commands

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Creates the optimized production build.

```bash
npm run preview
```

Locally previews the production build.

Typical flow:

```text
Development:
npm run dev
     ↓
localhost
     ↓
develop/test

Finished:
npm run build
     ↓
dist/
     ↓
deploy
```

---

# Dependency pre-bundling

Our code can contain npm imports:

```js
import React from "react";
```

The browser doesn't naturally understand npm's package resolution like:

```text
"react" → node_modules/react
```

Vite handles dependencies during development and **pre-bundles dependencies** when necessary.

This also helps packages that aren't already distributed in the form the browser's native ESM workflow expects.

---

# Final mental model

```text
                    VITE
                      │
          ┌───────────┴───────────┐
          │                       │
     DEVELOPMENT              PRODUCTION
          │                       │
    npm run dev              npm run build
          │                       │
    Dev server               Build process
          │                       │
   Native ESM               Transform
   On-demand modules        Optimize
   HMR                      Tree shake
                            Code split
                            Minify
                            Process assets
                                │
                                ▼
                              dist/
                                │
                                ▼
                             Deploy
                                │
                                ▼
                              Users
```

## One-line definition

> **Vite is a frontend build tool that provides a fast development server using native ESM + HMR, and creates an optimized production build that can be deployed to users.**

## What I actually need to remember

- Vite = **dev server + build tool**
- Development uses **native ESM / modules on demand**
- **HMR** makes development updates fast
- npm dependencies may be **pre-bundled**
- `npm run build` creates the **production build**
- Production output goes into **`dist/`**
- Production build performs things like:
  - transformation
  - bundling
  - code splitting
  - tree shaking
  - minification
  - asset processing

- Production does **not necessarily mean one giant JS bundle**
- `dist/` is what gets deployed
- Development and production have **different goals**

### What I don't need to deep-dive into yet

- Writing Vite plugins
- Vite plugin API
- Advanced `vite.config`
- Rolldown internals
- Dependency optimizer internals
- SSR
- Library mode
- Custom Vite environments
- Advanced asset configuration

---

**Additions from the live docs (not in the above — worth having):**

- **Bundler is Rolldown**, Vite's newer Rust-based bundler (not the older Rollup pipeline) — this is what actually performs the transform/tree-shake/code-split/minify steps described above.
- **Node version gotcha:** Vite requires **Node.js 20.19+ or 22.12+** — some starter templates need even newer. A real "why won't `npm create vite` even run" trap.
- **Env vars — `import.meta.env`**, not `process.env` (that's Node-only, doesn't exist in browser code). Built-in constants: `MODE`, `BASE_URL`, `PROD`, `DEV`, `SSR`.
- **The `VITE_` prefix is a security boundary, not a naming convention.** Only vars prefixed `VITE_` in a `.env` file get exposed to client-side code — everything else stays server/build-only. Docs explicitly warn: `VITE_*` values are statically inlined into the shipped bundle, so **never put an API key or secret behind one** — if it must stay secret, it belongs behind a backend call, not client code.
- `.env` file precedence: `.env` → `.env.local` (git-ignored) → `.env.[mode]` → `.env.[mode].local` (git-ignored, highest priority). Mode is separate from `NODE_ENV` — `vite build --mode staging` picks `.env.staging`.
- **Interview angle:** "If someone put a secret API key in a `VITE_`-prefixed env var, what's wrong with that?" → It's not hidden — the value is inlined directly into the shipped JS bundle at build time, visible via devtools/view-source. Secrets must stay server-side.
