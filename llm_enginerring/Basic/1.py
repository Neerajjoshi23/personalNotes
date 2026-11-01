"""
======================================================================
 1.py  |  CORE DATA TYPES, LOOPS, DICT/LIST METHODS, COMPREHENSIONS
======================================================================
Why this matters for LLMs:
  chat history = list of dicts, API payload = dict, tokens = list of str.
  You will manipulate these shapes in almost every script.

Run:  python 1.py
"""

from typing import Dict, List, Union


# ======================================================================
# SECTION 1: THE 6 BUILT-IN TYPES (know them by their brackets)
# ======================================================================
def section_1_types():
    print("\n--- SECTION 1: TYPES ---")
    num = 12                                  # int
    flt = 3.14                                # float
    text = "Hello"                            # str (immutable)
    flag = True                               # bool (capital T/F)
    lst = [1, 2, 3]                           # list  -> mutable, ordered
    tpl = (1, 2, 3)                           # tuple -> immutable, ordered
    dct = {"key": "value"}                    # dict  -> key/value map
    st = {"apple", "banana", "apple"}         # set   -> unique, unordered

    for value in (num, flt, text, flag, lst, tpl, dct, st):
        # what this !r means: !r calls repr() on the value, giving a detailed string representation and __name__?
        print(f"{value!r:<30} -> {type(value).__name__}")

    # Casting: Python is strongly typed, no silent coercion like JS
    print(int("42") + 1, float("3.5"), str(100) + "!", bool(""), bool("x"))


# ======================================================================
# SECTION 2: STRING METHODS (cleaning text before sending to an LLM)
# ======================================================================
def section_2_strings():
    print("\n--- SECTION 2: STRINGS ---")
    raw = "  chunk_1,chunk_2,chunk_3  "
    stripped = raw.strip()                    # JS: trim()
    parts = stripped.split(",")               # -> list of str
    joined = " | ".join(parts)                # separator.join(list)  (JS is reversed!)
    print(parts, "->", joined)

    name, version = "RAG", 2
    print(f"System: run {name} v{version:02d}")      # f-string, :02d = zero pad
    print("Hello".upper(), "Hello".lower(), "a-b-c".replace("-", "+"))
    print("hello world".startswith("hello"), "world" in "hello world")


# ======================================================================
# SECTION 3: FREQUENT DICTIONARY METHODS
# ======================================================================
def section_3_dicts():
    print("\n--- SECTION 3: DICT METHODS ---")
    catalog: Dict[str, float] = {"apple": 1.99, "banana": 0.99}

    print(catalog.get("mango", 0.0))                       # safe lookup, no KeyError
    catalog.update({"tax_rate": 0.18, "handling_fee": 5})  # merge / add keys in place
    print(list(catalog.keys()))
    print(list(catalog.values()))

    for key in catalog:                                    # default loop = KEYS only
        print("key:", key)
    for key, value in catalog.items():                     # key + value together
        print(f"{key} -> {value}")


# ======================================================================
# SECTION 4: LIST METHODS + enumerate
# ======================================================================
def section_4_lists():
    print("\n--- SECTION 4: LIST METHODS ---")
    items = [30, 10, 20]
    items.append(40)                          # add to end
    items.extend([50, 60])                    # add many (append would nest a list)
    last = items.pop()                        # remove + return last
    items.remove(10)                          # remove first matching VALUE
    items.sort()                              # in-place sort (returns None!)
    print(items, "popped:", last)

    for i, ch in enumerate("abc", start=1):   # index + value, no manual counter
        print(i, ch, end=" | ")
    print()


# ======================================================================
# SECTION 5: COMPREHENSIONS (the "one-line loop")
# ======================================================================
def section_5_comprehensions():
    print("\n--- SECTION 5: COMPREHENSIONS ---")
    nums = [-25, 45, 150, 7]

    squares = [n * n for n in nums]                          # transform
    positives = [n for n in nums if n > 0]                   # filter
    clamped = [0 if n < 0 else (100 if n > 100 else n) for n in nums]  # inline if/else
    lengths = {w: len(w) for w in ["hi", "hello"]}           # dict comprehension
    unique_lens = {len(w) for w in ["hi", "yo", "hello"]}    # set comprehension

    print(squares, positives, clamped, lengths, unique_lens)
    # what is diff of using if before and after the value in a comprehension?
    # Answer:
    # Using 'if' before the value (inline if/else) allows you to choose between two values based on a condition.
    # Using 'if' after the value (filter) only includes items that meet the condition.
    # Pattern:  [ VALUE_IF_TRUE if COND else VALUE_IF_FALSE for X in ITERABLE ]
    # Filter:   [ VALUE for X in ITERABLE if COND ]       <- 'if' goes at the END


