# Code review notes

Review in progress. Written in my own words, then checked against the code.
Sections: corpus + chunking, then the rag/ modules (llm, index, retrievers, answer).

## config.py
- Two Pydantic settings objects: one for settings, one for the source.
- `project.json` values override the defaults when the settings object is built.
- To do: for each setting, find where it is used.

## corpus.py (`CorpusBuilder`)
- `corpus/build_corpus.py` adds the project root to `sys.path` (two folders up from the script's own location), so `rag` can be imported. It then creates a `CorpusBuilder` and calls it.
- The constructor loads the settings.
- Layout on disk (described at the top of the file):
  - `raw/`: raw pages as fetched.
  - `pages/`: cleaned pages.
  - `manifest.jsonl`: one JSON row per page with `url`, `title`, `version`, `retrieved_at` and `content_hash`.
- `content_hash` shows whether a page changed on a re-run: the same content gives the same hash.
- The rest of the file fetches, cleans and formats pages, then writes the manifest.

## chunker.py (`Chunker`)
- The script makes a `Chunker` and calls `run()`.
- `run()`:
  1. Read every manifest row into a list of dicts.
  2. For each row, read the cleaned page and call `chunk_page`, which returns `Chunk` objects.
  3. Extend one big list of chunks, check the IDs are unique, save to `data/chunks.jsonl` and print stats.
- Strategy:
  1. Split the page into sections at H2/H3 (headings inside code fences are ignored).
  2. Keep a whole section as one chunk if it fits in `max_tokens`.
  3. If a section is too big, split it into blocks. A paragraph or a whole code fence is the smallest unit, so code is never cut in half.
  4. Pack blocks greedily up to `max_tokens`. The next chunk starts with the last prose block of the previous one, up to `overlap_tokens`. Code is never used as overlap.
  5. A section under `min_tokens` is merged into the previous section, and its heading is kept inside the text.

## Chunk fields
| field | meaning |
|---|---|
| `chunk_id` | 12-char SHA-1 of `source_path \| breadcrumb \| occurrence \| piece index`. It is built from position metadata, **not** the text. It is stable across re-runs, and it is the id used in `[id]` citations. |
| `source_url` | The web URL the page came from. |
| `source_path` | Local path under `data/pages/`, e.g. `docs/framework/react/guides/queries.md`. |
| `title` | Page title. |
| `heading_path` | Heading hierarchy down to this chunk's section, e.g. `["Queries", "Query Basics", "FetchStatus"]`. |
| `section_anchor` | URL fragment of the **last** heading in `heading_path`. See below. |
| `version` | Docs version (pinned commit / package version). |
| `has_code` | True if the chunk contains a code fence. |
| `token_count` | Tokens of the chunk text, counted with the embedder's tokenizer. |
| `text` | Breadcrumb (`Queries > Query Basics`), a blank line, then the body. So the heading is embedded too. |

## section_anchor explained
It is the heading turned into a URL fragment, GitHub style: lowercase, punctuation dropped, spaces become `-`.

| heading | anchor |
|---|---|
| `Query Basics` | `query-basics` |
| `Why two different states?` | `why-two-different-states` |
| `FetchStatus` | `fetchstatus` |

Real example from `guides/queries.md` (162 chunks in total):

| chunk_id | heading_path | anchor |
|---|---|---|
| f29383ab0e9c | Queries > Query Basics | query-basics |
| 9e793edb41e1 | Queries > Query Basics | query-basics |
| a41be9233deb | Queries > Query Basics | query-basics |
| e0f48cf49daf | Queries > Query Basics > FetchStatus | fetchstatus |

The first three chunks are one long section split into three pieces, so they share the anchor.

Uses:
1. **Deep link.** `source_url#section_anchor` opens the page at that section. Answers use this for citations.
2. **Relevance label.** The eval set labels a question with sections such as `docs/framework/react/guides/query-retries.md#retry-delay`. A retrieved chunk is relevant if its `source_path#section_anchor` matches. So the labels survive re-chunking, because they do not depend on chunk ids.

Known weakness: if the same heading appears twice on a page (e.g. `Call Signature` in `useQuery.md`), both chunks get the same anchor, so both count as relevant.

## Chunking strategy by example (three cases)

Page: `Queries`, with sections A (`## Query Basics`), B (`### FetchStatus`), C (`### Why two states?`, very small) and D (`## Further Reading`, long).

| case | what happens | chunks | overlap |
|---|---|---|---|
| 1. Section fits (A, B) | One section becomes one chunk. | A -> 1 chunk, B -> 1 chunk | None. Headings give the link: `Queries > Query Basics > FetchStatus`. |
| 2. Section too small (C, under `min_tokens`) | C is merged into the previous section B. Its heading line (`### Why two states?`) stays in the body. | B+C -> 1 chunk, `heading_path` and anchor are B's | None. This is the only case where a chunk holds two sections. |
| 3. Section too long (D) | D is split into blocks D1..D6 (a paragraph or a whole code fence, never cut in half). Blocks are packed up to `max_tokens`. | D -> 3 chunks: `D1 D2 D3`, `D3 D4 D5`, `D5 D6` | The last prose block of the previous chunk is repeated. It is skipped if that block is code or longer than `overlap_tokens`. |

Rules that hold in every case:
- A section boundary never has overlap, because `heading_path` is written at the top of every chunk's text.
- Pieces of one split section share `heading_path`, `section_anchor`, `source_path`, `source_url`, `title` and `version`. They differ in `chunk_id` (the piece index is hashed), `text`, `token_count` and `has_code`.
- So the label `file.md#further-reading` matches all pieces of D.
- A block bigger than `max_tokens` is split further. Code blocks stay whole, which is why the largest chunk is 915 tokens.

## Missed in the first pass
- `corpus.py` re-fetches every page and compares the new hash with the previous manifest, reporting each page as unchanged or changed. It does not skip the fetch.
- Chunk ids are checked for uniqueness.
- Chunks over 1.5x `max_tokens` are reported (one: 915 tokens, `useQuery > Parameters > options`).

---

# rag/ modules (llm, index, retrievers, answer)

## retrievers.py — the six methods

**The interface.** `Retriever(ABC)` with one method: `search(question, k) -> list[Hit]`. Every retriever returns the same `Hit` shape. Key rule from the docstring: **scores from different retrievers are NOT comparable** (cosine, BM25 and RRF are different scales), so retrievers are compared by rank only. This rule drives the hybrid design below.

**RetrievalRegistry.** Builds all six methods once, keeps them in a `name -> retriever` dict, and `retrieve()` rejects unknown method names. Six methods from three bases + two rerankers, with no extra classes — `RerankedRetriever(base, reranker, candidates)` is a decorator that computes its own name (`f"{base.name}+{reranker.suffix}"`). Construction is eager, but heavy resources load lazily: BM25 builds on first `search()`, the cross-encoder on first `rerank()`, Chroma on first use.

**VectorRetriever.** A thin adapter: `VectorIndex.search` embeds the question (with the embedder's `query_prefix`) and calls `collection.query(n_results=k)`. Chroma's HNSW index does the search — there is **no** Python loop over chunks and no sorting in my code. Similarity = `1 - cosine distance`.

**BM25Retriever.**
- `_load()` (first call only): tokenize every chunk -> list-of-token-lists -> `BM25Okapi`.
- `tokenize()` is the "word variants" idea, already implemented: lowercase word tokens, and camelCase identifiers also add their parts. `invalidateQueries` -> `invalidatequeries`, `invalidate`, `queries`. The whole token keeps exact-name matches strong; the parts let plain English ("invalidate queries") still hit.
- `search()`: tokenize the question, `get_scores`, argsort descending, keep `score > 0`, take top k.
- The `score > 0` filter means BM25 can return **fewer than k** hits (docs with no matching term score 0). Side effect: hybrid gets fewer BM25 candidates.
- Note: BM25 reads `chunks.jsonl`, vector reads Chroma — two sources of truth. If someone re-chunks without re-syncing Chroma, hybrid fuses two different corpora. Not guarded anywhere.

**HybridRetriever (RRF).** Correction to my first description: the formula is `1 / (rrf_k + rank)` summed over lists — it fuses **ranks, never scores**. That is exactly because scores are not comparable across retrievers; ranks are. `rrf_k` dampens: bigger k = rank differences matter less = flatter fusion. Each base retriever is asked for `candidates` (~20) hits, fused, top k returned. `by_id.setdefault` keeps the first-seen Hit's text/meta for the fused output.

**Rerankers.**
- `RerankedRetriever.search` fetches `candidates` from the base (config value, **not** `2*k` as I first said), reranks, keeps k.
- `CrossEncoderReranker`: scores (question, chunk) pairs jointly — more accurate than bi-encoder similarity because attention sees both texts, but O(n) model calls per query, so it is only a second-stage reranker, never a first-stage retriever. Model loads lazily.
- `LLMReranker`: sends numbered chunks, asks for an ordering, parses `RankOrder` JSON. Then **repairs**: drops invalid/duplicate ids, and appends chunks the model dropped (in original order). A hard failure raises `AppError("rerank", ...)` — no silent fallback to base order.

## index.py — VectorIndex

- `sync(chunks)`: `get_or_create_collection` with metadata recording `hnsw:space: cosine`, the embed model and the doc prefix — so any result can be traced back to the config that produced it.
- **Embed-model guard:** if the collection's stored embed model differs from the current setting, `SystemExit` — never silently mix two embedding spaces in one collection.
- Diff logic: hash each chunk's text (sha256, stored in metadata as `text_hash`). In DB but not in file -> delete (stale). Hash differs -> re-embed + upsert. Same hash -> skip. Idempotent incremental sync: a rerun with no changes embeds nothing.
- Weakness (fine at this scale): `col.get()` loads every id+metadata into memory; and the hash covers only text — a metadata-only change (e.g. renamed heading) would not refresh the stored metadata.
- `search(question, k)`: embed with `query_prefix`, query, map rows to `Hit` with `score = 1 - distance`.

## llm.py — the only place that calls models

- One `LLM` class over litellm: `complete()` (chat) and `embed()`. Reranking, answering and judging all share one rate limiter, so they stay under the provider limit together.
- **Rate limiter (sliding window):** a deque of call timestamps. On each call: pop the front while `now - oldest >= 60s` (monotonic queue, so oldest first), if `len < limit` append now and go, else sleep until the oldest call ages out. Uses `time.monotonic()` (immune to wall-clock changes) and a lock (thread-safe).
- **Retries:** only transient errors are retried (`TRANSIENT_ERRORS`: rate limit, timeout, connection, service unavailable, 500) with exponential backoff `2**attempt` plus random jitter (so concurrent retries do not bunch up). A permanent error (400, auth) fails fast as `LLMError` — retrying it would just waste the rate-limit budget.
- `embed()` is not rate-limited (different endpoint; fine at this scale).

## answer.py — grounded generation + citation check

- `answer_question(question, method, k)` **never raises**: it always returns an `AnswerResult`, failures land in `result.error`. Errors-as-data is what makes batch eval runs robust — one bad question does not kill a 150-question run.
- `method="none"` skips retrieval entirely: a baseline for what the frontier model already knows about TanStack Query without evidence.
- `build_messages`: evidence is fenced (`<<< ... >>>`) and labelled with `[chunk_id]` + source URL, so the model can tell evidence apart from instructions.
- `check_citations`: regex `\[([0-9a-f]{12})\]` pulls cited ids from the answer, then **application code** resolves them against the retrieved set — the model can only cite ids it was given, and URLs are built from chunk metadata, never taken from the model's text. Outputs: `citations` (resolved, with deep links `url#anchor`), `unknown_citations` (id not in the retrieved set), `missing_citations` (no citations at all).
- Honest limit (docstring): a valid citation id proves the model cited something we supplied — **not** that the chunk supports the claim. That still needs manual or judged review (`judge.py`).

## Interview angles from these four files
- Why RRF and not score averaging -> scales are incomparable; ranks are the common currency.
- Why cross-encoder only as a reranker -> accuracy vs O(n) cost; two-stage retrieval: cheap wide recall, expensive narrow rerank.
- Why content-hash sync -> idempotency: a rerun is a no-op, a crash mid-run is safe to retry.
- Why errors-as-data in answer.py -> batch evals must survive individual failures.
- Why citation ids are resolved in app code -> prompt-injection defense: the model cannot invent links.

# Evaluation (metrics.py, judge.py)

## metrics.py — retrieval metrics
Input: `score_retrieval(hits, labeled_sections, k)`. A chunk is relevant if its section (`source_path#section_anchor`) is in the labeled set.
- **recall@k** = labeled sections with at least one chunk in top k / total labeled sections. The denominator is *sections*, not k, and it counts sections (not chunks) so a section split into many chunks isn't inflated. Example: 3 labeled sections, top 5 covers 2 -> 2/3.
- **precision@k** = relevant chunks in top k / k. This is the "relevant / k" formula — how clean the context is.
- **MRR** = 1 / rank of the first relevant chunk in top k, else 0.
- **nDCG@k** = DCG / ideal DCG. Gain is binary (relevant = 1, not = 0). Discount per position = `1 / log2(position + 1)` (pos 1 = 1.0, pos 2 = 0.63, pos 3 = 0.5). Ideal = all relevant at the top, capped at `min(k, relevant chunks that exist)`.
- Worked example: top 5 = [no, yes, no, yes, no], 3 relevant exist -> DCG = 0.63 + 0.43 = 1.06, ideal = 1 + 0.63 + 0.5 = 2.13, nDCG ~ 0.50, MRR = 0.5.
- Questions with no labels (clarify / abstain) return `None` and are skipped by `mean_metrics` — judged on behavior, not retrieval.
- What each answers: recall = did we find the evidence; precision = how much noise; MRR = how fast the first good chunk appears; nDCG = rank quality of the whole list.

## judge.py — LLM-as-judge for answers
Flow: eval case (question, `expected_facts`, `must_not_claim`, `expected_behavior`) -> retrieve -> generate answer -> send question + facts + banned claims + the **same evidence the assistant saw** + the answer to the judge -> structured `Verdict`.
- `Verdict` fields: `facts_covered` (0..N), `contradicts`, `faithful`, `behavior_ok`, `reason`.
- The `Field(description=...)` text is part of the prompt: with `response_format=Verdict` the schema (including descriptions) goes to the model, so each field is defined precisely and the output is forced into valid typed JSON, validated by `Verdict.model_validate_json`. Counts and booleans instead of free text -> aggregatable and comparable across runs.
- `faithful` is judged against the evidence passages, not world knowledge ("true in general" still = False) — that is what catches hallucination; no evidence -> False.
- `reason` is one sentence naming the missing fact / unsupported claim — for debugging a failed case by hand.
- `is_correct` is deterministic code, not the LLM: `answer` -> `facts_covered >= N` and no contradiction and `behavior_ok`; `clarify` / `abstain` -> `behavior_ok` and no contradiction. The judge only produces facts; the pass/fail rule lives in code.
- Note: `faithful` is returned but not part of `is_correct`; it is reported separately.
- Limits (docstring): judge is the same model family as the generator, so spot-check by hand. Judge errors are returned as data `(None, error)`, same errors-as-data pattern as answer.py.
- Interview angle: retrieval metrics are objective, answer quality needs a judge; structured verdict + deterministic rule + hand spot-checks keeps the judge honest.
