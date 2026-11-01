// ============================================================================
// 09  ZOD: object strictness + composing schemas   (zod.dev/api)
// ============================================================================
// Run:  npm run zod:09
//
// WHAT YOU NEED TO LEARN FROM THIS FILE
//   1. Default z.object STRIPS unknown keys from the output (no error)
//   2. z.strictObject  -> unknown keys are an ERROR
//   3. z.looseObject   -> unknown keys are KEPT (passthrough)
//      (v4: .strict() / .passthrough() still work but are deprecated)
//   4. Compose: .pick .omit .partial .required .extend  (keep ONE base schema)
//   5. z.discriminatedUnion: parse tagged unions fast with good errors
//   6. z.record, z.tuple, z.array(...).min() for dynamic data
//   7. Strip-by-default is a security feature: stops mass-assignment (isAdmin: true)
// ============================================================================

import * as z from "zod";

// ---------------------------------------------------------------------------
// EXAMPLE 1: strip (default) vs strict vs loose
// ---------------------------------------------------------------------------
const input = { name: "Neeraj", isAdmin: true }; // client sneaks in an extra field

const Stripped = z.object({ name: z.string() });
const Strict = z.strictObject({ name: z.string() });
const Loose = z.looseObject({ name: z.string() });

console.log("EX1: default ->", Stripped.parse(input)); // { name } (isAdmin dropped, no error)
console.log("EX1: strict  ->", Strict.safeParse(input).error?.issues[0].code); // "unrecognized_keys"
console.log("EX1: loose   ->", Loose.parse(input)); // { name, isAdmin } kept

// WHY IT MATTERS (mass assignment): if you do db.update(req.body) and body has { isAdmin: true },
// you've got a privilege escalation. Parsing with a default object strips it. Use strict when you
// want to REJECT suspicious payloads, loose only when you truly forward unknown data.

// ---------------------------------------------------------------------------
// EXAMPLE 2: derive schemas, don't copy-paste
// ---------------------------------------------------------------------------
const User = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.email(),
  role: z.enum(["admin", "member"]),
});

const CreateUser = User.omit({ id: true }); // server generates id
const UpdateUser = User.omit({ id: true }).partial(); // every field optional (PATCH)
const PublicUser = User.pick({ id: true, name: true }); // what the API exposes
const UserWithAge = User.extend({ age: z.number().int() }); // add fields

type CreateUserInput = z.infer<typeof CreateUser>;
type UpdateUserInput = z.infer<typeof UpdateUser>;

const patch: UpdateUserInput = { name: "New name" }; // fine: everything optional
const create: CreateUserInput = { name: "A", email: "a@b.com", role: "member" };
console.log(
  "EX2:",
  Object.keys(PublicUser.shape),
  Object.keys(UserWithAge.shape).length,
  patch,
  create,
);

// Single source of truth: change User once and all derived schemas + types follow.
// (v4: use .extend / spread `.shape` instead of the deprecated .merge)
// GOTCHA: .partial() makes the key optional: it does NOT make "" or null valid.

// ---------------------------------------------------------------------------
// EXAMPLE 3: discriminated union (tagged API results, form steps, events)
// ---------------------------------------------------------------------------
const ApiResult = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("success"),
    data: z.object({ id: z.number() }),
  }),
  z.object({ status: z.literal("error"), message: z.string() }),
]);

type ApiResult = z.infer<typeof ApiResult>;

function describe(r: ApiResult) {
  // TS narrows on `status`: exactly like the discriminated unions from topic 3.5
  return r.status === "success" ? `id ${r.data.id}` : `error: ${r.message}`;
}

console.log(
  "EX3:",
  describe(ApiResult.parse({ status: "success", data: { id: 7 } })),
);

const badTag = ApiResult.safeParse({ status: "pending" });
console.log("EX3: bad tag ->", badTag.error?.issues[0].code);
// A plain z.union would give you a confusing wall of errors from EVERY branch;
// discriminatedUnion looks at the tag first and reports only the relevant branch.

// ---------------------------------------------------------------------------
// EXAMPLE 4: record, tuple, array constraints
// ---------------------------------------------------------------------------
const Volumes = z.record(z.string(), z.number().min(0).max(1)); // { [track: string]: 0..1 } (your mixer!)
type VolumesInput = z.input<typeof Volumes>;
type VolumesOutput = z.output<typeof Volumes>;
console.log(
  "EX4: record ->",
  Volumes.safeParse({ rain: 0.5, lofi: 1.5 }).success,
); // false

const Point = z.tuple([z.number(), z.number()]);
console.log("EX4: tuple  ->", Point.parse([1, 2]));

const Playlist = z.array(z.string()).min(1, "Add at least one track").max(10);
console.log("EX4: array  ->", Playlist.safeParse([]).error?.issues[0].message);

// ---------------------------------------------------------------------------
// EXAMPLE 5: nested objects and error paths
// ---------------------------------------------------------------------------
const Settings = z.object({
  profile: z.object({
    displayName: z.string().min(2),
  }),
  tracks: z.array(z.object({ id: z.string(), volume: z.number() })),
});

const nested = Settings.safeParse({
  profile: { displayName: "x" },
  tracks: [{ id: "a", volume: "loud" }],
});
console.log(
  "EX5:",
  nested.error?.issues.map((i) => i),
);
// ["profile.displayName", "tracks.0.volume"]
// These dotted paths are EXACTLY the names React Hook Form uses for nested fields.

// ---------------------------------------------------------------------------
// INTERVIEW TAKEAWAYS
// ---------------------------------------------------------------------------
// - "What does z.object do with unknown keys?"
//     Strips them silently. strictObject errors, looseObject keeps them.
// - "How do you avoid duplicate schemas for create/update?"
//     Define the base once; derive with omit / pick / partial / extend.
// - "Why discriminatedUnion over union?"
//     Faster and gives focused errors, based on a tag literal, and TS narrows on the tag.
// - "How does stripping help security?"
//     Blocks mass-assignment of fields the client shouldn't control (still validate on the server!).
