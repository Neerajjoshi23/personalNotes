"""
======================================================================
 3.py  |  GENERATORS, DATACLASSES, *args/**kwargs, DECORATORS, deepcopy
======================================================================
Why for LLMs: stream big documents lazily, model API responses as typed
objects, forward config options to SDK calls, time / retry / log calls.

Run:  python 3.py

WHAT TO REMEMBER vs JUST RECOGNIZE
  MUST KNOW : @dataclass basics, *args/**kwargs and f(**dict), `yield` idea
  RECOGNIZE : writing decorators yourself (you mostly USE them: @lru_cache, @retry),
              frozen dataclass, keyword-only `*`. Look them up when needed.
  SKIP FOR NOW: decorators with arguments (3 nested levels)
"""

import copy
import math
import time
from dataclasses import dataclass, field
from functools import wraps
from typing import Any, Dict, Generator, List, Optional
from pathlib import Path



# ======================================================================
# 1. GENERATORS  (lazy; produce one value at a time with `yield`)
# ======================================================================
def document_chunker(docs: List[str]) -> Generator[str, None, None]:
    for text in docs:
        yield text.strip()                        # pauses here, resumes on next()


def count_up(limit: int):
    n = 0
    while n < limit:
        yield n
        n += 1


def demo_generators():
    print("\n--- 1. GENERATORS ---")
    gen = document_chunker(["  doc 1  ", "doc 2\n", "  doc 3"])
    print(next(gen))                              # 'doc 1'
    for chunk in gen:                             # continues from where it paused
        print("chunk:", repr(chunk))
    print(list(gen))                              # [] -> generator is CONSUMED, one use only

    squares = (n * n for n in range(5))           # generator EXPRESSION: () not []
    print(sum(squares))                           # 30, never built a full list
    print(list(count_up(3)))


# ======================================================================
# 2. DATACLASSES  (auto __init__, __repr__, __eq__)  ~ TS interface/struct
# ======================================================================
@dataclass
class LLMResponse:
    prompt: str
    completion: str
    tokens_used: int
    metadata: Dict[str, Any] = field(default_factory=dict)   # mutable default => factory!
    stop_reason: Optional[str] = None


@dataclass(frozen=True)                           # frozen = immutable & hashable
class ModelConfig:
    name: str = "gpt-4o-mini"
    temperature: float = 0.7


def demo_dataclasses():
    print("\n--- 2. DATACLASSES ---")
    r = LLMResponse("Hello", "Hi there!", 5, {"latency_ms": 120})
    print(r)
    print(r.completion, r.stop_reason)
    print(r == LLMResponse("Hello", "Hi there!", 5, {"latency_ms": 120}))   # True: value equality

    cfg = ModelConfig(temperature=0.2)
    print(cfg)
    try:
        cfg.temperature = 1.0                     # frozen -> error
    except Exception as e:
        print("frozen:", type(e).__name__)


# ======================================================================
# 3. *args and **kwargs   (JS: ...args, and options-object)
# ======================================================================
def api_wrapper(endpoint: str, *args, **kwargs):
    # args   -> tuple of extra positional values
    # kwargs -> dict of extra keyword values
    temperature = kwargs.get("temperature", 0.7)
    print(f"  endpoint={endpoint} args={args} temp={temperature} opts={list(kwargs)}")


def keyword_only(prompt, *, model="gpt-4o", stream=False):   # `*` forces keywords after it
    return f"{model} stream={stream}: {prompt}"


def demo_args():
    print("\n--- 3. *args / **kwargs ---")
    api_wrapper("https://api.x", "a", "b", temperature=0.2, top_k=50)

    options = {"temperature": 0.1, "top_k": 10}
    api_wrapper("https://api.x", **options)       # ** unpacks dict into keyword args
    print(keyword_only("hi", stream=True))        # keyword_only("hi", "gpt") would fail


# ======================================================================
# 4. DECORATORS  (a function that wraps another function)
# ======================================================================
def timing(func):
    @wraps(func)                                  # keep original __name__ / docstring
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        print(f"  [{func.__name__}] {time.perf_counter() - start:.4f}s")
        return result
    return wrapper


def retry(times: int = 3):                        # decorator WITH arguments: 3 levels
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    print(f"  attempt {attempt} failed: {e}")
                    if attempt == times:
                        raise
        return wrapper
    return decorator


