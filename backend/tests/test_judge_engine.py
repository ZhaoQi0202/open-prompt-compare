import pytest
from app.services.judge_engine import JudgeEngine
from unittest.mock import AsyncMock


def test_parse_judge_response_valid():
    engine = JudgeEngine(gateway=AsyncMock())
    score, reasoning = engine.parse_judge_response('{"score": 8, "reasoning": "Good output"}')
    assert score == 8
    assert reasoning == "Good output"


def test_parse_judge_response_invalid():
    engine = JudgeEngine(gateway=AsyncMock())
    score, reasoning = engine.parse_judge_response("This is not JSON")
    assert score is None
