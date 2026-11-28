import {useState, useEffect} from 'react';
type ControllableStateOptions<T>={
    value?: T;
    defaultValue: T;
    onChange?: (value: T) => void;
};
export function useControllableState<T>(options: ControllableStateOptions<T>): [T, (value: T) => void] {
  const { value, defaultValue, onChange } = options;
  const [state, setState] = useState<T>(value !== undefined ? value : defaultValue);
  const isControlled = value !== undefined;
  const setValue = (newValue: T) => {
    if (!isControlled) {
      setState(newValue);
    }
    onChange?.(newValue);
  };
  return [state, setValue] as const;
}