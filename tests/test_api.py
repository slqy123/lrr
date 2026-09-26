def test_add_and_status(client):
    response = client.post("/add", json={"urls": ["https://e/g/1", "https://e/g/2"]})
    assert response.json() == {"ok": True, "added": 2, "duplicates": 0}

    status = client.get("/status").json()
    assert status["pending"] == 2
    assert status["exhausted"] == 0


def test_duplicate_urls_are_ignored(client):
    client.post("/add", json={"urls": ["https://e/g/1"]})
    response = client.post("/add", json={"urls": ["https://e/g/1"]})
    assert response.json() == {"ok": True, "added": 0, "duplicates": 1}


def test_list_and_search(client):
    client.post("/api/tasks", json={"urls": ["https://e/g/1", "https://e/g/2"]})
    assert client.get("/api/tasks").json()["total"] == 2
    filtered = client.get("/api/tasks", params={"q": "g/2"}).json()
    assert filtered["total"] == 1
    assert filtered["items"][0]["url"].endswith("g/2")


def test_status_filter(client):
    client.post("/api/tasks", json={"urls": ["https://e/g/1"]})
    task_id = client.get("/api/tasks").json()["items"][0]["id"]
    client.post(f"/api/tasks/{task_id}/cancel")
    assert client.get("/api/tasks", params={"status": "cancelled"}).json()["total"] == 1


def test_retry_cancel_delete(client):
    client.post("/api/tasks", json={"urls": ["https://e/g/1"]})
    task_id = client.get("/api/tasks").json()["items"][0]["id"]

    assert client.post(f"/api/tasks/{task_id}/cancel").json()["status"] == "cancelled"
    assert client.post(f"/api/tasks/{task_id}/retry").json()["status"] == "pending"
    assert client.delete(f"/api/tasks/{task_id}").json()["affected"] == 1
    assert client.get(f"/api/tasks/{task_id}").status_code == 404


def test_health(client):
    body = client.get("/api/health").json()
    assert body["db"] is True
    assert body["lrr"] is True


def test_pause_and_resume(client):
    assert client.post("/api/control/pause").json()["paused"] is True
    assert client.get("/api/stats").json()["paused"] is True
    assert client.post("/api/control/resume").json()["paused"] is False
    assert client.get("/api/stats").json()["paused"] is False


def test_retry_failed(client):
    client.post("/api/tasks", json={"urls": ["https://e/g/1", "https://e/g/2"]})
    for item in client.get("/api/tasks").json()["items"]:
        client.post(f"/api/tasks/{item['id']}/cancel")
    from lrr_queue.models import Status, Task

    Task.update(status=Status.DEAD.value).execute()
    assert client.post("/api/tasks/retry-failed").json()["affected"] == 2
    assert client.get("/api/tasks", params={"status": "pending"}).json()["total"] == 2
