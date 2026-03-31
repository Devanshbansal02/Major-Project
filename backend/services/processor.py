import asyncio
import logging
import subprocess
from pathlib import Path
from pptx import Presentation
from pdf2image import convert_from_path
import httpx

from backend.config import RAW_DIR, PROCESSED_DIR, SUBJECTS_DIR, SUBJECTS
from backend.services import notes_service, rag_service

logger = logging.getLogger(__name__)


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


def _pdf_typed_to_text(path: Path, out_path: Path) -> str:
    result = subprocess.run(
        ["uv", "run", "opendataloader-pdf", str(path), "--output", str(out_path)],
        capture_output=True, text=True
    )
    if out_path.exists():
        return out_path.read_text(encoding="utf-8", errors="replace")
    return result.stdout or ""


def _pdf_handwritten_to_text(path: Path) -> str:
    pages = convert_from_path(str(path))
    text_parts = []
    for i, page in enumerate(pages):
        img_path = path.parent / f"{path.stem}_page_{i+1}.png"
        page.save(str(img_path), "PNG")
        result = subprocess.run(
            ["uv", "run", "tesseract", str(img_path), "stdout"],
            capture_output=True, text=True
        )
        text_parts.append(result.stdout)
        img_path.unlink(missing_ok=True)
    return "\n".join(text_parts)


async def _download(url: str, dest: Path) -> None:
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        r = await client.get(url)
        r.raise_for_status()
        dest.write_bytes(r.content)


async def process_note(note: dict) -> Path | None:
    notes_id = note["notes_id"]
    link: str = note["link"]
    name: str = note.get("notesname", "").lower()

    # Determine extension from URL
    ext = link.rsplit(".", 1)[-1].lower() if "." in link else "bin"

    raw_path = Path(RAW_DIR) / f"{notes_id}.{ext}"
    out_path = Path(PROCESSED_DIR) / f"{notes_id}.txt"

    if out_path.exists():
        return out_path  # Already processed

    # Download
    try:
        await _download(link, raw_path)
    except Exception as e:
        logger.error("Download failed for notes_id=%s: %s", notes_id, e)
        return None

    # Extract text
    try:
        if ext == "pptx":
            text = _pptx_to_text(raw_path)
        elif ext == "pdf" and "handwritten" in name:
            text = _pdf_handwritten_to_text(raw_path)
        elif ext == "pdf":
            text = _pdf_typed_to_text(raw_path, out_path)
        else:
            text = f"[Unsupported file type: {ext}]"

        if not out_path.exists():
            out_path.write_text(text, encoding="utf-8")
    except Exception as e:
        logger.error("Processing failed for notes_id=%s: %s", notes_id, e, exc_info=True)
        return None

    return out_path


async def ingest_all() -> dict:
    # Ensure dirs exist
    for d in [RAW_DIR, PROCESSED_DIR, SUBJECTS_DIR]:
        Path(d).mkdir(parents=True, exist_ok=True)

    # Fetch all notes
    notes = await notes_service.fetch_notes()

    # Process all notes concurrently
    tasks = [process_note(note) for note in notes]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    processed_count = sum(1 for r in results if r is not None and not isinstance(r, Exception))

    # Merge per subject
    subject_map: dict[int, list[Path]] = {s["id"]: [] for s in SUBJECTS}
    for note, result in zip(notes, results):
        if isinstance(result, Path) and result is not None:
            subject_map[note["subjectId"]].append(result)

    for subject_id, txt_paths in subject_map.items():
        subject_file = Path(SUBJECTS_DIR) / f"{subject_id}.txt"
        combined = []
        for p in txt_paths:
            try:
                combined.append(p.read_text(encoding="utf-8", errors="replace"))
            except Exception:
                pass
        if combined:
            subject_file.write_text("\n\n---\n\n".join(combined), encoding="utf-8")

    # Build RAG index
    await rag_service.build_index()

    return {"status": "done", "notes_processed": processed_count}
