"""Chunk the corpus (see rag/chunker.py).

Usage: python chunking/chunk_corpus.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from rag.chunker import Chunker  # noqa: E402

if __name__ == "__main__":
    Chunker().run()
