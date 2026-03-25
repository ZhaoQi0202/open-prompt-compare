import pytest
from app.crypto import encrypt, decrypt, mask_api_key

def test_encrypt_decrypt_roundtrip():
    key = "test-encryption-key-1234"
    plaintext = "sk-abc123secret"
    encrypted = encrypt(plaintext, key)
    assert encrypted != plaintext
    assert decrypt(encrypted, key) == plaintext

def test_mask_api_key():
    assert mask_api_key("sk-abc123secretkey") == "sk-abc...***"
    assert mask_api_key("short") == "***"
    assert mask_api_key("") == ""
