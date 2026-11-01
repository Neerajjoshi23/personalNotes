"""Grounded answer generation with chunk-ID citations.

Flow: question -> retrieval (top-k) -> prompt with only that evidence -> LLM ->
check the citations in the answer against the retrieved chunks.
Method "none" skips retrieval: a baseline showing what the model already knows.

Usage: python -m rag.answer [--method hybrid+rerank] "your question"
"""

import re
import sys
import time

from .config import Settings, get_settings
from .llm import LLMError, get_llm
from .models import AnswerResult, AppError, Citation, ErrorInfo, Hit
from .retrievers import retrieve

CITATION = re.compile(r"\[([0-9a-f]{12})\]")


def build_messages(question: str, chunks: list[Hit], settings: Settings) -> list[dict]:
    # Evidence is fenced and labeled so the model can tell it apart from instructions.
    evidence = "\n\n".join(
        f"[{c.chunk_id}] (source: {c.meta['source_url']})\n<<<\n{c.text}\n>>>" for c in chunks
    )
    return [
        {"role": "system", "content": f"{settings.prompt(settings.answer_prompt)}\nEVIDENCE:\n{evidence}"},
        {"role": "user", "content": question},
    ]


def generate(messages: list[dict]) -> str:
    try:
        return get_llm().complete(messages)
    except LLMError as e:
        raise AppError("generation", str(e))


def check_citations(answer: str, chunks: list[Hit]) -> dict:
    """Resolve cited IDs to links; flag unknown IDs.

    A valid ID only shows the model cited something we supplied, not that the
    chunk actually supports the claim. That still needs manual or judged review.
    """
    by_id = {c.chunk_id: c for c in chunks}
    cited = list(dict.fromkeys(CITATION.findall(answer)))
    return {
        "citations": [
            Citation(chunk_id=i, url=f"{by_id[i].meta['source_url']}#{by_id[i].meta['section_anchor']}",
                     heading=by_id[i].meta["heading_path"])
            for i in cited if i in by_id
        ],
        "unknown_citations": [i for i in cited if i not in by_id],
        "missing_citations": not cited,
    }


def answer_question(question: str, method: str = "vector", k: int | None = None) -> AnswerResult:
    """Run the full pipeline. Always returns an AnswerResult; failures set `error`."""
    s = get_settings()
    k = k or s.top_k
    result = AnswerResult(
        question=question,
        config={"embed_model": s.embed_model, "gen_model": s.gen_model, "top_k": k, "retrieval": method},
    )
    t0 = time.time()
    try:
        if method == "none":
            t1 = time.time()
            result.answer = generate([
                {"role": "system", "content": s.prompt(s.no_retrieval_prompt)},
                {"role": "user", "content": question},
            ])
            result.generation_s = round(time.time() - t1, 3)
        else:
            chunks = retrieve(question, method, k)
            result.retrieved = chunks
            result.retrieval_s = round(time.time() - t0, 3)
            if not chunks:
                result.error = ErrorInfo(kind="no_evidence", message="No chunks retrieved.")
                return result
            t1 = time.time()
            result.answer = generate(build_messages(question, chunks, s))
            result.generation_s = round(time.time() - t1, 3)
            for key, value in check_citations(result.answer, chunks).items():
                setattr(result, key, value)
    except AppError as e:
        result.answer = None
        result.error = ErrorInfo(kind=e.kind, message=str(e))
    result.total_s = round(time.time() - t0, 3)
    return result


if __name__ == "__main__":
    args = sys.argv[1:]
    method = "vector"
    if args[:1] == ["--method"] and len(args) >= 2:
        method, args = args[1], args[2:]
    q = " ".join(args) or "How do I invalidate a query after a mutation?"
    r = answer_question(q, method)
    if r.error:
        print(f"ERROR [{r.error.kind}]: {r.error.message}")
        sys.exit(1)
    print(r.answer, "\n")
    print(f"retrieved ({method}):")
    for c in r.retrieved:
        print(f"  {c.rank}. {c.score:.3f}  [{c.chunk_id}]  {c.meta['heading_path']}")
    print("citations:", [c.chunk_id for c in r.citations])
    if r.unknown_citations:
        print("UNKNOWN citation IDs:", r.unknown_citations)
    if r.missing_citations and method != "none":
        print("WARNING: answer has no citations")
    print(f"retrieval {r.retrieval_s}s  generation {r.generation_s}s  total {r.total_s}s")
