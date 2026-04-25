import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.db import get_db
from backend.routers.auth import require_faculty

router = APIRouter()
logger = logging.getLogger(__name__)


class SubjectIn(BaseModel):
    name: str
    code: str
    color: str = "#6366f1"


@router.get("/faculty/subjects")
async def list_subjects(faculty_id: int = Depends(require_faculty)):
    db = await get_db()
    try:
        rows = await (
            await db.execute(
                "SELECT id, name, code, color FROM subjects WHERE faculty_id = ? ORDER BY id",
                (faculty_id,),
            )
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.post("/faculty/subjects", status_code=201)
async def create_subject(body: SubjectIn, faculty_id: int = Depends(require_faculty)):
    if not body.name.strip():
        raise HTTPException(400, "Subject name is required")
    if not body.code.strip():
        raise HTTPException(400, "Subject code is required")

    db = await get_db()
    try:
        cur = await db.execute(
            "INSERT INTO subjects (faculty_id, name, code, color) VALUES (?, ?, ?, ?)",
            (faculty_id, body.name.strip(), body.code.strip().upper(), body.color),
        )
        await db.commit()
        return {"id": cur.lastrowid, "name": body.name, "code": body.code.upper(), "color": body.color}
    finally:
        await db.close()


@router.put("/faculty/subjects/{subject_id}")
async def update_subject(
    subject_id: int,
    body: SubjectIn,
    faculty_id: int = Depends(require_faculty),
):
    db = await get_db()
    try:
        result = await db.execute(
            "UPDATE subjects SET name=?, code=?, color=? WHERE id=? AND faculty_id=?",
            (body.name.strip(), body.code.strip().upper(), body.color, subject_id, faculty_id),
        )
        await db.commit()
        if result.rowcount == 0:
            raise HTTPException(404, "Subject not found or not yours")
        return {"ok": True}
    finally:
        await db.close()


@router.delete("/faculty/subjects/{subject_id}")
async def delete_subject(subject_id: int, faculty_id: int = Depends(require_faculty)):
    db = await get_db()
    try:
        result = await db.execute(
            "DELETE FROM subjects WHERE id = ? AND faculty_id = ?",
            (subject_id, faculty_id),
        )
        await db.commit()
        if result.rowcount == 0:
            raise HTTPException(404, "Subject not found or not yours")
        return {"ok": True}
    finally:
        await db.close()
