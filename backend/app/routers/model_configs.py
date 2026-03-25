import httpx
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.deps import get_current_user, require_admin, require_model_access, accessible_model_config_ids
from app.db.models import ModelConfig, TestRun, JudgeResult
from app.schemas.model_config import ModelConfigCreate, ModelConfigUpdate, ModelConfigResponse
from app import crypto
from app.config import settings

router = APIRouter(prefix="/api/model-configs", tags=["model-configs"], dependencies=[Depends(get_current_user)])

def _to_response(mc: ModelConfig) -> dict:
    masked = ""
    if mc.api_key_encrypted:
        try:
            raw = crypto.decrypt(mc.api_key_encrypted, settings.encryption_key)
            masked = crypto.mask_api_key(raw)
        except Exception:
            masked = "***"
    return {
        "id": mc.id,
        "name": mc.name,
        "provider_type": mc.provider_type,
        "base_url": mc.base_url,
        "api_key_masked": masked,
        "model_name": mc.model_name,
        "custom_headers": mc.custom_headers,
        "custom_body_template": mc.custom_body_template,
        "response_extract_path": mc.response_extract_path,
        "max_concurrency": mc.max_concurrency,
        "connectivity_verified_at": mc.connectivity_verified_at,
    }

@router.post("", response_model=ModelConfigResponse)
async def create_config(data: ModelConfigCreate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    require_admin(user)
    d = data.model_dump()
    api_key = d.pop("api_key", "")
    mc = ModelConfig(**d)
    if api_key:
        mc.api_key_encrypted = crypto.encrypt(api_key, settings.encryption_key)
    db.add(mc)
    await db.commit()
    await db.refresh(mc)
    return _to_response(mc)

@router.get("", response_model=list[ModelConfigResponse])
async def list_configs(db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    q = select(ModelConfig)
    ids = await accessible_model_config_ids(db, user)
    if ids is not None:
        if not ids:
            return []
        q = q.where(ModelConfig.id.in_(ids))
    result = await db.execute(q)
    return [_to_response(mc) for mc in result.scalars().all()]

@router.get("/{config_id}", response_model=ModelConfigResponse)
async def get_config(config_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    await require_model_access(db, user, config_id)
    mc = await db.get(ModelConfig, config_id)
    if not mc:
        raise HTTPException(404, "Model config not found")
    return _to_response(mc)

@router.put("/{config_id}", response_model=ModelConfigResponse)
async def update_config(config_id: int, data: ModelConfigUpdate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    require_admin(user)
    mc = await db.get(ModelConfig, config_id)
    if not mc:
        raise HTTPException(404, "Model config not found")
    d = data.model_dump(exclude_unset=True)
    api_key = d.pop("api_key", None)
    for k, v in d.items():
        setattr(mc, k, v)
    if api_key is not None:
        mc.api_key_encrypted = crypto.encrypt(api_key, settings.encryption_key) if api_key else ""
    await db.commit()
    await db.refresh(mc)
    return _to_response(mc)

@router.delete("/{config_id}")
async def delete_config(config_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    require_admin(user)
    mc = await db.get(ModelConfig, config_id)
    if not mc:
        raise HTTPException(404, "Model config not found")
    runs = await db.execute(select(TestRun))
    for run in runs.scalars().all():
        if config_id in (run.model_configs or []):
            raise HTTPException(409, "Model config is referenced by a test run")
    judges = await db.execute(select(JudgeResult).where(JudgeResult.judge_model_id == config_id))
    if judges.scalars().first():
        raise HTTPException(409, "Model config is referenced by a judge result")
    await db.delete(mc)
    await db.commit()
    return {"ok": True}

@router.post("/{config_id}/test")
async def test_config(config_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    await require_model_access(db, user, config_id)
    mc = await db.get(ModelConfig, config_id)
    if not mc:
        raise HTTPException(404, "Model config not found")
    api_key = ""
    if mc.api_key_encrypted:
        api_key = crypto.decrypt(mc.api_key_encrypted, settings.encryption_key)
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    if mc.custom_headers:
        headers.update(mc.custom_headers)
    body = {
        "model": mc.model_name,
        "messages": [{"role": "user", "content": "hi"}],
        "max_tokens": 5,
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(mc.base_url, json=body, headers=headers)
        ok = 200 <= resp.status_code < 300
        if ok:
            mc.connectivity_verified_at = datetime.utcnow()
            await db.commit()
            await db.refresh(mc)
        return {"success": ok, "status_code": resp.status_code}
    except Exception as e:
        return {"success": False, "error": str(e)}
