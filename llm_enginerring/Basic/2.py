"""
======================================================================
 2.py  |  PRODUCTION IDIOMS FOR LLM & RAG WORKFLOWS
======================================================================
Slicing/chunking, unpacking, sorting with key, any/all, collections,
retry with backoff, context managers, file I/O, regex, caching, walrus.

Run:  python 2.py

WHAT TO REMEMBER vs JUST RECOGNIZE
  MUST KNOW : slicing, key=lambda sorting, Counter/defaultdict, try/except, `with`,
              json.loads/dumps
  RECOGNIZE : regex (copy the ```json pattern, or ask an LLM to write it),
              lru_cache, walrus, deque, @contextmanager
"""

import json
import re
import time
from collections import Counter, defaultdict, deque
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path


# ======================================================================
# 1. SLICING & CHUNKING   seq[start:stop:step]  (stop is EXCLUSIVE)
# ======================================================================
def demo_slicing():
    print("\n--- 1. SLICING & CHUNKING ---")
    items = [10, 20, 30, 40, 50]
    print(items[1:3], items[-2:], items[:2], items[::-1])  # [20,30] [40,50] [10,20] reversed

    text = "abcdefghij"
    fixed = [text[i:i + 4] for i in range(0, len(text), 4)]    # no overlap
    overlap = [text[i:i + 4] for i in range(0, len(text), 3)]  # size 4, step 3 -> overlap 1
    print(fixed, overlap)


# ======================================================================
# 2. UNPACKING & DICT MERGING   (JS spread  ...)
# ======================================================================
def demo_unpacking():
    print("\n--- 2. UNPACKING & MERGING ---")
    first, *middle, last = [1, 2, 3, 4, 5]        # middle = [2, 3, 4]
    print(first, middle, last)

    base = {"model": "gpt-4o", "temperature": 0.7}
    a = {**base, "temperature": 0.0}              # works on every Python 3
    b = base | {"max_tokens": 100}                # 3.9+ union; right side wins
    print(a, b)

    history = [{"role": "system", "content": "hi"}] + [{"role": "user", "content": "yo"}]
    print(len(history))                           # list + list = concatenate


# ======================================================================
# 3. sorted / max / min WITH key=   (no comparator functions)
# ======================================================================
def demo_sorting():
    print("\n--- 3. SORTING WITH key= ---")
    docs = [("doc_a", 0.23), ("doc_b", 0.95), ("doc_c", 0.51)]
    top2 = sorted(docs, key=lambda d: d[1], reverse=True)[:2]  # top-k by score
    best = max(docs, key=lambda d: d[1])
    print(top2)    # [('doc_b', 0.95), ('doc_c', 0.51)]
    print(best)    # ('doc_b', 0.95)
    # lambda d: d[1] = tiny anonymous function "given d, return d[1]"


# ======================================================================
# 4. any / all / sum  with generator expressions (lazy, no brackets)
# ======================================================================
def demo_any_all():
    print("\n--- 4. any / all / sum ---")
    scores = [0.1, 0.8, 0.95]
    print(any(s > 0.9 for s in scores))           # stops at first True
    print(all(s >= 0 for s in scores))            # stops at first False
    print(sum(scores) / len(scores))              # mean


# ======================================================================
# 5. collections: Counter, defaultdict, deque
# ======================================================================
def demo_collections():
    print("\n--- 5. COLLECTIONS ---")
    tokens = "the user prompt matches the system prompt".split()   # split() = on whitespace
    # "a,b".split(",") splits on a comma instead.
    counts = Counter(tokens)                      # frequency map
    print(counts.most_common(2))                  # [('the', 2), ('prompt', 2)]

    groups = defaultdict(list)                    # missing key -> auto empty list
    for word in ["apple", "avocado", "banana"]:
        groups[word[0]].append(word)
    print(dict(groups))

    memory = deque(maxlen=3)                      # sliding window chat memory
    for i in range(5):
        memory.append(f"msg_{i}")
    print(list(memory))                           # ['msg_2', 'msg_3', 'msg_4']


