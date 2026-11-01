// ============================================================================
// 07  ZOD: coerce, transform, default, catch, preprocess   (forms send STRINGS)
// ============================================================================
// Run:  npm run zod:07
//
// WHAT YOU NEED TO LEARN FROM THIS FILE
//   1. Form inputs / query params / env vars are ALL strings
//   2. z.coerce.number() calls Number(input): "" becomes 0 (!), "abc" becomes NaN (rejected)
//   3. z.coerce.boolean() is a TRAP: "false" -> true  (any non-empty string is truthy)
//   4. Use z.stringbool() (v4) for "true"/"false"/"yes"/"no"/"1"/"0" style strings
//   5. .trim() .toLowerCase() are built-in string transforms
//   6. .transform() changes the output (and the output TYPE)
//   7. .default() vs .catch():  default = when input is undefined; catch = when parse FAILS
//   8. Order matters: validate first, then transform
// ============================================================================

import * as z from "zod";

// ---------------------------------------------------------------------------
// EXAMPLE 1: z.coerce.number()
// ---------------------------------------------------------------------------
const Age = z.coerce.number().int().min(0);

console.log("EX1: '42'  ->", Age.safeParse("42")); // success, data 42
console.log("EX1: 'abc' ->", Age.safeParse("abc").success); // false: Number("abc") is NaN

// GOTCHA: an EMPTY input becomes 0 and PASSES!
console.log("EX1: ''    ->", Age.safeParse("").data); // 0  <- empty form field silently valid
// Number("") === 0, Number(null) === 0, Number(" ") === 0.
// Fix: reject empty explicitly before coercing.
const AgeStrict = z
  .string()
  .min(1, "Age is required")
  .transform(Number) // string -> number, then validate the number
  .pipe(z.number().int().min(0));

console.log("EX1: strict '' ->", AgeStrict.safeParse("").success); // false
console.log("EX1: strict '5' ->", AgeStrict.safeParse("5").data); // 5

// ---------------------------------------------------------------------------
// EXAMPLE 2: the coerce.boolean() trap
// ---------------------------------------------------------------------------
const Bad = z.coerce.boolean();
console.log("EX2: coerce.boolean('false') ->", Bad.parse("false")); // TRUE (!!). Boolean("false") is true.
console.log("EX2: coerce.boolean('0')     ->", Bad.parse("0")); // TRUE (!!)
console.log("EX2: coerce.boolean('')      ->", Bad.parse("")); // false

// Correct way for env vars and query strings:
const Flag = z.stringbool(); // "true" "1" "yes" "on" "y" "enabled" -> true, "false" "0" "no" "off"... -> false
console.log("EX2: stringbool('false') ->", Flag.parse("false"));
console.log("EX2: stringbool('yes')   ->", Flag.parse("yes"));

// For HTML checkboxes you usually don't need coercion at all: RHF gives a real boolean.

// ---------------------------------------------------------------------------
// EXAMPLE 3: string cleanup (runs as part of parse)
// ---------------------------------------------------------------------------
const Email = z.string().trim().toLowerCase().pipe(z.email());
console.log("EX3: ->", Email.parse("  NEERAJ@Example.COM  ")); // "neeraj@example.com"
// Order: trim and lowercase first, THEN validate email format, using pipe to chain.

// ---------------------------------------------------------------------------
// EXAMPLE 4: transform changes the output value AND type
// ---------------------------------------------------------------------------
const Csv = z.string().transform((s) => s.split(",").map((x) => x.trim()));
type CsvOut = z.output<typeof Csv>; // string[]

const tags: CsvOut = Csv.parse("react, ts , zod");
console.log("EX4: ->", tags);

// A transform can also add issues via ctx: see 08 (refine / superRefine).

// ---------------------------------------------------------------------------
// EXAMPLE 5: default vs catch
// ---------------------------------------------------------------------------
const Settings = z.object({
  theme: z.enum(["light", "dark"]).default("light"), // only when value is UNDEFINED
  pageSize: z.coerce.number().int().positive().catch(20), // ANY failure -> 20
});

console.log("EX5: {}                  ->", Settings.parse({}));
console.log(
  "EX5: bad pageSize 'lots' ->",
  Settings.parse({ pageSize: "lots" }),
);
// default does NOT rescue invalid values:  Settings.parse({ theme: "pink" }) THROWS.
// catch silently hides bad data: great for tolerant UI settings, DANGEROUS for security / money.

// ---------------------------------------------------------------------------
// EXAMPLE 6: query params: a real use case
// ---------------------------------------------------------------------------
const SearchParams = z.object({
  q: z.string().default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z.enum(["new", "popular"]).default("new"),
});
const searchInput = z.input<typeof SearchParams>();
const url = new URL("https://app.test/search?q=lofi&page=3");
const params = SearchParams.parse(Object.fromEntries(url.searchParams));
console.log("EX6: ->", params); // { q: 'lofi', page: 3, sort: 'new' }

// ---------------------------------------------------------------------------
// INTERVIEW TAKEAWAYS
// ---------------------------------------------------------------------------
// - "Why do forms need coercion?"
//     HTML inputs yield strings; z.coerce.number() (or valueAsNumber in RHF) converts first.
// - "What's wrong with z.coerce.boolean()?"
//     Uses Boolean(): any non-empty string, including "false", is true. Use z.stringbool().
// - "What does coerce.number() do with an empty string?"
//     Number("") is 0, so it passes. Check for empty first.
// - "default vs catch?"
//     default fills in undefined; catch swallows ANY validation failure with a fallback.
