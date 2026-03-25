import pytest
from app.services.template_engine import TemplateEngine

engine = TemplateEngine()

def test_render_simple():
    result = engine.render("Hello {{name}}", {"name": "World"})
    assert result == "Hello World"

def test_render_multiple_vars():
    tpl = "{{role}} answers {{question}}"
    result = engine.render(tpl, {"role": "Bot", "question": "Why?"})
    assert result == "Bot answers Why?"

def test_extract_variables():
    vars = engine.extract_variables("{{a}} and {{b}} and {{a}}")
    assert sorted(vars) == ["a", "b"]

def test_validate_variables_ok():
    schema = [{"name": "role", "type": "string", "required": True}]
    variables = {"role": "Bot"}
    assert engine.validate(schema, variables) is True

def test_validate_variables_missing_required():
    schema = [{"name": "role", "type": "string", "required": True}]
    assert engine.validate(schema, {}) is False

def test_validate_variables_optional_missing():
    schema = [{"name": "role", "type": "string", "required": False}]
    assert engine.validate(schema, {}) is True
