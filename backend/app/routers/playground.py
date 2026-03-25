import time
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.deps import get_current_user, require_model_access
from app.db.models import ModelConfig
from app.services.llm_gateway import LLMGateway
from app.services.template_engine import TemplateEngine

router = APIRouter(prefix="/api/playground", tags=["playground"], dependencies=[Depends(get_current_user)])

gateway = LLMGateway()
engine = TemplateEngine()


class PlaygroundRunRequest(BaseModel):
    template_content: str
    variables: dict = {}
    model_config_id: int


class PlaygroundRunResponse(BaseModel):
    output: str
    latency_ms: int
    tokens_used: int | None = None


@router.post("/run", response_model=PlaygroundRunResponse)
async def playground_run(req: PlaygroundRunRequest, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    await require_model_access(db, user, req.model_config_id)
    mc = await db.get(ModelConfig, req.model_config_id)
    if not mc:
        raise HTTPException(404, "Model config not found")

    rendered = engine.render(req.template_content, req.variables)
    messages = [{"role": "user", "content": rendered}]

    sem = gateway.get_semaphore(mc.id, mc.max_concurrency)
    start = time.time()
    async with sem:
        output = await gateway.call(mc, messages)
    latency_ms = int((time.time() - start) * 1000)

    return PlaygroundRunResponse(output=output, latency_ms=latency_ms)
