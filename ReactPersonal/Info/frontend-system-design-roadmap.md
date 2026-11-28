# Frontend System Design Roadmap

> Notes: [`frontend-system-design/`](frontend-system-design/) (FE1–FE13) · Q&A for revision: [`frontend-system-design-interview.md`](frontend-system-design-interview.md) · JS/React/TS questions: [`interview-questions.md`](interview-questions.md)
> Priority: **P1** = read in full, do first · **P2** = skim the cheat sheet and self-test in the interview file · **P3** = only if a question needs it.

## How to work

- **Question days:** draw your own design first, then read the note and write down what you missed. Score yourself with the rubric at the end of the interview file. Redo anything below 12/16 once.
- **Never skip** the "attempt it yourself before reading" step. Reading alone doesn't build the skill.
- **Skip** sections marked "Skip for interviews" in the notes.
- Read A2 (request flow), C4 (HTTP/CDN caching) and E1 (WebSocket/SSE) from the SystemDesign HLD notes only if a question needs them.

## Topics

| Priority | Note | Why |
|---|---|---|
| P1 | FE1 RADIO framework + evaluation | How the round is run and graded |
| P1 | FE3 State + data model | Asked in nearly every question |
| P1 | FE4 Network layer | Pagination, cancellation, retries, realtime |
| P1 | FE5 Performance | Core Web Vitals, virtualization, code splitting |
| P1 | FE10 Component + design-system API design | Modal, dropdown, component library questions |
| P1 | FE12 Canvas + graphics rendering | DrawBoard / Figma answer |
| P1 | FE2 Rendering strategies | CSR / SSR / SSG trade-offs |
| P1 | FE7 Accessibility: combobox and dialog parts | Autocomplete, modal |
| P2 | FE11 Observability + resilience | Follow-up in every answer |
| P2 | FE13 Frontend architecture at scale | Senior / staff rounds |
| P2 | FE6 Offline + storage | Docs, email, chat |
| P2 | FE9 Media | Netflix, Zoom |
| P2 | FE8 Frontend security | Mostly covered by `security-learning-path.md` |

## Questions

**P1: do these**
- [ ] News feed
- [ ] Autocomplete
- [ ] Chat app
- [ ] Collaborative editor / drawing tool (DrawBoard)
- [ ] Component library (modal / dropdown)
- [ ] E-commerce
- [ ] Video conferencing / meeting recording (Zoom-like, your Adobe Connect edge)

End every answer with one line on how you'd monitor it (FE11) and one on what fails.

**P2: after P1**
- [ ] Image carousel
- [ ] Photo sharing (Instagram / Pinterest)
- [ ] Data table / Google Sheets
- [ ] Netflix / video streaming
- [ ] Notification / toast system
- [ ] Dashboard / admin console

**P3: only if time or the company asks**
Email client, Rich text editor, Calendar, Kanban, Travel booking, Poll widget, Multi-step form, Spotify, Maps.

## Mocks and revision

- [ ] Mock 1: timed 45 min, graded with the rubric
- [ ] Mock 2: timed 45 min, graded with the rubric
- [ ] One revision pass of the interview file before interviews

## Machine coding (ongoing)

| Priority | Questions |
|---|---|
| P1 | Autocomplete with debounce + cache, Infinite scroll / virtualized list, Data table (sort / filter / paginate), Modal, Tabs, Accordion, Nested checkboxes, File explorer (tree) |
| P1 (JS) | debounce, throttle, `Promise.all` / `allSettled` / `race`, deep clone, event emitter, `curry`, `flatten`, `memoize`, retry with backoff, LRU in JS |
| P2 | Image carousel, Star rating, Progress bars (queued), Todo with undo, Transfer list, Tic-tac-toe, Wordle, Kanban drag-drop, Form with validation |

Sources: GreatFrontEnd (free questions), bigfrontend.dev (JS utilities), Frontend Interview Handbook.

## Your edge answers

- **DrawBoard** is your answer to "design Figma / Google Docs": see `Projects/DrawBoard/` (PRD, HLD, Decisions) and FE12.
- **Zoom / meeting recording** is your Adobe Connect answer: FE9 plus the E1, E2, F1 and F2 HLD notes in SystemDesign.
- **Frontend security** is covered by [`security-learning-path.md`](security-learning-path.md) and FE8.
<details>
<summary>4 · DrawBoard — Collaborative Whiteboard (Frontend System Design · RADIO · Spoken-First Summary)</summary>

