# FE7 · Accessibility + i18n: designing UI that works for everyone, everywhere

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Autocomplete (#14), Image carousel (FE Tier 1), Modal / dropdown API (FE Tier 2), Data table / Google Sheets (FE Tier 2), E-commerce checkout, Adobe Connect meeting UI

---

## Why this topic matters

Accessibility and internationalization are not polish. They are architecture constraints. If you bolt them on after building a complex React UI, you usually end up rewriting focus management, component APIs, layout assumptions and copy handling.

In frontend system design, a senior answer covers:

| Requirement | Senior framing |
|---|---|
| Keyboard-only users | Every interactive path has a visible focus path and documented key bindings. |
| Screen reader users | Semantic HTML first; ARIA only when native elements cannot express the pattern. |
| Dynamic UI | Announce meaningful changes with live regions, not every render. |
| Global markets | Text expansion, RTL, locale-aware formatting and lazy-loaded translations are built into the component model. |
| Design system | A11y and i18n are enforced once in primitives, not rediscovered in every feature. |

For Adobe Connect, this is not theoretical. A meeting product has live chat, pods, dialogs, captions, participant lists, recording playback and high keyboard usage. If focus gets trapped in the wrong pod or a chat notification is not announced, the app is functionally broken for some users.

**Interview line:** "I would make accessibility a design-system constraint: native semantics by default, APG-compliant patterns for complex widgets, automated checks in CI, and manual keyboard/screen-reader passes for the critical flows."

---

## Part 1: semantic HTML is the base layer

The first rule is boring and powerful: use the element that already has the behavior.

| Need | Prefer | Avoid |
|---|---|---|
| Button action | `<button type="button">` | clickable `<div>` |
| Navigation link | `<a href="...">` | button that changes location |
| Form label | `<label for="email">` | placeholder-only label |
| Page regions | `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` | anonymous nested divs |
| Modal heading | real heading referenced by `aria-labelledby` | visual-only text |

Native controls bring keyboard behavior, focusability, names and states for free. ARIA can add missing semantics, but it does not add behavior. A `role="button"` div still needs `tabIndex`, Space/Enter handling, disabled behavior and focus styling. In a design interview, that is a self-inflicted bug.

### Accessible name and description

Every control needs a name. Screen readers compute it from visible text, labels, `aria-label`, `aria-labelledby` and related attributes.

```tsx
// Good: visible label, input association, extra help text.
<label htmlFor="meeting-search">Search recordings</label>
<input
  id="meeting-search"
  type="search"
  aria-describedby="meeting-search-help"
/>
<p id="meeting-search-help">Search by title, host or transcript text.</p>
```

Prefer visible labels. `aria-label` is useful for icon buttons but can drift from visible text in translated UIs.

### Focus is state

Focus is not cosmetic; it is where the user's interaction currently lives.

Principles:
- Focus order follows visual/logical order.
- Focus is visible and high contrast.
- Opening a dialog moves focus into it; closing returns focus to the trigger.
- Route changes should move focus to the new page heading or main region.
- Error summary should receive focus after failed submit.
- Virtualized lists must not unmount the focused item without a recovery plan.

React makes focus bugs easy because render changes can remove nodes. Treat focus as part of component state and test it like state.

```tsx
function useReturnFocus(isOpen: boolean) {
  const triggerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    return () => triggerRef.current?.focus();
  }, [isOpen]);
}
```

---

## Part 2: keyboard contracts for common interview components

For machine-coding and system design, interviewers love autocomplete, modal, tabs and carousel because they expose whether you know the difference between "looks right" and "works right".

### Combobox / autocomplete

A combobox is not just an input with a dropdown. It has a text input, a popup listbox/grid and an active option.

| Piece | Typical ARIA | Notes |
|---|---|---|
| Input | `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"` | Input keeps DOM focus. |
| Popup | `role="listbox"` | Hidden when collapsed. |
| Option | `role="option"`, `aria-selected` | Active option tracked by id. |
| Active item | `aria-activedescendant="option-id"` on input | Avoids moving focus into each option. |

Key behavior:
- Type filters suggestions.
- Down/Up moves active option.
- Enter accepts active option.
- Escape closes popup (and may clear depending on product contract).
- Tab moves focus away, often accepting nothing unless explicitly chosen.

```tsx
type Suggestion = { id: string; label: string };

function SearchBox({ suggestions }: { suggestions: Suggestion[] }) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const activeId = open && suggestions[active] ? `suggestion-${suggestions[active].id}` : undefined;

  return (
    <div>
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls="suggestions"
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        onFocus={() => setOpen(true)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, suggestions.length - 1)); }
          if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
          if (event.key === 'Escape') setOpen(false);
        }}
      />
      {open && (
        <ul id="suggestions" role="listbox">
          {suggestions.map((s, i) => (
            <li id={`suggestion-${s.id}`} key={s.id} role="option" aria-selected={i === active}>
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

This is incomplete production code (click selection, async loading, no-results state), but the important idea is correct: DOM focus stays on the input while `aria-activedescendant` tells assistive tech which option is active.

### Dialog / modal

A modal dialog temporarily makes the rest of the page inert.

Contract:
- Container has `role="dialog"` or native `<dialog>` where appropriate.
- `aria-modal="true"` when it truly blocks outside interaction.
- Accessible name via `aria-labelledby`.
- Initial focus moves inside. Pick the first meaningful action or heading, not always the close button.
- Tab/Shift+Tab wrap inside.
- Escape closes if product permits.
- Focus returns to the trigger.
- Background is not reachable by keyboard or screen reader.

Trap: setting `aria-modal="true"` without actually trapping focus is lying to assistive tech.

### Tabs

Tabs are for switching between panels within one context, not for global navigation.

| Element | Role / state |
|---|---|
| Tab list | `role="tablist"` |
| Tab | `role="tab"`, `aria-selected`, `aria-controls` |
| Panel | `role="tabpanel"`, `aria-labelledby` |

Keyboard:
- Left/Right moves between horizontal tabs.
- Home/End jump to first/last.
- Activation can be automatic (if panel loads instantly) or manual with Enter/Space (if expensive).

For Adobe Connect pods, use tabs only if they are genuinely peer panels. Do not use tab roles for arbitrary button groups.

### Carousel

Carousels are deceptively hard.

Requirements:
- Pause auto-rotation on focus/hover and provide a visible pause/play control.
- Do not auto-advance if `prefers-reduced-motion` suggests reduced motion.
- Announce slide position without spamming live regions.
- Buttons are real buttons with names: "Next testimonial", "Previous slide".
- If content changes automatically, avoid stealing focus.

In interviews, it is often enough to say: "I would default to no auto-rotation. If product insists, it pauses on focus/hover and respects reduced motion."

---

## Part 3: live regions, visual design and motion

### Live regions

Use live regions for asynchronous changes not caused by direct focus movement: "3 new chat messages", "Recording upload complete", "Search results updated".

```tsx
function StatusAnnouncer({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  );
}
```

Rules:
- `polite` for normal status; `assertive` only for urgent interruptions.
- Announce summaries, not every item in a rapidly updating list.
- Do not use live regions to compensate for broken focus management.

For a meeting chat, announce "New message from Priya" or "5 new messages" depending on the user's current location and notification settings. Do not read the entire chat while someone is presenting.

### Colour and contrast

Accessibility is not only screen readers.

- Text and essential UI affordances need sufficient contrast.
- Do not encode state by colour alone; add text/icon/shape.
- Focus rings must be visible in high contrast themes.
- Error text should be linked to the field with `aria-describedby`.

```tsx
<input
  aria-invalid={Boolean(error)}
  aria-describedby={error ? 'email-error' : undefined}
/>
{error && <p id="email-error" role="alert">Enter a valid work email.</p>}
```

`role="alert"` is assertive; use it for newly appearing validation errors after submit, not for static helper text.

### Reduced motion

Animations can cause vestibular discomfort and can slow expert keyboard users.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

For a carousel or meeting layout transition, reduced motion should mean "state changes still happen, but without unnecessary movement".

---

## Part 4: i18n is more than translation strings

Internationalization is designing the app so localization does not require code changes.

### Text expansion and layout

English is often shorter than translated text. German and Finnish can expand labels; CJK may be compact; Arabic/Hebrew require RTL layout.

Design rules:
- Avoid fixed-width buttons based on English labels.
- Let components wrap where possible.
- Use logical CSS properties: `margin-inline-start`, not `margin-left`.
- Keep icons direction-aware: arrows, back/forward, progress direction.
- Do not concatenate translated strings from fragments.

Bad:

```ts
const label = `${count} files selected`;
```

Good: use ICU-style messages or your i18n library's plural API.

```ts
const label = t('files.selected', { count });
// en: "{count, plural, one {# file selected} other {# files selected}}"
```

### RTL

At the document/app boundary:

```tsx
function LocaleShell({ locale, children }: { locale: string; children: React.ReactNode }) {
  const dir = new Intl.Locale(locale).textInfo?.direction ?? 'ltr';
  return <div lang={locale} dir={dir}>{children}</div>;
}
```

Check browser support for `Intl.Locale.textInfo`; many apps keep a locale metadata map.

RTL implications:
- Horizontal layout mirrors.
- Left/Right arrow key behavior may need product-specific choices (visual direction vs logical next/previous).
- Canvas/whiteboard coordinates usually should not mirror the data model; only UI chrome mirrors.
- Mixed text (English meeting title inside Arabic UI) needs correct `dir="auto"` in user-generated text.

### Dates, numbers and time zones

Never hand-format dates/numbers in a global product.

```ts
const date = new Intl.DateTimeFormat(locale, {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: userTimeZone,
}).format(recording.startedAt);

const duration = new Intl.NumberFormat(locale, {
  style: 'unit',
  unit: 'minute',
  unitDisplay: 'short',
}).format(42);
```

Use `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, `Intl.ListFormat`, `Intl.PluralRules` or your i18n library built on them. For Adobe Connect recordings, distinguish **meeting time zone** (when did it happen?) from **viewer time zone** (how should I display it?).

### Locale loading

Do not ship every locale to every user.

```
App bootstrap
  ├─ detect locale (URL/account/browser fallback)
  ├─ load core UI messages for locale
  ├─ render shell
  └─ lazy-load feature namespace: recordings, chat, admin, billing
```

Fallback chain example: `pt-BR → pt → en`. Missing translations should fail loudly in development and report telemetry in production.

---

## Part 5: testing strategy ⏭ *Skip for interviews*

Automated a11y tests catch obvious violations; manual testing catches interaction quality.

| Layer | What it catches | What it misses |
|---|---|---|
| ESLint / JSX a11y | missing labels, invalid ARIA props, clickable divs | runtime focus flow, actual announcements |
| Unit/component tests | focus after open/close, keyboard transitions, rendered ARIA states | screen reader phrasing, browser quirks |
| Axe/Lighthouse | common WCAG violations | full APG keyboard contract |
| Manual keyboard pass | real tab order, traps, visible focus | screen reader output |
| Screen reader smoke | names, roles, live announcements | every locale/device combination |
| i18n pseudo-locale | text expansion, missing keys | cultural correctness |

A good CI gate is: lint + unit tests for design-system primitives + axe on key flows + visual tests with pseudo-locale and RTL. Then schedule manual passes before major releases.

**Interview line:** "I do not claim accessibility from an axe score. Axe is a gate for obvious issues; keyboard and screen-reader behavior for combobox/dialog/tabs must be tested against the APG contract."

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Autocomplete | Input focus + `role="combobox"` + `aria-activedescendant` + listbox options | Matches APG model and preserves typing focus. |
| Modal | `role="dialog"`, labelled title, focus trap, inert background, return focus | Modal means outside content is temporarily unavailable. |
| Tabs | `tablist` / `tab` / `tabpanel`, arrow key navigation | Distinct panels in one context. |
| Carousel | No auto-rotation by default; pause controls; reduced motion | Prevents disorientation and noisy announcements. |
| Dynamic chat | Polite live-region summaries + unread count | Announces new info without stealing focus. |
| Global app | Locale messages by namespace, `Intl`, logical CSS, RTL tests | Avoids English/layout assumptions. |
| Data table | Semantic table for real tabular data; grid only if spreadsheet-like interactive navigation is required | ARIA grid has a heavy keyboard contract. |

### Common interview traps

- Adding ARIA roles to native elements unnecessarily and making semantics worse.
- Saying "screen-reader accessible" without a keyboard focus story.
- Building a modal that visually overlays but leaves background focusable.
- Autocomplete that moves DOM focus into options, breaking typing.
- Auto-playing carousel that ignores pause/reduced-motion.
- Concatenating translated strings or hard-coding left/right CSS.
- Relying only on automated accessibility scores.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why is semantic HTML preferable to ARIA for basic controls?</summary>

Native elements already provide roles, names, keyboard behavior, focusability and browser/assistive-tech support. ARIA only changes semantics; it does not add behavior. A clickable div with `role="button"` still needs keyboard and disabled behavior implemented manually.
</details>

<details><summary>2. In an autocomplete, why use `aria-activedescendant`?</summary>

It lets DOM focus remain on the text input while assistive tech is told which option is currently active. That preserves typing and selection behavior without moving focus into the listbox for every arrow key press.
</details>

<details><summary>3. What are the minimum focus rules for a modal dialog?</summary>

Move focus into the dialog on open, trap Tab/Shift+Tab within it, make background content unreachable/inert, close with Escape if allowed, and return focus to the trigger when closed.
</details>

<details><summary>4. When should a live region be `assertive`?</summary>

Only for urgent information that should interrupt current screen-reader output, such as a critical error. Most status updates should be `polite`, and rapidly changing content should be summarized.
</details>

<details><summary>5. What does `prefers-reduced-motion` change in a carousel?</summary>

Avoid or greatly reduce animation and auto-rotation. State can still change, but movement should not be required for understanding and should not disorient the user.
</details>

<details><summary>6. Give three i18n bugs that are not "wrong translation".</summary>

Text expansion breaking layout, hard-coded left/right in RTL, incorrect date/number/time-zone formatting, pluralization bugs, concatenated strings with wrong word order, missing locale bundle fallback.
</details>

<details><summary>7. Why should a data table not always be an ARIA grid?</summary>

A semantic `<table>` is best for read-mostly tabular data. `role="grid"` implies spreadsheet-like interaction and a much heavier keyboard contract. Use it only when cells are actively navigable/editable.
</details>

<details><summary>8. What would you test manually before shipping an accessible modal/autocomplete component?</summary>

Keyboard-only open/use/close flow, visible focus, focus return, screen-reader names/roles/states, Escape/Tab behavior, no background focus leak, and behavior in at least one RTL or pseudo-localized layout if text is involved.
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
| WAI-ARIA APG Combobox pattern | Read the pattern page, keyboard interaction, roles/states/properties, and examples | https://www.w3.org/WAI/ARIA/apg/patterns/combobox/ (**open in browser**) · ~25 min |
| WAI-ARIA APG Dialog (Modal) pattern | Read keyboard interaction and WAI-ARIA roles/states/properties | https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ (**open in browser**) · ~15 min |
| WAI-ARIA APG Tabs pattern | Read keyboard interaction and automatic vs manual activation guidance | https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ (**open in browser**) · ~15 min |
| WAI-ARIA APG Carousel pattern | Read rotation control, keyboard interaction and live-region guidance | https://www.w3.org/WAI/ARIA/apg/patterns/carousel/ (**open in browser**) · ~15 min |
| [MDN: Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl) | "Description", "locales argument", "options argument", "Locale identification and negotiation", "Formatting dates and numbers" | ~25 min |
| [MDN: ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions) | "Live regions", "Roles with implicit live region attributes", `aria-atomic`, `aria-relevant` examples | ~15 min |
| [MDN: Color contrast](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG/Perceivable/Color_contrast) | "Examples", "Good Contrast", "Bad Contrast", "Related WCAG success criteria" | ~10 min |

**Connects to:** FE1 RADIO framework · FE3 State + data model · FE5 Performance (reduced motion, virtualization) · FE9 Media (captions) · Questions: Autocomplete (#14), modal/tabs/carousel machine coding, Adobe Connect meeting UI
