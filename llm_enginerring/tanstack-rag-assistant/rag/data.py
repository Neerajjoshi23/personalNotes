"""Loading the chunks and the eval set; the one place that knows where they live."""

import json
from collections import Counter
from functools import lru_cache

from .config import ROOT, get_settings
from .models import AppError, Chunk, EvalCase

EVAL_SET_PATH = ROOT / "eval" / "eval_set.jsonl"


@lru_cache(maxsize=1)
def load_chunks() -> list[Chunk]:
    path = get_settings().data / "chunks.jsonl"
    if not path.exists():
        raise AppError("index", f"{path} is missing; run the chunker first.")
    return [Chunk.model_validate_json(line) for line in path.read_text("utf-8").splitlines()]


def save_chunks(chunks: list[Chunk]) -> None:
    path = get_settings().data / "chunks.jsonl"
    with path.open("w", encoding="utf-8") as f:
        for c in chunks:
            f.write(c.model_dump_json() + "\n")
    load_chunks.cache_clear()


def section_text() -> dict[str, str]:
    """Full text of each labeled section ('<source_path>#<anchor>')."""
    out: dict[str, str] = {}
    for c in load_chunks():
        out[c.section] = out.get(c.section, "") + "\n" + c.text
    return out


def chunks_per_section() -> Counter:
    return Counter(c.section for c in load_chunks())


def load_eval_set() -> list[EvalCase]:
    return [EvalCase.model_validate_json(l) for l in EVAL_SET_PATH.read_text("utf-8").splitlines()]
