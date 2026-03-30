import time
from typing import Optional
import httpx
from backend.config import NOTES_API_URL, SUBJECT_IDS
from backend.models.note import Note

_cache: dict = {"data": [], "ts": 0.0}
CACHE_TTL = 300  # 5 minutes


async def fetch_notes(subject_id: Optional[int] = None) -> list[dict]:
    now = time.time()
    if now - _cache["ts"] > CACHE_TTL or not _cache["data"]:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(NOTES_API_URL)
            r.raise_for_status()
            raw = r.json()

        # API returns {"notes": [...]}
        items = raw.get("notes", []) if isinstance(raw, dict) else raw
        notes = []
        for item in items:
            try:
                note = Note(
                    notes_id=item["notes_id"],
                    subjectId=item["subjectId"],
                    link=item["link"],
                    notesname=item["notesname"],
                )
                if note.subjectId in SUBJECT_IDS:
                    notes.append(note.model_dump())
            except Exception:
                continue

        _cache["data"] = notes
        _cache["ts"] = now

    data = _cache["data"]
    if subject_id is not None:
        data = [n for n in data if n["subjectId"] == subject_id]
    return data
