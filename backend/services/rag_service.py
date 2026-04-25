import logging
from pathlib import Path

import chromadb
import httpx
from chromadb.config import Settings as ChromaSettings

from backend.config import EMBEDDING_MODEL, INDEX_DIR, OLLAMA_BASE_URL

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
# Embedding via Ollama: no PyTorch, no local model loading
# ---------------------------------------------------------------------------


async def _embed(texts: list[str]) -> list[list[float]]:
    """Get embeddings from Ollama. Falls back to /api/embeddings for older versions."""
    BATCH_SIZE = 5
    all_embeddings = []

    async with httpx.AsyncClient(timeout=120) as client:
        for i in range(0, len(texts), BATCH_SIZE):
            batch_texts = texts[i : i + BATCH_SIZE]

            # Try new batch endpoint first
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/embed",
                json={"model": EMBEDDING_MODEL, "input": batch_texts},
            )

            if resp.status_code != 404:
                resp.raise_for_status()
                all_embeddings.extend(resp.json()["embeddings"])
                continue

            # Fallback to older /api/embeddings endpoint (one at a time)
            if i == 0:
                logger.warning(
                    "/api/embed returned 404. Falling back to /api/embeddings (older Ollama version)."
                )

            for text in batch_texts:
                resp = await client.post(
                    f"{OLLAMA_BASE_URL}/api/embeddings",
                    json={"model": EMBEDDING_MODEL, "prompt": text},
                )
                resp.raise_for_status()
                all_embeddings.append(resp.json()["embedding"])

    return all_embeddings


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

# Bump this whenever chunk_size / overlap change so stale embeddings are re-indexed.
CHUNK_VERSION = 2

# ~500 tokens (4 chars/token) with ~50-token overlap: hard ceiling ≈ 1 000 tokens.
_CHUNK_SIZE = 2000
_CHUNK_OVERLAP = 200


def _chunk_text_stream(
    text: str, chunk_size: int = _CHUNK_SIZE, overlap: int = _CHUNK_OVERLAP
):
    """Yield overlapping character-based chunks without building the full list in memory.

    Never single-passes the whole document: each yield gives one ready-to-embed chunk.
    Approx 4 chars per token → chunk_size=2000 ≈ 500 tokens; well under any model's
    context window even after the query string is prepended.
    """
    start = 0
    text_len = len(text)
    while start < text_len:
        chunk = text[start : start + chunk_size].strip()
        if chunk:
            yield chunk
        start += chunk_size - overlap


# ---------------------------------------------------------------------------
# Index operations
# ---------------------------------------------------------------------------


async def add_note_to_index(subject_id: int, notes_id: int, text: str) -> int:
    """Chunk text incrementally, embed via Ollama, and upsert into ChromaDB.

    Never single-passes the whole document: chunks are streamed and embedded
    in small batches so memory usage stays bounded regardless of document size.
    """
    client = _get_client()
    collection = client.get_or_create_collection(
        name=f"subject_{subject_id}",
        metadata={"subject_id": subject_id},
    )

    # Remove stale chunks (previous run or old CHUNK_VERSION)
    try:
        collection.delete(where={"notes_id": notes_id})
    except Exception:
        pass

    EMBED_BATCH = 5  # embed this many chunks per Ollama call
    total = 0
    batch_chunks: list[str] = []
    batch_start_idx = 0

    async def _flush(chunks: list[str], start_i: int) -> None:
        nonlocal total
        try:
            embeddings = await _embed(chunks)
        except Exception as e:
            logger.error(
                "Embedding failed for notes_id=%d chunk_batch starting at %d: %s",
                notes_id,
                start_i,
                e,
            )
            return
        ids = [f"{notes_id}_chunk_{start_i + j}" for j in range(len(chunks))]
        metadatas = [
            {
                "notes_id": notes_id,
                "chunk_index": start_i + j,
                "chunk_version": CHUNK_VERSION,
            }
            for j in range(len(chunks))
        ]
        collection.upsert(
            ids=ids, embeddings=embeddings, documents=chunks, metadatas=metadatas
        )
        total += len(chunks)

    for chunk in _chunk_text_stream(text):
        batch_chunks.append(chunk)
        if len(batch_chunks) >= EMBED_BATCH:
            await _flush(batch_chunks, batch_start_idx)
            batch_start_idx += len(batch_chunks)
            batch_chunks = []

    if batch_chunks:
        await _flush(batch_chunks, batch_start_idx)

    logger.info(
        "Indexed %d chunks for notes_id=%d into subject_%d (chunk_version=%d)",
        total,
        notes_id,
        subject_id,
        CHUNK_VERSION,
    )
    return total


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
    """Return True only if the note is indexed at the current CHUNK_VERSION.

    A version mismatch means the chunking params changed: the note must be
    re-indexed so callers should treat it as not embedded.
    """
    client = _get_client()
    try:
        collection = client.get_collection(f"subject_{subject_id}")
        results = collection.get(
            where={"notes_id": notes_id},
            limit=1,
            include=["metadatas"],
        )
        if not results["ids"]:
            return False
        stored_version = (results["metadatas"] or [{}])[0].get("chunk_version", 1)
        return int(stored_version) == CHUNK_VERSION
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------


async def query(
    subject_id: int, question: str, top_k: int = 17, note_ids: list[int] | None = None
) -> list[str]:
    """Query the vector index for relevant chunks.

    Args:
        subject_id: ChromaDB collection to query.
        question: The query text.
        top_k: Number of chunks to return.
        note_ids: If provided, restrict results to these note IDs only.
    """
    client = _get_client()

    if note_ids is not None and len(note_ids) == 0:
        return []

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
    logger.debug(
        "RAG query returned %d chunks for subject_%d", len(documents), subject_id
    )
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
