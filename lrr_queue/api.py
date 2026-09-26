from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

from . import service
from .schemas import (
    AddRequest,
    AddResult,
    ControlResult,
    Health,
    MutationResult,
    Stats,
    TaskList,
    TaskOut,
)

router = APIRouter(prefix="/api")


@router.get("/tasks", response_model=TaskList)
def list_tasks(
    status: str | None = None,
    q: str | None = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    items, total = service.list_tasks(status=status, q=q, limit=limit, offset=offset)
    return TaskList(items=[TaskOut.model_validate(task) for task in items], total=total)


@router.post("/tasks", response_model=AddResult)
def add_tasks(payload: AddRequest, request: Request):
    added, duplicates = service.enqueue(payload.urls, payload.priority, request.app.state.settings.max_attempts)
    return AddResult(added=added, duplicates=duplicates)


@router.post("/tasks/retry-failed", response_model=MutationResult)
def retry_failed():
    return MutationResult(affected=service.retry_failed())


@router.get("/tasks/{task_id}", response_model=TaskOut)
def get_task(task_id: int):
    task = service.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="task not found")
    return TaskOut.model_validate(task)


@router.post("/tasks/{task_id}/retry", response_model=TaskOut)
def retry_task(task_id: int):
    task = service.retry_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="task not found")
    return TaskOut.model_validate(task)


@router.post("/tasks/{task_id}/cancel", response_model=TaskOut)
def cancel_task(task_id: int):
    task = service.cancel_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="task not found")
    return TaskOut.model_validate(task)


@router.delete("/tasks/{task_id}", response_model=MutationResult)
def delete_task(task_id: int):
    return MutationResult(affected=1 if service.delete_task(task_id) else 0)


@router.get("/stats", response_model=Stats)
def get_stats(request: Request):
    result = service.stats()
    result.paused = request.app.state.worker.paused
    result.pause_reason = request.app.state.worker.pause_reason
    return result


@router.get("/health", response_model=Health)
def health(request: Request):
    try:
        service.stats()
        db_ok = True
    except Exception:
        db_ok = False
    lrr_ok, lrr_error = True, ""
    try:
        request.app.state.lrr.ping()
    except Exception as exc:
        lrr_ok, lrr_error = False, str(exc)
    worker = request.app.state.worker
    return Health(
        db=db_ok,
        worker_alive=worker.is_alive(),
        paused=worker.paused,
        lrr=lrr_ok,
        lrr_error=lrr_error,
    )


@router.post("/control/pause", response_model=ControlResult)
def pause(request: Request):
    worker = request.app.state.worker
    worker.pause("manual")
    return ControlResult(paused=True, reason=worker.pause_reason)


@router.post("/control/resume", response_model=ControlResult)
def resume(request: Request):
    request.app.state.worker.resume()
    return ControlResult(paused=False)


@router.post("/maintenance/urlfinder-recheck", response_model=MutationResult)
def urlfinder_recheck(request: Request):
    return MutationResult(affected=service.recheck_with_urlfinder(request.app.state.lrr))
