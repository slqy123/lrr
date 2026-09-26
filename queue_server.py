import sqlite3
import json
import threading
import time
import logging
import sys
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

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
HTTP_PORT = int(os.environ["HTTP_PORT"])
MAX_CONCURRENT = 3
POLL_INTERVAL = 6 * 60
CHECK_INTERVAL = 20
MAX_RETRIES = 2
DB_FILE = "tasks.db"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", stream=sys.stderr)
log = logging.getLogger("queue_server")

conn = sqlite3.connect(DB_FILE, check_same_thread=False, timeout=10)
conn.execute("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL, status TEXT DEFAULT 'pending', retry_count INTEGER DEFAULT 0, lrr_job_id INTEGER, error TEXT DEFAULT '')")
conn.commit()

def db_execute(sql, params=()):
    cur = conn.execute(sql, params)
    conn.commit()
    return cur

api = LANraragiAPI(LRR_URL, LRR_KEY)

class Worker(threading.Thread):
    def run(self):
        last_launch = 0
        while True:
            try:
                self.poll_running()

                now = time.time()
                exhausted = len(self.exhausted())
                running = len(self.running())

                if running < MAX_CONCURRENT and now - last_launch >= POLL_INTERVAL:
                    if exhausted > 2:
                        log.error("exhausted tasks > 2 (%d), exiting", exhausted)
                        os._exit(1)
                    else:
                        task = self.failed_retryable()[:1]
                        if not task:
                            task = self.pending()[:1]

                    if task:
                        t_id, t_url = task[0]
                        try:
                            resp = api.misc.queue_url_to_download(t_url)
                            if resp.success:
                                db_execute("UPDATE tasks SET status='running', lrr_job_id=? WHERE id=?", (resp.job, t_id))
                                log.info("task %d submitted -> job %d", t_id, resp.job)
                            else:
                                self.mark_failed(t_id, resp.error or "submit failed")
                        except Exception as e:
                            self.mark_failed(t_id, str(e))

                    last_launch = now

            except Exception as e:
                log.error("worker error: %s", e)

            time.sleep(CHECK_INTERVAL)

    def pending(self):
        return db_execute("SELECT id, url FROM tasks WHERE status='pending' ORDER BY id").fetchall()

    def running(self):
        return db_execute("SELECT id, url, lrr_job_id FROM tasks WHERE status='running'").fetchall()

    def failed_retryable(self):
        return db_execute("SELECT id, url FROM tasks WHERE status='failed' AND retry_count < ? ORDER BY id", (MAX_RETRIES,)).fetchall()

    def exhausted(self):
        return db_execute("SELECT id FROM tasks WHERE status='failed' AND retry_count >= ?", (MAX_RETRIES,)).fetchall()

    def poll_running(self):
        for t_id, _, j_id in self.running():
            try:
                s = api.minion.get_full_status(j_id)
                if s.state == 'finished':
                    has_id = s.result and s.result.get('id')
                    if has_id or (s.result and s.result.get('success') == 1):
                        db_execute("UPDATE tasks SET status='done' WHERE id=?", (t_id,))
                        log.info("task %d done", t_id)
                    else:
                        err = (s.result or {}).get('message', '')
                        self.mark_failed(t_id, err)
                elif s.state == 'failed':
                    self.mark_failed(t_id, 'minion state: failed')
            except Exception as e:
                log.error("poll task %d error: %s", t_id, e)

    def mark_failed(self, t_id, err):
        rc = db_execute("SELECT retry_count FROM tasks WHERE id=?", (t_id,)).fetchone()
        if rc is None:
            return
        rc = rc[0] + 1
        if rc >= MAX_RETRIES:
            db_execute("UPDATE tasks SET status='failed', retry_count=?, error=? WHERE id=?", (rc, err, t_id))
            log.warning("task %d exhausted (%d retries): %s", t_id, rc, err)
        else:
            db_execute("UPDATE tasks SET status='failed', retry_count=?, error=? WHERE id=?", (rc, err, t_id))
            log.info("task %d failed, retry %d/%d: %s", t_id, rc, MAX_RETRIES, err)

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        log.info("%s %s", self.address_string(), format % args)

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/add":
            try:
                length = int(self.headers.get("Content-Length", 0))
                data = json.loads(self.rfile.read(length))
                urls = data.get("urls", [])
                log.info("add request: %d urls", len(urls))
                count = 0
                for u in urls:
                    try:
                        db_execute("INSERT INTO tasks (url) VALUES (?)", (u,))
                        count += 1
                    except Exception:
                        pass
                self.send_json({"ok": True, "added": count})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 400)
        else:
            self.send_json({"error": "not found"}, 404)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/status":
            stats = {}
            for s in ("pending", "running", "done", "failed"):
                stats[s] = db_execute("SELECT COUNT(*) FROM tasks WHERE status=?", (s,)).fetchone()[0]
            stats["exhausted"] = db_execute(
                "SELECT COUNT(*) FROM tasks WHERE status='failed' AND retry_count >= ?", (MAX_RETRIES,)
            ).fetchone()[0]
            self.send_json(stats)
        else:
            self.send_json({"error": "not found"}, 404)

    def send_json(self, data, code=200):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

if __name__ == "__main__":
    worker = Worker(daemon=True)
    worker.start()

    server = HTTPServer(("0.0.0.0", HTTP_PORT), Handler)
    log.info("listening on :%d", HTTP_PORT)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
