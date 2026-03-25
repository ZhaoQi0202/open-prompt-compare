from pydantic import BaseModel, Field, field_validator

class TestSuiteCreate(BaseModel):
    prompt_id: int = Field(gt=0)
    name: str = Field(min_length=1)
    description: str = ""

    @field_validator("prompt_id", mode="before")
    @classmethod
    def prompt_id_not_null(cls, v: object) -> object:
        if v is None:
            raise ValueError("请选择 Prompt")
        return v

    @field_validator("name", mode="before")
    @classmethod
    def name_strip(cls, v: object) -> object:
        if v is None:
            return ""
        if isinstance(v, str):
            return v.strip()
        return str(v).strip()

    @field_validator("description", mode="before")
    @classmethod
    def description_none_to_empty(cls, v: object) -> object:
        return "" if v is None else v

class TestSuiteUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

class TestSuiteResponse(BaseModel):
    id: int
    project_id: int
    prompt_id: int
    name: str
    description: str
    class Config:
        from_attributes = True

class TestCaseCreate(BaseModel):
    name: str
    variables: dict = {}
    expected_output: str | None = None
    tags: str = ""

class TestCaseUpdate(BaseModel):
    name: str | None = None
    variables: dict | None = None
    expected_output: str | None = None
    tags: str | None = None

class TestCaseResponse(BaseModel):
    id: int
    suite_id: int
    name: str
    variables: dict
    expected_output: str | None
    tags: str
    class Config:
        from_attributes = True

class TestCaseImport(BaseModel):
    name: str | None = None
    variables: dict
    expected_output: str | None = None
