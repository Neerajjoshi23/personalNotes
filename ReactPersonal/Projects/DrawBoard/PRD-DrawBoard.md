# PRD — DrawBoard (Infinite Canvas Whiteboard)

> Standalone PRD, referenced from `progressPhase3.md`. Product spec only — no implementation steps here; how-to-build lives in your own build notes as you go.

---

## 1. Problem statement

Sketching out an idea, a system design, or a rough diagram usually means reaching for a heavyweight tool (Figma, Miro) or paper. DrawBoard is a lightweight, fast, single-purpose canvas — open it and start drawing immediately. It grows from a solo scratchpad into a real product: users log in, their boards are saved under their account, and a board is private to its owner unless the owner shares it with specific users as a **viewer** or **editor**.

## 2. Target user

Anyone who wants to quickly sketch a diagram, brainstorm visually, or explain an idea on a shared canvas — a developer whiteboarding a system design solo, or several people collaborating remotely and needing to draw at the same time instead of narrating over a static image, with only the people the owner has shared it with able to enter.

## 3. Architecture shape (why a backend is unavoidable here)

Three separate concerns are being asked for, and they don't collapse into one:

- **Auth** — a user has an identity, so a canvas can belong to someone.
- **Persistence** — each user's canvases are saved server-side, not just in one browser's local storage, so "log in from anywhere and see your boards" works at all.
- **Access control** — only the owner and users on a board's access list can open it, and only owners/editors can change it (viewers are read-only) — this is an authorization check the backend enforces, not something the frontend can decide on its own, since a frontend-only check is trivially bypassed.

**Stack decision:** use **Supabase for auth and board storage**, and a **Yjs-backed WebSocket service for live collaboration** (shared document sync + presence). Supabase avoids hand-rolling login, sessions and a database API; Yjs avoids hand-rolling a sync/merge engine — so the engineering effort stays on the canvas, the collaborative data model, access control and failure handling. Managed auth (not a hand-rolled login system) because password handling, sessions, and OAuth are security-sensitive enough that reimplementing them isn't where the learning value is for this project. The WebSocket service is still responsible for enforcing who may join/edit a board and for persisting the shared document — Yjs handles merging, not authorization or durable storage. Protocol and component details live in the HLD.

## 4. Build order (locked)

This is the actual sequencing decision — not just a feature list, a *staging* of what "done" means at each step:

