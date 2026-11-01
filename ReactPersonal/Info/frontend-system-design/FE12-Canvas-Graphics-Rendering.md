# FE12 · Canvas and graphics rendering: how an editor draws 10,000 things at 60fps

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** DrawBoard / Collaborative editor / drawing tool (FE Tier 1 / HLD #12), Figma-style design tool (FE Tier 1), Data table / Google Sheets (FE Tier 2), Maps (FE Tier 2)

---

## Why this topic matters

In a "design Figma / a whiteboard" round the interviewer is not testing whether you know `ctx.fillRect`. They are testing whether you know that **React's render model is the wrong tool for a per-pointermove, thousands-of-objects surface**, and what you do instead.

| Area | Interview risk |
|---|---|
| Rendering surface | picking DOM/SVG because it is familiar, then dying at ~thousands of nodes |
| Scene model | mixing document state, view state and ephemeral state in one store |
| Viewport math | zoom that drifts away from the cursor, blurry HiDPI canvas |
| Render loop | re-rendering the whole scene (or React tree) on every pointermove |
| Hit-testing | O(n) scan per pointermove; no tolerance margin; wrong z-order |
| Input | lost points on fast strokes, no pointer capture, jittery freehand |
| Undo/collab | undo that rewinds others' work; 200 undo steps per stroke |
| Accessibility | "canvas is a black box" with no fallback |

**Interview line:** "I'll treat the canvas as a *view* over a data model. The document lives in the store (Yjs for DrawBoard), the viewport and selection are local view state, and the in-progress stroke is ephemeral. The canvas redraws from those three on a requestAnimationFrame schedule; React owns the chrome, not the pixels."

---

## Part 1: choosing the rendering surface

| Surface | Retained model? | Practical scale | Hit-testing | A11y / text | Export |
|---|---|---|---|---|---|
| **DOM** (divs, CSS transforms) | yes (the DOM) | hundreds of elements | free (browser) | best: real text, focus, ARIA | `html-to-image`-style hacks; print |
| **SVG** | yes (one node per shape) | low thousands, fewer if they change often | free (events per element) | good: DOM nodes, labels, CSS | native SVG file, trivial |
| **Canvas 2D** | **no** (pixels only) | tens of thousands of simple shapes if you cull and cache | **you build it** | poor: needs a DOM fallback; text is drawn pixels | `toBlob` PNG; SVG needs a second renderer |
| **WebGL / WebGPU** | no | 100k+ (GPU batching) | you build it (picking buffer or CPU index) | poorest; text is a hard problem (SDF atlases) | `toBlob` / readPixels |

The Konva docs summarise the first two cleanly: SVG "keeps each shape as a DOM element" and works well for diagrams with a small number of shapes; Canvas "draws pixels into one bitmap" and "the browser does not keep the drawn shapes", which "often works better for scenes with many shapes or frequent redraws". They also say: "Measure the real scene on the devices that your users have."

### When each wins

- **DOM:** forms, cards, a Kanban board, sticky notes if you expect only dozens and want rich text editing.
- **SVG:** a flowchart or org chart with under ~1-2k nodes, where per-element CSS, hover and accessibility matter more than raw speed.
- **Canvas 2D:** whiteboards, charts, a sheet grid (only visible cells are drawn), minimap. This is the default for DrawBoard-class apps.
- **WebGL/WebGPU:** Figma-scale vector scenes, maps with millions of features, heavy filters/blur/blend modes. You pay in engineering: shader pipeline, your own text, your own AA. Say it only if the scale demands it.

### The hybrid answer (what real editors do)

Canvas for the scene; **DOM overlays for text editing, toolbars, context menus, comments**. A text element is drawn on canvas while idle; double-click mounts a `<textarea>` positioned using the viewport matrix; on blur it commits and the canvas draws it again. Konva's own guidance is the same: keep essential controls and content in HTML.

**Interview line:** "For a whiteboard I'd pick Canvas 2D through a retained-mode library (Konva), because SVG's one-node-per-shape cost shows up past a few thousand shapes with frequent changes. I'd keep text editing and toolbars in the DOM. I'd only go WebGL if profiling shows Canvas 2D can't hold the target scene size."

---

## Part 2: the scene model: document vs view vs ephemeral state

Elements are **data first**, pixels second. A renderer should be a pure function of `(document, viewport, selection, ephemeral)`.

```ts
type ElementBase = {
  id: string;                          // stable, globally unique (survives sync, undo)
  type: 'rect' | 'ellipse' | 'line' | 'text' | 'sticky' | 'freehand';
  x: number; y: number;                // world coordinates
  rotation: number;
  width: number; height: number;
  z: string;                           // fractional index, NOT an array position (see below)
  style: { stroke: string; fill: string; strokeWidth: number };
};
type Freehand = ElementBase & { type: 'freehand'; points: number[] }; // flat [x0,y0,x1,y1,...]
```

### Three kinds of state (extends FE3)

| Kind | Examples | Lives in | Persisted? | Synced? |
|---|---|---|---|---|
| **Document** | shapes, their props, z-order | Yjs `Y.Doc` (DrawBoard) | yes | yes, must converge |
| **View** (per user) | viewport (pan/zoom), selection, active tool, open panels | Zustand / component state | no (maybe localStorage) | no, or only selection via awareness |
| **Ephemeral** | in-progress stroke, rubber-band marquee, hover, remote cursors | refs / awareness | no | lossy, via awareness if shared |

The DrawBoard decision log already says this: "`Y.Doc` is the only source of truth for board content. Zustand holds only local UI state ... never a second copy of the shapes." This note adds: the **canvas itself is a fourth thing, a cache of pixels**, never a source of truth.

### Flat map vs scene graph

| | Flat map `id -> element` + z-order | Tree (scene graph: groups/frames) |
|---|---|---|
| Sync (CRDT) | easy: one `Y.Map` per element, one key per property (D10) | harder: moving a subtree = reparenting, concurrent reparent can create cycles |
| Transform | each element carries absolute transform | child transforms compose parent matrices (cheap move of a group) |
| Z-order | fractional index string or `Y.Array` of ids | implicit from child order |
| Fit | whiteboard, sticky notes, simple shapes | Figma-style frames, components, auto-layout |

DrawBoard's PRD explicitly puts grouping/layers panel out of scope, so a **flat map** fits. If asked "what changes for Figma?": introduce `parentId` + a computed world transform, and guard against cycles on concurrent reparenting.

**Z-order trap:** an array index is a terrible z-order in a collaborative doc (concurrent inserts collide). Use a fractional index (a string that sorts between neighbours) stored as a normal property, or a `Y.Array` of ids as DrawBoard's HLD leaves open.

**Interview line:** "Elements are flat records keyed by id; z-order is a sortable fractional index. Selection and viewport are per-user view state and never go in the document; otherwise my undo would undo someone's pan."

---

## Part 3: viewport math: pan, zoom, coordinates, HiDPI

Everything is **world coordinates** in the document; the viewport maps world to screen.

```ts
type Viewport = { x: number; y: number; scale: number }; // x,y = screen offset of world origin

const worldToScreen = (v: Viewport, p: {x:number;y:number}) =>
  ({ x: p.x * v.scale + v.x, y: p.y * v.scale + v.y });

const screenToWorld = (v: Viewport, p: {x:number;y:number}) =>
  ({ x: (p.x - v.x) / v.scale, y: (p.y - v.y) / v.scale });
```

Rule: **hit-test, snap and store in world coordinates; only convert at the edges** (pointer in, pixels out). Never store screen coordinates in the document.

### Zoom around the cursor

Keep the world point under the cursor fixed while the scale changes.

```ts
function zoomAt(v: Viewport, cursor: {x:number;y:number}, factor: number): Viewport {
  const next = Math.min(Math.max(v.scale * factor, 0.05), 32);   // clamp
  const world = screenToWorld(v, cursor);                         // point under cursor BEFORE
  return { scale: next, x: cursor.x - world.x * next, y: cursor.y - world.y * next };
}
// wheel with ctrlKey = trackpad pinch on most browsers; plain wheel = pan
```

The bug people write: scale about the origin or the canvas centre, so content slides away from the cursor. The fix is the two lines above: compute the world point first, then solve for the new offset.

### devicePixelRatio and resize

MDN's `devicePixelRatio` is "the ratio of the resolution in physical pixels to the resolution in CSS pixels". A canvas drawn at CSS size looks blurry on HiDPI, so you size the backing store up and the CSS size down. MDN's "Optimizing canvas" gives the recipe:

```ts
function fitCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const dpr = window.devicePixelRatio;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);     // backing store (physical px)
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);          // draw in CSS px (setTransform, not scale: idempotent)
}
```

Gotchas:
- Use **`ResizeObserver`** on the container, not only `window.resize`; setting `canvas.width` clears the canvas, so redraw immediately after.
- `devicePixelRatio` **changes** when the user zooms the page or drags the window to another monitor. MDN shows watching it with `matchMedia('(resolution: Xdppx)')` and re-creating the query each time.
- Pinch-zoom of the page does *not* change `devicePixelRatio` per MDN; browser page zoom does.
- Memory: the backing store is `cssW * dpr * cssH * dpr * 4` bytes per canvas. Konva's docs put a 1920x1080 retina layer at roughly 33 MB (scene) + 8 MB (hit canvas) and note a mobile Safari ceiling reported as 256 to 384 MB. More canvases is not free (Part 4).

**Interview line:** "Pan/zoom is one affine transform. I store world coordinates, convert pointer positions with the inverse matrix, and zoom by fixing the world point under the cursor. On HiDPI I size the backing store by devicePixelRatio and set the context transform once."

---

## Part 4: the rendering loop and performance

### React vs the imperative canvas

Per-pointermove React state updates at 120Hz re-run reconciliation for nothing the user can see. The pattern:

```text
pointermove ──► mutate refs / local draft (no setState)
                  └─ markDirty()  ──► rAF callback (once per frame) ──► draw()
Y.Doc change ──► Yjs observer ──► markDirty()
React state  ──► only toolbars, panels, selection UI that is DOM
```

```ts
let dirty = false;
function markDirty() {
  if (dirty) return;
  dirty = true;
  requestAnimationFrame(() => { dirty = false; draw(); });   // coalesce N events into 1 frame
}
```

MDN's list for animation: use `requestAnimationFrame()` instead of `setInterval()`. **Draw on demand, not on a permanent loop**: an idle whiteboard should use zero CPU.

With `react-konva` (DrawBoard's choice, D7) the same rule applies: React declares the shapes, but **drag and in-progress strokes should mutate Konva nodes directly** (and call `layer.batchDraw()`), committing to the `Y.Doc` once at the end. Re-rendering 500 `<Rect>` elements per pointermove is the classic trap.

### Layers: static vs active

MDN: "some objects need to move or change frequently, while others remain relatively static ... layer your items using multiple `<canvas>` elements". Konva makes the same split and adds the cost model:

| Layer | Content | Redraw when |
|---|---|---|
| Background | grid / dots (or plain CSS background, MDN suggests that for static backgrounds) | viewport changes |
| Static scene | all committed shapes | document or viewport changes |
| Active / drag | the shape(s) being moved, in-progress stroke, selection handles, marquee | every frame during a gesture |
| Overlay | remote cursors, draft strokes from awareness | awareness updates |

Konva's tips worth quoting in an interview: while dragging, a layer "must be redrawn per cycle of the move event listener", so **move the dragged shape to a dedicated layer** during drag and put it back at drag end; and "each layer has an incremental performance overhead so we should keep the number of layers to a minimum" (Konva warns above five). Set `layer.listening(false)` for layers that need no events.

### Dirty flags, dirty rects, caching

- **Dirty flag:** redraw only if something changed (above). Cheap and always worth it.
- **Dirty rects:** redraw only the changed region (clip, clear, redraw intersecting elements). MDN: "Render screen differences only, not the whole new state." Complexity is high (overlapping shapes, strokes with width); layers usually give you 90% of the win.
- **Cache complex shapes to a bitmap** (Konva `node.cache()`, or draw once to an `OffscreenCanvas` and `drawImage`). MDN: "Pre-render similar primitives or repeating objects on an offscreen canvas". Cache count against the memory budget; clear on offscreen (`clearCache()`).
- **Don't scale images inside `drawImage`**: cache the sizes you need (MDN).
- **Batch draw calls**: "draw a polyline instead of multiple separate lines" and avoid needless context state changes (MDN). A freehand stroke is one `beginPath` + many `lineTo` + one `stroke`.
- **Avoid `shadowBlur` and text where possible** (MDN). For whiteboards: use cached text bitmaps and skip shadows on the hot path.

### Viewport culling

Konva "draws every node on a layer whether or not it lands inside the stage". For a large board: compute the visible world rect, and skip (or `visible(false)`) what falls outside. Konva's note: do it **when the view changes (after pan/zoom), not every frame**, and "for tens of thousands of nodes keep your own index of positions" instead of calling `getClientRect()` per node. That index is Part 5's R-tree.

```ts
const viewRect = (v: Viewport, w: number, h: number) =>
  ({ minX: -v.x / v.scale, minY: -v.y / v.scale, maxX: (w - v.x) / v.scale, maxY: (h - v.y) / v.scale });
const visible = tree.search(viewRect(viewport, cssW, cssH));   // draw only these
```

Also **level of detail**: below ~10% zoom, skip text and draw simplified shapes; Konva's "one shape instead of many" note is the extreme version (one `sceneFunc` drawing a thousand things, losing per-item events).

### OffscreenCanvas + Web Workers  ⏭ *Skip for interviews*

MDN: OffscreenCanvas "decouples the DOM and the Canvas API" so rendering "can also be run inside a worker". `canvas.transferControlToOffscreen()` hands the surface to a worker, which can even run its own `requestAnimationFrame`.

```ts
const off = canvas.transferControlToOffscreen();
worker.postMessage({ canvas: off }, [off]);   // transferable, not copied
// worker: const ctx = e.data.canvas.getContext('2d'); render(ctx) on messages
```

Trade-offs: the main thread stays free for input and React, but you must **ship scene data to the worker** (structured clone cost, or `SharedArrayBuffer` with cross-origin isolation), DOM measurement APIs (fonts, text layout) are limited, and Konva/react-konva are not designed for it. Realistic uses: heavy export/rasterisation, thumbnails for the board list, big image filters. Do not move the primary DrawBoard canvas to a worker unless profiling shows main-thread jank.

**Interview line:** "Layers by change frequency, dirty-flag rAF, cache expensive shapes, cull with a spatial index, and keep React out of the pointermove path. Workers are for export and thumbnails, not the first thing I'd reach for."

---

## Part 5: hit-testing and selection

Canvas has no DOM events per shape, so **you decide what is under the pointer**.

| Technique | How | Pros | Cons |
|---|---|---|---|
| Bounding-box scan | loop all elements, test AABB then precise test | trivial | O(n) per pointermove |
| **Spatial index (R-tree / quadtree)** | query a tiny box around the pointer | fast at 10k+ elements; reused for culling and marquee | must update on every move/resize |
| **Colour-picking hit canvas** | draw each shape in a unique colour on a hidden canvas; read the pixel under the pointer | pixel-accurate for any shape; this is Konva's approach | extra canvas memory (hit canvas is always ratio 1 per Konva), redraw cost, no multi-hit |
| Geometric tests | point-in-rect, distance-to-segment/polyline | exact, no pixels | code per shape type |

### rbush in practice

rbush's README: "a high-performance JavaScript library for 2D spatial indexing of points and rectangles ... based on an optimized R-tree with bulk insertion support." Items are `{minX, minY, maxX, maxY, ...}`; `insert`, `remove` (by reference unless you pass an `equals` fn), `load` for bulk, `search(bbox)`, `collides(bbox)`. The README notes bulk insertion is "usually ~2-3 times faster than inserting items one by one" and that the default node size 9 is "a reasonable choice for most applications".

```ts
import RBush from 'rbush';
type Entry = { minX: number; minY: number; maxX: number; maxY: number; id: string };
const tree = new RBush<Entry>();
tree.load(elements.map(toEntry));                        // initial load, bulk
// on remote/local change: tree.remove(old, (a,b) => a.id === b.id); tree.insert(next);

const TOL = 6 / viewport.scale;                          // tolerance in WORLD units (D9)
const p = screenToWorld(viewport, pointer);
const candidates = tree.search({ minX: p.x - TOL, minY: p.y - TOL, maxX: p.x + TOL, maxY: p.y + TOL });
const hit = candidates.sort(byZDescending).find(e => preciseHit(elements[e.id], p, TOL));
```

Notes: (1) the R-tree only returns **candidates**; follow with a precise test (rotated rect, ellipse, distance to polyline). (2) sort by z so the **topmost** hit wins. (3) **tolerance divided by scale**, so a 6px margin stays 6px on screen at any zoom, which is exactly DrawBoard's D9 ("hit areas get an even tolerance margin in all directions"). (4) In DrawBoard the index is rebuilt incrementally from Yjs observer events, never a second source of truth: it is a derived cache.

### Selection UI

- **Handles:** resize handles (corners = both dimensions, edge midpoints = one, per D9) and a rotate handle live on the **active layer** as view state, drawn at constant *screen* size (divide by scale).
- **Priority at pointer-down:** handle, then selected shape body, then any shape (topmost), then empty canvas (start new shape or marquee). That ordering is the whole interaction state machine.
- **Marquee / multi-select:** rubber-band rectangle drawn on the active layer; on pointer-up `tree.search(marqueeBox)`, then optionally precise-test (touching vs fully-contained is a product choice). Shift-click toggles.
- **Rotated shapes:** hit-test by transforming the pointer into the shape's local space (inverse of its matrix) and testing the unrotated box.
- During a Konva drag, hit detection is skipped by default (Konva's `hitOnDragEnabled` is `false`), which keeps drags cheap; turn it on only if you need drop targets.

**Interview line:** "Hit-testing is a two-phase query: spatial index for candidates, geometry for the precise answer, topmost wins, with a tolerance in world units divided by zoom. The same index serves culling and marquee select."

---

## Part 6: input

### Pointer Events

Use **Pointer Events**, not mouse + touch separately: one model for mouse, pen and touch.

- **`setPointerCapture(pointerId)`**: MDN: "Subsequent events for the pointer will be targeted at the capture element until capture is released ... or the `pointerup` event is fired." Without it, a fast drag that leaves the canvas loses the stroke. Call on `pointerdown`. It throws `NotFoundError` if the pointer id is not active.
- **`touch-action: none`** on the canvas, or the browser will claim touch pans/zooms (MDN's examples set it).
- **`getCoalescedEvents()`**: MDN: browsers coalesce many moves into one `pointermove`, which "reduces granularity", and "un-coalesced position changes are desirable in drawing applications ... to build smoother curves". Note the page is marked **limited availability** (not Baseline) and secure-context only, so feature-detect and fall back to the single event.
- **`pressure`, `tiltX/Y`, `pointerType`** are on `PointerEvent`; use pressure for variable-width ink, and `pointerType === 'pen'` to separate palm touches.
- Handle **`pointercancel`** (browser took over, e.g. a system gesture) as an aborted gesture: discard the draft, do not commit.

```ts
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); draft = begin(e); });
canvas.addEventListener('pointermove', e => {
  if (!draft) return;
  const evs = e.getCoalescedEvents?.() ?? [e];           // feature-detect
  for (const ev of evs) draft.points.push(...screenToWorld(viewport, { x: ev.offsetX, y: ev.offsetY }), ev.pressure);
  markDirty();                                           // no setState
});
canvas.addEventListener('pointerup', e => { commit(draft); draft = null; });   // ONE write to the Y.Doc
canvas.addEventListener('pointercancel', () => { draft = null; markDirty(); });
```

### Freehand smoothing and simplification

Raw points are noisy and heavy to store/sync. Two separate jobs:
1. **Smoothing (render):** draw quadratic curves through midpoints of consecutive points, or use a stroke library (e.g. `perfect-freehand`) that turns points + pressure into an outline polygon.
2. **Simplification (store):** run Ramer-Douglas-Peucker (or drop points closer than epsilon) **on pointer-up**, with epsilon divided by scale, before writing to the `Y.Doc`. Cuts a 2,000-point stroke to ~100 and shrinks CRDT updates, awareness traffic and save size.

DrawBoard's open item "how freehand points are stored inside a shape (plain array value vs `Y.Array`)" resolves here: a **flat number array as one immutable property** is right, because a stroke is sealed on pointer-up (D8) and never edited point-by-point; a `Y.Array` would add per-point CRDT metadata for no benefit.

### Gestures, wheel, keyboard

- **Pinch:** MDN's pattern: cache active pointers by `pointerId`; with two down, compute `Math.hypot` distance and compare to the previous distance (greater = zoom in). Feed the ratio to `zoomAt` around the midpoint. When a second finger lands, **cancel the in-progress stroke** so a pinch does not draw a line.
- **Trackpad pinch** arrives as `wheel` with `ctrlKey: true`; plain wheel pans. `preventDefault` needs a non-passive listener.
- **Space+drag** pan (PRD), middle-mouse pan, scroll pan: all just mutate the viewport.
- **Keyboard shortcuts:** one `keydown` handler on the document that ignores events when focus is in an input/textarea; tool keys (V, R, O, P), Delete, arrows to nudge (shift = 10x), Ctrl/Cmd+Z, +/- zoom, `0` reset (PRD "fit to content"), Escape cancels the gesture.

**Interview line:** "Pointer events with capture so strokes survive leaving the canvas, coalesced events so fast strokes aren't polygons, simplify at pointer-up so I store 100 points, not 2,000, and one write to the document per gesture."

---

## Part 7: undo/redo, collaboration and export

### Command pattern vs Y.UndoManager

| | Command stack (do/undo pairs) | `Y.UndoManager` |
|---|---|---|
| Model | each action stores its inverse | records the *changes* made by tracked origins on tracked types |
| Collaboration | undo may clobber others' later edits unless you build conflict checks | tracks **only your own** changes; undo = new reversing change that syncs like any edit |
| Cost | write inverse for every tool | free once your edits go through `doc.transact(fn, origin)` |
| Fit | solo editors | DrawBoard (D13) |

DrawBoard already replaced the custom long-list design (S3) with `Y.UndoManager`. The part the canvas owns is **gesture grouping**:

```ts
const um = new Y.UndoManager(yShapes, { trackedOrigins: new Set([LOCAL]), captureTimeout: 0 }); // no time-merging
function commitGesture(fn: () => void) {
  doc.transact(fn, LOCAL);   // everything inside = one change set
  um.stopCapturing();        // seal: next change starts a new undo step
}
// pointerup of a stroke / drag / resize -> commitGesture(() => { yShapes.set(id, shapeMap) })
```

Why this works: a stroke is written **once** on pointer-up (D8/D11), so it is naturally one step. A **drag** is the risky one: if you write x/y to the `Y.Map` on every pointermove so peers see motion, those are many updates; wrap them in the same origin and call `stopCapturing()` on pointer-up so undo reverts the whole drag. (Whether to stream drag positions to peers or only the final position is not decided in the DrawBoard docs; it is a latency vs traffic trade-off to prototype.) Also remember the log's known edge: undoing "create" removes a shape even if someone else edited it afterwards.

### Awareness: cursors and draft strokes

Per D11, the in-progress stroke is broadcast through **awareness**, not the document.

```ts
awareness.setLocalStateField('cursor', { x: worldX, y: worldY });          // throttle to ~30-60Hz, world coords
awareness.setLocalStateField('draft', { id, points: simplifiedSoFar });    // cleared on pointer-up
awareness.on('change', () => markDirty());                                  // overlay layer redraws; no React setState per message
```

Send **world coordinates** (each peer has a different viewport). Throttle cursors; send draft points incrementally or simplified. Remote cursors and drafts render on the overlay layer with the author's colour; if the drawer disconnects mid-stroke, the awareness state expires and the preview vanishes (D11).

### Export PNG / SVG

- **PNG:** `canvas.toBlob()` (async) of the **content bounds**, not the viewport: compute the union bbox of all elements, render to an offscreen canvas at the chosen scale, exclude handles/cursors/grid. With Konva: `stage.toBlob({ pixelRatio })`. Beware tainted canvases from cross-origin images (needs CORS).
- **SVG:** canvas cannot export vectors; you need a second renderer that walks the same element data and emits SVG. This is a clean argument for "elements as data": export is just another view of the document. PRD scope is PNG only.
- Large boards: do it off the hot path (idle callback, or the worker/OffscreenCanvas from Part 4, which has `convertToBlob()`).

---

## Part 8: accessibility for canvas apps (brief)

A canvas is one opaque bitmap to assistive tech. Full treatment in [FE7](./FE7-Accessibility-i18n.md); the canvas-specific rules:

- Keep **controls in the DOM**: toolbar as real buttons with labels and focus rings (PRD accessibility pass), share dialog, colour pickers. Konva's docs say the same: "Konva does not create accessible DOM elements for canvas shapes."
- **Keyboard tools:** Tab to the canvas, arrow keys to nudge the selection, a shortcut to cycle selection through elements in z/spatial order, Enter to edit text, Escape to cancel, shortcuts discoverable (`aria-keyshortcuts`).
- **DOM mirror / fallback:** a visually hidden list of elements (`role="list"`, one item per shape with type + position/label) plus an `aria-live` region announcing "rectangle selected", "3 shapes deleted". Cheap for hundreds of shapes; virtualise or summarise beyond that.
- Don't rely on colour alone for selection or "connected" (PRD).

**Interview line:** "I'd be honest that a canvas whiteboard is inherently less accessible than DOM; I'd keep every control in HTML, add keyboard tooling and a live-region announcer, and state that a full screen-reader drawing experience is out of scope."

---

## Part 9: worked mini-example through RADIO: "Design a collaborative whiteboard frontend (DrawBoard)"

Uses the project's actual decisions (D1 to D17).

**R: Requirements.** Functional: freehand/rect/ellipse/line/text/sticky; select, move, resize, delete; per-user undo/redo; infinite pan/zoom; live cursors and draft strokes; export PNG; viewers read-only. Non-functional: smooth with 100+ elements (PRD), instant local edits, convergence under concurrent edits, reconnect after brief drops, basic keyboard access. Out of scope: bezier editing, grouping, history, offline-long.

**A: Architecture.**

```text
React shell (toolbar, panels, share dialog)  ── Zustand: tool, selection, viewport
        │                                          ▲
        ▼                                          │ derived
 Konva Stage (react-konva)                    rbush index (derived cache)
  ├─ Background layer (listening:false)            ▲
  ├─ Scene layer  ◄──── render from ───────  Y.Doc (source of truth)
  ├─ Active layer (drag, handles, marquee)         │ y-websocket / Hocuspocus provider
  └─ Overlay layer (remote cursors + draft strokes ◄── Awareness)
```

**D: Data model.** `Y.Map` of shapes; each shape a nested `Y.Map`, one key per property (D10), so colour and move by two users both survive. Freehand `points` is a flat array property, sealed on pointer-up. Z-order via fractional index or `Y.Array` (open item). Viewport/selection in Zustand, never in the doc.

**I: Interface/interaction (the interesting part).**
1. `pointerdown`: capture pointer; hit-test via rbush with world tolerance (D9): handle / shape / empty.
2. Empty canvas = new shape (D8). Points accumulate in a ref; the active layer redraws via rAF; awareness broadcasts the draft (D11).
3. `pointerup`: simplify, `doc.transact(..., LOCAL)`, `um.stopCapturing()`: one write, one undo step (D13).
4. Remote update: Yjs observer updates the rbush entry and `markDirty()`; only the scene layer redraws.
5. Viewers: tool state forced to "pan/select-only"; UI is a convenience, Room Service drops their updates (HLD).
6. Reconnect: show "disconnected" banner; Yjs merges the missed edits (D15).

**O: Optimisations.** Layers by change frequency; drag on its own layer; `listening(false)` on background/overlay; cache text/sticky bitmaps; cull with `tree.search(viewRect)`; throttle awareness; coalesced events; `perfectDrawEnabled(false)` on shapes with fill+stroke+opacity (Konva tip); keep layer count at 3 to 4 because each layer allocates scene + hit canvases.

**Trade-offs to say out loud:** Konva instead of tldraw (D7) trades free selection/undo for learning value; draft strokes via awareness trade "stroke is not durable until pointer-up" for fewer CRDT updates; one writer, one Room Service instance (D5, D6) trades scale for simplicity; undo history lost on reload is accepted (D13).

**Interview line:** "The Y.Doc is the single source of truth; Konva is a projection. Pointermove never touches React or the document: it mutates a draft and schedules a frame. The document sees one transaction per gesture, which is also exactly one undo step."

---

## Part 10: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Flowchart, < ~1k nodes, needs accessibility/CSS | SVG | DOM per shape, native export |
| Whiteboard, thousands of shapes, freehand | Canvas 2D via Konva | retained model + layers + hit canvas, cheap redraw |
| Map / Figma scale / heavy filters | WebGL/WebGPU | GPU batching; accept shader and text complexity |
| Spreadsheet grid | Canvas, draw only visible cells; DOM overlay for the editing cell | cull by scroll window; text edit needs a real input |
| Zoom feels wrong | `zoomAt` fixing the world point under cursor | scale about origin drifts |
| Blurry on retina | backing store x dpr, `setTransform(dpr...)` | CSS px vs physical px |
| Janky drag | move node to a drag layer, mutate directly, `batchDraw` | avoid redrawing the whole scene per move |
| 10k+ shapes hit-testing | R-tree (rbush) candidates + precise test | O(log n) vs O(n) |
| Fast strokes look jagged | `getCoalescedEvents` + smoothing + capture | browser coalesces moves |
| Undo in collaborative board | per-user `Y.UndoManager`, one gesture = one transaction | never undo others' work |
| Exporting | content-bounds render to offscreen canvas; SVG needs separate renderer | canvas keeps no vectors |

### Common interview traps

- Choosing SVG/DOM for a whiteboard without quoting an element-count reason (or choosing WebGL "because Figma").
- Calling `setState` on every pointermove and re-rendering the React tree.
- Storing screen coordinates in the document, or making viewport/selection part of collaborative state.
- Zooming about the origin; ignoring `devicePixelRatio` changes and `ResizeObserver`.
- An always-on rAF loop that burns CPU while idle.
- Linear hit-testing with no tolerance margin and no z-order.
- Writing every stroke point into the CRDT instead of using awareness + one write on pointer-up.
- Many full-size layers (each costs a scene canvas and a hit canvas; mobile Safari can blank the canvas).
- Forgetting `pointercancel`, pointer capture, and `touch-action: none`.
- Saying "canvas isn't accessible" and stopping there, with no DOM fallback plan.

---

## Self-test (answer out loud first, then open)

<details><summary>1. When would you choose SVG over Canvas for an editor, and when does that stop working?</summary>

SVG when the scene is small (diagrams, around a thousand nodes or fewer) and you want per-shape DOM events, CSS, accessibility and trivial vector export. It degrades as node count and update frequency grow, because every shape is a DOM node the browser must style, lay out and hit-test. Canvas draws pixels into one bitmap, so cost scales with what you draw per frame, not with how many nodes exist.
</details>

<details><summary>2. What are the three kinds of state in a collaborative canvas, and where does each live in DrawBoard?</summary>

Document state (shapes, props, z-order) lives in the Yjs `Y.Doc` and must converge. View state (viewport, selection, active tool) is local, in Zustand, never synced. Ephemeral state (in-progress stroke, remote cursors, marquee) lives in refs and Yjs awareness: lossy and never saved. The canvas pixels are a cache of these, not a source of truth.
</details>

<details><summary>3. Write the zoom-around-cursor logic in words.</summary>

Compute the world point under the cursor with the current viewport (`(cursor - offset) / scale`). Apply the new clamped scale. Set the new offset so that same world point maps back to the cursor: `offset = cursor - world * newScale`. Anything else makes content slide away from the pointer.
</details>

<details><summary>4. How do you make the canvas sharp on a HiDPI screen, and what can break it later?</summary>

Set `canvas.width/height` to CSS size times `devicePixelRatio`, set CSS width/height to the CSS size, and set the context transform to the ratio. It breaks when the ratio changes (browser zoom, moving to another monitor; watch with `matchMedia` on resolution) or when the container resizes (use `ResizeObserver`; setting `width` clears the canvas, so redraw immediately).
</details>

<details><summary>5. A user drags one shape among 5,000 and the board stutters. What do you change?</summary>

Stop re-rendering through React on each pointermove; mutate the node/draft imperatively and schedule one redraw per frame. Move the dragged shape to a dedicated active layer so the static scene layer is not redrawn per move, cache expensive static shapes, set `listening(false)` on layers that do not need events, cull off-screen shapes using a spatial index, and commit to the `Y.Doc` once at drag end (or throttled).
</details>

<details><summary>6. Explain the hit-testing options and what you would use for DrawBoard.</summary>

Linear bbox scan is O(n); a spatial index like rbush returns candidates in a tiny box in logarithmic-ish time and also serves culling and marquee; a colour-picking hit canvas (Konva's built-in approach) gives pixel-accurate hits for arbitrary shapes at the cost of an extra canvas per layer. Konva handles shape-level hits out of the box, but DrawBoard builds its own selection and handle logic: rbush for candidates, precise geometry for the final hit, topmost z wins, tolerance in world units (divided by zoom) per D9.
</details>

<details><summary>7. Why does one gesture equal one undo step in DrawBoard, and how do you guarantee it?</summary>

Users expect undo to revert a whole stroke, drag or resize, not a fragment. A stroke is written once on pointer-up. For drags/resizes that write continuously, wrap writes in one transaction origin and call `UndoManager.stopCapturing()` on pointer-up so the next change starts a new step. `Y.UndoManager` tracks only the local origin's changes, so undo never reverts a collaborator's work and creates a new reversing change that syncs normally.
</details>

<details><summary>8. Why are draft strokes sent through awareness instead of the document?</summary>

A draft is not a finished shape and nobody else should edit it. Writing every point into the `Y.Doc` would create hundreds of durable CRDT updates, bloating history, saves and sync traffic. Awareness is ephemeral and lossy, shows a live preview, disappears if the author disconnects, and the finished simplified stroke is written once on pointer-up.
</details>

---

## My notes (write from memory after reading)

- 
- 
- 

**One thing I'd have got wrong before reading this:**

---

## Sources / read more

All pages below were fetched while writing this note. No WebGL/WebGPU or web.dev page was fetched, so claims about WebGL scale, text rendering and Yjs `UndoManager` options (`trackedOrigins`, `captureTimeout`, `stopCapturing`) are general knowledge to verify against the Yjs docs and a prototype (DrawBoard open item).

| Source | What to read | Where / time |
|---|---|---|
| [MDN: Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) | "Pre-render similar primitives...", "Use multiple layered canvases", "Use plain CSS for large background images", "Turn off transparency", "Scaling for high resolution displays", "More tips" | ~15 min |
| [MDN: OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) | Intro, "Asynchronous display of frames produced by an OffscreenCanvas" (`transferControlToOffscreen`, rAF in workers) | ~10 min |
| [MDN: Window.devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio) | "Correcting resolution in a canvas", "Monitoring screen resolution or zoom level changes" | ~10 min |
| [MDN: Element.setPointerCapture()](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) | Intro, Exceptions, Examples | ~5 min |
| [MDN: PointerEvent.getCoalescedEvents()](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents) | Intro paragraphs (drawing apps), Example; note the limited-availability banner | ~5 min |
| [MDN: Pinch zoom gestures](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures) | "Global state", "Pointer move" (two-pointer distance), `touch-action: none` | ~10 min |
| [Konva: All performance tips](https://konvajs.org/docs/performance/All_Performance_Tips.html) | "Layers", "Shapes", "Memory" (layer cost, mobile Safari ceiling), "Very large scenes" (culling, hit detection during drag, one shape instead of many) | ~20 min |
| [Konva: Canvas vs SVG](https://konvajs.org/docs/posts/canvas-vs-svg.html) | Whole page (comparison table, raw canvas trade-off, accessibility note) | ~5 min |
| [rbush README](https://github.com/mourner/rbush) | "Creating a Tree", "Adding Data", "Removing Data", "Data Format", "Bulk-Inserting Data", "Search", "Collisions" | ~15 min |
| DrawBoard [HLD](../../Projects/DrawBoard/HLD-DrawBoard.md) / [Decisions](../../Projects/DrawBoard/Decisions-DrawBoard.md) | HLD "Undo/redo model"; Decisions D7-D13 and "Open items" (freehand storage, undo-of-create) | ~20 min |

**Connects to:** FE1 RADIO Framework · FE3 State + Data Model (DrawBoard / collaborative editor) · FE5 Performance · FE6 Offline Storage (DrawBoard / CRDT connection) · FE7 Accessibility · [E3 Collaborative Sync](../../../SystemDesign/Notes/HLD/E-Realtime/E3-Collaborative-Sync.md) · Questions: Collaborative editor / DrawBoard (#12), Data table / Google Sheets (Tier 2)
