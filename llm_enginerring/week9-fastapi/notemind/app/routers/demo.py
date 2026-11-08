# file: app/routers/demo.py   (delete after this session)
import asyncio
import time

from fastapi import APIRouter

router = APIRouter(prefix="/demo", tags=["demo"])


@router.get("/block-async")
async def block_async() -> dict[str, str]:
    time.sleep(2)            # WRONG: blocks the event loop, so the whole server freezes  # noqa: ASYNC251
    return {"done": "block-async"}


@router.get("/block-sync")
def block_sync() -> dict[str, str]:
    time.sleep(2)            # OK: plain def runs in a worker thread
    return {"done": "block-sync"}


@router.get("/await-async")
async def await_async() -> dict[str, str]:
    await asyncio.sleep(2)   # OK: gives the loop back while waiting
    return {"done": "await-async"}
