const parser = new DOMParser();

// Jamendo returns HTML entities in names (e.g. "Pop &amp; Deep House")
export function decodeHtml(value: string): string {
  if (!value.includes("&")) return value;
  return (
    parser.parseFromString(value, "text/html").documentElement.textContent ??
    value
  );
}
