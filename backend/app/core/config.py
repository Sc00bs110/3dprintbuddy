import os
from pathlib import Path

from pydantic_settings import BaseSettings

APP_VERSION = "0.1.0"
APP_NAME = "3DPrintBuddy"
GITHUB_REPO = "Sc00bs110/3dprintbuddy"

_app_dir = Path(__file__).resolve().parent.parent.parent.parent
_data_dir_env = os.environ.get("DATA_DIR")
_data_dir = Path(_data_dir_env) if _data_dir_env else _app_dir
_log_dir_env = os.environ.get("LOG_DIR")
_log_dir = Path(_log_dir_env) if _log_dir_env else _app_dir / "logs"


class Settings(BaseSettings):
    app_name: str = APP_NAME
    debug: bool = False
    database_url: str = f"sqlite+aiosqlite:///{_data_dir / '3dprintbuddy.db'}"
    data_dir: Path = _data_dir
    log_dir: Path = _log_dir
    secret_key: str = ""
    auth_enabled: bool = False
    port: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
