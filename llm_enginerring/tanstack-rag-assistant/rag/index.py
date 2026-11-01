"""The Chroma vector index: sync it from the chunks and query it."""

import hashlib
import time

import chromadb

from .config import Settings, get_settings
from .llm import get_llm
from .models import AppError, Chunk, Hit


class VectorIndex:
    def __init__(self, settings: Settings | None = None):
        self.s = settings or get_settings()
        self._col = None

    def _client(self):
        return chromadb.PersistentClient(path=str(self.s.data / "chroma"))

    def collection(self):
        if self._col is None:
            try:
                self._col = self._client().get_collection(self.s.collection)
            except Exception as e:
                raise AppError("index", f"Vector index missing or unreadable: {e}")
        return self._col

    def search(self, question: str, k: int) -> list[Hit]:
        emb = get_llm().embed([question], self.s.query_prefix)
        res = self.collection().query(query_embeddings=emb, n_results=k)
        rows = zip(res["ids"][0], res["documents"][0], res["metadatas"][0], res["distances"][0])
        return [
            Hit(chunk_id=i, text=d, meta=m, score=1 - dist, rank=r, retriever="vector")  # cosine similarity
            for r, (i, d, m, dist) in enumerate(rows, 1)
        ]

    def sync(self, chunks: list[Chunk]) -> str:
        """Upsert changed chunks, skip unchanged ones, delete chunks that no longer exist."""
        s = self.s
        col = self._client().get_or_create_collection(
            s.collection,
            # Record the config used, so results can be traced to it.
            metadata={"hnsw:space": "cosine", "embed_model": s.embed_model, "doc_prefix": s.doc_prefix},
        )
        if col.metadata.get("embed_model") != s.embed_model:
            raise SystemExit("Collection was built with a different embedder; delete data/chroma first.")

        existing = col.get(include=["metadatas"])
        old_hash = {i: m["text_hash"] for i, m in zip(existing["ids"], existing["metadatas"])}
        new_ids = {c.chunk_id for c in chunks}
        stale = [i for i in old_hash if i not in new_ids]
        if stale:
            col.delete(ids=stale)

        todo = []
        for c in chunks:
            h = hashlib.sha256(c.text.encode("utf-8")).hexdigest()
            if old_hash.get(c.chunk_id) != h:
                todo.append((c, h))

        start = time.time()
        for i in range(0, len(todo), s.embed_batch):
            batch = todo[i : i + s.embed_batch]
            col.upsert(
                ids=[c.chunk_id for c, _ in batch],
                documents=[c.text for c, _ in batch],
                embeddings=get_llm().embed([c.text for c, _ in batch], s.doc_prefix),
                metadatas=[{**c.meta(), "text_hash": h} for c, h in batch],  # hash lets a rerun skip unchanged chunks
            )
        self._col = None
        return (
            f"chunks: {len(chunks)}  embedded: {len(todo)}  skipped: {len(chunks) - len(todo)}  "
            f"deleted: {len(stale)}  collection size: {col.count()}  ({time.time() - start:.1f}s)"
        )
