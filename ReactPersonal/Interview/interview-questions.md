# Senior React / JS / TS — Interview Questions (with reference answers)

Re-verified 2026-10-20 against these sources — every **question** here appears in at least one of them; the **answers** are written by me in spoken tone for quick revision (click a question to open it):

- GreatFrontEnd: Top 50 JavaScript questions, Top 30 React questions, senior TypeScript guide, JS coding list
- h5bp Front-end Developer Interview Questions (JS, general, HTML, CSS lists)
- Frontend Interview Handbook (utility functions / machine coding)
- playboxjs Top 50 React senior, PracHub senior React guide
- A real Razorpay senior-frontend interview write-up (5 rounds)
- LeetCode Discuss blocks automated fetching (403), so no direct LeetCode posts were read.

I deliberately left out the 256-question sudheerj React list: it's mostly beginner-level and exactly the bloat to avoid.

**How to use it:** read 5–7 questions a day, say the answer out loud before opening it, then do one Part 4 solution a few times a week without peeking. Parts: 1 JavaScript · 2 React · 3 TypeScript · 4 coding-round implementations · 5 browser/CSS fundamentals · 6 behavioral.

## How the rounds usually run (senior frontend)

| Round | Length | What they test |
|---|---|---|
| Recruiter screen | 20–30 min | Experience summary, why this role |
| Technical screen | 45–60 min | Spoken JS / React / TS fundamentals — "explain why" |
| JS coding round | 60–90 min | Utilities and polyfills from scratch (debounce, Promise.all, curry, deepClone) |
| Machine coding | 60–90 min | Build a UI feature in React (autocomplete, todo, tabs, modal, pagination) |
| Frontend system design | 45–60 min | Component boundaries, state ownership, data flow, performance trade-offs |
| Behavioral | 45 min | Stories with outcomes (STAR) |

What changes at senior level: they stop asking "what is X" and ask "this code is broken or too permissive — why, and what would you do?"

---

# Part 1 — JavaScript

<details>
<summary>JS1. Explain the event loop. Microtasks vs macrotasks?</summary>

- JS runs one thing at a time on the **call stack**. Async work (timers, network, DOM events) is handled by the host, and its callbacks wait in queues.
- When the stack is empty, the event loop first drains the **entire microtask queue** (promise callbacks, queueMicrotask, MutationObserver), then may render, then takes **one macrotask** (setTimeout, I/O, UI events), and repeats.
- Microtasks queued by microtasks also run before anything else — so a promise loop can starve rendering.

```js
console.log("1 sync");

setTimeout(() => console.log("4 macrotask"), 0);

Promise.resolve().then(() => console.log("3 microtask"));

console.log("2 sync");
// Order: 1, 2, 3, 4
```

**Follow-up they ask:** "Where does async/await code after the await run?" → as a microtask continuation.

</details>

<details>
<summary>JS2. What is a closure? Practical use and drawback?</summary>

- A function that keeps access to the variables of the scope where it was **created**, even after that scope returned.
- Uses: private state, factories, memoize, debounce, event handlers, React hooks (every render's functions close over that render's props/state).
- Drawback: the captured scope stays alive as long as the function does, so a long-lived closure can retain big objects (memory leak) — and in React, an old closure can see **stale** values.

```js
function makeCounter() {
  let count = 0; // private, only reachable through the returned functions

  return {
    inc: () => ++count,
    get: () => count,
  };
}

const c = makeCounter();
c.inc();
c.inc();
console.log(c.get()); // 2
```

**Classic trap:** var in a loop with setTimeout prints the final value; let creates a new binding per iteration.

</details>

<details>
<summary>JS3. How does "this" work? List the binding rules.</summary>

Priority order, highest first:

1. **new** — this is the freshly created object.
2. **Explicit** — call / apply / bind set it.
3. **Implicit** — obj.method() sets this to obj.
4. **Default** — plain call: undefined in strict mode, global otherwise.

- **Arrow functions** have no own this — they take it lexically from the enclosing scope, and call/bind can't change it.
- Losing this: pulling a method off an object (const f = obj.method) drops the implicit binding.

```js
const user = {
  name: "Neeraj",
  regular() {
    return this?.name;
  },
  arrow: () => typeof this, // lexical this, NOT user
};

const detached = user.regular;

console.log(user.regular()); // "Neeraj"
console.log(detached()); // undefined (lost implicit binding)
```

</details>

<details>
<summary>JS4. Prototypal inheritance vs class inheritance? What does the class keyword really do?</summary>

- Every object has an internal [[Prototype]] link. Property lookup walks that chain until found or null.
- **class** is syntax over this: methods live on the constructor's prototype, **extends** links one prototype to another, **super** calls up the chain.
- Objects inherit from **objects**, not from blueprints — you can even do Object.create(someObject).
- Instance fields are per-object; methods are shared on the prototype (memory-efficient).

```js
const animal = {
  speak() {
    return `${this.name} makes a sound`;
  },
};

const dog = Object.create(animal);
dog.name = "Rex";

console.log(dog.speak()); // found by walking dog -> animal
console.log(Object.getPrototypeOf(dog) === animal); // true
```

**Follow-up:** "Why not extend built-in prototypes?" → global side effects, collisions with future engine features and other libraries.

</details>

<details>
<summary>JS5. Promises: states, chaining, and the combinators (all / allSettled / race / any)?</summary>

- A promise is **pending → fulfilled or rejected**, and settles once.
- then returns a **new** promise; returning a value or promise from a handler feeds the next link; a thrown error skips to the next catch.
- **all**: fulfills with all values, rejects on the **first** rejection.
- **allSettled**: never rejects, gives a status per item.
- **race**: first to settle (either way) wins.
- **any**: first to **fulfill**; rejects with AggregateError only if all reject.
- async functions always return a promise; await just unwraps it.

```js
const results = await Promise.allSettled([
  fetch("/a"),
  fetch("/b"),
]);

results.forEach((r) => {
  console.log(r.status); // "fulfilled" | "rejected"
});
```

**Gotcha:** await in a for loop runs requests **sequentially**; use Promise.all for independent work.

</details>

<details>
<summary>JS6. Output-order question: what prints?</summary>

```js
console.log("A");

setTimeout(() => console.log("B"), 0);

Promise.resolve()
  .then(() => console.log("C"))
  .then(() => console.log("D"));

(async () => {
  console.log("E");
  await null;
  console.log("F");
})();

console.log("G");
```

Answer: **A, E, G, C, F, D, B**.

- Sync first: A, E (async function runs sync until its first await), G.
- Microtasks in queue order: C, then F (the await continuation), then D (queued after C ran).
- Macrotask last: B.

</details>

<details>
<summary>JS7. var / let / const, hoisting, and the temporal dead zone?</summary>

- var: function-scoped, hoisted and initialized to undefined.
- let/const: block-scoped, hoisted but **uninitialized** until the declaration line — touching them earlier throws ReferenceError (the TDZ).
- const prevents rebinding, not mutation of the object it points to.
- Function declarations hoist fully; function expressions follow their variable's rules.

```js
console.log(a); // undefined (var hoisted)
var a = 1;

console.log(b); // ReferenceError: TDZ
let b = 2;
```

</details>

<details>
<summary>JS8. == vs ===, and how do you compare objects / NaN?</summary>

- === compares without coercion; == coerces following the spec's algorithm (null == undefined is true, but null == 0 is false).
- Objects compare by **reference** — two identical-looking literals are not equal.
- NaN !== NaN; use Number.isNaN or Object.is. Object.is also separates +0 and -0.
- This matters in React: state updates and dependency arrays use **Object.is**.

```js
console.log({} === {}); // false
console.log(NaN === NaN); // false
console.log(Object.is(NaN, NaN)); // true
console.log(Object.is(0, -0)); // false
```

</details>

<details>
<summary>JS9. Shallow vs deep copy — how do you deep clone?</summary>

- Spread and Object.assign copy one level; nested objects are still shared.
- **structuredClone** is the built-in deep clone: handles Date, Map, Set, cycles; **throws** on functions and doesn't preserve prototypes/class instances.
- JSON.parse(JSON.stringify()) drops undefined/functions, turns Date into string, breaks on cycles, and loses Map/Set.
- Interview version: write a recursive deepClone with a WeakMap to handle cycles.

```js
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return seen.get(value); // cycle guard
  }

  if (value instanceof Date) {
    return new Date(value);
  }

  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);

  for (const key of Reflect.ownKeys(value)) {
    copy[key] = deepClone(value[key], seen);
  }

  return copy;
}
```

</details>

<details>
<summary>JS10. Debounce vs throttle — implement both and say when to use which.</summary>

- **Debounce**: run only after calls stop for N ms (search box, resize end, autosave).
- **Throttle**: run at most once per N ms while calls continue (scroll, mousemove, drag).

```js
function debounce(fn, wait) {
  let timer;

  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, wait) {
  let last = 0;

  return function (...args) {
    const now = Date.now();

    if (now - last >= wait) {
      last = now;
      fn.apply(this, args);
    }
  };
}
```

**Senior extras:** leading/trailing options, cancel/flush, preserving this and args, and in React — debounce must be kept stable across renders (useRef / useMemo / debounce the value instead).

</details>

<details>
<summary>JS11. Implement Promise.all, curry, and memoize.</summary>

```js
function promiseAll(items) {
  return new Promise((resolve, reject) => {
    const results = [];
    let done = 0;

    if (items.length === 0) {
      resolve(results);
      return;
    }

    items.forEach((item, i) => {
      Promise.resolve(item) // accepts plain values too
        .then((val) => {
          results[i] = val; // keep input order
          done += 1;

          if (done === items.length) {
            resolve(results);
          }
        })
        .catch(reject);
    });
  });
}

function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }

    return (...more) => curried.apply(this, [...args, ...more]);
  };
}

function memoize(fn) {
  const cache = new Map();

  return (...args) => {
    const key = JSON.stringify(args);

    if (!cache.has(key)) {
      cache.set(key, fn(...args));
    }

    return cache.get(key);
  };
}
```

**Follow-ups:** memoize cache growth / key choice, curry with placeholders, Promise.all with a concurrency limit.

</details>

<details>
<summary>JS12. Event bubbling, capturing, and delegation?</summary>

