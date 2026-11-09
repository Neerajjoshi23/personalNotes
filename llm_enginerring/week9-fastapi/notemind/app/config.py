# file: app/config.py
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Read NOTEMIND_* environment variables, then .env, then the defaults below.
    model_config = SettingsConfigDict(env_prefix="NOTEMIND_", env_file=".env", extra="ignore")

    app_name: str = "notemind-api"
    allow_origins: list[str] = ["*"]  # for CORS, "*" is fine for dev and test, but not prod
    env: Literal["dev", "test", "prod"] = "dev"   # any other value -> startup error
    max_notes: int = Field(default=100, ge=1, le=10_000)
    llm_api_key: SecretStr | None = None           # used in Session 5
