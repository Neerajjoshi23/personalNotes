"""
======================================================================
 7.py  |  PATHLIB, JSON & PYDANTIC — DATA PLUMBING FOR LLM APPS
======================================================================
1.py–6.py covered the LANGUAGE. This file covers the three libraries
every LLM script leans on:
  pathlib  -> find, load and save files (documents, eval results)
  json     -> the wire format of every API call and LLM reply
  pydantic -> validate UNTRUSTED data (user input, LLM output)

Already covered elsewhere (NOT repeated here):
  json.loads/dumps + regex JSON extraction ............ 2.py
  Path.cwd, /, mkdir, exists, .name/.suffix ........... pathandjson.py
  BaseModel hello-world ............................... (old 7.py)

WHAT TO REMEMBER vs JUST RECOGNIZE
  MUST KNOW : Path(__file__).resolve().parent, glob vs rglob, the
              Python<->JSON type map + what does NOT survive a round trip,
              model_validate_json / model_dump(mode="json"), ValidationError
  RECOGNIZE : PurePath, atomic-write pattern, sort_keys cache keys,
              strict mode, field_validator, model_json_schema
  SKIP FOR NOW: custom JSONEncoder subclasses, pydantic generics/unions

Run:  python 7.py        (needs pydantic v2:  pip install pydantic)
"""

import json
import hashlib
from datetime import datetime
from pathlib import Path, PurePath

try:
    from pydantic import (
        BaseModel, ConfigDict, Field, ValidationError, field_validator,
    )
    HAS_PYDANTIC = True
except ImportError:
    HAS_PYDANTIC = False
    print("pydantic not installed:  pip install pydantic  (sections 5-6 skipped)")


# ====================================================================== 
# 1. PATHLIB: A PATH IS AN OBJECT, NOT A STRING
# ====================================================================== 
def demo_path_anatomy():
    print("\n--- 1. PATH ANATOMY ---")
    p = Path("reports") / "run_01.metrics.json"

    # The / operator is overloaded to JOIN parts — OS-safe (\\ on Windows, / elsewhere)
    print("name:", p.name)                 # run_01.metrics.json
    print("stem:", p.stem)                 # run_01.metrics   (only LAST dot-part is suffix)
    print("suffix:", p.suffix)             # .json
    print("suffixes:", p.suffixes)         # ['.metrics', '.json']
    print("parent:", p.parent)             # reports
    print("parts:", p.parts)               # ('reports', 'run_01.metrics.json')
    print("exists:", p.exists())
    # DERIVED paths are new objects — originals never mutate
    print(p.with_suffix(".csv"))           # reports\run_01.metrics.csv
    print(p.with_name("final.json"))       # reports\final.json

    # PurePath = path MATH with zero disk access.
    # Use it to compare/build patterns without touching the filesystem.
    print("match:", PurePath("docs/a.md").match("*.md"))        # True (tests the name)
    # match() is RIGHT-anchored: the pattern only needs to match the END of the path
    print("match:", PurePath("x/y/docs/a.md").match("docs/*.md"))   # True!

    # CONCEPT: strings only store text; Path objects know the RULES of paths.
    # "a" + "\\" + "b" breaks on Linux. Path("a") / "b" never does.


# ====================================================================== 
# 2. PATHLIB: THE cwd TRAP, FINDING FILES, SAFE WRITES
# ====================================================================== 
def demo_cwd_and_discovery():
    print("\n--- 2. cwd TRAP & DISCOVERY ---")
    print("cwd   :", Path.cwd())                       # where YOU launched python
    here = Path(__file__).resolve().parent             # where THIS FILE lives
    print("script:", here)
    # CONCEPT: cwd changes depending on HOW you run (python Basic\7.py vs cd Basic).
    # __file__ never changes. resolve() = make absolute + clean up "..".
    # RULE: always build data paths from __file__, never from cwd.

    data = here / "_demo_data"
    (data / "docs").mkdir(parents=True, exist_ok=True)
    (data / "docs" / "a.txt").write_text("alpha doc", encoding="utf-8")
    (data / "docs" / "b.md").write_text("# beta", encoding="utf-8")
    (data / "c.txt").write_text("gamma", encoding="utf-8")

    print("glob  *.txt:", sorted(p.name for p in data.glob("*.txt")))       # 1 level: c.txt
    print("rglob *.txt:", sorted(p.name for p in data.rglob("*.txt")))      # recursive: a.txt, c.txt
    # rglob("*.txt") == glob("**/*.txt"). Both return GENERATORS — wrap in list/sorted.
    # Gotcha: glob case-sensitivity is OS-dependent (Windows is case-INSENSITIVE).

    f = data / "docs" / "a.txt"
    stat = f.stat()
    print(f"{f.name}: {stat.st_size} bytes, modified {datetime.fromtimestamp(stat.st_mtime):%H:%M:%S}")
    print("is_file:", f.is_file(), "| is_dir:", data.is_dir())
    print("read_bytes:", f.read_bytes()[:5])           # binary: PDFs, images

    # ATOMIC WRITE: write to a temp file, then rename. A crash mid-write can never
    # leave a half-written .json that corrupts your eval results.
    target = data / "report.json"
    tmp = target.with_suffix(".tmp")
    tmp.write_text(json.dumps({"score": 0.9}), encoding="utf-8")
    tmp.replace(target)                                # rename = atomic on same filesystem
    print("atomic write ok:", json.loads(target.read_text(encoding="utf-8")))

    # cleanup
    for child in sorted(data.rglob("*"), reverse=True):
        print("removing:", child)
        if child.is_file():
            child.unlink()
        else:
            child.rmdir()
    data.rmdir()


