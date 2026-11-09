import threading
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.errors import NotFound, TooManyRequests
from app.schemas import NoteCreate


def now() -> datetime:
    return datetime.now(UTC)   # always timezone-aware UTC; convert to local time only in the UI

class NoteLimitReached(TooManyRequests):
    def __init__(self, detail: str = "note limit reached, delete a note first") -> None:
        super().__init__(detail)


class NoteNotFound(NotFound):
    def __init__(self, detail: str = "note not found") -> None:
        super().__init__(detail)
@dataclass
class Note:
    """Our internal note. 
    Session 3 replaces this with a database model."""

    title: str
    body: str = ""
    tags: list[str] = field(default_factory=list)
    pinned: bool = False
    id: UUID = field(default_factory=uuid4)          # random id, safe to show in URLs
    created_at: datetime = field(default_factory=now)
    updated_at: datetime = field(default_factory=now)

class InMemoryNoteRepo:
    """Stores notes in a dict.
     One instance per process, shared by all requests."""

    def __init__(self):
        self._notes:dict[UUID,Note]={}
        self._lock=threading.Lock()
    def add_if_below(self,newNote:Note, limit:int):
        with self._lock:
            if len(self._notes)>=limit:
                return None
            self._notes[newNote.id] = newNote
        return newNote
    def add(self,newNote:Note):
        with self._lock:
            self._notes[newNote.id]=newNote
        return newNote

    def get(self,note_id:UUID)-> Note | None:
        return self._notes.get(note_id)
    def count(self) -> int:
        with self._lock:
            return len(self._notes)
    def list(self, limit: int, offset: int, tag: str | None , pinned: bool | None,sort : str | None) -> list[Note]:
        with self._lock:
            notes = list(self._notes.values())   # copy, so sorting below is safe
        if tag:
            notes = [n for n in notes if tag in n.tags]
        if pinned is not None:
            notes = [n for n in notes if n.pinned == pinned]
        # pinned first, then newest first
        if sort is None or sort == "updated":
            notes.sort(key=lambda n: (not n.pinned, -n.updated_at.timestamp()))
        else :
           notes.sort(key=lambda n: (not n.pinned, -n.created_at.timestamp()))
        return notes[offset : offset + limit]
    def delete(self,note_id:UUID):
        with self._lock:
            status=self._notes.pop(note_id,None)
        return status is not None


class NoteService:
    """The core engine rules of NoteMind.

    Enforces business logic validations entirely independent of HTTP.
    """

    def __init__(self, repo: InMemoryNoteRepo, max_notes: int) -> None:
        self.repo = repo
        self.max_notes = max_notes

    def create(self, data: NoteCreate) -> Note:
       time.sleep(0.1)  # simulate a slow database
       node = self.repo.add_if_below(Note(title=data.title, body=data.body, tags=data.tags, pinned=data.pinned), self.max_notes)
       if node is None:
           raise NoteLimitReached(f"Cannot create more than {self.max_notes} notes")
       return node
    def get(self,id:UUID)-> Note|None:
        note = self.repo.get(id)
        if note is None:
            raise NoteNotFound()
        return note

    def count(self)->int:
        return self.repo.count()
    def list(self, limit: int, offset: int, tag: str | None, pinned: bool | None, sort: str | None) -> list[Note]:
        return self.repo.list(limit, offset, tag, pinned, sort)

    def delete(self, note_id: UUID) -> bool:
        deleted = self.repo.delete(note_id)
        if not deleted:
            raise NoteNotFound()
        return deleted
    def update(self,note_id:UUID,changes:dict):
        note = self.get(note_id)
        for key, value in changes.items():
            if hasattr(note, key):
                setattr(note, key, value)

        note.updated_at = now()
        return note