from fastapi import APIRouter, BackgroundTasks, HTTPException

from backend.models.note import IngestRequest
from backend.services import notes_service, rag_service
from backend.services.processor import preview_note, ingest_notes

router = APIRouter()


@router.get("/notes")
async def get_all_notes():
    return await notes_service.fetch_notes()


@router.get("/notes/{subject_id}")
async def get_notes_by_subject(subject_id: int):
    return await notes_service.fetch_notes(subject_id=subject_id)


@router.get("/notes/{notes_id}/preview")
async def preview_note_endpoint(notes_id: int):
    """Download + extract text for a single note. Returns metadata + first 2000 chars."""
    notes = await notes_service.fetch_notes()
    note = next((n for n in notes if n["notes_id"] == notes_id), None)
    if not note:
        raise HTTPException(404, "Note not found")

    preview = await preview_note(note)
    preview["is_embedded"] = rag_service.is_note_embedded(notes_id, note["subjectId"])
    return preview


@router.post("/notes/ingest")
async def ingest_notes_endpoint(req: IngestRequest, background_tasks: BackgroundTasks):
    """Embed selected notes into the RAG index."""
    notes = await notes_service.fetch_notes()
    background_tasks.add_task(ingest_notes, notes, req.notes_ids)
    return {"status": "started", "notes_count": len(req.notes_ids)}


@router.get("/notes/index/stats")
async def index_stats():
    """Return stats about what's currently indexed in ChromaDB."""
    return rag_service.get_index_stats()
