from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    lrr_url: str
    lrr_key: str = ""
    app_host: str = "0.0.0.0"
    app_port: int = Field(default=29481, validation_alias=AliasChoices("APP_PORT", "HTTP_PORT"))
    db_file: str = "tasks.db"
    max_concurrent: int = 2
    tick_interval_sec: float = 3.0
    min_submit_interval_sec: float = 5.0
    max_attempts: int = 3
    retry_base_sec: float = 60.0
    retry_max_sec: float = 1800.0
    retry_jitter: float = 0.25
    breaker_threshold: int = 3
    log_level: str = "INFO"
    frontend_dist: str = "web/dist"
    worker_enabled: bool = True
