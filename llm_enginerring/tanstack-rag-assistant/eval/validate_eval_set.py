"""Check eval/eval_set.jsonl against the corpus.

For every labeled section: it must exist in data/chunks.jsonl, and each
evidence phrase must appear in at least one labeled section's text.
Also prints counts per split/category. Exit 1 on any problem.
"""

import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from rag.data import load_eval_set, section_text  # noqa: E402

CATEGORIES = {"direct": 8, "exact_api": 6, "multi_section": 6, "ambiguous": 5, "out_of_corpus": 5}


def main():
    text_by_section = section_text()
    rows = load_eval_set()
    problems = []
    for r in rows:
        secs = r.relevant_sections
        if r.answerable and not secs:
            problems.append(f"{r.id}: answerable but no relevant_sections")
        if not r.answerable and secs:
            problems.append(f"{r.id}: not answerable but has relevant_sections")
        for s in secs:
            if s not in text_by_section:
                problems.append(f"{r.id}: unknown section {s}")
        joined = "\n".join(text_by_section.get(s, "") for s in secs).lower()
        for p in r.evidence_phrases:
            if p.lower() not in joined:
                problems.append(f"{r.id}: phrase {p!r} not in labeled sections")

    ids = [r.id for r in rows]
    if len(ids) != len(set(ids)):
        problems.append("duplicate ids")
    cats = Counter(r.category for r in rows)
    for c, n in CATEGORIES.items():
        if cats[c] != n:
            problems.append(f"category {c}: {cats[c]} != {n}")

    print("split:", dict(Counter(r.split for r in rows)))
    print("category:", dict(cats))
    print("reviewed:", sum(r.reviewed for r in rows), "/", len(rows))
    for p in problems:
        print("PROBLEM:", p)
    sys.exit(1 if problems else 0)

if __name__ == "__main__":
    print("Validating eval set against the corpus...")
    main()