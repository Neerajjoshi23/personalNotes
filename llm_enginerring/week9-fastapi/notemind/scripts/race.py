# file: scripts/race.py
"""Sends 10 create requests at the same moment and prints the status codes."""
import asyncio

import httpx


async def main() -> None:
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=30) as client:
        responses = await asyncio.gather(
            *[client.post("/api/v1/notes", json={"title": f"race {i}"}) for i in range(10)]
        )
        codes = sorted(r.status_code for r in responses)
        print(codes, "->", codes.count(201), "created")


asyncio.run(main())
