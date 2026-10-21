from __future__ import annotations

import time

from peewee import Expression

from .models import Status, Task


def transition(where: Expression, status: Status, **fields: object) -> int:
    now = time.time()
    values: dict[str, object] = {"status": status.value, "updated_at": now}
    if status == Status.PENDING:
        values.update(attempts=0, next_attempt_at=0.0, error="", lrr_job_id=None, submitted_at=None, finished_at=None)
    elif status == Status.RUNNING:
        values.update(error="", submitted_at=now, finished_at=None)
    elif status in (Status.DEAD, Status.CANCELLED):
        values.update(finished_at=now)
    elif status == Status.FAILED:
        values.update(finished_at=None)
    values.update(fields)
    if status == Status.DONE:
        values["error"] = ""
        values["finished_at"] = values.get("finished_at") or now
    return Task.update(**values).where(where).execute()


def transition_task(task: Task, status: Status, **fields: object) -> bool:
    where = (Task.id == task.id) & (Task.status == task.status) & (Task.updated_at == task.updated_at)
    return bool(transition(where, status, **fields))


def begin_attempt(task: Task) -> bool:
    now = time.time()
    changed = Task.update(attempts=task.attempts + 1, updated_at=now).where(
        (Task.id == task.id) & (Task.status == task.status) & (Task.updated_at == task.updated_at)
    ).execute()
    if changed:
        task.attempts += 1
        task.updated_at = now
    return bool(changed)
