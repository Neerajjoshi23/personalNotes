import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CodeBlock } from "./CodeBlock";
import { ConsolePanel } from "./ConsolePanel";
import { captureConsole, type LogLine } from "./consoleCapture";
import { getSource, type Lesson } from "./lessons";
import { extractLearnPoints, extractTakeaways } from "./parseNotes";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function LessonPage({ lesson }: { lesson: Lesson }) {
  const source = useMemo(() => getSource(lesson), [lesson]);
  const learnPoints = useMemo(() => extractLearnPoints(source), [source]);
  const takeaways = useMemo(() => extractTakeaways(source), [source]);

  return (
    <article>
      <header className="lesson-head">
        <span className="badge">{lesson.id}</span>
        <div>
          <h1>{lesson.title}</h1>
          <code className="muted">{lesson.file}</code>
        </div>
      </header>

      {learnPoints.length > 0 && (
        <section className="card">
          <h2>What you need to learn</h2>
          <ol>
            {learnPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ol>
        </section>
      )}

      <div className="split">
        <section className="pane">
          <h2>Source</h2>
          <CodeBlock code={source} />
        </section>

        <section className="pane sticky">
          {lesson.demo ? <LiveDemo demo={lesson.demo} /> : <ScriptRunner file={lesson.file} />}
        </section>
      </div>

      {takeaways.length > 0 && (
        <section className="card">
          <h2>Interview takeaways</h2>
          <dl>
            {takeaways.map((item, index) => (
              <div key={index} className="qa">
                <dt>{item.question}</dt>
                <dd>{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </article>
  );
}

function useCapturedLines() {
  const [lines, setLines] = useState<LogLine[]>([]);

  // Deferred + capped: lessons may console.log during render, and a synchronous
  // setState there would re-render the demo and log again (infinite loop).
  const append = useCallback((line: LogLine) => {
    queueMicrotask(() => setLines((prev) => [...prev.slice(-199), line]));
  }, []);

  const clear = useCallback(() => setLines([]), []);
  return { lines, append, clear };
}

// Renders the real exported component and mirrors its console.log calls (render logs, submit handlers etc.).
function LiveDemo({ demo: Demo }: { demo: React.ComponentType }) {
  const { lines, append, clear } = useCapturedLines();

  // Same element instance every time, so a new console line doesn't re-render the demo
  const demoElement = useMemo(() => <Demo />, [Demo]);

  useEffect(() => captureConsole(append), [append]);

  return (
    <>
      <h2>Live demo</h2>
      <div className="demo">{demoElement}</div>
      <ConsolePanel lines={lines} onClear={clear} emptyText="Submit or interact with the form: console.log output shows here." />
    </>
  );
}

// Executes the lesson script in the browser and shows what it console.logs.
function ScriptRunner({ file }: { file: string }) {
  const { lines, append, clear } = useCapturedLines();
  const [running, setRunning] = useState(false);
  const startedRef = useRef(false);

  const run = useCallback(async () => {
    setRunning(true);
    clear();
    const restore = captureConsole(append);

    try {
      // A fresh query string makes the browser re-evaluate the module on every run.
      await import(/* @vite-ignore */ `/${file}?run=${Date.now()}`);
      await sleep(900); // let async main() functions finish logging
    } catch (error) {
      console.error("Script crashed:", error);
    } finally {
      restore();
      setRunning(false);
    }
  }, [append, clear, file]);

  useEffect(() => {
    if (startedRef.current) {
      return; // StrictMode runs effects twice in dev
    }

    startedRef.current = true;
    void run();
  }, [run]);

  return (
    <>
      <div className="row">
        <h2>Script output</h2>
        <button type="button" className="primary" onClick={() => void run()} disabled={running}>
          {running ? "Running..." : "▶ Run again"}
        </button>
      </div>
      <p className="muted">
        This file is a plain script (<code>npm run zod:{file.slice(0, 2)}</code> in a terminal). Here it runs in the browser and its
        console.log output is captured below.
      </p>
      <ConsolePanel lines={lines} onClear={clear} emptyText={running ? "Running..." : "No output."} />
    </>
  );
}
