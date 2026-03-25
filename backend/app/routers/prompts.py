import difflib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.database import get_db
from app.deps import get_current_user, require_project_access, require_prompt_access
from app.db.models import Prompt, PromptVersion
from app.schemas.prompt import PromptCreate, PromptUpdate, PromptResponse, VersionCreate, VersionResponse

router = APIRouter(tags=["prompts"], dependencies=[Depends(get_current_user)])

@router.post("/api/projects/{project_id}/prompts", response_model=PromptResponse)
async def create_prompt(project_id: int, data: PromptCreate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    await require_project_access(db, user, project_id)
    prompt = Prompt(project_id=project_id, **data.model_dump())
    db.add(prompt)
    await db.commit()
    await db.refresh(prompt)
    return prompt

@router.get("/api/projects/{project_id}/prompts", response_model=list[PromptResponse])
async def list_prompts(project_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    await require_project_access(db, user, project_id)
    result = await db.execute(select(Prompt).where(Prompt.project_id == project_id))
    return result.scalars().all()

@router.put("/api/prompts/{prompt_id}", response_model=PromptResponse)
async def update_prompt(prompt_id: int, data: PromptUpdate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    prompt = await require_prompt_access(db, user, prompt_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(prompt, k, v)
    await db.commit()
    await db.refresh(prompt)
    return prompt

@router.delete("/api/prompts/{prompt_id}")
async def delete_prompt(prompt_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    prompt = await require_prompt_access(db, user, prompt_id)
    await db.delete(prompt)
    await db.commit()
    return {"ok": True}

@router.post("/api/prompts/{prompt_id}/versions", response_model=VersionResponse)
async def create_version(prompt_id: int, data: VersionCreate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    prompt = await require_prompt_access(db, user, prompt_id)
    result = await db.execute(
        select(func.coalesce(func.max(PromptVersion.version_number), 0))
        .where(PromptVersion.prompt_id == prompt_id)
    )
    max_ver = result.scalar()
    parent_version_id = data.parent_version_id or prompt.current_version_id
    version = PromptVersion(
        prompt_id=prompt_id,
        version_number=max_ver + 1,
        template_content=data.template_content,
        variables_schema=data.variables_schema,
        parent_version_id=parent_version_id,
        change_note=data.change_note,
    )
    db.add(version)
    await db.flush()
    prompt.current_version_id = version.id
    await db.commit()
    await db.refresh(version)
    return version

@router.get("/api/prompts/{prompt_id}/versions", response_model=list[VersionResponse])
async def list_versions(prompt_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    await require_prompt_access(db, user, prompt_id)
    result = await db.execute(
        select(PromptVersion)
        .where(PromptVersion.prompt_id == prompt_id)
        .order_by(desc(PromptVersion.version_number))
    )
    return result.scalars().all()

@router.get("/api/prompt-versions/{v1}/diff/{v2}")
async def diff_versions(v1: int, v2: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    ver1 = await db.get(PromptVersion, v1)
    ver2 = await db.get(PromptVersion, v2)
    if not ver1 or not ver2:
        raise HTTPException(404, "Version not found")
    if ver1.prompt_id != ver2.prompt_id:
        raise HTTPException(404, "Version not found")
    await require_prompt_access(db, user, ver1.prompt_id)
    diff = list(difflib.unified_diff(
        ver1.template_content.splitlines(keepends=True),
        ver2.template_content.splitlines(keepends=True),
        fromfile=f"v{ver1.version_number}",
        tofile=f"v{ver2.version_number}",
    ))
    return {"diff": "".join(diff)}
