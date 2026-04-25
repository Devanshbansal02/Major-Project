import logging
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings
import httpx

from backend.config import INDEX_DIR, OLLAMA_BASE_URL, EMBEDDING_MODEL

logger = logging.getLogger(__name__)

# Lazy-loaded singletons
_client: chromadb.ClientAPI | None = None


def _get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        index_path = Path(INDEX_DIR)
        index_path.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=str(index_path),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        logger.info("ChromaDB initialized at %s", index_path)
    return _client


# ---------------------------------------------------------------------------
# Embedding via Ollama — no PyTorch, no local model loading
# ---------------------------------------------------------------------------

async def _embed(texts: list[str]) -> list[list[float]]:
    """Get embeddings from Ollama's /api/embed endpoint.

    Uses embeddinggemma:latest by default (configurable via EMBEDDING_MODEL env).
    """
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{OLLAMA_BASE_URL}/api/embed",
            json={"model": EMBEDDING_MODEL, "input": texts},
        )
        resp.raise_for_status()
        data = resp.json()
    return data["embeddings"]


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping word-based chunks."""
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


# ---------------------------------------------------------------------------
# Index operations
# ---------------------------------------------------------------------------

async def add_note_to_index(subject_id: int, notes_id: int, text: str) -> int:
    """Chunk text, embed via Ollama, upsert into ChromaDB."""
    client = _get_client()
    collection = client.get_or_create_collection(
        name=f"subject_{subject_id}",
        metadata={"subject_id": subject_id},
    )

    chunks = _chunk_text(text)
    if not chunks:
        return 0

    # Batch embed through Ollama
    try:
        embeddings = await _embed(chunks)
    except Exception as e:
        logger.error("Embedding failed for notes_id=%d: %s", notes_id, e)
        return 0

    ids = [f"{notes_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"notes_id": notes_id, "chunk_index": i} for i in range(len(chunks))]

    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )

    logger.info("Indexed %d chunks for notes_id=%d into subject_%d", len(chunks), notes_id, subject_id)
    return len(chunks)


def remove_note_from_index(subject_id: int, notes_id: int) -> None:
    """Remove all chunks for a specific note from the index."""
    client = _get_client()
    try:
        collection = client.get_collection(f"subject_{subject_id}")
        collection.delete(where={"notes_id": notes_id})
        logger.info("Removed notes_id=%d from subject_%d index", notes_id, subject_id)
    except Exception:
        pass  # Collection may not exist yet


def is_note_embedded(notes_id: int, subject_id: int) -> bool:
    """Check if a note already has chunks in the index."""
    client = _get_client()
    try:
        collection = client.get_collection(f"subject_{subject_id}")
        results = collection.get(where={"notes_id": notes_id}, limit=1)
        return len(results["ids"]) > 0
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------

async def query(subject_id: int, question: str, top_k: int = 5, note_ids: list[int] | None = None) -> list[str]:
    """Query the vector index for relevant chunks.

    Args:
        subject_id: ChromaDB collection to query.
        question: The query text.
        top_k: Number of chunks to return.
        note_ids: If provided, restrict results to these note IDs only.
    """
    client = _get_client()

    try:
        collection = client.get_collection(f"subject_{subject_id}")
    except Exception:
        logger.warning("No index found for subject_%d", subject_id)
        return []

    try:
        q_embedding = await _embed([question])
    except Exception as e:
        logger.error("Query embedding failed: %s", e)
        return []

    where = {"notes_id": {"$in": note_ids}} if note_ids else None

    try:
        kwargs: dict = {"query_embeddings": q_embedding, "n_results": top_k}
        if where:
            kwargs["where"] = where
        results = collection.query(**kwargs)
    except Exception as e:
        logger.error("ChromaDB query failed: %s", e)
        return []

    documents = results.get("documents", [[]])[0]
    logger.debug("RAG query returned %d chunks for subject_%d", len(documents), subject_id)
    return documents


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

def get_index_stats() -> dict:
    """Return stats for all indexed collections."""
    client = _get_client()
    collections = client.list_collections()
    stats = {}
    for col in collections:
        c = client.get_collection(col.name)
        stats[col.name] = {"count": c.count(), "metadata": col.metadata}
    return stats
