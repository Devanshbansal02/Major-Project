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