# ====================================================================== 
# 3. JSON: THE TYPE CONTRACT (what survives a round trip — and what dies)
# ====================================================================== 
def demo_json_type_contract():
    print("\n--- 3. JSON TYPE CONTRACT ---")
    # Python -> JSON -> Python. JSON only has 6 types:
    #   object, array, string, number, true/false, null
    data = {"ok": True, "nothing": None, "tags": ("a", "b"), "n": 3.0}
    text = json.dumps(data)
    back = json.loads(text)
    print("text:", text)                               # true / null lowercase!
    print("tuple became:", type(back["tags"]).__name__)          # list  (tuple does NOT survive)
    print("3.0 stayed:", type(back["n"]).__name__)               # float (has a dot in JSON)

    # These raise TypeError — JSON has no way to represent them:
    #   datetime, Path, set, bytes, your custom objects
    for bad in ({"when": datetime(2026, 1, 1)}, {"p": Path("a.txt")}, {"s": {1, 2}}):
        try:
            json.dumps(bad)
        except TypeError as e:
            print("TypeError:", e)

    # Escape hatch: default= is called for objects json can't handle
    print(json.dumps({"when": datetime(2026, 1, 1), "p": Path("a.txt")}, default=str))

    # GOTCHA #1 with LLM output: a Python dict literal is NOT valid JSON.
    #   single quotes, True/None, trailing commas — all ILLEGAL in JSON.
    llm_said = "{'ok': True, 'err': None,}"
    try:
        json.loads(llm_said)
    except json.JSONDecodeError as e:
        print("decode error at line", e.lineno, "col", e.colno, ":", e.msg)
    # That's why you parse LLM replies with pydantic (section 5-6), not eval().


# ====================================================================== 
# 4. JSON: PRACTICAL PATTERNS (cache keys, unicode, debugging bad JSON)
# ====================================================================== 
def demo_json_patterns():
    print("\n--- 4. JSON PATTERNS ---")

    # sort_keys=True -> semantically-equal dicts produce IDENTICAL strings.
    # Dict order changes nothing; the string becomes a stable cache/fingerprint key.
    k1 = json.dumps({"model": "gpt-4o", "temp": 0.2}, sort_keys=True)
    k2 = json.dumps({"temp": 0.2, "model": "gpt-4o"}, sort_keys=True)
    print("stable key:", k1 == k2)

    def cache_key(payload: dict) -> str:
        blob = json.dumps(payload, sort_keys=True).encode("utf-8")
        return hashlib.sha256(blob).hexdigest()[:16]
    print("cache key:", cache_key({"prompt": "hi", "model": "m"}))

    # ensure_ascii=False keeps real characters (default escapes them to Ā etc.)
    print(json.dumps({"city": "São Paulo"}))
    print(json.dumps({"city": "São Paulo"}, ensure_ascii=False))

    # loads() also accepts bytes (what HTTP clients hand you)
    print(json.loads(b'{"a": 1}'))


