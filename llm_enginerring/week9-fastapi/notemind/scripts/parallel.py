# file: scripts/parallel.py
"""Calls a slow endpoint AND /health at the same moment, and prints when each finished."""
import asyncio
import sys
import time

import httpx


async def main(slow_path: str) -> None:
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=30) as client:
        start = time.perf_counter()

        async def hit(path: str) -> None:
            r = await client.get(path)
            print(f"{path:<20} {r.status_code}  finished after {time.perf_counter() - start:.1f}s")

        # gather = start both requests together, wait for both
        await asyncio.gather(hit(slow_path), hit("/health"))


asyncio.run(main(sys.argv[1]))

