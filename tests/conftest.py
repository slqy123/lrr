from __future__ import annotations

from dataclasses import dataclass, field

import pytest
from fastapi.testclient import TestClient

from lrr_queue.config import Settings
from lrr_queue.lrr_client import JobStatus
from lrr_queue.main import create_app


@dataclass
class FakeLrr:
    submitted: list[tuple[int, str]] = field(default_factory=list)
    jobs: dict[int, JobStatus] = field(default_factory=dict)
    fail_next: str | None = None
    _next_job: int = 1

    def submit(self, url: str) -> tuple[bool, int | None, str]:
        if self.fail_next is not None:
            error, self.fail_next = self.fail_next, None
            return False, None, error
        job_id = self._next_job
        self._next_job += 1
        self.submitted.append((job_id, url))
        self.jobs[job_id] = JobStatus(state="active")
        return True, job_id, ""

    def job_status(self, job_id: int) -> JobStatus:
        return self.jobs[job_id]

    def urlfinder(self, url: str) -> bool:
        return True

    def ping(self) -> None:
        return None


@pytest.fixture
def settings(tmp_path):
    return Settings(
        _env_file=None,
        lrr_url="http://lrr.test",
        lrr_key="test-key",
        db_file=str(tmp_path / "tasks.db"),
        max_concurrent=2,
        tick_interval_sec=0.01,
        min_submit_interval_sec=0.0,
        retry_base_sec=0.01,
        retry_max_sec=0.05,
        retry_jitter=0.0,
        worker_enabled=False,
    )


@pytest.fixture
def fake_lrr() -> FakeLrr:
    return FakeLrr()


@pytest.fixture
def client(settings, fake_lrr):
    app = create_app(settings, lrr=fake_lrr, start_worker=False)
    with TestClient(app) as test_client:
        yield test_client
