// ============================================================================
// 08  ZOD: refine, superRefine / check, cross-field rules, async   (zod.dev)
// ============================================================================
// Run:  npm run zod:08
//
// WHAT YOU NEED TO LEARN FROM THIS FILE
//   1. Built-in checks (min, max, regex) cover single-field rules
//   2. .refine(fn, { message, path }) = custom boolean rule
//   3. Cross-field rule (password === confirm) lives on the OBJECT, so you MUST set `path`
//      or the error attaches to the root and the form can't show it by the field
//   4. .superRefine(ctx) = multiple issues from one check (v4 prefers .check, both work)
//   5. In Zod v4 an object-level refine is SKIPPED if a field has a TYPE error (wrong type
//      / missing), but still RUNS when a field only fails a check like min(8)
//      (v3 skipped it in both cases; old blog posts say otherwise)
//   6. Async refine requires .parseAsync / .safeParseAsync (sync parse will THROW)
//   7. Schema-level rule vs field-level rule: where to put it
// ============================================================================

import * as z from "zod";

// ---------------------------------------------------------------------------
// EXAMPLE 1: field-level refine
// ---------------------------------------------------------------------------
const Username = z
  .string()
  .min(3)
  .refine((v) => !v.includes(" "), { message: "No spaces allowed" });

console.log("EX1:", Username.safeParse("a b c").error?.issues[0].message);

// ---------------------------------------------------------------------------
// EXAMPLE 2: cross-field refine and the `path`
// ---------------------------------------------------------------------------
const SignUp = z
  .object({
    password: z.string().min(8),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"], // <- show the error under the confirm field
  });

const mismatch = SignUp.safeParse({ password: "12345678", confirm: "abcdefgh" });
console.log("EX2: path =", mismatch.error?.issues[0].path, "| message =", mismatch.error?.issues[0].message);

// What if you forget `path`? The issue gets path [] (the root):
//   z.flattenError(error).formErrors   -> ["Passwords do not match"]   (root)
//   z.flattenError(error).fieldErrors  -> {}                           (nothing for confirm!)
// With React Hook Form the message ends up in errors.root or is lost, and the UI looks broken.

// ---------------------------------------------------------------------------
// EXAMPLE 3: when is an object-level refine skipped? (v4 rules, verified by running)
// ---------------------------------------------------------------------------
// min(8) failed but the refine STILL ran -> both messages appear:
const tooShort = SignUp.safeParse({ password: "123", confirm: "different" });
console.log("EX3a: check fails  ->", tooShort.error?.issues.map((i) => i.message));

// A TYPE error (number instead of string, or missing key) skips the refine,
// because comparing garbage is meaningless:
const wrongType = SignUp.safeParse({ password: 123, confirm: "different" });
console.log("EX3b: type error   ->", wrongType.error?.issues.map((i) => i.message));

// Want a check to STOP later refinements too? Mark it abort: true.
const StopEarly = z
  .object({
    password: z.string().min(8, { error: "Too short", abort: true }),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });
console.log("EX3c: abort: true  ->", StopEarly.safeParse({ password: "1", confirm: "x" }).error?.issues.map((i) => i.message));
// GOTCHA: in a form you may see "Passwords do not match" flash while the user is still typing
// the first password: use abort: true or mode "onBlur"/"onSubmit" in RHF to calm it down.

// ---------------------------------------------------------------------------
// EXAMPLE 4: superRefine: many issues from one check, custom codes
// ---------------------------------------------------------------------------
const Password = z.string().superRefine((value, ctx) => {
  if (!/[A-Z]/.test(value)) {
    ctx.addIssue({ code: "custom", message: "Needs an uppercase letter" });
  }

  if (!/[0-9]/.test(value)) {
    ctx.addIssue({ code: "custom", message: "Needs a number" });
  }

  if (value.length < 8) {
    ctx.addIssue({ code: "custom", message: "Min 8 characters" });
  }
});

console.log(
  "EX4:",
  Password.safeParse("abc").error?.issues.map((i) => i.message)
);
// All three problems are reported at once: great for a password strength checklist.

// ---------------------------------------------------------------------------
// EXAMPLE 5: date range cross-field rule
// ---------------------------------------------------------------------------
const Trip = z
  .object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  })
  .refine((t) => t.end > t.start, {
    message: "End must be after start",
    path: ["end"],
  });

console.log("EX5:", Trip.safeParse({ start: "2026-02-01", end: "2026-01-01" }).error?.issues[0].message);

// ---------------------------------------------------------------------------
// EXAMPLE 6: async refine, e.g. "is this username taken?"
// ---------------------------------------------------------------------------
const takenNames = new Set(["admin", "root"]);

const UniqueName = z.string().refine(async (name) => {
  await new Promise((r) => setTimeout(r, 50)); // pretend this is a network call
  return !takenNames.has(name);
}, "Username already taken");

async function main() {
  // GOTCHA: calling the SYNC version on an async schema throws an error:
  try {
    UniqueName.parse("admin");
  } catch (e) {
    console.log("EX6: sync parse on async schema ->", (e as Error).constructor.name);
  }

  const res = await UniqueName.safeParseAsync("admin");
  console.log("EX6: async result ->", res.success, res.error?.issues[0].message);
}

main();
// RHF's zodResolver uses the async parse for you, but an async refine runs on EVERY
// validation (each keystroke in onChange mode): debounce it or check on submit / server side.

// ---------------------------------------------------------------------------
// INTERVIEW TAKEAWAYS
// ---------------------------------------------------------------------------
// - "How do you validate that two fields match?"
//     refine on the OBJECT with path: ["confirm"] so the error lands on that field.
// - "What happens without path?"
//     Error goes to the root (path []), the form can't show it beside a field.
// - "refine vs superRefine?"
//     refine = one boolean + one message. superRefine = push several issues with custom codes/paths.
// - "Why didn't my cross-field error appear?"
//     In v4 the object refine is skipped when a field has a TYPE error (wrong type/missing);
//     a failing check (min, regex) does not block it unless that check uses abort: true.
// - "Async validators?"
//     Need parseAsync/safeParseAsync; sync parse throws.
