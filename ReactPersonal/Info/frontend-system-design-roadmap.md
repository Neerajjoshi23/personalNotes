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
