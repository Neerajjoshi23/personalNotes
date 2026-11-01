"""
======================================================================
 5.py  |  CLASSES, ABSTRACT BASES, DUNDER METHODS & PYTHON GOTCHAS
======================================================================
Why for LLMs: SDK clients, vector stores, agents and tools are all classes.
You must read `self`, @property, inheritance and `__call__` fluently.

Run:  python 5.py

WHAT TO REMEMBER vs JUST RECOGNIZE
  MUST KNOW : __init__, self, methods, inheritance + super(), @property,
              mutable-default gotcha, `is None` vs ==
  RECOGNIZE : ABC/@abstractmethod, @classmethod/@staticmethod, __call__, __repr__
              (you will READ these in SDKs/LangChain more than write them)
  SKIP FOR NOW: operator-overloading dunders (__add__, __getitem__), closure gotcha
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Generator

COUNTER = 0                                       # module-level, used in the scope gotcha


# ======================================================================
# 1. A CLASS: __init__, self, _private, __repr__, @property
# ======================================================================
class Chat:
    def __init__(self, model: str):               # constructor; no `new`, `self` explicit
        self.model = model                        # public attribute
        self._history: list[dict] = []            # _underscore = "private by convention"

    def add(self, role: str, content: str) -> "Chat":
        self._history.append({"role": role, "content": content})
        return self                               # return self -> chaining

    @property                                     # access like attribute: chat.size
    def size(self) -> int:
        return len(self._history)

    def __repr__(self) -> str:                    # developer-friendly print
        return f"Chat(model={self.model!r}, size={self.size})"


def demo_basic_class():
    print("\n--- 1. BASIC CLASS ---")
    chat = Chat("gpt-4o").add("user", "hi").add("assistant", "hello")
    print(chat, chat.size)                        # size has no () thanks to @property


# ======================================================================
# 2. INHERITANCE + ABSTRACT BASE + classmethod / staticmethod + __call__
# ======================================================================
class BaseLLM(ABC):
    def __init__(self, model: str):
        self.model = model
        self._calls = 0

    @abstractmethod                               # subclasses MUST implement
    def generate(self, prompt: str) -> str: ...

    def __call__(self, prompt: str) -> str:       # llm("hi") works like a function
        self._calls += 1
        return self.generate(prompt)

    @classmethod                                  # gets cls; alternative constructor
    def default(cls):
        return cls("default-model")

    @staticmethod                                 # no self/cls; just a namespaced helper
    def estimate_tokens(text: str) -> int:
        return max(1, len(text) // 4)

    def __repr__(self) -> str:
        return f"{type(self).__name__}(model={self.model!r}, calls={self._calls})"


class EchoLLM(BaseLLM):
    def generate(self, prompt: str) -> str:
        return f"echo: {prompt}"


class ShoutLLM(BaseLLM):
    def __init__(self, model: str, suffix: str = "!"):
        super().__init__(model)                   # call parent constructor
        self.suffix = suffix

    def generate(self, prompt: str) -> str:
        return prompt.upper() + self.suffix


def demo_inheritance():
    print("\n--- 2. INHERITANCE / ABC ---")
    try:
        BaseLLM("x")                              # abstract -> cannot instantiate
    except TypeError as e:
        print("TypeError:", e)

    for llm in (EchoLLM("m1"), ShoutLLM("m2", "!!"), EchoLLM.default()):
        print(llm("hi"), llm.generate("hi second"), "|", llm)               # polymorphism: same call, different class
    print(BaseLLM.estimate_tokens("hello world"))


# ======================================================================
# 3. DUNDER METHODS (operator overloading & protocols)
# ======================================================================
class Vec:
    def __init__(self, *xs):
        self.xs = list(xs)

    def __len__(self): return len(self.xs)                    # len(v)
    def __getitem__(self, i): return self.xs[i]               # v[0] and iteration
    def __iter__(self): return iter(self.xs)                  # for x in v
    def __add__(self, o): return Vec(*(a + b for a, b in zip(self.xs, o.xs)))   # v1 + v2
    def __eq__(self, o): return self.xs == o.xs               # v1 == v2
    def __repr__(self): return f"Vec{tuple(self.xs)}"


def demo_dunder():
    print("\n--- 3. DUNDER METHODS ---")
    a, b = Vec(1, 2), Vec(3, 4)
    print(a + b, len(a), a[0], list(a), a == Vec(1, 2))


# ======================================================================
# 4. GOTCHAS (every Python dev hits these)
# ======================================================================
def demo_gotchas():
    print("\n--- 4. GOTCHAS ---")

    # 1) Mutable default args are SHARED between calls
    def bad(x, acc=[]):
        acc.append(x)
        return acc

    def good(x, acc=None):
        acc = [] if acc is None else acc
        acc.append(x)
        return acc
    bad(1)
    print("bad:", bad(2), "| good:", good(2))     # [1, 2] vs [2]

    # 2) `is` = same object, `==` = same value. Use `is None` for None.
    a, b = [1], [1]
    print(a == b, a is b)                         # True False

    # 3) Aliasing: [[0]*3]*3 makes 3 refs to the SAME row
    bad_grid = [[0] * 3] * 3
    bad_grid[0][0] = 1
    ok_grid = [[0] * 3 for _ in range(3)]
    print(bad_grid[1][0], ok_grid[1][0])          # 1 (bug) vs 0
   
    # 4) Closures capture the VARIABLE, not its value
    fns = [lambda: i for i in range(3)]
    print([f() for f in fns])                     # [2, 2, 2]
    fns = [lambda i=i: i for i in range(3)]
    print([f() for f in fns])                     # [0, 1, 2]
    # example of late-binding closure issue
    # 1. Expects an argument when called
    fn_require = lambda x: x * 2
    print(fn_require(5))  # Pass 5 explicitly -> Outputs: 10

    # 2. Uses a default value if nothing is passed
    fn_default = lambda x=10: x * 2
    print(fn_default())   # Passes nothing -> Uses 10 -> Outputs: 20
    # 5) Never modify a list while iterating over it
    nums = [1, 2, 3, 4]
    nums = [n for n in nums if n % 2]             # build a new list instead
    print(nums)

    # 6) Strings are immutable: build with "".join(list), not += in loops
    print("".join(["a", "b", "c"]))

    # 7) dict keeps insertion order; set does not
    # 8) GIL: threads don't speed up CPU work. LLM API calls are I/O-bound -> asyncio (6.py).

    # 9) Scope: assignment inside a function is local unless declared
    def inc():
        global COUNTER                            # needed to rebind a module-level name
        COUNTER += 1
    inc()
    print("counter:", COUNTER)

    # 10) Truthiness: 0, "", [], {}, None are falsy; "0" and [0] are truthy
    print(bool(0), bool(""), bool([]), bool("0"), bool([0]))


if __name__ == "__main__":
    demo_basic_class()
    demo_inheritance()
    demo_dunder()
    demo_gotchas()


"""
======================================================================
                         KEY TAKEAWAYS