**Framework:** RADIO (FE1) · **Key Modules:** FE2 Rendering · FE3 State & CRDT Model · FE4 WebSocket Sync · FE5 60fps Canvas · FE6 Offline IndexedDB · FE7 Canvas A11y · FE11 Observability · FE12 Canvas Graphics

---

###### R · Requirements & Scope (5 min)
* **Core Functional Flows:**
  * Infinite pan/zoom canvas supporting **shapes** (rect, ellipse, arrow), **text**, **freehand pen strokes**, and **images**, plus select, move, resize, and **per-user Undo/Redo**.
  * Real-time multi-user collaboration: live cursors/selections + concurrent edits without losing work.
  * **Offline-first editing:** Continue drawing offline with changes persisted locally in **IndexedDB** and automatically merged upon reconnect.
* **Non-Functional Goals:**
  * **60fps Interaction (< 16ms frame budget):** Smooth pan/zoom/drag across 5,000–10,000 objects without React re-render stalls.
  * **Conflict-Free Convergence:** Concurrent edits to different shapes or different properties of the same shape merge automatically; same-property races converge deterministically with zero blocking conflict dialogs.
  * **WAI-ARIA Accessibility (FE7):** Keyboard-navigable toolbar + synchronized semantic DOM tree for screen readers.
* **Out of Scope (First Pass):** Complex boolean vector paths/shaders (Figma-scale WebGL), video/audio calls, version branching UI, server-side image transcoding.

**Interview Opener:** *"Since DrawBoard is an authenticated, high-frequency collaborative editor where SEO doesn't matter, I'll use CSR with a Canvas 2D renderer, split state into CRDT document vs. local view vs. ephemeral awareness, and sync offline/online edits cleanly via Yjs over WebSockets."*

---

###### A · High-Level Client Architecture (8 min)
```text
Browser / App Shell (CSR + Lazy-Loaded Editor Bundle)
  ├─ UI Chrome (React)
  │    ├─ ToolPalette & PropertyInspector (WAI-ARIA toolbar, color/stroke controls)
  │    ├─ CollaboratorPresenceBar (active user avatars + follow-user mode)
  │    └─ AccessibleObjectTree (hidden/toggleable semantic DOM mirror for screen readers)
  ├─ Viewport & Rendering Engine (Imperative — Bypassing React on pointermove)
  │    ├─ Static Scene Layer (Canvas 2D / Konva — cached shapes, culled via R-tree)
  │    ├─ Active Drag / Draft Layer (imperative mutation at 60fps; commits on pointerup)
  │    └─ Remote Cursors & Selection Overlay
  └─ Collaborative State & Sync Engine
       ├─ Local View Store (Zustand: activeTool, camera {x, y, zoom}, selectedIds)
       ├─ CRDT Document (Yjs Y.Doc + per-user Y.UndoManager) ◄──► IndexedDB Persistence
       └─ Realtime Sync Client (WebSocket: CRDT delta updates + lossy Awareness channel)
```

**Key Architecture Talking Points:**
1. **Why Canvas 2D (`Konva`) over `SVG` or `WebGL` (FE12):** SVG creates one DOM node per shape and lags past ~1,000 nodes; WebGL adds heavy custom text/shader complexity; Canvas 2D with layered rendering hits 60fps for 5k–10k shapes cleanly.
2. **Never `setState` on `pointermove`:** Pointer gestures mutate a draft ref / active Konva layer imperatively and schedule one `requestAnimationFrame` draw per frame—writing to React/CRDT only on `pointerup`.

---

###### D · Data Model & Conflict Resolution (FE3 + FE6 + FE12) (8 min)
Split state into **three distinct layers** so ephemeral cursor jitter never pollutes undo history or offline storage:

```ts
// 1. Durable Collaborative Document (Yjs Y.Doc -> persisted in IndexedDB)
// Each shape is a Y.Map so property-level edits (x vs. fill) merge independently!
type BoardShape = {
  id: string;
  type: 'rect' | 'ellipse' | 'text' | 'freehand' | 'image';
  x: number; y: number; width: number; height: number; // world coordinates (never screen px!)
  fill?: string;
  text?: string;
  points?: number[]; // simplified stroke points committed on pointerup
  imageUrl?: string;
  zIndex: string;    // fractional indexing for conflict-free layer reordering
};

// 2. Local View State (Zustand — per-user, never synced)
type ViewportState = {
  camera: { x: number; y: number; zoom: number };
  activeTool: 'select' | 'rect' | 'pen' | 'text' | 'image';
  selectedIds: Set<string>;
};

// 3. Ephemeral Awareness State (Yjs Awareness — lossy, never persisted)
type UserAwareness = {
  userId: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  draftStroke?: { points: number[]; color: string }; // live preview before pointerup
};
```

