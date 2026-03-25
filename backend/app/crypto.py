from cryptography.fernet import Fernet
import hashlib
import base64

def _derive_key(password: str) -> bytes:
    key = hashlib.sha256(password.encode()).digest()
    return base64.urlsafe_b64encode(key)

def encrypt(plaintext: str, key: str) -> str:
    f = Fernet(_derive_key(key))
    return f.encrypt(plaintext.encode()).decode()

def decrypt(ciphertext: str, key: str) -> str:
    f = Fernet(_derive_key(key))
    return f.decrypt(ciphertext.encode()).decode()

def mask_api_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 6:
        return "***"
    return key[:6] + "...***"
