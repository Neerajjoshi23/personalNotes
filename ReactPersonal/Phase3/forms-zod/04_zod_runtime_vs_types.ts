// ============================================================================
// 04  ZOD: WHY? TYPESCRIPT TYPES VANISH AT RUNTIME   (zod.dev)
// ============================================================================
// Run:  npm run zod:04
//
// WHAT YOU NEED TO LEARN FROM THIS FILE
//   1. TypeScript types are ERASED at compile time: they check nothing at runtime
//   2. `as User` is a promise to the compiler, NOT a validation
//   3. Trust boundaries: API response, form input, localStorage, URL params, env vars
//   4. A Zod schema is a RUNTIME validator that also gives you a static type
//   5. Parse the unknown: `unknown` forces you to validate before use
//   6. Zod v4 import style:  import * as z from "zod"   (named `z` import still works)
// ============================================================================

import * as z from "zod";

// ---------------------------------------------------------------------------
// EXAMPLE 1: the lie of `as`
// ---------------------------------------------------------------------------
type User = {
  name: string;
  age: number;
};

// Pretend this came from `await res.json()`: the backend drifted and age is now a string.
const fromBackend: unknown = { name: "Neeraj", age: "30" };

const lied = fromBackend as User; // compiles fine. Nothing is checked.

console.log("EX1: typeof lied.age =", typeof lied.age); // "string", but TS thinks number!

// This is the production bug: it blows up (or silently misbehaves) FAR from the cause.
// e.g. lied.age + 1  ->  "301"  (string concat), not 31.
console.log("EX1: lied.age + 1 =", (lied.age as unknown as number) + 1);

// ---------------------------------------------------------------------------
// EXAMPLE 2: the same data, validated
// ---------------------------------------------------------------------------
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const result = UserSchema.safeParse(fromBackend);

if (!result.success) {
  // The mistake is caught AT THE BOUNDARY with a clear message, not 5 files later.
  console.log("EX2: rejected ->", result.error.issues[0].message);
  console.log("EX2: path     ->", result.error.issues[0].path); // ["age"]
}

// ---------------------------------------------------------------------------
// EXAMPLE 3: one schema = runtime check AND static type
// ---------------------------------------------------------------------------
type UserFromSchema = z.infer<typeof UserSchema>; // { name: string; age: number }

function greet(user: UserFromSchema) {
  return `Hello ${user.name}, next year you are ${user.age + 1}`;
}

const ok = UserSchema.parse({ name: "Neeraj", age: 30 });
console.log("EX3:", greet(ok));

// You wrote the shape ONCE. A hand-written `type User` next to a schema will drift.

// ---------------------------------------------------------------------------
// EXAMPLE 4: why `unknown` and not `any` for raw JSON
// ---------------------------------------------------------------------------
async function fakeFetchJson(): Promise<unknown> {
  return { name: "Neeraj", age: 30 };
}

async function loadUser(): Promise<UserFromSchema> {
  const json = await fakeFetchJson(); // `unknown` -> you can't touch json.name until validated

  // json.name   // <- TS error: Object is of type 'unknown'. That's the safety net.
  return UserSchema.parse(json); // after this line it is a REAL User
}

loadUser().then((u) => console.log("EX4:", u));

// With `any` (what res.json() returns by default) the compiler gives you NO protection at all.

// ---------------------------------------------------------------------------
// WHERE TO PUT ZOD (the trust boundaries)
// ---------------------------------------------------------------------------
//   - fetch() responses (your SoundBlend jamendo.schema.ts does this)
//   - form input (React Hook Form + zodResolver)
//   - localStorage / sessionStorage / URL search params
//   - environment variables (import.meta.env)
//   - NOT between your own typed functions: that's what TypeScript is for
//
// CLIENT-SIDE VALIDATION IS UX, NOT SECURITY. The server must validate again.

// ---------------------------------------------------------------------------
// INTERVIEW TAKEAWAYS
// ---------------------------------------------------------------------------
// - "TS already checks types, why Zod?"
//     TS is compile-time only. Data crossing a runtime boundary is untyped.
//     Zod validates it and narrows it to a real type.
// - "Is `as User` validation?"
//     No. It silences the compiler and checks nothing.
// - "How do you avoid duplicating the type and the validation?"
//     Define the schema once, derive the type with z.infer.
