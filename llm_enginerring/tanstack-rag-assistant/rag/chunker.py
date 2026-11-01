"""Section-aware chunking of the cleaned corpus.

Reads  data/manifest.jsonl + data/pages/<source_path>
Writes data/chunks.jsonl (one chunk per line)

Strategy (the choices to be able to explain):
  1. Split each page on H2/H3 headings, so a chunk is one documented topic.
     H4+ headings stay inside their parent section.
  2. Never treat a '#' inside a code fence as a heading, and never cut a code
     block: code is kept together with the prose around it.
  3. A section over max_tokens is split further. Blocks (a paragraph or a whole
     code fence) are the smallest unit, packed greedily up to max_tokens, with
     the last prose block repeated as overlap (overlap_tokens) so a split does
     not lose its lead-in.
  4. A section under min_tokens (e.g. a 'Further reading' stub) is merged into
     the previous section; its heading line stays in the text.
  5. The breadcrumb 'Page > H2 > H3' is prepended to every chunk's text so the
     embedding and keyword index both see the context.
"""

import hashlib
import json
import re

from .config import Settings, get_settings
from .data import save_chunks
from .models import Chunk

FENCE = re.compile(r"^\s*(```|~~~)")
HEADING = re.compile(r"^(#{1,6})\s+(.*?)\s*$")


def anchor(heading: str) -> str:
    """GitHub-style anchor, used for section-level relevance labels."""
    s = re.sub(r"[^\w\s-]", "", heading.lower())
    return re.sub(r"\s+", "-", s.strip())


def is_code(block: str) -> bool:
    return bool(FENCE.match(block))


def split_sections(text: str) -> list[tuple[list[str], list[str]]]:
    """Return [(heading_path, body_lines)] split on H2/H3 outside code fences."""
    sections = []
    path: list[str] = []   # current heading path, e.g. ['Query Keys', 'Simple Keys']
    body: list[str] = []
    in_fence = False

    def flush():
        if any(line.strip() for line in body):
            sections.append((list(path), list(body)))
        body.clear()

    for line in text.splitlines():
        if FENCE.match(line):
            in_fence = not in_fence
        m = None if in_fence else HEADING.match(line)
        if m and len(m.group(1)) <= 3:
            level, title = len(m.group(1)), m.group(2)
            flush()
            if level == 1:
                path = [title]
            elif level == 2:
                path = path[:1] + [title]
            else:
                path = path[:2] + [title]
        else:
            body.append(line)
    flush()
    return sections


def to_blocks(lines: list[str]) -> list[str]:
    """Group lines into atomic blocks: a whole code fence, or a paragraph."""
    blocks, cur, in_fence = [], [], False
    for line in lines:
        if FENCE.match(line):
            if not in_fence and cur:
                blocks.append(cur)  # prose before the fence ends here
                cur = []
            in_fence = not in_fence
            cur.append(line)
            if not in_fence:        # fence just closed
                blocks.append(cur)
                cur = []
        elif in_fence:
            cur.append(line)
        elif not line.strip():
            if cur:
                blocks.append(cur)
                cur = []
        else:
            cur.append(line)
    if cur:
        blocks.append(cur)
    return ["\n".join(b) for b in blocks]


