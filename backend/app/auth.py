from datetime import datetime, timedelta
from jose import jwt, JWTError
def create_token(secret: str, user_id: int, is_admin: bool) -> str:
    expire = datetime.utcnow() + timedelta(days=7)
    return jwt.encode(
        {"exp": expire, "sub": str(user_id), "adm": is_admin},
        secret,
        algorithm="HS256",
    )

def verify_token(token: str, secret: str) -> dict | None:
    try:
        return jwt.decode(token, secret, algorithms=["HS256"])
    except JWTError:
        return None