# ====================================================================== 
# 5. PYDANTIC: VALIDATION = TYPES THAT ARE ACTUALLY ENFORCED
# ====================================================================== 
def demo_pydantic_validation():
    print("\n--- 5. PYDANTIC: COERCION & ERRORS ---")
    if not HAS_PYDANTIC:
        return

    class Settings(BaseModel):
        model: str                                        # REQUIRED (no default)
        temperature: float = 0.7                          # optional (has default)
        max_tokens: int = Field(default=4096, gt=0, le=128_000)   # rules
        notes: str | None = None                          # optional AND nullable

    # COERCION: JSON arrives as text, so "0.2" -> 0.2 automatically.
    # Type hints (4.py) are editor-only; pydantic ENFORCES them at runtime.
    s = Settings(model="gpt-4o", temperature="0.2")
    print(s, "| temp type:", type(s.temperature).__name__)

    # In v2, `x: int | None` WITHOUT a default is REQUIRED-but-nullable:
    class Ticket(BaseModel):
        assignee: str | None          # must be PROVIDED, may be null
    try:
        Ticket()
    except ValidationError as e:
        print("required-null:", e.errors()[0]["type"])    # missing
    print(Ticket(assignee=None))                          # fine

    # Strict mode turns coercion OFF — for data you must trust exactly
    class StrictCount(BaseModel):
        model_config = ConfigDict(strict=True)
        n: int
    try:
        StrictCount(n="5")
    except ValidationError as e:
        print("strict:", e.errors()[0]["type"])           # int_type

    # e.errors() is a LIST OF DICTS — machine-readable, built for retry loops
    try:
        Settings(temperature=2.5)
    except ValidationError as e:
        for err in e.errors():
            print("  field:", err["loc"], "| problem:", err["msg"])


# ====================================================================== 
# 6. PYDANTIC: STRUCTURED LLM OUTPUT (the reason this library exists here)
# ====================================================================== 
def demo_pydantic_llm_output():
    print("\n--- 6. PYDANTIC: LLM OUTPUT PIPELINE ---")
    if not HAS_PYDANTIC:
        return

    class Citation(BaseModel):
        source: str
        page: int = Field(ge=1)

    class Answer(BaseModel):
        text: str
        confidence: float = Field(ge=0, le=1)
        citations: list[Citation] = []              # NESTED models validate recursively

        @field_validator("text")
        @classmethod
        def text_not_blank(cls, v: str) -> str:
            if not v.strip():
                raise ValueError("answer is blank")
            return v.strip()                        # validators can also CLEAN

    raw = '{"text": "  RAG = retrieval + generation ", "confidence": "0.9", ' \
          '"citations": [{"source": "docs/a.md", "page": 2}]}'
    a = Answer.model_validate_json(raw)
    print(a.text, "| conf:", a.confidence, "| page:", a.citations[0].page)

    # THE SELF-HEALING LOOP: bad output -> feed the errors back -> retry
    def parse_with_retry(raw_json: str, attempts: int = 2):
        for n in range(attempts):
            try:
                return Answer.model_validate_json(raw_json)
            except ValidationError as e:
                print(f"  attempt {n + 1}: {e.errors()[0]['loc']} -> would re-prompt the LLM")
                raw_json = '{"text": "fixed", "confidence": 0.5}'   # pretend LLM fixed it
        return None
    print(parse_with_retry('{"text": "", "confidence": 3}'))        # 2 violations, then fixed

    # DUMP GOTCHA: model_dump() is PYTHON mode — datetime/Path stay as objects
    class Event(BaseModel):
        at: datetime
    e = Event(at=datetime(2026, 1, 1, 12, 0))
    try:
        json.dumps(e.model_dump())                  # TypeError: datetime not serializable
    except TypeError:
        print("model_dump() + json.dumps -> TypeError")
    print(e.model_dump(mode="json"))                # {'at': '2026-01-01T12:00:00'}
    print(e.model_dump_json())                      # straight to JSON text
    print(a.model_dump(mode="json", exclude_none=True))   # exclude_none drops null fields

    # JSON SCHEMA: hand this to the API so the model is CONSTRAINED to your shape
    print("schema fields:", list(Answer.model_json_schema()["properties"]))
    # OpenAI: client.beta.chat.completions.parse(..., response_format=Answer)
    # The API uses Answer.model_json_schema() under the hood; pydantic validates the reply.


if __name__ == "__main__":
    demo_path_anatomy()
    demo_cwd_and_discovery()
    demo_json_type_contract()
    demo_json_patterns()
    demo_pydantic_validation()
    demo_pydantic_llm_output()


