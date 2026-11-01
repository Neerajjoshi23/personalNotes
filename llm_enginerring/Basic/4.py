"""
======================================================================
 4.py  |  REMAINING IDIOMS: logging, env vars, functional helpers,
       |  modern typing, strings/templates, datetime
======================================================================
Run:  python 4.py

WHAT TO REMEMBER vs JUST RECOGNIZE
  MUST KNOW : os.getenv, f-strings / triple-quoted prompts, `a or b` fallback,
              basic logging (log.info)
  RECOGNIZE : partial, chain, islice, groupby, reduce, TypedDict/Literal,
              datetime formatting, // floor division
  SKIP FOR NOW: reduce, groupby (rare in LLM code)
"""

import logging
import os
from datetime import datetime, timezone
from functools import partial, reduce
from itertools import chain, islice, groupby
from typing import Literal, Optional, TypedDict

from dataclasses import dataclass, field



# ======================================================================
# 1. LOGGING instead of print (levels, timestamps, filtering)
# ======================================================================
logging.basicConfig(
    filename="app.log",
    filemode="a",  # 'a' appends to the file, 'w' overwrites it each time
    level=logging.INFO,
    format="%(levelname)s | %(name)s | %(message)s"
)
log = logging.getLogger("pipeline")


def demo_logging():
    print("\n--- 1. LOGGING ---")
    log.debug("hidden: level is INFO")            # filtered out
    log.info("pipeline started")
    log.warning("rate limit near")
    try:
        1 / 0
    except ZeroDivisionError:
        log.exception("caught error with traceback")   # logs full traceback
    # Rule of thumb: print = quick debug, logging = anything you keep.


# ======================================================================
# 2. ENVIRONMENT VARIABLES & SECRETS
# ======================================================================
def demo_env():
    print("\n--- 2. ENV VARS ---")
    os.environ["DEMO_KEY"] = "sk-demo"            # set in this process only
    key = os.getenv("DEMO_KEY", "missing")        # default if not set
    print("present?", key != "missing")
    print("masked:", key[:3] + "***")             # NEVER print full keys
    # Real projects: put keys in a `.env` file (and add it to .gitignore), then
    #   from dotenv import load_dotenv; load_dotenv(override=True)
    #   os.getenv("OPENAI_API_KEY")   (see 7.py)


# ======================================================================
# 3. FUNCTIONAL HELPERS: partial, chain, islice, reduce, map/filter
# ======================================================================
def demo_functional():
    print("\n--- 3. FUNCTIONAL ---")
    pow2 = partial(pow, 2)                        # pre-fill first arg: pow(2, x)
    print(pow2(10))                               # 1024

    print(list(chain([1, 2], [3, 4])))            # flatten/concat iterables
    print(list(islice(range(100), 3)))            # first 3 only, lazy (works on generators)
    print(reduce(lambda a, b: a + b, [1, 2, 3]))  # 6 (rarely needed; sum() is clearer)
    print(list(map(str.upper, ["a", "b"])), list(filter(None, [0, 1, "", "x"])))
    # Prefer comprehensions over map/filter in most code.

    words = sorted(["apple", "avocado", "banana", "blueberry"])
    for letter, group in groupby(words, key=lambda w: w[0]):   # input MUST be sorted
        print(letter, list(group))


# ======================================================================
# 4. MODERN TYPING (3.10+) and TypedDict / Literal
# ======================================================================
Role = Literal["system", "user", "assistant"]


class Message(TypedDict):                         # dict with known keys (editor help only)
    role: Role
    content: str


def make_message(role: Role, content: str, name: Optional[str] = None) -> Message:
    return {"role": role, "content": content}


def first_or_none(xs: list[str]) -> str | None:   # list[str], str | None = modern syntax
    return xs[0] if xs else None


def demo_typing():
    print("\n--- 4. TYPING ---")
    print(make_message("user", "hello"))
    print(first_or_none([]), first_or_none(["a"]))
    # Hints are NOT enforced at runtime. Pydantic (7.py) enforces them.


