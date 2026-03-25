from pydantic import BaseModel
from datetime import datetime

class PromptCreate(BaseModel):
    name: str
    description: str = ""

class PromptUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

class PromptResponse(BaseModel):
    id: int
    project_id: int
    name: str
    description: str
    current_version_id: int | None
    class Config:
        from_attributes = True

class VersionCreate(BaseModel):
    template_content: str
    variables_schema: list[dict] = []
    parent_version_id: int | None = None
    change_note: str = ""

class VersionResponse(BaseModel):
    id: int
    prompt_id: int
    version_number: int
    template_content: str
    variables_schema: list[dict]
    parent_version_id: int | None
    change_note: str
    created_at: datetime
    class Config:
        from_attributes = True
