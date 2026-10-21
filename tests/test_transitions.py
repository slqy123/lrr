from lrr_queue import service
from lrr_queue.lrr_client import JobStatus
from lrr_queue.models import Status, Task
from lrr_queue.transitions import begin_attempt, transition_task


def test_retry_clears_lease(client):
    task = Task.create(url="https://e/g/1", status="running", lrr_job_id=42, submitted_at=1, finished_at=2)

    retried = service.retry_task(task.id)

    assert retried.status == "pending"
    assert retried.lrr_job_id is None
    assert retried.submitted_at is None
    assert retried.finished_at is None


def test_stale_snapshot_cannot_overwrite_retry(client):
    task = Task.create(url="https://e/g/1", status="running", lrr_job_id=42)
    service.retry_task(task.id)

    assert not transition_task(task, Status.DONE, lrr_archive_id="old")
    assert Task.get_by_id(task.id).status == "pending"


def test_cancel_during_poll_wins(client, fake_lrr, monkeypatch):
    task = Task.create(url="https://e/g/1", status="running", lrr_job_id=42)

    def poll(job_id):
        service.cancel_task(task.id)
        return JobStatus(state="finished", archive_id="abc")

    monkeypatch.setattr(fake_lrr, "job_status", poll)
    client.app.state.worker._reconcile()

    assert Task.get_by_id(task.id).status == "cancelled"


def test_cancel_during_precheck_prevents_submit(client, fake_lrr, monkeypatch):
    task = Task.create(url="https://e/g/1")

    def lookup(url):
        service.cancel_task(task.id)
        return None

    monkeypatch.setattr(fake_lrr, "urlfinder", lookup)
    client.app.state.worker._dispatch()

    assert fake_lrr.submitted == []
    assert Task.get_by_id(task.id).status == "cancelled"


def test_cancel_during_submit_wins(client, fake_lrr, monkeypatch):
    task = Task.create(url="https://e/g/1")

    def submit(url):
        service.cancel_task(task.id)
        return True, 42, ""

    monkeypatch.setattr(fake_lrr, "submit", submit)
    client.app.state.worker._dispatch()

    assert Task.get_by_id(task.id).status == "cancelled"


def test_recheck_does_not_overwrite_retry(client, fake_lrr, monkeypatch):
    task = Task.create(url="https://e/g/1", status="dead")

    def lookup(url):
        service.retry_task(task.id)
        return "abc"

    monkeypatch.setattr(fake_lrr, "urlfinder", lookup)

    assert service.recheck_with_urlfinder(fake_lrr) == 0
    assert Task.get_by_id(task.id).status == "pending"


def test_attempt_rejects_stale_pending_snapshot(client):
    task = Task.create(url="https://e/g/1")
    service.retry_task(task.id)

    assert not begin_attempt(task)
    assert Task.get_by_id(task.id).attempts == 0


def test_done_invariants(client):
    task = Task.create(url="https://e/g/1", status="failed", error="timeout")

    assert transition_task(task, Status.DONE)
    finished = Task.get_by_id(task.id)
    assert finished.error == ""
    assert finished.finished_at is not None
