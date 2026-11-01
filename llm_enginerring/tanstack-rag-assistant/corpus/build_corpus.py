"""Build the corpus (see rag/corpus.py).

Usage: python corpus/build_corpus.py [--ref main|<sha>] [--pages corpus/pages.txt]
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from rag.corpus import CorpusBuilder  # noqa: E402

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", default="main")
    ap.add_argument("--pages", default=None)
    args = ap.parse_args()
    failures = CorpusBuilder().build(args.ref, args.pages)
    if failures:
        print(f"{len(failures)} problem(s):")
        for f in failures:
            print(f"  - {f['page']}: {f['problem']}")
        sys.exit(1)
    print("no problems found")
    