# ======================================================================
# 6. EXCEPTIONS + RETRY WITH EXPONENTIAL BACKOFF (API rate limits)
# ======================================================================
def retry(fn, attempts=4, base_delay=0.01):
    for n in range(attempts):
        try:
            return fn()
        except ConnectionError as e:              # catch SPECIFIC errors only
            print(f"  attempt {n + 1} failed: {e}")
            if n == attempts - 1:
                raise                             # bare raise = re-throw original error
            time.sleep(base_delay * 2 ** n)       # waits 1x, 2x, 4x ...


def always_down():
    raise ConnectionError("down")


def demo_retry():
    print("\n--- 6. RETRY ---")
    calls = {"n": 0}

    def flaky():                                  # fails twice, then works
        calls["n"] += 1
        if calls["n"] < 3:
            raise ConnectionError("rate limited")
        return "ok"

    print("result:", retry(flaky))

    try:
        retry(always_down, attempts=2)
    except ConnectionError:
        print("gave up after retries")

    # Full form:  try / except / else / finally
    try:
        int("12")
    except ValueError:
        print("bad number")
    else:
        print("else runs only if NO error")
    finally:
        print("finally ALWAYS runs")


# ======================================================================
# 7. CONTEXT MANAGERS (`with`) + FILE I/O WITH pathlib
# ======================================================================
@contextmanager
def timer(label: str):
    start = time.perf_counter()
    try:
        yield                                     # your `with` body runs here
    finally:
        print(f"  [{label}] took {time.perf_counter() - start:.4f}s")


def demo_context_and_files():
    print("\n--- 7. CONTEXT MANAGERS & FILES ---")
    path = Path("_tmp_demo.json")
    with path.open("w", encoding="utf-8") as f:   # auto-closes the file
        json.dump({"k": [1, 2, 3]}, f, indent=2)
    data = json.loads(path.read_text(encoding="utf-8"))   # json.loads(str) -> dict
    print(data, "| dumps ->", json.dumps(data))   # json.dumps(obj) -> str
    path.unlink()                                 # delete

    with timer("sum"):
        sum(range(100_000))


# ======================================================================
# 8. REGEX: extract JSON from an LLM markdown reply
# ======================================================================
def demo_regex():
    print("\n--- 8. REGEX ---")
    reply = 'Answer: ```json\n{"metrics": [1, 2]}\n``` end'
    m = re.search(r"```json\s*(.*?)\s*```", reply, re.DOTALL)  # r"" raw string; DOTALL: . matches \n
    print(json.loads(m.group(1)) if m else None)
    print(re.findall(r"[a-z']+", "Hello, World! It's me".lower()))  # all words
    # (.*?) = lazy capture group; \s = whitespace; group(1) = first () capture


# ======================================================================
# 9. CACHING & WALRUS
# ======================================================================
@lru_cache(maxsize=128)                           # memoize: same input -> cached output
def expensive_len(text: str) -> int:
    print("  computing...")
    return len(text)


def demo_cache_walrus():
    print("\n--- 9. CACHE & WALRUS ---")
    expensive_len("hello")
    expensive_len("hello")                        # "computing..." printed only once
    tokens = "a b c d e f".split()
    if (n := len(tokens)) > 5:                    # assign + test in one expression
        print(f"{n=} is large")                   # f"{x=}" prints "n=6"


if __name__ == "__main__":
    demo_slicing()
    demo_unpacking()
    demo_sorting()
    demo_any_all()
    demo_collections()
    demo_retry()
    demo_context_and_files()
    demo_regex()
    demo_cache_walrus()


