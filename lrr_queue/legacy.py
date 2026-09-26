from __future__ import annotations

from fastapi import APIRouter, Request

from . import service
from .schemas import AddRequest

router = APIRouter()


@router.post("/add")
def add(payload: AddRequest, request: Request):
    added, duplicates = service.enqueue(payload.urls, payload.priority, request.app.state.settings.max_attempts)
    return {"ok": True, "added": added, "duplicates": duplicates}


@router.get("/status")
def status(request: Request):
    result = service.stats()
    return result.model_dump()
