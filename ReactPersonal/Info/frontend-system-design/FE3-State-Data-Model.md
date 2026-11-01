# FE3 · State and Data Model: the client-side truth map

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** News feed (FE Tier 1 / HLD #4), Chat app (FE Tier 1 / HLD #3), Email client (FE Tier 2), Data table / Google Sheets (FE Tier 2), Collaborative editor / DrawBoard (FE Tier 1 / HLD #12), Autocomplete (FE Tier 1 / HLD #14)

---

## Why this topic matters

Most frontend system design failures are state failures disguised as UI failures: duplicate objects, stale derived fields, impossible optimistic rollback, filters that reset on refresh, messages that appear out of order.

A senior answer starts by separating kinds of state:

| State kind | Owner | Examples | Tooling |
|---|---|---|---|
| Server state | backend, cached on client | posts, messages, users, emails | TanStack Query, Relay, Apollo, RTK Query |
| Client/UI state | current browser session | sidebar open, selected tab, local sort mode | component state, Zustand, Redux, context |
| URL state | shareable navigation state | query, filters, page, selected email | router/search params |
| Form state | user draft before submit | checkout address, comment draft | React Hook Form, local reducer |
| Derived state | computed from other state | unread count, filtered rows | selectors/memoized functions |

**Interview line:** "I won't put everything in one global store. Server state needs caching and invalidation; URL state needs shareability; form state needs validation and dirty tracking; UI state should stay local unless multiple regions coordinate on it."

---

## Part 1: server state vs client state vs URL state vs form state

### Server state

Server state is asynchronous, shared, stale-able and failure-prone. The frontend does not own it; it owns a cached copy and mutation workflow.

Typical concerns:
- query keys and cache scope;
- staleness and refetch policy;
- pagination/infinite pages;
- optimistic updates and rollback;
- dedup and cancellation;
- background refresh and invalidation.

Example query keys:

```ts
type QueryKey =
  | ['feed', 'home', { ranking: 'top' | 'latest' }]
  | ['post', string]
  | ['chat', string, 'messages']
  | ['email', 'list', { label: string; q?: string }];
```

A query key is part of the data model. If it is sloppy, invalidation becomes guesswork.

### Client/UI state

UI state belongs near the component unless it must be shared. A modal open flag usually does not deserve Redux. A meeting-wide selected pod or currently focused whiteboard tool might.

```ts
type WhiteboardUiState = {
  tool: 'select' | 'pen' | 'shape' | 'text';
  color: string;
  zoom: number;
  selectedObjectIds: string[];
};
```

This state may never be persisted to the server. In DrawBoard, the CRDT document is collaborative server-synced state; the active toolbar popover is local UI state.

### URL state

URL state is state that should survive refresh, back/forward and sharing.

Good URL state:
- search query;
- table filters/sort/page;
- selected email/thread ID;
- dashboard time range;
- active tab when deep-linking matters.

Bad URL state:
- every keystroke in a large form;
- ephemeral hover state;
- large selected row sets.

### Form state

Form state has its own lifecycle: initial values, dirty fields, validation, touched state, submit, server errors, reset.

For checkout or profile edit, do not constantly write partially valid fields to the server cache. Keep a draft form model and commit on submit. For autosave editors, model a save queue and conflict state explicitly.

---

## Part 2: normalized stores and entity caches

Nested server responses are convenient for transport but dangerous as a client source of truth.

Problem:

```ts
type FeedPage = {
  posts: Array<{ id: string; author: User; comments: Comment[] }>;
};
```

If the same user appears in 20 posts, updating their avatar requires changing 20 copies. If the same post appears in home feed and profile feed, optimistic likes can diverge.

Normalized shape:

```ts
type EntityState = {
  users: Record<string, User>;
  posts: Record<string, Post>;
  comments: Record<string, Comment>;
  feeds: Record<string, { postIds: string[]; nextCursor?: string }>;
};
```

This mirrors database thinking: entities by ID, relationships by IDs, view-specific order separately.

### When not to normalize manually

If you use TanStack Query without a normalized cache, you can still design normalized **updates**:
- keep page data but update all matching post copies through helper functions;
- invalidate broader queries after mutation;
- use server response as source of truth.

Relay/Apollo normalize automatically by entity IDs. Redux often normalizes manually. TanStack Query is document/query-cache oriented, so your design should say how duplicates are handled.

**Interview line:** "For a feed, I want entity identity by post ID. If the cache is document-based, I'll centralize update helpers or invalidate related queries; if using Relay/Apollo, the normalized cache handles entity updates by ID."

### Join tables on the client

Many-to-many relationships appear in frontend too:

```ts
type Label = { id: string; name: string };
type Email = { id: string; subject: string; fromId: string };
type EmailLabel = { emailId: string; labelId: string };
```

For an email client, storing `labelIds` on each email may be enough. But if labels have metadata like counts, colors and permissions, model them separately.

---

## Part 3: cache invalidation, optimistic updates and rollback

Cache invalidation should be designed, not guessed after code exists.

### Invalidation levels

| Mutation | Precise update | Invalidate |
|---|---|---|
| Like post | update one post's viewer/count fields | maybe invalidate feed later |
| Send chat message | append optimistic message to room | refetch around ack if gap detected |
| Edit email label | update email labels and label counts | invalidate label list |
| Bulk table edit | patch affected rows | invalidate aggregate/count queries |
| Checkout purchase | do not rely only on optimistic UI | refetch cart/order/inventory |

### Optimistic update workflow

```ts
type Rollback<T> = () => void;

function optimisticPatch<T extends { id: string }>(
  cache: Map<string, T>,
  id: string,
  patch: Partial<T>,
): Rollback<T> {
  const previous = cache.get(id);
  if (!previous) return () => {};
  cache.set(id, { ...previous, ...patch });
  return () => cache.set(id, previous);
}
```

A real TanStack Query mutation follows the same idea: cancel relevant queries, snapshot previous data, update cache, rollback on error, then invalidate/refetch on settle if necessary.

Important senior details:
- optimistic IDs for new items must be replaced by server IDs;
- dedup by `clientMutationId` when retrying;
- show pending state for mutations that are not safe to fake;
- rollback should preserve newer user actions when possible;
- not every action should be optimistic: payment, inventory reservation and permission changes need stronger confirmation.

### Optimistic chat send

```ts
type Message = {
  id: string;
  clientId?: string;
  roomId: string;
  senderId: string;
  text: string;
  status: 'sending' | 'sent' | 'failed';
  createdAt: string;
  serverSeq?: number;
};
```

Render the optimistic message immediately with `status: 'sending'`. When the server ack arrives, replace by `clientId`. If a WebSocket event arrives before the HTTP ack, dedup by `clientId` or server message ID.

---

## Part 4: derived state and selectors

Derived state should usually be computed, not stored.

Bad:

```ts
type InboxState = {
  emailsById: Record<string, Email>;
  unreadCount: number; // can drift if updates forget to maintain it
};
```

Better:

```ts
function selectUnreadCount(state: InboxState, label: string) {
  return state.emailIdsByLabel[label].filter(id => !state.emailsById[id].read).length;
}
```

But computation can be expensive for huge tables, so use memoized selectors or server-provided aggregates. The interview answer should say which fields are authoritative.

Rule of thumb:
- store raw server facts;
- compute cheap derived views;
- cache expensive derived views with clear invalidation;
- store server-provided aggregates when exactness/performance matters.

Data table example:
- If rows are <5k, client filtering/sorting can derive visible rows.
- If rows are 100k or permission-sensitive, filters/sort/page live in URL and backend query; the client stores current page plus metadata.

---

## Part 5: data models for common frontend questions

### Feed

```ts
type Feed = {
  pages: Array<{ postIds: string[]; nextCursor?: string }>;
  newItemsAvailable: boolean;
  scrollAnchorPostId?: string;
};
```

Key choices: cursor pages, normalized posts/users/media, optimistic likes, scroll anchor, refresh banner.

### Chat

```ts
type RoomState = {
  roomId: string;
  messagesById: Record<string, Message>;
  orderedMessageIds: string[];
  lastSeenSeq: number;
  connection: 'connected' | 'reconnecting' | 'offline';
  typingByUserId: Record<string, { expiresAt: number }>;
};
```

Key choices: order by server sequence when available, dedup events, local pending messages, unread boundary, reconnect gap fetch.

### Email client

```ts
type MailboxView = {
  label: 'inbox' | 'sent' | 'archive' | string;
  query: string;
  sort: 'newest' | 'oldest';
  selectedThreadId?: string;
  threadIds: string[];
};
```

URL state should include label/query/sort/selected thread. Server state includes thread/email entities. Form state includes draft reply.

### Data table / Google Sheets

```ts
type TableViewState = {
  columns: Array<{ id: string; width: number; pinned?: 'left' | 'right' }>;
  sort: Array<{ columnId: string; dir: 'asc' | 'desc' }>;
  filters: Record<string, unknown>;
  selection: Set<string>;
};
```

Separate row data from view configuration. Large tables need virtualization, stable row IDs and server-side query state in the URL.

### DrawBoard / collaborative editor

Collaborative document state is not a normal Redux object if using Yjs/CRDT. The CRDT document is the source of truth; React subscribes to projections.

```ts
type Presence = {
  userId: string;
  cursor?: { x: number; y: number };
  selectedIds: string[];
  color: string;
};
```

Separate durable document updates from ephemeral presence. Presence can be lossy; document updates cannot.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Feed/post entities repeat across pages | normalize by ID or centralize cache update helpers | avoid divergent likes/authors |
| Chat send | optimistic message with client ID | instant UX + dedup with server ack |
| Payment/checkout | pessimistic confirmation | correctness beats fake success |
| Search filters/table state | URL state | shareable, refresh-safe, back/forward works |
| Modal hover/dropdown open | local component state | no global coupling |
| Large table derived rows | server query or memoized selector | avoid main-thread expensive recompute |
| Email unread count | server aggregate or selector | choose based on exactness and scale |
| DrawBoard presence | ephemeral realtime state | lossy and separate from CRDT document |

### Common interview traps

- One global store for everything.
- Duplicating nested entities and then failing optimistic updates.
- Storing derived state that silently drifts.
- Forgetting rollback and pending states for optimistic mutations.
- Keeping filters only in component state when users expect shareable URLs.
- Treating realtime events as always ordered and exactly once.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why is server state different from client/UI state?</summary>

Server state is owned by the backend, asynchronous, shared, stale-able and error-prone; the client caches it. UI state is owned by the current browser session and often local. Server state needs invalidation/refetch/mutations; UI state mostly needs predictable component coordination.
</details>

<details><summary>2. What belongs in URL state for a data table?</summary>

Filters, search query, sort, page/cursor if shareable, selected row only if deep-linking to it matters, and active tab/time range. Ephemeral hover or column resize drafts usually should not be in the URL unless the product requires persistence.
</details>

<details><summary>3. Why normalize feed data?</summary>

The same post/user/media can appear in multiple pages or surfaces. Normalization gives one entity identity by ID, so updates like likes, author avatar changes or deletions do not require finding and patching many duplicate nested objects.
</details>

<details><summary>4. Give the optimistic update lifecycle.</summary>

Cancel conflicting queries, snapshot previous data, apply optimistic patch, send mutation with an idempotency/client mutation ID, rollback on error, replace optimistic IDs with server IDs on success, and invalidate/refetch on settle if server truth may differ.
</details>

<details><summary>5. When should you avoid optimistic UI?</summary>

When fake success is harmful or correctness-critical: payment, inventory reservation, permission changes, destructive actions without undo, or operations likely to fail. Use pending states and server confirmation instead.
</details>

<details><summary>6. How do you model chat messages during reconnect?</summary>

Keep messages by ID plus ordered IDs, last seen server sequence, pending local messages with client IDs, and connection state. On reconnect, fetch gaps after the last acknowledged sequence and dedup incoming events by message ID/client ID.
</details>

<details><summary>7. What is derived state, and why is it dangerous to store?</summary>

Derived state is computed from other state, such as unread count or filtered rows. If stored separately, it can drift when updates forget to maintain it. Prefer selectors unless computation is expensive or the server provides an authoritative aggregate.
</details>

<details><summary>8. In DrawBoard, what is the difference between CRDT document state and presence?</summary>

The CRDT document is durable collaborative state that must converge correctly. Presence is ephemeral user status such as cursor/selection and can be lossy, expire quickly and be transported separately.
</details>

---

## My notes (write from memory after reading)

- 
- 
- 

**One thing I'd have got wrong before reading this:**

---

## Sources / read more

| Source | What to read | Where / time |
|---|---|---|
| [Redux: Normalizing State Shape](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape) | "Designing a Normalized State", "Organizing Normalized Data in State", "Relationships and Tables", "Storing related IDs on an entity", "Using a join table", "Normalizing Nested Data" | ~30 min |
| [TanStack Query: Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) | "Via the UI", "If the mutation and the query don't live in the same component", "Via the cache", "Updating a list of todos when adding a new todo", "Updating a single todo", "When to use what" | ~30 min |

**Connects to:** FE1 RADIO Framework · FE4 Network Layer · FE5 Performance · [E1 Polling/SSE/WebSocket](../../../SystemDesign/Notes/HLD/E-Realtime/E1-Polling-SSE-WebSocket.md) · [E3 Collaborative Sync](../../../SystemDesign/Notes/HLD/E-Realtime/E3-Collaborative-Sync.md)
