import io
import logging
from pathlib import Path

import fitz  # PyMuPDF
import pytesseract
from PIL import Image
from pptx import Presentation

from backend.config import RAW_DIR, PROCESSED_DIR

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Text extraction — one function per file type
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
    parts = [page.get_text() for page in doc]
    doc.close()
    return "\n".join(parts)


def _pdf_handwritten_to_text(path: Path) -> str:
    doc = fitz.open(str(path))
    parts = []
    for page in doc:
        pix = page.get_pixmap(dpi=300)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        parts.append(pytesseract.image_to_string(img))
    doc.close()
    return "\n".join(parts)


def _docx_to_text(path: Path) -> str:
    try:
        from docx import Document as DocxDocument  # python-docx
    except ImportError:
        logger.error("python-docx not installed — cannot extract DOCX")
        return ""
    doc = DocxDocument(str(path))
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    # Also pull text from tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                text = cell.text.strip()
                if text:
                    paragraphs.append(text)
    return "\n".join(paragraphs)


def _image_to_text(path: Path) -> str:
    img = Image.open(str(path))
    return pytesseract.image_to_string(img)


# ---------------------------------------------------------------------------
# File metadata helper
# ---------------------------------------------------------------------------

def get_file_metadata(path: Path) -> dict:
    ext = path.suffix.lower()
    meta: dict = {"file_size_bytes": path.stat().st_size, "extension": ext}
    try:
        if ext == ".pdf":
            doc = fitz.open(str(path))
            meta["page_count"] = len(doc)
            meta["word_count"] = sum(len(p.get_text().split()) for p in doc)
            doc.close()
        elif ext == ".pptx":
            prs = Presentation(str(path))
            meta["slide_count"] = len(prs.slides)
    except Exception as exc:
        logger.warning("Could not read metadata for %s: %s", path, exc)
    return meta


# ---------------------------------------------------------------------------
# Core: process a DB note row → extracted text
# ---------------------------------------------------------------------------

async def process_note_file(note: dict) -> tuple[Path | None, str]:
    """Extract text from an uploaded note.

    Args:
        note: DB row dict with keys: id, filename, file_type

    Returns:
        (output_path, text) — output_path is the cached .txt file.
        Returns (None, "") on failure.
    """
    note_id = note["id"]
    filename = note["filename"]
    ftype = note["file_type"]

    raw_path = Path(RAW_DIR) / filename
    out_path = Path(PROCESSED_DIR) / f"{note_id}.txt"

    # Return cached extraction if available
    if out_path.exists():
        text = out_path.read_text(encoding="utf-8", errors="replace")
        return out_path, text

    if not raw_path.exists():
        logger.error("Raw file missing for note_id=%s: %s", note_id, raw_path)
        return None, ""

    try:
        if ftype == "pptx":
            text = _pptx_to_text(raw_path)
        elif ftype == "pdf_handwritten":
            text = _pdf_handwritten_to_text(raw_path)
        elif ftype == "pdf_typed":
            text = _pdf_typed_to_text(raw_path)
        elif ftype == "docx":
            text = _docx_to_text(raw_path)
        elif ftype == "image":
            text = _image_to_text(raw_path)
        else:
            logger.warning("Unknown file type %s for note_id=%s", ftype, note_id)
            text = f"[Unsupported file type: {ftype}]"

        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(text, encoding="utf-8")
        logger.info("Extracted text for note_id=%s (%d words)", note_id, len(text.split()))
    except Exception as exc:
        logger.error("Extraction failed note_id=%s: %s", note_id, exc, exc_info=True)
        return None, ""

    return out_path, text


# ---------------------------------------------------------------------------
# Bulk ingestion: extract + embed into ChromaDB, update is_embedded flag
# ---------------------------------------------------------------------------

async def ingest_note_files(notes: list[dict]) -> dict:
    """Process and embed a list of DB note rows.

    Updates the `is_embedded` flag in the DB for each successfully indexed note.
    """
    from backend.services import rag_service
    from backend.db import get_db

    Path(PROCESSED_DIR).mkdir(parents=True, exist_ok=True)

    processed = 0
    for note in notes:
        note_id = note["id"]
        subject_id = note["subject_id"]

        _, text = await process_note_file(note)
        if not text.strip():
            logger.warning("Empty text for note_id=%s — skipping", note_id)
            continue

        chunks_added = await rag_service.add_note_to_index(subject_id, note_id, text)
        if chunks_added > 0:
            processed += 1
            # Mark as embedded in DB
            try:
                db = await get_db()
                await db.execute("UPDATE notes SET is_embedded = 1 WHERE id = ?", (note_id,))
                await db.commit()
                await db.close()
            except Exception as exc:
                logger.error("Failed to update is_embedded for note_id=%s: %s", note_id, exc)

    logger.info("Ingestion complete: %d/%d notes embedded", processed, len(notes))
    return {"status": "done", "processed": processed, "total": len(notes)}
