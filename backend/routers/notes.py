from fastapi import APIRouter, BackgroundTasks
from backend.services import notes_service
from backend.services.processor import ingest_all

router = APIRouter()


@router.get("/notes")
async def get_all_notes():
    return await notes_service.fetch_notes()


@router.get("/notes/{subject_id}")
async def get_notes_by_subject(subject_id: int):
    return await notes_service.fetch_notes(subject_id=subject_id)


@router.post("/notes/ingest")
async def ingest_notes(background_tasks: BackgroundTasks):
    background_tasks.add_task(ingest_all)
    return {"status": "started"}
