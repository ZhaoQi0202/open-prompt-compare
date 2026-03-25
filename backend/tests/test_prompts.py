import pytest

@pytest.mark.asyncio
async def test_create_prompt_and_version(client):
    proj = (await client.post("/api/projects", json={"name": "P"})).json()
    prompt = (await client.post(f"/api/projects/{proj['id']}/prompts", json={"name": "PR"})).json()
    assert prompt["name"] == "PR"
    ver = (await client.post(f"/api/prompts/{prompt['id']}/versions", json={"template_content": "Hello {{name}}", "variables_schema": [{"name": "name", "type": "string", "required": True}]})).json()
    assert ver["version_number"] == 1
    assert ver["template_content"] == "Hello {{name}}"

@pytest.mark.asyncio
async def test_version_auto_increments(client):
    proj = (await client.post("/api/projects", json={"name": "P"})).json()
    prompt = (await client.post(f"/api/projects/{proj['id']}/prompts", json={"name": "PR"})).json()
    v1 = (await client.post(f"/api/prompts/{prompt['id']}/versions", json={"template_content": "v1"})).json()
    v2 = (await client.post(f"/api/prompts/{prompt['id']}/versions", json={"template_content": "v2"})).json()
    assert v1["version_number"] == 1
    assert v2["version_number"] == 2
    assert v2["parent_version_id"] == v1["id"]