- An event goes **capture** (window → target), **target**, then **bubble** (target → window). Handlers run in bubble phase by default; pass capture: true to listen on the way down.
- **Delegation**: one listener on a parent handles many children, using event.target / closest(). Works for dynamically added items and saves memory.
- stopPropagation stops travel; preventDefault stops the browser's default action; they are independent.
- Not every event bubbles (focus, blur don't; focusin/focusout do).

```js
list.addEventListener("click", (event) => {
  const item = event.target.closest("li[data-id]");

  if (!item || !list.contains(item)) {
    return;
  }

  console.log("clicked", item.dataset.id);
});
```

</details>

<details>
<summary>JS13. Garbage collection and common memory leaks in front-end code?</summary>

- Mark-and-sweep: anything unreachable from roots is collected.
- Leaks = something still reachable by accident: uncleared setInterval/timeouts, event listeners never removed, detached DOM nodes held in variables, closures holding large data, growing caches/Maps (use WeakMap/WeakRef for caches keyed by objects), subscriptions without unsubscribe.
- Find with Chrome DevTools: Memory tab → heap snapshots → compare, search "Detached".

</details>

<details>
<summary>JS14. ES modules vs CommonJS, and what is tree shaking?</summary>

- ESM: static import/export, live bindings, async-capable, analyzable at build time. CJS: require at runtime, copies of exported values, dynamic.
- **Tree shaking** removes unused exports — works because ESM is static; breaks with side-effectful modules unless package.json marks sideEffects false, and with import * patterns that bundlers can't prove unused.
- Dynamic import() returns a promise and is the basis of code splitting.

</details>

<details>
<summary>JS15. Sync vs async iteration, generators, and when would you use them?</summary>

- Generators (function*) pause at yield and resume — lazy sequences, custom iterators, and the historic basis of async/await.
- for await...of consumes async iterables (streams, paginated APIs).
- Use for lazy pagination, reading streams, or state machines.

```js
async function* pages(url) {
  let next = url;

  while (next) {
    const res = await fetch(next);
    const body = await res.json();

    yield body.items;
    next = body.nextUrl;
  }
}

for await (const items of pages("/api/items")) {
  console.log(items.length);
}
```

</details>

<details>
<summary>JS16. What does the new keyword do, step by step?</summary>

1. Creates a fresh empty object.
2. Links its prototype to the constructor's prototype property.
3. Calls the constructor with this bound to that object.
4. Returns the object — unless the constructor explicitly returns another **object**, in which case that is returned.

```js
function fakeNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype);
  const result = Ctor.apply(obj, args);

  return result !== null && typeof result === "object" ? result : obj;
}

function Person(name) {
  this.name = name;
}

console.log(fakeNew(Person, "Ada").name); // "Ada"
```

**Gotcha:** forgetting new on a constructor function makes this undefined (strict) or global — classes throw instead, which is safer.

</details>

<details>
<summary>JS17. call vs apply vs bind?</summary>

- **call(thisArg, a, b)**: invoke now, args listed.
- **apply(thisArg, [a, b])**: invoke now, args as an array.
- **bind(thisArg, a)**: returns a **new function** with this (and optionally leading args) fixed; doesn't invoke.
- A bound function's this can't be changed again by call/apply, but new on it still works.

```js
function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}

const user = { name: "Neeraj" };

console.log(greet.call(user, "Hi", "!"));
console.log(greet.apply(user, ["Hi", "!"]));

const hello = greet.bind(user, "Hello");
console.log(hello("?")); // partial application of the first arg
```

</details>

<details>
<summary>JS18. Higher-order functions and functional patterns?</summary>

- A higher-order function takes a function and/or returns one: map, filter, reduce, debounce, memoize, curry, compose.
- Benefits: reuse, declarative code, easy to test with pure functions.
- compose / pipe chain small functions: pipe runs left to right.

```js
const pipe = (...fns) => (input) => fns.reduce((acc, fn) => fn(acc), input);

const slugify = pipe(
  (s) => s.trim(),
  (s) => s.toLowerCase(),
  (s) => s.replace(/\s+/g, "-"),
);

console.log(slugify("  Hello Big World ")); // "hello-big-world"
```

</details>

<details>
<summary>JS19. Type coercion quirks interviewers love?</summary>

- typeof null is "object" (historical bug). typeof of a function is "function"; arrays are "object" — use Array.isArray.
- + with a string concatenates; other math operators convert to number: "5" + 1 is "51", "5" - 1 is 4.
- Falsy values: false, 0, -0, 0n, "", null, undefined, NaN. Empty array and empty object are **truthy**.
- [] == false is true (coercion), [] is still truthy in an if.
- Prefer ===, explicit Number()/String(), and nullish coalescing over || when 0 or "" are valid values.

```js
const count = 0;

console.log(count || 10); // 10  (bug if 0 is valid)
console.log(count ?? 10); // 0   (only null/undefined fall back)
```

</details>

<details>
<summary>JS20. Map vs Object, Set, WeakMap, WeakSet, WeakRef?</summary>

- **Map**: any key type, keeps insertion order, has size, no prototype-key collisions, better for frequent add/delete.
- **Object**: string/symbol keys, JSON-friendly, convenient literal syntax.
- **Set**: unique values; spread to dedupe an array.
- **WeakMap / WeakSet**: keys must be objects and are held **weakly** — collected when nothing else references them; not iterable, no size. Use for private data / caches tied to object lifetime.
- **WeakRef** + FinalizationRegistry: for advanced caches; rarely needed.

```js
const cache = new WeakMap();

function compute(obj) {
  if (!cache.has(obj)) {
    cache.set(obj, expensive(obj));
  }

  return cache.get(obj); // entry disappears when obj is garbage collected
}
```

</details>

<details>
<summary>JS21. for...in vs for...of vs forEach vs map? And await inside them?</summary>

- **for...in**: iterates enumerable string **keys**, including inherited ones — avoid on arrays.
- **for...of**: iterates **values** of any iterable; works with break, continue, return, await.
- **forEach**: no break; ignores returned promises — **async callbacks are not awaited**.
- **map**: returns a new array; with async callbacks gives an array of promises → wrap in Promise.all.

```js
// Bug: finishes immediately, doesn't wait
items.forEach(async (item) => {
  await save(item);
});

// Sequential
for (const item of items) {
  await save(item);
}

// Parallel
await Promise.all(items.map((item) => save(item)));
```

</details>

<details>
<summary>JS22. Getters/setters, Object.freeze, and immutability?</summary>

- Accessor properties run code on get/set; useful for computed or validated values.
- Object.freeze is **shallow** — nested objects stay mutable; it also silently ignores writes in sloppy mode and throws in strict mode.
- const only stops reassignment.
- Practical immutability: spread/map/filter for copies, structuredClone for deep, Immer for ergonomic nested updates.

```js
const config = Object.freeze({ nested: { a: 1 } });

config.nested.a = 2; // works! freeze is shallow
console.log(config.nested.a); // 2
```

</details>

<details>
<summary>JS23. Browser storage: cookies vs localStorage vs sessionStorage vs IndexedDB?</summary>

| Store | Size | Sent to server? | Lifetime | Notes |
|---|---|---|---|---|
| Cookie | ~4 KB | Yes, every request | Expiry set | HttpOnly, Secure, SameSite flags |
| localStorage | ~5 MB | No | Until cleared | Sync API, strings only, readable by any script (XSS risk) |
| sessionStorage | ~5 MB | No | Tab lifetime | Same API as localStorage |
| IndexedDB | Large | No | Until cleared | Async, structured data, blobs |

- Never keep auth tokens in localStorage if XSS is a concern — prefer HttpOnly secure cookies.
- localStorage is synchronous, so large reads block the main thread.

</details>

<details>
<summary>JS24. fetch, AbortController, and handling HTTP errors?</summary>

- fetch only rejects on **network failure**; a 404/500 still resolves — check response.ok.
- Cancel with AbortController; the promise rejects with AbortError.
- Parse body once (json()/text()); a response body can be read a single time (clone if needed).
- Add timeouts with AbortSignal.timeout(ms).

```js
async function getJson(url, signal) {
  const res = await fetch(url, { signal });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

const controller = new AbortController();
getJson("/api/data", controller.signal).catch(console.error);
controller.abort();
```

</details>

<details>
<summary>JS25. CORS — what is it and how does a preflight work?</summary>

- Browsers block cross-origin responses unless the server opts in through Access-Control-Allow-* headers. It's enforced by the **browser**, not the server — curl ignores it.
- Origin = scheme + host + port.
- **Simple requests** (GET/POST with basic headers) go straight out; **non-simple** (custom headers, JSON content type, PUT/DELETE) trigger a **preflight OPTIONS** request first.
- Credentials (cookies) need Access-Control-Allow-Credentials true and a specific origin, not a wildcard.
- Fixing in dev: proxy through the dev server; in production, configure the API — never "disable" CORS in the client.

</details>

<details>
<summary>JS26. null vs undefined vs undeclared — plus the data types and typeof quirks?</summary>

- **undefined:** a declared variable with no value yet (also a missing property, a missing argument, a function with no return).
- **null:** an intentional "no value" that you assign yourself.
- **undeclared:** never declared at all. Reading it throws a ReferenceError — except through typeof, which safely returns "undefined".
- **Data types:** 7 primitives (string, number, bigint, boolean, undefined, null, symbol) and objects. Primitives are immutable and compared by value; objects by reference.

```js
let a;
const b = null;

console.log(a); // undefined
console.log(b); // null
console.log(typeof notDeclared); // "undefined" — no throw
// console.log(notDeclared);     // ReferenceError

console.log(typeof null); // "object" — a historical bug, never fixed
console.log(typeof (() => {})); // "function"
console.log(typeof []); // "object" — use Array.isArray
console.log(null == undefined); // true
console.log(null === undefined); // false

// Safe check for "is it null or undefined"
if (value == null) {
  // covers both, and nothing else (0, "" and false are NOT caught)
}
```

**Gotcha:** `typeof null === "object"` and `typeof []  === "object"` — never use typeof alone for those two.

**Interview angle:** "How do you check for each state?" → undefined with typeof or ===; null with ===; both with `== null`; arrays with Array.isArray.

</details>

<details>
<summary>JS27. Function declaration vs function expression vs arrow — and where do anonymous functions fit?</summary>

- **Declaration:** `function foo() {}` is hoisted completely, so you can call it before the line it is written on.
- **Expression:** `const foo = function () {}` is only as hoisted as the variable — calling it early gives a TypeError (var) or a TDZ ReferenceError (let/const).
- **Arrow:** no own `this`, `arguments`, or `prototype`, and it cannot be called with `new`.
- **Anonymous functions** are everyday: callbacks, IIFEs, event handlers, higher-order arguments. Downsides: worse stack traces, and no self-reference without a name.

```js
console.log(declared()); // works — hoisted with its body
// console.log(expressed()); // ReferenceError (TDZ) with const

function declared() {
  return "ok";
}

const expressed = function () {
  return "ok";
};

// A named function expression is easier to debug than an anonymous one
const fetchUser = function fetchUserById(id) {
  // "fetchUserById" shows up in stack traces and can call itself
};
```

**Interview angle:** "Why would you pick an arrow for a callback and a regular function for a method?" → arrows inherit `this` from the surrounding scope (great for callbacks); methods usually want the call-site `this`.

</details>

<details>
<summary>JS28. Spread vs rest, and destructuring?</summary>

- **Same three dots, opposite jobs:** rest **collects** the leftovers into an array/object; spread **expands** an iterable/object into individual pieces.
- Rest always goes last in a parameter list or pattern.
- Spread makes a **shallow** copy only — nested objects are still shared.

```js
// Rest: gather
function sum(first, ...others) {
  return others.reduce((a, b) => a + b, first);
}

const [head, ...tail] = [1, 2, 3]; // tail = [2, 3]
const { id, ...profile } = { id: 1, name: "A", age: 3 }; // profile = { name, age }

// Spread: expand
const merged = { ...{ a: 1, b: 2 }, ...{ b: 99 } }; // later keys win
const copy = [...tail, 4];
Math.max(...[3, 9, 2]);

// Shallow-copy trap
const original = { nested: { n: 1 } };
const clone = { ...original };
clone.nested.n = 2;
console.log(original.nested.n); // 2 — shared reference
```

**Gotcha:** spreading is a shallow clone; for a deep one use structuredClone.

</details>

<details>
<summary>JS29. What is strict mode and what does it change?</summary>

- Opt in with "use strict" at the top of a script or function. **ES modules and classes are always strict.**
- **Silent errors become thrown errors:** assigning to an undeclared variable, writing to a read-only property, duplicate parameter names, deleting non-deletable properties.
- **`this` in a plain function call is undefined**, not the global object.
- Reserved words for future syntax are blocked, and `with` is banned.
- Pro: catches bugs early and enables engine optimizations. Con: old, sloppy-mode code can break.

```js
"use strict";

function leak() {
  oops = 1; // ReferenceError — no accidental global
}

function whoAmI() {
  return this; // undefined, not window/globalThis
}

const frozen = Object.freeze({ a: 1 });
frozen.a = 2; // TypeError in strict mode (silent no-op in sloppy mode)
```

**Interview angle:** "Do you need to write it in modern code?" → Not in modules or classes; they are strict by default.

</details>

<details>
<summary>JS30. What are Symbols and what are they used for?</summary>

- A **Symbol** is a unique, immutable primitive. Two symbols are never equal even with the same description.
- Main uses: **collision-free property keys** (hidden from for...in, Object.keys and JSON.stringify), and **well-known symbols** that hook into the language: Symbol.iterator, Symbol.asyncIterator, Symbol.toPrimitive, Symbol.hasInstance.
- `Symbol.for("key")` reads from a **global registry**, so the same key returns the same symbol across realms.

```js
const id = Symbol("id");
const user = { name: "A", [id]: 123 };

console.log(Object.keys(user)); // ["name"] — symbol hidden
console.log(JSON.stringify(user)); // {"name":"A"}
console.log(Symbol("x") === Symbol("x")); // false
console.log(Symbol.for("x") === Symbol.for("x")); // true

// Making an object iterable
const range = {
  from: 1,
  to: 3,
  *[Symbol.iterator]() {
    for (let i = this.from; i <= this.to; i += 1) {
      yield i;
    }
  },
};

console.log([...range]); // [1, 2, 3]
```

**Interview angle:** "Why would a library use a Symbol key?" → to attach metadata to objects without any chance of colliding with user keys.

</details>

<details>
<summary>JS31. What is a Proxy and Reflect — where is it used for real?</summary>

- A **Proxy** wraps an object and intercepts operations through **traps** (get, set, has, deleteProperty, apply, ownKeys…). **Reflect** has the matching default behavior, so you forward with it.
- Real uses: **reactivity** (Vue 3 is built on it), validation, logging, default values, read-only views.
- Trade-offs: it is slower than direct access, it can't be polyfilled, and the proxy has a different identity from its target.

```js
function reactive(target, onChange) {
  return new Proxy(target, {
    get(obj, key, receiver) {
      return Reflect.get(obj, key, receiver);
    },
    set(obj, key, value, receiver) {
      const ok = Reflect.set(obj, key, value, receiver);
      onChange(key, value);
      return ok; // must return true in strict mode or it throws
    },
  });
}

const state = reactive({ count: 0 }, (k, v) => console.log("changed", k, v));
state.count = 1; // changed count 1
```

**Gotcha:** forgetting to return true from the set trap throws a TypeError in strict mode.

**Interview angle:** "How does Vue 3 reactivity differ from Vue 2?" → Proxy catches added/deleted keys; Vue 2's Object.defineProperty could not.

</details>

<details>
<summary>JS32. Web Workers — what are they and what can't they do?</summary>

- A **Worker** runs JavaScript on a **separate thread** so heavy CPU work doesn't block the main thread (and therefore doesn't freeze the UI).
- It has **no DOM access**. Communication is only via `postMessage`, with data **copied** by the structured clone algorithm (or **transferred**, e.g. ArrayBuffer, with zero copy).
- Kinds: dedicated worker, shared worker, **service worker** (network proxy, offline, push).
- Use for: big parsing, image/crypto work, heavy filtering. Not for I/O — that's already async.

