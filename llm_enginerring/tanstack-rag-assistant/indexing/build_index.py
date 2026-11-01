"""Embed chunks and load them into a local Chroma collection.

Reads  data/chunks.jsonl
Writes data/chroma/ (persistent Chroma store)

Re-running is safe: chunks are upserted by chunk_id, unchanged chunks are
skipped, and chunks that no longer exist are deleted, so nothing accumulates.

Usage: python indexing/build_index.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from rag.data import load_chunks  # noqa: E402
from rag.index import VectorIndex  # noqa: E402

if __name__ == "__main__":
    print(VectorIndex().sync(load_chunks()))
