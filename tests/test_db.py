import sqlite3

from lrr_queue.db import db, ensure_schema, init_db
from lrr_queue.models import Task


def test_ensure_schema_adopts_legacy_table(tmp_path):
    path = tmp_path / "old.db"
    conn = sqlite3.connect(path)
    conn.execute(
        "CREATE TABLE tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL, "
        "status TEXT DEFAULT 'pending', retry_count INTEGER DEFAULT 0, "
        "lrr_job_id INTEGER, error TEXT DEFAULT '')"
    )
    conn.execute("INSERT INTO tasks (url, status) VALUES ('https://e/g/1', 'done')")
    conn.execute("INSERT INTO tasks (url, status) VALUES ('https://e/g/1', 'failed')")
    conn.commit()
    conn.close()

    init_db(str(path))
    ensure_schema()
    ensure_schema()

    columns = {column.name for column in db.get_columns("tasks")}
    assert {"attempts", "max_attempts", "next_attempt_at", "lrr_archive_id", "title"} <= columns
    assert Task.select().count() == 1