```js
// main.js
const worker = new Worker(new URL("./sort.worker.js", import.meta.url), {
  type: "module",
});

worker.postMessage({ numbers: bigArray });

worker.onmessage = (event) => {
  console.log("sorted", event.data);
};

// sort.worker.js
self.onmessage = (event) => {
  const sorted = [...event.data.numbers].sort((a, b) => a - b);
  self.postMessage(sorted);
};
```

**Interview angle:** "Why not just use async/await?" → async frees the thread while waiting on I/O; it does not help CPU-bound work, which still blocks.

</details>

<details>
<summary>JS33. event.target vs currentTarget, preventDefault vs stopPropagation, mouseenter vs mouseover?</summary>

- **target:** the element that actually triggered the event (the deepest one clicked).
- **currentTarget:** the element the listener is attached to — what delegation reads from.
- **preventDefault():** cancels the browser's default action (link navigation, form submit). The event still propagates.
- **stopPropagation():** stops it from bubbling or capturing further. The default action still happens.
- **mouseover** bubbles and fires again when moving between children; **mouseenter** does not bubble and fires once when entering the element.

```js
list.addEventListener("click", (event) => {
  console.log(event.target); // the <li> or <button> that was clicked
  console.log(event.currentTarget); // always the <ul> that owns this listener

  const item = event.target.closest("li");

  if (item) {
    event.preventDefault(); // blocks the link navigation, event keeps bubbling
  }
});
```

**Gotcha:** stopPropagation breaks delegation for everything above it (analytics, outside-click handlers). Prefer preventDefault or checking `event.defaultPrevented`.

</details>

<details>
<summary>JS34. Polyfills, and the pros and cons of extending built-ins?</summary>

- A **polyfill** adds a missing standard feature in old runtimes, guarded by a feature check. A **transpiler** (Babel) rewrites syntax; a polyfill adds APIs.
- **Extending built-ins** (Array.prototype.myThing) is risky: names can **collide** with a future standard, it can break `for...in`, and a library may redefine it. Make non-enumerable with defineProperty if you must.
- Subclassing built-ins (class X extends Array) is safer and is what frameworks do.

```js
// Guard: only add if missing
if (!Array.prototype.myLast) {
  Object.defineProperty(Array.prototype, "myLast", {
    value() {
      return this[this.length - 1];
    },
    enumerable: false, // keeps for...in clean
    configurable: true,
    writable: true,
  });
}

// Safer: subclass instead of patching the global prototype
class Stack extends Array {
  peek() {
    return this[this.length - 1];
  }
}
```

**Interview angle:** "How do you write a polyfill?" → feature-detect, match the spec's edge cases (holes, thisArg, return values), and define it non-enumerable. See Part 4 P1.

</details>

---

# Part 2 — React

<details>
<summary>R1. What triggers a render, and what happens from trigger to pixels?</summary>

- **Triggers:** initial render, a state update (setState / dispatch), a parent re-rendering, a context value changing.
- **Render phase:** React calls your components, builds the new element tree, and diffs it against the previous one. It must be **pure** and may be paused or discarded (concurrent rendering).
- **Commit phase:** React applies DOM changes synchronously, then runs layout effects, then (after paint) passive effects.
- "Render" does not mean "DOM changed" — it only means your function ran.

**Gotcha:** a parent re-render re-renders all children by default, even with unchanged props, unless memoized.

</details>

<details>
<summary>R2. How does reconciliation work? Why do keys matter?</summary>

- React compares trees with an O(n) heuristic: **different type → tear down and remount**; **same type → update in place**; lists are matched by **key**.
- Stable, unique keys let React move items instead of destroying them, preserving state and DOM.
- Index as key breaks on reorder / insert / delete — state sticks to the wrong row.
- Changing a key on purpose is a legit way to **reset** a component's state.

```jsx
// Bad: reordering the list keeps input state at the old position
items.map((item, index) => (
  <Row key={index} item={item} />
));

// Good: identity follows the data
items.map((item) => (
  <Row key={item.id} item={item} />
));

// Reset all state in <Profile> when the user changes
<Profile key={userId} userId={userId} />
```

</details>

<details>
<summary>R3. What is Fiber and why was it introduced?</summary>

- A rewrite of the reconciler (React 16) that represents work as a **linked list of fiber nodes** instead of a recursive stack.
- That makes rendering **interruptible**: React can pause, resume, abandon, or prioritize work, using priority **lanes**.
- It's the foundation for concurrent features: Suspense, useTransition, useDeferredValue, streaming SSR.
- Each fiber also holds that component's hook list, which is why hook order matters.

</details>

<details>
<summary>R4. Why can't hooks be called conditionally?</summary>

- On each render React walks the component's hooks in **call order** from a linked list on the fiber. Identity is position, not name.
- A conditional or loop changes the order, so state gets matched to the wrong hook.
- Fix: always call hooks at the top level; put the condition **inside** the hook or effect.

```jsx
// Broken
if (isOpen) {
  const [value, setValue] = useState("");
}

// Fixed: hook always runs, condition applies to behavior
const [value, setValue] = useState("");

useEffect(() => {
  if (!isOpen) {
    return;
  }
  // ...
}, [isOpen]);
```

</details>

<details>
<summary>R5. Stale closures — what, why, and how do you fix them?</summary>

- Each render creates new functions that close over **that render's** props and state. An effect/timer/listener created in an older render still sees old values.
- Fixes: add the value to the dependency array; use functional updates (setCount(c => c + 1)); keep latest value in a ref; or use useEffectEvent (React 19.2+) for "read latest, don't re-subscribe".

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      // Bug: always logs 0 because count is captured from the first render
      console.log(count);

      // Fix for updates: functional form doesn't need count in the closure
      setCount((c) => c + 1);
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return <p>{count}</p>;
}
```

</details>

<details>
<summary>R6. useEffect deep dive — dependencies, cleanup, StrictMode double-run, and "you might not need an effect"?</summary>

- Effects **synchronize with something external** (network, subscriptions, DOM APIs). If you're only deriving data from props/state, compute it during render.
- Dependency array = "re-run when any of these changed (Object.is)". Lying to the linter causes stale-closure bugs.
- **Cleanup** runs before the next effect and on unmount.
- In dev **StrictMode** mounts → unmounts → mounts to expose missing cleanup. If the double-run breaks you, cleanup is wrong — not StrictMode.
- Fetching in effects needs cleanup/abort to avoid race conditions (older response arriving last).

```jsx
useEffect(() => {
  const controller = new AbortController();

  fetch(`/api/user/${id}`, { signal: controller.signal })
    .then((res) => res.json())
    .then(setUser)
    .catch((err) => {
      if (err.name !== "AbortError") {
        setError(err);
      }
    });

  return () => controller.abort(); // stale response can't overwrite newer one
}, [id]);
```

**Better answer:** use TanStack Query / framework data loading instead of hand-rolled fetch effects.

</details>

<details>
<summary>R7. useEffect vs useLayoutEffect vs useInsertionEffect?</summary>

- **useEffect**: after commit and (usually) after paint, non-blocking. Default choice.
- **useLayoutEffect**: after DOM mutation, **before paint**, blocks paint. Use to measure layout and adjust synchronously (tooltips, avoiding flicker).
- **useInsertionEffect**: before layout effects, for CSS-in-JS libraries to inject styles.
- Layout effect doesn't run on the server — SSR warning/hydration considerations.

</details>

<details>
<summary>R8. useMemo, useCallback, React.memo — when do they actually help?</summary>

- **React.memo** skips re-render if props are shallow-equal (Object.is per prop).
- **useMemo / useCallback** keep **references** stable. Their main value is making memo'd children or dependency arrays work — or caching genuinely expensive calculations.
- Memoizing everything adds cost and noise. Measure first with the Profiler.
- Memo is defeated by new object/array/function props or children each render.
- **React Compiler** auto-memoizes in many cases, reducing hand-written memo — but you still need to understand why renders happen.

```jsx
const Child = React.memo(function Child({ onSave }) {
  return <button onClick={onSave}>Save</button>;
});

