from pydantic import BaseModel, field_validator
from datetime import datetime

class RunCreate(BaseModel):
    name: str
    project_id: int
    prompt_id: int
    prompt_versions: list[int]
    model_configs: list[int]
    test_suite_id: int

    @field_validator("prompt_versions", "model_configs")
    @classmethod
    def non_empty(cls, v):
        if not v:
            raise ValueError("must have at least 1 item")
        return v

class RunResponse(BaseModel):
    id: int
    project_id: int
    name: str
    status: str
    prompt_id: int
    prompt_versions: list[int]
    model_configs: list[int]
    test_suite_id: int
    created_at: datetime
    completed: int = 0
    total: int = 0
    errors: int = 0
    class Config:
        from_attributes = True

class TestResultResponse(BaseModel):
    id: int
    run_id: int
    prompt_version_id: int
    model_config_id: int
    test_case_id: int
    input_rendered: str
    output: str
    latency_ms: int | None
    token_usage: dict | None
    status: str
    error_message: str | None
    class Config:
        from_attributes = True

class CompareCell(BaseModel):
    version_id: int
    model_id: int
    output: str
    auto_score: int | None
    human_score: int | None

class CompareRow(BaseModel):
    test_case_id: int
    test_case_name: str
    results: list[CompareCell]

class CompareSummary(BaseModel):
    version_id: int
    model_id: int
    avg_score: float | None
    pass_rate: float | None
    total: int
    judged: int

class CompareResponse(BaseModel):
    summary: list[CompareSummary]
    matrix: list[CompareRow]
    page: int
    total_pages: int
