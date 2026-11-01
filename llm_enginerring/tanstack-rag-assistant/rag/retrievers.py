"""Retrievers over the same chunks: vector, BM25, hybrid (RRF) and rerankers.

Every retriever returns the same shape, a ranked list of Hit objects.
Scores from different retrievers are NOT comparable (cosine similarity, BM25
and RRF are on different scales), so compare retrievers by rank only.

Usage: python -m rag.retrievers "your question"
"""

import re
import sys
from abc import ABC, abstractmethod
from functools import lru_cache

from rank_bm25 import BM25Okapi

from .config import Settings, get_settings
from .data import load_chunks
from .index import VectorIndex
from .llm import get_llm
from .models import AppError, Hit, RankOrder

#It extracts the full lowercase identifier, and if it is written in camelCase, splits it into its individual component words so natural language searches can find it.
# _CAMEL matches camelCase or PascalCase components.
# _WORD matches full words including underscores and numbers.
_CAMEL = re.compile(r"[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+")
_WORD = re.compile(r"[A-Za-z0-9_]+")


def tokenize(text: str) -> list[str]:
    """Lowercase word tokens; camelCase identifiers also add their parts.

    'invalidateQueries' -> 'invalidatequeries', 'invalidate', 'queries'
    The whole identifier keeps exact-name matches strong; the parts let a
    plain-English query ('invalidate queries') still hit it.
    """
    tokens = []
    for word in _WORD.findall(text):
        tokens.append(word.lower())
        parts = _CAMEL.findall(word)
        if len(parts) > 1:
            tokens.extend(p.lower() for p in parts)
    return tokens


class Retriever(ABC):
    name: str

    @abstractmethod
    def search(self, question: str, k: int) -> list[Hit]: ...


class VectorRetriever(Retriever):
    name = "vector"

    def __init__(self, index: VectorIndex | None = None):
        self.index = index or VectorIndex()

    def search(self, question, k):
        return self.index.search(question, k)


class BM25Retriever(Retriever):
    name = "bm25"

    def __init__(self):
        self._bm25 = None
        self._chunks = None

    def _load(self):
        if self._bm25 is None:
            self._chunks = load_chunks()
            self._bm25 = BM25Okapi([tokenize(c.text) for c in self._chunks])
        return self._bm25, self._chunks

    def search(self, question, k):
        bm25, chunks = self._load()
        scores = bm25.get_scores(tokenize(question))
        order = sorted(range(len(chunks)), key=lambda i: scores[i], reverse=True)
        order = [i for i in order if scores[i] > 0][:k]
        return [
            Hit(chunk_id=chunks[i].chunk_id, text=chunks[i].text, meta=chunks[i].meta(),
                score=float(scores[i]), rank=r, retriever="bm25")
            for r, i in enumerate(order, 1)
        ]


class HybridRetriever(Retriever):
    """Reciprocal Rank Fusion: score(chunk) = sum over lists of 1 / (rrf_k + rank)."""

    name = "hybrid"

    def __init__(self, retrievers: list[Retriever], settings: Settings):
        self.retrievers = retrievers
        self.rrf_k = settings.rrf_k
        self.candidates = settings.candidates

    def search(self, question, k):
        scores: dict[str, float] = {}
        by_id: dict[str, Hit] = {}
        for r in self.retrievers:
            for h in r.search(question, self.candidates):
                scores[h.chunk_id] = scores.get(h.chunk_id, 0.0) + 1.0 / (self.rrf_k + h.rank)
                by_id.setdefault(h.chunk_id, h)
        top : list[tuple[str,float]] = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[:k]
        return [
            by_id[cid].model_copy(update={"score": s, "rank": r, "retriever": "hybrid"})
            for r, (cid, s) in enumerate(top, 1)
        ]


class Reranker(ABC):
    suffix: str

    @abstractmethod
    def rerank(self, question: str, hits: list[Hit], k: int) -> list[Hit]: ...


