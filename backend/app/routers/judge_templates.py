from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.deps import get_current_user, require_admin
from app.db.models import JudgeTemplate
from app.schemas.judge import JudgeTemplateCreate, JudgeTemplateUpdate, JudgeTemplateResponse

router = APIRouter(prefix="/api/judge-templates", tags=["judge-templates"], dependencies=[Depends(get_current_user)])

@router.post("", response_model=JudgeTemplateResponse)
async def create_template(data: JudgeTemplateCreate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    require_admin(user)
    tmpl = JudgeTemplate(**data.model_dump())
    db.add(tmpl)
    await db.commit()
    await db.refresh(tmpl)
    return tmpl

@router.get("", response_model=list[JudgeTemplateResponse])
async def list_templates(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(JudgeTemplate))
    return result.scalars().all()

@router.get("/{template_id}", response_model=JudgeTemplateResponse)
async def get_template(template_id: int, db: AsyncSession = Depends(get_db)):
    tmpl = await db.get(JudgeTemplate, template_id)
    if not tmpl:
        raise HTTPException(404, "Judge template not found")
    return tmpl

@router.put("/{template_id}", response_model=JudgeTemplateResponse)
async def update_template(template_id: int, data: JudgeTemplateUpdate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    require_admin(user)
    tmpl = await db.get(JudgeTemplate, template_id)
    if not tmpl:
        raise HTTPException(404, "Judge template not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(tmpl, k, v)
    await db.commit()
    await db.refresh(tmpl)
    return tmpl

@router.delete("/{template_id}")
async def delete_template(template_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    require_admin(user)
    tmpl = await db.get(JudgeTemplate, template_id)
    if not tmpl:
        raise HTTPException(404, "Judge template not found")
    if tmpl.is_builtin:
        raise HTTPException(400, "Cannot delete builtin template")
    await db.delete(tmpl)
    await db.commit()
    return {"ok": True}
