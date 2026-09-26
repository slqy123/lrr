from __future__ import annotations

import logging
import random
import threading
import time

from .config import Settings
from .lrr_client import JobStatus, LrrClient
from .models import Status, Task

log = logging.getLogger(__name__)

PERMANENT_HINTS = ("404", "not found", "notfound", "invalid url", "no such", "does not exist")


def is_permanent(error: str) -> bool:
    lowered = (error or "").lower()
    return any(hint in lowered for hint in PERMANENT_HINTS)


class QueueWorker(threading.Thread):
    def __init__(self, settings: Settings, lrr: LrrClient):
        super().__init__(daemon=True, name="queue-worker")
        self._settings = settings
        self._lrr = lrr
        self._stop = threading.Event()
        self._resume = threading.Event()
        self._resume.set()
        self._pause_reason = ""
        self._last_submit = 0.0

    @property
    def paused(self) -> bool:
        return not self._resume.is_set()

    @property
    def pause_reason(self) -> str:
        return self._pause_reason

    def pause(self, reason: str = "manual") -> None:
        self._resume.clear()
        self._pause_reason = reason
        log.warning("queue paused: %s", reason)

    def resume(self) -> None:
        self._resume.set()
        self._pause_reason = ""
        log.info("queue resumed")

    def stop(self) -> None:
        self._stop.set()

    def run(self) -> None:
        log.info("worker started")
        while not self._stop.wait(self._settings.tick_interval_sec):
            try:
                self._reconcile()
                self._dispatch()
            except Exception:
                log.exception("worker tick failed")
        log.info("worker stopped")

    def _reconcile(self) -> None:
        running = Task.select().where(Task.status == Status.RUNNING.value)
        for task in list(running):
            if task.lrr_job_id is None:
                self._fail(task.id, task.attempts, task.max_attempts, "running task without job id")
                continue
            try:
                job = self._lrr.job_status(task.lrr_job_id)
            except Exception as exc:
                log.warning("poll job %s failed: %s", task.lrr_job_id, exc)
                continue
            if job.state == "finished":
                if job.archive_id:
                    self._finish(task.id, job)
                else:
                    self._fail(task.id, task.attempts, task.max_attempts, job.message or "finished without archive id")
            elif job.state == "failed":
                self._fail(task.id, task.attempts, task.max_attempts, job.message or "minion failed")

    def _dispatch(self) -> None:
        if self.paused:
            return
        capacity = self._settings.max_concurrent - Task.select().where(Task.status == Status.RUNNING.value).count()
        while capacity > 0 and not self._stop.is_set():
            task = self._next_task(time.time())
            if task is None:
                return
            self._wait_for_submit_slot()
            if self._stop.is_set():
                return
            attempts = task.attempts + 1
            (Task.update(attempts=attempts, updated_at=time.time()).where(Task.id == task.id)).execute()
            try:
                ok, job_id, error = self._lrr.submit(task.url)
            except Exception as exc:
                ok, job_id, error = False, None, str(exc)
            self._last_submit = time.time()
            if ok:
                self._mark_running(task.id, attempts, job_id)
                capacity -= 1
            else:
                self._fail(task.id, attempts, task.max_attempts, error)

    def _next_task(self, now: float) -> Task | None:
        due = (Task.status == Status.PENDING.value) | (
            (Task.status == Status.FAILED.value) & (Task.attempts < Task.max_attempts) & (Task.next_attempt_at <= now)
        )
        return (
            Task.select().where(due).order_by(Task.priority.desc(), Task.next_attempt_at.asc(), Task.id.asc()).first()
        )

    def _wait_for_submit_slot(self) -> None:
        wait = self._settings.min_submit_interval_sec - (time.time() - self._last_submit)
        if wait > 0:
            self._stop.wait(wait)

    def _mark_running(self, task_id: int, attempts: int, job_id: int | None) -> None:
        now = time.time()
        (
            Task.update(
                status=Status.RUNNING.value,
                lrr_job_id=job_id,
                attempts=attempts,
                submitted_at=now,
                updated_at=now,
                error="",
            ).where(Task.id == task_id)
        ).execute()
        log.info("task %s submitted -> job %s", task_id, job_id)

    def _finish(self, task_id: int, job: JobStatus) -> None:
        now = time.time()
        (
            Task.update(
                status=Status.DONE.value,
                lrr_archive_id=job.archive_id,
                title=job.title,
                error="",
                updated_at=now,
                finished_at=now,
            ).where(Task.id == task_id)
        ).execute()
        log.info("task %s done -> %s", task_id, job.archive_id)

    def _fail(self, task_id: int, attempts: int, max_attempts: int, error: str) -> None:
        attempts = max(attempts, 1)
        now = time.time()
        if is_permanent(error) or attempts >= max_attempts:
            (
                Task.update(
                    status=Status.DEAD.value,
                    attempts=attempts,
                    error=error,
                    updated_at=now,
                    finished_at=now,
                ).where(Task.id == task_id)
            ).execute()
            log.warning("task %s dead: %s", task_id, error)
            self._check_breaker()
            return
        delay = min(self._settings.retry_base_sec * (2 ** (attempts - 1)), self._settings.retry_max_sec)
        delay *= 1 + random.uniform(0, self._settings.retry_jitter)
        (
            Task.update(
                status=Status.FAILED.value,
                attempts=attempts,
                error=error,
                next_attempt_at=now + delay,
                updated_at=now,
            ).where(Task.id == task_id)
        ).execute()
        log.info("task %s failed (attempt %d/%d), retry in %.0fs: %s", task_id, attempts, max_attempts, delay, error)

    def _check_breaker(self) -> None:
        if self.paused:
            return
        dead = Task.select().where(Task.status == Status.DEAD.value).count()
        if dead >= self._settings.breaker_threshold:
            self.pause(f"{dead} tasks failed permanently")
