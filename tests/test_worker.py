from lrr_queue.lrr_client import JobStatus
from lrr_queue.models import Status, Task


def _add(client, *urls):
    client.post("/api/tasks", json={"urls": list(urls)})


def test_dispatch_respects_capacity(client, fake_lrr):
    _add(client, *[f"https://e/g/{i}" for i in range(4)])
    worker = client.app.state.worker

    worker._dispatch()

    assert Task.select().where(Task.status == Status.RUNNING.value).count() == 2
    assert len(fake_lrr.submitted) == 2


def test_reconcile_marks_done(client, fake_lrr):
    _add(client, "https://e/g/1")
    worker = client.app.state.worker
    worker._dispatch()

    job_id = fake_lrr.submitted[0][0]
    fake_lrr.jobs[job_id] = JobStatus(state="finished", archive_id="abc123", title="Title")
    worker._reconcile()

    task = Task.get(Task.url == "https://e/g/1")
    assert task.status == Status.DONE.value
    assert task.lrr_archive_id == "abc123"
    assert task.title == "Title"


def test_submit_failure_backs_off_then_dies(client, fake_lrr):
    _add(client, "https://e/g/1")
    worker = client.app.state.worker
    Task.update(max_attempts=2).execute()

    fake_lrr.fail_next = "boom"
    worker._dispatch()
    task = Task.get()
    assert task.status == Status.FAILED.value
    assert task.attempts == 1
    assert task.next_attempt_at > 0

    Task.update(next_attempt_at=0.0).execute()
    fake_lrr.fail_next = "boom"
    worker._dispatch()
    assert Task.get().status == Status.DEAD.value


def test_breaker_pauses_queue(client, fake_lrr):
    client.app.state.settings.breaker_threshold = 1
    _add(client, "https://e/g/1")
    worker = client.app.state.worker
    Task.update(max_attempts=1).execute()

    fake_lrr.fail_next = "boom"
    worker._dispatch()

    assert worker.paused is True
    assert worker.pause_reason != ""


def test_paused_worker_does_not_dispatch(client, fake_lrr):
    _add(client, "https://e/g/1")
    worker = client.app.state.worker
    worker.pause("test")

    worker._dispatch()

    assert fake_lrr.submitted == []
    assert Task.get().status == Status.PENDING.value


def test_permanent_error_is_not_retried(client, fake_lrr):
    _add(client, "https://e/g/1")
    worker = client.app.state.worker

    fake_lrr.fail_next = "404 not found"
    worker._dispatch()

    assert Task.get().status == Status.DEAD.value
