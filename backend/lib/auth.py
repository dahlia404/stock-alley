"""Password hashing, session cookie handling and first-boot bootstrap (admin/1234 + settings)."""

import hashlib
import hmac
import os
import secrets
from datetime import timedelta

from fastapi import HTTPException, Request

from lib.db import db
from models.schemas import AppSettings, now_utc

COOKIE_NAME = "alley_session"
SESSION_DAYS = 30
DEFAULT_USERNAME = "admin"
DEFAULT_PASSWORD = "1234"


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split("$", 1)
    except ValueError:
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000).hex()
    return hmac.compare_digest(candidate, digest)


async def create_session(username: str) -> str:
    token = secrets.token_urlsafe(32)
    await db.sessions.insert_one(
        {"token": token, "username": username, "expires_at": now_utc() + timedelta(days=SESSION_DAYS)}
    )
    return token


def cookie_kwargs() -> dict:
    return {
        "httponly": True,
        "samesite": "lax",
        "secure": os.environ.get("COOKIE_SECURE", "false").lower() == "true",
        "max_age": SESSION_DAYS * 86400,
        "path": "/",
    }


async def require_auth(request: Request) -> str:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="No has iniciado sesión")
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Sesión caducada")
    return session["username"]


async def bootstrap() -> None:
    """Idempotent: create the default admin and settings document on first boot."""
    if not await db.users.find_one({}):
        await db.users.insert_one(
            {"id": "admin", "username": DEFAULT_USERNAME, "password_hash": hash_password(DEFAULT_PASSWORD)}
        )
    if not await db.settings.find_one({"id": "main"}):
        await db.settings.insert_one({"id": "main", **AppSettings().model_dump()})
