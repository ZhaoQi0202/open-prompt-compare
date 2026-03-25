import pytest

@pytest.mark.asyncio
async def test_create_suite_and_cases(client):
    proj = (await client.post("/api/projects", json={"name": "P"})).json()
    prompt = (await client.post(f"/api/projects/{proj['id']}/prompts", json={"name": "PR"})).json()
    suite = (await client.post(f"/api/projects/{proj['id']}/test-suites", json={"prompt_id": prompt["id"], "name": "Suite1"})).json()
    assert suite["name"] == "Suite1"
    case = (await client.post(f"/api/test-suites/{suite['id']}/test-cases", json={"name": "C1", "variables": {"q": "hi"}})).json()
    assert case["variables"] == {"q": "hi"}

@pytest.mark.asyncio
async def test_import_cases(client):
    proj = (await client.post("/api/projects", json={"name": "P"})).json()
    prompt = (await client.post(f"/api/projects/{proj['id']}/prompts", json={"name": "PR"})).json()
    suite = (await client.post(f"/api/projects/{proj['id']}/test-suites", json={"prompt_id": prompt["id"], "name": "S"})).json()
    data = [{"variables": {"q": "a"}}, {"name": "named", "variables": {"q": "b"}}]
    resp = await client.post(f"/api/test-suites/{suite['id']}/import", json=data)
    assert resp.status_code == 200
    assert resp.json()["imported"] == 2
