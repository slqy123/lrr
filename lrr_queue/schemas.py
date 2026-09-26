from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class AddRequest(BaseModel):
    urls: list[str]
    priority: int = 0


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    status: str
    priority: int
    attempts: int
    max_attempts: int
    lrr_job_id: int | None = None
    lrr_archive_id: str | None = None
    title: str | None = None
    error: str = ""
    source: str = ""
    next_attempt_at: float = 0.0
    created_at: float
    updated_at: float
    submitted_at: float | None = None
    finished_at: float | None = None


class TaskList(BaseModel):
    items: list[TaskOut]
    total: int


class AddResult(BaseModel):
    ok: bool = True
    added: int
    duplicates: int = 0


class MutationResult(BaseModel):
    ok: bool = True
    affected: int = 0


class Stats(BaseModel):
    pending: int = 0
    running: int = 0
    done: int = 0
    failed: int = 0
    dead: int = 0
    cancelled: int = 0
    exhausted: int = 0
    paused: bool = False
    pause_reason: str = ""


class ControlResult(BaseModel):
    ok: bool = True
    paused: bool
    reason: str = ""


class Health(BaseModel):
    db: bool
    worker_alive: bool
    paused: bool
    lrr: bool
    lrr_error: str = ""
