import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from backend.config import RAW_DIR
from backend.db import get_db
from backend.routers.auth import require_faculty

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".pptx", ".docx", ".png", ".jpg", ".jpeg", ".webp"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB


def _detect_file_type(ext: str, is_handwritten: bool) -> str:
    if ext == ".pdf":
        return "pdf_handwritten" if is_handwritten else "pdf_typed"
    if ext == ".pptx":
        return "pptx"
    if ext == ".docx":
        return "docx"
    return "image"


async def _assert_owns_subject(subject_id: int, faculty_id: int, db) -> None:
    row = await (
        await db.execute(
            "SELECT id FROM subjects WHERE id = ? AND faculty_id = ?",
            (subject_id, faculty_id),
        )
    ).fetchone()
    if not row:
        raise HTTPException(403, "Subject not found or not yours")


# ---------------------------------------------------------------------------
# List notes for a subject (faculty view — same data as student but protected)
# ---------------------------------------------------------------------------

@router.get("/faculty/subjects/{subject_id}/notes")
async def list_notes(subject_id: int, faculty_id: int = Depends(require_faculty)):
    db = await get_db()
    try:
        await _assert_owns_subject(subject_id, faculty_id, db)
        rows = await (
            await db.execute(
                """SELECT id, original_name, file_type, class_date, uploaded_at, is_embedded
                   FROM notes WHERE subject_id = ? ORDER BY class_date DESC, uploaded_at DESC""",
                (subject_id,),
            )
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


# ---------------------------------------------------------------------------
# Upload a note
# ---------------------------------------------------------------------------

@router.post("/faculty/subjects/{subject_id}/notes", status_code=201)
async def upload_note(
    subject_id: int,
    file: UploadFile = File(...),
    class_date: str = Form(...),          # YYYY-MM-DD
    is_handwritten: bool = Form(False),
    faculty_id: int = Depends(require_faculty),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large (max 100 MB)")

    db = await get_db()
    try:
        await _assert_owns_subject(subject_id, faculty_id, db)

        ftype = _detect_file_type(ext, is_handwritten)
        stored_name = f"{uuid.uuid4()}{ext}"
        dest = Path(RAW_DIR) / stored_name

        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(content)

        cur = await db.execute(
            """INSERT INTO notes (subject_id, filename, original_name, file_type, class_date)
               VALUES (?, ?, ?, ?, ?)""",
            (subject_id, stored_name, file.filename, ftype, class_date),
        )
        await db.commit()
        note_id = cur.lastrowid
        logger.info(
            "Uploaded note id=%d subject=%d type=%s date=%s size=%d",
            note_id, subject_id, ftype, class_date, len(content),
        )
        return {
            "id": note_id,
            "original_name": file.filename,
            "file_type": ftype,
            "class_date": class_date,
            "is_embedded": False,
        }
    finally:
        await db.close()


# ---------------------------------------------------------------------------
# Delete a note
# ---------------------------------------------------------------------------

@router.delete("/faculty/subjects/{subject_id}/notes/{note_id}")
async def delete_note(
    subject_id: int,
    note_id: int,
    faculty_id: int = Depends(require_faculty),
):
    db = await get_db()
    try:
        await _assert_owns_subject(subject_id, faculty_id, db)

        row = await (
            await db.execute(
                "SELECT filename FROM notes WHERE id = ? AND subject_id = ?",
                (note_id, subject_id),
            )
        ).fetchone()
        if not row:
            raise HTTPException(404, "Note not found")

        # Remove file from disk
        raw_path = Path(RAW_DIR) / row["filename"]
        if raw_path.exists():
            raw_path.unlink()

        # Remove processed text if exists
        processed_path = Path(RAW_DIR).parent / "processed" / f"{note_id}.txt"
        if processed_path.exists():
            processed_path.unlink()

        await db.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        await db.commit()
        logger.info("Deleted note id=%d", note_id)
        return {"ok": True}
    finally:
        await db.close()
