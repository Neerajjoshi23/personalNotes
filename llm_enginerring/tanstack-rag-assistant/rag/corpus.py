"""Build the corpus: Markdown pages from a GitHub repo (set in project.json).

The website is usually JavaScript-rendered and redirects scrapers, so pages come
from the repo's Markdown. The ref is resolved to a commit SHA so a snapshot can
be reproduced exactly.

Outputs (under data/):
  raw/<source_path>   original file as fetched
  pages/<source_path> cleaned page (title heading + body)
  manifest.jsonl      one row per page (url, title, version, retrieved_at, content_hash, ...)
  corpus_meta.json    snapshot info (commit, library version, license)
  report.json         validation results
"""

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import requests

from .config import ROOT, Settings, get_settings

FRONTMATTER = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)
FENCE = re.compile(r"^\s*(```|~~~)")
MARKER_LINE = re.compile(r"^\[//\]: # .*$")
HTML_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
MD_SUFFIX = re.compile(r"\.md$")
TIMEOUT = 30


def parse_frontmatter(text: str) -> tuple[dict, str]:
    m = FRONTMATTER.match(text)
    if not m:
        return {}, text
    meta = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip().strip("'\"")
    return meta, text[m.end():]


def clean_body(body: str) -> str:
    """Drop doc-tooling markers and HTML comments outside code fences."""
    out, in_fence, prose = [], False, []

    def flush_prose():
        if prose:
            out.append(HTML_COMMENT.sub("", "\n".join(prose)))
            prose.clear()

    for line in body.splitlines():
        if FENCE.match(line):
            if not in_fence:
                flush_prose()
            in_fence = not in_fence
            out.append(line)
        elif in_fence:
            out.append(line)
        elif not MARKER_LINE.match(line):
            prose.append(line)
    flush_prose()
    text = "\n".join(out)
    text = re.sub(r"[ \t]+\n", "\n", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"


def count_fences(text: str) -> int:
    return sum(1 for line in text.splitlines() if FENCE.match(line))


class CorpusBuilder:
    def __init__(self, settings: Settings | None = None):
        self.s = settings or get_settings()
        self.src = self.s.source
        self.data = self.s.data

    # ---- fetching ----

    def _gh_headers(self) -> dict:
        token = os.environ.get("GITHUB_TOKEN")
        return {"Authorization": f"Bearer {token}"} if token else {}

    def resolve_sha(self, ref: str) -> str:
        r = requests.get(
            f"https://api.github.com/repos/{self.src.repo}/commits/{ref}",
            headers=self._gh_headers(), timeout=TIMEOUT,
        )
        r.raise_for_status()
        return r.json()["sha"]

    def fetch_raw(self, sha: str, path: str) -> tuple[str, int, str]:
        url = f"https://raw.githubusercontent.com/{self.src.repo}/{sha}/{path}"
        r = requests.get(url, timeout=TIMEOUT)
        return url, r.status_code, r.text if r.ok else ""

    def page_url(self, rel: str) -> str:
        return f"{self.src.site_base}/{MD_SUFFIX.sub('', rel)}"

    def read_page_list(self, path: str | Path) -> list[str]:
        pages = [
            l.strip() for l in Path(path).read_text(encoding="utf-8").splitlines()
            if l.strip() and not l.strip().startswith("#")
        ]
        dupes = {p for p in pages if pages.count(p) > 1}
        if dupes:
            raise SystemExit(f"Duplicate entries in page list: {sorted(dupes)}")
        return pages

    # ---- building ----

    def _previous_hashes(self) -> dict[str, str]:
        path = self.data / "manifest.jsonl"
        if not path.exists():
            return {}
        rows = [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines()]
        return {r["url"]: r["content_hash"] for r in rows}

    def _check_page(self, title: str, body: str, text: str) -> list[str]:
        problems = []
        if not title:
            problems.append("missing title")
        if len(body) < self.src.min_body_chars:
            problems.append(f"body too short ({len(body)} chars)")
        if count_fences(body) % 2:
            problems.append("unbalanced code fence")
        if "[//]:" in text or "<!--" in text:
            problems.append("leftover markup")
        return problems

    def build(self, ref: str = "main", pages_file: str | Path | None = None) -> list[dict]:
        """Fetch and clean the pages; returns the problems found (empty = clean)."""
        src, data = self.src, self.data
        pages = self.read_page_list(pages_file or ROOT / src.pages_file)
        sha = self.resolve_sha(ref)
        retrieved_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

        _, status, pkg = self.fetch_raw(sha, src.version_file)
        if status != 200:
            raise SystemExit(f"Could not read the library version from {src.version_file}")
        lib_version = json.loads(pkg)["version"]

        previous = self._previous_hashes()
        for d in ("raw", "pages"):
            (data / d).mkdir(parents=True, exist_ok=True)

        rows: list[dict] = []
        failures: list[dict] = []
        if lib_version.split(".")[0] != src.expected_major:
            failures.append({"page": "*", "problem": f"unexpected version {lib_version}"})

        for rel in pages:
            path = f"{src.docs_root}/{rel}"
            url = self.page_url(rel)
            raw_url, status, raw = self.fetch_raw(sha, path)
            if status != 200:
                failures.append({"page": rel, "problem": f"fetch failed (HTTP {status})"})
                continue

            meta, body = parse_frontmatter(raw)
            title = meta.get("title", "")
            body = clean_body(body)
            text = f"# {title}\n\n{body}" if title else body
            failures += [{"page": rel, "problem": p} for p in self._check_page(title, body, text)]

            for folder, content in (("raw", raw), ("pages", text)):
                out = data / folder / path
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_text(content, encoding="utf-8")

            content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
            if url not in previous:
                change = "new"
            else:
                change = "unchanged" if previous[url] == content_hash else "changed"
            rows.append({
                "url": url, "title": title, "version": lib_version, "retrieved_at": retrieved_at,
                "content_hash": content_hash, "source_path": path, "source_url": raw_url,
                "char_count": len(text), "change": change,
            })

        by_hash: dict[str, list[str]] = {}
        for r in rows:
            by_hash.setdefault(r["content_hash"], []).append(r["url"])
        for urls in by_hash.values():
            if len(urls) > 1:
                failures.append({"page": ", ".join(urls), "problem": "duplicate content"})

        kept = {r["source_path"] for r in rows}
        for folder in ("pages", "raw"):
            for stale in (data / folder).rglob("*.md"):
                if stale.relative_to(data / folder).as_posix() not in kept:
                    stale.unlink()

        with (data / "manifest.jsonl").open("w", encoding="utf-8") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        (data / "corpus_meta.json").write_text(json.dumps({
            "repo": src.repo, "ref_requested": ref, "commit_sha": sha,
            "library_version": lib_version, "docs_major_version": src.expected_major,
            "retrieved_at": retrieved_at, "license": src.license_note,
            "pages_requested": len(pages), "pages_ok": len(rows),
        }, indent=2), encoding="utf-8")
        (data / "report.json").write_text(json.dumps(failures, indent=2), encoding="utf-8")

        counts = {c: sum(r["change"] == c for r in rows) for c in ("new", "changed", "unchanged")}
        print(f"commit {sha[:10]}  {src.repo} {lib_version}")
        print(f"pages: {len(rows)}/{len(pages)} fetched  {counts}")
        return failures