function Parent() {
  const [text, setText] = useState("");

  // Without useCallback, Child re-renders on every keystroke
  const onSave = useCallback(() => save(text), [text]);

  return <Child onSave={onSave} />;
}
```

**Senior move:** first try to avoid the problem — colocate state, or pass children as props so the heavy subtree isn't re-created by the state owner.

</details>

<details>
<summary>R9. How do you prevent unnecessary re-renders without memo?</summary>

- **Colocate state** in the smallest component that needs it.
- **Lift content up / composition**: pass heavy parts as children so a state change in the wrapper doesn't re-render them.
- Split contexts; avoid putting rapidly-changing values in one big context.
- Use selector-based stores (Zustand, Redux, useSyncExternalStore) so components subscribe to slices.
- Virtualize long lists.

</details>

<details>
<summary>R10. Context performance problems and fixes?</summary>

- Every consumer re-renders when the provider's value changes by Object.is — even if it only uses part of it. useMemo on the value helps only when the provider re-renders without real change.
- Fixes: split state/dispatch (or by domain) into separate contexts; keep fast-changing values out of context; use a store with selectors; memo children below the provider.
- Context is for **low-frequency** values: theme, auth user, locale.

</details>

<details>
<summary>R11. Server state vs client state — how do you architect state?</summary>

- **Server state** (remote, async, cacheable, can go stale): TanStack Query / SWR — caching, dedupe, retries, invalidation, background refetch.
- **Client/UI state** (modals, filters, selections): local state first, then Zustand/Jotai/Redux if shared.
- **URL state** (filters, page, tab): keep in the URL so it's shareable and back-button friendly.
- **Form state**: React Hook Form + Zod.
- Don't copy server data into global store "just in case" — you take on cache invalidation yourself.

</details>

<details>
<summary>R12. Controlled vs uncontrolled components?</summary>

- **Controlled**: React state is the source of truth (value + onChange). Instant validation, derived UI; re-renders per keystroke.
- **Uncontrolled**: DOM holds the value, read through a ref or FormData on submit. Less re-rendering, simpler for big forms (React Hook Form uses this under the hood).
- Switching a field from undefined to a value flips uncontrolled → controlled and logs a warning — always give an initial value.

</details>

<details>
<summary>R13. useTransition vs useDeferredValue?</summary>

- Both mark work as **non-urgent** so urgent updates (typing) stay responsive.
- **useTransition**: you own the **state setter** — wrap the update in startTransition; get an isPending flag.
- **useDeferredValue**: you only receive a **value** (e.g., a prop) — React gives you a lagging copy that updates after urgent work.
- Not debounce: no fixed delay, interruptible, and doesn't reduce network calls by itself.

```jsx
function Search({ items }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(
    () => items.filter((i) => i.name.includes(deferredQuery)),
    [items, deferredQuery],
  );

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <List items={results} />
    </>
  );
}
```

</details>

<details>
<summary>R14. Automatic batching and how setState really works?</summary>

- Since React 18, updates are **batched everywhere** (events, timeouts, promises) into one render.
- setState doesn't change the variable in the current render — it schedules the next one. Reading state right after setting gives the old value.
- Same-event multiple setCount(count + 1) → one increment; use updater form setCount(c => c + 1) to chain.
- flushSync forces a synchronous flush (rare, e.g., scroll after DOM update).

</details>

<details>
<summary>R15. Error boundaries and Suspense?</summary>

- **Error boundary**: class component with componentDidCatch / getDerivedStateFromError (or react-error-boundary). Catches errors in render, lifecycle, constructors of children. It does **not** catch event handlers, async code, or SSR errors — handle those yourself.
- **Suspense**: component "suspends" while waiting (lazy code, Suspense-enabled data); nearest boundary shows fallback. Combine: Suspense for loading, error boundary for failure.
- Place boundaries by feature/route so one widget failing doesn't blank the whole app.

</details>

<details>
<summary>R16. Code splitting and performance toolkit?</summary>

- **React.lazy + Suspense** and route-level dynamic import.
- **Virtualization** (react-window / TanStack Virtual) for large lists.
- Image optimization, lazy loading, preloading critical routes.
- Bundle analysis (rollup-plugin-visualizer / source-map-explorer), tree shaking, avoid heavy deps.
- Measure: React DevTools Profiler ("why did this render"), Lighthouse, Web Vitals (LCP, INP, CLS).
- Fix the **biggest measured cost** first.

</details>

<details>
<summary>R17. useRef — what is it for, and ref vs state?</summary>

- A mutable box that persists across renders; changing it does **not** re-render.
- Uses: DOM nodes, timers/ids, previous value, "latest value" for callbacks, instance variables.
- Rule: if the UI depends on it, it's **state**; if it doesn't, a ref.
- Don't read/write ref.current during render (except lazy init) — breaks purity for concurrent rendering.

</details>

<details>
<summary>R18. How do you design a reusable component API (compound components, render props, custom hooks)?</summary>

- Prefer **composition** over config props: compound components (Tabs, Tabs.List, Tabs.Panel) share state via context.
- Custom hooks extract **logic**; components extract **UI**. Headless pattern = hook for behavior + user-provided markup.
- Keep props minimal and typed to forbid invalid combos (see T7).
- Accessibility baked in: roles, keyboard support, focus management.
- Forward refs (ref is a normal prop in React 19) and spread remaining props to the root element.

</details>

<details>
<summary>R19. Server Components, SSR, hydration — what should a senior know?</summary>

- **SSR**: server renders HTML, client **hydrates** it (attaches handlers). Fast first paint, but costs duplicate JS.
- **Hydration mismatch**: server and first client render differ (Date.now, window, localStorage, random ids). Fix: render the same on both, and apply client-only values after mount in an effect (or use suppressHydrationWarning sparingly).
- **React Server Components**: run only on the server, ship no JS, can access data directly; client components are marked "use client". Reduces bundle size; props crossing the boundary must be serializable.
- **Streaming + Suspense** allow progressive HTML.

</details>

<details>
<summary>R20. Debugging a slow or leaking React app — walk through your process.</summary>

1. Reproduce and **measure** (Profiler flamegraph, "why did this render", Performance tab, INP).
2. Find the cause: wide re-render from high-level state/context, expensive render work, huge list, big bundle, network waterfall.
3. Fix at the root: colocate state, split context, virtualize, memoize the proven hotspot, lazy-load.
4. Leaks: heap snapshots, look for detached DOM nodes, check effect cleanups (timers, listeners, subscriptions, observers).
5. Re-measure and add a guard (perf budget, lint rule, test).

</details>

<details>
<summary>R21. Derived state and "state is a snapshot" pitfalls?</summary>

- Don't copy props into state (useState(props.x)) — it only reads the **initial** value and silently ignores updates.
- Compute derived values during render, or reset with a key.
- Don't store both a list and its filtered version; store the list and the filter, derive the rest.
- Mutating state (push, direct assign) doesn't trigger a render and breaks memo — always create new objects/arrays.

</details>

<details>
<summary>R22. useReducer vs useState, and useSyncExternalStore?</summary>

- useReducer: many related fields or transitions, state updates described as **actions** — easier to test and reason about; pairs well with discriminated unions in TS.
- useSyncExternalStore: the correct way to subscribe React to an **external store** (Redux/Zustand style, browser APIs) without tearing in concurrent rendering.

</details>

<details>
<summary>R23. How does React's event system work?</summary>

- React attaches listeners at the **root container**, not on each element, and dispatches through its own synthetic event wrapper (cross-browser, same interface as native).
- Since 17 root-attached (not document), and since 17 there is no event pooling.
- Handler registered with onClick is bubble phase; onClickCapture is capture.
- stopPropagation inside React affects React's tree; mixing with native document listeners can surprise you.

</details>

<details>
<summary>R24. Testing strategy for a React app?</summary>

- **Unit**: pure functions, reducers, hooks (renderHook).
- **Component/integration**: React Testing Library — query by role/label like a user, assert on visible behavior, not implementation. Mock the network (MSW), not your own modules.
- **E2E**: Playwright for critical flows.
- Avoid snapshot-everything and testing internal state.

</details>

<details>
<summary>R25. Composition vs inheritance, the children prop, and prop drilling?</summary>

- React favors **composition**: pass JSX as children or as props (slots) instead of subclassing.
- **Prop drilling** = passing data through layers that don't use it. Fixes, in order: composition (pass the finished element down), colocate state, context, a store.
- Composition fix example: the page builds the Avatar element and passes it down, so the middle layers never see the user prop.

```jsx
function Page({ user }) {
  return (
    <Layout header={<Avatar user={user} />}>
      <Content />
    </Layout>
  );
}

function Layout({ header, children }) {
  return (
    <div>
      <header>{header}</header>
      <main>{children}</main>
    </div>
  );
}
```

</details>

<details>
<summary>R26. Higher-order components vs render props vs custom hooks?</summary>

- **HOC**: function taking a component, returning an enhanced one (withAuth). Downsides: wrapper hell, prop name collisions, hard to type.
- **Render props**: a component calls a function prop to render — flexible but nests deeply.
- **Custom hooks**: share **stateful logic** without changing the tree — the modern default.
- HOCs and render props still appear in older code and libraries (React Router, Redux connect).

</details>

<details>
<summary>R27. What does React Compiler change, and what do you still need to know?</summary>

- It's a build-time tool that automatically memoizes components and values when your code follows the Rules of React (pure render, no mutation).
- Reduces the need for manual useMemo / useCallback / React.memo.
- It can't fix bad structure — state in the wrong place, huge lists, expensive effects. And code that breaks the rules can't be optimized (compiler skips it).
- You still need to understand referential equality and why renders happen to debug.

</details>

<details>
<summary>R28. Custom hooks: design rules and a good example?</summary>

- Name starts with use; can call other hooks; returns what consumers need (value, setters, status).
- Each call has its own state — hooks share **logic**, not state.
- Keep dependencies honest; clean up subscriptions; make returned functions stable if consumers put them in dependency arrays.

```jsx
function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
```

</details>

<details>
<summary>R29. Lists at scale: virtualization, pagination, infinite scroll — trade-offs?</summary>

- **Virtualization** renders only visible rows — constant DOM size; needs fixed or measured row heights; breaks Ctrl+F and some a11y unless handled.
- **Pagination**: simple, shareable, SEO-friendly, predictable memory.
- **Infinite scroll**: engaging but loses footer access, position on back-nav, and memory grows without virtualization.
- Use IntersectionObserver sentinel, cursor-based API, dedupe pages, preserve scroll on navigation.

</details>

<details>
<summary>R30. Accessibility in React components?</summary>

- Use **semantic elements** first (button, a, label, nav) — free keyboard and screen reader behavior.
- Labels: label htmlFor or aria-label; link errors with aria-describedby and aria-invalid.
- Keyboard: everything clickable focusable, visible focus, Enter/Space on custom buttons, Escape closes overlays.
- Modals: focus moves in, is **trapped**, and returns to the trigger on close.
- Announce dynamic changes with aria-live; never rely on color alone; test with keyboard, axe, and a screen reader.

</details>

<details>
<summary>R31. Fragments, keys on fragments, and conditional rendering gotchas?</summary>

- Fragment groups elements without an extra DOM node; use the long form Fragment key=... in lists.
- Gotcha: count && <X /> renders **0** when count is 0. Use count > 0 && ... or a ternary.
- Returning null renders nothing but the component's hooks/state still exist; unmounting loses state.
- Switching between different component types at the same position remounts.

```jsx
// Renders the digit 0 on screen when items is empty
{items.length && <List items={items} />}

