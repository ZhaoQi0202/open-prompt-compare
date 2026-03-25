from pydantic import BaseModel

class JudgeRequest(BaseModel):
    prompt_version_id: int
    judge_model_id: int
    judge_template_id: int
    mode: str = "incremental"

class JudgeResultUpdate(BaseModel):
    human_score: int | None

class JudgeResultResponse(BaseModel):
    id: int
    test_result_id: int
    judge_model_id: int
    status: str
    auto_score: int | None
    human_score: int | None
    judge_reasoning: str | None
    class Config:
        from_attributes = True

class JudgeTemplateCreate(BaseModel):
    name: str
    content: str

class JudgeTemplateUpdate(BaseModel):
    name: str | None = None
    content: str | None = None

class JudgeTemplateResponse(BaseModel):
    id: int
    name: str
    content: str
    is_builtin: bool
    class Config:
        from_attributes = True
