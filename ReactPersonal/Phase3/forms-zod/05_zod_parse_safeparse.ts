// ============================================================================
// 05  ZOD: parse vs safeParse, building blocks, reading errors   (zod.dev/basics)
// ============================================================================
// Run:  npm run zod:05
//
// WHAT YOU NEED TO LEARN FROM THIS FILE
//   1. Schema building blocks: primitives, object, array, enum, union, literal
//   2. Modifiers: optional / nullable / nullish / default  (they are DIFFERENT)
//   3. .parse     -> returns data or THROWS ZodError
//   4. .safeParse -> NEVER throws, returns { success, data } | { success, error }
//   5. result.success narrows the union (discriminated union, topic 3.5)
//   6. error.issues: each has code, path, message
//   7. Zod v4 helpers: z.flattenError / z.treeifyError / z.prettifyError
//   8. Zod v4: prefer top-level z.email() / z.url() / z.uuid() over z.string().email()
// ============================================================================

import * as z from "zod";

// ---------------------------------------------------------------------------
// EXAMPLE 1: building blocks
// ---------------------------------------------------------------------------
const UserSchema = z.object({
  name: z.string().min(1, "Name is required"),   // custom message as 2nd arg
  email: z.email(),                               // v4: top-level format (v3 was z.string().email())
  age: z.number().int().min(18).optional(),       // key may be missing / undefined
  role: z.enum(["admin", "member"]),              // exact allowed strings
  website: z.url().nullable(),                    // may be null, but NOT undefined
  tags: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// EXAMPLE 2: optional vs nullable vs nullish
// ---------------------------------------------------------------------------
const a = z.string().optional();  // string | undefined
const b = z.string().nullable();  // string | null
const c = z.string().nullish();   // string | null | undefined

console.log("EX2: optional accepts undefined ->", a.safeParse(undefined).success); // true
console.log("EX2: optional accepts null      ->", a.safeParse(null).success);      // false!
console.log("EX2: nullable accepts null      ->", b.safeParse(null).success);      // true
console.log("EX2: nullable accepts undefined ->", b.safeParse(undefined).success); // false!
console.log("EX2: nullish accepts both       ->", c.safeParse(null).success, c.safeParse(undefined).success);

// GOTCHA: APIs return null for "empty", forms give undefined/"": picking the wrong one
// is a very common "why does my valid data fail" bug.

// ---------------------------------------------------------------------------
// EXAMPLE 3: .parse THROWS
// ---------------------------------------------------------------------------
const goodInput = {
  name: "Neeraj",
  email: "n@example.com",
  role: "admin",
  website: null,
  tags: ["react", "ts"],
};

const user = UserSchema.parse(goodInput); // typed as the inferred User
console.log("EX3: parsed ok ->", user.name);

try {
  UserSchema.parse({ ...goodInput, email: "not-an-email" });
} catch (err) {
  if (err instanceof z.ZodError) {
    console.log("EX3: .parse threw ZodError, issues =", err.issues.length);
  }
}
// Use .parse when invalid data is a BUG (and you want it to throw), e.g. validated server config.
// GOTCHA: .parse inside a React render with no try/catch or error boundary = white screen.

// ---------------------------------------------------------------------------
// EXAMPLE 4: .safeParse never throws: use it for user input
// ---------------------------------------------------------------------------
const bad = UserSchema.safeParse({
  name: "",
  email: "nope",
  role: "owner",
  website: "not a url",
  tags: [1, 2],
});

if (!bad.success) {
  // Narrowing: inside this block `bad.error` exists; `bad.data` does NOT.
  for (const issue of bad.error.issues) {
    console.log("EX4: issue ->", issue.path.join("."), "|", issue.code, "|", issue.message);
  }
}

if (bad.success) {
  bad.data; // only typed here, after narrowing
}

// ---------------------------------------------------------------------------
// EXAMPLE 5: turning issues into something a form can show
// ---------------------------------------------------------------------------
if (!bad.success) {
  // flattenError: { formErrors: string[], fieldErrors: { [field]: string[] } }
  // Perfect for flat forms: fieldErrors.email?.[0]
  const flat = z.flattenError(bad.error);
  console.log("EX5: fieldErrors keys ->", Object.keys(flat.fieldErrors));

  // treeifyError: nested, mirrors the object/array shape (good for nested forms)
  const tree = z.treeifyError(bad.error);
  console.log("EX5: tree.properties.email.errors ->", tree.properties?.email?.errors);

  // prettifyError: human readable text, great for logs / dev tools
  console.log("EX5: pretty ->\n" + z.prettifyError(bad.error));
}

// ---------------------------------------------------------------------------
// EXAMPLE 6: union and literal (e.g. API status)
// ---------------------------------------------------------------------------
const Status = z.union([z.literal("idle"), z.literal("loading"), z.number()]);
console.log("EX6: union ->", Status.safeParse("idle").success, Status.safeParse(5).success, Status.safeParse(true).success);

// ---------------------------------------------------------------------------
// INTERVIEW TAKEAWAYS
// ---------------------------------------------------------------------------
// - ".parse vs .safeParse?"
//     parse throws a ZodError; safeParse returns { success, data | error } and never throws.
//     User input -> safeParse (invalid is expected). Internal invariants -> parse.
// - "optional vs nullable?"
//     optional allows undefined, nullable allows null, nullish allows both.
// - "How do you read errors?"
//     error.issues (path + message + code), or z.flattenError for form fields.
