import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.deps import get_settings
from app.routers.demo import router as demo_route
from app.routers.notes import router as notes_route

log= logging.getLogger("NOTEMIND")

@asynccontextmanager
async def lifespan(app:FastAPI)-> AsyncIterator[None]: 
    #Here we do stuff before setting the server up
    log.warning("Starting the server setup")
    setting = get_settings()
    log.warning(f"setting has been fetched : {setting}")
    yield
    log.warning("Stoping the server")
    
    
    
#App factory pattern
def create_app() -> FastAPI:
    app = FastAPI(title="NoteMind API", version="0.1.0",lifespan=lifespan)
    app.include_router(notes_route) 
    app.include_router(demo_route)
    @app.get("/health")
    def health() -> dict[str,str]:
        return {"status":"ok"}
    return app
    
app=create_app()