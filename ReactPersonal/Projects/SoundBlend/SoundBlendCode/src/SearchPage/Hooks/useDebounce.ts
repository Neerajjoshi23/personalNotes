import { useState, useEffect } from "react";
export default function useDebounce(search: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState<string>(search);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedValue(search), delay);
    return () => clearTimeout(id);
  }, [search, delay]);

  return debouncedValue;
}
