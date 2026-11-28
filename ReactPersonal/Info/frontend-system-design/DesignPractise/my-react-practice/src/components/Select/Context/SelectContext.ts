import {createContext} from "react";
import React from "react"; 
type SelectContextType = {
    open: boolean;
    setOpen: (open: boolean) => void;
    value: string;
    selectOption: (value: string) => void;
    highlightedValue: string;
    setHighlightedValue: (value: string) => void;
    items: Array<{ value: string; label: string; disabled?: boolean }>;
    registerItem: (item: { value: string; label: string; disabled?: boolean }) => void;
    listboxId: string;
    triggerRef: React.RefObject<HTMLButtonElement | null>;
};
export const SelectContext = createContext<SelectContextType | undefined>(undefined);
export const useSelectContext = () => {
  const ctx = React.useContext(SelectContext);
  if (!ctx) {
    throw new Error(`Select context is not available. Make sure to wrap your component with <Select.Root>`);
  }
  return ctx;
}