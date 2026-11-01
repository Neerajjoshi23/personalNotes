# Design decisions

Status: working draft. Items marked **OPEN** are not decided yet.

## Direction

- Start with TanStack Query (React docs). Expand later to other docs or a v4 + v5 comparison using the same pipeline.
- Known risk: frontier models already know TanStack Query, which can contaminate answer-quality evals. Mitigation: add a no-retrieval baseline (question only, no context) and compare.

## Code layout and reuse

- Shared code lives in the `rag/` package: `corpus.py` (`CorpusBuilder`), `chunker.py` (`Chunker`), `config.py` (Pydantic `Settings`, prompts), `models.py` (`Chunk`, `Hit`, `EvalCase`, `Verdict`, `AnswerResult`, `AppError`), `llm.py`, `data.py` (loading chunks and eval set), `index.py` (Chroma), `retrievers.py`, `answer.py`, `judge.py`, `metrics.py`. The stage scripts (`corpus/`, `chunking/`, `indexing/`, `eval/`) and `app.py` are thin.
- Everything project-specific is in `project.json` (docs name, GitHub repo, docs folder, site URL, version file, collection name; any `Settings` field such as models, chunk sizes or prompts can be overridden there), plus `corpus/pages.txt` and `eval/eval_set.jsonl`.
- To reuse for another docs set (Markdown in a GitHub repo): edit `project.json`, replace `pages.txt` and the eval set, then run corpus -> chunk -> index -> `python app.py`. Other sources need a new fetcher in place of `build_corpus.py`; the BM25 tokenizer and heading-based chunker assume code-heavy Markdown.
- Switch models by changing litellm names in `project.json` (`gen_model`, `embed_model`); if the embedder changes, also change `chunk_tokenizer`, the prefixes, and delete `data/chroma`.

## Step 1: Corpus

**Source**
- A hand-picked list of 15-25 page URLs (not a full-site crawl), kept in a page list file.
- Version: v5 (decided). Snapshot pinned to a commit SHA of `TanStack/query` (react-query 5.104.1 at the first run); the SHA and date are saved in `data/corpus_meta.json`.
- Fetch method (decided): the Markdown source in the GitHub repo (`docs/framework/react/`), not the website. The website redirects scrapers and is JavaScript-rendered.
- Citation links use `tanstack.com/query/v5/...`, which currently redirects to `/latest/`. If v6 ships, those links may show a different version; the pinned commit and manifest remain the source of truth.
- Page list: `corpus/pages.txt` (23 pages). Build with `python corpus/build_corpus.py`.

**Pipeline**
1. Read page list.
2. Fetch each URL (record retrieval time and status).
3. Extract the article body only; drop nav, sidebar, footer. Keep headings and code blocks (as Markdown).
4. Hash the cleaned text (sha256).
5. Validate: empty pages, duplicate hashes, wrong version, fetch failures. Report failures.

**Outputs**
- `manifest.jsonl`, one row per page: `url`, `title`, `version`, `retrieved_at`, `content_hash`, plus `status`.
- Cleaned page content, one Markdown file per page.
- Optional: raw HTML, so extraction can be redone without refetching.

**Why `content_hash`**
- Skip unchanged pages on reindex; re-chunk and re-embed only changed ones (no duplicate accumulation).
- Detect duplicate pages.
- Show whether the docs changed between eval runs.
- Show whether the snapshot is stale.

## Step 2: Chunking

- Section-aware: split on H2/H3 headings (H4+ stay inside their section). Implemented in `chunking/chunk_corpus.py`; output `data/chunks.jsonl`.
- Keep code blocks with the explanation around them; never split inside a code fence.
- Chunk size (decided, tune later): max ~500 tokens counted with the embedding model's own tokenizer (`nomic-ai/nomic-embed-text-v1.5`, for Ollama `nomic-embed-text`, 2048-token context), overlap up to 60 tokens of the last prose block, sections under 40 tokens merged into the previous one. Oversized tables are split by row with the header repeated; oversized lists at top-level items.
- Result: 23 pages -> 162 chunks, median 222 tokens, max 915 (one oversized block, within the 2048 limit). The earlier `tiktoken` count gave 144 chunks, so it undercounted these code-heavy docs.
- Chunk IDs: sha1 of source_path + breadcrumb + occurrence + piece index. Cleaned pages are stored at `data/pages/<source_path>`; the manifest has no slug.
- Prepend the breadcrumb (`Page > H2 > H3`) to the chunk text.

