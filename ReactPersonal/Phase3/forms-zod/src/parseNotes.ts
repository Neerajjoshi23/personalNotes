export type Takeaway = {
  question: string;
  answer: string;
};

const isDivider = (text: string) => /^[=-]{5,}$/.test(text.trim());

// "// text" -> "text"; null when the line is not a comment
function commentText(line: string): string | null {
  const trimmed = line.trimStart();
  return trimmed.startsWith("//") ? trimmed.replace(/^\/\/ ?/, "") : null;
}

// Pulls the numbered list under "WHAT YOU NEED TO LEARN FROM THIS FILE" in the header comment.
export function extractLearnPoints(source: string): string[] {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line.includes("WHAT YOU NEED TO LEARN"));
  const points: string[] = [];

  if (start === -1) {
    return points;
  }

  for (const line of lines.slice(start + 1)) {
    const text = commentText(line);

    if (text === null || isDivider(text)) {
      break;
    }

    const numbered = text.match(/^\s*\d+\.\s+(.*)$/);

    if (numbered) {
      points.push(numbered[1]);
    } else if (text.trim() && points.length > 0) {
      points[points.length - 1] += ` ${text.trim()}`; // continuation line
    }
  }

  return points;
}

// Pulls the "- "question?"  /  answer" pairs from the INTERVIEW TAKEAWAYS footer.
export function extractTakeaways(source: string): Takeaway[] {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line.includes("INTERVIEW TAKEAWAYS"));
  const items: Takeaway[] = [];

  if (start === -1) {
    return items;
  }

  for (const line of lines.slice(start + 1)) {
    if (line.trim() === "") {
      continue;
    }

    const text = commentText(line);

    if (text === null) {
      break;
    }

    if (isDivider(text) || text.trim() === "DONE") {
      continue;
    }

    if (text.startsWith("- ")) {
      items.push({ question: text.slice(2).replace(/^"|"$/g, ""), answer: "" });
    } else if (items.length > 0) {
      const last = items[items.length - 1];
      last.answer = `${last.answer} ${text.trim()}`.trim();
    }
  }

  return items;
}
