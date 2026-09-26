from lrr_queue import service
from lrr_queue.models import Status, Task


def test_recheck_clears_error_when_marking_done(client, fake_lrr):
    client.post("/api/tasks", json={"urls": ["https://e/g/1"]})
    fake_lrr.library["https://e/g/1"] = "abc123"
    Task.update(status=Status.FAILED.value, attempts=1, error="Connect timeout").execute()

    assert service.recheck_with_urlfinder(fake_lrr) == 1

    task = Task.get()
    assert task.status == Status.DONE.value
    assert task.error == ""
    assert task.finished_at is not None
    assert task.lrr_archive_id == "abc123"


def test_recheck_marks_missing_as_dead(client, fake_lrr):
    client.post("/api/tasks", json={"urls": ["https://e/g/1"]})
    Task.update(status=Status.DONE.value, error="").execute()

    assert service.recheck_with_urlfinder(fake_lrr) == 1
    assert Task.get().status == Status.DEAD.value
