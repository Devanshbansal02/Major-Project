import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.logging_config import setup_logging
from backend.routers import notes, chat, providers
from backend.config import DATA_DIR, RAW_DIR, PROCESSED_DIR, INDEX_DIR

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Bloom API starting up")

    # Create data directories on startup
    for d in [DATA_DIR, RAW_DIR, PROCESSED_DIR, INDEX_DIR]:
        os.makedirs(d, exist_ok=True)
        logger.debug("Ensured directory: %s", d)

    logger.info("Bloom API ready")
    yield
    logger.info("Bloom API shutting down")


app = FastAPI(title="Bloom API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notes.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(providers.router, prefix="/api")


@app.get("/")
async def root():
    return {"status": "Bloom API running"}
