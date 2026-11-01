# Progress Log

> Companion to `react-learning-path.md`. Log learnings here as you finish each topic. Format: summary from an **interview-answer** angle (what you'd say out loud) + the good practice tasks worth redoing later.

---

## React

_(nothing logged yet — starts at Phase 1)_

---

## JS — Phase 0

### 0.1 Types, primitives vs reference types, coercion, `==` vs `===`, `typeof`

Inner sub-topics below are js.info's own chapter-2 "JavaScript Fundamentals" pages (their internal 2.x numbering), read in order as prep for `0.1`.

#### 0.1.1 Hello, world!

- `<script>` tag, external scripts (`src`), one script tag per file typically.
- Interview angle: rarely asked directly — just know external scripts ignore inline content inside the tag.

#### 0.1.2 Code structure

- Statements, semicolons (ASI — automatic semicolon insertion — and its gotchas, e.g. `return \n {...}` returns `undefined`), comments.
- **Interview gotcha:** `return` on its own line followed by an object literal on the next line breaks — ASI inserts a semicolon after `return`. Always keep `{` on the same line as `return`.

#### 0.1.3 The modern mode, "use strict"

- `"use strict"` at top of script/function enables strict mode (mandatory in classes & modules already).
- Silent errors become real errors (e.g. assigning to undeclared var).
- **Interview angle:** know it exists and why (catches bugs like accidental globals), but you won't be quizzed deeply — ES modules are strict by default anyway.

#### 0.1.4 Variables

- `var` vs `let` vs `const`: function-scoped vs block-scoped; `var` hoists and allows redeclaration, `let`/`const` are in **TDZ** (temporal dead zone) until declaration line.
- `const` = binding is constant, not the value (can still mutate an object/array).
- **🎯 Interview Q:** "What's the difference between var, let, const?" → scope (function vs block), hoisting behavior, redeclaration, TDZ.

#### 0.1.5 Data types

- 8 types: `number`, `bigint`, `string`, `boolean`, `null`, `undefined`, `symbol`, `object`.
- `typeof null === "object"` — famous long-standing JS bug, never fixed for backward compat.
- `typeof function(){}` → `"function"` (functions are objects under the hood).
- No separate int/float — `number` is always a double (IEEE 754); `bigint` exists for arbitrary precision integers (`123n`).
- **🎯 Interview Q:** "What does `typeof null` return, and why is that wrong?" — classic trick question, shows you know JS history/quirks.

#### 0.1.6 Interaction: alert, prompt, confirm

- Browser-only blocking dialogs; `prompt` always returns a string or `null` (if cancelled).
- **Interview angle:** low value — mostly used for toy examples/katas, not asked in interviews.

#### 0.1.7 Type Conversions

- **String conversion:** `String(value)` — mostly does what you'd expect (`null→"null"`, `undefined→"undefined"`).
- **Numeric conversion:** `Number(value)` rules — this is the one to know cold:
  - `true→1`, `false→0`
  - `null→0`
  - `undefined→NaN`
  - `""`/whitespace-only string → `0`
  - numeric string (trimmed) → that number
  - non-numeric string → `NaN`
- **Boolean conversion (truthy/falsy):** falsy values are exactly `0`, `""`, `null`, `undefined`, `NaN`, `false`. Everything else (including `"0"`, `[]`, `{}`) is truthy.
- **🎯 Interview Q:** "Give me all the falsy values in JS." (only 6, listed above) — very commonly asked, easy to fumble `"0"` and `[]` (people wrongly think these are falsy).
- **🎯 Interview Q:** "What does `Number("")` return? `Number(null)`? `Number(undefined)`?" → `0`, `0`, `NaN`. This is the exact foundation behind the coercion table from earlier in this session.

#### 0.1.8 Basic operators, maths

- Binary/unary `+`, `-`, `*`, `/`, `%` (remainder), `**` (exponent).
- **`+` is overloaded** — if either operand is/becomes a string → concatenation, else numeric add. This is the _only_ arithmetic operator that behaves this way; `-`,`*`,`/`,`%` always coerce both sides to numbers (never concatenate).
- Unary `+` is a fast way to convert to number: `+"5" === 5`, `+true === 1`.
- Operator precedence — `*`/`/` bind tighter than `+`/`-`; unary before binary.
- Assignment operators return a value (`let a = b = c = 5` chains); `+=`, `-=`, etc.
- Comma operator `,` — evaluates left to right, returns the last value (rare, seen in `for(a=1, b=2; ...)`).
- **🎯 Interview Q (the one you just drilled):** walk through `"" + 1 + 0`, `"4px" - 2`, `null + 1`, `undefined + 1`, etc. — tests Rule (`+` overload) + Rule (Number() coercion table from 2.7) together. This is the single most common "gotcha quiz" combo from Fundamentals.
- **🎯 Interview Q:** "Why does `0.1 + 0.2 !== 0.3`?" → floating point (IEEE 754) precision — number type has no separate int, so decimal fractions aren't exactly representable in binary.

#### 0.1.9 Comparisons (the confusing one — 2 rules collapse it)

- **`===` (strict):** different types → always `false`. No coercion, ever. Predictable — this is why you default to it.
- **`==` (loose):** coerces, but only 2 things to remember:
  1. **Hardcoded special case:** `null == undefined` → `true` (they only equal _each other_, and nothing else). `null == 0` → `false`, `undefined == 0` → `false` — neither gets numerically converted for `==`.
  2. **Everything else:** both sides convert to **numbers** (same `Number()` table from 2.7/2.8), then compared. E.g. `"0" == false` → `0==0` → `true`; `[] == false` → array→`""`→`0`, `false→0` → `true`.
- **`<`, `>`, `<=`, `>=`:** always coerce to numbers (like `-`/`*`/`/`), **no** null/undefined special case here. So `null >= 0` → `true` (`null→0`, `0>=0`), but `null > 0` → `false` (`0>0` is false).
- **The classic trap:** `null >= 0` is `true` but `null == 0` is `false` — inconsistent because `>=` uses the general numeric rule while `==` uses the hardcoded null/undefined exception. This inconsistency is the strongest real-world argument for "always use `===`."
- **`NaN` never equals anything, not even itself:** `NaN === NaN` → `false`, `NaN == NaN` → `false`. Use `Number.isNaN(x)` or `Object.is(x, NaN)` to check.
- **🎯 Interview Q:** "Is `null == undefined`? Is `null == 0`? Is `null >= 0`?" → `true`, `false`, `true` — tests whether you know the hardcoded exception vs the general numeric rule.
- **🎯 Interview Q:** "How do you check if a value is `NaN`?" → `Number.isNaN(x)`, not `x === NaN`.

#### 0.1.10 Conditional branching: if, '?'

- `if`/`else`/`else if` chains test conditions sequentially; JS auto-converts the condition to boolean (truthy/falsy — same table from 0.1.7).
- **Gotcha:** the string `"0"` is truthy in an `if` — easy to assume it's falsy since numeric `0` is falsy.
- Ternary `? :` is for **picking a value**, not branching control flow — using it to run different statements (not just return different values) is a readability smell.
- **Interview angle:** "Is `"0"` truthy or falsy in JS?" → truthy — only `0`, `""`, `null`, `undefined`, `NaN`, `false` are falsy.

#### 0.1.11 Logical operators

- `||` returns the **first truthy** value (or the last value if none are truthy) — classic use: default values (`input || "default"`).
- `&&` returns the **first falsy** value (or the last value if all truthy) — classic use: conditional rendering (`isLoggedIn && <Welcome />`).
- Both **short-circuit**: stop evaluating as soon as the result is determined. Matters when the right-hand side has a side effect (a function call, an assignment) — it may never run.
- `!` inverts to boolean; `!!` is the idiomatic "convert anything to boolean" trick.
- **Gotcha:** `||` for defaults breaks on legitimate falsy values — `count || 10` gives `10` even when `count` is `0`. That's exactly what `??` (0.1.12) fixes.
- **Interview angle:** "Why does `0 || 'default'` return `'default'` even when 0 is a valid value?" → `||` short-circuits on any falsy value, not just `null`/`undefined` — leads straight into why `??` exists.

#### 0.1.12 Nullish coalescing operator '??'

- `??` returns the first value that is **defined** (not `null`/`undefined`) — unlike `||`, it does not skip over `0`, `""`, or `false`.
- Fixes the exact `||`-default gotcha from 0.1.11: `height ?? 100` correctly keeps `height = 0`, while `height || 100` would wrongly return `100`.
- **Gotcha:** JS forbids mixing `??` directly with `&&`/`||` without parentheses (`a ?? b || c` is a syntax error) — must write `(a ?? b) || c`.
- **Interview angle:** "When would you use `??` instead of `||`?" → whenever `0`, `""`, or `false` are valid values you don't want overridden by a default — e.g. a `height` or `count` field.

#### 0.1.13 Loops: while and for

- `while` checks the condition **before** each iteration; `do...while` checks it **after**, so the body always runs at least once.
- `for (init; condition; step)` bundles all three loop parts into one line — the standard choice for counted iteration.
- `break` exits the loop entirely; `continue` skips to the next iteration.
- **Labels** (`outer: for (...) { ... break outer; }`) let an inner loop break/continue an outer loop — rare, but breaks a common "how do I exit nested loops" confusion.
- **Gotcha:** a loop variable declared with `let` in the `for(...)` header is scoped **per iteration** — this is _why_ `let` (not `var`) fixes the classic "all closures capture the same final `i`" bug in loops with `setTimeout`.
- **Interview angle:** "Why does `for (let i ...)` avoid the closure bug that `for (var i ...)` has?" → `let` creates a fresh binding of `i` per iteration; `var` shares one binding across the whole loop, so callbacks scheduled inside (e.g. `setTimeout`) all see the final value.

#### 0.1.14 The "switch" statement

**Read:** [The "switch" statement](https://javascript.info/switch) — fetched 2026-07-28

- `switch` compares with **strict equality** (`===`) — case values must match type, not just value. `case "3":` never matches `x = 3` (number).
- **Fall-through:** without `break`, execution falls into the next `case` unconditionally, no re-check. This is a feature, not a bug — used deliberately to **group cases** that share one code block (stack multiple `case` labels with no code between them).
- `default` is the `switch` equivalent of a trailing `else` — runs when nothing else matches. Position doesn't matter (doesn't have to be last), but conventionally is.
- Both the switch expression and each `case` value can be arbitrary expressions, not just literals — evaluated and compared each time.
- **Gotcha:** forgetting a `break` is the classic switch bug — code silently "leaks" into the next case's logic instead of erroring, so it's easy to ship and hard to spot in review.
- **Interview angle:** "Does `switch` use `==` or `===`?" → strict equality — `switch(x)` with `case "3"` never matches `x = 3`, same trap as `typeof` mismatches elsewhere.
- **Interview angle:** "How do you make two case values share one block?" → stack the `case` labels with no `break`/code between them, then put the shared code after the last one.

#### 0.1.15 Functions

**Read:** [Functions](https://javascript.info/function-basics) — fetched 2026-07-28

- Declared with `function name(params) { ... }`; variables declared **inside** are local and invisible outside — the function has its own scope.
- **Outer variables** are visible and _modifiable_ from inside a function (closures start here), but a same-named **local parameter/variable shadows** the outer one for that function's body only.
- **Parameters are copied by value** for primitives — reassigning a parameter inside the function never changes the caller's variable.
- **Default parameter values** (`function f(x = 10)`) only kick in when the argument is **omitted or explicitly `undefined`** — passing `null` or `0` does _not_ trigger the default.
- A function with no `return`, or a bare `return;`, implicitly returns `undefined` — there's no such thing as a function that "returns nothing" at the JS level.
- **Gotcha:** never put a newline between `return` and its value — ASI silently inserts a semicolon after `return`, turning `return \n {value}` into `return; {value}` (unreachable block), so the function returns `undefined`. Same root cause as the object-literal ASI trap in 0.1.2, now hitting function returns specifically.
- **Naming convention:** function names should read as verbs (`get…`, `calc…`, `create…`, `check…`) — a function should do one thing, and its name should say what that thing is.
- **Interview angle:** "What does a function return if you don't write a `return` statement?" → `undefined`, always — never `null`, never an error.
- **Interview angle:** "When does a default parameter value actually apply?" → only when the argument is missing or explicitly `undefined` — `f(null)` or `f(0)` skip the default, which trips people up because they expect "falsy → use default."

#### 0.1.16 Function expressions

**Read:** [Function expressions](https://javascript.info/function-expressions) — fetched 2026-07-28

- **Function Declaration** (`function sayHi() {}`) is a standalone statement; **Function Expression** (`let sayHi = function() {}`) is created as part of another expression (an assignment, an argument, etc.) — same runtime object, different creation path.
- **Hoisting difference:** a Function Declaration is fully processed before the script runs, so it's callable _above_ its own definition line. A Function Expression only exists once execution reaches that line — call it earlier and it isn't there yet.
- Functions are **first-class values** — assignable to a variable, copyable, passable as an argument with no `()` (no-parens = "pass the function," parens = "call it now"). This is the entire mechanism behind callbacks.
- **Callback function:** a function passed as an argument specifically so the receiving function can invoke it later — the doc's example is an `ask(question, onYes, onNo)` helper.
- **Gotcha:** in strict mode, a Function Declaration written inside a block (e.g. inside `if {}`) is scoped to that block and invisible outside it. Fix: rewrite it as a Function Expression assigned to a variable declared _outside_ the block.
- **Interview angle:** "Can you call a function before its declaration line in the file?" → yes for a Function Declaration (hoisted whole, body included), no for a Function Expression (only exists after that line executes) — the practical test for telling the two apart.
- **Interview angle:** "What is a callback, concretely?" → a function passed as an argument so the receiving function can call it later — usually after some condition, event, or async result.

#### 0.1.17 Arrow functions, the basics

**Read:** [Arrow functions, the basics](https://javascript.info/arrow-functions-basics) — fetched 2026-07-28

- Syntax scales with parameter count: `(a, b) => expr` for two-plus params, `n => expr` drops the parens for exactly one param, `() => expr` needs the empty parens for zero params.
- **Concise body implicitly returns** the expression — no `return` keyword, no braces. The moment you switch to a `{ }` body for multiple statements, implicit return goes away and `return` is mandatory again, exactly like a normal function.
- This page is explicitly the _pre-`this`_ introduction — js.info flags that arrow functions have more interesting behavior it hasn't covered yet (that's 0.5 in your curriculum, once `this` itself is taught). Don't conflate "arrow fn basics" syntax with the full lexical-`this` story.
- **Interview angle:** "Rewrite `function(a, b) { return a + b; }` as an arrow function." → `(a, b) => a + b` — tests the reflex for implicit return.
- **Interview angle:** "Why do you need explicit `return` if an arrow function's body uses `{ }`?" → braces switch it into a full function body, and a full body never auto-returns — same rule as a regular function.

#### 0.1.18 JavaScript specials (chapter recap)

**Read:** [JavaScript specials](https://javascript.info/javascript-specials) — fetched 2026-07-28

- This page is js.info's own **capstone recap** of the whole "JavaScript Fundamentals" chapter (0.1.1–0.1.17) — no new mechanics, just the chapter compressed into a checklist: code structure/semicolons, strict mode, `let`/`const`/`var`, the 8 data types, `alert`/`prompt`/`confirm`, operators (`+` string-concat overload, short-circuiting `&&`/`||`), `===` vs `==`, the three loop forms, `switch`'s strict equality, and the three ways to create a function (declaration/expression/arrow).
- **Interview angle:** "Give me a 60-second lightning round on JS fundamentals." → this recap _is_ that answer, in order: types & coercion → variables/scope → operators/comparisons → control flow → functions. Useful as the literal answer key for a rapid-fire opener.

### 0.2 Scope (block/function/lexical), hoisting, TDZ, `var`/`let`/`const`

#### 0.2.1 The old "var"

**Read:** [The old "var"](https://javascript.info/var) — fetched 2026-07-28

- **`var` is function-scoped, not block-scoped** — it ignores `{}` entirely. A `var` declared inside an `if`/`for` block is visible outside that block, as long as you're still inside the enclosing function (or global scope if there's no function):

  ```js
  if (true) {
    var test = true;
  }
  alert(test); // true — leaked out of the if-block

  if (true) {
    let test = true;
  }
  alert(test); // ReferenceError — let respected the block
  ```

- **Loop variables leak the same way** — `for (var i = 0; ...)` leaves `i` (and anything else declared with `var` inside the loop body) accessible _after_ the loop ends, still holding its final value. `let` in the same spot would throw instead.
- **Hoisting is declaration-only, not assignment** — the `var name;` part is moved to the top of the function, but the `name = value` assignment stays exactly where it's written in the code. That's why reading a `var` before its assignment line gives `undefined`, not an error and not the eventual value:
  ```js
  function sayHi() {
    alert(phrase); // undefined — declaration hoisted, assignment hasn't run yet
    var phrase = "Hello";
  }
  ```
  Mentally, this is identical to the engine rewriting it as: declare `phrase` at the top → run `alert(phrase)` → _then_ assign `"Hello"`.
- **`var` tolerates redeclaration in the same scope silently** — `var user = "Pete"; var user = "John";` just reassigns, no error. `let user; let user;` throws `SyntaxError: 'user' has already been declared`. This tolerance is a leftover from `var` predating any real module system, where accidental double-includes of the same script needed to not hard-crash.
- **Gotcha:** the `var`-in-a-block leak is _not_ hoisting doing something clever — it's simply that `var` was never block-aware to begin with. Conflating "leaks out of `{}`" with "gets moved to the top" is the exact confusion the MDN hoisting glossary explicitly warns about.
- **Interview angle:** "If `var` is hoisted, why does logging it before its assignment give `undefined` instead of throwing or giving the real value?" → only the _declaration_ hoists to the top of the function; the _assignment_ executes in place. The variable exists (no `ReferenceError`) but hasn't been assigned yet (so it's `undefined`) at the point you read it.
- **Interview angle:** "Why does `var` inside an `if` block leak outside the block, but `let` doesn't?" → `var` is function-scoped (blocks are invisible to it); `let`/`const` are block-scoped — the `{}` itself is the boundary.

#### 0.2.2 Hoisting (the 3-way taxonomy)

**Read:** [Hoisting](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting) — fetched 2026-07-28

- "Hoisting" isn't a formal term in the ECMAScript spec — it's just the informal name for "declarations act as if they were moved to the top of their scope." MDN organizes it into **three practical buckets**:
  1. **Full hoisting** — function declarations (`function`), generator functions, async functions. Usable _before_ their line, with the complete, callable function already available — this is what lets you call a function above its own definition.
  2. **Declaration-only hoisting** — `var`. Usable before its line, but the value is `undefined` until the assignment line actually runs (exactly what you just logged in 0.2.1).
  3. **TDZ hoisting** — `let`, `const`, `class`. The name is reserved from the top of the block, but touching it before its declaration line throws `ReferenceError` — no "peek at `undefined`" grace period like `var` gets.
- **The temporal dead zone (TDZ)** is just the name for that window — from the top of the scope down to the actual declaration line — where a `let`/`const`/`class` name exists (reserved) but is off-limits (uninitialized).
- **Shadowing inside the TDZ** — the genuinely tricky case:
  ```js
  const x = 1;
  {
    console.log(x); // ReferenceError — not 1!
    const x = 2;
  }
  ```
  Because `let`/`const` are block-scoped, JS knows this block has its own `x` from the top of the block — so `x` resolves to the _inner_ declaration for the whole block, not the outer one. It just hasn't reached that inner declaration's line yet, so it's still in the TDZ → error, instead of quietly falling back to the outer `x = 1`.
- **Gotcha:** don't conflate `var` "leaking" out of a `{}` block with hoisting — MDN calls this out explicitly. `var` was simply never block-scoped; nothing gets "moved" anywhere for that behavior. Hoisting is about _before-the-line_ access, not _outside-the-block_ access.
- **Interview angle:** "What are the three kinds of hoisting?" → full (function declarations — usable + complete), declaration-only (`var` — usable but `undefined`), and TDZ (`let`/`const`/`class` — reserved but throws until initialized).
- **Interview angle:** "Why does reading a shadowed `let`/`const` inside a block throw, instead of falling back to the outer variable?" → block scope means the inner declaration claims the name for the _entire_ block starting from the top, even before its own line runs — so there's no outer fallback, just an uninitialized inner binding sitting in its TDZ.

### 0.3 Functions, arrow functions, higher-order functions & callbacks

#### 0.3.1 Rest parameters and spread syntax

**Read:** [Rest parameters and spread syntax](https://javascript.info/rest-parameters-spread) — fetched 2026-08-01

- **Rest parameters** (`...args`) gather all remaining arguments into a real array, and must be the **last** parameter — anything after `...rest` in the parameter list is a syntax error, not just bad style.
- The **`arguments`** object exists in traditional functions, holds every arg by index, is array-like and iterable but **not a true array** — no `.map`/`.filter`/`.reduce`. Arrow functions don't have their own `arguments` at all; they read the enclosing (non-arrow) function's.
- **Spread syntax** expands an iterable into individual elements at a call site, or inside an array/object literal — same three dots as rest, opposite direction: rest **collects**, spread **expands**.
- Spread only works on **iterables** (arrays, strings, `Set`, `Map`, ...). `Array.from` also works on array-**likes** that aren't iterable — the distinction matters if spread throws unexpectedly on something that "looks like an array."
- **Gotcha:** rest parameters must come last — `function f(a, ...rest, b)` is a hard syntax error, not a lint warning.
- **Gotcha:** converting a regular function to an arrow function and expecting `arguments` to still work is a classic mistake — arrow functions silently fall through to the outer scope's `arguments` (or throw if there isn't one), they never get their own.
- **Interview angle:** "Why prefer rest parameters over the `arguments` object?" → `arguments` isn't a real array (no array methods), doesn't exist in arrow functions, and always contains _every_ argument — rest parameters let you cleanly capture just the "leftover" args after named ones.
- **Interview angle:** "Rest vs spread — same three dots, what's the actual difference?" → direction: rest **collects** multiple values into one array parameter; spread **expands** one iterable into multiple individual arguments or elements.

#### 0.3.2 Function object, NFE

**Read:** [Function object, NFE](https://javascript.info/function-object) — fetched 2026-08-01

- **Functions are objects** — `typeof fn === "function"` is really a callable object under the hood, so you can attach arbitrary custom properties to it exactly like any other object: `fn.counter = 0`.
- **`.name`** — auto-inferred even for anonymous functions assigned to a variable ("contextual naming"); it's an empty string only when the engine genuinely can't infer one.
- **`.length`** — the number of _declared_ parameters, explicitly excluding rest parameters — libraries use this for polymorphic dispatch based on arity (how many args a callback expects).
- **Custom properties and closure variables live in parallel worlds** — assigning `fn.someProp = x` does **not** create a local variable inside `fn`, and a local variable declared inside `fn` is invisible as a property from outside. Neither one leaks into the other.
- **Named Function Expression (NFE)** — `let f = function func() {...}` — the internal name `func` is only visible _inside_ the function body and gives a reliable self-reference for recursion that survives the outer variable `f` being reassigned to something else.
- **Gotcha (the exact bug from today's debugging):** attaching a property to a function only happens once that assignment line actually **executes** — meaning the function has to be **called** at least once. Reading the property off a reference that was never invoked gives `undefined`; reading it off the **return value of a call** (`fn().prop`) instead of off the reference (`fn.prop`) also fails unless the function explicitly `return`s something that carries that property.
- **Gotcha:** the NFE internal-name trick only applies to Function **Expressions**, not Function Declarations — a Function Declaration's own name is already reliably bound in its enclosing scope, so there's no equivalent problem to solve there.
- **Interview angle:** "Can you attach a property to a function — does that create a variable inside it?" → Yes to attaching, no to creating a variable — properties and closure variables are two separate, non-interacting mechanisms even though both are "on" the same function.
- **Interview angle:** "Why would you name a function expression you've already assigned to a variable?" → so recursive calls inside it keep working even if the outer variable gets reassigned — the internal name is a stable, function-scoped self-reference that the outer variable binding isn't.

#### 0.3.3 Scheduling: setTimeout and setInterval

**Read:** [Scheduling: setTimeout and setInterval](https://javascript.info/settimeout-setinterval) — fetched 2026-08-01

- **Both share the same syntax:** `(func, delay, ...args)` — anything after `delay` is forwarded as arguments to `func`; `delay` defaults to `0` if omitted.
- **`clearTimeout`/`clearInterval`** stop a scheduled call using the ID returned by `setTimeout`/`setInterval` — the ID itself isn't nulled out after clearing, it just becomes inert.
- **Nested `setTimeout` vs `setInterval`:** `setInterval` fires every N ms regardless of how long the callback itself takes — a slow callback compresses the real gap between calls. Nested `setTimeout` only schedules the _next_ call once the current one finishes, guaranteeing a fixed gap and letting the delay change dynamically call-to-call (e.g. exponential backoff on a failing request).
- **Zero-delay `setTimeout` isn't instant** — `setTimeout(fn, 0)` runs "as soon as possible," but only _after_ the currently executing synchronous script finishes. It's still a queued macrotask, not an interrupt.
- **Gotcha:** a scheduled callback keeps its outer closure's Lexical Environment alive (same mechanism as 0.4's closure/GC notes) — an uncancelled repeating interval holding a closure over a large object is a **real** memory leak, not a theoretical one.
- **Gotcha:** browsers clamp nested timers to a minimum ~4ms delay after 5+ levels of nesting (a historical spec quirk that doesn't apply in Node.js), and background tabs / battery-saver mode can silently stretch delays to 300–1000ms — "delay" is a floor, never a hard guarantee.
- **Interview angle:** "`setInterval` vs nested `setTimeout` — when do you pick one over the other?" → `setInterval` is simpler for a genuinely fixed cadence, but if the callback's duration is unpredictable or the delay needs to change between calls (polling backoff), nested `setTimeout` is safer since it never queues the next call until the current one is done.
- **Interview angle:** "Does `setTimeout(fn, 0)` run immediately?" → No — it still queues `fn` as a macrotask behind the current synchronous code, however short that queue wait ends up being.

### 0.4 Closures

#### 0.4.1 Variable scope, closure — the mechanics (Closure / GC / optimization sections)

**Read:** [Variable scope, closure](https://javascript.info/closure) — fetched 2026-07-28

- **A closure is a function bundled with a reference to the Lexical Environment it was created in** — js.info's actual claim is stronger than the usual definition: _every_ JS function is a closure automatically, whether or not it visibly touches an outer variable, because every function keeps a hidden link (`[[Environment]]`) to where it was born.
- **Lexical Environment mechanics, step by step:** each running function/block gets an internal "Environment Record" object holding its local variables, plus a reference to the _outer_ Lexical Environment. When an inner function is created, it captures a reference to that chain via `[[Environment]]` — so even after the outer function call finishes and returns, the inner function still has a live link back to the outer variables.
- **Garbage collection ties directly to this:** normally a Lexical Environment is freed the moment its function call ends and nothing references it anymore. But if a nested function _survives_ the outer call (returned, stored in a variable, assigned as an event handler) and that nested function references the outer Lexical Environment, the whole environment is kept alive in memory for as long as that nested function exists — this is the literal mechanism behind "closures keep memory alive."
- **Real-life engine optimization (V8):** an engine can garbage-collect an individual outer variable _within_ a still-alive closure if it can prove that specific variable is never referenced by the retained function — it doesn't have to keep the entire outer scope alive just because one variable from it is used. Practical effect: in devtools, a variable you'd expect to see in a closure's scope sometimes shows as unavailable — that's the engine having proven it's dead weight, not a bug in your code.
- **Gotcha:** people assume a closure "copies" the outer variable's value at creation time — it doesn't. It holds a **live reference** to the same Lexical Environment, so if the outer variable changes later, the closure sees the _new_ value, not a frozen snapshot (this is the exact mechanism behind the classic loop bug in 0.4.2).
- **Interview angle:** "Is a closure just 'a function that uses an outer variable'?" → No — js.info's stronger claim is that _every_ function is a closure by construction (it always keeps a reference to its creation environment); you only _notice_ it when the function is used after its outer scope would otherwise have ended.

#### 0.4.2 Closures (MDN) — practical patterns, the loop bug, and performance

**Read:** [Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures) — fetched 2026-07-28

- **Function factory pattern** — a function that returns a customized function, with the "customization" baked in via closure:
  ```js
  function makeAdder(x) {
    return function (y) {
      return x + y; // closes over x
    };
  }
  const add5 = makeAdder(5);
  add5(2); // 7 — remembers x = 5 forever, even though makeAdder already returned
  ```
- **Private variables / module pattern** — the classic way to fake "private" state before `#privateFields` existed: wrap state in an IIFE, return only the methods that close over it, and the raw variable is never reachable from outside:
  ```js
  const counter = (function () {
    let privateCounter = 0;
    return {
      increment() {
        privateCounter++;
      },
      value() {
        return privateCounter;
      },
    };
  })();
  counter.increment();
  counter.value(); // 1
  // privateCounter itself: no way to reach it directly, ever
  ```
- **The classic loop-closure bug, and 3 concrete fixes** — using `var` in a loop means every callback closes over the _same_ shared variable, not a fresh one per iteration:

  ```js
  // ❌ every handler alerts the SAME final item
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    el[i].onclick = function () {
      showHelp(item.help);
    };
  }
  ```

  - **Fix 1 — function factory:** wrap the handler-creation in its own function call per iteration, so each call gets its own fresh parameter:
    ```js
    function makeHandler(help) {
      return function () {
        showHelp(help);
      };
    }
    el[i].onclick = makeHandler(items[i].help);
    ```
  - **Fix 2 — IIFE:** immediately invoke a wrapper function inside the loop body, creating a new scope (and a new copy of `item`) on every pass.
  - **Fix 3 — swap `var` for `let`:** simplest fix — `let` creates a fresh binding _per iteration_ automatically, so no manual wrapping is needed at all. (This is the same fact you already logged back in 0.1.13's for-loop closure gotcha — now you have the actual mechanism _why_ it works, via 0.4.1's Lexical Environment model.)

- **Performance gotcha — don't assign a closure as an instance method inside a constructor:**

  ```js
  // ❌ every single instance gets its OWN copy of the function
  function MyObject(name) {
    this.name = name;
    this.getName = function () {
      return this.name;
    };
  }

  // ✅ one shared function on the prototype, `this` supplies the per-instance data
  function MyObject(name) {
    this.name = name;
  }
  MyObject.prototype.getName = function () {
    return this.name;
  };
  ```

  The `❌` version recreates a brand-new closure (new function object) for every instance you construct — wasted memory at scale. The `✅` version shares one function across all instances and relies on `this` for per-instance data, no closure needed at all.

- **What `.prototype` mechanically is (previews 0.6, but summarized here since the fix above is meaningless without it):**
  - Every function automatically gets a `.prototype` property the moment it's created — a plain object, empty by default. This only matters once the function is used as a constructor via `new`.
  - `new MyObject("Alice")` creates a fresh empty object and secretly links it to `MyObject.prototype` — not a copy, a **live pointer** to that exact object. This internal link is called `[[Prototype]]`.
  - **Property lookup walks that link:** `alice.getName` — JS checks if `alice` has its own `getName` property; if not, it follows `[[Prototype]]` to `MyObject.prototype` and looks there instead. Found → use it.
  - **Every instance of the _same_ constructor shares the exact same one `.prototype` object** — `alice`, `bob`, `carol` from `new MyObject(...)` all point at the identical `MyObject.prototype`, not three separate copies of it. That's _why_ `alice.getName === bob.getName` is `true` — there's only ever one `getName` function, found via three different lookup paths.
  - **Different constructors have their own, separate `.prototype` objects** — `Car.prototype` and `MyObject.prototype` are two unrelated objects by default; an instance made via `new Car(...)` never sees `MyObject.prototype`'s methods unless you deliberately wire up inheritance between them (real prototypal inheritance — the actual subject of 0.6).
  - Diagram:
    ```
    alice --[[Prototype]]--\
    bob   --[[Prototype]]---> MyObject.prototype = { getName: <fn> }
    carol --[[Prototype]]--/
    ```
  - **This is the entire mechanism behind the `✅` fix above:** moving `getName` onto `MyObject.prototype` means it's created exactly **once**, and every instance — no matter how many you make — reaches it through this shared link instead of getting its own copy.
- **Interview angle:** "Why does a `var` loop only ever alert the last item, and how do you fix it — name more than one way?" → all iterations share one `var` binding, so every closure references the same final value by the time any callback actually runs; fix with a function-factory wrapper, an IIFE, or (simplest) switching to `let`.
- **Interview angle:** "Why is creating closures inside a constructor considered a performance smell?" → each `new` call creates a brand-new function object for that closure, one per instance, instead of sharing a single function via the prototype — wasteful at scale, and unnecessary since `this` already gives per-instance access without a closure.

**Real-world tie-in — why React class components deliberately pay this cost (complex; previews 0.5's `this` binding, but worth logging now since it explains legacy code you'll actually encounter):**

- **The key insight from this session's discussion:** `this.getName = function(){...}` is _technically_ a closure (every function is, per 0.4.1), but it's a **wasted** one — it never uses anything from its enclosing scope, only `this`, which doesn't need a closure since it's re-supplied fresh at every call site (`instance.method()`). That's why hoisting it to the prototype is free — no correctness lost, memory saved.
- **But there's a real scenario where you're _forced_ to pay that same per-instance closure cost on purpose:** class components passing a method as a detached callback prop, e.g. `<button onClick={this.handleClick}>`.
  ```js
  class Toggle extends React.Component {
    constructor(props) {
      super(props);
      this.state = { on: false };
      this.handleClick = this.handleClick.bind(this); // <- the line in question
    }
    handleClick() {
      this.setState((prev) => ({ on: !prev.on }));
    }
    render() {
      return (
        <button onClick={this.handleClick}>
          {this.state.on ? "On" : "Off"}
        </button>
      );
    }
  }
  ```
- **Why the `.bind(this)` line exists at all:** `handleClick` is defined as a normal class method, which — same as the `MyObject.prototype.getName` example — lives on `Toggle.prototype`, shared across every instance. That's fine as long as you call it _through_ the instance (`someToggle.handleClick()`), because `this` gets supplied dynamically by the dot. But `onClick={this.handleClick}` doesn't do that — it hands React a **bare function reference**, detached from the instance. React later calls it as a plain `fn()`, with no instance to the left of any dot. Inside a class body (always strict mode), that means `this` is `undefined` — so `this.setState(...)` would throw.
- **What `.bind(this)` actually does:** it creates a **brand-new function** — a genuine closure that permanently locks `this` to that specific instance, no matter how or where the function is later called — and assigns it as an own property on the instance (`this.handleClick = ...`), which **shadows** the shared prototype version for that instance specifically. This is the _exact same shape_ as the `❌ this.getName = function(){...}` example from earlier in this topic — one extra function object created per instance.
- **The difference that makes it worth it here:** in the `MyObject.getName` case, paying the closure cost bought you _nothing_ (the shared prototype version worked identically). In the `Toggle.handleClick` case, paying that same cost is the **only** way to make the callback still work correctly once it's been detached from the instance and handed to a plain-callback-consuming API like `onClick`. Same trade-off table as 0.4.2's module-pattern comparison: pay the closure-per-instance cost **only when you're getting something real for it** — here, a correctly-bound `this` that survives being passed around as a bare reference.
- **The other common fix, arrow class fields (`handleClick = () => {...}` as a class property instead of a method):** this previews 0.5 properly, but the short version — arrow functions don't have their own `this` at all; they lexically close over whatever `this` is in the scope where they're _defined_. Defined as a class field, that scope is the constructor's, where `this` is the instance — so the arrow function closes over the instance's `this` permanently, achieving the same "locked forever" effect as `.bind(this)`, just via arrow-function closure semantics instead of an explicit `.bind()` call. Same memory trade-off either way: one function per instance, paid deliberately.
- **Interview angle:** "Why do React class components `.bind(this)` in the constructor, or use arrow-function class fields, instead of just defining methods normally?" → normal class methods live on the shared prototype and rely on being called _through_ the instance (`instance.method()`) for `this` to resolve correctly; passing a method as a props callback (`onClick={this.handleClick}`) detaches it from the instance, so `this` would be `undefined` when React calls it later. `.bind(this)` or an arrow class field creates a per-instance closure that locks `this` permanently, at the cost of one extra function object per instance — the same cost the `MyObject.getName` example warned against, except here it's actually necessary.

**Closure quick-fire — try these before checking the answer:**

1. What does this log, and why?
   ```js
   function outer() {
     let count = 0;
     return function () {
       return ++count;
     };
   }
   const c1 = outer();
   const c2 = outer();
   console.log(c1(), c1(), c2()); // ?
   ```
   → `1 2 1` — `c1` and `c2` are two _separate_ calls to `outer()`, so each gets its own independent `count` in its own Lexical Environment. `c1`'s two calls share state with each other, but not with `c2`.
2. Write a `once(fn)` HOF that lets `fn` run only the first time it's called, and returns `undefined` on every call after that — no external flag variable, only closure state.
   →
   ```js
   function once(fn) {
     let called = false;
     return function (...args) {
       if (called) return undefined;
       called = true;
       return fn(...args);
     };
   }
   ```
3. Why does the memory in a closure _not_ get freed the instant the outer function returns, even though normal local variables would be?
   → because the returned inner function keeps a live `[[Environment]]` reference to the outer Lexical Environment — as long as anything (a variable, an event handler, an array) still holds that inner function, the Lexical Environment it points to can't be garbage-collected.
4. Is this a closure, and does it "leak" `bigArray`'s memory?
   ```js
   function make() {
     const bigArray = new Array(1_000_000).fill(0);
     const smallValue = 42;
     return function () {
       return smallValue;
     };
   }
   ```
   → Yes it's technically a closure (the returned function has `[[Environment]]` pointing at `make`'s scope), but per 0.4.1's V8 optimization note, since the returned function never references `bigArray`, a smart engine can prove that and collect `bigArray` anyway — closures don't automatically keep _everything_ in the outer scope alive, only what's provably still reachable.

### 0.5.1 Objects & Object Methods / `this`

**Read:** [Objects](https://javascript.info/object), [Object methods, "this"](https://javascript.info/object-methods) — fetched 2026-08-28

- **Objects are keyed collections** — properties are key-value pairs; keys are strings/symbols and values can be anything. Objects can be created with object literals, and properties can be added, changed, or deleted.

- **Property access has two forms:** dot notation is for known/simple property names; square brackets are required when the key contains spaces/special characters or when the property name comes from a variable/expression. **Computed properties** use square brackets while creating the object.

- **Property shorthand** lets an existing variable become a property without repeating the name. Object property names can also be reserved words, and non-string keys are converted to strings.

- **Property existence:** reading a missing property gives `undefined`, but that doesn't prove the property doesn't exist. **`in`** checks whether the property actually exists, including when its value is explicitly `undefined`.

- **`for...in`** iterates over object keys. Object property ordering has a specific rule: **integer-like keys are sorted numerically**, while other keys follow creation order.

- **Methods are functions stored as object properties.** The method shorthand is the preferred concise syntax for defining them inside an object.

- **`this` is determined at call time, not declaration time.** With `object.method()`, **`this` is the object before the dot**. The same function can therefore be assigned to different objects and receive different `this` values.

- **Gotcha:** don't reference the outer variable name inside an object method when you mean "the current object." If the object is later copied/reassigned, the method can point at the wrong object; `this` follows the object actually making the call.

- **Gotcha:** detaching a method changes the call context. A bare function call does not get the original object as `this`; in strict mode, `this` becomes `undefined`. `this` is therefore **not permanently bound to the object where the function was written**.

- **Arrow functions have no own `this`.** They take `this` lexically from the surrounding normal function/context. This is why an arrow nested inside an object method can use the method's `this`, but an arrow itself cannot establish a new method-style `this`.

- **🎯 Interview Q:** "How is `this` determined in JavaScript?" → For a normal function call, `this` is determined at runtime by how the function is called. With `object.method()`, it is the object before the dot; it is not determined by where the function was declared.

- **🎯 Interview Q:** "What happens to `this` when you copy the same method between objects?" → The function can be reused; each method call gets the object before the dot as its `this`.

- **🎯 Interview Q:** "Why don't arrow functions behave like normal methods with `this`?" → Arrow functions don't have their own `this`; they capture it lexically from the surrounding scope.

**Recap — what the docs say to take away:**

- Objects store **key-value properties**, and properties can hold functions.
- Use **dot notation** for normal known keys and **square brackets** for dynamic/complex keys.
- Use **`in`** when you need to distinguish a missing property from an existing property whose value is `undefined`.
- Object functions are **methods**; `object.method()` gives the method `this = object`.
- **`this` is runtime/call-site based**, so the same function can have different `this` values.
- **Arrow functions don't have their own `this`** — they take it from the surrounding context.

# 0.5.2 Function Binding — `bind`, Partial Functions, `call` & `apply`

**Read:** [Function binding](https://javascript.info/bind), [Decorators and forwarding, `call`/`apply`](https://javascript.info/call-apply-decorators) — _Fetched 2026-08-28_

---

## 📌 Core Concepts

### 1. Losing `this` Context

- **The Problem:** When an object method is passed as a callback, it can lose its original object context because `this` depends entirely on how the function is invoked.
- **The Gotcha:** Assigning a method to another variable does not preserve its original `this`.

```javascript
const user = {
  name: "Neeraj",
  sayHi() {
    console.log(this.name);
  },
};

const fn = user.sayHi;
fn(); // undefined (or error in strict mode)
// The function is now called without 'user' as the object before the dot, so its 'this' context is lost.
```

### 2. Fixing Context with `bind()`

- **The Solution:** `func.bind(context)` creates a new function where `this` is permanently set to the supplied context.
- **Usage:** The new function can be passed around and called later without losing that context. This is highly useful for callback-based APIs.

```javascript
const fn = user.sayHi.bind(user);
setTimeout(fn, 1000); // Works perfectly! Logs "Neeraj" after 1 second.
```

- **Immutable Context:** Once a function has been bound to an object, calling the resulting function with another object does not change its bound `this`.

### 3. Partial Functions & Argument Binding

- **Definition:** Fixing some arguments of an existing function creates a new, more specific function. The new function only needs the remaining arguments.
- **How it works:** Arguments passed to `bind()` after the `this` value are permanently supplied to the new function.
- **Gotcha:** Partial application does not strictly require `this`. When `this` is irrelevant, `null` can be supplied as the context.

```javascript
function multiply(a, b) {
  return a * b;
}

const double = multiply.bind(null, 2);
double(5); // Returns 10
// This is effectively calling the original function with 2 already fixed as the first argument.
```

---

## ⚡ Context Execution: `call()` vs `apply()`

Both methods explicitly set `this` and execute the function **immediately**. They allow **Function Borrowing**—executing a function using another object as its `this`, without permanently attaching the function to that object.

### The Key Difference: Argument Delivery

- **`call()`:** Invokes the function with the supplied object as `this`, while the remaining arguments are passed **individually**.
  ```javascript
  greet.call(user, "Hello");
  // Syntax: call(context, arg1, arg2, arg3)
  ```
- **`apply()`:** Invokes the function with the supplied object as `this`, but arguments are supplied as an **array-like object**.
  ```javascript
  greet.apply(user, ["Hello"]);
  // Syntax: apply(context, [arg1, arg2, arg3])
  ```

---

## 🎯 Interview Angles

- **"What's the difference between call, apply, and bind?"**
  - `call()` and `apply()` execute the function immediately with a chosen `this`.
  - `call()` takes arguments individually, while `apply()` takes them as an array-like object.
  - `bind()` does not execute immediately; it returns a new function with `this` fixed for later execution.
- **"What is a partial function?"**
  - A new function created by fixing some arguments of an existing function, leaving the remaining arguments to be supplied later.
- **"Why use bind() instead of call()?"**
  - `call()` executes immediately, while `bind()` creates a reusable function with the desired `this` already fixed for future execution (like in callbacks).

---

## 📝 Summary Checklist

- [x] Passing an object method as a callback can cause it to lose `this`.
- [x] `bind()` creates a new function with `this` fixed to a particular object.
- [x] `bind()` can also fix arguments, creating a partial function.
- [x] `call()` executes immediately with a chosen `this` and individually supplied arguments.
- [x] `apply()` executes immediately with a chosen `this` and an array-like collection of arguments.

---

### 0.6 Prototypes & Classes — `class` syntax, inheritance, `instanceof`

Prototype-chain mechanics (`[[Prototype]]`, `Function.prototype`, manual prototypal inheritance) were already covered earlier in this session — this entry only logs the **class syntax** half: chapters 1, 2, and 6 of js.info's Classes section (3–5 and 7 — static/private fields, extending built-ins, mixins — are lower-priority ➕ per the curriculum's "know cold" bar and deferred).

**Read:** [Class basic syntax](https://javascript.info/class), [Class inheritance](https://javascript.info/class-inheritance), [Class checking: "instanceof"](https://javascript.info/instanceof) — fetched 2026-09-14

- **A `class` is not a new kind of thing — it compiles down to a function.** Writing `class User {...}` makes JS create a function named `User` from the `constructor` method and stash every other method onto `User.prototype`. `typeof User` is still `"function"`.

  ```js
  class User {
    constructor(name) {
      this.name = name;
    }
    sayHi() {
      console.log(this.name);
    }
  }

  console.log(typeof User); // "function" — a class IS a function under the hood
  console.log(User.prototype.sayHi); // the method lives on the prototype, not on each instance
  ```

- **It's "not just sugar" — 3 real differences from a plain constructor function:**
  1. Classes carry an internal `[[IsClassConstructor]]: true` flag — calling `User()` without `new` throws, instead of silently running with `this === undefined`/global object like an old-style constructor function would.
  2. **Class methods are non-enumerable** — the class definition sets `enumerable: false` on everything it puts on the prototype, so `for...in` over an instance won't leak method names the way it would with a method attached manually via `Constructor.prototype.method = ...`.
  3. **The entire class body runs in strict mode automatically**, with no `"use strict"` needed.

- **Class fields (`name = "John"`) are NOT the same as methods.** The critical distinction: fields are set on the **individual instance**, not on `ClassName.prototype`. Methods are shared (one function, found via the prototype chain); fields are per-object, copied fresh into every instance's own properties.

  ```js
  class Button {
    // class field — created fresh on EVERY instance, not shared
    onClick = () => {
      console.log("clicked", this.value);
    };
  }
  ```

  This is exactly why an arrow-function class field is the modern fix for the "losing `this`" problem from 0.4.2/0.5's `.bind(this)` discussion — the arrow field closes over the instance's own `this` at construction time, so it survives being handed off as a detached callback (`onClick={instance.onClick}`) with no `.bind()` needed. Same underlying trade-off logged in 0.4.2: one extra function per instance, paid deliberately.

- **`extends` wires up the prototype chain for you.** `class Rabbit extends Animal` sets `Rabbit.prototype.[[Prototype]] = Animal.prototype` — method lookup on a `Rabbit` instance now falls through: own property → `Rabbit.prototype` → `Animal.prototype` → ... — the exact same walk-the-`[[Prototype]]`-chain mechanic already covered for plain prototypal inheritance, just spelled with `extends` instead of manually reassigning `.prototype`.

  ```js
  class Animal {
    constructor(name) {
      this.name = name;
    }
    speak() {
      console.log(`${this.name} makes a sound.`);
    }
  }

  class Rabbit extends Animal {
    speak() {
      super.speak(); // calls Animal's version first
      console.log(`${this.name} hops away.`);
    }
  }

  const r = new Rabbit("Roger");
  r.speak();
  // Roger makes a sound.
  // Roger hops away.
  ```

- **`super()` in the constructor is mandatory before touching `this` — and this is the single biggest gotcha of the whole topic.** A derived class's constructor does not create the object itself; the base class constructor does that. So:

  ```js
  class Rabbit extends Animal {
    constructor(name, earLength) {
      this.earLength = earLength; // ReferenceError — 'this' isn't defined yet
      super(name);
    }
  }
  ```

  ```js
  class Rabbit extends Animal {
    constructor(name, earLength) {
      super(name); // must run first — this is what actually builds 'this'
      this.earLength = earLength;
    }
  }
  ```

  If a derived class defines no constructor at all, JS auto-generates one that's just `constructor(...args) { super(...args); }`, so plain `extends` with no custom constructor "just works" without you writing anything.

- **`super.method()` doesn't resolve through `this` — it resolves through `[[HomeObject]]`.** Every method remembers the object it was defined on via an internal `[[HomeObject]]` property; `super` uses that to find the parent prototype, not whatever `this` happens to be at call time. Practical fallout: methods that use `super` are no longer "free-floating" — copying such a method from one object/class onto another keeps `[[HomeObject]]` pointing at the *original* definer, so `super` inside it will resolve against the wrong parent.

  ```js
  // arrow functions don't have their own `super` any more than they have their own `this` —
  // an arrow used inside a method still resolves `super` from the enclosing method's [[HomeObject]]
  class Rabbit extends Animal {
    speak() {
      setTimeout(() => {
        super.speak(); // fine — arrow has no own `super`, inherits it from `speak()`'s context
      }, 100);
    }
  }
  ```

- **Gotcha — overriding a class field behaves differently from overriding a method, and it's easy to get burned by this.** Base-class fields initialize *before* the base constructor body runs; derived-class fields only initialize *after* `super()` returns. So if the **base** constructor calls a method that reads a field, and that field is overridden in the derived class, the base constructor sees the base class's own field value — not the derived override — because the derived field hasn't been set yet at that point in execution. Overridden **methods**, by contrast, always resolve through the prototype chain to the derived version, no matter when they're called. Field overrides and method overrides do NOT behave the same way across `super()` — this asymmetry is a favorite "gotcha" interview trap.

- **`instanceof` walks the prototype chain, and only cares about `.prototype`, not the constructor function itself.** `obj instanceof Class` checks, at each link: does `obj.__proto__`, or `obj.__proto__.__proto__`, ... equal `Class.prototype`? If it ever finds a match, `true`; if it reaches the end of the chain with no match, `false`.

  ```js
  console.log(r instanceof Rabbit); // true — Rabbit.prototype is directly in the chain
  console.log(r instanceof Animal); // true — Animal.prototype is further up the same chain

  // the trap: instanceof cares about .prototype, NOT the constructor function
  function Rabbit2() {}
  const r2 = new Rabbit2();
  Rabbit2.prototype = {}; // swap the prototype object out from under it
  console.log(r2 instanceof Rabbit2); // false — r2's [[Prototype]] still points at the OLD object
  ```

- **`Symbol.hasInstance` lets a class hijack what `instanceof` even means for it.** If defined as a static method, `obj instanceof Class` calls `Class[Symbol.hasInstance](obj)` directly and skips the prototype-chain walk entirely — used for duck-typing style checks ("does this object have the right shape") instead of a real inheritance check.

- **Gotcha:** don't reach for `instanceof` to identify built-in/primitive types across different contexts (e.g. an array from a different iframe/realm) — it can give surprising `false` results because it's checking a specific `.prototype` object identity. `Object.prototype.toString.call(x)` (returns `"[object Array]"`, `"[object Null]"`, etc.) is the more reliable "what type is this, really" tool js.info calls "a more advanced `typeof`."

- **🎯 Interview Q:** "Is a JS class just syntactic sugar over the old prototype/constructor-function pattern?" → Mostly, but not entirely — it also adds a callable-only-with-`new` guard, non-enumerable methods, and forces strict mode, none of which a hand-written constructor function gets automatically.

- **🎯 Interview Q:** "Why do you have to call `super()` before using `this` in a derived class constructor?" → The base class constructor is what actually creates the instance; the derived constructor doesn't get its own `this` until `super()` runs and hands one back.

- **🎯 Interview Q:** "If a base class constructor calls an overridable method that reads a field, and a derived class overrides that field, whose value wins?" → The base class's own field value — base fields init before the base constructor body runs, but derived fields don't init until after `super()` returns, so the override isn't ready yet. (Methods don't have this problem — they always resolve to the derived override via the prototype chain.)

- **🎯 Interview Q:** "How does `instanceof` actually work under the hood?" → It walks `obj`'s `[[Prototype]]` chain link by link, comparing each one against `Class.prototype` — it's checking prototype-object identity, not asking "was this built by that constructor function."

**Recap — what the docs say to take away:**
- A class is a function in disguise: `constructor` becomes the function body, other methods land on `.prototype`, non-enumerable and strict-mode by default.
- Class fields are per-instance (own property); methods are shared (prototype property) — this distinction is what makes arrow-function class fields a legitimate `this`-binding fix.
- `extends` sets up the exact same `[[Prototype]]` chain as manual prototypal inheritance, just declaratively.
- `super()` must run before `this` is touched in a derived constructor, because the base constructor is what actually builds the object.
- `super.method()` resolves via `[[HomeObject]]`, not `this` — methods using `super` can't be safely copied between objects.
- Field overrides and method overrides behave asymmetrically around `super()` timing — a classic interview trap.
- `instanceof` is a prototype-chain walk against `Class.prototype`; `Symbol.hasInstance` can override that behavior entirely; `Object.prototype.toString.call()` is the more robust type-check when `instanceof` isn't reliable (cross-realm objects, etc).

---

### 0.7 Objects, references vs copying, shallow vs deep copy, immutability

**Read:** [Object references and copying](https://javascript.info/object-copy) — fetched 2026-08-30

- **Objects are copied "by reference," primitives are copied by value.** Assigning an object to another variable copies the reference (memory address), not the object itself — both variables end up pointing at the exact same underlying object.
- **This is why a `const` object is still mutable.** `const` freezes the *binding* (the reference), not the object it points to — you can't reassign the variable to a different object, but you can freely add/change/delete its properties.
- **Two separately-created objects with identical contents are never `===`/`==` equal.** Equality checks compare references, not structural contents — only two variables holding the *same* reference compare equal.
- **`Object.assign(target, ...sources)` (or spread `{...obj}`) only does a shallow copy.** Top-level primitive properties get truly duplicated, but any property whose value is itself an object still gets copied *by reference* — mutating a nested object through the clone still mutates the original.
- **`structuredClone(value)` is the built-in deep clone.** It recursively clones nested objects/arrays (including circular references), so the clone and original become fully independent. **Gotcha:** it throws on function properties — you can't deep-clone an object that holds a method/callback as a value.
- **Gotcha:** assuming a shallow copy (`{...obj}` or `Object.assign`) is "safe enough" for state updates is the classic bug — it protects the top level but silently shares any nested object/array, so mutating `copy.nested.value` also changes `original.nested.value`.
- **🎯 Interview Q:** "If I do `const obj2 = obj1` and then mutate `obj2`, does `obj1` change?" → Yes — both variables reference the identical object, so there's only one object being mutated, viewed through two names.
- **🎯 Interview Q:** "Does `{...obj}` give you a safe, fully independent copy?" → No — it's a shallow copy; nested objects/arrays inside it are still shared references with the original.
- **🎯 Interview Q:** "How do you deep-clone an object with nested structures?" → `structuredClone(obj)` — built-in, handles circular refs, but throws on function-valued properties (use a library like lodash's `cloneDeep` if functions need to survive the clone).

**Recap — what the doc says to take away:**
- Objects copy by reference; primitives copy by value — this single distinction explains `const` mutability, reference-vs-value equality, and every shallow-copy surprise.
- Shallow copy (`Object.assign`/spread) only protects the top level; nested objects still leak shared references between original and copy.
- `structuredClone` is the reach-for-this deep clone, except when function values are involved.
- Immutable state updates in React depend entirely on this: spreading is only safe when you also spread (or replace) every nested level you intend to change.

### 0.8 Event Loop — Call Stack, Tasks, Microtasks & Async Execution

**Read:** [Event loop: microtasks and macrotasks](https://javascript.info/event-loop), [JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model) — fetched 2026-08-28

- **JavaScript execution is synchronous by default:** JavaScript executes one piece of code at a time on the **call stack**. A synchronous operation must finish before the next JavaScript operation can execute.

- **The JavaScript engine does not perform the actual waiting for most asynchronous operations:** in a browser, things such as timers, network requests, and DOM events are handled by the **host environment/browser APIs**. JavaScript starts the operation and can continue executing other code instead of blocking while the operation is being completed.

- **Call stack:** when a function is called, its execution context is placed on the stack. When the function finishes, it is removed. JavaScript cannot execute another JavaScript function on the same execution thread while the current stack is still running.

- **Run-to-completion:** once a JavaScript task starts executing, it runs until its synchronous work finishes. The event loop does not interrupt the middle of a running JavaScript task to execute another task.

- **Async completion does not mean immediate execution:** when an asynchronous operation finishes, its callback/continuation becomes eligible to run and is placed into the appropriate queue. It still has to wait until JavaScript is able to execute it.

- **Event loop:** the event loop coordinates when queued work gets a chance to execute. It repeatedly waits for work, takes an eligible task, runs it, and then processes the microtasks generated during that execution.

- **Tasks / macrotasks:** browser work such as timer callbacks and user/event callbacks can be scheduled as tasks. A task is executed only when the JavaScript execution context is available.

- **Microtasks:** Promise callbacks and other microtask-based work are placed in the **microtask queue**. Microtasks are processed after the current task finishes and before the next task is taken.

- **Microtasks have priority over the next task:** after the current synchronous task finishes, JavaScript drains the microtask queue completely before moving to the next macrotask/task.

- **Important execution cycle:**

  ```text
  Current synchronous task
          ↓
  Call stack becomes empty
          ↓
  Drain ALL microtasks
          ↓
  Browser may perform rendering
          ↓
  Next task / macrotask
          ↓
  Drain ALL microtasks
          ↓
  Browser may render
          ↓
  Next task / macrotask
          ↓
  ...
  ```

- **Gotcha:** saying "JavaScript chooses a macrotask after synchronous code" is incomplete. Microtasks are processed first. The correct model is: current task finishes → all microtasks are drained → next task can execute.

- **Example:**

  ```js
  console.log("A");

  setTimeout(() => {
      console.log("B");
  }, 0);

  Promise.resolve().then(() => {
      console.log("C");
  });

  console.log("D");
  ```

  The output is:

  ```text
  A
  D
  C
  B
  ```

  The synchronous code produces `A` and `D`, then the Promise callback runs as a microtask before the timer task.

- **Gotcha:** `setTimeout(..., 0)` does not mean "execute immediately after the current code." It means the timer callback becomes eligible as a future task. If the current task or microtasks are still running, the callback has to wait.

- **Microtasks are drained completely:** if a microtask creates another microtask, the new microtask is also processed before the event loop moves to the next task.

  ```js
  Promise.resolve().then(() => {
      console.log("A");

      Promise.resolve().then(() => {
          console.log("B");
      });
  });

  setTimeout(() => {
      console.log("C");
  }, 0);
  ```

  The output is:

  ```text
  A
  B
  C
  ```

- **Mid-drain example, one level deeper — a chain of nested `.then()`s all finish before any macrotask runs:** each `.then()` spawns the next one from *inside* the drain, so the chain just keeps re-feeding the same microtask queue instead of ever letting a macrotask in.

  ```js
  console.log("Start");

  setTimeout(() => {
      console.log("Timeout");
  }, 0);

  Promise.resolve()
      .then(() => {
          console.log("Then 1");
          return Promise.resolve();
      })
      .then(() => {
          console.log("Then 2");
          return Promise.resolve();
      })
      .then(() => {
          console.log("Then 3");
      });

  console.log("End");
  ```

  The output is:

  ```text
  Start
  End
  Then 1
  Then 2
  Then 3
  Timeout
  ```

  Even though there are 3 separate `.then()` callbacks, all 3 run back-to-back during the *same* microtask-drain phase — `Then 2` only exists in the queue because `Then 1` just finished and put it there, and `Then 3` only exists because `Then 2` just put it there. The `setTimeout` callback, despite being scheduled first in the source, still has to wait for every one of them.

- **Worked trace — a macrotask scheduled from inside a microtask joins the *back* of the macrotask queue, it never cuts ahead:**

  ```js
  console.log("Start");

  setTimeout(() => {
      console.log("Timeout 1");
      Promise.resolve().then(() => {
          console.log("Promise inside Timeout 1");
      });
  }, 0);

  Promise.resolve().then(() => {
      console.log("Promise 1");
      setTimeout(() => {
          console.log("Timeout inside Promise 1");
      }, 0);
  });

  Promise.resolve(console.log("Immediate Promise"));

  setTimeout(() => {
      console.log("Timeout 2");
  }, 0);

  console.log("End");
  ```

  The output is:

  ```text
  Start
  Immediate Promise
  End
  Promise 1
  Timeout 1
  Promise inside Timeout 1
  Timeout 2
  Timeout inside Promise 1
  ```

  Walking it: `"Immediate Promise"` logs during the sync pass — it's just an argument being evaluated before `Promise.resolve()` is even called, nothing async about it. The sync pass finishes having queued 2 macrotasks in order (Timeout 1, Timeout 2) and 1 microtask (Promise 1's handler). Draining that microtask logs `Promise 1` and schedules a *new* macrotask ("Timeout inside Promise 1") — but it lands at the **back** of the macrotask queue, behind Timeout 1 and Timeout 2, which were already waiting. So the macrotask queue plays out strictly in the order things joined it: Timeout 1 → (drains its own new microtask, "Promise inside Timeout 1") → Timeout 2 → Timeout inside Promise 1.

- **Gotcha:** repeatedly creating microtasks can delay timers and rendering because the browser must drain the microtask queue before moving to the next task. An effectively endless microtask chain can therefore prevent the browser from making progress on other work.

- **Rendering happens between tasks:** in a browser, rendering is not performed in the middle of a running JavaScript task. After JavaScript work and the relevant microtasks finish, the browser can get an opportunity to update the page.

- **Gotcha:** a zero-delay timer does not guarantee a particular wall-clock execution time. It only schedules a future task; the callback can execute later if JavaScript is busy or other queued work must be processed first.

- **Long synchronous tasks block everything on the same JavaScript thread:** while a long computation is running, JavaScript cannot process user events, timers, or other queued callbacks, and the browser cannot update the UI from that blocked execution context.

  ```js
  for (let i = 0; i < 10000000000; i++) {
      // Long synchronous work
  }
  ```

  During this work, a timer that becomes ready does not interrupt the loop and execute its callback.

- **Breaking heavy work into smaller tasks:** large CPU-heavy work can be split into smaller chunks so the browser gets opportunities between tasks to process other work and keep the UI responsive.

- **Web Workers provide another execution context:** heavy JavaScript computation can be moved to a worker so it does not block the main browser thread. The worker has its own event loop/execution context.

- **Promises and the event loop:** a Promise itself does not make synchronous work asynchronous. The important part is that Promise reactions such as `.then()` are scheduled as microtasks and therefore execute after the current synchronous task finishes.

- **`async`/`await` uses Promise scheduling:** after an `await`, the continuation of an async function resumes asynchronously through Promise/microtask machinery rather than continuing synchronously from the same point.

- **Gotcha:** `await` does not make the operation itself run on another thread. It allows the current async function to suspend while other JavaScript work can continue; the underlying asynchronous operation is handled by the host/runtime.

- **Event loop ordering example:**

  ```js
  console.log("1");

  setTimeout(() => {
      console.log("2");
  }, 0);

  Promise.resolve().then(() => {
      console.log("3");
  });

  queueMicrotask(() => {
      console.log("4");
  });

  console.log("5");
  ```

  The output is:

  ```text
  1
  5
  3
  4
  2
  ```

  The synchronous task finishes first, then the microtasks are drained in their queue order, and only then does the timer task execute.

- **Interview angle:** "Is JavaScript single-threaded?" → JavaScript execution on the main thread is single-threaded: one piece of JavaScript runs at a time on that execution thread. The browser/runtime can perform asynchronous operations outside that JavaScript execution and later schedule their callbacks/continuations for JavaScript to execute.

- **Interview angle:** "If JavaScript is single-threaded, how does it handle asynchronous operations?" → The host environment handles operations such as timers, networking, and events. Once work is ready, the corresponding callback/continuation is queued, and the event loop eventually allows JavaScript to execute it.

- **Interview angle:** "What is the event loop?" → It is the mechanism that coordinates execution of queued asynchronous work with the JavaScript call stack, repeatedly allowing eligible tasks to execute and ensuring pending microtasks are processed at the appropriate point.

- **Interview angle:** "What is the difference between a task/macrotask and a microtask?" → They are different categories of queued work. Tasks include things such as timer and event callbacks, while Promise reactions and `queueMicrotask()` use the microtask queue. After a task finishes, microtasks are drained before the next task.

- **Interview angle:** "Which runs first: a Promise callback or `setTimeout(..., 0)`?" → Assuming both are scheduled from the same current task, the Promise callback runs first because it is a microtask and microtasks are drained before the next task.

- **Interview angle:** "Why does `setTimeout(fn, 0)` not execute immediately?" → It schedules `fn` as a future task. The current task must finish first, pending microtasks must be drained, and only then can the timer task execute when it is eligible.

- **Interview angle:** "Can a microtask delay a timer?" → Yes. All pending microtasks are drained before the next task executes. A long or continuously replenished microtask queue can therefore delay timers and rendering.

- **Interview angle:** "Can JavaScript execute two callbacks at the same time?" → Not on the same JavaScript execution thread. Callbacks are executed one at a time; asynchronous work may happen outside that thread, but their JavaScript callbacks still have to be executed by the JavaScript thread.

- **Interview angle:** "Does the event loop make JavaScript asynchronous?" → Not by itself. The host environment provides asynchronous capabilities, while the event loop coordinates when the resulting JavaScript work gets executed.

- **Interview angle:** "Why can a React UI become unresponsive even though React uses asynchronous/batched work?" → A long-running synchronous JavaScript task still blocks the main thread. The browser cannot process other JavaScript work or update the UI until that blocking work yields.

**Recap — what the docs say to take away:**
- JavaScript executes synchronous code on the call stack, one piece at a time.
- The browser/host environment handles many asynchronous operations outside the JavaScript execution itself.
- When asynchronous work is ready, its JavaScript callback/continuation is placed into a queue.
- The event loop coordinates when queued work gets executed.
- After the current task finishes, microtasks are drained completely before the next task/macrotask.
- Promise callbacks and `queueMicrotask()` use the microtask queue, while timers and many browser events are handled as tasks.
- `setTimeout(..., 0)` means schedule a future task, not "run immediately."
- Long synchronous work blocks the main thread; excessive microtasks can also delay tasks and rendering.
- The key interview mental model is: current task → all microtasks → browser may render → next task → all microtasks → repeat.

### 0.9 Promises, `async`/`await`, error handling

**Read:** [Promise basics](https://javascript.info/promise-basics), [Promises chaining](https://javascript.info/promise-chaining), [Error handling with promises](https://javascript.info/promise-error-handling), [Async/await](https://javascript.info/async-await) — fetched 2026-08-29

- **What a Promise actually is, conceptually, before the state machinery:** an object that stands in for a value you don't have *yet* but will, eventually, either successfully or with a failure. Constructing one — `new Promise((resolve, reject) => {...})` — hands it an **executor**, and that executor's entire job is to eventually call `resolve(value)` or `reject(error)`. The rest of your code doesn't block waiting for that inner work — it immediately gets the Promise object back, and attaches `.then()`/`.catch()` handlers that fire whenever the executor does eventually settle one way or the other. (This matches what you already had right — the object *is* the executor's eventual outcome, wrapped so the rest of the program can be notified later instead of blocking now.)
- **A Promise has exactly 3 states** — pending → fulfilled (via `resolve(value)`) or rejected (via `reject(error)`). Once settled, it's final: *"All further calls of `resolve` and `reject` are ignored."*
- **The executor runs synchronously, immediately, the moment the Promise is constructed** — `new Promise((resolve, reject) => {...})` runs that function body right away, not later.
- **`.then`/`.catch`/`.finally` are consumers, not state** — `state`/`result` are internal and unreachable directly; these three methods are the only way to read a settled Promise's outcome.
- **Every `.then()` call returns a brand-new Promise** — this is *why* chaining works: whatever a handler `return`s becomes that new Promise's resolved value, so the next `.then` in the chain receives it.
- **Returning a Promise from inside `.then` pauses the chain** — the next handler waits for that inner Promise to settle before running, instead of receiving the Promise object itself as a value. This is the mechanism for sequencing async steps one after another.
- **Gotcha — chaining vs. nesting, the classic confusion:** attaching two separate `.then()` calls to the *same* Promise (nesting/branching) means both handlers get the *same original* result independently — they don't pass data to each other. Only a true chain (`.then().then()`) passes each result forward.
- **Thenables** — any object with a callable `.then(resolve, reject)` method is treated like a Promise by the engine, even if it isn't a real `Promise` instance. This is how third-party async libraries interoperate with native Promises.
- **Every executor and every `.then`/`.catch` handler has an invisible `try...catch` around it** — a thrown error inside becomes a rejection automatically, with no explicit `reject()` call needed.
- **`.catch` catches every rejection upstream in the chain, no matter how many `.then`s are in between** — *"When a promise rejects, the control jumps to the closest rejection handler"* — you don't need a `.catch` after every single step, one at the end covers the whole chain.
- **Gotcha — errors thrown inside `setTimeout` (or other async callbacks) do *not* get caught by the surrounding Promise machinery.** The invisible try/catch only wraps the executor/handler's own synchronous execution — an error thrown later, inside a callback that Promise code merely *scheduled*, is a completely separate, uncaught throw.
- **`async` before a function guarantees it returns a Promise** — a plain returned value gets silently wrapped in a resolved Promise; you never need to manually wrap a return value in `Promise.resolve()` inside an `async` function.
- **`await` pauses that specific `async` function (not the whole engine) until the awaited Promise settles**, then either gives you the resolved value or throws the rejection as a normal exception — catchable with a standard `try/catch`.
- **Gotcha:** `await` is a syntax error outside an `async` function — there's no bare/module-scope exception at the language level except for genuine top-level `await` inside an ES module.
- **🎯 Interview Q:** "What does a `.then()` call actually return, and why does that matter?" → A brand-new Promise — that's the entire mechanism that makes chaining (vs. independent branching) work.
- **🎯 Interview Q:** "Will a `try/catch` around an `await` catch a rejected promise?" → Yes — `await` re-throws a rejection as a normal exception at that exact line, so a wrapping `try/catch` catches it exactly like a synchronous throw.
- **🎯 Interview Q:** "Why doesn't a Promise's implicit try/catch catch an error thrown inside a `setTimeout` callback nested in the executor?" → Because the invisible try/catch only wraps the executor/handler's own synchronous run — a later, separately-scheduled callback throwing is outside that wrapped scope entirely.

**Recap — what the docs say to take away:**
- A Promise wraps an executor's eventual resolve/reject outcome so the rest of your code can be notified later instead of blocking now.
- 3 states, settle once, `.then`/`.catch`/`.finally` are the only way to read the outcome.
- Chaining works because `.then` always returns a new Promise; returning a Promise from a handler pauses the chain until it settles.
- One `.catch` at the end of a chain covers every rejection upstream — no need to catch after every step.
- Executors/handlers have an invisible try/catch; async callbacks scheduled from within them (e.g. `setTimeout`) don't inherit that protection.
- `async` functions always return a Promise; `await` unwraps or re-throws it as a normal value/exception, catchable with `try/catch`.

### 0.10 `Promise.all` / `race` / `allSettled` / `any`

**Read:** [Promise API](https://javascript.info/promise-api) — fetched 2026-08-29

- **`Promise.all(iterable)`** resolves with an array of results **in the original order** (not completion order) once every promise resolves. **Fails fast:** the moment *any* promise rejects, `Promise.all` immediately rejects with that single error — the other still-pending promises are not cancelled, just ignored.
- **Gotcha:** `Promise.all` silently accepts non-Promise values in the iterable and passes them straight through into the results array unchanged — you don't have to wrap plain values in `Promise.resolve()` first.
- **`Promise.allSettled(iterable)`** never short-circuits and never rejects — it waits for *every* promise to settle, then returns an array of `{ status: "fulfilled", value }` or `{ status: "rejected", reason }` objects, one per input. This is the one to reach for when partial failures are acceptable and you need every result regardless.
- **`Promise.race(iterable)`** settles (resolves *or* rejects) with whichever input promise settles **first** — win or lose, the result of the first one to finish wins; everything else is ignored after that.
- **`Promise.any(iterable)`** resolves with the **first fulfillment** and ignores rejections as they come in — it only rejects if *every* promise rejects, at which point it rejects with an `AggregateError` whose `.errors` property holds all the individual rejection reasons.
- **`Promise.resolve(value)` / `Promise.reject(error)`** wrap a value/error in an already-settled Promise — mostly used today for API compatibility (e.g. a function that must always return a Promise even for a cached/sync value); `async`/`await` has made explicit use of these fairly rare in day-to-day code.
- **Gotcha:** confusing `.all` and `.allSettled` is the single most common mistake here — reaching for `.all` when you actually want "run everything and tell me what succeeded/failed" means one failure silently kills all the other results you actually wanted.
- **🎯 Interview Q:** "You have 5 independent API calls and want all results even if 2 fail — which do you use?" → `Promise.allSettled` — `Promise.all` would reject the whole batch on the first failure and discard the other 3 successful results.
- **🎯 Interview Q:** "What does `Promise.any` reject with, and when?" → An `AggregateError` (with an `.errors` array of every individual rejection), and only once *all* input promises have rejected — a single success anywhere is enough for it to resolve.
- **🎯 Interview Q:** "`Promise.race` vs `Promise.any` — what's the actual difference?" → `race` settles on whichever promise finishes first, rejection or not; `any` specifically waits for the first *success*, ignoring rejections until either a success arrives or everything has failed.

**Recap — what the doc says to take away:**
- `all` — every result, in order, fails fast on the first rejection.
- `allSettled` — every result regardless of outcome, never rejects itself.
- `race` — first to settle wins, win or lose.
- `any` — first success wins; only rejects (with `AggregateError`) if everything fails.
- `resolve`/`reject` are just settled-Promise constructors, rarely needed once you're using `async`/`await`.

### 0.11 Array methods — `map`/`filter`/`reduce`/`find`/`some`/`flat`

**Read:** [Array methods](https://javascript.info/array-methods) — fetched 2026-08-29

- **Mutating vs. non-mutating is the axis everything else hangs off:** `push`/`pop`/`shift`/`unshift`/`splice`/`sort`/`reverse` mutate in place; `map`/`filter`/`slice`/`concat`/`find`/`includes` return something new and leave the original alone. React state updates lean entirely on the non-mutating side.
- **Callback signature is always `(item, index, array)`** — `index`/`array` are there but rarely used in practice (mostly for the rare case you need position-aware logic inside a `.map()`).
- `map` → new array (transform), `filter` → new array (subset), `reduce` → single value (aggregate), `find`/`findIndex` → first match / its index (or `undefined`/`-1`), `some`/`every` → boolean, `forEach` → nothing (pure side effect, don't chain off it).
- **Gotcha:** `.sort()` with no comparator sorts as **strings** — `[1, 2, 15].sort()` gives `[1, 15, 2]`. Always pass `(a, b) => a - b` for numbers.
- **Gotcha:** `reduce` with no initial value throws on an empty array — always pass the initial value explicitly unless you're certain the array is non-empty.
- **Gotcha:** `indexOf` can't find `NaN` (returns `-1` since it uses `===`), but `includes` can — `includes` uses SameValueZero, same rule that lets `Map` use `NaN` as a key (ties to 0.15 below).
- `thisArg` is a rarely-used optional last parameter on most of these (except `sort`) to set the callback's `this` — arrow functions make it unnecessary almost always.
- **Interview angle:** "Which array methods mutate the original array?" → `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse` — everything else people reach for daily (`map`, `filter`, `slice`) returns a new array.
- **Interview angle:** "Why does `[1, 2, 15].sort()` not sort numerically?" → default sort coerces to strings and compares lexicographically; always supply a comparator for numbers.

**Recap — what the doc says to take away:**
- Know the mutating/non-mutating split cold — it's the reason React state updates always reach for `map`/`filter`/spread instead of `push`/`splice`.
- `reduce` is the general-purpose one — `map`/`filter`/`some`/`every`/`find` are all reducible to it, but reach for the specific method when it fits, for readability.
- Default `.sort()` is a string sort — this is the single most common array gotcha in production code.

---

### 0.12 Destructuring, spread/rest

**Read:** [Destructuring assignment](https://javascript.info/destructuring-assignment) — fetched 2026-08-29

- **Array destructuring** unpacks by **position**: `let [a, b] = arr` — works on any iterable, not just arrays (strings, `Set`, etc.). Skip elements with a bare comma: `let [, second] = arr`.
- **Object destructuring** unpacks by **key name**, order-independent: `let {width, height} = obj`. Rename with a colon: `let {width: w} = obj`. Combine rename + default: `let {width: w = 100} = obj`.
- **Defaults only kick in when the value is missing** (same "missing or `undefined`" rule as default params from 0.1.15) — they can be arbitrary expressions, including function calls, evaluated lazily only if needed.
- **Rest pattern** (`...rest`) grabs everything left over — `let [first, ...rest] = arr` for arrays, `let {title, ...rest} = obj` for objects. Must come last, same rule as rest parameters (0.3.1).
- **Nested destructuring** mirrors the shape of the source data — the pattern on the left is a literal map of the structure on the right.
- **Variable swap one-liner:** `[a, b] = [b, a]` — builds a temp array and destructures it back out reversed, no temp variable needed.
- **Gotcha:** destructuring into *already-declared* variables without `let`/`const`/`var` needs wrapping parens — `{title} = obj` on its own is parsed as a block statement, not an object pattern. Fix: `({title} = obj);`.
- **The React-relevant payoff:** `function showMenu({title = "Menu", width = 200} = {})` — destructuring straight in the parameter list, with a default empty object so calling with zero args doesn't throw. This is the literal shape of every props-with-defaults function component.
- **Interview angle:** "Why does destructuring an object into existing variables require wrapping parens?" → without `let`/`const` and without parens, `{` at the start of a statement is parsed as a block, not an object pattern — the parens force expression context.
- **Interview angle:** "How do you give a destructured function parameter a default so it's optional?" → default the whole pattern to `{}` — `function f({a, b} = {})` — so destructuring an omitted argument destructures an empty object instead of throwing on `undefined`.

**Recap — what the doc says to take away:**
- Array destructuring = position, object destructuring = key name.
- Defaults fire only on missing/`undefined`, same rule everywhere else in JS.
- Rest must be last; nested patterns just mirror the source shape.
- The `({} = {})` parameter-default pattern is the backbone of every props-with-defaults function component.

---

### 0.13 Modern syntax: optional chaining `?.`, nullish `??`, template literals

**Read:** [Optional chaining '?.'](https://javascript.info/optional-chaining), [Nullish coalescing operator '??'](https://javascript.info/nullish-coalescing-operator) — fetched 2026-08-29

- **`?.` short-circuits on `null`/`undefined` only** — `obj?.prop` returns `undefined` immediately instead of throwing, and nothing to the right of a short-circuited `?.` evaluates (function calls, increments, further chaining all get skipped).
- **Three forms:** `obj?.prop` (property), `obj?.[key]` (computed/bracket), `obj.method?.()` (method call — guards against the method itself not existing, not against `obj` being missing).
- **Gotcha:** `?.` cannot appear on the **left side of an assignment** — `user?.name = "John"` is nonsensical (`?.` isn't an assignable target) and either errors or silently does nothing depending on engine.
- **Gotcha:** the base variable must still be **declared** — `?.` protects against `null`/`undefined` *values*, not against a `ReferenceError` from a variable that was never declared at all.
- **Don't overuse it:** chaining `?.` on a variable that your code's logic guarantees must exist hides real bugs — you want that case to throw during development, not silently swallow into `undefined` three calls later.
- **`??` = "first defined value"** — returns the left side unless it's `null`/`undefined`, in which case it returns the right side. This is the fix for `0.1.11`'s `||`-default gotcha: `count ?? 10` correctly keeps `count = 0`.
- **Gotcha (precedence):** `??` cannot be mixed directly with `&&`/`||` without explicit parens — `1 && 2 ?? 3` is a **syntax error**, not silently mis-evaluated. Must write `(1 && 2) ?? 3`.
- **Interview angle:** "What's the difference between `?.` short-circuiting and just checking `if (obj)` first?" → `?.` is inline and composes across a whole chain (`a?.b?.c?.()`) in one expression; it's about convenience/safety for *optional* structure, not a substitute for validating data your code assumes must exist.
- **Interview angle:** "Why does JS force parens when mixing `??` with `&&`/`||`?" → ambiguous precedence between them was judged dangerous enough (different engines/readers could reasonably expect different evaluation order) that TC39 just made it a hard syntax error instead of picking a default.

**Recap — what the doc says to take away:**
- `?.` stops evaluation cold at the first `null`/`undefined` it hits, on property access, bracket access, or a method call.
- It's not a magic "never crash" operator — misusing it to paper over code that should crash on a real bug is the actual gotcha here, not a syntax trap.
- `??` vs `||` is entirely about `0`/`""`/`false` being legitimate values you don't want a default to clobber.

---

### 0.14 ES modules `import`/`export`

**Read:** [Modules, introduction](https://javascript.info/modules-intro), [Export and Import](https://javascript.info/import-export) — fetched 2026-08-29

- **Modules run in strict mode automatically** — no `"use strict"` needed, consistent with 0.1.3.
- **Each module has its own top-level scope** — a variable declared at the top of one module is invisible in another unless explicitly `export`ed and `import`ed. This is *why* every React file can declare its own local `const`s without colliding with any other file.
- **A module's code runs exactly once, no matter how many places import it** — the first import triggers evaluation, every subsequent import reuses the same cached exports object. This is the mechanism behind "singleton config" or "singleton instance" patterns via a module.
- **Top-level `this` is `undefined`** in a module (vs. the global object in a classic script) — one less implicit-global footgun.
- **Deferred execution** — module `<script type="module">` tags behave like `defer`: downloaded in parallel, but execution waits for the HTML document to be parsed, and execution order is preserved.
- **Named exports** (`export {a, b}` or `export function a(){}`) — many per file, imported with matching names in braces: `import {a, b} from "./mod.js"`, optionally renamed with `as`.
- **Default export** (`export default ...`) — **at most one per file**, imported without braces and under any name you choose: `import Whatever from "./mod.js"`.
- **`import * as name`** pulls everything into one namespace object; a bare `import "./mod.js"` (no bindings) just runs the module's side effects.
- **Gotcha:** `import`/`export` statements must be **top-level** — you cannot put one inside an `if` or a function body, unlike a regular `require()`-style call.
- **Gotcha:** mixing default + named exports in the same file works but is a readability/consistency smell most style guides discourage — pick one convention per file.
- **Interview angle:** "Why does a module only execute once even if ten files import it?" → the module system caches the evaluated module by its resolved path; the second and later imports just read the cached exports object, no re-execution.
- **Interview angle:** "Default export vs named export — when do you use which?" → default for "this file's one main thing" (a component, a class), named for "a file exposing several related utilities" — mixing both in one file is legal but usually a smell.

**Recap — what the doc says to take away:**
- Strict mode, own scope, single evaluation, `this === undefined` at the top — four defaults that make modules safer than classic scripts by construction.
- Named vs. default export is a design choice, not a technical requirement — but "one default max per file" is a hard rule.
- `import`/`export` must be top-level, full stop — no conditional or lazy import via this syntax (that's what dynamic `import()` is for, separately).

---

### 0.15 `Map`/`Set`/`WeakMap`, `Symbol`, iterators/generators ➕

**Read:** [Map and Set](https://javascript.info/map-set), [WeakMap and WeakSet](https://javascript.info/weakmap-weakset) — fetched 2026-08-29

- **`Map` fixes the real problems with using a plain object as a dictionary:** keys can be **any type**, including objects (not coerced to strings like an object literal's keys would be), it has a real `.size`, and it has clean iteration methods (`.keys()`, `.values()`, `.entries()`, `.forEach()`).
- **Both `Map` and `Set` preserve insertion order** during iteration — unlike a plain object, which only guarantees numeric-key ordering (0.1's `for...in` rule) and leaves everything else as creation order but isn't a hard spec guarantee the same way `Map` is.
- **`Set` = uniqueness, automatically** — adding a duplicate value is a no-op; better for "does this exist" checks at scale than scanning an array with `.includes()`.
- **Map's key comparison uses SameValueZero** — meaning `NaN` works as a key (`NaN === NaN` is `false`, but SameValueZero treats them equal) — ties directly back to 0.11's `includes()`/`indexOf()` `NaN` gotcha, same underlying algorithm.
- **`WeakMap`/`WeakSet` — the "don't leak memory" variant:** keys/members **must be objects**, they're **not iterable** (no `.size`, no `.keys()`) because the engine can garbage-collect an entry the instant nothing else references that key object — so a live count could never be accurate.
- **The whole point of Weak-collections:** attach extra data to an object you don't own the lifecycle of (e.g., DOM nodes, or objects passed in from elsewhere) without needing to manually clean up when that object is discarded — the entry just vanishes with it.
- **Gotcha:** treating a `Map` like a plain object (`map[key] = value`) technically "works" (you're just setting a regular property on the Map object) but completely bypasses `.size`, iteration, and the any-type-key benefit — a classic beginner mistake that silently produces a broken Map.
- **Gotcha:** `map.keys()` (and `.values()`/`.entries()`) return an **iterable**, not an array — wrap in `Array.from(map.keys())` if you need array methods on it.
- **Interview angle:** "When would you reach for `Map` over a plain object?" → keys that aren't strings (objects, `NaN`), needing guaranteed iteration order, or wanting a live `.size` — otherwise a plain object is fine and more common in everyday code.
- **Interview angle:** "What's the actual use case for `WeakMap`?" → attaching metadata/cache to an object without creating a memory leak — since the WeakMap entry disappears automatically the moment the key object itself is garbage collected, no manual cleanup ever required.
- **Note:** `Symbol` and iterators/generators are explicitly marked low-priority (➕) in the curriculum — flagging that the source read here didn't cover them; treat as "recognize on sight, don't drill" rather than full interview-depth topics.

**Recap — what the doc says to take away:**
- `Map`/`Set` exist because plain objects/arrays have real gaps: string-only keys, no guaranteed size, no true uniqueness.
- `WeakMap`/`WeakSet` trade away iteration for automatic memory cleanup — pick them specifically when you're attaching data to an object whose lifetime you don't control.
- Same SameValueZero algorithm quietly connects `Map`'s `NaN`-as-key behavior to `Array.prototype.includes()` from 0.11 — one underlying equality rule, two different-looking places it shows up.

---

### 0.16 Events — addEventListener, bubbling/capturing, delegation, preventDefault/stopPropagation, the event object

**Read:** [Introduction to browser events](https://javascript.info/introduction-browser-events), [Bubbling and capturing](https://javascript.info/bubbling-and-capturing), [Event delegation](https://javascript.info/event-delegation), [Browser default actions](https://javascript.info/default-browser-action) — fetched 2026-10-20

**Code files:** `browser-dom/16a_events_basics.html`, `16b_bubbling_capturing.html`, `16c_delegation_default_actions.html`

- Three ways to attach a handler: an HTML attribute, a DOM property, and **addEventListener**. The property and the attribute share ONE slot, so a second assignment silently **overwrites** the first. addEventListener **stacks** handlers and runs them in the order you added them.

```js
button.onclick = () => console.log("A");
button.onclick = () => console.log("B"); // A is gone, only B runs

button.addEventListener("click", () => console.log("C"));
button.addEventListener("click", () => console.log("D")); // C then D, both run
```

- **removeEventListener needs the exact same function reference** (and the same capture flag). An inline arrow is a brand new function every time, so the removal does nothing and throws no error.

```js
function onClick() {
  console.log("clicked");
}

button.addEventListener("click", onClick);
button.removeEventListener("click", onClick); // works: same reference

button.addEventListener("click", () => console.log("x"));
button.removeEventListener("click", () => console.log("x")); // no-op: different function object
```

- **Event propagation has three phases:** **capturing** (window down to the target), **target**, then **bubbling** (target back up to window). Handlers run in the bubbling phase by default because capture is false. Pass the capture option as true to catch the event on the way down.
- **event.target is the deepest element that was actually clicked; event.currentTarget is the element whose handler is running right now.** In a regular function handler, this equals currentTarget. In an arrow function it does not.

```js
// Click on the <p> inside <form><div><p>
// Order: capture form, capture div, capture p, bubble p, bubble div, bubble form
[form, div, p].forEach((el) => {
  el.addEventListener("click", (e) => console.log("capture", el.id, e.target.id), true);
  el.addEventListener("click", (e) => console.log("bubble ", el.id, e.target.id));
});
```

- **Event delegation:** put ONE listener on a common ancestor and use event.target (usually with **closest**) to work out which child was hit. Fewer listeners, less memory, and **elements added later work for free**.

```js
list.addEventListener("click", (event) => {
  // closest walks UP from the target, so clicks on an icon inside the button still match
  const button = event.target.closest("button[data-action]");

  if (!button || !list.contains(button)) {
    return; // not a click on one of our buttons
  }

  console.log("action:", button.dataset.action);
});
```

- **preventDefault cancels the browser's default action** (link navigation, form submit, checkbox toggle, context menu). It does NOT stop propagation. The reverse is also true: stopPropagation does not cancel the default action. They are independent.
- **Returning false only works for on-event property handlers.** From an addEventListener handler the return value is ignored. In React it is ignored too, so you must call preventDefault on the event.
- **passive listeners promise never to call preventDefault**, so the browser can scroll without waiting for your JS. Touch and wheel listeners on window/document are passive by default.
- **handleEvent:** an object with a handleEvent method can be passed as the handler. The browser calls it with this set to the object, so a class can route many event types without bind.
- **React connection:** React 17+ attaches ONE listener per event type on the root container and uses delegation plus the fiber tree to find the right component handler. That is why a native stopPropagation below the root can swallow a React onClick.
- **Gotcha:** calling stopPropagation to stop "click outside to close" logic in a dropdown. Later the analytics listener on document and every other widget's outside-click logic stop seeing clicks. Prefer checking event.target in the outer handler, or use event.defaultPrevented as the "somebody already handled this" flag.

```js
child.addEventListener("contextmenu", (e) => {
  e.preventDefault(); // custom menu, and this marks the event as handled
});

document.addEventListener("contextmenu", (e) => {
  if (e.defaultPrevented) {
    return; // child already handled it, no stopPropagation needed
  }
  e.preventDefault();
});
```

- **Gotcha:** focus and blur do not bubble, so a delegated focus listener never fires. Use focusin and focusout (which do bubble) or listen in the capture phase. React's onFocus and onBlur are built on focusin and focusout for exactly this reason.
- **Gotcha:** delegation with closest can match an ancestor OUTSIDE your container in nested layouts, so always check that container.contains(match) is true.
- **Interview angle:** "Explain event propagation." → Capture goes down from window to the target, the target runs, then bubbling goes back up. By default handlers run on the bubbling pass.
- **Interview angle:** "What is event delegation and why use it?" → One listener on an ancestor plus event.target.closest. Fewer listeners and less memory, and dynamically added children work without re-attaching. Caveats: non-bubbling events can't be delegated, and an inner stopPropagation hides the event from the parent.
- **Interview angle:** "target vs currentTarget?" → target is where the event started, currentTarget is where the running handler is attached.
- **Interview angle:** "preventDefault vs stopPropagation?" → preventDefault cancels the browser's built-in action, stopPropagation stops the event travelling up or down. They are independent, and stopPropagation is usually a code smell.

**Recap — what the doc says to take away:**

- addEventListener stacks handlers, the on-property holds one. Remove only with the same reference.
- Events go capture down, target, bubble up. Handlers run on the bubble pass unless you opt into capture.
- target is the origin, currentTarget is the owner of the running handler.
- Delegation is one listener plus closest on event.target. React is built on it at the root.
- preventDefault and stopPropagation are different things. Prefer defaultPrevented over stopPropagation.

---

### 0.17 DOM basics — query, create and modify nodes

**Read:** [Searching: getElement*, querySelector*](https://javascript.info/searching-elements-dom), [Modifying the document](https://javascript.info/modifying-document) — fetched 2026-10-20

**Code file:** `browser-dom/17_dom_basics.html`

- The doc lists six search methods. By far the most used are **querySelector** (first match or null) and **querySelectorAll** (all matches). The getElementBy-style methods are mostly seen in older code.
- **The key difference is live vs static.** querySelectorAll returns a **static NodeList** (a snapshot that never updates). getElementsByTagName and getElementsByClassName return a **live HTMLCollection** that updates as the DOM changes.

```js
const staticList = document.querySelectorAll("li"); // snapshot
const liveList = document.getElementsByTagName("li"); // live

document.body.append(document.createElement("li"));

console.log(staticList.length); // unchanged
console.log(liveList.length); // one more
```

- **matches** checks whether an element itself matches a selector. **closest** walks up from the element (itself included) and returns the nearest matching ancestor, or null. **contains** checks the parent/child relationship.
- Create nodes with **createElement**, createTextNode and **cloneNode**. A deep clone copies children too. Insert with **append, prepend, before, after and replaceWith**, and remove with **remove**. Strings passed to these are inserted **as text, not HTML**, which makes them safe.

```js
const li = document.createElement("li");
li.textContent = "New item";

list.append(li); // end of list
list.prepend("start"); // string becomes a text node
first.before("[before]"); // sibling, outside
first.after(document.createElement("hr"));
first.replaceWith(li); // swap in place
```

- **A node lives in exactly one place.** Inserting an existing node MOVES it, it does not copy it. Use cloneNode(true) to get a copy.
- **insertAdjacentHTML** parses a string as HTML at one of four positions: beforebegin, afterbegin, beforeend, afterend. It is the preferred way to add HTML to an existing element without re-parsing everything inside it.
- A **DocumentFragment** is a lightweight container that "blends in" when appended: its children move into the target and the fragment disappears. The doc itself says it is rarely used on purpose, because append with a spread array does the same job.
- **document.write** only works while the page is loading. After load it erases the whole document. The old methods appendChild, insertBefore, removeChild and replaceChild still appear in old scripts, but the modern methods above replace them.
- **Gotcha:** looping over a live collection while you add elements to it can loop forever or skip items. Convert with Array.from, or use querySelectorAll.

```js
const items = document.getElementsByTagName("li"); // LIVE

// Infinite loop: every iteration adds one more li to the same collection
for (const item of items) {
  list.append(document.createElement("li"));
}

// Safe: snapshot first
for (const item of Array.from(items)) {
  list.append(document.createElement("li"));
}
```

- **Gotcha:** putting untrusted text into innerHTML is an XSS hole, because it is parsed as HTML and an img onerror handler will run. Use textContent for text. This is why React escapes by default and calls the escape hatch dangerouslySetInnerHTML.

```js
const userInput = "<img src=x onerror=alert(1)>";

div.textContent = userInput; // shows the literal text, harmless
div.innerHTML = userInput; // parsed as HTML: the handler runs
```

- **Gotcha:** appending with innerHTML plus equals re-parses and recreates every existing child, destroying their event listeners and state. Use insertAdjacentHTML or append instead.
- **Interview angle:** "querySelectorAll vs getElementsByClassName?" → Static NodeList snapshot versus a live HTMLCollection that updates with the DOM. The live one has no forEach and is dangerous to loop while mutating.
- **Interview angle:** "textContent vs innerHTML?" → textContent treats input as plain text, so it is safe and faster. innerHTML parses HTML, so it is an XSS risk with untrusted data.
- **Interview angle:** "How do you insert many nodes efficiently?" → Build them off-DOM (a fragment, or an array with append and spread) and insert once, so the browser lays out once instead of N times.

**Recap — what the doc says to take away:**

- Six search methods, querySelector and querySelectorAll are the ones that matter. Know which results are live.
- matches checks an element, closest looks up, contains checks ancestry.
- append, prepend, before, after, replaceWith and remove are the modern insert/remove API, and strings go in as text.
- A node can only be in one place. cloneNode makes a copy.
- insertAdjacentHTML for HTML strings, textContent for text, never untrusted data into innerHTML.

---

### 0.18 Debounce and throttle

**Read:** [Decorators and forwarding, call/apply](https://javascript.info/call-apply-decorators), [Task: Debounce decorator](https://javascript.info/task/debounce), [Task: Throttle decorator](https://javascript.info/task/throttle) — fetched 2026-10-20

**Code file:** `browser-dom/18_debounce_throttle.js` (run with node)

- Both are **decorators**: a function that takes a function and returns a wrapped one. State (the timer, the throttled flag) lives in a **closure**, so each wrapped function gets its own.
- **Debounce waits for silence.** Every call cancels the pending timer and starts a new one, so the function runs ONCE, after the calls stop for the delay, with the **last** arguments.

```js
function debounce(func, ms) {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId); // cancel the previous pending call

    timeoutId = setTimeout(() => {
      func.apply(this, args); // arrow keeps the caller's this
    }, ms);
  };
}

const search = debounce((query) => console.log("search", query), 300);

search("r");
search("re");
search("react"); // only this one runs, 300ms after the last call
```

- **Throttle caps the rate.** The first call runs immediately, then further calls are ignored for the cooldown. The js.info version remembers the **latest ignored call** and replays it when the cooldown ends, so the final state is never lost (the trailing call).

```js
function throttle(func, ms) {
  let isThrottled = false;
  let savedArgs;
  let savedThis;

  function wrapper(...args) {
    if (isThrottled) {
      savedArgs = args; // keep only the latest ignored call
      savedThis = this;
      return;
    }

    func.apply(this, args);
    isThrottled = true;

    setTimeout(() => {
      isThrottled = false;

      if (savedArgs) {
        wrapper.apply(savedThis, savedArgs); // trailing call
        savedArgs = savedThis = undefined;
      }
    }, ms);
  }

  return wrapper;
}
```

- **Which one to use:** debounce for "react after the user stops" (search box, autosave, final resize). Throttle for "react at a steady rate WHILE it is happening" (scroll position, mousemove, drag).
- **Why apply and this matter:** the wrapper must forward both the arguments and the caller's this, otherwise a debounced method loses its object.
- **React mapping:** the useDebounce hook is the same idea. The effect cleanup plays the role of clearTimeout.

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id); // the cleanup IS the debounce
  }, [value, delay]);

  return debounced;
}
```

- **Gotcha:** creating the debounced function inside a component body. It is re-created on every render, so each render has a fresh timer and nothing is ever debounced. Memoize it with useMemo or useRef, or debounce the value with a hook like above.
- **Gotcha:** using debounce on a continuous stream (scrolling) when you wanted live updates. Debounce does not fire until the stream stops, so a progress bar would freeze while the user scrolls. You wanted throttle.
- **Gotcha:** throttle without the trailing call drops the last event, so the final scroll position or size is stale.
- **Interview angle:** "Debounce vs throttle?" → Debounce waits for quiet and fires once with the last args. Throttle fires at most once per interval while events keep coming.
- **Interview angle:** "Implement debounce." → Closure holding timeoutId, clearTimeout on every call, setTimeout that calls func.apply(this, args). Mention returning a cancel function as a bonus.
- **Interview angle:** "Why doesn't my debounced handler work in a React component?" → It is recreated on every render, so the timer state is lost. Memoize it or debounce the value.

**Recap — what the doc says to take away:**

- Both are decorators that wrap a function and keep timer state in a closure.
- Debounce: reset the timer on each call, run once after the quiet period with the last args.
- Throttle: run at most once per interval, and replay the latest ignored call at the end.
- Always forward this and the arguments with apply.
- Debounce for "after the user stops", throttle for "while it is happening".

## Good tasks to redo later (worth repeating as katas)

- **`.sort()` string-sort trap drill:** run `[1, 2, 15].sort()` and predict the (wrong) output before checking, then fix with a comparator — burn in "default sort is a string sort" for good.
- **`reduce` from scratch drill:** reimplement `map`, `filter`, and `find` using only `reduce`, to prove you understand `reduce` as the general-purpose primitive underneath the others.
- **Destructuring-parens drill:** write `{title} = someObj` as a bare statement (no `let`), observe the parse error/wrong behavior, then fix by wrapping in parens — feel exactly why the parens are required.
- **Props-default drill:** write a function using `function f({a, b = 5} = {})`, call it as `f()`, `f({a: 1})`, and `f(undefined)` — confirm none of them throw, and note which values actually got defaulted.
- **`?.` vs "should crash" drill:** take a chain like `a?.b?.c?.d` and identify which of those links, if truly guaranteed by your code's logic, should be a plain `.` instead — practice not over-applying `?.`.
- **`??` parens drill:** write `1 && 2 ?? 3` and confirm it's a syntax error, then fix with explicit parens both ways (`(1 && 2) ?? 3` vs `1 && (2 ?? 3)`) and note they can produce different results depending on grouping.
- **Module singleton drill:** create a module exporting a mutable object, import it from two different files, mutate it from one, and confirm the other sees the change — proves "executed once, shared exports" isn't just a claim.
- **Map-as-dictionary drill:** build a `Map` keyed by actual object references (not strings), confirm two different object literals with identical shape are treated as different keys — contrast with what a plain object would do (coerce both to `"[object Object]"`).
- **WeakMap cleanup drill (conceptual):** describe, without running code, why a `WeakMap` used to cache per-DOM-node data never needs manual cleanup when a node is removed, while a regular `Map` used the same way would leak.

- **Falsy values drill:** write out all 6 falsy values from memory, then verify with `Boolean(x)` for tricky ones (`"0"`, `[]`, `{}`, `" "`) to prove they're truthy.
- **Coercion table drill:** given a list of expressions like `"" + 1 + 0`, `"4" - 2`, `"4px" - 2`, `true + false`, `null + 1`, `undefined + 1` — predict output _before_ running in console, then verify. Repeat until it's instant (no more than a few seconds per expression).
- **`Number(x)` conversion table drill:** recite from memory: `true`, `false`, `null`, `undefined`, `""`, `"  42  "`, `"42px"` → what does each convert to?
- **Float precision task:** explain why `0.1 + 0.2 !== 0.3` and how you'd safely compare floats (e.g. `Math.abs(a - b) < Number.EPSILON`).
- **ASI gotcha task:** write a function that returns an object literal across two lines _without_ the `{` on the `return` line, observe it returns `undefined`, then fix it.
- **`==` traps drill:** predict then verify: `null == undefined`, `null == 0`, `undefined == 0`, `null >= 0`, `null > 0`, `NaN === NaN`, `"0" == false`, `[] == false`, `[] == ![]` (bonus, weirder one). Goal: instantly tell "hardcoded exception" apart from "general numeric rule."
- **`||` vs `??` drill:** for each of `0`, `""`, `false`, `null`, `undefined`, predict `x || "default"` vs `x ?? "default"` — the only two that differ are `null`/`undefined`.
- **Closure-in-loop drill:** write a `for` loop with `setTimeout` inside using `var i`, observe it logs the same final value every time, then fix it by swapping to `let`.
- **`switch` fall-through drill:** write a `switch` with two grouped cases (no `break` between them) sharing one block, then deliberately remove a `break` elsewhere and observe the unintended fall-through before fixing it.
- **`return`-ASI drill:** write a function that returns an object literal with `return` and `{` on separate lines, observe it silently returns `undefined`, then fix it — pairs with the 0.1.2 object-literal ASI task, now on a function return.
- **Default-parameter drill:** write `function f(x = 10)` and call it as `f()`, `f(undefined)`, `f(null)`, `f(0)` — predict each result before running, to nail down "missing/undefined triggers default, nothing else does."
- **Declaration-vs-expression hoisting drill:** call a function above its own definition once as a Function Declaration (works) and once as a Function Expression (throws/`undefined`), to feel the hoisting difference instead of just reciting it.
- **Implicit-return drill:** take three regular functions and rewrite each as the shortest possible arrow function, deciding case by case whether parens/braces/`return` are needed.
- **`var` leak + hoisting drill:** write a `for (var i ...)` loop, log `i` after the loop ends (confirm it leaked), then write a function that `alert`s a `var` _before_ its assignment line (confirm `undefined`, not an error) — feel the "declaration hoists, assignment doesn't" split directly.
- **TDZ shadowing drill:** run the `const x = 1; { console.log(x); const x = 2; }` example yourself, confirm the `ReferenceError`, then delete the inner `const x = 2` line and confirm it now logs `1` — proves the inner declaration (not just its TDZ) is what causes the shadowing.
- **Closure counter-factory drill:** build `outer()` returning an incrementing closure, call it twice into `c1`/`c2`, and confirm each has fully independent state — then explain why via Lexical Environments, not "magic."
- **`once(fn)` drill:** implement `once` from the quick-fire above from scratch without looking, then test it on a function with a side effect (e.g. `console.log`) to confirm it only fires once.
- **Loop-closure bug, all 3 fixes:** reproduce the `var` loop-closure bug on purpose, then fix it three separate ways (function factory, IIFE, `let`) in the same file so you can compare them side by side.
- **Constructor-closure memory drill:** build a constructor that assigns a closure as `this.method = function () {...}` inside itself, create 3 instances, and confirm (conceptually or via `instance1.method === instance2.method`) that each got its own function — then refactor to a shared `prototype` method and confirm they're now `===`.
- **Class-component `this`-loss drill:** find (or write) a legacy class component method with no `.bind(this)` and no arrow class field, pass it as `onClick={this.method}`, and trigger the `this is undefined` crash firsthand — then fix it two ways (`.bind(this)` in the constructor, and an arrow class field) and confirm both work.
- **Function-as-object property drill:** write a `makeCounter` factory where `increment`/`decrement`/`getCount` are attached as custom properties on the returned function itself (not via a closure object). Deliberately forget to invoke the inner function once before returning it, observe the `is not a function` error, then fix it — and separately try calling `fn().prop` instead of `fn.prop` to reproduce the "reading off the call result" mistake too.
- **Rest vs spread drill:** write one function using `...rest` to collect leftover args into an array, then call an existing function by spreading that same array back out — say out loud which direction each `...` is going in.
- **`arguments` vs rest drill:** write a regular function that logs `arguments`, convert it to an arrow function, and confirm it now throws or reads the outer scope's `arguments` instead of having its own.
- **Nested `setTimeout` vs `setInterval` drill:** implement a "poll every 2s" using both approaches, then deliberately make the callback take longer than 2s and observe how `setInterval` compresses the gap while nested `setTimeout` doesn't.
- **Event loop ordering drill:** predict the exact output order of a mixed block of `console.log`, `setTimeout(fn, 0)`, and `Promise.resolve().then(fn)` calls before running it — keep adding more interleavings (nested `.then` chains, `queueMicrotask`) until you can call the order instantly.
- **Macrotask-vs-microtask drill (the video's blind spot):** write one example using only promises/`queueMicrotask` and a separate one mixing in `setTimeout`, and narrate out loud which queue each callback lands in and why the `setTimeout` one always loses the race to a same-tick promise handler.
- **Chaining vs. nesting drill:** write two `.then()` calls attached to the *same* promise (branching) vs. two `.then()` calls chained onto each other, log what each handler receives, and confirm branching handlers see the same original value while chained handlers see the transformed value.
- **Implicit try/catch boundary drill:** throw an error inside a `.then()` handler (gets caught by `.catch()` downstream) vs. throw an error inside a `setTimeout` scheduled from within that handler (does NOT get caught) — reproduce the second one crashing/going unhandled to feel the boundary.
- **`allSettled` vs `all` drill:** run the same 3 promises (one rejecting) through both `Promise.all` and `Promise.allSettled`, and confirm `all` discards the 2 successes while `allSettled` reports all 3 outcomes.
- **`any` vs `race` drill:** build 3 promises with staggered resolve/reject timings (including a fast rejection and a slow success) and run them through both `Promise.any` and `Promise.race`, confirming `race` returns the fast rejection while `any` waits past it for the eventual success.

- **Listener overwrite vs stack drill:** assign onclick twice and addEventListener twice on the same button, click once, and confirm which handlers ran. Then try removing an inline arrow and confirm nothing was removed.
- **Capture/bubble trace drill:** build form, div, p nested, attach a capture and a bubble listener on each, click the p, and predict the six log lines BEFORE running. Then add stopPropagation on the div's capture listener and predict again.
- **Delegated todo list drill:** build a todo list with ONE listener on the ul (data-action delete and toggle), use closest plus contains, add items dynamically, and confirm new items work with zero extra listeners.
- **defaultPrevented drill:** give a child a custom context menu and the document a global one. Make them cooperate with defaultPrevented only, with no stopPropagation anywhere.
- **Focus delegation drill:** try delegating focus to a form, watch it never fire, then fix it with focusin and again with a capture listener.
- **Live vs static drill:** loop a live getElementsByTagName collection while appending li elements (use a safety counter!), then fix it with Array.from.
- **XSS drill:** render the same img onerror string with textContent and with innerHTML in a browser and see which one runs. Then reproduce the innerHTML plus-equals bug that kills a child's listener.
- **Implement debounce and throttle from memory:** write both without looking, including this/arguments forwarding and the trailing call for throttle, then test them with the timing log in `browser-dom/18_debounce_throttle.js`.
- **Debounce in React drill:** debounce a handler inside a component body, watch it fail, then fix it with the useDebounce hook and with useMemo.

_Next up: 0.20 Critical rendering path (0.19 was moved to `security-learning-path.md`; section E is not logged here)_