**Metadata per chunk**
- `chunk_id` (deterministic, e.g. hash of URL + heading path + index)
- `source_url`, `title`, `heading_path`, `version`
- Optional: `section_anchor`, `content_type` (prose / code / API reference), `token_count`

**Relevance labels for evals**
- Label relevant sections as `source_url#heading`, not raw chunk IDs, so labels survive re-chunking (needed for the chunking experiment).
- Map labels to chunk IDs at eval time.
- Unanswerable and ambiguous questions have no relevant sections: score them on abstention or clarification, not recall/MRR.
- Multi-section questions: check that all needed sections are retrieved.

## Embedding and index

- Embedder: Ollama `nomic-embed-text` (768 dims) called through `litellm` (`ollama/nomic-embed-text`), documents prefixed `search_document: `, queries must use `search_query: `.
- Store: local Chroma at `data/chroma`, collection `tanstack_query_v5`, cosine distance. Config is saved in the collection metadata.
- Build: `python indexing/build_index.py`. Upserts by `chunk_id`, skips chunks whose text hash is unchanged, deletes chunks that disappeared. Result: 162 chunks embedded in ~28s; rerun embeds 0.
- If the embedder changes, delete `data/chroma` and re-embed everything.

## Retrieval (`rag/retrievers.py`)

- Three retrievers over the same 162 chunks, same output shape: `vector` (Chroma, cosine), `bm25` (`rank_bm25`, own tokenizer), `hybrid` (RRF over the top-20 of each, k=60). Switch with `retrieve(question, method, k)` or `python -m rag.answer --method`. Each is a class (`VectorRetriever`, `BM25Retriever`, `HybridRetriever`, `RerankedRetriever`) built once in `RetrievalRegistry`.
- BM25 tokenizer lowercases and also adds the parts of camelCase identifiers (`invalidateQueries` -> `invalidatequeries`, `invalidate`, `queries`), so exact API names and plain-English queries both match.
- BM25 returns nothing when no query term matches (no evidence from that retriever).
- Scores are not comparable across retrievers; compare by rank.
- All retrievers return `Hit` (a Pydantic model in `rag/models.py`, with `chunk_id, text, meta, score, rank, retriever`). RRF returns full hits (not just IDs) because generation needs `text` and `meta`.

**Reranking** (both rerank the top 20 candidates and keep 5)
- `vector+rerank`, `hybrid+rerank`: cross-encoder `Xenova/ms-marco-MiniLM-L-6-v2` via `fastembed` (ONNX, CPU, no PyTorch). Reads at most 512 tokens, so longer chunks are truncated.
- `hybrid+llmrerank`: Gemini (`gemini/gemini-3.1-flash-lite`) returns an ordering as a Pydantic `RankOrder`; invalid or missing IDs are repaired by keeping valid unique IDs and appending the rest in original order. A failure raises `AppError("rerank")` instead of silently falling back.

## Generation (`rag/answer.py`, `rag/llm.py`)

- Top-5 from the chosen method -> prompt with only that evidence (fenced, labeled by chunk ID) -> Gemini `gemini/gemini-3.1-flash-lite` via `litellm`, temperature 0. Switched from local Ollama `qwen2.5:7b` (about 50s per answer, guessed on ambiguous questions).
- `rag/llm.py` is the single place for model calls (completions and embeddings, both via `litellm`): shared rate limit (6 calls/min, env `LLM_CALLS_PER_MINUTE`, same guard as week5) and 3 retries.
- Method `none` skips retrieval: the no-retrieval baseline for the contamination risk above.
- Citations are chunk IDs; app code resolves them to `url#anchor`, flags unknown IDs and missing citations. Failures are returned as `error.kind` (`index`, `embedding`, `rerank`, `generation`, `no_evidence`).

## Evaluation

