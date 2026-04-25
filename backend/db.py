import hashlib
import os
import secrets

import aiosqlite

from backend.config import DATA_DIR

DB_PATH = os.path.join(DATA_DIR, "bloom.db")

_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS faculties (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    name          TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_id INTEGER NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
    name       TEXT    NOT NULL,
    code       TEXT    NOT NULL,
    color      TEXT    NOT NULL DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS notes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id    INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    filename      TEXT    NOT NULL,          -- stored UUID filename on disk
    original_name TEXT    NOT NULL,          -- original upload filename
    file_type     TEXT    NOT NULL,          -- pdf_typed | pdf_handwritten | pptx | docx | image
    class_date    TEXT    NOT NULL,          -- ISO date YYYY-MM-DD
    uploaded_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    is_embedded   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT    PRIMARY KEY,
    faculty_id INTEGER NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
"""


async def init_db() -> None:
    """Create tables if they don't exist. Called once at startup."""
    os.makedirs(DATA_DIR, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(_CREATE_SQL)
        await db.commit()


async def get_db() -> aiosqlite.Connection:
    """Open a connection with Row factory. Caller must close."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def make_token() -> str:
    return secrets.token_hex(32)
