from __future__ import annotations

import logging
import time

from peewee import IntegrityError, fn

from .lrr_client import LrrClient
from .models import Status, Task
from .schemas import Stats

log = logging.getLogger(__name__)


def enqueue(urls: list[str], priority: int = 0, max_attempts: int = 3) -> tuple[int, int]:
    added = duplicates = 0
    for raw in urls:
        url = (raw or "").strip()
        if not url:
            continue
        try:
            Task.create(url=url, priority=priority, max_attempts=max_attempts)
            added += 1
        except IntegrityError:
            duplicates += 1
    return added, duplicates


def list_tasks(status: str | None = None, q: str | None = None, limit: int = 50, offset: int = 0):
    query = Task.select()
    if status:
        query = query.where(Task.status == status)
    if q:
        query = query.where(Task.url.contains(q))
    total = query.count()
    items = list(query.order_by(Task.id.desc()).limit(limit).offset(offset))
    return items, total


def get_task(task_id: int) -> Task | None:
    return Task.get_or_none(Task.id == task_id)


def retry_task(task_id: int) -> Task | None:
    if get_task(task_id) is None:
        return None
    _reset_to_pending([task_id])
    return get_task(task_id)


def cancel_task(task_id: int) -> Task | None:
    if get_task(task_id) is None:
        return None
    now = time.time()
    (Task.update(status=Status.CANCELLED.value, updated_at=now, finished_at=now).where(Task.id == task_id)).execute()
    return get_task(task_id)


def delete_task(task_id: int) -> bool:
    return Task.delete().where(Task.id == task_id).execute() > 0


def retry_failed() -> int:
    now = time.time()
    return (
        Task.update(
            status=Status.PENDING.value,
            attempts=0,
            next_attempt_at=0.0,
            error="",
            updated_at=now,
            finished_at=None,
        ).where(Task.status.in_([Status.FAILED.value, Status.DEAD.value]))
    ).execute()


def _reset_to_pending(task_ids: list[int]) -> int:
    now = time.time()
    return (
        Task.update(
            status=Status.PENDING.value,
            attempts=0,
            next_attempt_at=0.0,
            error="",
            updated_at=now,
            finished_at=None,
        ).where(Task.id.in_(task_ids))
    ).execute()


def recheck_with_urlfinder(lrr: LrrClient) -> int:
    affected = 0
    statuses = [Status.DONE.value, Status.FAILED.value, Status.DEAD.value]
    for task in Task.select().where(Task.status.in_(statuses)):
        try:
            found = lrr.urlfinder(task.url)
        except Exception as exc:
            log.warning("urlfinder recheck failed for task %s: %s", task.id, exc)
            continue
        new_status = Status.DONE.value if found is not None else Status.DEAD.value
        if new_status == task.status:
            continue
        now = time.time()
        fields: dict[str, object] = {"status": new_status, "updated_at": now}
        if new_status == Status.DONE.value:
            fields["error"] = ""
            fields["finished_at"] = task.finished_at or now
            if found:
                fields["lrr_archive_id"] = found
        (Task.update(**fields).where(Task.id == task.id)).execute()
        affected += 1
    return affected


def stats() -> Stats:
    counts = {status.value: 0 for status in Status}
    for row in Task.select(Task.status, fn.COUNT(Task.id).alias("n")).group_by(Task.status):
        counts[row.status] = row.n
    return Stats(
        pending=counts[Status.PENDING.value],
        running=counts[Status.RUNNING.value],
        done=counts[Status.DONE.value],
        failed=counts[Status.FAILED.value],
        dead=counts[Status.DEAD.value],
        cancelled=counts[Status.CANCELLED.value],
        exhausted=counts[Status.DEAD.value],
    )