# ======================================================================
# SECTION 6: TYPE HINTS + isinstance + try/except (your inventory example)
# ======================================================================
def manage_store_inventory(
    raw_stock: List[Union[int, str]], price_catalog: Dict[str, float]
) -> List[int]:
    """Drop bad types, extend, pop, remove, sort, then clamp to 0..100."""
    price_catalog.update({"tax_rate": 0.18})

    cleaned: List[int] = []
    for item in raw_stock:
        if not isinstance(item, int):         # guard clause: skip bad data
            continue
        cleaned.append(item)

    cleaned.extend([10, 20])
    cleaned.pop()                             # removes 20
    cleaned.remove(10)
    cleaned.sort()
    return [0 if q < 0 else (100 if q > 100 else q) for q in cleaned]


def process_international_payment(
    price_list: List[Union[int, float, str]], rates: Dict[str, float]
) -> List[float]:
    """Numbers pass through, numeric strings convert, junk becomes 0."""
    processed: List[float] = []
    for item in price_list:
        if isinstance(item, (int, float)):    # tuple of types = "is any of these"
            processed.append(item)
        elif isinstance(item, str):
            try:
                processed.append(float(item))
            except ValueError:                # catch the SPECIFIC error
                processed.append(0)
    return [x * rates.get("USD", 1) for x in processed]


def section_6_functions():
    print("\n--- SECTION 6: FUNCTIONS + HINTS ---")
    print(manage_store_inventory([150, "broken", -25, 45], {"apple": 1.99}))  # [0, 45, 100]
    print(process_international_payment([10, "2.5", "oops", 4.0], {"USD": 2}))  # [20, 5.0, 0, 8.0]
    # Type hints are NOT enforced at runtime; they help editors and readers.


# ======================================================================
# ENTRY POINT  (runs only when you execute this file directly,
# not when another file does `import 1`)
# ======================================================================
if __name__ == "__main__":
    section_1_types()
    section_2_strings()
    section_3_dicts()
    section_4_lists()
    section_5_comprehensions()
    section_6_functions()


"""
======================================================================
                         KEY TAKEAWAYS
======================================================================
1. Brackets tell the type:  [] list | () tuple | {k: v} dict | {a, b} set
2. dict: .get(k, default) never crashes; .update() merges; .items() = key+value
3. list: append (one) vs extend (many); sort() is in-place and returns None
4. enumerate(x, start=1) replaces manual counters
5. " | ".join(list)  -- separator first (opposite of JS arr.join)
6. Comprehension:  [expr for x in it if cond]  /  [a if cond else b for x in it]
7. isinstance(x, (int, float)) replaces typeof checks
8. Catch specific exceptions (ValueError), not bare `except:`
9. `if __name__ == "__main__":` = "run this only as a script"

======================================================================
                              TASKS
======================================================================
Write each in a scratch file or at the bottom of this one.

T1. Given msgs = [{"role": "user", "content": "hi"}, {"role": "assistant",
    "content": "hello"}, {"role": "user", "content": "bye"}], build a list of
    only the user contents using a comprehension.
T2. Build a dict {role: count} from msgs using a loop and .get(role, 0) + 1.
T3. Given ["  Hello ", "WORLD", "", "  "], return cleaned lowercase non-empty
    strings in ONE comprehension.
T4. Write safe_int(x) that returns int(x) or None on ValueError/TypeError.
T5. Predict (don't run):  a=[1,2]; a.extend([3,4]); a.append([5]); print(a)
    Answer: [1, 2, 3, 4, [5]]
"""
def getUserMessage(msgs):
    return [msg["content"] for msg in msgs if msg["role"] == "user"]
# this correct for T2? T2. Build a dict {role: count} from msgs using a loop and .get(role, 0) + 1.
# ? 
def getCountPerRole(msgs):
    count={}
    for msg in msgs:
        count[msg["role"]]=count.get(msg["role"], 0) + 1
    return count

