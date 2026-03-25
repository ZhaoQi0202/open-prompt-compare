from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    password: str
    is_admin: bool = False
    project_ids: list[int] = []
    model_config_ids: list[int] = []

class UserUpdate(BaseModel):
    username: str | None = None
    password: str | None = None
    is_admin: bool | None = None
    project_ids: list[int] | None = None
    model_config_ids: list[int] | None = None

class UserDetailResponse(BaseModel):
    id: int
    username: str
    is_admin: bool
    project_ids: list[int]
    model_config_ids: list[int]
    class Config:
        from_attributes = True
