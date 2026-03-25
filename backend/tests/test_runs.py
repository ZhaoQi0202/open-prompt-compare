import pytest


@pytest.mark.asyncio
async def test_create_run_validates_versions(client):
    proj = (await client.post("/api/projects", json={"name": "P"})).json()
    p1 = (await client.post(f"/api/projects/{proj['id']}/prompts", json={"name": "PR1"})).json()
    p2 = (await client.post(f"/api/projects/{proj['id']}/prompts", json={"name": "PR2"})).json()
    v2 = (await client.post(f"/api/prompts/{p2['id']}/versions", json={"template_content": "hi"})).json()
    suite = (await client.post(f"/api/projects/{proj['id']}/test-suites", json={"prompt_id": p1["id"], "name": "S"})).json()
    mc = (await client.post("/api/model-configs", json={"name": "M", "provider_type": "openai_compat", "base_url": "http://fake", "model_name": "m"})).json()
    resp = await client.post("/api/runs", json={"name": "R", "project_id": proj["id"], "prompt_id": p1["id"], "prompt_versions": [v2["id"]], "model_configs": [mc["id"]], "test_suite_id": suite["id"]})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_create_run_validates_suite_prompt(client):
    proj = (await client.post("/api/projects", json={"name": "P"})).json()
    p1 = (await client.post(f"/api/projects/{proj['id']}/prompts", json={"name": "PR1"})).json()
    p2 = (await client.post(f"/api/projects/{proj['id']}/prompts", json={"name": "PR2"})).json()
    v1 = (await client.post(f"/api/prompts/{p1['id']}/versions", json={"template_content": "hi"})).json()
    suite_p2 = (await client.post(f"/api/projects/{proj['id']}/test-suites", json={"prompt_id": p2["id"], "name": "S"})).json()
    mc = (await client.post("/api/model-configs", json={"name": "M", "provider_type": "openai_compat", "base_url": "http://fake", "model_name": "m"})).json()
    resp = await client.post("/api/runs", json={"name": "R", "project_id": proj["id"], "prompt_id": p1["id"], "prompt_versions": [v1["id"]], "model_configs": [mc["id"]], "test_suite_id": suite_p2["id"]})
    assert resp.status_code == 400
