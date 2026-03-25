from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.db.models import User, UserProject, UserModelConfig, Project, ModelConfig
from app.deps import get_current_user, require_admin, hash_password, DEV_USER
from app.schemas.admin_user import UserCreate, UserUpdate, UserDetailResponse

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(get_current_user)])

async def _user_detail(db: AsyncSession, u: User) -> UserDetailResponse:
    pr = await db.execute(select(UserProject.project_id).where(UserProject.user_id == u.id))
    mr = await db.execute(select(UserModelConfig.model_config_id).where(UserModelConfig.user_id == u.id))
    return UserDetailResponse(
        id=u.id,
        username=u.username,
        is_admin=u.is_admin,
        project_ids=list(pr.scalars().all()),
        model_config_ids=list(mr.scalars().all()),
    )

def _block_dev(user):
    if user is DEV_USER:
        raise HTTPException(400, "Not available when auth is disabled")

@router.get("/users", response_model=list[UserDetailResponse])
async def list_users(db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    require_admin(user)
    _block_dev(user)
    r = await db.execute(select(User).order_by(User.id))
    out = []
    for u in r.scalars().all():
        out.append(await _user_detail(db, u))
    return out

@router.post("/users", response_model=UserDetailResponse)
async def create_user(data: UserCreate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    require_admin(user)
    _block_dev(user)
    ex = await db.execute(select(User).where(User.username == data.username))
    if ex.scalars().first():
        raise HTTPException(409, "Username already exists")
    for pid in data.project_ids:
        if not await db.get(Project, pid):
            raise HTTPException(400, f"Project {pid} not found")
    for mid in data.model_config_ids:
        if not await db.get(ModelConfig, mid):
            raise HTTPException(400, f"Model config {mid} not found")
    u = User(username=data.username, password_hash=hash_password(data.password), is_admin=data.is_admin)
    db.add(u)
    await db.flush()
    for pid in data.project_ids:
        db.add(UserProject(user_id=u.id, project_id=pid))
    for mid in data.model_config_ids:
        db.add(UserModelConfig(user_id=u.id, model_config_id=mid))
    await db.commit()
    await db.refresh(u)
    return await _user_detail(db, u)

@router.put("/users/{user_id}", response_model=UserDetailResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user),
):
    require_admin(user)
    _block_dev(user)
    u = await db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    if data.username is not None and data.username != u.username:
        ex = await db.execute(select(User).where(User.username == data.username))
        if ex.scalars().first():
            raise HTTPException(409, "Username already exists")
        u.username = data.username
    if data.password:
        u.password_hash = hash_password(data.password)
    if data.is_admin is not None:
        u.is_admin = data.is_admin
    if data.project_ids is not None:
        for pid in data.project_ids:
            if not await db.get(Project, pid):
                raise HTTPException(400, f"Project {pid} not found")
        await db.execute(delete(UserProject).where(UserProject.user_id == user_id))
        for pid in data.project_ids:
            db.add(UserProject(user_id=user_id, project_id=pid))
    if data.model_config_ids is not None:
        for mid in data.model_config_ids:
            if not await db.get(ModelConfig, mid):
                raise HTTPException(400, f"Model config {mid} not found")
        await db.execute(delete(UserModelConfig).where(UserModelConfig.user_id == user_id))
        for mid in data.model_config_ids:
            db.add(UserModelConfig(user_id=user_id, model_config_id=mid))
    await db.commit()
    await db.refresh(u)
    return await _user_detail(db, u)

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    require_admin(user)
    _block_dev(user)
    if user_id == user.id:
        raise HTTPException(400, "Cannot delete yourself")
    u = await db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    await db.delete(u)
    await db.commit()
    return {"ok": True}
