from pydantic_settings import BaseSettings
from pydantic import Field
import hashlib

class Settings(BaseSettings):
    encryption_key: str
    jwt_secret: str = ""
    port: int = 8080
    database_url: str = "sqlite+aiosqlite:///./data/db.sqlite"
    auth_disabled: bool = Field(default=False, validation_alias="AUTH_DISABLED")

    @property
    def effective_jwt_secret(self) -> str:
        if self.jwt_secret:
            return self.jwt_secret
        return hashlib.sha256(self.encryption_key.encode()).hexdigest()

    @property
    def auth_enabled(self) -> bool:
        return not self.auth_disabled

    class Config:
        env_file = ".env"

settings = Settings()
