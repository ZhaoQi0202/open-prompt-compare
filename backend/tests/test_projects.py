import pytest

@pytest.mark.asyncio
async def test_create_project(client):
    resp = await client.post("/api/projects", json={"name": "Test Project"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Project"
    assert "id" in data

@pytest.mark.asyncio
async def test_list_projects(client):
    await client.post("/api/projects", json={"name": "P1"})
    await client.post("/api/projects", json={"name": "P2"})
    resp = await client.get("/api/projects")
    assert resp.status_code == 200
    assert len(resp.json()) == 2

@pytest.mark.asyncio
async def test_delete_project(client):
    resp = await client.post("/api/projects", json={"name": "Del"})
    pid = resp.json()["id"]
    resp = await client.delete(f"/api/projects/{pid}")
    assert resp.status_code == 200
    resp = await client.get("/api/projects")
    assert len(resp.json()) == 0
