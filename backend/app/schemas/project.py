from pydantic import BaseModel
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str
    description: str = ""

class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class SnapshotCreate(BaseModel):
    version_label: str
    note: str = ""

class SnapshotResponse(BaseModel):
    id: int
    project_id: int
    version_label: str
    snapshot_data: list
    note: str
    created_at: datetime
    class Config:
        from_attributes = True
