import logging

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from backend.db import get_db, hash_password, make_token

router = APIRouter()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/auth/register", status_code=201)
async def register(req: RegisterRequest):
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO faculties (username, password_hash, name) VALUES (?, ?, ?)",
            (req.username.strip(), hash_password(req.password), req.name.strip()),
        )
        await db.commit()
        logger.info("New faculty registered: %s", req.username)
        return {"ok": True}
    except Exception:
        raise HTTPException(status_code=400, detail="Username already taken")
    finally:
        await db.close()


@router.post("/auth/login")
async def login(req: LoginRequest):
    db = await get_db()
    try:
        row = await (
            await db.execute(
                "SELECT id, name FROM faculties WHERE username = ? AND password_hash = ?",
                (req.username.strip(), hash_password(req.password)),
            )
        ).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = make_token()
        await db.execute(
            "INSERT INTO sessions (token, faculty_id) VALUES (?, ?)",
            (token, row["id"]),
        )
        await db.commit()
        logger.info("Faculty logged in: %s (id=%d)", req.username, row["id"])
        return {"token": token, "name": row["name"]}
    finally:
        await db.close()


@router.post("/auth/logout")
async def logout(authorization: str = Header("")):
    token = authorization.removeprefix("Bearer ").strip()
    if token:
        db = await get_db()
        try:
            await db.execute("DELETE FROM sessions WHERE token = ?", (token,))
            await db.commit()
        finally:
            await db.close()
    return {"ok": True}


@router.get("/auth/me")
async def me(authorization: str = Header("")):
    faculty_id = await require_faculty(authorization)
    db = await get_db()
    try:
        row = await (
            await db.execute(
                "SELECT id, username, name FROM faculties WHERE id = ?", (faculty_id,)
            )
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Faculty not found")
        return dict(row)
    finally:
        await db.close()


# ---------------------------------------------------------------------------
# Dependency — extracts and validates session token
# ---------------------------------------------------------------------------

async def require_faculty(authorization: str = Header("")) -> int:
    """FastAPI dependency. Returns faculty_id or raises 401."""
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db = await get_db()
    try:
        row = await (
            await db.execute(
                "SELECT faculty_id FROM sessions WHERE token = ?", (token,)
            )
        ).fetchone()
    finally:
        await db.close()

    if not row:
        raise HTTPException(status_code=401, detail="Session expired or invalid")

    return row["faculty_id"]