class Chunker:
    def __init__(self, settings: Settings | None = None):
        from transformers import AutoTokenizer

        self.s = settings or get_settings()
        # Token counts must come from the tokenizer of the embedding model we will use,
        # otherwise a chunk that looks 500 tokens long may be longer for the model and
        # get silently truncated.
        self.tokenizer = AutoTokenizer.from_pretrained(self.s.chunk_tokenizer)

    def ntok(self, text: str) -> int:
        return len(self.tokenizer.encode(text, add_special_tokens=False))

    def split_oversized(self, block: str) -> list[str]:
        """Split a prose block bigger than max_tokens.

        Reference pages hold long option lists as a table or as one block of list
        items with no blank lines. Tables are split by row with the header repeated
        in each piece, so every piece still says what its columns mean. Lists are
        split at top-level items. Code blocks are never split.
        """
        max_tokens = self.s.max_tokens
        if is_code(block) or self.ntok(block) <= max_tokens:
            return [block]
        lines = block.splitlines()
        if lines[0].startswith("|") and len(lines) > 2:
            header, rows = "\n".join(lines[:2]), lines[2:]
            parts, cur, cur_tok = [], [], self.ntok(header)
            for row in rows:
                t = self.ntok(row)
                if cur and cur_tok + t > max_tokens:
                    parts.append(header + "\n" + "\n".join(cur))
                    cur, cur_tok = [], self.ntok(header)
                cur.append(row)
                cur_tok += t
            parts.append(header + "\n" + "\n".join(cur))
            return parts
        parts, cur = [], []
        for line in lines:
            if re.match(r"^[-*] ", line) and cur:  # new top-level item
                parts.append("\n".join(cur))
                cur = []
            cur.append(line)
        parts.append("\n".join(cur))
        return parts

    def pack(self, blocks: list[str]) -> list[str]:
        """Greedily pack blocks into pieces of <= max_tokens, with prose overlap."""
        blocks = [p for b in blocks for p in self.split_oversized(b)]
        pieces, cur, cur_tok = [], [], 0
        for b in blocks:
            t = self.ntok(b)
            if cur and cur_tok + t > self.s.max_tokens:
                pieces.append(cur)
                last = cur[-1]
                # Overlap only prose: repeating a code block would duplicate it.
                if not is_code(last) and self.ntok(last) <= self.s.overlap_tokens:
                    cur, cur_tok = [last], self.ntok(last)
                else:
                    cur, cur_tok = [], 0
            cur.append(b)
            cur_tok += t
        if cur:
            pieces.append(cur)
        return ["\n\n".join(p) for p in pieces]

    def merge_small(self, sections):
        """Merge sections under min_tokens into the previous one (heading kept)."""
        merged = []
        for path, lines in sections:
            if merged and self.ntok("\n".join(lines)) < self.s.min_tokens and len(path) > 1:
                prev_path, prev_lines = merged[-1]
                hashes = "#" * len(path)
                merged[-1] = (prev_path, prev_lines + ["", f"{hashes} {path[-1]}"] + lines)
            else:
                merged.append((path, lines))
        return merged

    def chunk_page(self, row: dict, text: str) -> list[Chunk]:
        chunks = []
        seen: dict[str, int] = {}  # how many sections already used this breadcrumb on this page
        for path, lines in self.merge_small(split_sections(text)):
            breadcrumb = " > ".join(path)
            occurrence = seen.get(breadcrumb, 0)
            seen[breadcrumb] = occurrence + 1
            for i, body in enumerate(self.pack(to_blocks(lines))):
                chunk_text = f"{breadcrumb}\n\n{body}"
                # Deterministic ID. Repeated headings on one page are told apart by
                # their occurrence number; split pieces by their index i.
                cid = hashlib.sha1(
                    f"{row['source_path']}|{breadcrumb}|{occurrence}|{i}".encode()
                ).hexdigest()[:12]
                chunks.append(
                    Chunk(
                        chunk_id=cid,
                        source_url=row["url"],
                        source_path=row["source_path"],
                        title=row["title"],
                        heading_path=path,
                        section_anchor=anchor(path[-1]),
                        version=row["version"],
                        has_code="```" in body or "~~~" in body,
                        token_count=self.ntok(chunk_text),
                        text=chunk_text,
                    )
                )
        return chunks

    def run(self) -> list[Chunk]:
        data = self.s.data
        rows = [json.loads(l) for l in (data / "manifest.jsonl").read_text("utf-8").splitlines()]
        print(f"Loaded {len(rows)} rows from the manifest.")
        all_chunks: list[Chunk] = []
        for row in rows:
            text = (data / "pages" / row["source_path"]).read_text("utf-8")
            all_chunks.extend(self.chunk_page(row, text))

        ids = [c.chunk_id for c in all_chunks]
        assert len(ids) == len(set(ids)), "duplicate chunk IDs"
        save_chunks(all_chunks)
        print(f"Saved {len(all_chunks)} chunks. and example one of the chunks: {all_chunks[0] if all_chunks else 'none'}")
        toks = sorted(c.token_count for c in all_chunks)
        over = [c for c in all_chunks if c.token_count > self.s.max_tokens * 1.5]
        print(f"{len(rows)} pages -> {len(all_chunks)} chunks")
        print(f"tokens: min {toks[0]}, median {toks[len(toks)//2]}, max {toks[-1]}")
        print(f"chunks containing code: {sum(c.has_code for c in all_chunks)}")
        for c in over:
            print(f"  large chunk ({c.token_count} tok): {c.source_path} | {' > '.join(c.heading_path)}")
        return all_chunks
