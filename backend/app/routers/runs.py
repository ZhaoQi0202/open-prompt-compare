import asyncio
import math
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db, async_session
from app.auth import verify_token
from app.config import settings
from app.deps import get_current_user, require_project_access, accessible_model_config_ids, require_model_access
from app.db.models import (
    TestRun, TestResult, JudgeResult, PromptVersion, ModelConfig, TestSuite, TestCase,
)
from app.schemas.run import (
    RunCreate, RunResponse, TestResultResponse,
    CompareResponse, CompareSummary, CompareRow, CompareCell,
)
from app.schemas.judge import JudgeRequest, JudgeResultUpdate, JudgeResultResponse
from app.services.llm_gateway import LLMGateway
from app.services.template_engine import TemplateEngine
from app.services.task_runner import TaskRunner, connection_manager
from app.services.judge_engine import JudgeEngine

gateway = LLMGateway()
template_engine = TemplateEngine()
task_runner = TaskRunner(gateway, template_engine)
judge_engine = JudgeEngine(gateway)

router = APIRouter(prefix="/api/runs", tags=["runs"], dependencies=[Depends(get_current_user)])

async def _ensure_models_allowed(db: AsyncSession, user, model_ids: list[int]):
    allowed = await accessible_model_config_ids(db, user)
    if allowed is None:
        return
    for mid in model_ids:
        if mid not in allowed:
            raise HTTPException(404, f"Model config {mid} not found")

