# file: app/deps.py
import time
from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from app.config import Settings
from app.services.notes import InMemoryNoteRepo, NoteService


@lru_cache
def get_settings() -> Settings:
    start = time.perf_counter() 
    # Created once. If config values are invalid, this raises immediately at startup.
    time.sleep(0.1)  # simulate a slow database
    end = time.perf_counter()   
    print(f"get_settings() took {end - start:.3f} seconds")
    return Settings()


# ONE permanent store instance locked to the process lifespan module-space
_repo = InMemoryNoteRepo()


def get_repo() -> InMemoryNoteRepo:
    start = time.perf_counter()
    # Created once. If config values are invalid, this raises immediately at startup.
    time.sleep(0.1)  # simulate a slow database
    end = time.perf_counter()   
    print(f"get_repo() took {end - start:.3f} seconds")
    return _repo


# Type aliases using Annotated keeps your endpoint code ultra-clean
SettingsDep = Annotated[Settings, Depends(get_settings)]
RepoDep = Annotated[InMemoryNoteRepo, Depends(get_repo)]


def get_note_service(repo: RepoDep, settings: SettingsDep) -> NoteService:
    # Cheaply built per incoming request, pulling from pre-loaded settings & repository
    return NoteService(repo, settings.max_notes)


# This is the master dependency injection token for your routers
NoteServiceDep = Annotated[NoteService, Depends(get_note_service)]
