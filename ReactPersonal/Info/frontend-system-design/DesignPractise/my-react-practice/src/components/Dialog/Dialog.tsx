// src/components/Dialog/Dialog.tsx
import React, { useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DialogContext, useDialogContext } from './Context/DialogContext';
import { useControllableState } from './Hooks/useControllableState';

type DialogRootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

/* ============================================================================
 * 1. Dialog.Root — State Ownership & Auto-Wired Accessibility IDs
 * ============================================================================
 * INTERVIEW CARRY-FORWARD:
 * - Compound Components + Context: Avoids prop explosion and works at ANY
 *   nesting depth (unlike React.Children.map + cloneElement, which breaks if
 *   a consumer wraps children in a layout <div>).
 * - Controlled + Uncontrolled (`useControllableState`): Supports zero-config
 *   uncontrolled usage (`defaultOpen`) AND parent-controlled async workflows
 *   (`open` + `onOpenChange`) with one single source of truth.
 * - Deterministic `useId()`: Auto-links Title & Description to the dialog
 *   without SSR hydration mismatches (never use Math.random() for IDs).
 */
function Root({ open, defaultOpen = false, onOpenChange, children }: DialogRootProps) {
  const [isOpen, setIsOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const titleId = useId();
  const descriptionId = useId();

  // Memoize Context value so unrelated parent re-renders don't re-render all sub-parts
  const value = useMemo(
    () => ({ open: isOpen, setOpen: setIsOpen, titleId, descriptionId }),
    [isOpen, setIsOpen, titleId, descriptionId],
  );

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

/* ============================================================================
 * 2. Dialog.Trigger — Element Composition (`asChild`)
 * ============================================================================
 * INTERVIEW CARRY-FORWARD:
 * - `asChild` Pattern: Prevents invalid nested `<button><button /></button>`
 *   when consumers pass their own styled `<Button>`. Clones the child and merges
 *   ARIA + onClick (preserving the child's existing onClick handler).
 * - Child Contract: Any custom child passed to `asChild` must spread `...props`
 *   and forward its `ref`.
 */
type TriggerProps = React.ComponentPropsWithRef<'button'> & {
  asChild?: boolean;
};

function Trigger({ asChild = false, children, onClick, ...props }: TriggerProps) {
  const { open, setOpen } = useDialogContext();

  const handleTriggerClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    setOpen(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      ...props,
      'aria-haspopup': 'dialog',
      'aria-expanded': open,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        (children.props as { onClick?: (ev: React.MouseEvent<HTMLButtonElement>) => void }).onClick?.(e);
        handleTriggerClick(e);
      },
    });
  }

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={handleTriggerClick}
      {...props}
    >
      {children}
    </button>
  );
}

/* ============================================================================
 * 3. Dialog.Content — Portal, Focus Trap, Background Inert & Escape Lifecycle
 * ============================================================================
 * INTERVIEW CARRY-FORWARD:
 * - `createPortal(..., document.body)`: Escapes parent `overflow: hidden` and
 *   low `z-index` stacking contexts in the DOM while keeping React Context &
 *   event bubbling intact along the React tree.
 * - `aria-modal="true"` Trap: Only set `aria-modal="true"` if you actually lock
 *   the background (`inert` on `#root` + Tab focus trap); otherwise screen-reader
 *   users can still reach background elements, which is a WCAG failure.
 * - Focus Restoration (Add-on): Save `document.activeElement` before opening and
 *   call `.focus()` in cleanup so keyboard users return right back to Trigger.
 * - Nested Modals (Verbal Callout): For stacked modals, keep a module-level
 *   dialog stack so `Escape` closes only the topmost dialog.
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Content({ children, className, ...props }: React.ComponentPropsWithRef<'div'>) {
  const { open, setOpen, titleId, descriptionId } = useDialogContext();
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // 1. Freeze background scroll & make background page unreachable to Tab/screen readers
    const prevOverflow = document.body.style.overflow;
    const appRoot = document.getElementById('root');
    document.body.style.overflow = 'hidden';
    appRoot?.setAttribute('inert', '');

    // 2. Move initial focus inside dialog (for destructive confirms, focus Cancel first)
    const firstFocusable =
      contentRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? contentRef.current;
    firstFocusable?.focus();

    // 3. Keyboard contract: Escape closes; Tab / Shift+Tab cycle strictly inside dialog
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }

      if (e.key === 'Tab' && contentRef.current) {
        const focusables = Array.from(
          contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      appRoot?.removeAttribute('inert');
    };
  }, [open, setOpen]);

  // Lazy unmount when closed: avoids mounting heavy modal children until opened
  if (!open) return null;

  return createPortal(
    <div
      className="dialog-overlay"
      // e.target === e.currentTarget ensures clicks INSIDE dialog-content don't dismiss it
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={['dialog-content', className].filter(Boolean).join(' ')}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ============================================================================
 * 4. Title, Description & Close — Semantic Sub-Parts
 * ============================================================================
 * INTERVIEW CARRY-FORWARD:
 * - Extend native props (`ComponentPropsWithRef<'h2'>`) so `className`, `style`,
 *   `data-*`, and `ref` work automatically without re-declaring HTML attributes.
 */
function Title({ children, ...props }: React.ComponentPropsWithRef<'h2'>) {
  const { titleId } = useDialogContext();
  return (
    <h2 id={titleId} {...props}>
      {children}
    </h2>
  );
}

function Description({ children, ...props }: React.ComponentPropsWithRef<'p'>) {
  const { descriptionId } = useDialogContext();
  return (
    <p id={descriptionId} {...props}>
      {children}
    </p>
  );
}

function Close({ asChild = false, children, onClick, ...props }: TriggerProps) {
  const { setOpen } = useDialogContext();

  const handleClose = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    setOpen(false);
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    return React.cloneElement(child, {
      ...props,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        (child.props.onClick as ((ev: React.MouseEvent<HTMLButtonElement>) => void) | undefined)?.(e);
        handleClose(e);
      },
    });
  }

  return (
    <button type="button" onClick={handleClose} {...props}>
      {children}
    </button>
  );
}

// Single namespaced export -> clean autocomplete (<Dialog.Root>, <Dialog.Trigger>, etc.)
export const Dialog = { Root, Trigger, Content, Title, Description, Close };