@router.post("", response_model=RunResponse)
async def create_run(data: RunCreate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    await require_project_access(db, user, data.project_id)
    await _ensure_models_allowed(db, user, data.model_configs)

    for vid in data.prompt_versions:
        v = await db.get(PromptVersion, vid)
        if not v or v.prompt_id != data.prompt_id:
            raise HTTPException(400, f"Prompt version {vid} does not belong to prompt {data.prompt_id}")

    suite = await db.get(TestSuite, data.test_suite_id)
    if not suite or suite.prompt_id != data.prompt_id:
        raise HTTPException(400, "Test suite does not belong to the specified prompt")

    for mid in data.model_configs:
        mc = await db.get(ModelConfig, mid)
        if not mc:
            raise HTTPException(400, f"Model config {mid} not found")

    run = TestRun(**data.model_dump())
    db.add(run)
    await db.commit()
    await db.refresh(run)

    asyncio.create_task(task_runner.start_run(run.id, async_session))

    progress = task_runner.progress.get(run.id, {})
    return RunResponse(
        id=run.id, project_id=run.project_id, name=run.name, status=run.status,
        prompt_id=run.prompt_id, prompt_versions=run.prompt_versions,
        model_configs=run.model_configs, test_suite_id=run.test_suite_id,
        created_at=run.created_at,
        completed=progress.get("completed", 0),
        total=progress.get("total", 0),
        errors=progress.get("errors", 0),
    )


@router.get("/{run_id}", response_model=RunResponse)
async def get_run(run_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    run = await db.get(TestRun, run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    await require_project_access(db, user, run.project_id)
    progress = task_runner.progress.get(run_id, {})
    return RunResponse(
        id=run.id, project_id=run.project_id, name=run.name, status=run.status,
        prompt_id=run.prompt_id, prompt_versions=run.prompt_versions,
        model_configs=run.model_configs, test_suite_id=run.test_suite_id,
        created_at=run.created_at,
        completed=progress.get("completed", 0),
        total=progress.get("total", 0),
        errors=progress.get("errors", 0),
    )


@router.get("/{run_id}/results", response_model=list[TestResultResponse])
async def get_run_results(
    run_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    prompt_version_id: int | None = None,
    model_config_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user),
):
    run = await db.get(TestRun, run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    await require_project_access(db, user, run.project_id)
    q = select(TestResult).where(TestResult.run_id == run_id)
    if prompt_version_id is not None:
        q = q.where(TestResult.prompt_version_id == prompt_version_id)
    if model_config_id is not None:
        q = q.where(TestResult.model_config_id == model_config_id)
    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{run_id}/compare", response_model=CompareResponse)
async def compare_run(
    run_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user),
):
    run = await db.get(TestRun, run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    await require_project_access(db, user, run.project_id)

    results_q = await db.execute(select(TestResult).where(TestResult.run_id == run_id))
    all_results = results_q.scalars().all()

    judge_map: dict[int, JudgeResult] = {}
    if all_results:
        result_ids = [r.id for r in all_results]
        jr_q = await db.execute(select(JudgeResult).where(JudgeResult.test_result_id.in_(result_ids)))
        for jr in jr_q.scalars().all():
            judge_map[jr.test_result_id] = jr

    case_ids = sorted(set(r.test_case_id for r in all_results))
    total_pages = max(1, math.ceil(len(case_ids) / page_size))
    page_case_ids = case_ids[(page - 1) * page_size: page * page_size]

    case_name_map = {}
    for cid in page_case_ids:
        tc = await db.get(TestCase, cid)
        case_name_map[cid] = tc.name if tc else str(cid)

    summary_map: dict[tuple[int, int], dict] = {}
    for r in all_results:
        key = (r.prompt_version_id, r.model_config_id)
        if key not in summary_map:
            summary_map[key] = {"scores": [], "total": 0, "judged": 0}
        summary_map[key]["total"] += 1
        jr = judge_map.get(r.id)
        if jr and jr.status == "success" and jr.auto_score is not None:
            summary_map[key]["scores"].append(jr.auto_score)
            summary_map[key]["judged"] += 1

    summary = []
    for (vid, mid), s in summary_map.items():
        avg = sum(s["scores"]) / len(s["scores"]) if s["scores"] else None
        pass_rate = len([x for x in s["scores"] if x >= 7]) / len(s["scores"]) if s["scores"] else None
        summary.append(CompareSummary(
            version_id=vid, model_id=mid, avg_score=avg,
            pass_rate=pass_rate, total=s["total"], judged=s["judged"],
        ))

    matrix = []
    for cid in page_case_ids:
        cells = []
        for r in all_results:
            if r.test_case_id != cid:
                continue
            jr = judge_map.get(r.id)
            cells.append(CompareCell(
                version_id=r.prompt_version_id,
                model_id=r.model_config_id,
                output=r.output,
                auto_score=jr.auto_score if jr else None,
                human_score=jr.human_score if jr else None,
            ))
        matrix.append(CompareRow(
            test_case_id=cid, test_case_name=case_name_map.get(cid, ""), results=cells,
        ))

    return CompareResponse(summary=summary, matrix=matrix, page=page, total_pages=total_pages)


@router.post("/{run_id}/judge")
async def judge_run(run_id: int, req: JudgeRequest, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    run = await db.get(TestRun, run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    await require_project_access(db, user, run.project_id)
    await require_model_access(db, user, req.judge_model_id)
    if req.prompt_version_id not in run.prompt_versions:
        raise HTTPException(400, "Prompt version not in this run")

    if req.mode == "check":
        pending = await judge_engine.count_pending(run_id, req.prompt_version_id, req.judge_model_id, db)
        existing = await judge_engine.count_existing(run_id, req.prompt_version_id, req.judge_model_id, db)
        return {"pending": pending, "existing": existing}

    asyncio.create_task(judge_engine.judge(
        run_id, req.prompt_version_id, req.judge_model_id,
        req.judge_template_id, req.mode, async_session,
    ))
    return {"ok": True, "message": "Judging started"}


@router.post("/{run_id}/cancel")
async def cancel_run(run_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    run = await db.get(TestRun, run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    await require_project_access(db, user, run.project_id)
    task_runner.cancel_run(run_id)
    return {"ok": True}


project_runs_router = APIRouter(tags=["runs"], dependencies=[Depends(get_current_user)])


@project_runs_router.get("/api/projects/{project_id}/runs", response_model=list[RunResponse])
async def list_project_runs(
    project_id: int,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user),
):
    await require_project_access(db, user, project_id)
    q = select(TestRun).where(TestRun.project_id == project_id)
    if status:
        q = q.where(TestRun.status == status)
    q = q.order_by(TestRun.created_at.desc())
    result = await db.execute(q)
    runs = result.scalars().all()
    out = []
    for run in runs:
        progress = task_runner.progress.get(run.id, {})
        out.append(RunResponse(
            id=run.id, project_id=run.project_id, name=run.name, status=run.status,
            prompt_id=run.prompt_id, prompt_versions=run.prompt_versions,
            model_configs=run.model_configs, test_suite_id=run.test_suite_id,
            created_at=run.created_at,
            completed=progress.get("completed", 0),
            total=progress.get("total", 0),
            errors=progress.get("errors", 0),
        ))
    return out


judge_results_router = APIRouter(prefix="/api/judge-results", tags=["judge"], dependencies=[Depends(get_current_user)])


@judge_results_router.put("/{judge_result_id}", response_model=JudgeResultResponse)
async def update_judge_result(judge_result_id: int, req: JudgeResultUpdate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    jr = await db.get(JudgeResult, judge_result_id)
    if not jr:
        raise HTTPException(404, "Judge result not found")
    tr = await db.get(TestResult, jr.test_result_id)
    if not tr:
        raise HTTPException(404, "Judge result not found")
    run = await db.get(TestRun, tr.run_id)
    if not run:
        raise HTTPException(404, "Judge result not found")
    await require_project_access(db, user, run.project_id)
    jr.human_score = req.human_score
    await db.commit()
    await db.refresh(jr)
    return jr


async def ws_run(websocket: WebSocket, run_id: int, token: str | None = None):
    if settings.auth_enabled:
        if not token or not verify_token(token, settings.effective_jwt_secret):
            await websocket.close(code=1008)
            return
    await connection_manager.connect(run_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect(run_id, websocket)
