from __future__ import annotations

import bcrypt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.auth import verify_token
from app.db.models import User, UserProject, UserModelConfig, Project, Prompt, TestSuite, TestCase

security = HTTPBearer(auto_error=False)

class _DevUser:
    id = 0
    is_admin = True
    username = "dev"

DEV_USER = _DevUser()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not settings.auth_enabled:
        return DEV_USER  # type: ignore[return-value]
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(credentials.credentials, settings.effective_jwt_secret)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.get(User, int(sub))
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

def require_admin(user: User):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False

async def accessible_project_ids(db: AsyncSession, user: User) -> list[int] | None:
    if user.is_admin or user.id == 0:
        return None
    r = await db.execute(select(UserProject.project_id).where(UserProject.user_id == user.id))
    return list(r.scalars().all())

async def accessible_model_config_ids(db: AsyncSession, user: User) -> list[int] | None:
    if user.is_admin or user.id == 0:
        return None
    r = await db.execute(select(UserModelConfig.model_config_id).where(UserModelConfig.user_id == user.id))
    return list(r.scalars().all())

async def require_project_access(db: AsyncSession, user: User, project_id: int):
    if user.is_admin or user.id == 0:
        return
    r = await db.execute(
        select(UserProject).where(UserProject.user_id == user.id, UserProject.project_id == project_id)
    )
    if not r.scalars().first():
        raise HTTPException(status_code=404, detail="Project not found")

async def require_model_access(db: AsyncSession, user: User, model_config_id: int):
    if user.is_admin or user.id == 0:
        return
    r = await db.execute(
        select(UserModelConfig).where(
            UserModelConfig.user_id == user.id, UserModelConfig.model_config_id == model_config_id
        )
    )
    if not r.scalars().first():
        raise HTTPException(status_code=404, detail="Model config not found")

async def require_prompt_access(db: AsyncSession, user: User, prompt_id: int) -> Prompt:
    p = await db.get(Prompt, prompt_id)
    if not p:
        raise HTTPException(status_code=404, detail="Prompt not found")
    await require_project_access(db, user, p.project_id)
    return p

async def require_suite_access(db: AsyncSession, user: User, suite_id: int) -> TestSuite:
    s = await db.get(TestSuite, suite_id)
    if not s:
        raise HTTPException(status_code=404, detail="Test suite not found")
    await require_project_access(db, user, s.project_id)
    return s

async def require_test_case_access(db: AsyncSession, user: User, case_id: int) -> TestCase:
    c = await db.get(TestCase, case_id)
    if not c:
        raise HTTPException(status_code=404, detail="Test case not found")
    await require_suite_access(db, user, c.suite_id)
    return c
