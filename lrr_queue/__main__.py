from __future__ import annotations

import uvicorn

from .config import Settings
from .main import create_app


def main() -> None:
    settings = Settings()
    app = create_app(settings)
    uvicorn.run(app, host=settings.app_host, port=settings.app_port, log_config=None)


if __name__ == "__main__":
    main()