// Correct
{items.length > 0 && <List items={items} />}
```

</details>

<details>
<summary>R32. React Node vs Element vs Component — and what does JSX compile to?</summary>

- **Component:** a function (or class) that takes props and returns UI. It is a blueprint, not UI itself.
- **Element:** a plain, immutable **object** describing what you want on screen: type, props, key. Cheap to create. JSX is just sugar that produces elements.
- **Node (ReactNode):** anything renderable — an element, string, number, null, a fragment or an array of them.
- Rendering = React calling your component to get elements, then diffing them against the last ones.

```jsx
// JSX
const el = <Button color="red">Save</Button>;

// compiles to (React 17+ automatic runtime) a call like:
// jsx(Button, { color: "red", children: "Save" })

// and the element is just an object:
// { type: Button, props: { color: "red", children: "Save" }, key: null, ... }

function Greeting() {
  return <h1>Hi</h1>; // Greeting is a component; <h1>Hi</h1> is an element
}
```

**Interview angle:** "Why can React diff so cheaply?" → elements are lightweight descriptions; only the diff touches the real DOM.

</details>

<details>
<summary>R33. createElement vs cloneElement — and why is cloneElement discouraged?</summary>

- **createElement** builds a new element from a type, props and children (this is what JSX becomes).
- **cloneElement** copies an existing element and **overrides props** — used by older libraries to inject props into a child.
- It is **legacy**: it makes data flow implicit and breaks when the child isn't a direct element you expected. The recommended alternatives are render props, context, or composing explicit props.

```jsx
import { cloneElement, Children } from "react";

function Toolbar({ children }) {
  return Children.map(children, (child) =>
    cloneElement(child, {
      size: "small", // overrides or adds a prop on every child
    })
  );
}

// Preferred: pass what you need explicitly, or via context
function ToolbarContext({ children }) {
  return (
    <ToolbarSettings.Provider value={{ size: "small" }}>
      {children}
    </ToolbarSettings.Provider>
  );
}
```

**Gotcha:** cloneElement only works on direct children. If a child is wrapped in a Fragment or another component, the injected props never arrive.

</details>

<details>
<summary>R34. Why hooks over classes? What problem did they solve?</summary>

- **Reuse stateful logic without wrappers:** classes needed HOCs/render props, causing "wrapper hell". A custom hook is a plain function.
- **Related logic stays together:** in classes, one concern was split across componentDidMount, DidUpdate and WillUnmount; an effect puts setup and cleanup side by side.
- **No `this`:** no binding bugs, easier for tools to optimize.
- **Closures capture each render's values:** a feature (snapshot per render) and the cause of stale-closure bugs (see R5).
- Classes still work; Error boundaries are the one thing that still requires a class.

```jsx
// One concern, one place: subscribe + cleanup together
function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);

    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
```

**Interview angle:** "What's still impossible with hooks?" → error boundaries need a class (or a library such as react-error-boundary).

</details>

<details>
<summary>R35. CSR vs SSR vs SSG vs ISR — and what is a hydration mismatch?</summary>

- **CSR:** server sends an empty shell, the browser builds the UI. Fast server, slower first paint, weak SEO without extra work.
- **SSR:** server renders HTML per request. Faster first paint and good SEO; server cost and TTFB grow with load.
- **SSG:** HTML is built at build time and served from a CDN. Fastest, but content is stale until rebuild.
- **ISR:** SSG that regenerates pages in the background after a time or on demand.
- **Hydration:** React attaches event handlers to the existing server HTML. It expects the **first client render to match** the server output exactly.

```jsx
// Hydration mismatch: server and client render different text
function Clock() {
  return <p>{new Date().toLocaleTimeString()}</p>; // differs on server vs client
}

// Fix: render a stable value first, then update in an effect
function SafeClock() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
  }, []);

  return <p>{time ?? "—"}</p>;
}
```

**Gotcha:** typical mismatch sources are Date.now, Math.random, window/localStorage reads during render, and invalid HTML nesting.

**Interview angle:** "When would you pick SSG over SSR?" → content that is the same for every user and changes rarely: docs, marketing, blogs.

</details>

<details>
<summary>R36. Live data in a React UI: polling vs WebSockets vs Server-Sent Events?</summary>

- **Polling:** the client asks on an interval. Simplest, works everywhere, wasteful and delayed. Use for slow-changing data.
- **Long polling:** server holds the request until there is data. Better latency, still request-heavy.
- **SSE:** one-way server → client over HTTP, automatic reconnect, text only. Great for feeds, notifications.
- **WebSocket:** two-way, low latency, persistent connection. Best for chat, collaboration, trading. Needs reconnect/backoff and heartbeat logic.
- In React: keep the connection **outside render** in a hook or store, always **clean up** in the effect, and **batch** bursts of updates so you don't render 100 times a second.

```jsx
function useLiveFeed(url) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = new WebSocket(url);

    socket.onmessage = (event) => {
      // functional update avoids a stale closure over messages
      setMessages((prev) => [...prev, JSON.parse(event.data)].slice(-100));
    };

    return () => {
      socket.close(); // StrictMode runs this once in dev — must be safe
    };
  }, [url]);

  return messages;
}
```

**Interview angle:** "Dashboard with continuous updates — what do you worry about?" → connection lifecycle, backpressure/batching, bounded memory, and not re-rendering the entire tree on every tick.

</details>

---

# Part 3 — TypeScript

<details>
<summary>T1. unknown vs any vs never?</summary>

- **any**: switches type checking off — contagious and unsafe.
- **unknown**: "could be anything" but you must **narrow** before use. Use for JSON, catch variables, external input.
- **never**: no possible value — function that throws/never returns, exhausted unions.

```ts
function parseJson(text: string): unknown {
  return JSON.parse(text);
}

const data = parseJson('{"theme":"dark"}');

if (typeof data === "object" && data !== null && "theme" in data) {
  console.log((data as { theme: unknown }).theme);
}
```

**Senior add-on:** narrowing by hand doesn't validate at runtime for big shapes — use Zod at the boundary.

</details>

<details>
<summary>T2. Interface vs type alias?</summary>

- Both describe object shapes. **interface**: declaration merging, extends, good for public object contracts and class implementing; clearer error messages.
- **type**: unions, intersections, tuples, mapped/conditional types, primitives — more expressive.
- Practical rule: type for unions and computed types; interface for extendable object shapes; stay consistent in the codebase.

</details>

<details>
<summary>T3. Generics — what problem they solve, constraints, and inference failures?</summary>

- Generics keep the **relationship** between input and output types instead of widening to any.
- Constrain with extends so you can safely use properties; use keyof T for key-safe access.
- Inference fails when there's no inference site or the type only appears in the return position — pass it explicitly or add a parameter that carries it.
- Don't add generics that appear once — they're often just any in disguise.

```ts
function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;

  for (const key of keys) {
    result[key] = obj[key];
  }

  return result;
}

const user = { id: "u1", name: "Ada", role: "admin" };
const summary = pick(user, ["id", "name"]); // { id: string; name: string }
```

</details>

<details>
<summary>T4. Discriminated unions and exhaustiveness checking?</summary>

- Union of object types sharing a literal **tag** property; checking the tag narrows the type.
- Models async UI state so invalid combinations (loading + data) can't exist.
- assertNever in the default branch makes adding a new variant a **compile error** wherever it's unhandled.

```ts
type RemoteData<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

function assertNever(value: never): never {
  throw new Error(`Unhandled state: ${JSON.stringify(value)}`);
}

function render(state: RemoteData<string[]>) {
  switch (state.status) {
    case "idle":
      return "Choose a team";
    case "loading":
      return "Loading";
    case "success":
      return state.data.join(", ");
    case "error":
      return state.error.message;
    default:
      return assertNever(state);
  }
}
```

</details>

<details>
<summary>T5. Conditional types, distributive behavior, and infer?</summary>

- T extends U ? X : Y picks a type based on a relation.
- When T is a **naked type parameter** and a union is passed, it **distributes** over each member. Wrap in a tuple [T] to disable.
- infer captures a part of a matched type.
- Know the built-ins: ReturnType, Parameters, Awaited, NonNullable, Exclude, Extract.

```ts
type AsyncReturn<T> = T extends (...args: any[]) => Promise<infer R>
  ? R
  : never;

async function getUser() {
  return { id: "u1", name: "Grace" };
}

type User = AsyncReturn<typeof getUser>; // { id: string; name: string }

// Distributive: string | number -> string[] | number[]
type ToArray<T> = T extends unknown ? T[] : never;
type A = ToArray<string | number>;
```

</details>

<details>
<summary>T6. Mapped types, key remapping, and template literal types?</summary>

- Mapped type loops over keys: { [K in keyof T]: ... }; modifiers +/- readonly and +/- ? can be added or removed.
- Key remapping with as transforms or filters keys.
- Template literal types build string unions.
- Judgment: great for design-system and event maps; overkill for one local component — readable beats clever.

```ts
type ChangeHandlers<T extends object> = {
  [K in keyof T as `on${Capitalize<string & K>}Changed`]: (
    next: T[K],
  ) => void;
};

type Settings = { theme: "light" | "dark"; pageSize: 25 | 50 };

// { onThemeChanged: (n: "light" | "dark") => void; onPageSizeChanged: ... }
type Handlers = ChangeHandlers<Settings>;
```

</details>

<details>
<summary>T7. How do you type mutually exclusive React props?</summary>

- Use a union of prop shapes where the forbidden props are typed never / optional-never.
- Then checking one prop narrows inside the component.

```tsx
type BaseProps = { children: React.ReactNode };

type LinkProps = BaseProps & {
  href: string;
  onClick?: never;
};

type ActionProps = BaseProps & {
  href?: never;
  onClick: () => void;
};

