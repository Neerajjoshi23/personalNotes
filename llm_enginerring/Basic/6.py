"""
======================================================================
 6.py  |  ASYNC & STREAMING (asyncio) FOR LLM API CALLS
======================================================================
LLM calls are I/O-bound (you wait on the network). asyncio lets you fire
many calls concurrently on one thread, like JS Promises.

WHAT TO REMEMBER vs JUST RECOGNIZE
  MUST KNOW : async def / await, asyncio.run(main()), asyncio.gather
  RECOGNIZE : Semaphore, wait_for timeout, `async for` streaming
  SKIP FOR NOW: to_thread, create_task, return_exceptions (look up when needed)

Run:  python 6.py
Note: in Jupyter, a loop already runs: use `await main()` NOT asyncio.run().
"""

import asyncio
import random
import time
from dataclasses import dataclass, field
from typing import AsyncGenerator


# ======================================================================
# 1. COROUTINES: async def / await
# ======================================================================
async def call_llm(prompt: str, delay: float = 0.2) -> str:
    await asyncio.sleep(delay)                    # yields control; NEVER use time.sleep here
    return f"Response to: {prompt!r}"


async def demo_basic():
    print("\n--- 1. BASIC await ---")
    print(await call_llm("hello"))                # calling alone returns a coroutine object;
                                                  # you must `await` it (or schedule it)


# ======================================================================
# 2. CONCURRENCY: gather (JS Promise.all) -- sequential vs parallel
# ======================================================================
async def demo_gather():
    print("\n--- 2. gather ---")
    prompts = ["alpha", "beta", "gamma"]

    t = time.perf_counter()
    for p in prompts:                             # sequential: ~0.6s
        await call_llm(p)
    print(f"sequential: {time.perf_counter() - t:.2f}s")

    t = time.perf_counter()
    print((call_llm(p) for p in prompts), type((call_llm(p) for p in prompts)),)
    results = await asyncio.gather(*(call_llm(p) for p in prompts))   # parallel: ~0.2s
    print(f"parallel:   {time.perf_counter() - t:.2f}s")
    print(results)                                # order matches input order


# ======================================================================
# 3. LIMITING CONCURRENCY with Semaphore (respect rate limits)
# ======================================================================
async def limited_call(sem: asyncio.Semaphore, i: int) -> int:
    t1=time.perf_counter()
    async with sem:      
        t=time.perf_counter()                         # at most N inside at once
        await call_llm(f"task {i}")
        print(f"task {i} done in {time.perf_counter() - t:.2f}s" )
        print(f"total time for task {i}: {time.perf_counter() - t1:.2f}s")  
        return i * i


async def demo_semaphore():
    print("\n--- 3. SEMAPHORE ---")
    sem = asyncio.Semaphore(2)
    print(await asyncio.gather(*(limited_call(sem, i) for i in range(5))))


# ======================================================================
# 4. ERRORS & TIMEOUTS
# ======================================================================
async def maybe_fail(i: int) -> int:
    await asyncio.sleep(0.01)
    if i == 1:
        raise ValueError(f"task {i} failed")
    return i


async def demo_errors():
    print("\n--- 4. ERRORS & TIMEOUTS ---")
    results = await asyncio.gather(*(maybe_fail(i) for i in range(3)), return_exceptions=True)
    print(results)                                # failures returned as objects, others finish
    for r in results:
        if isinstance(r, Exception):
            print("  error:", r)

    try:
        await asyncio.wait_for(asyncio.sleep(1), timeout=0.05)
    except asyncio.TimeoutError:
        print("timed out")


# ======================================================================
# 5. STREAMING with async generators  (`async for`)
# ======================================================================
async def fake_stream(text: str):
    for token in text.split():
        await asyncio.sleep(0.02)
        yield token + " "                         # yield inside async def = async generator


async def demo_streaming():
    print("\n--- 5. STREAMING ---")
    async for token in fake_stream("tokens arrive one by one"):
        print(token, end="", flush=True)          # flush shows text immediately
    print()


# ======================================================================
# 6. BLOCKING CODE inside async, tasks, and a mini pipeline
# ======================================================================
def blocking_work(n: int) -> int:                 # e.g. a sync SDK call
    time.sleep(0.1)
    return n * 10