# ======================================================================
# 5. STRING TEMPLATES & MULTI-LINE PROMPTS
# ======================================================================
def demo_strings():
    print("\n--- 5. PROMPT TEMPLATES ---")
    question, context = "What is RAG?", "RAG = retrieval augmented generation"

    prompt = f"""You are a helpful assistant.
Context: {context}
Question: {question}
Answer briefly."""
    print(prompt)

    template = "Hello {name}, you are {age}."
    print(template.format(name="Ana", age=30))
    print(template.format(**{"name": "Bo", "age": 5}))        # dict -> keywords
    print("Hello {name}".format_map({"name": "Cy"}))
    print(f"{3.14159:.2f} | {1234567:,} | {'x':>5} | {7:03d}")   # number/align formatting
    print("a\tb\\n", r"raw \n stays")             # escape vs raw string
    # Gotcha: f-strings with literal braces (JSON) need doubling: f"{{'a': {1}}}"


# ======================================================================
# 6. DATES & IDs
# ======================================================================
def demo_datetime():
    print("\n--- 6. DATETIME ---")
    now = datetime.now(timezone.utc)
    print(now.isoformat(timespec="seconds"))
    print(now.strftime("%Y-%m-%d %H:%M"))
    print(datetime.fromisoformat("2026-01-02T03:04:05").year)


# ======================================================================
# 7. MISC: ternary, chained compare, integer ops, `in`, truthiness
# ======================================================================
def demo_misc():
    print("\n--- 7. MISC ---")
    print(7 // 2, 7 % 2, 2 ** 10, -7 // 2)        # 3 1 1024 -4 (floor division!)
    x = 0.5
    print(0 < x < 1)                              # chained comparison
    print("active" if x else "idle")              # ternary
    print([] or "default", None or 0 or "last")   # `or` returns first truthy value
    name = None
    print(name or "anonymous", (name or "x").upper())


if __name__ == "__main__":
    demo_logging()
    demo_env()
    demo_functional()
    demo_typing()
    demo_strings()
    demo_datetime()
    demo_misc()


"""
======================================================================
                         KEY TAKEAWAYS
======================================================================
1. logging has levels (DEBUG < INFO < WARNING < ERROR); log.exception adds traceback.
2. os.getenv(name, default) reads env vars; secrets live in .env, never in code/git.
3. partial pre-fills args; chain joins iterables; islice slices lazily.
4. list[str], dict[str, int], str | None are modern hints; TypedDict/Literal
   document message shapes. Not enforced at runtime.
5. Triple-quoted f-strings build prompts; .format(**dict) fills templates;
   :.2f, :, :03d format numbers.
6. // floors (-7 // 2 == -4); chained compare 0 < x < 1; `a or b` = fallback value.
7. Use timezone-aware datetimes (timezone.utc); isoformat() for logs/JSON.

======================================================================
                              TASKS
======================================================================
T1. Configure logging to also write to a file "app.log" (hint: FileHandler or
    basicConfig(filename=...)).
T2. get_env(name, required=True): return the variable or raise a clear
    RuntimeError naming the missing variable.
T3. build_prompt(system, context_chunks, question): return a multi-line prompt
    listing chunks as "1. ...", "2. ..." (enumerate + "\\n".join).
T4. Predict:  print(0 or "" or None or "end", [] and 5)
    Answer: end []
T5. Define Message TypedDict list and write to_openai(msgs) that drops any
    message with empty content.
"""
# for first task we have log object we just need to write to a file as well using FileHandler or basicConfig(filename=...)
# see top of file
def get_env(name: str, required: bool = True) -> str:
    value = os.getenv(name)
    if required and value is None:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value

def build_prompt(system: str, context_chunks: list[str], question: str) -> str:
    cleaned_chunk_list: list[str] = []
    for i ,chunk in enumerate(context_chunks,1):
        cleaned_chunk_list.append(f"{i}. {chunk.strip()}")
    return f"System: {system}\n\nContext:\n{'\n'.join(cleaned_chunk_list)}\nQuestion: {question}"

@dataclass  
class Message:
    role: str
    content: str
@dataclass
class Messages:
    items: list[Message] = field(default_factory=list)
    def to_openai(self) -> list[Message]:
        return [msg for msg in self.items if msg.content.strip()]

messages = Messages()
messages.items.extend([
    Message(role="system", content="You are a helpful assistant."),
    Message(role="user", content="What is the capital of France?"),
    Message(role="assistant", content="   ")
])
print(messages.to_openai())