import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.llm_gateway import LLMGateway


@pytest.mark.asyncio
async def test_extract_response():
    gw = LLMGateway()
    data = {"choices": [{"message": {"content": "Hello"}}]}
    assert gw._extract_response(data, "choices[0].message.content") == "Hello"


@pytest.mark.asyncio
async def test_extract_response_custom_path():
    gw = LLMGateway()
    data = {"result": {"text": "Hi"}}
    assert gw._extract_response(data, "result.text") == "Hi"


def test_semaphore_management():
    gw = LLMGateway()
    s1 = gw.get_semaphore(1, 5)
    s2 = gw.get_semaphore(1, 5)
    assert s1 is s2
    s3 = gw.get_semaphore(2, 3)
    assert s3 is not s1
