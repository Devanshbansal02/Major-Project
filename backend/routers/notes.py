import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from backend.db import get_db
from backend.services import rag_service
from backend.services.processor import ingest_note_files

router = APIRouter()
logger = logging.getLogger(__name__)


class IngestRequest(BaseModel):
    note_ids: list[int]
    mode: str = "custom"   # "all" | "last_class" | "custom"


# ---------------------------------------------------------------------------
# Student-facing: list all subjects across all faculties
# ---------------------------------------------------------------------------

@router.get("/notes/subjects")
async def all_subjects():
    db = await get_db()
    try:
        rows = await (
            await db.execute(
                """SELECT s.id, s.name, s.code, s.color, f.name AS faculty_name,
                          (SELECT COUNT(*) FROM notes n WHERE n.subject_id = s.id) AS note_count
                   FROM subjects s
                   JOIN faculties f ON s.faculty_id = f.id
                   ORDER BY s.id"""
            )
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


# ---------------------------------------------------------------------------
# Student-facing: notes for a subject
# ---------------------------------------------------------------------------

@router.get("/notes/subjects/{subject_id}")
async def subject_notes(subject_id: int):
    db = await get_db()
    try:
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
# Trigger embedding (background)
# ---------------------------------------------------------------------------

@router.post("/notes/ingest")
async def ingest(req: IngestRequest, background_tasks: BackgroundTasks):
    db = await get_db()
    try:
        if req.mode == "all":
            rows = await (await db.execute("SELECT * FROM notes")).fetchall()
        elif req.mode == "last_class":
            if not req.note_ids:
                raise HTTPException(400, "note_ids required for last_class mode")
            placeholders = ",".join("?" * len(req.note_ids))
            seed_rows = await (
                await db.execute(
                    f"SELECT DISTINCT subject_id, class_date FROM notes WHERE id IN ({placeholders})",
                    req.note_ids,
                )
            ).fetchall()
            subject_max: dict[int, str] = {}
            for r in seed_rows:
                sid, cd = r["subject_id"], r["class_date"]
                if sid not in subject_max or cd > subject_max[sid]:
                    subject_max[sid] = cd
            all_rows = []
            for sid, max_date in subject_max.items():
                chunk = await (
                    await db.execute(
                        "SELECT * FROM notes WHERE subject_id = ? AND class_date = ?",
                        (sid, max_date),
                    )
                ).fetchall()
                all_rows.extend(chunk)
            rows = all_rows
        else:
            if not req.note_ids:
                raise HTTPException(400, "note_ids required for custom mode")
            placeholders = ",".join("?" * len(req.note_ids))
            rows = await (
                await db.execute(
                    f"SELECT * FROM notes WHERE id IN ({placeholders})", req.note_ids
                )
            ).fetchall()
    finally:
        await db.close()

    notes = [dict(r) for r in rows]
    background_tasks.add_task(ingest_note_files, notes)
    return {"status": "started", "count": len(notes)}


# ---------------------------------------------------------------------------
# Index stats
# ---------------------------------------------------------------------------

@router.get("/notes/index/stats")
async def index_stats():
    return rag_service.get_index_stats()