1. **V1 — Solo canvas.** A single person can draw, edit, and export, no login required yet. No collaboration, no AI. This has to feel solid on its own before anything else is added.
2. **V1.2 — Auth + persistence.** Add login (managed auth) and move board storage from local-only to a real backend, scoped per user. This has to land *before* collaboration, because room access rules (who's on the access list, and at which role) only make sense once there's an authenticated identity to check against.
3. **V1.5 — Real-time collaboration, with per-user sharing.** The board becomes shared and live: everyone in the room sees each other's strokes/moves as they happen. A board owner shares it with specific users as viewer or editor. This is the hardest, most non-trivial layer — distributed state, conflict handling, presence (cursors), *and* access control — and it's added before polish, not after, because it changes the app's data model in ways that are painful to retrofit later.
4. **Accessibility pass.** Once the core interaction (solo + collaborative + access control) is functionally complete, make it usable via keyboard and screen reader, not just mouse/trackpad.
5. **Unit tests.** Lock in behavior for the canvas logic (element CRUD, undo/redo, sync reconciliation, access-control checks) so the next changes don't silently break it.
6. **Deploy.** Ship it somewhere real (Vercel + your backend-as-a-service project), with login, saved boards, and multi-person collaboration actually reachable over the internet, not just two tabs on localhost.
7. **V2 — AI features (coming soon).** Added last, on top of a working, tested, deployed product.

## 4. V1 — Solo canvas: core user stories

- As a user, I want to **draw freehand and add shapes/text**, so I can express an idea visually, not just in words.
- As a user, I want to **move, resize, and delete** anything I've placed, so mistakes and iteration are cheap.
- As a user, I want **undo/redo**, so I can experiment without fear.
- As a user, I want to **pan and zoom** an effectively infinite canvas, so I'm never boxed in by screen size.
- As a user, I want to **export my board** (image), so the work leaves the app.
- As a user, I want the canvas to **stay smooth** even with a lot of elements on it, so it doesn't feel laggy mid-thought.
- As a user, I want a **refresh to not lose my board**, so a stray reload isn't catastrophic.

### V1 feature set
- Freehand draw, rectangle, ellipse, line/arrow, text, sticky note tools
- Select / move / resize / delete any element
- Undo/redo (multi-step, not just one level back)
- Pan (space+drag or scroll) and zoom (scroll/pinch), with a "reset view" / "fit to content" action
- Export board as PNG
- Local persistence (`localStorage` or IndexedDB autosave) — a stopgap until V1.2 moves this server-side

### V1 success criteria
- Drawing, moving, and resizing elements feels instant with zero visible lag, even with 100+ elements on the board.
- Undo/redo never leaves the canvas in a corrupted/inconsistent state.
- Refreshing the page never loses the current board.
- A first-time user understands what to do within 5 seconds of opening it — no onboarding needed.

## 5. V1.2 — Auth + persistence

### Why this comes before collaboration
Who may open or edit a board is an access-control decision, and access control requires knowing *who's asking*. Bolting auth onto an already-built collaboration feature means retrofitting permission checks into a data/sync model that was never designed with an "owner" concept — worse, it risks leaving privacy gaps where a board was reachable before checks existed. Landing identity and storage first means the collaboration layer is built correctly from day one.

### User stories
- As a user, I want to **log in**, so my boards are mine and follow me across devices/sessions.
- As a user, I want my **boards saved to my account**, so I can come back later and find them, not just whatever's cached in one browser.
- As a user, I want to see a **list of my own boards** when I log in, so I can pick up old work or start a new board.

### Feature set
- Managed auth (e.g. Supabase Auth / Clerk) — signup, login, logout, session persistence
- A "my boards" list view per logged-in user
- Board data persisted server-side (backend-as-a-service database), replacing the V1 local-only storage, keyed to the owning user

### Success criteria
- Logging in on a different browser/device shows the same saved boards — proof persistence is real, not local-storage in disguise.
- A logged-out visitor cannot see any user's board list or boards.

## 6. V1.5 — Real-time collaboration, with per-user sharing

### Why this comes before polish, not after
A solo canvas and a collaborative canvas are not the same app with a feature added — they're different data models. Solo state is "whatever's in this browser tab." Collaborative state has to answer: whose stroke wins if two people draw over the same spot at the same instant? What happens if one person's connection drops mid-drag? Who's even allowed in this room? Retrofitting that after accessibility/tests/deploy work is already built on top of the solo model means redoing large parts of that work. Doing it right after auth lands — before anything else — means everything built afterward (a11y, tests, deploy) is built against the *real* shape of the app.

### User stories
- As a board owner, I want to **share my board with specific users** as a **viewer** (can watch live, cannot change anything) or an **editor** (can draw and edit), so I control exactly who gets in and what they can do.
- As a board owner, I want to **change someone's role or remove their access**, so sharing isn't permanent.
- As a shared user, I want boards shared with me to **appear in my board list**, so I can open them without hunting for a link.
- As a viewer, I want to **see the board update live**, even though I can't edit it.
- As a user, I want to **see the other person's cursor and what they're drawing live**, so it feels like we're in the same room, not trading screenshots.
- As a user, I want my own drawing to **never be overwritten or lost** because the other person also drew at the same time.
- As a user, I want to **know if the other person disconnects**, so I'm not confused why the board stopped updating.

### Feature set
- Per-board **access list**: owner (implicit), plus shared users at **viewer** or **editor** role; only the owner manages the list
- Server-enforced join check — the backend, not the frontend, decides whether a user may enter a board's room (a client-side-only gate is not real access control)
- Server-enforced read-only for viewers — edits sent by a viewer are rejected by the backend, not just hidden in the UI
- The owner can change roles, remove users or delete the board **at any time**, even while people are in the room; the change takes effect within about 30 seconds (downgraded users drop to read-only, removed users are disconnected, a deleted board's room closes)
- Long sessions aren't interrupted when a login token expires; reconnecting uses the refreshed login automatically
- Live cursor presence for each connected user
- Synchronized element state: draws, moves, deletes, and undo/redo from either user propagate to the other in near-real-time
- **Late joiners see the current board:** someone joining mid-session receives the current shared board, including changes already synced by other participants but not yet persisted to the database — not just the last saved snapshot
- Graceful handling of a dropped connection (visible "disconnected" state, no silent data loss for the connected user)
- **Reconnect, not full offline editing (first release):** after a dropped connection, the client reconnects and resyncs with the shared board; edits made during a brief disconnect are merged on reconnect rather than discarded. Deliberately working offline for long periods (and making the app itself load without network) is out of scope for this release — Yjs makes it possible later, but it isn't a requirement now
- **Collaborative undo/redo:** undo/redo reverses only *your own* actions, never another participant's; one gesture (a full stroke, a drag, a resize) is one undo step; undoing never silently wipes out a newer, independent edit made by someone else. Autosave/persistence does not clear undo history. Exact concurrent-edit behavior to be verified in a Yjs prototype before LLD sign-off

### Success criteria
- A user not on a board's access list cannot open it — verified by attempting to connect directly, not just trusting the UI hides the board.
- A viewer's edits are rejected by the server — verified by sending an edit from a viewer session, not just trusting the disabled toolbar.
- A newly shared user sees the board in their list and can open it with no extra steps.
- Multiple browser sessions (or people) in the same room see each other's changes within roughly a second, with no visible flicker or element duplication.
- Disconnecting and reconnecting doesn't corrupt the board or duplicate elements.
- A second person joining mid-session sees every change the first person has already made, even if autosave hasn't run yet.
- Each user's undo only reverses their own actions; it never reverses an action made by the other person.
- People drawing in the same area at the same time all end up with a sensible, non-conflicting result — nobody's stroke silently vanishes.

## 7. Accessibility pass

Comes after the core interaction (solo + auth + collaborative + access control) works, so accessibility is fitted to the real, final interaction model rather than a moving target.

- Every tool in the toolbar is reachable and operable by keyboard alone (tab order, Enter/Space to activate, Escape to cancel an in-progress action).
- Every control has a label a screen reader can announce (tool names, "undo", "export", not just icons).
- Visible focus states throughout — you can always tell what's focused without a mouse.
- Color choices for strokes/selection indicators aren't the only signal of state (don't rely on color alone to show "selected" or "connected").
- Login/signup and the share dialog (add user, choose role, remove access) are fully keyboard- and screen-reader-usable — they're as much "the product" as the canvas itself.

## 8. Unit tests

Covers the logic that's easy to silently break once auth, collaboration, and accessibility changes are layered on:
- Element CRUD (add/move/resize/delete) produces correct state
- Undo/redo correctness across a sequence of mixed operations, including per-user undo when two users edit the same board
- Sync/merge logic: two concurrent local changes reconcile into the expected final state
- Access-control logic: non-members are rejected; viewers can join but cannot edit; editors and owners can edit; only owners can manage sharing
- Export produces output reflecting current canvas state

## 9. Deploy

Ship to Vercel (or similar) with your backend-as-a-service project, with login, saved boards, and the collaborative feature actually working across two real devices/networks, not just two tabs on localhost — that's the real proof the sync and access-control layers work, not a demo artifact of shared local state.

## 10. V2 — AI features (coming soon)

Planned after the collaborative board is working, tested and deployed. Scope to be defined in a later PRD update.

## 11. Out of scope (all versions above)

- OAuth/social login specifics, password reset flows, org/team accounts — use whatever the managed auth provider gives out of the box; don't build custom auth UX beyond it
- Public/anonymous link sharing and join codes — every participant must be a logged-in user on the access list; roles are limited to owner/editor/viewer
- Mobile/touch-first UI (desktop + mouse/trackpad first)
- Rich vector editing (bezier curves, layers panel, grouping) — keep the shape set simple
- Board version history (only the current state is kept, no revision timeline)
