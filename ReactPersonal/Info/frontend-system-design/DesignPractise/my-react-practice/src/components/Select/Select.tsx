// src/components/Select/Select.tsx
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SelectContext, useSelectContext } from "./Context/SelectContext";
import { useControllableState } from './Hooks/useControllableState';

/* 1. Select.Root — Dual Controllable State (open + value) & Option Registry */
type SelectRootProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

function Root({
  value,
  defaultValue = '',
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  children,
}: SelectRootProps) {
  const [selectedValue, setSelectedValue] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const [isOpen, setIsOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  // Internal state: which option is currently highlighted via keyboard/hover
  const [highlightedValue, setHighlightedValue] = useState<string>(selectedValue);
  // Ordered registry of { value, label, disabled } so ArrowUp/ArrowDown & <Select.Value /> work
  const [items, setItems] = useState<Array<{ value: string; label: string; disabled?: boolean }>>([]);

  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

    const registerItem = React.useCallback(
    (item: { value: string; label: string; disabled?: boolean }) => {
        setItems((prev) => {
        const idx = prev.findIndex((i) => i.value === item.value);
        if (idx === -1) return [...prev, item];
        if (prev[idx].label === item.label && prev[idx].disabled === item.disabled) return prev;
        const next = [...prev];
        next[idx] = item;
        return next;
        });
        // Do NOT delete on unmount when Content closes — otherwise Select.Value loses the label!
    },
    [],
    );

  const selectOption = React.useCallback(
    (nextValue: string) => {
      setSelectedValue(nextValue);
      setIsOpen(false);
      // Restore focus back to Trigger on selection
      requestAnimationFrame(() => triggerRef.current?.focus());
    },
    [setSelectedValue, setIsOpen],
  );

  const   ctx = useMemo(
    () => ({
      open: isOpen,
      setOpen: setIsOpen,
      value: selectedValue,
      selectOption,
      highlightedValue,
      setHighlightedValue,
      items,
      registerItem,
      listboxId,
      triggerRef,
    }),
    [isOpen, setIsOpen, selectedValue, selectOption, highlightedValue, items, registerItem, listboxId],
  );

  return <SelectContext.Provider value={ctx}>{children}</SelectContext.Provider>;
}

/* 2. Select.Trigger — Keeps DOM Focus + Drives Keyboard Navigation */
function Trigger({ children, onKeyDown, onClick, ...props }: React.ComponentPropsWithRef<'button'>) {
  const { open, setOpen, value, selectOption, highlightedValue, setHighlightedValue, items, listboxId, triggerRef } =
    useSelectContext();

  const enabledItems = items.filter((i) => !i.disabled);
  const activeOptionId = open && highlightedValue ? `${listboxId}-opt-${highlightedValue}` : undefined;

  const moveHighlight = (step: 1 | -1) => {
    if (enabledItems.length === 0) return;
    const idx = enabledItems.findIndex((i) => i.value === highlightedValue);
    const nextIdx = idx === -1 ? 0 : (idx + step + enabledItems.length) % enabledItems.length;
    setHighlightedValue(enabledItems[nextIdx].value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlightedValue(value || enabledItems[0]?.value || '');
      } else {
        moveHighlight(1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlightedValue(value || enabledItems[enabledItems.length - 1]?.value || '');
      } else {
        moveHighlight(-1);
      }
    } else if ((e.key === 'Enter' || e.key === ' ') && open) {
      e.preventDefault();
      if (highlightedValue) selectOption(highlightedValue);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <button
      ref={triggerRef}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listboxId}
      aria-activedescendant={activeOptionId}
      onClick={(e) => {
        onClick?.(e);
        setOpen(!open);
        if (!open) setHighlightedValue(value || enabledItems[0]?.value || '');
      }}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </button>
  );
}

/* 3. Select.Value — Displays Selected Label or Placeholder */
function Value({ placeholder = 'Select an option…' }: { placeholder?: string }) {
  const { value, items } = useSelectContext();
  const selectedLabel = items.find((i) => i.value === value)?.label;
  return <span>{selectedLabel ?? placeholder}</span>;
}

/* 4. Select.Content — Portal Positioned Below Trigger + Outside-Click Close */
function Content({ children, className, ...props }: React.ComponentPropsWithRef<'div'>) {
  const { open, setOpen, listboxId, triggerRef } = useSelectContext();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open) return;

    // Position popup anchored to Trigger
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
    }

    // Close on outside click (ignoring clicks on Trigger or inside Content)
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!contentRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open, setOpen, triggerRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={contentRef}
      id={listboxId}
      role="listbox"
      style={{ position: 'absolute', top: coords.top, left: coords.left, minWidth: coords.width }}
      className={['select-content', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
}

/* 5. Select.Item — Semantic Option with Highlight & Selection States */
type SelectItemProps = React.ComponentPropsWithRef<'div'> & {
  value: string;
  disabled?: boolean;
  children: string;
};

function Item({ value, disabled = false, children, className, ...props }: SelectItemProps) {
  const {
    value: selectedValue,
    selectOption,
    highlightedValue,
    setHighlightedValue,
    registerItem,
    listboxId,
  } = useSelectContext();

  useEffect(() => registerItem({ value, label: children, disabled }), [registerItem, value, children, disabled]);

  const isSelected = selectedValue === value;
  const isHighlighted = highlightedValue === value;

  return (
    <div
      id={`${listboxId}-opt-${value}`}
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      data-state={isSelected ? 'checked' : 'unchecked'}
      data-highlighted={isHighlighted ? '' : undefined}
      onMouseEnter={() => !disabled && setHighlightedValue(value)}
      onClick={() => !disabled && selectOption(value)}
      className={['select-item', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

export const Select = { Root, Trigger, Value, Content, Item };
