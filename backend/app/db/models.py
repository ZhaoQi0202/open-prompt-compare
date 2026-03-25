from datetime import datetime
from sqlalchemy import String, Integer, Text, Boolean, ForeignKey, UniqueConstraint, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

class UserProject(Base):
    __tablename__ = "user_projects"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)

class UserModelConfig(Base):
    __tablename__ = "user_model_configs"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    model_config_id: Mapped[int] = mapped_column(ForeignKey("model_configs.id", ondelete="CASCADE"), primary_key=True)

class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    prompts: Mapped[list["Prompt"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    test_suites: Mapped[list["TestSuite"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    test_runs: Mapped[list["TestRun"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    snapshots: Mapped[list["ProjectSnapshot"]] = relationship(back_populates="project", cascade="all, delete-orphan")

class ProjectSnapshot(Base):
    __tablename__ = "project_snapshots"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    version_label: Mapped[str] = mapped_column(String(100))
    snapshot_data: Mapped[list] = mapped_column(JSON)
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    project: Mapped["Project"] = relationship(back_populates="snapshots")

class Prompt(Base):
    __tablename__ = "prompts"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    current_version_id: Mapped[int | None] = mapped_column(ForeignKey("prompt_versions.id", use_alter=True), nullable=True)
    project: Mapped["Project"] = relationship(back_populates="prompts")
    versions: Mapped[list["PromptVersion"]] = relationship(back_populates="prompt", foreign_keys="PromptVersion.prompt_id", cascade="all, delete-orphan")

class PromptVersion(Base):
    __tablename__ = "prompt_versions"
    id: Mapped[int] = mapped_column(primary_key=True)
    prompt_id: Mapped[int] = mapped_column(ForeignKey("prompts.id", ondelete="CASCADE"))
    version_number: Mapped[int] = mapped_column(Integer)
    template_content: Mapped[str] = mapped_column(Text)
    variables_schema: Mapped[list] = mapped_column(JSON, default=list)
    parent_version_id: Mapped[int | None] = mapped_column(ForeignKey("prompt_versions.id"), nullable=True)
    change_note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    prompt: Mapped["Prompt"] = relationship(back_populates="versions", foreign_keys=[prompt_id])

class ModelConfig(Base):
    __tablename__ = "model_configs"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    provider_type: Mapped[str] = mapped_column(String(50))
    base_url: Mapped[str] = mapped_column(String(500))
    api_key_encrypted: Mapped[str] = mapped_column(Text, default="")
    model_name: Mapped[str] = mapped_column(String(255))
    custom_headers: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    custom_body_template: Mapped[str | None] = mapped_column(Text, nullable=True)
    response_extract_path: Mapped[str] = mapped_column(String(500), default="choices[0].message.content")
    max_concurrency: Mapped[int] = mapped_column(Integer, default=5)
    connectivity_verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

class TestSuite(Base):
    __tablename__ = "test_suites"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    prompt_id: Mapped[int] = mapped_column(ForeignKey("prompts.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    project: Mapped["Project"] = relationship(back_populates="test_suites")
    test_cases: Mapped[list["TestCase"]] = relationship(back_populates="suite", cascade="all, delete-orphan")

class TestCase(Base):
    __tablename__ = "test_cases"
    id: Mapped[int] = mapped_column(primary_key=True)
    suite_id: Mapped[int] = mapped_column(ForeignKey("test_suites.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    variables: Mapped[dict] = mapped_column(JSON, default=dict)
    expected_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[str] = mapped_column(String(500), default="")
    suite: Mapped["TestSuite"] = relationship(back_populates="test_cases")

class TestRun(Base):
    __tablename__ = "test_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="pending")
    prompt_id: Mapped[int] = mapped_column(ForeignKey("prompts.id"))
    prompt_versions: Mapped[list] = mapped_column(JSON)
    model_configs: Mapped[list] = mapped_column(JSON)
    test_suite_id: Mapped[int] = mapped_column(ForeignKey("test_suites.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    project: Mapped["Project"] = relationship(back_populates="test_runs")
    results: Mapped[list["TestResult"]] = relationship(back_populates="run", cascade="all, delete-orphan")

class TestResult(Base):
    __tablename__ = "test_results"
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("test_runs.id", ondelete="CASCADE"))
    prompt_version_id: Mapped[int] = mapped_column(Integer)
    model_config_id: Mapped[int] = mapped_column(Integer)
    test_case_id: Mapped[int] = mapped_column(Integer)
    input_rendered: Mapped[str] = mapped_column(Text, default="")
    output: Mapped[str] = mapped_column(Text, default="")
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    token_usage: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    run: Mapped["TestRun"] = relationship(back_populates="results")
    judge_results: Mapped[list["JudgeResult"]] = relationship(back_populates="test_result", cascade="all, delete-orphan")

class JudgeResult(Base):
    __tablename__ = "judge_results"
    __table_args__ = (UniqueConstraint("test_result_id", "judge_model_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    test_result_id: Mapped[int] = mapped_column(ForeignKey("test_results.id", ondelete="CASCADE"))
    judge_model_id: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    auto_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    human_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    judge_reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    test_result: Mapped["TestResult"] = relationship(back_populates="judge_results")

class JudgeTemplate(Base):
    __tablename__ = "judge_templates"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
