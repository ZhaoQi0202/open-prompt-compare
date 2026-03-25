from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.schemas.auth import LoginRequest, TokenResponse, MeResponse
from app.auth import create_token
from app.config import settings
from app.database import get_db
from app.db.models import User
from app.deps import get_current_user, verify_password, DEV_USER

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    if not settings.auth_enabled:
        raise HTTPException(400, "Authentication disabled")
    r = await db.execute(select(User).where(User.username == req.username))
    user = r.scalars().first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Invalid username or password")
    token = create_token(settings.effective_jwt_secret, user.id, user.is_admin)
    return TokenResponse(token=token)

@router.post("/logout")
async def logout():
    return {"ok": True}

@router.get("/me", response_model=MeResponse)
async def me(user = Depends(get_current_user)):
    if user is DEV_USER:
        return MeResponse(id=0, username="dev", is_admin=True)
    return MeResponse(id=user.id, username=user.username, is_admin=user.is_admin)
