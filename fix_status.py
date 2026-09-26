import sqlite3
import time
import os
from lanraragi_api import LANraragiAPI

_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_env):
    for line in open(_env):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

LRR_URL = os.environ["LRR_URL"]
LRR_KEY = os.environ["LRR_KEY"]
DB_FILE = "tasks.db"

api = LANraragiAPI(LRR_URL, LRR_KEY)

conn = sqlite3.connect(DB_FILE)
rows = conn.execute("SELECT id, url, status FROM tasks WHERE status IN ('done', 'failed')").fetchall()

fixed = 0
for t_id, url, old_status in rows:
    try:
        r = api.misc.use_plugin(plugin='urlfinder', arg=url)
        new_status = 'done' if r.success == 1 else 'failed'
        if new_status != old_status:
            conn.execute("UPDATE tasks SET status=? WHERE id=?", (new_status, t_id))
            print(f"task {t_id}: {old_status} -> {new_status}  {url}")
            fixed += 1
    except Exception as e:
        print(f"task {t_id}: skip ({e})   {url}")
    time.sleep(0.2)

conn.commit()
conn.close()
print(f"\nfixed {fixed} tasks")