======================================================================
1. `self` is explicit; __init__ is the constructor; no `new` keyword.
2. _name = private by convention; @property = computed read-only attribute.
3. ABC + @abstractmethod forces subclasses to implement methods.
4. super().__init__(...) calls the parent constructor.
5. @classmethod(cls) = alt constructor; @staticmethod = plain function in class.
6. __call__ makes an instance callable; __repr__ controls how it prints.
7. __len__/__iter__/__getitem__/__add__/__eq__ plug your class into Python syntax.
8. Gotchas: mutable defaults, `is` vs `==`, shared refs [[0]]*3,
   late-binding closures, modifying a list while looping.

======================================================================
                              TASKS
======================================================================
T1. Class Conversation with add(role, content), a `last` property, and
    __len__ and __iter__. Make `for m in convo` yield messages.
T2. Abstract class VectorStore(add, search) + InMemoryStore using a dict and
    cosine similarity (pure Python).
T3. Add @classmethod from_dict(cls, d) to a class and test it.
T4. Fix: def append_to(x, lst=[]) -> safe version.
T5. Predict:  fns=[lambda: i for i in range(3)]; print(fns[0]()) ( tested)
    Answer: 2
"""
@dataclass
class Message:
    role:str
    content:str

class Conversation:
    def __init__(self):
        self.messages:list[Message] = []
    @property
    def last(self) -> Message:
        return self.messages[-1] if self.messages else None
    def add(self, role, content):
        self.messages.append(Message(role=role, content=content))
        return self  # Allow method chaining
    def __len__(self):
        return len(self.messages)

    def __iter__(self)-> Generator[Message, None, None]:
        for msg in self.messages:
            yield msg
    @classmethod
    def from_messages(cls, messages: list[Message]):
        convo = cls()
        convo.messages.extend(messages)
        return convo

convo = Conversation();
convo = Conversation.from_messages([
    Message(role="user", content="Hello!"),
    Message(role="assistant", content="Hi there!")
])
convo.add("user", "Hello!").add("assistant", "Hi there!")
for msg in convo:
    print(msg.role, msg.content)
class VectorStore(ABC):
    @abstractmethod
    def add(self, id: str, vector: list[float],metadata: dict):
        pass

    @abstractmethod
    def search(self, query: list[float], K: int = 5) -> list[tuple[str, float, dict]]:
        pass
class InMemory(VectorStore):
    def __init__(self):
        self.store: dict[str, tuple[list[float], dict]] = {}
    def add(self, id: str, vector: list[float], metadata: dict):
        self.store[id] = (vector, metadata)
        return self  # Allow method chaining
    def search(self, query: list[float], K: int = 5) -> list[tuple[str, float, dict]]:
        # no idea what is written this cosine function
        def cosine_similarity(v1: list[float], v2: list[float]) -> float:
            dot = sum(a*b for a, b in zip(v1, v2))
            norm1 = sum(a*a for a in v1) ** 0.5
            norm2 = sum(b*b for b in v2) ** 0.5
            return dot / (norm1 * norm2) if norm1 and norm2 else 0.0

        results = []
        for id, (vector, metadata) in self.store.items():
            score = cosine_similarity(query, vector)
            results.append((id, score, metadata))
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:K]


def append_to(x, lst=None):
    if lst is None:
        lst = []
    lst.append(x)
    return lst