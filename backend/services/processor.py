import logging
from pathlib import Path

import fitz  # PyMuPDF
import httpx
import pytesseract
from PIL import Image
from pptx import Presentation
import io

from backend.config import RAW_DIR, PROCESSED_DIR

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Text extraction — pure library calls, no subprocess
# ---------------------------------------------------------------------------

def _pptx_to_text(path: Path) -> str:
    prs = Presentation(str(path))
    lines = []
    for slide in prs.slides:
        for shape in slide.shapes:
            if shape.has_text_frame:
                for para in shape.text_frame.paragraphs:
                    text = para.text.strip()
                    if text:
                        lines.append(text)
    return "\n".join(lines)


def _pdf_typed_to_text(path: Path) -> str:
    doc = fitz.open(str(path))
    parts = []
    for page in doc:
        parts.append(page.get_text())
    doc.close()
    return "\n".join(parts)


def _pdf_handwritten_to_text(path: Path) -> str:
    doc = fitz.open(str(path))
    parts = []
    for page in doc:
        pix = page.get_pixmap(dpi=300)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        text = pytesseract.image_to_string(img)
        parts.append(text)
    doc.close()
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# File metadata (used by preview endpoint)
# ---------------------------------------------------------------------------

def get_file_metadata(path: Path) -> dict:
    ext = path.suffix.lower()
    meta = {"file_size_bytes": path.stat().st_size, "extension": ext}
    if ext == ".pdf":
        doc = fitz.open(str(path))
        meta["page_count"] = len(doc)
        meta["word_count"] = sum(len(p.get_text().split()) for p in doc)
        doc.close()
    elif ext == ".pptx":
        prs = Presentation(str(path))
        meta["slide_count"] = len(prs.slides)
    return meta


# ---------------------------------------------------------------------------
# Download helper
# ---------------------------------------------------------------------------

async def _download(url: str, dest: Path) -> None:
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        r = await client.get(url)
        r.raise_for_status()
        dest.write_bytes(r.content)


# ---------------------------------------------------------------------------
# Single note processing — returns (path, text) or (None, "")
# ---------------------------------------------------------------------------

async def process_note(note: dict) -> tuple[Path | None, str]:
    """Download and extract text from a single note.

    Returns (output_path, extracted_text). If already processed, reads
    from cache. Returns (None, "") on failure.
    """
    notes_id = note["notes_id"]
    link: str = note["link"]
    name: str = note.get("notesname", "").lower()

    ext = link.rsplit(".", 1)[-1].lower() if "." in link else "bin"

    raw_path = Path(RAW_DIR) / f"{notes_id}.{ext}"
    out_path = Path(PROCESSED_DIR) / f"{notes_id}.txt"

    # Already processed — return cached text
    if out_path.exists():
        text = out_path.read_text(encoding="utf-8", errors="replace")
        return out_path, text

    # Download
    try:
        if not raw_path.exists():
            await _download(link, raw_path)
    except Exception as e:
        logger.error("Download failed for notes_id=%s: %s", notes_id, e)
        return None, ""

    # Extract text
    try:
        if ext == "pptx":
            text = _pptx_to_text(raw_path)
        elif ext == "pdf" and "handwritten" in name:
            text = _pdf_handwritten_to_text(raw_path)
        elif ext == "pdf":
            text = _pdf_typed_to_text(raw_path)
        else:
            text = f"[Unsupported file type: {ext}]"

        out_path.write_text(text, encoding="utf-8")
    except Exception as e:
        logger.error("Processing failed for notes_id=%s: %s", notes_id, e, exc_info=True)
        return None, ""

    return out_path, text


# ---------------------------------------------------------------------------
# Preview — extract text without embedding into RAG
# ---------------------------------------------------------------------------

async def preview_note(note: dict) -> dict:
    """Download (if needed), extract text, return preview metadata."""
    path, text = await process_note(note)

    notes_id = note["notes_id"]
    link: str = note["link"]
    ext = link.rsplit(".", 1)[-1].lower() if "." in link else "bin"
    raw_path = Path(RAW_DIR) / f"{notes_id}.{ext}"

    meta = {}
    if raw_path.exists():
        meta = get_file_metadata(raw_path)

    meta["notes_id"] = notes_id
    meta["notesname"] = note.get("notesname", "")
    meta["text_preview"] = text[:2000] if text else ""
    meta["word_count"] = len(text.split()) if text else 0
    meta["is_embedded"] = False  # Will be set by the router using rag_service

    return meta


# ---------------------------------------------------------------------------
# Bulk ingestion — selective by notes_ids
# ---------------------------------------------------------------------------

async def ingest_notes(notes: list[dict], notes_ids: list[int] | None = None) -> dict:
    """Process selected notes and embed them into the RAG index.

    Args:
        notes: Full notes list from the API.
        notes_ids: If provided, only process these note IDs. Otherwise process all.

    Returns:
        Summary dict with status and count.
    """
    from backend.services import rag_service

    if notes_ids:
        id_set = set(notes_ids)
        notes = [n for n in notes if n["notes_id"] in id_set]

    # Ensure dirs exist
    Path(RAW_DIR).mkdir(parents=True, exist_ok=True)
    Path(PROCESSED_DIR).mkdir(parents=True, exist_ok=True)

    processed_count = 0
    for note in notes:
        path, text = await process_note(note)
        if path and text.strip():
            chunks_added = await rag_service.add_note_to_index(
                note["subjectId"], note["notes_id"], text
            )
            if chunks_added > 0:
                processed_count += 1

    return {"status": "done", "notes_processed": processed_count}
