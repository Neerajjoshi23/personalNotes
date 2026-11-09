# file: app/routers/notes.py
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.deps import NoteServiceDep
from app.schemas import NoteCreate, NoteOut, NoteUpdate, Page
from app.services.notes import NoteLimitReached

router = APIRouter(prefix="/api/v1/notes",tags=["notes"])

@router.post("",status_code=status.HTTP_201_CREATED)
def create_note(body: NoteCreate,res:Response,service :NoteServiceDep)->NoteOut:
    try:
         note = service.create(body)
    except NoteLimitReached:
        raise HTTPException(status_code=429)
    res.headers["Location"] = f"/api/v1/notes/{note.id}"
    return NoteOut.model_validate(note)

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id:UUID,service:NoteServiceDep) -> Response:
    deleted = service.delete(note_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="note not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/{note_id}")
def get_note(service: NoteServiceDep,note_id:UUID) -> NoteOut | None:
    note = service.get(note_id)
    if note is None:
        raise HTTPException(status_code=404 , detail="Not found")
    return NoteOut.model_validate(note)
@router.get("")
def list_notes(
    service: NoteServiceDep,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    tag: Annotated[str | None, Query(max_length=30)] = None,
    pinned: Annotated[bool | None, Query()] = None,
) -> Page[NoteOut]:
    notes = service.list(limit, offset, tag.lower() if tag else None, pinned)
    return Page[NoteOut](items=[NoteOut.model_validate(n) for n in notes], limit=limit, offset=offset)

@router.patch("/{note_id}")
def update_note(note_id: UUID, body: NoteUpdate, service: NoteServiceDep) -> NoteOut:
    # only fields the client sent, and null means "no change"
    changes = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    note = service.update(note_id, changes)
    if note is None:
        raise HTTPException(status_code=404, detail="note not found")
    return NoteOut.model_validate(note)