async def retrying_call(prompt: str, attempts: int = 3) -> str:
    for n in range(attempts):
        try:
            if random.random() < 0.5:
                raise ConnectionError("rate limited")
            return await call_llm(prompt, 0.01)
        except ConnectionError:
            if n == attempts - 1:
                return "FAILED"
            await asyncio.sleep(0.01 * 2 ** n)    # async backoff
    return "FAILED"


async def demo_pipeline():
    print("\n--- 6. THREADS, TASKS, PIPELINE ---")
    print(await asyncio.to_thread(blocking_work, 4))   # run blocking fn without freezing loop

    task = asyncio.create_task(call_llm("background", 0.05))   # starts running immediately
    print("doing other work while task runs...")
    print(await task)

    random.seed(1)
    answers = await asyncio.gather(*(retrying_call(f"q{i}") for i in range(3)))
    print(answers)


                       # single entry point; call ONCE


"""
======================================================================
                         KEY TAKEAWAYS
======================================================================
1. async def makes a coroutine; `await` runs it and gets the result.
2. asyncio.run(main()) starts the loop (once). In Jupyter: `await main()`.
3. gather(*coros) = Promise.all: concurrent, results in input order.
4. Semaphore(n) caps concurrent calls (rate limits); use `async with sem`.
5. gather(return_exceptions=True) keeps going if one task fails.
6. wait_for(coro, timeout) raises asyncio.TimeoutError.
7. async generator + `async for` = streaming tokens.
8. Never call blocking code (time.sleep, requests) in async; use asyncio.sleep,
   an async client (httpx / AsyncOpenAI) or asyncio.to_thread.
9. Async helps I/O-bound work (API calls), not CPU-bound work.

======================================================================
                              TASKS
======================================================================
T1. fetch_all(prompts, limit): call call_llm for all prompts, never more than
    `limit` at once, results in order.
T2. Add a per-call timeout of 0.1s to call_llm calls; return "TIMEOUT" on expiry.
T3. Write `async def stream_to_text(agen)` that collects tokens from an async
    generator into one string.
T4. Time 10 prompts sequentially vs gather; print the speedup.
T5. Predict: what happens if you call call_llm("x") without await? (tested)
    Answer: you get a coroutine object, nothing runs ("never awaited" warning).
"""
@dataclass
class Message:
    role: str
    content: str

@dataclass
class Messages:
    items: list[Message] = field(default_factory=list)
    def to_openai(self) -> list[Message]:
        return [msg for msg in self.items if msg.content.strip()]
    
async def callLLM(prompt: str) -> str:
    await asyncio.sleep(0.5)
    return f"response to {prompt}"

async def callLLMWithLimit(sem: asyncio.Semaphore, prompt: str) -> str:
    async with sem:
        try:
            return await asyncio.wait_for(callLLM(prompt), timeout=0.1)
        except asyncio.TimeoutError:
            return "TIMEOUT"
async def fetchAll(prompt:list[Message],limit:int):
    sem=asyncio.Semaphore(limit)
    result: list[str] = []
    result=(await asyncio.gather(*(callLLMWithLimit(sem,msg.content) for msg in prompt)))
    return result

async def demo_fetch_all():
    list_of_prompts = Messages()
    list_of_prompts.items.extend([Message(role="user", content=f"prompt {i}") for i in range(10)])
    result = await fetchAll(list_of_prompts.items, limit=3)
    print(result)

async def callLLMBlocking(prompt: str) -> AsyncGenerator[str, None]:
    for word in prompt.split():
        await asyncio.sleep(0.5)
        yield word
async def fetchStream(prompt: Message):
    result=[]
    async for token in callLLMBlocking(prompt.content):
        print(token)
        result.append(token)
    return " ".join(result)

async def peformance(prompts:Messages):
    t1=time.perf_counter()
    for msg in prompts.items:
        await callLLM(msg.content)
    t2=time.perf_counter()
    print(f"Performance: {t2-t1:.2f} seconds")
    t3=time.perf_counter()
    result=await asyncio.gather(*(callLLM(msg.content) for msg in prompts.items))
    t4=time.perf_counter()
    print(f"Gather Performance: {t4-t3:.2f} seconds")

    

async def main():
    await demo_basic()
    await demo_gather()
    await demo_semaphore()
    await demo_errors()
    await demo_streaming()
    await demo_pipeline()
    await demo_fetch_all()
    result = await fetchStream(Message(role="user", content="prompt 0"))
    print(result)
    await peformance(Messages(items=[Message(role="user", content=f"prompt {i}") for i in range(10)]))


if __name__ == "__main__":
    asyncio.run(main())    