- `eval/build_eval_set.py` writes `eval/eval_set.jsonl`: 30 cases (8 direct, 6 exact_api, 6 multi_section, 5 ambiguous, 5 out_of_corpus); split 20 dev / 10 held-out. Drafted with AI, then reviewed by the user. `eval/validate_eval_set.py` checks every labeled section exists and contains its evidence phrases.
- Relevance = section label (`source_path#section_anchor`). Each chunk has exactly one anchor (the section it was cut from), not whichever heading appears in its text.
- Retrieval metrics (`rag/metrics.py`), answerable questions only, k=5: recall@k (fraction of labeled sections found, per question, then averaged), precision@k, MRR, binary nDCG. Precision is capped at 0.2 for questions with a single relevant chunk, so compare methods by differences.
- Ambiguous and out-of-corpus questions are scored on clarify / abstain behaviour, not retrieval.
- Answer metrics (`rag/judge.py`, Gemini judge, one call per answer): correct (all expected facts stated, nothing from `must_not_claim`, or the right clarify/abstain behaviour), facts covered x/N, faithful (every claim supported by the retrieved chunks), citation flags, latency. The judge is the same model family as the generator, so verdicts need a manual spot-check.
- Known label friction (left as is): d03 (`caching.md#basic-example` also states the 5 minute default), d06 (code-only labeled chunk; sibling cancellation sections arguably valid), d07 (label stricter than the content).

## App (`app.py`, Gradio)

- Retrieval test: pick a question group (all / dev / heldout / one category) and any combination of methods; get mean metrics per method. Answer test: pick a group and one method; each question is answered and judged, rows stream in. Both tables have a copy button and write a CSV to `data/results/`.
- Run with the repo venv's Python (`uv pip install -r requirements.txt` into it first).

## Results

Numbers from the saved CSVs. 30 AI-drafted, user-reviewed cases; small sample, one run each.

**Retrieval** (20 answerable questions, k=5; run on the full answerable set, so the held-out questions are no longer untouched)

| method | recall | precision | MRR | nDCG | avg s |
|---|---|---|---|---|---|
| vector | 0.550 | 0.180 | 0.527 | 0.430 | 2.31 |
| bm25 | 0.775 | 0.230 | 0.717 | 0.597 | 0.0 |
| hybrid | 0.825 | 0.250 | 0.644 | 0.564 | 2.13 |
| vector+rerank | 0.700 | 0.220 | 0.646 | 0.562 | 4.67 |
| hybrid+rerank | 0.900 | 0.290 | 0.793 | 0.718 | 3.91 |
| hybrid+llmrerank | 0.925 | 0.320 | 0.875 | 0.777 | 10.82 |

- Reranking helped: hybrid to hybrid+rerank raised MRR 0.644 to 0.793 and nDCG 0.564 to 0.718 for about 1.8s more. The LLM reranker added a little more (MRR 0.875) at about 3x the cross-encoder's latency.
- BM25 beat vector on exact API questions (MRR 0.88 vs 0.33); vector was better on multi-section (0.81 vs 0.67).
- Each question is 0.05 of recall; per-category numbers (6-8 questions) are noisy. Precision is capped at 0.2 for single-relevant-chunk questions, so compare by differences.

**Answers** (30 questions, one run with the best retrieval method; the method is not recorded in the CSV, judged by Gemini 3.1 flash-lite, the same family as the generator): 25/30 correct (83%), all faithful.

| category | correct |
|---|---|
| direct | 6/8 |
| exact_api | 6/6 |
| multi_section | 5/6 |
| ambiguous | 2/5 |
| out_of_corpus | 5/5 |

**Failure cases**
- Retrieval low but answer correct (label gap): d03, also d06 and d07.
- Retrieval hit but answer incomplete (generation): d01, d05, m06 stated 1 of 2 expected facts.
- Ambiguous answered instead of clarified: x03, x05. x01 did ask, so the judge was probably wrong.
- All 5 out-of-corpus questions abstained; the "no citations" flag there is expected.

**Limits:** TanStack Query is probably in the model's training data, so a correct answer does not prove retrieval helped; the `none` baseline exists but was not run over the full set. The judge is the same model family as the generator. No repeat runs.
