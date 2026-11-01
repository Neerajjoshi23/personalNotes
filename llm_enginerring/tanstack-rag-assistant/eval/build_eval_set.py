"""Write eval/eval_set.jsonl from the question table below.

DRAFT: questions, expected facts and relevant sections were drafted with AI help
and must be reviewed by a human (reviewed=false until you flip it) before
the numbers mean anything. Run eval/validate_eval_set.py after every edit.

Labels are SECTION-level ("<source_path>#<section_anchor>"), not chunk IDs, so
they survive re-chunking; the runner maps sections to chunk IDs at eval time.

Fields:
  category          direct | exact_api | multi_section | ambiguous | out_of_corpus
  expected_behavior answer | clarify | abstain
  relevant_sections acceptable evidence (empty for clarify/abstain)
  evidence_phrases  substrings that must appear in the labeled sections (checked by the validator)
  expected_facts    what a correct answer must say (for the judge)
  must_not_claim    claims that would make the answer wrong
"""

import json
from pathlib import Path

G = "docs/framework/react/guides/"
R = "docs/framework/react/reference/functions/"

# (id, split, category, question, behavior, sections, phrases, facts, must_not)
ROWS = [
    # ---- direct lookup ----
    ("d01", "dev", "direct", "Does TanStack Query treat cached data as fresh or stale by default?", "answer",
     [G + "important-defaults.md#important-defaults"], ["consider cached data as stale"],
     ["Cached data is considered stale by default", "staleTime changes this"], ["Data is fresh by default"]),
    ("d02", "dev", "direct", "What is the default delay between query retries?", "answer",
     [G + "query-retries.md#retry-delay"], ["30 seconds"],
     ["Delay doubles with each attempt starting at 1000ms", "It does not exceed 30 seconds"], ["Retries happen immediately"]),
    ("d03", "dev", "direct", "How long do inactive queries stay in the cache before garbage collection?", "answer",
     [G + "important-defaults.md#important-defaults"], ["garbage collected after **5 minutes**"],
     ["5 minutes by default", "Configurable with gcTime"], ["Inactive queries are never removed"]),
    ("d04", "dev", "direct", "What is the difference between a query's status and its fetchStatus?", "answer",
     [G + "queries.md#fetchstatus", G + "queries.md#why-two-different-states"], ["fetchStatus"],
     ["status describes whether there is data (pending/error/success)", "fetchStatus describes whether the queryFn is running (fetching/paused/idle)"],
     ["They are the same thing"]),
    ("d05", "dev", "direct", "How do I stop a query from running automatically?", "answer",
     [G + "disabling-queries.md#disablingpausing-queries"], ["enabled"],
     ["Set enabled: false", "Use refetch to trigger it manually"], []),
    ("d06", "dev", "direct", "How do I cancel a request when using fetch?", "answer",
     [G + "query-cancellation.md#using-fetch"], ["signal"],
     ["Pass the AbortSignal from the query function context to fetch"], []),
    ("d07", "heldout", "direct", "How do I keep showing the previous page's data while the next page loads in a paginated list?", "answer",
     [G + "paginated-queries.md#better-paginated-queries-with-placeholderdata"], ["placeholderData"],
     ["Use placeholderData: keepPreviousData"], []),
    ("d08", "heldout", "direct", "Does the order of keys inside an object in a query key matter?", "answer",
     [G + "query-keys.md#query-keys-are-hashed-deterministically"], ["hashed deterministically"],
     ["Object key order does not matter", "Array item order does matter"], ["Object key order changes the cache entry"]),

    # ---- exact API / code ----
    ("a01", "dev", "exact_api", "What does skipToken do and when would I use it?", "answer",
     [G + "disabling-queries.md#typesafe-disabling-of-queries-using-skiptoken"], ["skipToken"],
     ["Disables a query in a type-safe way by passing it as queryFn"], []),
    ("a02", "dev", "exact_api", "What properties are on the object passed to a query function?", "answer",
     [G + "query-functions.md#queryfunctioncontext"], ["signal?: AbortSignal"],
     ["queryKey", "client", "signal", "meta"], []),
    ("a03", "dev", "exact_api", "What does exact: true do in queryClient.invalidateQueries?", "answer",
     [G + "query-invalidation.md#query-matching-with-invalidatequeries"], ["exact: true"],
     ["Only the query whose key matches exactly is invalidated, not queries with the key as a prefix"], []),
    ("a04", "dev", "exact_api", "Which options does useInfiniteQuery need to know how to fetch the next page?", "answer",
     [G + "infinite-queries.md#infinite-queries", G + "infinite-queries.md#example"], ["getNextPageParam"],
     ["initialPageParam", "getNextPageParam"], []),
    ("a05", "heldout", "exact_api", "What does the select option of useQuery do?", "answer",
     [R + "useQuery.md#options"], ["select"],
     ["Transforms or selects part of the query data"], []),
    ("a06", "heldout", "exact_api", "What does maxPages do for infinite queries?", "answer",
     [G + "infinite-queries.md#what-if-i-want-to-limit-the-number-of-pages"], ["maxPages"],
     ["Limits the number of pages kept in the query data", "Used with getNextPageParam and getPreviousPageParam"], []),

    # ---- multi-section ----
    ("m01", "dev", "multi_section", "How do I update the UI optimistically when adding a todo and roll back if the request fails?", "answer",
     [G + "optimistic-updates.md#via-the-cache", G + "optimistic-updates.md#updating-a-list-of-todos-when-adding-a-new-todo"], ["onMutate"],
     ["Update the cache in onMutate", "Return the previous value as context", "Roll back in onError using the context"], []),
    ("m02", "dev", "multi_section", "After a mutation succeeds, how do I make related queries refetch?", "answer",
     [G + "invalidations-from-mutations.md#invalidations-from-mutations", G + "query-invalidation.md#query-invalidation"], ["invalidateQueries"],
     ["Call invalidateQueries in the mutation's onSuccess", "Invalidated queries are marked stale and refetched if in use"], []),
    ("m03", "dev", "multi_section", "How do I run a second query only after the first one has returned a user id?", "answer",
     [G + "dependent-queries.md#usequery-dependent-query", G + "disabling-queries.md#disablingpausing-queries"], ["enabled"],
     ["Use enabled with a condition on the first query's data"], []),
    ("m04", "dev", "multi_section", "Why does my data refetch when I switch browser tabs and how do I turn it off?", "answer",
     [G + "window-focus-refetching.md#window-focus-refetching", G + "important-defaults.md#important-defaults"], ["refetchOnWindowFocus"],
     ["Stale queries refetch on window focus by default", "Disable with refetchOnWindowFocus: false or increase staleTime"], []),
    ("m05", "heldout", "multi_section", "My infinite query refetches dozens of pages sequentially. How do I reduce that?", "answer",
     [G + "infinite-queries.md#what-happens-when-an-infinite-query-needs-to-be-refetched",
      G + "infinite-queries.md#what-if-i-want-to-limit-the-number-of-pages"], ["maxPages"],
     ["Refetches fetch all pages sequentially", "Use maxPages to limit the pages kept"], []),
    ("m06", "heldout", "multi_section", "What happens to a mutation when the user is offline, and can it be retried?", "answer",
     [G + "mutations.md#persisting-offline-mutations", G + "mutations.md#retry"], ["offline"],
     ["Mutations are not retried by default", "Offline mutations can be persisted and resumed"], []),

    # ---- ambiguous (should ask a clarifying question) ----
    ("x01", "dev", "ambiguous", "My query isn't updating.", "clarify", [], [],
     ["Asks what is meant: no refetch, stale data, cache, or UI", "Does not guess one cause"], ["States a single definite cause"]),
    ("x02", "dev", "ambiguous", "It keeps refetching, how do I fix it?", "clarify", [], [],
     ["Asks which query/trigger (focus, mount, interval) and the current config"], ["States a single definite cause"]),
    ("x03", "dev", "ambiguous", "How do I make it faster?", "clarify", [], [],
     ["Asks what is slow (initial load, refetches, rendering)"], ["Recommends one specific option as the fix"]),
    ("x04", "heldout", "ambiguous", "The mutation doesn't work.", "clarify", [], [],
     ["Asks for the error, the code, or what is expected"], ["States a single definite cause"]),
    ("x05", "heldout", "ambiguous", "How do I handle errors?", "clarify", [], [],
     ["Asks whether the errors are from queries, mutations or rendering"], []),

    # ---- out of corpus (should abstain) ----
    ("o01", "dev", "out_of_corpus", "How do I set up server-side rendering with hydration in Next.js app router?", "abstain", [], [],
     ["States this is not in the documentation provided"], ["Gives a hydration setup as if documented"]),
    ("o02", "dev", "out_of_corpus", "How do I migrate from React Query v3 to v5?", "abstain", [], [],
     ["States this is not in the documentation provided"], ["Gives a migration guide as if documented"]),
    ("o03", "dev", "out_of_corpus", "How do I use RTK Query's createApi instead?", "abstain", [], [],
     ["States this is not in the documentation provided"], ["Explains createApi"]),
    ("o04", "heldout", "out_of_corpus", "How do I use the TanStack Query devtools?", "abstain", [], [],
     ["States this is not in the documentation provided"], ["Describes devtools setup as if documented"]),
    ("o05", "heldout", "out_of_corpus", "How do I use TanStack Router loaders together with Query?", "abstain", [], [],
     ["States this is not in the documentation provided"], ["Describes Router loader integration"]),
]

KEYS = ["id", "split", "category", "question", "expected_behavior", "relevant_sections",
        "evidence_phrases", "expected_facts", "must_not_claim"]


def main():
    out = Path(__file__).resolve().parent / "eval_set.jsonl"
    with out.open("w", encoding="utf-8") as f:
        for row in ROWS:
            rec = dict(zip(KEYS, row))
            rec["answerable"] = rec["expected_behavior"] == "answer"
            rec["reviewed"] = False
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"wrote {len(ROWS)} questions to {out}")


if __name__ == "__main__":
    main()
