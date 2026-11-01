import time
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from chromadb import PersistentClient
from tqdm import tqdm
from litellm import completion
from multiprocessing import Pool
from tenacity import retry, wait_exponential, stop_after_attempt


load_dotenv(override=True)

# Local Ollama setup
MODEL = "gemini/gemini-3.5-flash-lite"
# Gemini free tier: start at most one request per minute
MIN_SECONDS_BETWEEN_CALLS = 60
_last_call = 0.0
OLLAMA_URL = "http://localhost:11434"
# Ollama defaults to 4096 tokens; input document + generated chunks must both fit
NUM_CTX = 8192
# Cap generation so a looping small model fails fast instead of running 10 minutes
MAX_OUTPUT_TOKENS = 8000
TIMEOUT_SECONDS = 240

DB_NAME = str(Path(__file__).parent.parent / "preprocessed_db_local")
collection_name = "docs"
embedding_model = "nomic-embed-text"
KNOWLEDGE_BASE_PATH = Path(__file__).parent.parent / "knowledge-base"
AVERAGE_CHUNK_SIZE = 100
wait = wait_exponential(multiplier=2, min=5, max=60)


# One worker: a single local Ollama model can't serve parallel calls faster
WORKERS = 1

# Ollama's OpenAI-compatible endpoint (needs /v1) is used for embeddings
openai = OpenAI(base_url=f"{OLLAMA_URL}/v1", api_key="ollama")


class Result(BaseModel):
    page_content: str
    metadata: dict


class Chunk(BaseModel):
    headline: str = Field(
        description="A brief heading for this chunk, typically a few words, that is most likely to be surfaced in a query",
    )
    summary: str = Field(
        description="A few sentences summarizing the content of this chunk to answer common questions"
    )
    original_text: str = Field(
        description="The original text of this chunk from the provided document, exactly as is, not changed in any way"
    )

    def as_result(self, document):
        metadata = {"source": document["source"], "type": document["type"]}
        return Result(
            page_content=self.headline + "\n\n" + self.summary + "\n\n" + self.original_text,
            metadata=metadata,
        )


class Chunks(BaseModel):
    chunks: list[Chunk]


def fetch_documents():
    """A homemade version of the LangChain DirectoryLoader"""

    documents = []

    for folder in KNOWLEDGE_BASE_PATH.iterdir():
        doc_type = folder.name
        for file in folder.rglob("*.md"):
            with open(file, "r", encoding="utf-8") as f:
                documents.append({"type": doc_type, "source": file.as_posix(), "text": f.read()})

    print(f"Loaded {len(documents)} documents")
    return documents


def make_prompt(document):
    how_many = (len(document["text"]) // AVERAGE_CHUNK_SIZE) + 1
    return f"""
You take a document and you split the document into overlapping chunks for a KnowledgeBase.

The document is from the shared drive of a company called Insurellm.
The document is of type: {document["type"]}
The document has been retrieved from: {document["source"]}

A chatbot will use these chunks to answer questions about the company.
You should divide up the document as you see fit, being sure that the entire document is returned across the chunks - don't leave anything out.
This document should probably be split into at least {how_many} chunks, but you can have more or less as appropriate, ensuring that there are individual chunks to answer specific questions.
There should be overlap between the chunks as appropriate; typically about 25% overlap or about 50 words, so you have the same text in multiple chunks for best retrieval results.

For each chunk, you should provide a headline, a summary, and the original text of the chunk.
Together your chunks should represent the entire document with overlap.

Here is the document:

{document["text"]}

Respond with the chunks.
"""


def make_messages(document):
    return [
        {"role": "user", "content": make_prompt(document)},
    ]


@retry(wait=wait, stop=stop_after_attempt(8))
def _chunk_document(document):
    global _last_call
    gap = time.time() - _last_call
    if gap < MIN_SECONDS_BETWEEN_CALLS:
        time.sleep(MIN_SECONDS_BETWEEN_CALLS - gap)
    _last_call = time.time()
    response = completion(
        model=MODEL,
        messages=make_messages(document),
        response_format=Chunks,
        max_tokens=MAX_OUTPUT_TOKENS,
        temperature=0,
        timeout=TIMEOUT_SECONDS,
    )
    reply = response.choices[0].message.content
    return Chunks.model_validate_json(reply).chunks


def process_document(document):
    print(f"Processing document: {document['source']}")
    try:
        doc_as_chunks = _chunk_document(document)
    except Exception as e:
        # Don't lose the document: keep it whole as a single chunk so it is still searchable
        print(f"FAILED after retries, using whole document as one chunk: {document['source']}: {e}")
        return [
            Result(
                page_content=document["text"],
                metadata={"source": document["source"], "type": document["type"]},
            )
        ]
    return [chunk.as_result(document) for chunk in doc_as_chunks]
    # return [chunk.as_result(document) for chunk in doc_as_chunks]


def create_chunks(documents):
    """
    Create chunks using a number of workers in parallel.
    If you get a rate limit error, set the WORKERS to 1.
    """
    chunks = []
    with Pool(processes=WORKERS) as pool:
        for result in tqdm(pool.imap_unordered(process_document, documents), total=len(documents)):
            chunks.extend(result)
    return chunks


def create_embeddings(chunks):
    chroma = PersistentClient(path=DB_NAME)
    if collection_name in [c.name for c in chroma.list_collections()]:
        chroma.delete_collection(collection_name)

    texts = [chunk.page_content for chunk in chunks]
    vectors = []
    for i in range(0, len(texts), 32):
        batch = texts[i : i + 32]
        emb = openai.embeddings.create(model=embedding_model, input=batch).data
        vectors.extend(e.embedding for e in emb)

    collection = chroma.get_or_create_collection(collection_name)

    ids = [str(i) for i in range(len(chunks))]
    metas = [chunk.metadata for chunk in chunks]

    collection.add(ids=ids, embeddings=vectors, documents=texts, metadatas=metas)
    print(f"Vectorstore created with {collection.count()} documents")


if __name__ == "__main__":
    documents = fetch_documents()
    chunks = create_chunks(documents)
    create_embeddings(chunks)
    print("Ingestion complete")


# Summary of how this ingest works
# 1. fetch_documents: each .md file becomes {type: folder name, source: file path, text: markdown}.
# 2. create_chunks: each document is sent to the LLM (one call per document, WORKERS=1 for local Ollama).
#    The prompt asks for about how_many chunks with ~25% overlap, covering the whole document.
# 3. Output format: response_format=Chunks makes Ollama's decoder force JSON with
#    headline, summary and original_text per chunk (enforced at inference, not by the prompt).
# 4. as_result: page_content = headline + summary + original_text, metadata = {source, type}.
# 5. create_embeddings: each page_content is embedded (nomic-embed-text, in batches of 32;
#    every text still gets its own vector) and stored in Chroma with ids and metadata.
# Note: answer.py must use the same MODEL and embedding model as this file.
