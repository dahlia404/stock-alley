from fastapi import APIRouter, Depends, HTTPException, Request, Response

from lib.auth import (
    COOKIE_NAME,
    cookie_kwargs,
    create_session,
    hash_password,
    require_auth,
    verify_password,
)
from lib.db import db
from models.schemas import CredentialsUpdate, LoginRequest, Me, OkResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Me)
async def login(body: LoginRequest, response: Response):
    user = await db.users.find_one({"username": body.username.strip()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    token = await create_session(user["username"])
    response.set_cookie(COOKIE_NAME, token, **cookie_kwargs())
    return Me(username=user["username"])


@router.post("/logout", response_model=OkResponse)
async def logout(request: Request, response: Response):
    token = request.cookies.get(COOKIE_NAME)
    if token:
        await db.sessions.delete_one({"token": token})
    response.delete_cookie(COOKIE_NAME, path="/")
    return OkResponse()


@router.get("/me", response_model=Me)
async def me(username: str = Depends(require_auth)):
    return Me(username=username)


@router.put("/credentials", response_model=Me)
async def update_credentials(body: CredentialsUpdate, username: str = Depends(require_auth)):
    user = await db.users.find_one({"username": username})
    if not user or not verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")
    new_username = body.new_username.strip()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"username": new_username, "password_hash": hash_password(body.new_password)}},
    )
    await db.sessions.update_many({"username": username}, {"$set": {"username": new_username}})
    return Me(username=new_username)