@timing
def parse_tokens():
    time.sleep(0.02)
    return "done"


_counter = {"n": 0}


@retry(times=3)
def unreliable():
    _counter["n"] += 1
    if _counter["n"] < 3:
        raise RuntimeError("temporary failure")
    return "success"


def demo_decorators():
    print("\n--- 4. DECORATORS ---")
    print(parse_tokens())                         # @timing == parse_tokens = timing(parse_tokens)
    print(unreliable())


# ======================================================================
# 5. REFERENCES vs COPIES
# ======================================================================
def demo_copy():
    print("\n--- 5. COPY ---")
    config = {"nested": {"param": 100}}
    alias = config                                # same object
    shallow = dict(config)                        # new outer dict, SAME inner dict
    deep = copy.deepcopy(config)                  # fully independent

    deep["nested"]["param"] = 1
    shallow["nested"]["param"] = 2                # also changes config!
    print(config["nested"]["param"], alias is config, deep["nested"]["param"])  # 2 True 1


if __name__ == "__main__":
    demo_generators()
    demo_dataclasses()
    demo_args()
    demo_decorators()
    demo_copy()


"""
======================================================================
                         KEY TAKEAWAYS
======================================================================
1. `yield` makes a generator: lazy, memory-friendly, usable ONCE.
2. (x for x in it) is a generator expression; [x for x in it] builds a list.
3. @dataclass gives __init__/__repr__/__eq__; use field(default_factory=dict)
   for mutable defaults; frozen=True for immutable configs.
4. *args = tuple of extras, **kwargs = dict of extras; f(**d) unpacks a dict.
5. Parameters after a bare `*` are keyword-only.
6. A decorator takes a function and returns a wrapper; use functools.wraps.
7. Decorator with arguments = function returning a decorator (3 nested levels).
8. Assignment shares references; use copy.deepcopy for nested structures.

======================================================================
                              TASKS
======================================================================
T1. batched(iterable, n): generator yielding lists of n items (embedding
    batches). batched(range(5), 2) -> [0,1] [2,3] [4]
T2. read_lines(path): generator that yields stripped, non-empty lines of a file.
T3. @dataclass ChatMessage(role, content) with a method to_dict(); build a
    list of them and convert to the OpenAI messages format.
T4. Decorator @log_calls that prints function name, args and the return value.
T5. Decorator @cache_result you write yourself (dict keyed by args), no lru_cache.
T6. Predict:  g = (x for x in range(3)); print(list(g), list(g))
    Answer: [0, 1, 2] []
"""
from typing import Generator, List, Any
from pathlib import Path
from dataclasses import dataclass
from functools import wraps
import itertools


def log_calls(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        print(f"Calling {func.__name__} with args={args}, kwargs={kwargs} returned {result}")
        return result
    return wrapper

def batched(iterable, n) -> Generator[List[Any], None, None]:
    # 1. Turn the iterable into an iterator pointer
    iterator = iter(iterable)
    while True:
        # 2. Grab exactly 'n' items from the stream
        batch = list(itertools.islice(iterator, n))
        if not batch:
            break
        yield batch

@log_calls
def giveLine(path: Path) -> Generator[str, None, None]:
    for line in path.read_text().splitlines():
        line = line.strip()
        if line:
            yield line
print(list(batched(range(5), 2)))
print(next(batched({i: i+j for i, j in enumerate(range(5))},2)))

path=Path(__file__).resolve()
print(path)
print(next(giveLine(path)))
# lines =[line.strip() for line in path.read_text().splitlines() if line.strip()]
# print(lines)
@dataclass
class ChatMessage:
    role: str
    content: str
    def to_dict(self) -> dict:
        return {"role": self.role, "content": self.content}

chatm1 = ChatMessage(role="user", content="Hello")
print(chatm1.to_dict())
print(chatm1)
chatm2 = ChatMessage(role="assistant", content="Hi there!")
print(chatm2.to_dict())
print(chatm2)

# very important why we not need an 3 layer stuff here like in retry as there we are passing
# the args in the function itself
def cache_Result(func):
    cache = {}
    @wraps(func)
    def wrapper(*args):
        if args in cache:
            return cache[args]
        result = func(*args)
        cache[args] = result
        return result
    return wrapper