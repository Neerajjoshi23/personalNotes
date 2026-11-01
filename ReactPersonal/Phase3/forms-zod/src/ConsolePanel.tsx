import { useEffect, useRef } from "react";
import type { LogLine } from "./consoleCapture";

type ConsolePanelProps = {
  lines: LogLine[];
  onClear: () => void;
  emptyText: string;
};

export function ConsolePanel({ lines, onClear, emptyText }: ConsolePanelProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [lines.length]);

  return (
    <div className="console">
      <div className="console-head">
        <span>Console output</span>
        <button type="button" onClick={onClear}>
          Clear
        </button>
      </div>

      <div className="console-body">
        {lines.length === 0 && <p className="muted">{emptyText}</p>}

        {lines.map((line) => (
          <pre key={line.id} className={`console-line ${line.level}`}>
            {line.text}
          </pre>
        ))}

        <div ref={endRef} />
      </div>
    </div>
  );
}
