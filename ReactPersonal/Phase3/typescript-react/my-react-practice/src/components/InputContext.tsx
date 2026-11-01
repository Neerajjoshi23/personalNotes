import React, {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from "react";

// Types
type InputState = {
  input: string;
};

type InputAction =
  | { type: "SET_INPUT"; payload: string }
  | { type: "UPDATE_INPUT"; payload: string }
  | { type: "APPEND_INPUT"; payload: string }
  | { type: "PREPEND_INPUT"; payload: string }
  | { type: "RESET_INPUT" }; // Reset doesn't need a payload

// Reducer Function
function inputReducer(state: InputState, action: InputAction): InputState {
  switch (action.type) {
    case "SET_INPUT":
    case "UPDATE_INPUT":
      return { input: action.payload };
    case "APPEND_INPUT":
      return { input: state.input + action.payload };
    case "PREPEND_INPUT":
      return { input: action.payload + state.input };
    case "RESET_INPUT":
      return { input: "" };
    default:
      return state;
  }
}

// Create Context
const InputContext = createContext<{
  state: InputState;
  dispatch: React.Dispatch<InputAction>;
} | null>(null);

// Context Provider Component
export function InputProvider({
  children,
  initialValue = "",
}: {
  children: ReactNode;
  initialValue?: string;
}) {
  const [state, dispatch] = useReducer(inputReducer, { input: initialValue });

  return (
    <InputContext.Provider value={{ state, dispatch }}>
      {children}
    </InputContext.Provider>
  );
}

// Custom Hook for easier consumption
export function useInputContext(): {
  state: InputState;
  dispatch: React.Dispatch<InputAction>;
} {
  const context = useContext(InputContext);
  return {
    state: context!.state,
    dispatch: context!.dispatch,
  };
}
