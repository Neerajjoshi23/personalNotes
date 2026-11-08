from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_TAGS = 10

def _clean_tags(tags:list[str])->list[str]:
    """Lowercase, trim, drop empty ones, remove duplicates, keep a stable order."""
    clean_tags=sorted({tag.strip().lower() for tag in tags if tag.strip()})
    if(len(clean_tags) >MAX_TAGS):
        raise ValueError(f"at max {MAX_TAGS} are allowed")
    for tag in clean_tags:
        if(len(tag) >30):
            raise ValueError("length of tag must be within 30 characters")
    return clean_tags

    
class NoteCreate(BaseModel):
    """What a client may send to create a note. No id, 
    no timestamps: the server owns those."""
    model_config= ConfigDict(extra="forbid",str_strip_whitespace=True)

    title:str =Field(min_length=1,max_length=200)
    body:str =Field(default="",max_length=20000)
    pinned:bool =False
    tags: list[str]=Field(default_factory=list)

    @field_validator("tags")
    @classmethod
    def clean_tag(cls, tags:list[str]) -> list[str]:
        print(tags)
        return _clean_tags(tags)

class NoteUpdate(BaseModel):
    """PATCH body: every field is optional. Only the fields the client sends are changed."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str | None = Field(default=None, min_length=1, max_length=200)
    body: str | None = Field(default=None, max_length=20_000)
    tags: list[str] | None = None
    pinned: bool | None = None

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, tags: list[str] | None) -> list[str] | None:
        return None if tags is None else _clean_tags(tags)

        
class NoteOut(BaseModel):

    """What the client gets back. Anything not listed here can 
    never leak."""
    model_config = ConfigDict(from_attributes=True)   # read from object attributes, not only dicts
    id: UUID
    title: str
    body: str
    tags: list[str]
    pinned: bool
    created_at: datetime
    updated_at: datetime

class Page[T](BaseModel):
    """A page of results. Page[NoteOut] is 'a page of notes' (Python 3.12 generic syntax)."""

    items: list[T]
    limit: int
    offset: int

if __name__ == "__main__":
    n1=NoteCreate(title="  Groceries  ", tags=["Food", " food ", "HOME"])
    # title='Groceries' body='' tags=['food', 'home'] pinned=False
    print(n1)
    # NoteCreate(title="")                     # ValidationError: string_too_short
    # NoteCreate(title="x", owner="me")        # ValidationError: extra_forbidden
    # NoteCreate(title="x", pinned="yes")      # pinned=True  (lax conversion!)
    # NoteCreate(title="x", pinned="banana")   # ValidationError: bool_parsing
    n2=NoteUpdate(title="New").model_dump(exclude_unset=True)   # {'title': 'New'}  (section 5 uses this)
    print(n2)   


     