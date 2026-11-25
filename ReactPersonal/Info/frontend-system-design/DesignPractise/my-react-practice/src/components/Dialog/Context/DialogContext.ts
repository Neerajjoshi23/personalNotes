import {createContext} from "react";
import React from "react"; 
type DialogContextType = {
    open: boolean;
    setOpen: (open: boolean) => void;
    titleId: string;
    descriptionId: string;
};
export const DialogContext = createContext<DialogContextType | undefined>(undefined);
export const useDialogContext = () => {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error(`Dialog context is not available. Make sure to wrap your component with <Dialog.Root>`);
  }
  return ctx;
}