type ButtonProps = LinkProps | ActionProps;

function Button(props: ButtonProps) {
  if (props.href !== undefined) {
    return <a href={props.href}>{props.children}</a>;
  }

  return <button onClick={props.onClick}>{props.children}</button>;
}
```

</details>

<details>
<summary>T8. satisfies vs type annotation vs as?</summary>

- **Annotation** (const x: T): widens to T and you lose literal detail.
- **satisfies**: checks the value conforms to T **while keeping the narrower inferred type** — great for config / variant maps.
- **as** (assertion): tells the compiler to trust you — no runtime check; the dangerous one. Prefer narrowing or validation.

```ts
type Variant = "primary" | "secondary" | "danger";

const classes = {
  primary: "bg-blue-600",
  secondary: "bg-slate-100",
  danger: "bg-red-600",
} satisfies Record<Variant, string>;

// Add "ghost" to Variant and this object becomes a compile error.
```

</details>

<details>
<summary>T9. Utility types you should be fluent in, and when each is the right tool?</summary>

- Partial, Required, Readonly, Pick, Omit, Record, Exclude, Extract, NonNullable, ReturnType, Parameters, Awaited.
- API payload example: Partial of Pick of the editable fields — expresses "only these fields, each optional". Partial of the whole User would wrongly allow id / role.
- Omit on unions doesn't distribute — use a distributive helper if needed.

```ts
type User = {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
};

type EditableFields = Pick<User, "name" | "email">;
type UpdateUserPayload = Partial<EditableFields>;
```

</details>

<details>
<summary>T10. Type safety at runtime boundaries — "TypeScript types disappear at runtime"?</summary>

- Types are erased at compile time; API responses, localStorage, form input and URL params are **untrusted**.
- Validate at the boundary with a schema library (Zod) and **derive** the type from the schema so they can't drift.
- Use unknown for incoming data, parse once, then pass trusted typed data inwards.

```ts
import * as z from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
});

type User = z.infer<typeof UserSchema>;

const result = UserSchema.safeParse(await res.json());

if (!result.success) {
  console.error(z.prettifyError(result.error));
}
```

</details>

<details>
<summary>T11. Type narrowing techniques and type predicates?</summary>

- typeof, instanceof, in operator, equality, truthiness, discriminant property, and custom **type predicates** (x is T).
- Narrowing in a callback can reset if the variable can be reassigned — copy to a const.
- Predicates are trusted — a wrong predicate is a lie the compiler believes.

```ts
function isString(value: unknown): value is string {
  return typeof value === "string";
}

const mixed: unknown[] = [1, "a", null, "b"];
const strings = mixed.filter(isString); // string[]
```

</details>

<details>
<summary>T12. strict mode flags and common config questions?</summary>

- strict turns on strictNullChecks, noImplicitAny, strictFunctionTypes, strictBindCallApply, strictPropertyInitialization, useUnknownInCatchVariables, etc.
- Also worth enabling: noUncheckedIndexedAccess (array/record index returns T | undefined), exactOptionalPropertyTypes.
- isolatedModules / verbatimModuleSyntax for bundlers: use import type for types.
- moduleResolution bundler for Vite projects.

</details>

<details>
<summary>T13. Typing React: props, events, refs, hooks, generic components?</summary>

- Props: plain type/interface; children as React.ReactNode; prefer explicit function components over React.FC.
- Events: React.ChangeEvent of HTMLInputElement, React.MouseEvent, etc.; or ComponentProps of "button" to extend native props.
- useState with unions or null needs an explicit generic; useRef of HTMLDivElement with null initial.
- Generic components: function List<T>({ items, render }: { items: T[]; render: (item: T) => ReactNode }).
- useReducer with a discriminated-union Action type.

</details>

<details>
<summary>T14. Enums vs union of string literals vs const objects?</summary>

- Regular **enum** emits runtime code and numeric enums are loosely typed; **const enum** is erased but troublesome with isolatedModules.
- A union of string literals is zero-cost, serializes naturally, and narrows well.
- Common modern pattern: a const object with as const and derive the union from it.

```ts
const Status = {
  Idle: "idle",
  Loading: "loading",
  Done: "done",
} as const;

type Status = (typeof Status)[keyof typeof Status]; // "idle" | "loading" | "done"
```

</details>

<details>
<summary>T15. as const, readonly, and tuples?</summary>

- as const makes literals **readonly and as narrow as possible** (arrays become readonly tuples, strings become literal types).
- readonly arrays/properties block mutation at compile time only.
- Tuples fix length and per-position types — useHook-style return values.

```ts
const roles = ["admin", "member"] as const;
type Role = (typeof roles)[number]; // "admin" | "member"

function useToggle(): [boolean, () => void] {
  // ...
}
```

</details>

<details>
<summary>T16. keyof, typeof, indexed access, and lookup types — how do they combine?</summary>

- keyof T → union of keys; typeof value → the type of a runtime value; T[K] → property type.
- Combos: keyof typeof obj gets key union of a const object; T[number] gets array element type.

```ts
const colors = { red: "#f00", blue: "#00f" } as const;

type ColorName = keyof typeof colors; // "red" | "blue"
type ColorValue = (typeof colors)[ColorName]; // "#f00" | "#00f"
```

</details>

---

# Part 4 — JS coding-round checklist (implement from scratch)

Interviewers give these with tests; practice until each takes under 10 minutes. Order is roughly by frequency.

| # | Utility | What to mention while coding |
|---|---|---|
| 1 | debounce / throttle | this + args, cancel, leading/trailing |
| 2 | Promise.all / allSettled / race / any | order of results, empty input, non-promise values |
| 3 | Array polyfills: map, filter, reduce, flat | holes, thisArg, no initial value for reduce |
| 4 | Function.prototype.bind / call / apply | new-ability, partial args |
| 5 | curry (and partial) | fn.length, placeholders |
| 6 | deepClone / deepEqual | cycles, Date/Map/Set, key order |
| 7 | memoize | cache key, size limit, this |
| 8 | EventEmitter (on / off / once / emit) | remove during emit, memory |
| 9 | Promise implementation / retry with backoff / promise pool (concurrency limit) | microtask scheduling, error paths |
| 10 | flatten object / array, get / set by path, camelCase keys | arrays vs objects, undefined paths |
| 11 | classnames / groupBy / chunk / compose / once / promisify | nested args, falsy values, this |
| 12 | Observable / pub-sub, simple store | unsubscribe, batching |
| 13 | JSON.stringify / getElementsByClassName (DOM walk) | undefined and functions skipped, cycles, recursion order |

Confirmed against GreatFrontEnd's JS coding list and the Frontend Interview Handbook's utility page: all of the above appear there. LRU cache is a LeetCode classic (problem 146) but is not on those frontend lists, so it is not here.

### Worked solutions (try first, then open)

Already solved above: debounce / throttle (JS10), Promise.all / curry / memoize (JS11), deepClone (JS9). Each solution below includes its own asserts — run it in node to check.

<details>
<summary>P1. Polyfill Array map, filter, reduce</summary>

```js
const assert = require("node:assert");

Array.prototype.myMap = function (callback, thisArg) {
  const result = new Array(this.length);

  for (let i = 0; i < this.length; i++) {
    if (i in this) {
      // skip holes like the real map
      result[i] = callback.call(thisArg, this[i], i, this);
    }
  }

  return result;
};

Array.prototype.myFilter = function (callback, thisArg) {
  const result = [];

  for (let i = 0; i < this.length; i++) {
    if (i in this && callback.call(thisArg, this[i], i, this)) {
      result.push(this[i]);
    }
  }

  return result;
};

Array.prototype.myReduce = function (callback, ...initial) {
  let index = 0;
  let acc;

  if (initial.length > 0) {
    acc = initial[0];
  } else {
    while (index < this.length && !(index in this)) {
      index++;
    }

    if (index >= this.length) {
      throw new TypeError("Reduce of empty array with no initial value");
    }

    acc = this[index++];
  }

  for (; index < this.length; index++) {
    if (index in this) {
      acc = callback(acc, this[index], index, this);
    }
  }

  return acc;
};

assert.deepStrictEqual([1, 2, 3].myMap((x) => x * 2), [2, 4, 6]);
assert.deepStrictEqual([1, 2, 3, 4].myFilter((x) => x % 2 === 0), [2, 4]);
assert.strictEqual([1, 2, 3].myReduce((a, b) => a + b), 6);
assert.strictEqual([1, 2, 3].myReduce((a, b) => a + b, 10), 16);
assert.throws(() => [].myReduce((a, b) => a + b));
```

**Say out loud:** skip holes, pass (value, index, array), thisArg, empty reduce throws.

</details>

<details>
<summary>P2. Polyfill Function.prototype.bind (and call)</summary>

```js
const assert = require("node:assert");

Function.prototype.myCall = function (context, ...args) {
  const ctx = context == null ? globalThis : Object(context);
  const key = Symbol("fn"); // avoid overwriting a real property

  ctx[key] = this;
  const result = ctx[key](...args);
  delete ctx[key];

  return result;
};

Function.prototype.myBind = function (context, ...boundArgs) {
  const original = this;

  function bound(...callArgs) {
    // when used with new, this is the new instance, not context
    const isNew = this instanceof bound;

    return original.apply(isNew ? this : context, [...boundArgs, ...callArgs]);
  }

  bound.prototype = Object.create(original.prototype);

  return bound;
};

function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}

const user = { name: "Neeraj" };

assert.strictEqual(greet.myCall(user, "Hi", "!"), "Hi, Neeraj!");
assert.strictEqual(greet.myBind(user, "Hello")("?"), "Hello, Neeraj?");

function Point(x, y) {
  this.x = x;
  this.y = y;
}

const BoundPoint = Point.myBind(null, 1);
const p = new BoundPoint(2);

assert.strictEqual(p.x, 1);
assert.strictEqual(p.y, 2);
assert.ok(p instanceof Point);
```

</details>

<details>
<summary>P3. Flatten an array (any depth) and flatten an object</summary>

```js
const assert = require("node:assert");

function flatten(arr, depth = Infinity) {
  const result = [];

  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) {
      result.push(...flatten(item, depth - 1));
    } else {
      result.push(item);
    }
  }

  return result;
}

function flattenObject(obj, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      flattenObject(value, path, out);
    } else {
      out[path] = value;
    }
  }

  return out;
}

assert.deepStrictEqual(flatten([1, [2, [3, [4]]]]), [1, 2, 3, 4]);
assert.deepStrictEqual(flatten([1, [2, [3, [4]]]], 1), [1, 2, [3, [4]]]);
assert.deepStrictEqual(flattenObject({ a: 1, b: { c: 2, d: { e: 3 } } }), {
  a: 1,
  "b.c": 2,
  "b.d.e": 3,
});
```

</details>

<details>
<summary>P4. EventEmitter (on, off, once, emit)</summary>

```js
const assert = require("node:assert");

class EventEmitter {
  #listeners = new Map();

