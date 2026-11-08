# file: app/deps.py
from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from app.config import Settings
from app.services.notes import InMemoryNoteRepo, NoteService


@lru_cache
def get_settings() -> Settings:
    # Created once. If config values are invalid, this raises immediately at startup.
    return Settings()


# ONE permanent store instance locked to the process lifespan module-space
_repo = InMemoryNoteRepo()


def get_repo() -> InMemoryNoteRepo:
    return _repo


# Type aliases using Annotated keeps your endpoint code ultra-clean
SettingsDep = Annotated[Settings, Depends(get_settings)]
RepoDep = Annotated[InMemoryNoteRepo, Depends(get_repo)]


def get_note_service(repo: RepoDep, settings: SettingsDep) -> NoteService:
    # Cheaply built per incoming request, pulling from pre-loaded settings & repository
    return NoteService(repo, settings.max_notes)


# This is the master dependency injection token for your routers
NoteServiceDep = Annotated[NoteService, Depends(get_note_service)]