**Conflict & Undo Talking Points:**
* **Why CRDT (`Yjs`) Resolves Both Cases Cleanly:** Storing each shape as a `Y.Map` means User A changing `color` and User B changing `x` on the same shape **both succeed**. If both drag `x` at the exact same instant, Yjs applies deterministic Lamport/client-ID Last-Write-Wins so every client converges identically—even after editing offline in IndexedDB.
* **Per-User `Y.UndoManager`:** Tracks **only** the local client's transaction origin (grouping one drag/stroke gesture into one undo step) so pressing `Ctrl+Z` never undoes a teammate's work.

---

###### I · Interface Definition & Accessibility Contract (FE4 + FE7) (9 min)
* **Initial Snapshot + Asset Endpoints (REST):**
  * `GET /api/boards/:boardId/snapshot` — initial compressed CRDT state vector / snapshot + board metadata.
  * `POST /api/boards/:boardId/assets/presign` — upload image blobs directly to object storage (`S3`/CDN) and store only the `imageUrl` + dimensions inside the CRDT shape (never raw base64 blobs in WebSocket messages!).
* **Bidirectional WebSocket Protocol (Two Logical Channels):**
  * **Durable Sync (`sync.step1` / `sync.step2` / `doc.update`):** Exchanges Yjs state vectors on connect/reconnect to compute and stream **only missing binary CRDT deltas**—handling offline catch-up automatically.
  * **Ephemeral Awareness (`awareness.update`):** Throttled (~30–60ms) cursor coordinates and live draft strokes; auto-expires if a user disconnects.
* **Canvas Accessibility Contract (FE7 — Say These 3 Points):**
  * **Synchronized Semantic DOM Mirror:** Render an off-screen/toggleable semantic outline (`role="application"` or list of `<button>` / `<div role="region">` elements) synced with `Y.Doc` shapes so screen readers announce shape type, text, and position.
  * **Full Keyboard Operation:** `role="toolbar"` with arrow-key navigation for tools; `Tab` cycles shapes; `Arrow` keys nudge selected shapes in world units; `Enter` opens a real DOM `<textarea>` overlay for text editing (never fake text input on canvas).
  * **Polite Announcements:** Announce collaborator joins/leaves or offline/synced status via `aria-live="polite"`.

---

###### O · Optimizations, Failure Modes & Observability (FE5 + FE6 + FE11 + FE12) (10 min)
1. **60fps Canvas & Spatial Indexing (FE12):**
   * **Layer Separation:** Keep static shapes on a cached base layer and move actively dragged/resized shapes onto a lightweight drag layer (`batchDraw`) so dragging 1 shape doesn't re-rasterize 5,000 static shapes.
   * **R-Tree (`rbush`) Culling & Hit-Testing:** Query visible viewport bounds in $O(\log n)$ to skip drawing off-screen shapes and accelerate pointer hit-testing.
   * **HiDPI & Zoom-at-Cursor:** Scale canvas backing store by `devicePixelRatio` (`ResizeObserver` + `matchMedia` resolution listener) and anchor zoom math to the world coordinate under the cursor.
2. **Offline Resilience & Image Failures (FE6):**
   * Persist `Y.Doc` updates incrementally to **IndexedDB** (`y-indexeddb`); on reconnect, Yjs state-vector exchange syncs offline edits seamlessly with **exponential backoff + jitter**.
   * If an image asset fails to load or user is offline before upload completes, render a local `Blob` object URL optimistically and swap to the CDN URL once uploaded.
3. **Observability & Failure Modes (FE11):**
   * **Failure Modes:** WebSocket drop (non-blocking *"Offline — changes saved locally"* badge), oversized CRDT history (periodic server snapshot compaction), corrupted local IndexedDB (fallback to fresh server snapshot fetch).
   * **RUM Metrics:** Track **frame time / FPS p95 during drag/zoom**, **pointer-to-paint latency**, **CRDT sync round-trip latency**, and **WebSocket reconnect/error rate**.
</details>
