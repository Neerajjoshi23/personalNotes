# Week 5 Project — Technical-documentation troubleshooting assistant

**Personal practice project after the Week 5 notebooks and course exercise**, not an additional official course assignment. It implements Projects #1 and #2 in `ai-learning-path.md` together: one small RAG app plus its evaluation harness.

---

## 1. What we are building

Answer questions about one library from a bounded documentation corpus, with inspectable supporting passages and citations. Start with **TanStack Query's React documentation for one major version**.

Example: "My search results show old data when the filter changes. What should I check?" Explain documented mechanisms and ask for missing context. Do not claim to diagnose code or runtime behavior you have not inspected.

**Scope and tools**

- Python + Gradio; reuse the Week 5 retrieval/model-call patterns and the existing environment. No React, LangGraph, agents, multi-user hosting or fine-tuning.
- One embedding model and one local vector store. Record their names and configuration.
- Ollama can provide local generation; embeddings need an embedding-capable model. Use a hosted model only through an authorized API.
- Start with about **15–25 selected documentation pages**. Respect source terms/licensing and keep attribution.
- Cover query keys, query functions, caching/staleness, invalidation, dependent queries, pagination, cancellation, mutations and optimistic updates. Record the docs major version and snapshot date.

---

## 2. Build steps

| Step | What to implement | What to verify |
|------|-------------------|----------------|
| 1. Corpus | Manifest with page URL/title, version, retrieval date and content hash. Extract article content, keep headings and code blocks, remove menus. | No empty/duplicate pages, broken code or unexpected versions. Report extraction failures. |
| 2. Chunking | Section-aware chunks. Store chunk ID, source URL, title, heading and version. Keep code with its explanation. | Sample chunks are readable and traceable. Record size/overlap and respect embedding limits. |
| 3. Retrieval baselines | Keyword search (BM25) and vector retrieval over the same chunks. Return a bounded top-k with IDs, passages and scores. | Check exact API names, paraphrases and multi-section questions. Scores from different retrievers are not comparable. |
| 4. Grounded generation | Give the model only retrieved evidence plus the question. Ask for an answer, citations and a clarification request when evidence is insufficient. | No unsupported advice presented as documented fact. Treat retrieved text as untrusted data. |
| 5. Citation handling | Model cites supplied chunk IDs; app code resolves IDs to links. Reject unknown IDs and flag missing citations. | A valid ID does not prove the claim is supported, so inspect support manually. |
| 6. Inspectable UI | Show question, answer, citations, retrieved passages, retrieval method/top-k and latency. Single-turn first. | Distinguish "no evidence" from model/network/index failures. Show errors and a retry. |
| 7. Evaluation | Run a fixed question set through retrieval and generation, saving inputs, retrieved IDs, answers, judgments and configuration. | Compare configurations reproducibly. Separate retrieval failures from generation failures. |

---

## 3. Evaluation set (at least 30 manually reviewed questions)

**20 development + 10 held-out** questions, each with answerable and unanswerable/ambiguous cases. Do not tune against the held-out set; if you do, make a fresh one.

| Question type | Total | Expected behavior |
|---------------|-------|-------------------|
| Direct documentation lookup | 8 | Correct explanation with the right source section. |
| Exact API name or code-oriented | 6 | Find the documented API and constraints. No made-up signatures. |
| Needs evidence from multiple sections | 6 | Retrieve all needed sections, not one superficial paragraph. |
| Ambiguous / underspecified | 5 | Ask for missing version/config/code instead of asserting one cause. |
| Outside the corpus/version | 5 | Say "not in the documentation". Do not fabricate. |

For each case record: question, category, answerability, expected facts or clarification, acceptable source sections and unacceptable claims. Draft with AI if you like, but review independently. The generated answer must not be its own ground truth.

---

## 4. Evaluation metrics

**Retrieval**
- MRR, nDCG, recall@K and **precision@K** (the course never coded precision@K).
- Use labeled source sections, not a keyword-substring proxy.
- For multi-section cases, check that all needed sections were retrieved.

**Answer quality and grounding**
- Rubric: correct / partial / incorrect.
- **Faithfulness:** the judge compares the answer to the retrieved chunks, not only to a reference answer, and lists unsupported claims.
- Check that cited passages actually support each material claim.

**Abstention / clarification**
- Correct handling of unanswerable and ambiguous questions.
- Track unnecessary refusals on answerable questions.
- Low similarity alone is not a universal abstention rule.

**Latency and cost**
- Retrieval, generation and end-to-end timings; median/tail when there are enough samples.
- Extra LLM calls per question for each technique (rewrite, rerank) against the quality gain.
- Mark unavailable usage data as unavailable. Local inference is not free.

---

## 5. Experiments

1. Keyword and vector baselines with the same corpus, chunking, prompt/model and question set.
2. **Hybrid (required):** BM25 + vector merged with reciprocal rank fusion, not raw scores.
3. **Reranking (required):** cross-encoder over the top ~20. Report before/after MRR/nDCG against added latency.
4. **Abstention check:** the 5 outside-corpus cases must answer "not in the documentation".

**Lessons carried over from Week 5 Day 4–5**
- Iterate on a small hard subset first, then confirm once on the full set. Use rate limits and a small judge model.
- Same embedder and index when comparing. Re-embed if the embedder changes.

---

## 6. Expected outcome (done when)

- The app runs from documented setup steps.
- The same corpus can be reindexed without duplicate accumulation.
- Every answer's evidence is inspectable.
- The 30 reviewed cases run and produce saved results.
- Keyword/vector baselines, hybrid and reranking are recorded.
- You can explain representative retrieval, generation and abstention failures.
- Real results and limitations are recorded in `DECISIONS.md`, with no invented accuracy claims.

**Deliverables:** ingestion/indexing, retrieval, generation, Gradio app, corpus manifest, evaluation cases and an evaluation runner, in a personal project folder separate from course notebooks. Keep credentials out of code and exported results. Index only public/approved material.
