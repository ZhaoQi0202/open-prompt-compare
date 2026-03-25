from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str

class MeResponse(BaseModel):
    id: int
    username: str
    is_admin: bool

class LogoutResponse(BaseModel):
    ok: bool = True
