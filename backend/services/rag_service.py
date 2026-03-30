import asyncio
import subprocess
import json
import re
from pathlib import Path
from backend.config import INDEX_DIR, SUBJECTS_DIR


async def build_index() -> None:
    """Build the notebooklm-py RAG index from processed subject text files."""
    subjects_path = Path(SUBJECTS_DIR)
    index_path = Path(INDEX_DIR)

    if not subjects_path.exists() or not any(subjects_path.glob("*.txt")):
        return  # Nothing to index yet

    proc = await asyncio.create_subprocess_exec(
        "notebooklm-py", "index",
        "--input", str(subjects_path),
        "--output", str(index_path),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    await proc.communicate()


async def query(subject_id: int, question: str, top_k: int = 5) -> list[str]:
    """Query the RAG index for relevant chunks for a given subject and question."""
    index_path = Path(INDEX_DIR)

    if not index_path.exists():
        return []

    proc = await asyncio.create_subprocess_exec(
        "notebooklm-py", "query",
        "--index", str(index_path),
        "--subject", str(subject_id),
        "--query", question,
        "--top-k", str(top_k),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    output = stdout.decode("utf-8", errors="replace").strip()

    if not output:
        return []

    # Try to parse as JSON array of strings first
    try:
        parsed = json.loads(output)
        if isinstance(parsed, list):
            return [str(c) for c in parsed]
    except json.JSONDecodeError:
        pass

    # Otherwise split by double newlines as fallback
    chunks = [c.strip() for c in re.split(r"\n\n+", output) if c.strip()]
    return chunks
