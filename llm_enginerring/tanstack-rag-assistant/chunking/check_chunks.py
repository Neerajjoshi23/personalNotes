"""Quick sanity checks on data/chunks.jsonl."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from rag.data import load_chunks  # noqa: E402

cs = load_chunks()

print("smallest chunks:")
for c in sorted(cs, key=lambda c: c.token_count)[:4]:
    print(f"  {c.token_count:>4} tok  {c.source_path.split('/')[-1]}  {c.heading_path}")

bad = [c for c in cs if c.text.count("```") % 2]
print(f"chunks with an unbalanced code fence: {len(bad)}")
for c in bad:
    print("  ", c.chunk_id, c.heading_path)
sys.exit(1 if bad else 0)
