from datetime import datetime
from pydantic import BaseModel

class ModelConfigCreate(BaseModel):
    name: str
    provider_type: str
    base_url: str
    api_key: str = ""
    model_name: str
    custom_headers: dict | None = None
    custom_body_template: str | None = None
    response_extract_path: str = "choices[0].message.content"
    max_concurrency: int = 5

class ModelConfigUpdate(BaseModel):
    name: str | None = None
    provider_type: str | None = None
    base_url: str | None = None
    api_key: str | None = None
    model_name: str | None = None
    custom_headers: dict | None = None
    custom_body_template: str | None = None
    response_extract_path: str | None = None
    max_concurrency: int | None = None

class ModelConfigResponse(BaseModel):
    id: int
    name: str
    provider_type: str
    base_url: str
    api_key_masked: str
    model_name: str
    custom_headers: dict | None
    custom_body_template: str | None
    response_extract_path: str
    max_concurrency: int
    connectivity_verified_at: datetime | None = None
    class Config:
        from_attributes = True
