from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

from app.db.models import *

async def get_db():
    async with async_session() as session:
        yield session

async def _migrate_sqlite_columns(conn):
    if "sqlite" not in settings.database_url:
        return
    try:
        await conn.execute(text("ALTER TABLE model_configs ADD COLUMN connectivity_verified_at DATETIME"))
    except OperationalError as e:
        if "duplicate column" not in str(e).lower():
            raise

async def init_db():
    async with engine.begin() as conn:
        await conn.execute(text("PRAGMA journal_mode=WAL"))
        await conn.run_sync(Base.metadata.create_all)
        await _migrate_sqlite_columns(conn)