  on(event, fn) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }

    this.#listeners.get(event).add(fn);

    return () => this.off(event, fn); // unsubscribe handle
  }

  off(event, fn) {
    this.#listeners.get(event)?.delete(fn);
  }

  once(event, fn) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      fn(...args);
    };

    return this.on(event, wrapper);
  }

  emit(event, ...args) {
    // copy so listeners removing themselves don't break iteration
    for (const fn of [...(this.#listeners.get(event) ?? [])]) {
      fn(...args);
    }
  }
}

const bus = new EventEmitter();
const calls = [];

const off = bus.on("x", (v) => calls.push(`a${v}`));
bus.once("x", (v) => calls.push(`once${v}`));

bus.emit("x", 1);
bus.emit("x", 2);
off();
bus.emit("x", 3);

assert.deepStrictEqual(calls, ["a1", "once1", "a2"]);
```

</details>

<details>
<summary>P5. Retry with backoff, and a promise pool (concurrency limit)</summary>

```js
const assert = require("node:assert");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function retry(fn, { retries = 3, delay = 10 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;

      if (attempt < retries) {
        await sleep(delay * 2 ** attempt); // exponential backoff
      }
    }
  }

  throw lastError;
}

async function promisePool(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));

  return results;
}

(async () => {
  let tries = 0;

  const value = await retry(async () => {
    tries++;

    if (tries < 3) {
      throw new Error("fail");
    }

    return "ok";
  });

  assert.strictEqual(value, "ok");
  assert.strictEqual(tries, 3);

  let running = 0;
  let maxRunning = 0;

  const tasks = Array.from({ length: 6 }, (_, i) => async () => {
    running++;
    maxRunning = Math.max(maxRunning, running);
    await sleep(5);
    running--;

    return i;
  });

  const out = await promisePool(tasks, 2);

  assert.deepStrictEqual(out, [0, 1, 2, 3, 4, 5]);
  assert.strictEqual(maxRunning, 2);
})();
```

</details>

<details>
<summary>P6. deepEqual and get-by-path</summary>

```js
const assert = require("node:assert");

function deepEqual(a, b) {
  if (Object.is(a, b)) {
    return true;
  }

  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    return false;
  }

  return keysA.every(
    (key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]),
  );
}

function get(obj, path, fallback) {
  const keys = Array.isArray(path) ? path : path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current = obj;

  for (const key of keys) {
    if (current == null) {
      return fallback;
    }

    current = current[key];
  }

  return current === undefined ? fallback : current;
}

assert.ok(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }));
assert.ok(!deepEqual({ a: 1 }, { a: 1, b: 2 }));
assert.ok(deepEqual(NaN, NaN));
assert.strictEqual(get({ a: [{ b: 5 }] }, "a[0].b"), 5);
assert.strictEqual(get({ a: 1 }, "x.y", "none"), "none");
```

</details>

<details>
<summary>P7. Small utilities: classNames, groupBy, chunk, compose, once, promisify</summary>

```js
const assert = require("node:assert");

// classNames: strings, numbers, arrays, objects, nested; skip falsy
function classNames(...args) {
  const out = [];

  for (const arg of args) {
    if (!arg) {
      continue;
    }

    if (typeof arg === "string" || typeof arg === "number") {
      out.push(arg);
    } else if (Array.isArray(arg)) {
      const inner = classNames(...arg);

      if (inner) {
        out.push(inner);
      }
    } else if (typeof arg === "object") {
      for (const key of Object.keys(arg)) {
        if (arg[key]) {
          out.push(key);
        }
      }
    }
  }

  return out.join(" ");
}

assert.strictEqual(classNames("a", null, "b", { c: true, d: false }, ["e", ["f"]], 0, 1), "a b c e f 1");

// groupBy: key can be a function or a property name
function groupBy(list, keyOrFn) {
  const getKey = typeof keyOrFn === "function" ? keyOrFn : (item) => item[keyOrFn];

  return list.reduce((acc, item) => {
    const key = getKey(item);

    if (!Object.hasOwn(acc, key)) {
      acc[key] = [];
    }

    acc[key].push(item);
    return acc;
  }, Object.create(null)); // null prototype so a key like "constructor" is safe
}

const grouped = groupBy([6.1, 4.2, 6.3], Math.floor);
assert.deepStrictEqual(grouped[6], [6.1, 6.3]);

function chunk(arr, size = 1) {
  if (size < 1) {
    return [];
  }

  const out = [];

  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }

  return out;
}

assert.deepStrictEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);

// compose runs right to left
const compose =
  (...fns) =>
  (x) =>
    fns.reduceRight((acc, fn) => fn(acc), x);

assert.strictEqual(compose((x) => x + 1, (x) => x * 2)(5), 11);

function once(fn) {
  let called = false;
  let result;

  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }

    return result;
  };
}

let hits = 0;
const init = once(() => ++hits);
init();
init();
assert.strictEqual(hits, 1);

// promisify: node-style callback is the last argument
function promisify(fn) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (err, value) => {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      });
    });
  };
}

const doubleLater = promisify((a, cb) => setTimeout(() => cb(null, a * 2), 1));
doubleLater(21).then((v) => assert.strictEqual(v, 42));
```

**Say out loud:** falsy values are skipped (but the number 0 is dropped too, matching the common spec), the null-prototype trick in groupBy, and that once keeps the first result forever.

</details>

<details>
<summary>P8. Promise.any, camelCase keys, and JSON.stringify</summary>

```js
const assert = require("node:assert");

// Promise.any: first FULFILMENT wins; rejects with AggregateError only if ALL reject
function promiseAny(iterable) {
  return new Promise((resolve, reject) => {
    const items = [...iterable];
    const errors = new Array(items.length);
    let rejected = 0;

    if (items.length === 0) {
      reject(new AggregateError([], "All promises were rejected"));
      return;
    }

    items.forEach((item, i) => {
      Promise.resolve(item).then(resolve, (err) => {
        errors[i] = err;
        rejected += 1;

        if (rejected === items.length) {
          reject(new AggregateError(errors, "All promises were rejected"));
        }
      });
    });
  });
}

// camelCase keys, deep: arrays and plain nested objects only
function camelCaseKeys(value) {
  if (Array.isArray(value)) {
    return value.map(camelCaseKeys);
  }

  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        camelCaseKeys(v),
      ])
    );
  }

  return value;
}

assert.deepStrictEqual(camelCaseKeys({ user_name: 1, home_address: [{ zip_code: 2 }] }), {
  userName: 1,
  homeAddress: [{ zipCode: 2 }],
});

// JSON.stringify core rules:
// undefined / function / symbol are dropped in objects and become null in arrays;
// NaN and Infinity become null; toJSON is honoured (that is how Date works)
function stringify(value) {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "null";
  }

  if (typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }

  if (value instanceof Date) {
    return stringify(value.toISOString());
  }

  if (typeof value.toJSON === "function") {
    return stringify(value.toJSON());
  }

  if (Array.isArray(value)) {
    const parts = value.map((item) => stringify(item) ?? "null");
    return `[${parts.join(",")}]`;
  }

  const parts = [];

  for (const key of Object.keys(value)) {
    const str = stringify(value[key]);

    if (str !== undefined) {
      parts.push(`${stringify(key)}:${str}`);
    }
  }

  return `{${parts.join(",")}}`;
}

const sample = { a: 1, b: undefined, c: () => 1, d: [undefined, NaN, 'x"y'], e: null, f: { g: true } };
assert.strictEqual(stringify(sample), JSON.stringify(sample));

