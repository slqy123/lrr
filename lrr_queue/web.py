from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

PLACEHOLDER = """<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>lrr-queue</title></head>
<body style="font-family: system-ui; padding: 2rem">
<h1>lrr-queue</h1>
<p>Frontend not built. Run <code>pnpm --dir web build</code>.</p>
</body>
</html>"""


def mount_frontend(app: FastAPI, dist: str) -> None:
    path = Path(dist)
    if (path / "index.html").is_file():
        app.mount("/", StaticFiles(directory=str(path), html=True), name="web")
        return

    @app.get("/", response_class=HTMLResponse, include_in_schema=False)
    def index() -> str:
        return PLACEHOLDER
