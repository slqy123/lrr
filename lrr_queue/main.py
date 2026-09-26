from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from .api import router as api_router
from .config import Settings
from .db import ensure_schema, init_db
from .legacy import router as legacy_router
from .logging import setup_logging
from .lrr_client import LrrClient
from .web import mount_frontend
from .worker import QueueWorker


def create_app(
    settings: Settings | None = None,
    *,
    lrr: LrrClient | None = None,
    start_worker: bool | None = None,
) -> FastAPI:
    settings = settings or Settings()
    should_start = settings.worker_enabled if start_worker is None else start_worker

    setup_logging(settings.log_level)
    init_db(settings.db_file)
    ensure_schema()

    client = lrr or LrrClient(settings.lrr_url, settings.lrr_key)
    worker = QueueWorker(settings, client)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if should_start:
            worker.start()
        try:
            yield
        finally:
            if should_start:
                worker.stop()
                worker.join(timeout=5)

    app = FastAPI(title="lrr-queue", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.worker = worker
    app.state.lrr = client

    app.include_router(api_router)
    app.include_router(legacy_router)
    mount_frontend(app, settings.frontend_dist)
    return app