(async () => {
  assert.strictEqual(await promiseAny([Promise.reject(1), Promise.resolve(2), 3]), 2);

  await assert.rejects(
    promiseAny([Promise.reject(1), Promise.reject(2)]),
    (e) => e instanceof AggregateError && e.errors.length === 2
  );
})();
```

**Say out loud:** ask whether cycles must be handled (real JSON.stringify throws on them); Promise.any ignores rejections until none are left.

</details>

<details>
<summary>P9. React: useDebouncedValue + a tiny autocomplete skeleton (machine-coding starter)</summary>

```jsx
function Autocomplete({ fetchSuggestions }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const debounced = useDebouncedValue(query, 300);

  useEffect(() => {
    if (!debounced.trim()) {
      setItems([]);
      return;
    }

    const controller = new AbortController();
    setStatus("loading");

    fetchSuggestions(debounced, controller.signal)
      .then((data) => {
        setItems(data);
        setStatus("idle");
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setStatus("error");
        }
      });

    return () => controller.abort(); // handles race conditions
  }, [debounced, fetchSuggestions]);

  return (
    <div>
      <input
        role="combobox"
        aria-expanded={items.length > 0}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {status === "loading" && <p>Loading...</p>}
      {status === "error" && <p>Something went wrong</p>}
      <ul role="listbox">
        {items.map((item) => (
          <li key={item.id} role="option">
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Extras interviewers add:** keyboard arrows + Enter, highlight matches, cache results, empty state.

</details>

## Machine-coding prompts (React, 60–90 min)

Autocomplete / typeahead · Todo with filters · Infinite scroll list · Paginated table with sort · Tabs · Accordion · Modal with focus trap · Star rating · Progress bars · Tic-tac-toe · File explorer (recursive) · Image carousel · Toast notifications · Data table with search · Stopwatch / timer · Form with validation.

**What they score:** requirements clarification, component breakdown, state ownership, correctness on edge cases (empty, loading, error), accessibility (labels, keyboard, roles), then styling and polish. Talk through trade-offs as you code.

---

# Part 5 — Browser, CSS and web fundamentals

Source: the h5bp Front-end Developer Interview Questions repo (general, HTML and CSS lists). These are the "round-one" questions that still show up at senior level, usually as a follow-up: "and why?".

<details>
<summary>W1. What happens when you type a URL and press Enter?</summary>

1. **Parse + cache check:** the browser checks HSTS and the HTTP cache.
2. **DNS lookup** turns the host into an IP (browser, OS, then resolver caches).
3. **TCP connection** (3-way handshake), then **TLS handshake** for HTTPS (HTTP/3 uses QUIC instead).
4. **HTTP request** goes out; the server responds with HTML (maybe via a CDN, redirects, or SSR).
5. **Parse HTML → DOM**, fetching CSS and JS as discovered. CSS builds the **CSSOM**.
6. **Render tree → layout → paint → composite.** Scripts without async/defer **block parsing**.
7. JS runs, the page becomes interactive (hydration if SSR).

**Interview angle:** "Where can you speed this up?" → CDN, preconnect/dns-prefetch, HTTP caching, compression, fewer render-blocking resources, SSR/SSG for first paint.

</details>

<details>
<summary>W2. script vs script async vs script defer — and where should CSS and JS go?</summary>

- **Plain script:** stops HTML parsing, downloads, runs, then parsing resumes.
- **async:** downloads in parallel, **runs as soon as ready** (order not guaranteed, can interrupt parsing). Good for independent scripts such as analytics.
- **defer:** downloads in parallel, runs **after parsing, in document order**, before DOMContentLoaded. Best default for app code.
- **CSS in head:** CSS is render-blocking, so load it early to avoid unstyled flashes (FOUC).
- **JS at the end of body (or defer):** so it doesn't block rendering.
- `type="module"` scripts are deferred by default.

```html
<head>
  <link rel="stylesheet" href="app.css" />
  <script src="analytics.js" async></script> <!-- order doesn't matter -->
  <script src="app.js" defer></script> <!-- runs in order after parse -->
</head>
```

**Interview angle:** "async vs defer — which for a bundle that needs the DOM?" → defer.

</details>

<details>
<summary>W3. How do you make a page load faster? (the h5bp "name 3 ways" question)</summary>

- **Send less:** minify, tree-shake, compress (Brotli/gzip), optimize images (modern formats, srcset, right size), subset fonts.
- **Send later:** code-split, lazy-load images and routes, defer non-critical JS.
- **Send closer / cache it:** CDN, long-lived immutable cache headers on hashed assets, service worker.
- **Send sooner:** preload critical resources, preconnect to origins, inline critical CSS, SSR/SSG for first paint.
- **Measure first:** Lighthouse, WebPageTest, and the **Core Web Vitals**: LCP (loading), INP (responsiveness), CLS (layout shift).

**Interview angle:** "How do you decide what to fix?" → measure with real-user data (field) and a lab profile, find the biggest metric offender, change one thing, re-measure.

</details>

<details>
<summary>W4. Front-end security: same-origin policy, XSS, CSRF, CSP?</summary>

- **Same-origin policy:** a page can only read responses from the same scheme + host + port. **CORS** is the server opting in to relax it (see JS25).
- **XSS:** attacker gets script running on your page. Defenses: **escape output** (React does by default; `dangerouslySetInnerHTML` bypasses it), sanitize HTML, a **Content-Security-Policy**, HttpOnly cookies so scripts can't read them.
- **CSRF:** another site makes the browser send your cookies to your API. Defenses: **SameSite cookies**, CSRF tokens, checking Origin.
- **Storing tokens:** localStorage is readable by any XSS; HttpOnly + SameSite cookies are safer but need CSRF protection.
- Also: HTTPS everywhere, dependency auditing, never trusting client-side checks.

```jsx
// Dangerous: attacker-controlled HTML runs as markup
<div dangerouslySetInnerHTML={{ __html: userComment }} />

// Safe by default: React escapes text
<div>{userComment}</div>
```

**Interview angle:** "localStorage or cookie for a JWT?" → there is no free lunch: localStorage is exposed to XSS, cookies are exposed to CSRF; HttpOnly + SameSite + CSP is the usual answer.

</details>

<details>
<summary>W5. How does CSS specificity work?</summary>

- When rules conflict, the cascade picks by: **origin and !important**, then **specificity**, then **source order** (later wins).
- Specificity is scored as (inline style, IDs, classes/attributes/pseudo-classes, elements/pseudo-elements). Compared left to right — **one ID beats any number of classes**.
- `*` and combinators add nothing. `:where()` has zero specificity; `:is()` takes its most specific argument.
- Modern tools: **@layer** to control order explicitly instead of fighting specificity.

```css
p { color: black; }              /* (0,0,0,1) */
.note { color: blue; }           /* (0,0,1,0) wins over p */
#intro .note { color: green; }   /* (0,1,1,0) wins over .note */
p.note:hover { color: red; }     /* (0,0,2,1) beats .note, loses to #intro .note */
```

**Gotcha:** reaching for `!important` starts a specificity war; fix the selector or use a layer.

</details>

<details>
<summary>W6. The box model, box-sizing, and block vs inline vs inline-block?</summary>

- **Box model:** content + padding + border + margin. By default width applies to **content only**, so padding and border make the box bigger.
- **box-sizing: border-box** makes width include padding and border — predictable sizing, so it is the common global reset.
- **block:** starts on a new line, takes full width, respects width/height/margins.
- **inline:** flows with text, ignores width/height and vertical margins.
- **inline-block:** flows inline but accepts width/height — good for small buttons and badges.
- **Vertical margins collapse** between adjacent blocks (the larger wins).

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

.card {
  width: 300px;
  padding: 20px; /* total stays 300px because of border-box */
  border: 2px solid;
}
```

</details>

<details>
<summary>W7. position values, z-index, stacking context, and BFC?</summary>

- **static** (default, in flow); **relative** (offset but keeps its space, creates a positioning anchor); **absolute** (removed from flow, positioned against the nearest positioned ancestor); **fixed** (against the viewport); **sticky** (relative until a scroll threshold, then fixed).
- **z-index** only works on positioned elements (and flex/grid items), and only compares **within the same stacking context**.
- A **stacking context** is created by the root, positioned + z-index, opacity < 1, transform, filter, isolation: isolate and similar. A child can never escape its parent's context — the classic "z-index: 9999 does nothing" bug.
- **BFC (block formatting context):** an isolated layout region that contains floats and stops margin collapsing. Triggered by overflow other than visible, display: flow-root, flex/grid items, floats.

```css
.parent {
  position: relative;
  z-index: 1; /* new stacking context */
}

.child {
  position: absolute;
  z-index: 9999; /* still stays under a sibling context that is above .parent */
}

.clearfix {
  display: flow-root; /* modern clearfix: contains floated children */
}
```

**Interview angle:** "z-index isn't working — debug it." → look for an ancestor creating a stacking context, and for a missing position.

</details>

<details>
<summary>W8. Flexbox vs Grid — when do you use which?</summary>

- **Flexbox is one-dimensional:** lay things along a row **or** column. Content drives sizing. Great for toolbars, nav bars, centering, distributing space between items.
- **Grid is two-dimensional:** rows **and** columns together, layout drives sizing. Great for page layouts and card galleries.
- They combine: grid for the page frame, flex inside the cells.
- Key knobs — flex: justify-content, align-items, flex-grow/shrink/basis, wrap; grid: grid-template-columns, fr units, minmax, auto-fit/auto-fill, gap.

```css
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); /* responsive without media queries */
  gap: 16px;
}
```

**Gotcha:** flex items won't shrink below their content by default; add `min-width: 0` to allow truncation or scrolling.

</details>

<details>
<summary>W9. px vs em vs rem, and responsive vs mobile-first?</summary>

- **px:** absolute CSS pixel. **rem:** relative to the **root** font size — predictable and respects user settings. **em:** relative to the **current element's** font size (or the parent's for font-size), so it compounds when nested.
- Use rem for type and spacing, em for things that should scale with their own text (button padding), px for hairline borders.
- **Responsive:** layout adapts to any viewport (fluid grids, media queries, flexible images).
- **Mobile-first:** write the small-screen styles as the base, and add `min-width` media queries to enhance for larger screens. Less overriding, and the lightest CSS reaches the weakest devices.

```css
body {
  font-size: 1rem; /* respects the user's browser setting */
}

.card {
  padding: 1rem;
}

@media (min-width: 768px) {
  .card {
    padding: 2rem; /* enhancement, not override */
  }
}
```

</details>

<details>
<summary>W10. CSS vs JavaScript animations, and reflow vs repaint?</summary>

- **CSS transitions/animations** are declarative and the browser can run them on the **compositor thread** if you animate **transform and opacity** — smooth even when the main thread is busy.
- **JS animations** (requestAnimationFrame, Web Animations API) give dynamic control: physics, scroll-linked, sequencing, runtime values.
- **Reflow (layout):** geometry changed (width, top, font-size) — expensive and cascades. **Repaint:** appearance only (color) — cheaper. **Composite only:** transform/opacity — cheapest.
- That is why translate() usually beats animating top/left.
- Avoid **layout thrashing**: interleaving DOM reads (offsetHeight) and writes in a loop forces a reflow each time. Batch reads, then writes.

```js
// Thrashing: forces layout every iteration
items.forEach((el) => {
  el.style.width = el.parentNode.offsetWidth + "px"; // read, then write, repeatedly
});

// Better: read everything first, then write
const widths = items.map((el) => el.parentNode.offsetWidth);
items.forEach((el, i) => {
  el.style.width = widths[i] + "px";
});
```

</details>

<details>
<summary>W11. Semantic HTML, ARIA, and screen readers — how do you make a page accessible?</summary>

- **Use the right element first:** button for actions, a for navigation, label tied to inputs, headings in order, landmarks (nav, main). Native elements bring keyboard and screen-reader behavior for free.
- **ARIA only fills gaps** (custom widgets): role, aria-label, aria-expanded, aria-live. The first rule of ARIA is *don't use ARIA if a native element exists*; wrong ARIA is worse than none.
- **Keyboard:** everything reachable and operable, visible focus, logical tab order, focus management in modals.
- **Perceivable:** alt text, color contrast (4.5:1), don't rely on color alone, respect prefers-reduced-motion.
- Test with keyboard-only, a screen reader, and automated tools (axe) — automation catches only part of the issues.

```jsx
// Bad: a div pretending to be a button
<div onClick={save}>Save</div>

// Good: free keyboard + role + focus
<button type="button" onClick={save}>
  Save
</button>
```

</details>

---

# Part 6 — Behavioral and project deep dive

Source: h5bp's general list ("recent technical challenge", "disagreement with a collaborator", "maintainability") and the Razorpay senior-frontend write-up (a full round is a **project deep dive**). These can't have a universal answer, so each one gives a frame and the points a senior is scored on. Prepare **2–3 real stories** from your own work and reuse them across questions.

**STAR frame:** Situation (1–2 sentences) → Task (your responsibility) → Action (what *you* did and why, with the trade-off) → Result (a number or concrete outcome) → what you'd do differently.

<details>
<summary>B1. Tell me about a recent technical challenge and how you solved it.</summary>

- Pick something with real ambiguity: a performance problem, a gnarly bug, a migration.
- Show the **method**: reproduce, measure, form a hypothesis, narrow down, fix, verify.
- End with a **result you can quantify** (render time, bundle size, error rate) and what you'd do differently.

**Trap:** a story where the fix was obvious, or where "we" did everything.

</details>

<details>
<summary>B2. How did you handle a disagreement with a teammate or manager?</summary>

- Show you **understood their position first**, then argued with data or a prototype rather than opinion.
- Say how you **disagreed and committed**: the decision got made, and you supported it.
- Pick an example where the outcome was good for the team, not one where you simply "won".

**Trap:** blaming the other person, or claiming you've never disagreed.

</details>

<details>
<summary>B3. What have you done to improve maintainability on a project?</summary>

- Concrete moves: typed boundaries, shared component library, lint/format/CI gates, test strategy, ownership docs, deleting dead code, incremental refactors behind tests.
- Tie each to a **measurable effect**: fewer regressions, faster onboarding, shorter PR cycle.
- Mention how you **got buy-in** — seniors multiply the team, not just their own code.

</details>

<details>
<summary>B4. Walk me through a project you own (the project deep dive).</summary>

- Structure it: **problem and users → architecture → your decisions and the alternatives you rejected → hardest part → result → what you'd change.**
- Expect drill-downs on state management, data fetching, performance, testing, and deployment.
- Be ready to **draw it**, and to say honestly which parts you did not own.

**Trap:** a feature tour with no trade-offs. Interviewers keep asking "why this and not that?" until they find your reasoning (or its limit).

</details>

<details>
<summary>B5. How do you keep learning, and what did you learn recently?</summary>

- Name a **specific** recent thing (a React 19 feature, a TS pattern, a profiling technique) and **how you applied it**.
- Mention sources you actually use (docs, RFCs, source code, side projects) and how you separate hype from what's worth adopting.

</details>
