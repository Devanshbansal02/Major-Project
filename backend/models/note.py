from pydantic import BaseModel


class Note(BaseModel):
    notes_id: int
    subjectId: int
    link: str
    notesname: str


class Subject(BaseModel):
    id: int
    name: str
    code: str
    color: str
    noteCount: int = 0


class NotePreview(BaseModel):
    notes_id: int
    notesname: str
    extension: str = ""
    file_size_bytes: int = 0
    page_count: int | None = None
    slide_count: int | None = None
    word_count: int = 0
    text_preview: str = ""
    is_embedded: bool = False


class IngestRequest(BaseModel):
    notes_ids: list[int]

