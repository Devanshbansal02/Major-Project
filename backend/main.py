import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.logging_config import setup_logging
from backend.db import init_db
from backend.routers import notes, chat, providers, auth, faculty_subjects, faculty_notes
from backend.config import DATA_DIR, RAW_DIR, PROCESSED_DIR, INDEX_DIR

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Bloom API starting up")

    # Ensure data directories exist
    for d in [DATA_DIR, RAW_DIR, PROCESSED_DIR, INDEX_DIR]:
        os.makedirs(d, exist_ok=True)
        logger.debug("Ensured directory: %s", d)

    # Initialise SQLite DB (creates tables if missing)
    await init_db()
    logger.info("Database ready")

    logger.info("Bloom API ready")
    yield
    logger.info("Bloom API shutting down")


app = FastAPI(title="Bloom API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev
        "http://localhost:3000",   # Docker frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api")
app.include_router(faculty_subjects.router, prefix="/api")
app.include_router(faculty_notes.router, prefix="/api")
app.include_router(notes.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(providers.router, prefix="/api")


@app.get("/")
async def root():
    return {"status": "Bloom API running"}
