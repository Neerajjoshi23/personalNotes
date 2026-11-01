"""Re-embed the existing LLM-made chunks with mxbai-embed-large (no Gemini calls)."""
from pathlib import Path
from chromadb import PersistentClient
from openai import OpenAI

ROOT = Path(__file__).parent.parent
SRC_DB = str(ROOT / "preprocessed_db_local")
DST_DB = str(ROOT / "preprocessed_db_mxbai")
COLLECTION = "docs"
EMBEDDING_MODEL = "mxbai-embed-large"

openai = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")

src = PersistentClient(path=SRC_DB).get_collection(COLLECTION).get(include=["documents", "metadatas"])
texts, metas, ids = src["documents"], src["metadatas"], src["ids"]

dst_client = PersistentClient(path=DST_DB)
if COLLECTION in [c.name for c in dst_client.list_collections()]:
    dst_client.delete_collection(COLLECTION)
dst = dst_client.get_or_create_collection(COLLECTION)

vectors = []
for i in range(0, len(texts), 16):
    batch = texts[i : i + 16]
    vectors.extend(e.embedding for e in openai.embeddings.create(model=EMBEDDING_MODEL, input=batch).data)
    print(f"{min(i + 16, len(texts))}/{len(texts)}")

dst.add(ids=ids, embeddings=vectors, documents=texts, metadatas=metas)
print(f"Done: {dst.count()} chunks, {len(vectors[0])} dims")