"""
======================================================================
                         KEY TAKEAWAYS
======================================================================
1. Slice [start:stop:step]: stop exclusive, negatives from the end, [::-1] reverses.
2. Chunking = range(0, len, step) + slice. Overlap = size - step.
3. {**a, **b} or a | b merges dicts (right wins). first, *rest = seq unpacks.
4. sorted/max/min accept key=lambda x: ...  -> top-k retrieval in one line.
5. Counter counts, defaultdict(list) groups, deque(maxlen=n) is a sliding window.
6. Retry: try/except SPECIFIC error, sleep base * 2**n, bare `raise` on the last try.
7. `with` guarantees cleanup; @contextmanager + yield builds your own.
8. pathlib: Path.read_text / write_text / exists / unlink. json.loads / dumps.
9. Regex: r"" strings, re.DOTALL, (.*?) lazy capture, group(1).
10. @lru_cache memoizes pure functions; := assigns inside expressions.

======================================================================
                              TASKS
======================================================================
T1. chunk_text(text, size, overlap) -> list of chunks with overlap.
    chunk_text("abcdefghij", 4, 1) -> ['abcd','defg','ghij','j']
T2. top_words(text): 3 most common lowercase words, ignoring punctuation.
    (re.findall + Counter)
T3. trim_history(messages, n): keep system messages + last n others.
T4. group_by_role(messages) -> {"user": [contents], "assistant": [contents]}
    using defaultdict.
T5. extract_json(reply) -> dict | None: first {...} in text, None on bad JSON.
T6. Predict:  d={"a":1}; print(d.get("b"), d.setdefault("b",5), d)
    Answer: None 5 {'a': 1, 'b': 5}
"""
def chunk_text(text: str, size: int, overlap: int) -> list:
    # [text[i:i+size] for i in range(0, len(text), size-overlap)] would be a one-liner alternative
    chunks=[]
    i=0
    while i<len(text):
        chunks.append(text[i:i+size])
        i+=(size-overlap)
    return chunks

def top_words(text: str) -> list:
     words = re.findall(r"\b\w+\b", text.lower())
     most_common = Counter(words).most_common(3)
     return [word for word, count in most_common]

def trim_history(messages: list, n: int) -> list:
    system_messages = [msg["content"] for msg in messages if msg["role"]=="system"]
    other_messages = [msg["content"] for msg in messages if msg["role"]!="system"]
    # what -n? This keeps the last n messages from other_messages. Negative indexing slices from the end.
    # pattern is same [start:end:step]?

    return system_messages + other_messages[-n:]
def group_by_role(messages: list) -> dict:
    grouped = defaultdict(list)
    for msg in messages:
        grouped[msg["role"]].append(msg["content"])
    return grouped

def extract_json(reply: str) -> dict | None:
    match = re.search(r"\{.*?\}", reply, re.DOTALL)
    if not match:
        return None
    print("Matched JSON string:", match)
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None

# --- TEST STRINGS ---

# Test 1: Clean, perfect JSON (Should PASS)
test_1 = '{"status": "success", "code": 200}'

# Test 2: JSON hidden inside conversational text (Should PASS)
test_2 = (
    'Here is your request: {"user": "Raj", "role": "admin"} Let me know if you'
    ' need more.'
)

# Test 3: Multiple lines inside the JSON (Should PASS because of re.DOTALL)
test_3 = """
Sure, here it is:
{
    "item": "Laptop",
    "price": 45000
}ubv
"""

# Test 4: Broken/Invalid JSON inside the brackets (Should return None)
test_4 = 'Here is the data: {"name": "Amit", "age": }'

# Test 5: Nested JSON (Will FAIL / return None due to the lazy ".*?" regex)
test_5 = '{"user": "Karan", "location": {"city": "Delhi", "zone": "West"}}'


# --- RUNNING THE TESTS ---
print("--- TEST RESULTS ---")
print(f"Test 1 (Clean):  {extract_json(test_1)}")
print(f"Test 2 (Messy):  {extract_json(test_2)}")
print(f"Test 3 (Lines):  {extract_json(test_3)}")
print(f"Test 4 (Broken): {extract_json(test_4)}")
print(f"Test 5 (Nested): {extract_json(test_5)}")