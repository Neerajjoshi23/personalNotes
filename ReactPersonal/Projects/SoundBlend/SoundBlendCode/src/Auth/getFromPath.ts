type FromState = {
  from?: { pathname: string; search?: string; hash?: string };
} | null;

export const getFromPath = (state: unknown): string => {
  const from = (state as FromState)?.from;
  if (!from) return "/";
  return `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
};
