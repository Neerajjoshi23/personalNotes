// ============================================================================
// 10  ZOD AT THE API BOUNDARY   (your SoundBlend fetch layer, but generic)
// ============================================================================
// Run:  npm run zod:10
//
// WHAT YOU NEED TO LEARN FROM THIS FILE
//   1. res.json() returns `any`. Treat it as `unknown` and parse it
//   2. res.ok only checks HTTP status: a 200 can still carry the wrong shape
//   3. Validate ONLY what you use (extra API fields are stripped: less coupling)
//   4. Use safeParse + a typed error so the UI can show a message, not crash
//   5. Map API shape -> app shape with .transform (snake_case -> camelCase, ids to string)
//   6. Wrap fetch + parse in ONE helper so every endpoint is validated
//   7. Pair with TanStack Query: throw in queryFn, the `error` state takes over
//   8. A parse failure = "the backend drifted": log it, don't swallow it
// ============================================================================

import * as z from "zod";

// ---------------------------------------------------------------------------
// EXAMPLE 1: schema for the part of the API we actually use
// ---------------------------------------------------------------------------
// Jamendo-like response (simplified). We only list the fields the UI needs.
const TrackApiSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    artist_name: z.string(),
    audio: z.url(),
    duration: z.number().int().nonnegative(),
    image: z.string().default(""), // missing -> ""
  })
  // MAP to the shape the app wants (the rest of the code never sees snake_case):
  .transform((t) => ({
    id: t.id,
    title: t.name,
    artist: t.artist_name,
    audioUrl: t.audio,
    durationSec: t.duration,
    coverUrl: t.image,
  }));

const TracksResponseSchema = z.object({
  headers: z.object({ status: z.string(), results_count: z.number() }),
  results: z.array(TrackApiSchema),
});

export type Track = z.output<typeof TrackApiSchema>; // the CLEAN app type

// ---------------------------------------------------------------------------
// EXAMPLE 2: typed error + generic fetch helper
// ---------------------------------------------------------------------------
class ApiError extends Error {
  constructor(
    message: string,
    public readonly kind: "network" | "http" | "shape",
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchValidated<S extends z.ZodType>(
  url: string,
  schema: S,
  fetchImpl: typeof fetch = fetch
): Promise<z.output<S>> {
  let res: Response;

  try {
    res = await fetchImpl(url);
  } catch (cause) {
    throw new ApiError("Network error", "network", cause);
  }

  if (!res.ok) {
    // GOTCHA: fetch does NOT reject on 404/500: you must check res.ok yourself
    throw new ApiError(`HTTP ${res.status}`, "http");
  }

  const json: unknown = await res.json(); // `unknown`, not `any`
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    // The backend returned something unexpected. Log the details for developers,
    // show a friendly message to the user.
    throw new ApiError("Unexpected response shape", "shape", z.flattenError(parsed.error));
  }

  return parsed.data;
}

// ---------------------------------------------------------------------------
// EXAMPLE 3: simulate three backends
// ---------------------------------------------------------------------------
const fakeFetch =
  (status: number, body: unknown): typeof fetch =>
  async () =>
    new Response(JSON.stringify(body), { status });

const goodBody = {
  headers: { status: "success", results_count: 1 },
  results: [
    {
      id: "1",
      name: "Rain",
      artist_name: "Nature",
      audio: "https://cdn.test/rain.mp3",
      duration: 120,
      extra_field_we_dont_use: true, // stripped
    },
  ],
};

const driftedBody = {
  headers: { status: "success", results_count: 1 },
  results: [{ id: 1, name: "Rain" }], // id became a number, fields missing
};

async function main() {
  const ok = await fetchValidated("/tracks", TracksResponseSchema, fakeFetch(200, goodBody));
  console.log("EX3 ok     ->", ok.results[0]); // clean camelCase Track, image defaulted to ""

  for (const [label, impl] of [
    ["http 500", fakeFetch(500, {})],
    ["drifted ", fakeFetch(200, driftedBody)],
  ] as const) {
    try {
      await fetchValidated("/tracks", TracksResponseSchema, impl);
    } catch (e) {
      if (e instanceof ApiError) {
        console.log(`EX3 ${label} -> kind=${e.kind}`, e.kind === "shape" ? e.details : "");
      }
    }
  }
}

main();

// ---------------------------------------------------------------------------
// EXAMPLE 4: how it plugs into TanStack Query (your project already has it)
// ---------------------------------------------------------------------------
//   const { data, error, isPending } = useQuery({
//     queryKey: ["tracks", search],
//     queryFn: () => fetchValidated(buildUrl(search), TracksResponseSchema),
//   });
//
//   - queryFn THROWS on ApiError -> `error` is set -> render an error state.
//   - `data` is already the clean Track[] type: no `as` anywhere.
//   - Don't retry kind === "shape" errors forever: retrying won't fix a drifted backend.

// ---------------------------------------------------------------------------
// INTERVIEW TAKEAWAYS
// ---------------------------------------------------------------------------
// - "Where do you use Zod in a React app?"
//     At trust boundaries: API responses, forms, storage, URL params, env.
// - "Does fetch reject on a 404?"
//     No. Only on network failure; check res.ok.
// - "What should happen when the API response fails validation?"
//     Throw a typed error, show a safe message, log the details. Never cast and hope.
// - "Why transform at the boundary?"
//     The rest of the app uses one clean shape; API quirks stay in one place.
