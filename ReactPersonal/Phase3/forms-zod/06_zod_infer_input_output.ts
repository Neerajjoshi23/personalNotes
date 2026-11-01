// ============================================================================
// 06  ZOD: z.infer / z.input / z.output   (one source of truth)
// ============================================================================
// Run:  npm run zod:06      (the real lesson is in the TYPES: hover them in VS Code)
//
// WHAT YOU NEED TO LEARN FROM THIS FILE
//   1. z.infer<typeof schema> derives the TS type: never hand-write it again
//   2. If the schema has NO transform/coerce/default, input type === output type
//   3. With transform / default / coerce, they DIFFER:
//        z.input  = what you may FEED the schema   (before parse)
//        z.output = what you GET back              (after parse)  == z.infer
//   4. This matters in forms: the form holds INPUT values, onSubmit receives OUTPUT
//   5. Compile-time assertions to prove types (Expect / Equal helper)
// ============================================================================

import * as z from "zod";

// Tiny type-level test helpers: a red squiggle = the claim is wrong.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const assertType = <_T extends true>() => {};

// ---------------------------------------------------------------------------
// EXAMPLE 1: plain schema: input and output are the same
// ---------------------------------------------------------------------------
const Plain = z.object({
  name: z.string(),
  age: z.number(),
});

type PlainOut = z.infer<typeof Plain>;
type PlainIn = z.input<typeof Plain>;

assertType<Equal<PlainOut, { name: string; age: number }>>();
assertType<Equal<PlainIn, PlainOut>>();

// ---------------------------------------------------------------------------
// EXAMPLE 2: transform / default change the OUTPUT
// ---------------------------------------------------------------------------
const Signup = z.object({
  email: z.string().trim().toLowerCase(),             // string in, string out
  nickname: z.string().default("anon"),               // input: optional, output: ALWAYS string
  nameLength: z.string().transform((s) => s.length),  // input: string, output: number
});

type SignupIn = z.input<typeof Signup>;
type SignupOut = z.output<typeof Signup>; // same as z.infer

// SignupIn  = { email: string; nickname?: string | undefined; nameLength: string }
// SignupOut = { email: string; nickname: string;              nameLength: number }
assertType<Equal<SignupOut["nickname"], string>>();   // default removed the "undefined"
assertType<Equal<SignupOut["nameLength"], number>>();
assertType<Equal<SignupIn["nameLength"], string>>();

const parsed = Signup.parse({ email: "  A@B.COM ", nameLength: "Neeraj" });
console.log("EX2: output =", parsed); // { email: 'a@b.com', nickname: 'anon', nameLength: 6 }

// ---------------------------------------------------------------------------
// EXAMPLE 3: coerce makes the INPUT type `unknown` (v4) — important for forms
// ---------------------------------------------------------------------------
const Coerced = z.object({
  age: z.coerce.number(),
});

type CoercedIn = z.input<typeof Coerced>;
type CoercedOut = z.output<typeof Coerced>;

assertType<Equal<CoercedIn["age"], unknown>>();  // v4: anything goes in
assertType<Equal<CoercedOut["age"], number>>();

console.log("EX3: coerce '42' ->", Coerced.parse({ age: "42" }));

// In React Hook Form this is why you write:
//   useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema) })
// See 11_rhf_zod_resolver.tsx.

// ---------------------------------------------------------------------------
// EXAMPLE 4: reuse the types across your app
// ---------------------------------------------------------------------------
type Profile = z.infer<typeof Plain>;

function printProfile(profile: Profile) {
  return `${profile.name} (${profile.age})`;
}
console.log("EX4:", printProfile({ name: "Neeraj", age: 30 }));

// GOTCHA: writing `type Profile = { name: string; age: number }` by hand next to the schema.
// Someone adds a field to the schema and forgets the type: they drift silently.

// ---------------------------------------------------------------------------
// INTERVIEW TAKEAWAYS
// ---------------------------------------------------------------------------
// - "z.infer vs z.input vs z.output?"
//     infer === output (after parsing). input is what you're allowed to pass in.
//     They differ when you use transform, default or coerce.
// - "Why does the form value type differ from the submitted value type?"
//     The form holds raw strings (input); the resolver parses them into the output.