class CrossEncoderReranker(Reranker):
    """Re-score (question, chunk) pairs jointly with a cross-encoder and keep the top k."""

    suffix = "rerank"

    def __init__(self, model_name: str):
        self.model_name = model_name
        self._model = None

    def rerank(self, question, hits, k):
        if not hits:
            return []
        if self._model is None:
            from fastembed.rerank.cross_encoder import TextCrossEncoder
            self._model = TextCrossEncoder(model_name=self.model_name)
        scores = list(self._model.rerank(question, [h.text for h in hits]))
        order = sorted(range(len(hits)), key=lambda i: scores[i], reverse=True)[:k]
        return [
            hits[i].model_copy(update={"score": float(scores[i]), "rank": r,
                                       "retriever": f"{hits[i].retriever}+{self.suffix}"})
            for r, i in enumerate(order, 1)
        ]


class LLMReranker(Reranker):
    """Ask an LLM to order the candidates; invalid, repeated or missing ids are repaired."""

    suffix = "llmrerank"

    def __init__(self, settings: Settings):
        self.system = settings.prompt(settings.rerank_prompt)

    def rerank(self, question, hits, k):
        if not hits:
            return []
        chunks = "\n\n".join(f"# CHUNK {i}\n<<<\n{h.text}\n>>>" for i, h in enumerate(hits, 1))
        messages = [
            {"role": "system", "content": self.system},
            {"role": "user", "content": f"Question: {question}\n\n{chunks}"},
        ]
        try:
            reply = get_llm().complete(messages, response_format=RankOrder)
            order = RankOrder.model_validate_json(reply).order
        except Exception as e:
            raise AppError("rerank", f"LLM rerank failed: {e}")

        seen: list[int] = []
        for i in order:
            if 1 <= i <= len(hits) and i not in seen:
                seen.append(i)
        seen += [i for i in range(1, len(hits) + 1) if i not in seen]   # model dropped some: keep original order
        return [
            hits[i - 1].model_copy(update={"score": float(len(hits) - r), "rank": r,
                                           "retriever": f"{hits[i - 1].retriever}+{self.suffix}"})
            for r, i in enumerate(seen[:k], 1)
        ]


class RerankedRetriever(Retriever):
    """Fetch `candidates` from a base retriever, rerank, keep k."""

    def __init__(self, base: Retriever, reranker: Reranker, candidates: int):
        self.base, self.reranker, self.candidates = base, reranker, candidates
        self.name = f"{base.name}+{reranker.suffix}"

    def search(self, question, k):
        return self.reranker.rerank(question, self.base.search(question, self.candidates), k)


class RetrievalRegistry:
    """The named methods the app and the eval can pick from."""

    def __init__(self, settings: Settings):
        vector, bm25 = VectorRetriever(), BM25Retriever()
        hybrid = HybridRetriever([vector, bm25], settings)
        cross = CrossEncoderReranker(settings.rerank_model)
        llm_rr = LLMReranker(settings)
        n = settings.candidates
        retrievers = [
            vector, bm25, hybrid,
            RerankedRetriever(vector, cross, n),
            RerankedRetriever(hybrid, cross, n),
            RerankedRetriever(hybrid, llm_rr, n),
        ]
        self.methods = {r.name: r for r in retrievers}
        self.top_k = settings.top_k

    def retrieve(self, question: str, method: str = "vector", k: int | None = None) -> list[Hit]:
        if method not in self.methods:
            raise ValueError(f"unknown retrieval method {method!r}; choose from {list(self.methods)}")
        return self.methods[method].search(question, k or self.top_k)


@lru_cache(maxsize=1)
def get_registry() -> RetrievalRegistry:
    return RetrievalRegistry(get_settings())


def method_names() -> list[str]:
    return list(get_registry().methods)


def retrieve(question: str, method: str = "vector", k: int | None = None) -> list[Hit]:
    print(f"Retrieving with method={method}, k={k or get_registry().top_k}")
    return get_registry().retrieve(question, method, k)


if __name__ == "__main__":
    q = " ".join(sys.argv[1:]) or "what does gcTime do?"
    for m in method_names():
        print(f"--- {m}")
        for h in retrieve(q, m):
            print(f"  {h.rank}. {h.score:.3f}  [{h.chunk_id}]  {h.meta['heading_path']}")
