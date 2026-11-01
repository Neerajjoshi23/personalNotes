// ============================================================================
// 0.18  DEBOUNCE & THROTTLE
// (javascript.info/call-apply-decorators + /task/debounce + /task/throttle)
// ============================================================================
// Run:  node 18_debounce_throttle.js
//
// WHAT YOU NEED TO LEARN FROM THIS FILE
//   1. Both are DECORATORS: take a function, return a wrapped function
//   2. Debounce  = wait until calls STOP for `ms`, then run ONCE with the LAST args
//   3. Throttle  = run at most ONCE per `ms`, and don't lose the latest call (trailing)
//   4. Closure holds the timer / state between calls
//   5. Keeping `this` and arguments with func.apply(this, args)
//   6. When to use which (search box vs scroll/resize)
//   7. How it maps to React: useDebounce hook, and cleanup of the timer
// ============================================================================

const start = Date.now();
const t = () => `${String(Date.now() - start).padStart(4)}ms`;

// ---------------------------------------------------------------------------
// EXAMPLE 1: debounce
// ---------------------------------------------------------------------------
function debounce(func, ms) {
  let timeoutId = null; // CLOSURE: survives between calls, one timer per debounced function

  return function (...args) {
    // Every call cancels the previous pending call...
    if (timeoutId) clearTimeout(timeoutId);

    // ...and schedules a new one. Only the LAST call in a burst survives.
    timeoutId = setTimeout(() => {
      // apply keeps the caller's `this` (arrow fn captures the wrapper's `this`)
      func.apply(this, args);
    }, ms);
  };
}

// Search box: typing "r","re","rea","reac","react" quickly -> ONE request for "react".
const search = debounce((query) => {
  console.log(`${t()}  DEBOUNCED search ->`, query);
}, 200);

["r", "re", "rea", "reac", "react"].forEach((text, i) => {
  setTimeout(() => search(text), i * 50); // keystrokes every 50ms
});
// Expected: ONE log at about 400ms (last keystroke at 200ms + 200ms quiet) with "react".

// GOTCHA: the debounced function must be created ONCE. In a React component:
//   const onChange = debounce(fn, 300)       // re-created on every render -> new timer each time -> no debounce
// Use useMemo/useRef/useCallback, or better the useDebounce(value, delay) hook.

// ---------------------------------------------------------------------------
// EXAMPLE 2: throttle (with trailing call)
// ---------------------------------------------------------------------------
function throttle(func, ms) {
  let isThrottled = false;
  let savedArgs;
  let savedThis;

  function wrapper(...args) {
    if (isThrottled) {
      // In cooldown: don't run, but REMEMBER the latest call.
      savedArgs = args;
      savedThis = this;
      return;
    }

    // Run immediately (leading edge)
    func.apply(this, args);
    isThrottled = true;

    setTimeout(() => {
      isThrottled = false; // cooldown over

      if (savedArgs) {
        // Replay the LAST ignored call so the final state is never lost (trailing edge).
        wrapper.apply(savedThis, savedArgs);
        savedArgs = savedThis = undefined;
      }
    }, ms);
  }

  return wrapper;
}

// Scroll/resize: event fires hundreds of times per second, but we want max 1 run / 300ms.
const onScroll = throttle((position) => {
  console.log(`${t()}  THROTTLED scroll ->`, position);
}, 300);

// Simulate scroll events every 100ms for 1 second.
for (let i = 1; i <= 10; i++) {
  setTimeout(() => onScroll(i * 100), 400 + i * 100);
}
// Expected: runs immediately on the first call, then about every 300ms,
// and the last position (1000) is NOT lost thanks to the trailing call.

// ---------------------------------------------------------------------------
// EXAMPLE 3: debounce vs throttle: side by side
// ---------------------------------------------------------------------------
// Same input stream: 20 events, one every 50ms (1 second of continuous activity).
//
//   raw       : 20 calls
//   debounce  : 1 call AFTER the stream stops (nothing happens while user keeps going!)
//   throttle  : about 1 call per interval WHILE the stream runs
//
// Debounce: search-as-you-type, autosave, window resize "final size", form validation.
// Throttle: scroll position tracking, mousemove, drag, infinite-scroll checks, rate-limited clicks.
//
// Production gotcha: debounce on a continuous stream NEVER fires until it stops.
// If you want updates DURING the activity (scrolling progress bar), you need throttle.

// ---------------------------------------------------------------------------
// EXAMPLE 4: `this` preservation
// ---------------------------------------------------------------------------
class Counter {
  count = 0;

  constructor() {
    // Wrapper's `this` is whatever calls it, so bind or call as a method.
    this.increment = debounce(this.increment.bind(this), 100);
  }

  increment() {
    this.count++;
    console.log(`${t()}  Counter.count =`, this.count);
  }
}

const counter = new Counter();
counter.increment();
counter.increment();
counter.increment();
// Expected: count = 1 (three calls collapsed into one).

// ---------------------------------------------------------------------------
// REACT MAPPING (your SoundBlend useDebounce.ts)
// ---------------------------------------------------------------------------
// function useDebounce<T>(value: T, delay: number): T {
//   const [debounced, setDebounced] = useState(value);
//
//   useEffect(() => {
//     const id = setTimeout(() => setDebounced(value), delay);
//     return () => clearTimeout(id);   // <- THE debounce: cleanup cancels the previous timer
//   }, [value, delay]);
//
//   return debounced;
// }
//
// useEffect cleanup plays the role of clearTimeout(timeoutId) above.

// ---------------------------------------------------------------------------
// INTERVIEW TAKEAWAYS
// ---------------------------------------------------------------------------
// - Debounce vs throttle in one sentence?
//     Debounce waits for silence and fires once; throttle fires at a steady maximum rate.
// - Implement debounce on a whiteboard:
//     closure with timeoutId, clearTimeout on each call, setTimeout(func.apply(this,args), ms).
// - Why does the trailing call matter in throttle?
//     Without it the final value (last scroll position) can be dropped.
// - Why is a debounced handler inside a React component often broken?
//     It is re-created each render, so its timer state resets. Memoize it, or debounce the value.
