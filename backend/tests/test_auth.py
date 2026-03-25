import pytest
from app.auth import create_token, verify_token

def test_create_and_verify_token():
    secret = "test-secret"
    token = create_token(secret, 1, True)
    payload = verify_token(token, secret)
    assert payload is not None

def test_verify_invalid_token():
    payload = verify_token("invalid.token.here", "test-secret")
    assert payload is None
