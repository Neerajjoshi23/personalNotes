"""Retrieval metrics against section-level labels.

A question's labels are sections ("<source_path>#<section_anchor>"). A retrieved
chunk is relevant if its section is labeled. Metrics at cutoff k:

  recall@k    labeled sections with at least one chunk in the top k / labeled sections
  precision@k relevant chunks in the top k / k
  mrr         1 / rank of the first relevant chunk (0 if none in the top k)
  ndcg@k      binary-gain nDCG over chunks; ideal = min(k, relevant chunks in the corpus)

Questions with no labels (ambiguous / out-of-corpus) have no retrieval metrics.
"""

import math

from .data import chunks_per_section
from .models import Hit

METRICS = ["recall", "precision", "mrr", "ndcg"]


def score_retrieval(hits: list[Hit], sections: list[str], k: int) -> dict | None:
    """Return the four metrics, or None when the question has no labeled sections."""
    if not sections:
        return None
    labeled = set(sections)
    hits = hits[:k]
    rel_chunks = [h.section in labeled for h in hits]
    covered = {h.section for h, r in zip(hits, rel_chunks) if r}
    dcg = sum(1 / math.log2(i + 1) for i, r in enumerate(rel_chunks, 1) if r)
    per_section = chunks_per_section()
    ideal = min(k, sum(per_section[s] for s in sections))
    idcg = sum(1 / math.log2(i + 1) for i in range(1, ideal + 1))
    first = next((i for i, r in enumerate(rel_chunks, 1) if r), None)
    return {
        "recall": len(covered) / len(labeled),
        "precision": sum(rel_chunks) / k,
        "mrr": 1 / first if first else 0.0,
        "ndcg": dcg / idcg if idcg else 0.0,
    }


def mean_metrics(per_question: list[dict | None]) -> dict | None:
    """Average a list of score_retrieval dicts (None entries skipped)."""
    scored = [m for m in per_question if m]
    if not scored:
        return None
    return {name: sum(m[name] for m in scored) / len(scored) for name in METRICS}
