import asyncio
import json
import logging
import re
import subprocess
from pathlib import Path
from backend.config import INDEX_DIR, SUBJECTS_DIR

logger = logging.getLogger(__name__)


def _run_subprocess(cmd: list[str]) -> tuple[str, str, int]:
    """Run a subprocess synchronously and return (stdout, stderr, returncode)."""
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return result.stdout.strip(), result.stderr.strip(), result.returncode


async def build_index() -> None:
    """Build the notebooklm-py RAG index from processed subject text files."""
    subjects_path = Path(SUBJECTS_DIR)
    index_path = Path(INDEX_DIR)

    if not subjects_path.exists() or not any(subjects_path.glob("*.txt")):
        logger.warning("build_index: no subject text files found in %s, skipping", subjects_path)
        return

    logger.info("Building RAG index: input=%s output=%s", subjects_path, index_path)
    cmd = ["notebooklm-py", "index", "--input", str(subjects_path), "--output", str(index_path)]
    stdout, stderr, rc = await asyncio.to_thread(_run_subprocess, cmd)

    if rc != 0:
        logger.error("notebooklm-py index failed (rc=%d): %s", rc, stderr)
    else:
        logger.info("RAG index built successfully")
        if stderr:
            logger.debug("notebooklm-py index stderr: %s", stderr)


async def query(subject_id: int, question: str, top_k: int = 5) -> list[str]:
    """Query the RAG index for relevant chunks for a given subject and question."""
    index_path = Path(INDEX_DIR)

    if not index_path.exists():
        logger.warning("RAG index not found at %s — returning empty context. Run ingest first.", index_path)
        return []

    logger.debug("RAG query: subject_id=%d top_k=%d question=%r", subject_id, top_k, question[:80])
    cmd = [
        "notebooklm-py", "query",
        "--index", str(index_path),
        "--subject", str(subject_id),
        "--query", question,
        "--top-k", str(top_k),
    ]
    stdout, stderr, rc = await asyncio.to_thread(_run_subprocess, cmd)

    if rc != 0:
        logger.error("notebooklm-py query failed (rc=%d): %s", rc, stderr)
        return []

    if not stdout:
        logger.debug("RAG query returned empty output")
        return []

    # Try JSON array first
    try:
        parsed = json.loads(stdout)
        if isinstance(parsed, list):
            logger.debug("RAG query parsed %d chunks (JSON)", len(parsed))
            return [str(c) for c in parsed]
    except json.JSONDecodeError:
        pass

    # Fallback: split by double newlines
    chunks = [c.strip() for c in re.split(r"\n\n+", stdout) if c.strip()]
    logger.debug("RAG query parsed %d chunks (plaintext fallback)", len(chunks))
    return chunks
