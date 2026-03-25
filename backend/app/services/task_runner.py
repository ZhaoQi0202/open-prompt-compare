import asyncio
import time
from fastapi import WebSocket
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.models import TestRun, TestResult, PromptVersion, TestCase, ModelConfig, TestSuite
from app.services.llm_gateway import LLMGateway
from app.services.template_engine import TemplateEngine


class ConnectionManager:
    def __init__(self):
        self._connections: dict[int, list[WebSocket]] = {}

    async def connect(self, run_id: int, websocket: WebSocket):
        await websocket.accept()
        self._connections.setdefault(run_id, []).append(websocket)

    def disconnect(self, run_id: int, websocket: WebSocket):
        conns = self._connections.get(run_id, [])
        if websocket in conns:
            conns.remove(websocket)

    async def broadcast(self, run_id: int, data: dict):
        for ws in self._connections.get(run_id, []):
            try:
                await ws.send_json(data)
            except Exception:
                pass


connection_manager = ConnectionManager()


class TaskRunner:
    def __init__(self, gateway: LLMGateway, template_engine: TemplateEngine):
        self.gateway = gateway
        self.template_engine = template_engine
        self._cancelled: set[int] = set()
        self.progress: dict[int, dict] = {}

    async def start_run(self, run_id: int, db_factory):
        async with db_factory() as db:
            run = await db.get(TestRun, run_id)
            if not run:
                return

            run.status = "running"
            await db.commit()

            version_ids = run.prompt_versions
            model_config_ids = run.model_configs

            versions = []
            for vid in version_ids:
                v = await db.get(PromptVersion, vid)
                if v:
                    versions.append(v)

            models = []
            for mid in model_config_ids:
                m = await db.get(ModelConfig, mid)
                if m:
                    models.append(m)

            suite = await db.get(TestSuite, run.test_suite_id)
            cases_result = await db.execute(
                select(TestCase).where(TestCase.suite_id == suite.id)
            )
            cases = cases_result.scalars().all()

            total = len(versions) * len(models) * len(cases)
            self.progress[run_id] = {"completed": 0, "total": total, "errors": 0}

            for version in versions:
                for model in models:
                    for case in cases:
                        if run_id in self._cancelled:
                            run.status = "cancelled"
                            await db.commit()
                            await connection_manager.broadcast(run_id, {
                                "type": "cancelled", **self.progress[run_id]
                            })
                            return

                        valid = self.template_engine.validate(
                            version.variables_schema or [], case.variables or {}
                        )

                        if not valid:
                            result = TestResult(
                                run_id=run_id,
                                prompt_version_id=version.id,
                                model_config_id=model.id,
                                test_case_id=case.id,
                                status="skipped",
                                error_message="Variable validation failed",
                            )
                            db.add(result)
                            await db.commit()
                            self.progress[run_id]["completed"] += 1
                            self.progress[run_id]["errors"] += 1
                            await connection_manager.broadcast(run_id, {
                                "type": "progress", **self.progress[run_id]
                            })
                            continue

                        rendered = self.template_engine.render(
                            version.template_content, case.variables or {}
                        )
                        messages = [{"role": "user", "content": rendered}]

                        sem = self.gateway.get_semaphore(model.id, model.max_concurrency)
                        async with sem:
                            try:
                                start = time.time()
                                output = await self.gateway.call(model, messages)
                                latency = int((time.time() - start) * 1000)
                                result = TestResult(
                                    run_id=run_id,
                                    prompt_version_id=version.id,
                                    model_config_id=model.id,
                                    test_case_id=case.id,
                                    input_rendered=rendered,
                                    output=output,
                                    latency_ms=latency,
                                    status="success",
                                )
                            except Exception as e:
                                result = TestResult(
                                    run_id=run_id,
                                    prompt_version_id=version.id,
                                    model_config_id=model.id,
                                    test_case_id=case.id,
                                    input_rendered=rendered,
                                    status="error",
                                    error_message=str(e),
                                )
                                self.progress[run_id]["errors"] += 1

                        db.add(result)
                        await db.commit()
                        self.progress[run_id]["completed"] += 1
                        await connection_manager.broadcast(run_id, {
                            "type": "progress", **self.progress[run_id]
                        })

            if run_id not in self._cancelled:
                run.status = "completed"
            else:
                run.status = "cancelled"
            await db.commit()
            await connection_manager.broadcast(run_id, {
                "type": "completed", **self.progress[run_id]
            })

    def cancel_run(self, run_id: int):
        self._cancelled.add(run_id)
