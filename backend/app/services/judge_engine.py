import json
from sqlalchemy import select, and_, or_
from app.db.models import TestResult, JudgeResult, JudgeTemplate, PromptVersion, ModelConfig, TestCase
from app.services.llm_gateway import LLMGateway
from app.services.template_engine import TemplateEngine


class JudgeEngine:
    def __init__(self, gateway: LLMGateway):
        self.gateway = gateway
        self.template_engine = TemplateEngine()

    def parse_judge_response(self, text: str) -> tuple[int | None, str]:
        try:
            data = json.loads(text)
            score = data.get("score")
            reasoning = data.get("reasoning", "")
            if score is None:
                return None, "No score in response"
            return int(score), str(reasoning)
        except (json.JSONDecodeError, ValueError, TypeError):
            return None, f"Failed to parse judge response: {text[:200]}"

    async def count_pending(self, run_id: int, version_id: int, judge_model_id: int, db) -> int:
        q = await db.execute(
            select(TestResult).where(
                TestResult.run_id == run_id,
                TestResult.prompt_version_id == version_id,
                TestResult.status != "error",
            )
        )
        results = q.scalars().all()
        count = 0
        for r in results:
            jr_q = await db.execute(
                select(JudgeResult).where(
                    JudgeResult.test_result_id == r.id,
                    JudgeResult.judge_model_id == judge_model_id,
                    JudgeResult.status == "success",
                )
            )
            if not jr_q.scalars().first():
                count += 1
        return count

    async def count_existing(self, run_id: int, version_id: int, judge_model_id: int, db) -> int:
        q = await db.execute(
            select(TestResult).where(
                TestResult.run_id == run_id,
                TestResult.prompt_version_id == version_id,
            )
        )
        results = q.scalars().all()
        count = 0
        for r in results:
            jr_q = await db.execute(
                select(JudgeResult).where(
                    JudgeResult.test_result_id == r.id,
                    JudgeResult.judge_model_id == judge_model_id,
                    JudgeResult.status == "success",
                )
            )
            if jr_q.scalars().first():
                count += 1
        return count

    async def judge(self, run_id: int, prompt_version_id: int, judge_model_id: int,
                    judge_template_id: int, mode: str, db_factory):
        async with db_factory() as db:
            judge_model = await db.get(ModelConfig, judge_model_id)
            judge_template = await db.get(JudgeTemplate, judge_template_id)
            if not judge_model or not judge_template:
                return

            if mode == "full":
                results_q = await db.execute(
                    select(TestResult).where(
                        TestResult.run_id == run_id,
                        TestResult.prompt_version_id == prompt_version_id,
                    )
                )
                for r in results_q.scalars().all():
                    jr_q = await db.execute(
                        select(JudgeResult).where(
                            JudgeResult.test_result_id == r.id,
                            JudgeResult.judge_model_id == judge_model_id,
                        )
                    )
                    for jr in jr_q.scalars().all():
                        await db.delete(jr)
                await db.commit()

            results_q = await db.execute(
                select(TestResult).where(
                    TestResult.run_id == run_id,
                    TestResult.prompt_version_id == prompt_version_id,
                    TestResult.status != "error",
                )
            )
            results = results_q.scalars().all()

            for r in results:
                jr_q = await db.execute(
                    select(JudgeResult).where(
                        JudgeResult.test_result_id == r.id,
                        JudgeResult.judge_model_id == judge_model_id,
                        JudgeResult.status == "success",
                    )
                )
                if jr_q.scalars().first():
                    continue

                test_case = await db.get(TestCase, r.test_case_id)
                model_config = await db.get(ModelConfig, r.model_config_id)

                variables = {
                    "input_rendered": r.input_rendered,
                    "output": r.output,
                    "expected_output": test_case.expected_output or "" if test_case else "",
                    "test_case_name": test_case.name if test_case else "",
                    "model_name": model_config.name if model_config else "",
                }
                rendered = self.template_engine.render(judge_template.content, variables)
                messages = [{"role": "user", "content": rendered}]

                sem = self.gateway.get_semaphore(judge_model_id, judge_model.max_concurrency)
                async with sem:
                    try:
                        response_text = await self.gateway.call(judge_model, messages)
                        score, reasoning = self.parse_judge_response(response_text)
                        status = "success" if score is not None else "error"
                    except Exception as e:
                        score = None
                        reasoning = str(e)
                        status = "error"

                existing_q = await db.execute(
                    select(JudgeResult).where(
                        JudgeResult.test_result_id == r.id,
                        JudgeResult.judge_model_id == judge_model_id,
                    )
                )
                existing_jr = existing_q.scalars().first()
                if existing_jr:
                    existing_jr.status = status
                    existing_jr.auto_score = score
                    existing_jr.judge_reasoning = reasoning
                else:
                    jr = JudgeResult(
                        test_result_id=r.id,
                        judge_model_id=judge_model_id,
                        status=status,
                        auto_score=score,
                        judge_reasoning=reasoning,
                    )
                    db.add(jr)
                await db.commit()
