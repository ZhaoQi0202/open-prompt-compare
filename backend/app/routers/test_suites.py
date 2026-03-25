from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.deps import get_current_user, require_project_access, require_suite_access, require_test_case_access
from app.db.models import TestSuite, TestCase
from app.schemas.test_suite import (
    TestSuiteCreate, TestSuiteUpdate, TestSuiteResponse,
    TestCaseCreate, TestCaseUpdate, TestCaseResponse, TestCaseImport,
)

router = APIRouter(prefix="/api", tags=["test-suites"], dependencies=[Depends(get_current_user)])

@router.post("/projects/{project_id}/test-suites", response_model=TestSuiteResponse)
async def create_suite(project_id: int, data: TestSuiteCreate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    await require_project_access(db, user, project_id)
    suite = TestSuite(project_id=project_id, **data.model_dump())
    db.add(suite)
    await db.commit()
    await db.refresh(suite)
    return suite

@router.get("/projects/{project_id}/test-suites", response_model=list[TestSuiteResponse])
async def list_suites(project_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    await require_project_access(db, user, project_id)
    result = await db.execute(select(TestSuite).where(TestSuite.project_id == project_id))
    return result.scalars().all()

@router.put("/test-suites/{suite_id}", response_model=TestSuiteResponse)
async def update_suite(suite_id: int, data: TestSuiteUpdate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    suite = await require_suite_access(db, user, suite_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(suite, k, v)
    await db.commit()
    await db.refresh(suite)
    return suite

@router.delete("/test-suites/{suite_id}")
async def delete_suite(suite_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    suite = await require_suite_access(db, user, suite_id)
    await db.delete(suite)
    await db.commit()
    return {"ok": True}

@router.post("/test-suites/{suite_id}/test-cases", response_model=TestCaseResponse)
async def create_case(suite_id: int, data: TestCaseCreate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    await require_suite_access(db, user, suite_id)
    case = TestCase(suite_id=suite_id, **data.model_dump())
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return case

@router.get("/test-suites/{suite_id}/test-cases", response_model=list[TestCaseResponse])
async def list_cases(suite_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    await require_suite_access(db, user, suite_id)
    result = await db.execute(select(TestCase).where(TestCase.suite_id == suite_id))
    return result.scalars().all()

@router.put("/test-cases/{case_id}", response_model=TestCaseResponse)
async def update_case(case_id: int, data: TestCaseUpdate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    case = await require_test_case_access(db, user, case_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(case, k, v)
    await db.commit()
    await db.refresh(case)
    return case

@router.delete("/test-cases/{case_id}")
async def delete_case(case_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    case = await require_test_case_access(db, user, case_id)
    await db.delete(case)
    await db.commit()
    return {"ok": True}

@router.post("/test-suites/{suite_id}/import")
async def import_cases(suite_id: int, data: list[TestCaseImport], db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    suite = await require_suite_access(db, user, suite_id)
    existing = await db.execute(select(TestCase).where(TestCase.suite_id == suite_id))
    count_existing = len(existing.scalars().all())
    for i, item in enumerate(data, start=count_existing + 1):
        name = item.name or f"Case {i}"
        case = TestCase(suite_id=suite_id, name=name, variables=item.variables, expected_output=item.expected_output)
        db.add(case)
    await db.commit()
    return {"imported": len(data)}
