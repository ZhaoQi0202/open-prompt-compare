from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.deps import get_current_user, require_admin, require_project_access, accessible_project_ids
from app.db.models import Project, Prompt, PromptVersion, ProjectSnapshot
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, SnapshotCreate, SnapshotResponse

router = APIRouter(prefix="/api/projects", tags=["projects"], dependencies=[Depends(get_current_user)])

@router.post("", response_model=ProjectResponse)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    require_admin(user)
    project = Project(**data.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project

@router.get("", response_model=list[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    q = select(Project).order_by(Project.created_at.desc())
    ids = await accessible_project_ids(db, user)
    if ids is not None:
        if not ids:
            return []
        q = q.where(Project.id.in_(ids))
    result = await db.execute(q)
    return result.scalars().all()

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    await require_project_access(db, user, project_id)
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: int, data: ProjectUpdate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    require_admin(user)
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(project, k, v)
    await db.commit()
    await db.refresh(project)
    return project

@router.delete("/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    require_admin(user)
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    await db.delete(project)
    await db.commit()
    return {"ok": True}

@router.post("/{project_id}/snapshot", response_model=SnapshotResponse)
async def create_snapshot(project_id: int, data: SnapshotCreate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    await require_project_access(db, user, project_id)
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    result = await db.execute(select(Prompt).where(Prompt.project_id == project_id))
    prompts = result.scalars().all()
    snapshot_data = []
    for p in prompts:
        if p.current_version_id:
            version = await db.get(PromptVersion, p.current_version_id)
            snapshot_data.append({
                "prompt_id": p.id,
                "prompt_name": p.name,
                "version_id": version.id,
                "version_number": version.version_number,
                "template_content": version.template_content,
                "variables_schema": version.variables_schema,
            })
    snapshot = ProjectSnapshot(project_id=project_id, snapshot_data=snapshot_data, **data.model_dump())
    db.add(snapshot)
    await db.commit()
    await db.refresh(snapshot)
    return snapshot

@router.get("/{project_id}/snapshots", response_model=list[SnapshotResponse])
async def list_snapshots(project_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    await require_project_access(db, user, project_id)
    result = await db.execute(select(ProjectSnapshot).where(ProjectSnapshot.project_id == project_id))
    return result.scalars().all()

snapshot_router = APIRouter(prefix="/api/project-snapshots", tags=["projects"], dependencies=[Depends(get_current_user)])

@snapshot_router.get("/{snapshot_id}", response_model=SnapshotResponse)
async def get_snapshot(snapshot_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    snapshot = await db.get(ProjectSnapshot, snapshot_id)
    if not snapshot:
        raise HTTPException(404, "Snapshot not found")
    await require_project_access(db, user, snapshot.project_id)
    return snapshot

@snapshot_router.post("/{snapshot_id}/restore")
async def restore_snapshot(snapshot_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    snapshot = await db.get(ProjectSnapshot, snapshot_id)
    if not snapshot:
        raise HTTPException(404, "Snapshot not found")
    await require_project_access(db, user, snapshot.project_id)
    for item in snapshot.snapshot_data:
        prompt = await db.get(Prompt, item["prompt_id"])
        if prompt:
            prompt.current_version_id = item["version_id"]
    await db.commit()
    return {"ok": True}
