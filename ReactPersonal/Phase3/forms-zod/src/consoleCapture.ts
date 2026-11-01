export type LogLevel = "log" | "info" | "warn" | "error";

export type LogLine = {
  id: number;
  level: LogLevel;
  text: string;
};

function formatArg(arg: unknown): string {
  if (typeof arg === "string") {
    return arg;
  }

  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}`;
  }

  try {
    const replacer = (_key: string, value: unknown) => {
      if (value === undefined) return "undefined";
      if (typeof value === "bigint") return `${value}n`;
      if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;
      if (typeof value === "number" && Number.isNaN(value)) return "NaN";
      if (value instanceof Map) return Object.fromEntries(value);
      if (value instanceof Set) return [...value];
      return value;
    };

    const compact = JSON.stringify(arg, replacer);

    if (compact === undefined) {
      return String(arg);
    }

    // short values stay on one line, long ones get indented
    return compact.length <= 80 ? compact : JSON.stringify(arg, replacer, 2);
  } catch {
    return String(arg);
  }
}

let nextId = 1;

// Patches console.* so lessons that console.log can be shown on the page.
// Returns a function that restores the original console.
export function captureConsole(onLine: (line: LogLine) => void): () => void {
  const levels: LogLevel[] = ["log", "info", "warn", "error"];
  const originals = new Map<LogLevel, (...args: unknown[]) => void>();

  for (const level of levels) {
    const original = console[level].bind(console);
    originals.set(level, original);

    console[level] = (...args: unknown[]) => {
      original(...args); // still visible in DevTools
      onLine({ id: nextId++, level, text: args.map(formatArg).join(" ") });
    };
  }

  return () => {
    for (const level of levels) {
      console[level] = originals.get(level)!;
    }
  };
}
