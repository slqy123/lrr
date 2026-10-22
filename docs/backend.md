# Backend development constraints

Read before changing the backend, database or queue semantics.

## Persistence and execution

- SQLite is the source of truth. Keep the reconciler in `lrr_queue/worker.py` single-threaded; LANraragi minion owns execution concurrency. Do not fan out per-task threads.
- Peewee is synchronous; API handlers use sync `def` through FastAPI's threadpool. Do not introduce async DB access.
- No migrations: `ensure_schema` creates missing tables, adds missing columns idempotently and deduplicates URLs before enforcing uniqueness. Deduplication keeps the row with the smallest ID and deletes the others; it does not merge their fields. Never drop, rename or narrow a column; add fields with defaults.
- Store status as plain strings; compare against `Status.*.value`.

## Queue contracts

- States are `pending → running → done | failed`, with `dead` after `MAX_ATTEMPTS`, plus `cancelled`. A running task holds `lrr_job_id` as a lease.
- Exponential backoff with jitter is persisted through `next_attempt_at` and survives restarts.
- At `BREAKER_THRESHOLD` permanent failures, pause the queue rather than terminating the process. Resume through the UI or `/api/control/resume`.
- Every transition to `done` must set `error == ''` and non-null `finished_at`, including worker `_finish`, `recheck_with_urlfinder` and dispatch pre-checks.
- Dispatch checks `urlfinder` before submitting. An existing archive becomes `done` without consuming a concurrency slot or submit interval.
- As a fallback, a finished LANraragi job with `result.id` and `result.message == 'URL already downloaded!'` is also successful.

## API compatibility

Preserve the userscript compatibility routes:

- `POST /add` accepts `{"urls": [...]}` and returns `{"ok": true, "added": n, "duplicates": m}`.
- `GET /status` returns counts per status.
- `POST /api/tasks/lookup` accepts `{"urls": [...]}` with at most 500 URLs and returns `{"items": [...], "total": n}` for matching `pending`, `running`, `failed` and `dead` tasks.

Route definitions live in `lrr_queue/api.py` and `lrr_queue/legacy.py`. The service listens on `$APP_HOST:$APP_PORT` (default `0.0.0.0:29481`) without authentication for LAN self-hosting; do not introduce unrelated API changes.

## Explicitly requested verification

The root `AGENTS.md` defines default verification limits. When backend checks are requested:

```bash
.venv/bin/ruff check lrr_queue tests
.venv/bin/python -m pytest -q
```
