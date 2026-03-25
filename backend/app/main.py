import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from app.database import init_db, async_session
from app.config import settings
from app.db.models import JudgeTemplate, User
from app.deps import hash_password
from app.routers import auth, projects, prompts, admin
from app.routers import test_suites, model_configs, judge_templates, runs, playground

DEFAULT_JUDGE_TEMPLATE = """You are an evaluation judge. Score the following AI output on a scale of 0-10.

Test case: {{test_case_name}}
Model: {{model_name}}
Input prompt: {{input_rendered}}
AI output: {{output}}
Expected output: {{expected_output}}

Respond in JSON format: {"score": <0-10>, "reasoning": "<your reasoning>"}"""

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    async with async_session() as session:
        result = await session.execute(select(User))
        if not result.scalars().first():
            session.add(User(username="admin", password_hash=hash_password("admin"), is_admin=True))
            await session.commit()
        result = await session.execute(select(JudgeTemplate).where(JudgeTemplate.is_builtin == True))
        if not result.scalars().first():
            tmpl = JudgeTemplate(name="Default Judge Template", content=DEFAULT_JUDGE_TEMPLATE, is_builtin=True)
            session.add(tmpl)
            await session.commit()
    yield

app = FastAPI(title="Open Prompt Compare", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(projects.router)
app.include_router(projects.snapshot_router)
app.include_router(prompts.router)
app.include_router(test_suites.router)
app.include_router(model_configs.router)
app.include_router(judge_templates.router)
app.include_router(runs.router)
app.include_router(runs.project_runs_router)
app.include_router(runs.judge_results_router)
app.include_router(playground.router)


from starlette.websockets import WebSocket

@app.websocket("/ws/runs/{run_id}")
async def websocket_run(websocket: WebSocket, run_id: int, token: str | None = None):
    await runs.ws_run(websocket, run_id, token)


@app.get("/api/health")
async def health():
    return {"status": "ok"}

static_dir = Path("./static")
if not static_dir.exists():
    static_dir = Path("../frontend/dist")
if static_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = static_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(static_dir / "index.html"))