"""
======================================================================
                         KEY TAKEAWAYS
======================================================================
1. Path is an object: / joins, .stem/.suffix/.parent decompose,
   with_suffix/with_name derive new paths. PurePath = math without disk.
2. cwd depends on HOW you launched python; __file__ doesn't. Build data
   paths from Path(__file__).resolve().parent.
3. glob = one level, rglob = recursive; both return generators.
4. Atomic write: write .tmp then .replace(target) — no half-written files.
5. JSON has 6 types. Round trip loses tuple->list and kills
   datetime/Path/set/bytes unless you pass default=.
6. Python dict literal != JSON: single quotes, True/None, trailing commas
   are the top reasons LLM output breaks json.loads.
7. json.dumps(..., sort_keys=True) = stable fingerprint for cache keys.
8. Pydantic enforces types at runtime and COERCES text ("0.2" -> 0.2);
   ConfigDict(strict=True) disables coercion. e.errors() is machine-readable.
9. `x: T | None` without a default is REQUIRED-but-nullable in v2.
10. Structured output loop: model_validate_json -> on ValidationError feed
    errors back into the prompt -> retry. model_dump(mode="json") or
    model_dump_json() before json.dumps. model_json_schema() -> the API.

======================================================================
                              TASKS
======================================================================
T1. find_large_files(folder, min_bytes): rglob("*"), keep is_file() entries
    with stat().st_size > min_bytes, return them sorted biggest-first.
T2. save_report(data: dict, path: Path): atomic write via .tmp + replace.
    Assert afterwards that no .tmp file remains next to the target.
T3. This LLM reply fails json.loads THREE ways — name them, then fix it:
        result = {'score': 0.9, 'ok': True, 'err': None,}
T4. Model Chunk(text: str — reject blank via field_validator,
    tokens: int = Field(gt=0), source: Path). model_validate a list of
    dicts, catching ValidationError PER ITEM so one bad row can't kill
    the batch. Print how many passed.
T5. Predict (don't run): json.dumps({"p": Path("a.txt"), "t": (1, 2)},
    default=str) — what do the Path and the tuple become?
    Answer: "a.txt" (via default=str) and [1, 2] (tuple -> array natively).
T6. Predict: which of these can be json.dumps'ed, and why?
        Event.model_dump()  vs  Event.model_dump(mode="json")
    Answer: only mode="json" — default dump keeps datetime as an object.
"""
def find_large_files(folder: Path, min_bytes: int) -> list[Path]:
    result = []
    for child in folder.rglob("*"):
        if child.is_file() and child.stat().st_size > min_bytes:
            result.append(child)

    return sorted(result, key=lambda x:x.stat().st_size, reverse=True)

def save_report(data:dict,path :Path):
    temp_path=path.with_suffix(path.suffix + ".tmp")
    temp_path.write_text(json.dumps(data, sort_keys=True))
    temp_path.replace(path)
    assert not temp_path.exists()
    assert path.exists()

class Chunk(BaseModel):
    text: str
    tokens: int = Field(gt=0)
    source: Path
    @field_validator("text")
    @classmethod
    def reject_blank_text(cls, v):
        if not v.strip():
            raise ValueError("text cannot be blank")
        return v

def model_validate(data:list[dict]) -> list[Chunk]:
    result=[]
    for chunk in data:
        try:
            result.append(Chunk.model_validate(chunk))
        except ValidationError as e:
            print(f"Validation error for chunk {chunk}: {e}")
    print(f"{len(result)} chunks passed validation out of {len(data)}")
    return result
model_validate([{"text": "example", "tokens": 5, "source": Path("a.txt")},{"text": "", "tokens": 3, "source": Path("b.txt")},{"text": "another example", "tokens": 4, "source": Path("c.txt")}])

def LLm_reply_fails_json_loads():
    # THE 3 REASONS this LLM reply string breaks json.loads:
    llm_said = "{'score': 0.9, 'ok': True, 'err': None,}"
    #   1. single quotes '  -> JSON requires double quotes "
    #   2. True / None       -> JSON requires lowercase true / null
    #   3. trailing comma ,} -> JSON allows no trailing commas
    try:
        json.loads(llm_said)
    except json.JSONDecodeError as e:
        print(f"json.loads failed: {e.msg} (line {e.lineno} col {e.colno})")

    # THE FIX: you never repair quotes/commas by hand. Two options:

    # Option A (prevention): constrain the LLM at generation time so the
    # reply is VALID JSON, then let pydantic validate VALUES:
    class Score(BaseModel):
        score: float = Field(ge=0, le=1)
        ok: bool
        err: str | None

    # OpenAI structured outputs (the real fix — no parse errors possible):
    #   client.beta.chat.completions.parse(..., response_format=Score)
    # It sends Score.model_json_schema() to the API; the model is FORCED
    # to emit valid JSON matching the schema.
    print("schema sent to API:", Score.model_json_schema()["properties"])

    # Option B (fallback): valid JSON string -> model_validate_json does
    # coercion + range checks + null handling for you:
    valid_reply = '{"score": "0.9", "ok": true, "err": null}'
    s = Score.model_validate_json(valid_reply)
    print(f"validated: score={s.score} ({type(s.score).__name__}), ok={s.ok}, err={s.err}")

    # On ValidationError: feed e.errors() back into the next prompt and
    # retry (self-healing loop, see section 6 parse_with_retry).