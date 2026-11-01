# FE10 · Component and design-system API design: modal, select, toast, library

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Modal / dropdown API (FE Tier 2), Autocomplete (FE Tier 1 / HLD #14), Toast / notification system (FE Tier 2), Date picker (FE Tier 2), "Design a component library" (FE Tier 2), Adobe Connect dialogs, pods and menus

---

## Why this topic matters

A component question ("design a modal", "design a select", "design a toast system") is graded differently from an application question ("design a news feed"). There is almost no server, no data model and no scale number. The interviewer wants to see whether you can design a small, reusable surface that other engineers will live with for years.

| Axis | Application question | Component question |
|---|---|---|
| Main artifact | Architecture, data flow, network | The public API (props, parts, events) |
| Scale concern | Users, data volume, realtime | Number of consumers and use cases |
| State | Server cache vs client state | Who owns the state: caller or component |
| Extensibility | Add a feature to the product | Support a case you did not predict, without a fork |
| Accessibility | A section of the answer | Baked into the API, not left to the caller |
| Performance | Loading, caching, rendering | Re-renders, bundle size, SSR safety |

**Interview line:** "I'll start from the consumer's code. I'll write three usage snippets first, the simple one, the controlled one and the customized one, and let those drive the API. Then I'll cover state ownership, composition, accessibility and library concerns."

For the RADIO structure, see [FE1](FE1-RADIO-Framework.md). For the keyboard contracts of dialog, combobox and tabs, see [FE7](FE7-Accessibility-i18n.md) (Part 2). This note does not repeat them. It shows how they shape the API.

---

## Part 1: what interviewers grade in a component question

Five things, in this order of how often candidates forget them:

1. **API surface.** Small, typed, predictable. Can the common case be done in one line?
2. **State ownership.** Controlled, uncontrolled, or both. Who can open or close it?
3. **Extensibility.** Can a consumer change the markup, the trigger, the item rendering, the styling, without a new prop each time?
4. **Accessibility.** Roles, focus, keyboard and labels come with the component. The consumer cannot get them wrong by accident.
5. **Performance.** No re-render of 1,000 options when one hovers; portal and lazy mount for heavy parts; SSR safe.

A good opening sequence (about 5 minutes): clarify requirements (single or multi select, async options, mobile, RTL, who consumes it), write the three usage snippets, name the parts, then go deep on state and a11y.

**Interview line:** "The API is the architecture. If the API forces every consumer to re-implement focus trapping, I have designed it wrong, whatever the internals look like."

---

## Part 2: state ownership: controlled, uncontrolled, or both

React's docs describe the idea: a component with local state is "uncontrolled" (the parent cannot influence it); a component driven by props is "controlled" (the parent fully specifies its behavior). Uncontrolled is easier to use because it needs less configuration; controlled is maximally flexible but forces the parent to configure everything. The docs also note these are not strict technical terms; most components are a mix.

For a library component, support both with the standard naming:

```tsx
type SelectProps<T> = {
  value?: T;                 // controlled
  defaultValue?: T;          // uncontrolled initial value
  onValueChange?: (v: T) => void;
  open?: boolean;            // same trio for open state
  defaultOpen?: boolean;
  onOpenChange?: (o: boolean) => void;
};
```

The core helper that every headless library has some version of:

```tsx
function useControllableState<T>({ value, defaultValue, onChange }: {
  value?: T; defaultValue: T; onChange?: (v: T) => void;
}) {
  const [inner, setInner] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : inner;

  const set = React.useCallback((next: T) => {
    if (!isControlled) setInner(next); // uncontrolled: we own it
    onChange?.(next);                  // always notify
  }, [isControlled, onChange]);

  return [current, set] as const;
}
```

Design rules:
- **Decide once, at mount.** Switching from uncontrolled to controlled mid-life is a bug (the `value={undefined}` to `value="x"` warning). Warn in dev.
- **Fire `onChange` in both modes.** Uncontrolled consumers still want to know.
- **Controlled means the parent can reject.** If the parent does not update `value`, the UI must not move. Test that.
- **Controllable state for every piece that matters:** `value`, `open`, sometimes `highlightedIndex`. Do not make everything controllable; each one multiplies the test matrix.
- **Single source of truth.** React's rule: for each unique piece of state, exactly one component owns it. Do not copy `value` into internal state and sync with an effect.

| Option | Good when | Cost |
|---|---|---|
| Uncontrolled only | Simple widgets, forms using `FormData` | Cannot coordinate with other UI |
| Controlled only | Strict apps, forms libraries | Boilerplate for every consumer |
| Both (`value` + `defaultValue`) | A shared library | More code and tests in the component |

**Interview line:** "I'd ship uncontrolled by default for the easy case and let `value`/`onValueChange` take over for coordination. One `useControllableState` hook, used for every stateful prop."

---

## Part 3: composition patterns

### 3.1 Props vs children vs slots

| Style | Example | Use when | Do NOT use when |
|---|---|---|---|
| Props | `<Button icon={<Plus/>} label="Add" />` | A fixed, small layout; data-like inputs | Every new use case adds another prop (prop explosion) |
| `children` | `<Card>{anything}</Card>` | Free-form content; React treats JSX as a normal value to pass | You need to place parts in specific regions |
| Slots (named JSX props) | `<Dialog header={...} footer={...}/>` | 2 to 3 fixed regions, simple API | More than ~4 regions, or parts need shared state |
| Compound components | `<Select.Root><Select.Item/></Select.Root>` | Parts that share state and the consumer wants to reorder or wrap them | A trivial component; it adds ceremony |

### 3.2 Compound components (context-based)

The patterns.dev compound pattern: a parent holds the state and provides it through context; children (`Toggle`, `List`, `Item`) read it. It suits components like selects, dropdowns and menus. The same page shows the older `React.Children.map` plus `cloneElement` variant and its weakness: only direct children receive the props, so wrapping a part in a `<div>` breaks it, and `cloneElement` merges props shallowly so names can collide. Use context.

```tsx
const MenuCtx = React.createContext<{ open: boolean; setOpen: (o: boolean) => void } | null>(null);
function useMenu() {
  const ctx = React.useContext(MenuCtx);
  if (!ctx) throw new Error('Menu parts must be inside <Menu.Root>');
  return ctx;
}

function Root({ children, ...stateProps }: MenuProps) {
  const [open, setOpen] = useControllableState({ value: stateProps.open, defaultValue: false, onChange: stateProps.onOpenChange });
  const value = React.useMemo(() => ({ open, setOpen }), [open, setOpen]);
  return <MenuCtx value={value}>{children}</MenuCtx>; // React 19: <Context> as provider
}
export const Menu = { Root, Trigger, Content, Item };
```

Watch-outs: memoize the context value; split contexts (state vs actions) when consumers re-render too often (patterns.dev makes the same suggestion); throw a clear error when a part is used outside its root.

### 3.3 Render props

A prop that is a function: `<Select renderOption={(o, { selected }) => ...} />`. Good for per-item customization where the library knows the state (selected, highlighted) but the consumer owns the markup. Not good as the main composition tool: nesting gets deep and it is harder to read than compound parts. Hooks replaced most render-prop use.

### 3.4 Headless / hooks-first

The idea behind Radix Primitives, Headless UI and React Aria: ship behavior, semantics and accessibility, not styles. React Aria's own page describes this as "style-free out of the box", with three levels: high-level components with a built-in DOM structure, composition with contexts, and a low-level hook-based API "for the ultimate control".

```tsx
// hooks-first: the hook returns props to spread, the consumer renders the DOM
const { triggerProps, menuProps, itemProps } = useMenu({ items, onAction });
return <button {...triggerProps}>Actions</button>;
```

Trade-off: maximum flexibility and a single design system on top, but each consumer writes more markup. Best layering for a company library: headless core, then a styled design-system layer on top that most teams use.

### 3.5 Polymorphic `as` and `asChild`

Two ways to change the rendered element:
- **`as="a"`**: the component renders a different tag. Typing it correctly is hard (props depend on the tag). Fine for typography and layout primitives.
- **`asChild`** (Radix): the part renders no DOM element and instead clones its child and passes it the props and behavior. Radix's example is `Tooltip.Trigger asChild` around an `<a>` (default is a `button`). It composes deeply: `Tooltip.Trigger asChild` around `Dialog.Trigger asChild` around your own button.

Radix's gotchas, worth saying out loud: your component must **spread props** onto the DOM node (it receives handlers and aria props), and it must **forward the ref** (Radix sometimes needs to measure). And if you change the element, accessibility is your responsibility: a tooltip trigger must stay focusable and respond to keyboard.

### 3.6 Ref forwarding

Consumers need the DOM node (focus, measure, scroll). Before React 19 you wrapped in `forwardRef`. In React 19, `ref` is a normal prop for function components: `function MyInput({ placeholder, ref }) { return <input placeholder={placeholder} ref={ref} /> }`. The release post says new function components will not need `forwardRef`, a codemod is planned, and `forwardRef` will be deprecated later. Refs passed to class components are not passed as props. For a library that supports React 18 and 19 peers, you still ship `forwardRef` until you drop 18. Also new in 19: ref callbacks can return a cleanup function.

**Interview line:** "Compound components with context for anything with shared state, `asChild` or `as` for element swapping, a spread-props-and-ref contract for leaf components. I avoid `cloneElement` because it breaks when someone wraps a child."

⏭ *Skip for interviews* - exposing an imperative handle (`useImperativeHandle`) such as `ref.current.focus()` or `toast.publish()` is a valid escape hatch, but state it as the exception: declarative props first, imperative handle only for actions that are not state (focus, scroll, play).

---

## Part 4: styling and theming

Goal: the library looks right by default, and a product team can re-skin it without forking.

| Layer | What | Why |
|---|---|---|
| Design tokens | `color.bg.surface`, `space.3`, `radius.md`, `font.size.sm` | One vocabulary shared by design and code |
| CSS variables | `--ds-color-bg-surface` set on `:root` or a theme wrapper | Runtime theming (dark mode, brand), no re-render, works with SSR |
| Variants | `variant="primary" size="md"` (few, enumerated) | Constrained choices keep the system consistent |
| State attributes | `data-state="open"`, `data-disabled`, `data-highlighted` | Styling hooks that do not need JS; Radix exposes `data-state` and, for toast, swipe CSS variables |
| `className` / `style` escape hatch | Merge, do not replace, internal classes | A consumer must be able to fix a one-off without a new prop |

Avoid **prop explosion**: `<Button primary large rounded outlined iconLeft iconRight fullWidth />` is a smell. Prefer 2 or 3 enumerated props (`variant`, `size`, `tone`) and push the rest to composition (children, slots) and tokens.

```tsx
type ButtonProps = React.ComponentPropsWithRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
};
// ...rest spread onto <button>, className merged, data-variant for CSS
```

Extend native props (`ComponentPropsWithRef<'button'>`), do not re-declare them. That one decision gives you `onClick`, `aria-*`, `data-*`, `disabled` and `ref` for free.

Theming: tokens are the contract; CSS variables are the delivery. Dark mode is "swap the variable values", not "re-render with a theme prop". Multi-brand (for example, several Adobe surfaces) is another token set.

**Interview line:** "Tokens as the contract, CSS variables as delivery, three enumerated variant props at most, `data-*` state attributes for styling hooks, and a merged `className` as the escape hatch."

---

## Part 5: accessibility contract baked into the API

The principle from FE7: accessibility is a design-system constraint enforced once in primitives. In API terms:

| Concern | The component does it | The consumer is forced or prompted to supply |
|---|---|---|
| Roles and states | Sets `role`, `aria-expanded`, `aria-controls`, `aria-selected` | Nothing |
| IDs and wiring | Generates ids (`useId`) and links label, description, popup | Nothing |
| Focus | Moves focus in on open, traps it (modal), restores it on close | Optional `initialFocus` override |
| Keyboard | Implements the pattern's keys | Nothing |
| Names | Requires a name | A title or `aria-label` (make it a required type, or warn in dev) |
| Announcements | Live region for async or transient messages | Message text |

Make the unsafe thing hard: a `Dialog` that requires `title` (or `aria-label`), an icon-only `IconButton` that requires `aria-label` in its type, a `Tooltip.Trigger` that warns if the child is not focusable.

The exact keys and ARIA attributes for dialog, combobox and tabs are in [FE7 Part 2](FE7-Accessibility-i18n.md). The sections below only point out what they change in the API.

---

## Part 6: worked mini-examples through RADIO

### 6.1 Modal (dialog)

**R.** Blocking overlay with title, content, actions; nested dialogs possible; confirm-destructive variant.
**A.** Compound parts: `Dialog.Root` / `Trigger` / `Portal` / `Overlay` / `Content` / `Title` / `Description` / `Close`. State: `open` / `defaultOpen` / `onOpenChange`.
**D.** What the APG modal pattern requires and the API therefore owns:
- container has role `dialog` and `aria-modal="true"`, labelled by a visible title (`aria-labelledby`) or `aria-label`;
- `Tab` and `Shift+Tab` cycle inside; `Escape` closes; a visible close button is strongly recommended;
- on open, focus moves inside (placement depends on content; for irreversible actions, focus the least destructive button, which is why a destructive confirm uses the alertdialog pattern);
- on close, focus returns to the invoking element unless it no longer exists.
- APG warns: set `aria-modal` only if code really blocks interaction outside and styling obscures it; otherwise screen reader users can lose content.

```tsx
<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger asChild><Button>Delete project</Button></Dialog.Trigger>
  <Dialog.Portal>                       {/* escapes stacking contexts / overflow */}
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Title>Delete "Q4 plan"?</Dialog.Title>
      <Dialog.Description>This cannot be undone.</Dialog.Description>
      <Dialog.Close asChild><Button variant="ghost">Cancel</Button></Dialog.Close>
      <Button onClick={confirm}>Delete</Button>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

**I.** Portal to `document.body`; a stack (context or module store) for nested dialogs so only the top one handles Escape; scroll lock on `body`; inert or `aria-hidden` on the background for legacy support; unmount content when closed (or keep mounted for exit animation via a `forceMount`-style prop).
**O.** Do not render hidden dialogs with heavy content; lazy-load the content; test focus return with a keyboard-only run.

### 6.2 Dropdown / Select (combobox)

**R.** Single or multi, searchable or not, async options, grouped, large lists, mobile.
**A.** First question: select-only or editable? APG separates a **select-only combobox** (like `<select>`, no typing) from an **editable combobox** (typing filters). Also: menu (actions) vs select (value). Use a native `<select>` when the requirements allow it.
**D.**
- Roles: input or button with `role="combobox"`, `aria-expanded`, `aria-controls` pointing to a `listbox`, options with `aria-selected`; editable ones set `aria-autocomplete` (`none` / `list` / `both`).
- Focus: DOM focus stays on the combobox; the highlighted option is exposed with `aria-activedescendant` (APG note). So the "highlighted index" is state the component owns, separate from `value`.
- API: `value`/`onValueChange`, `open`/`onOpenChange`, `inputValue`/`onInputChange` (editable only), `items` or compound `Item` children, `filter` function, `renderOption`, `loading`, `disabled`.

```tsx
<Select.Root value={country} onValueChange={setCountry}>
  <Select.Trigger aria-label="Country"><Select.Value placeholder="Pick one"/></Select.Trigger>
  <Select.Content>
    {countries.map(c => <Select.Item key={c.code} value={c.code}>{c.name}</Select.Item>)}
  </Select.Content>
</Select.Root>
```

**I.** Popup positioning (flip near viewport edges, portal); virtualize past ~100s of options (see [FE5](FE5-Performance.md)); for async options, debounce and abort stale requests ([FE4](FE4-Network-Layer.md) Part 3); typeahead for select-only; keep `Option` memoized so hover does not re-render the list.
**O.** IME composition (do not select on Enter mid-composition), RTL, mobile (consider a native picker), form integration (hidden input so `FormData` works).

### 6.3 Toast / notification system

**R.** Transient messages from anywhere in the app: success, error, undo. Multiple at once. Not for decisions.
**A.** Two designs:
- **Declarative** parts (Radix `Toast.Provider` / `Root` / `Viewport`): the caller controls `open`. Fine for one local toast.
- **Imperative** `toast.success('Saved')` from anywhere: needs a global store plus one `<Toaster/>` mounted at the root. This is what interviewers usually expect for a "system". Radix's own docs describe building an imperative API on top of the parts for repeated toasts.

```tsx
type Toast = { id: string; kind: 'info'|'success'|'error'; message: string;
               duration?: number; action?: { label: string; onClick(): void } };
const store = createStore<Toast[]>([]);                  // module-level, subscribe via useSyncExternalStore
export const toast = { show: (t: Omit<Toast,'id'>) => store.add({ id: crypto.randomUUID(), ...t }) };
```

**D.**
- Queue and limit: cap visible toasts (for example 3 to 5), queue the rest; dedupe identical messages.
- Timers: auto-dismiss; Radix's toast pauses on hover, focus and window blur, which is the behavior to copy. Clean up timers on unmount.
- Portal into a fixed **viewport** region; Radix gives it a hotkey (default F8) so keyboard users can reach it, and notes you must make the hotkey discoverable.
- Live region: the container is an `aria-live` region. Radix distinguishes `foreground` (announced immediately; for results of a user action) from `background` (announced at the next graceful moment; for background events), and warns not to stack many foreground toasts.
- Time limits: an action inside a toast must be safe to ignore. Radix says that if a response is required, use an alert dialog styled as a toast instead. Give an alternative route (`altText`) to any toast action.
- Close button needs an accessible name; reduced-motion for swipe and slide animations ([FE7](FE7-Accessibility-i18n.md) Part 3).

**I.** SSR: the store lives on the client; the `<Toaster/>` renders nothing until mounted. Tests: fake timers for dismiss, pause on hover.
**O.** Metrics: dismiss rate, action click rate; error toasts include a request id ([FE4](FE4-Network-Layer.md) Part 4).

---

## Part 7: library concerns

| Concern | What to say |
|---|---|
| Versioning | Semver. Props, part names, `data-*` attributes and CSS variables are all public API. Deprecate first (dev-only warning, codemod), remove in a major. React itself did this: `ref` as a prop with a codemod, `forwardRef` deprecated later. |
| Breaking changes | Changed default behavior is breaking even if types are the same. Keep a changelog and a migration guide. |
| Tree-shaking | ESM output, `sideEffects: false`, named exports per component, no giant barrel that pulls in everything, no top-level side effects (global style injection). Radix publishes size per primitive on each component page, which shows why one package per component helps. |
| SSR safety | No `window`/`document` at module scope or first render; use `useId` for ids (Radix notes that on React below 18 ids relied on hydration, hurting screen reader users until JS loads); portals mount after hydration; no `Math.random()`/`Date.now()` in render (hydration mismatch). |
| Peer deps | `react` and `react-dom` as `peerDependencies` with a range (a second copy of React breaks hooks and context). Keep runtime deps few; each one is a transitive risk. |
| Docs and Storybook | One story per variant and state (open, disabled, error, RTL, dark). Stories double as the visual test inputs and as living docs with the controlled and uncontrolled examples. |
| Testing | Unit tests with Testing Library (roles, keyboard flows); axe checks; visual regression on the stories (Chromatic or Playwright snapshots) to catch accidental style changes; a keyboard-only manual pass per release ([FE7](FE7-Accessibility-i18n.md) Part 5). |
| Governance | Who accepts a new variant? A contribution and review path stops the library becoming a dumping ground. |

**Interview line:** "I treat every prop, part name, data attribute and token as public API. Changes go through deprecation, codemod, then a major. The library ships ESM with no side effects, React as a peer dependency, and every component is SSR-safe by default."

---

## Part 8: choosing in an interview / cheat sheet

| Situation | Choice | Why |
|---|---|---|
| Simple widget, few use cases | Props + `children` | Least ceremony |
| Parts share state, consumer reorders or wraps | Compound components + context | Flexible, no prop drilling |
| Per-item look, library owns state | Render prop (`renderOption`) | Markup stays with the consumer |
| Many teams, many brands | Headless core + styled layer | One behavior, many skins |
| Swap element or reuse your own Button | `asChild` (or typed `as`) | Keeps behavior and a11y, changes markup |
| Coordinate with other UI | Controlled (`value` + `onChange`) | Parent owns truth |
| Easy default use | Uncontrolled (`defaultValue`) | Zero config |
| Re-skin, dark mode | Tokens + CSS variables | No re-render, SSR friendly |
| One-off style fix | `className` merged | No new prop |
| Toast from anywhere | Global store + one Toaster + live region | Decouples caller from UI |
| Choose a value from few fixed options | Native `<select>` first | Free a11y and mobile UX |

### Common interview traps

- Starting with internals and never showing a usage snippet.
- Prop explosion instead of composition.
- Only controlled or only uncontrolled, and no mention of `useControllableState`.
- Copying a prop into state and syncing with an effect (two sources of truth).
- `cloneElement`/`Children.map` composition that breaks when a child is wrapped.
- A `div` with `onClick` as a trigger; ARIA added without keyboard behavior.
- Setting `aria-modal` without actually blocking the background.
- Trapping focus but not restoring it on close.
- A toast that holds a required action, or that is not in a live region.
- Forgetting portals, z-index and stacking contexts for overlays.
- Ignoring SSR (`window` at module scope, random ids).
- Treating a public prop rename as a patch release.
- Building a custom select when a native `<select>` meets the requirements.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What do interviewers grade in a component question that they do not in an application question?</summary>

The public API surface, state ownership (controlled vs uncontrolled), extensibility without forking, accessibility baked into the component, and library concerns such as re-renders, bundle size and SSR safety. The server, data model and scale parts are mostly absent.
</details>

<details><summary>2. Explain controlled vs uncontrolled, and how a component supports both.</summary>

Uncontrolled: the component owns the state internally (`defaultValue`); easy to use but the parent cannot coordinate it. Controlled: the parent passes `value` and handles `onChange`; flexible but more boilerplate. A library supports both with a `useControllableState` hook: if `value` is defined use it, otherwise use internal state, and call `onChange` in both modes. Decide at mount and warn on switching.
</details>

<details><summary>3. Why prefer context-based compound components over `React.Children.map` + `cloneElement`?</summary>

With `cloneElement`, only direct children receive the injected props, so wrapping a part in a `div` breaks it, and the shallow prop merge can cause name collisions. Context reaches any depth and lets consumers wrap, reorder and conditionally render parts. Memoize the context value and split contexts if re-renders become a problem.
</details>

<details><summary>4. What does `asChild` do, and what must the child component do for it to work?</summary>

The part renders no DOM element of its own; it clones its child and passes it the props and behavior (handlers, aria attributes). The child must spread all props onto its DOM node and forward the ref. If you change the element type you are responsible for keeping it accessible (for example, a tooltip trigger must stay focusable). In React 19, `ref` is a normal prop, so function components no longer need `forwardRef`; React 18 peers still do.
</details>

<details><summary>5. How do you avoid prop explosion while still supporting customization?</summary>

Few enumerated variant props (`variant`, `size`), design tokens and CSS variables for look, `data-*` state attributes for styling hooks, composition (children, slots, compound parts) for structure, extending native element props, and a merged `className` escape hatch. Add a prop only when behavior changes, not for appearance.
</details>

<details><summary>6. Modal: list the accessibility behavior the component must own.</summary>

Role `dialog` with `aria-modal="true"` and a label (`aria-labelledby` pointing to a visible title or `aria-label`); focus moves inside on open (least destructive action for irreversible dialogs); Tab and Shift+Tab stay inside; Escape closes; a visible close control; focus returns to the invoking element on close unless it no longer exists. Only set `aria-modal` if the background is truly blocked and obscured. Details in FE7.
</details>

<details><summary>7. Design the data flow of a Select/combobox: where do `value`, `open` and the highlighted option live, and how is the highlight exposed to a screen reader?</summary>

`value` and `open` are controllable state (value/defaultValue/onValueChange, open/defaultOpen/onOpenChange). The highlighted index is internal (optionally controllable) state. DOM focus stays on the combobox element and the highlighted option is exposed through `aria-activedescendant`, with `aria-expanded` and `aria-controls` pointing to the listbox. Editable variants add `inputValue` and `aria-autocomplete`. Virtualize long lists and abort stale async requests.
</details>

<details><summary>8. Design a toast system: what are the parts, and what are the accessibility rules?</summary>

A global store with a queue (cap visible toasts, dedupe), one `Toaster` at the root rendering into a fixed portal viewport, timers that pause on hover, focus and window blur, and an imperative `toast.show()` API. Accessibility: an `aria-live` region, distinguish urgent (announced immediately, user-triggered) from background messages, keyboard route to the viewport (hotkey, made discoverable), labelled close button, and any action must be safe to ignore because of the time limit. If a response is required, use an alert dialog instead.
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
| [React: Sharing State Between Components](https://react.dev/learn/sharing-state-between-components) | "Controlled and uncontrolled components" (Deep Dive), "A single source of truth for each state", "Recap" | ~15 min |
| [React v19 blog](https://react.dev/blog/2024/12/05/react-19) | "`ref` as a prop", "Cleanup functions for refs", "`<Context>` as a provider", "New hook: `useFormStatus`" (design-system motivation) | ~15 min |
| [patterns.dev: Compound Pattern](https://www.patterns.dev/react/compound-pattern) | "Context API", "React.Children.map", "Pros", "Cons" and the React 18+ note on memoizing/splitting context | ~15 min |
| [Radix Primitives: Composition](https://www.radix-ui.com/primitives/docs/guides/composition) | "Changing the element type", "Your component must spread props", "Your component must forward ref", "Composing multiple primitives" | ~10 min |
| [Radix Primitives: Server-side rendering](https://www.radix-ui.com/primitives/docs/guides/server-side-rendering) | "Gotcha" (ids and hydration) | ~3 min |
| [Radix Primitives: Toast](https://www.radix-ui.com/primitives/docs/components/toast) | "Features", "Accessibility" (Sensitivity, Alternative action), "Custom APIs" (Abstract parts, Imperative API) | ~20 min |
| [React Aria](https://react-spectrum.adobe.com/react-aria/) | Landing page: "Bring your own styles", "Customizable to the max" (components, contexts, hooks layers) | ~5 min |
| [WAI-ARIA APG: Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | "Keyboard Interaction" and its notes on initial focus and focus return, "WAI-ARIA Roles, States, and Properties" (the `aria-modal` warning) | ~15 min |
| [WAI-ARIA APG: Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | "About This Pattern" (select-only vs editable, autocomplete types), "Listbox Popup Keyboard Interaction", "WAI-ARIA Roles, States, and Properties" | ~25 min |
| [FE7 Accessibility + i18n](FE7-Accessibility-i18n.md) | Part 2 keyboard contracts, Part 3 live regions | ~20 min |

Not fetched or not used: the react.dev "Passing JSX as children" and `useImperativeHandle` pages and GreatFrontEnd component questions were not read for this note. The versioning, tree-shaking, Storybook and visual-regression points in Part 7 are standard practice stated from general knowledge, not quoted from a source above.

**Connects to:** FE1 RADIO Framework · FE3 State + Data Model · FE4 Network Layer · FE5 Performance · [FE7 Accessibility + i18n](FE7-Accessibility-i18n.md) · FE8 Frontend Security
