# AGENTS.md — lrr

## Overview

Three parts, one repo:

- **`lrr_queue/`** — FastAPI service that queues gallery URLs into a LANraragi instance via `lanraragi-api`. SQLite (Peewee) holds the queue; a single background thread reconciles task state against LRR minion jobs and retries failures.
- **`web/`** — Svelte 5 + Vite + Tailwind dashboard. Built to `web/dist` and served by the FastAPI app.
- **`lanraragi-checker.user.js`** — Tampermonkey userscript for ExHentai / E-Hentai. Marks galleries already in LRR, shows hover cards, a selection panel, copy-to-clipboard / send-to-queue actions, and a search-filter suggestion dropdown.

## Layout

| Path | Role |
|---|---|
| `lrr_queue/config.py` | `Settings` (pydantic-settings, `.env` + env vars). |
| `lrr_queue/db.py` | Peewee `Database` init and idempotent schema maintenance. |
| `lrr_queue/models.py` | `Task` model and `Status` enum. |
| `lrr_queue/service.py` | Queue use cases (enqueue/dedupe/retry/cancel/stats). |
| `lrr_queue/worker.py` | `QueueWorker` reconciler thread. |
| `lrr_queue/lrr_client.py` | LANraragi API wrapper (submit/poll/urlfinder). |
| `lrr_queue/api.py` | `/api/*` routes. |
| `lrr_queue/legacy.py` | `/add` and `/status` compatibility routes. |
| `lrr_queue/main.py` | `create_app` + lifespan. |
| `lrr_queue/web.py` | Static mount of `web/dist`. |
| `tests/` | pytest suite (API, worker, service, schema adoption). |
| `web/` | Frontend source; `web/dist` is generated. |
| `install.sh` | Builds frontend, installs/restarts the systemd user unit. |
| `lrr-queue.service.in` | Unit template; `@PYTHON@` / `@DIR@` placeholders. |
| `lanraragi-checker.user.js` | The userscript (no build step). |
| `.env` | Runtime config. **Gitignored.** |
| `.env.example` | Config template. Tracked. |
| `SPEC.md`, `refs/` | Local notes/reference captures. **Gitignored.** |

## Configuration

- All deployment config lives in `.env`; never hardcode host, key, or port in source.
- `Settings` reads `.env` then environment variables (env wins). Key names: `LRR_URL`, `LRR_KEY`, `APP_PORT` (`HTTP_PORT` also accepted), `DB_FILE`, `MAX_CONCURRENT`, `TICK_INTERVAL_SEC`, `MIN_SUBMIT_INTERVAL_SEC`, `MAX_ATTEMPTS`, `RETRY_BASE_SEC`, `RETRY_MAX_SEC`, `RETRY_JITTER`, `BREAKER_THRESHOLD`, `LOG_LEVEL`, `WORKER_ENABLED`.
- Never commit `.env`, `SPEC.md`, `refs/`, `tasks.db`, `web/dist`, `web/node_modules`.

## Setup / run

```bash
cp .env.example .env          # fill in LRR_URL / LRR_KEY
uv venv .venv
uv pip install -e '.[dev]'
.venv/bin/python -m lrr_queue # or: ./install.sh
```

Frontend:

```bash
pnpm --dir web install
pnpm --dir web dev            # dev server, proxies /api to :29481
pnpm --dir web build          # writes web/dist, served by FastAPI
```

`install.sh` builds the frontend, substitutes `@PYTHON@` (prefers `.venv/bin/python`) and `@DIR@`, then runs `daemon-reload` / `enable` / `restart` and `loginctl enable-linger`.

## Deployment

This machine is the source of truth; the NAS (`nas:dev/lrr`, Arch, **fish** login shell, no repo until bootstrapped) is a read-only deploy target.

One-time bootstrap made the NAS checkout track `main` with `receive.denyCurrentBranch=updateInstead`, and added the remote:

```bash
git remote add nas nas:dev/lrr
```

Node is at `/usr/bin` and its npm prefix is `/usr` (root-owned), so `pnpm` is installed user-locally: `npm install -g --prefix "$HOME/.local" pnpm`.

Deploy = commit here, push to the NAS, rebuild there:

```bash
git add -A && git commit -m "..."
git push nas main
ssh nas 'cd dev/lrr && ./install.sh'   # builds web/dist, rewrites the unit, restarts
```

The NAS `.env` and `tasks.db` are gitignored and never overwritten by a push. Never edit source on the NAS.

## HTTP API

- `POST /add` `{"urls": [...]}` → `{"ok": true, "added": n, "duplicates": m}` (userscript contract)
- `GET /status` → counts per status
- `GET /api/tasks`, `POST /api/tasks`, `GET/POST/DELETE /api/tasks/{id}`, `POST /api/tasks/{id}/retry|cancel`, `POST /api/tasks/retry-failed`
- `GET /api/stats`, `GET /api/health`, `POST /api/control/pause|resume`, `POST /api/maintenance/urlfinder-recheck`
- Listens on `0.0.0.0:$APP_PORT`. No auth (LAN self-host).

## Queue behavior

Single-thread reconciler (`worker.py`): DB is the source of truth, one writer thread converges local state to LRR. States: `pending → running → done | failed`, with `dead` as the terminal failure after `MAX_ATTEMPTS`, plus `cancelled`. `running` holds `lrr_job_id` as a lease. Backoff is exponential with jitter, scheduled via `next_attempt_at` (survives restarts). When permanent failures reach `BREAKER_THRESHOLD`, the queue pauses (never kills the process); resume from the UI or `/api/control/resume`.

Invariant: a `done` task has `error == ''` and a non-null `finished_at`. Every transition into `done` — worker finish (`_finish`), urlfinder recheck (`recheck_with_urlfinder`), and the dispatch pre-check — must clear the error and stamp `finished_at`.

Already-downloaded URLs never enter the download path: dispatch pre-checks `urlfinder` and marks a hit `done` directly, without consuming a concurrency slot or the submit interval. LRR also reports duplicates as a finished job with `result.id` set and `result.message == 'URL already downloaded!'`; reconcile treats that as `done` too (fallback).

## Conventions

- **No migrations.** `ensure_schema` creates missing tables and adds missing columns idempotently, and merges duplicate URLs before enforcing the unique index. Never drop, rename, or narrow a column; add new fields with defaults.
- Store status as plain strings in SQLite; compare against `Status.*.value`.
- Keep the worker single-threaded; do not fan out per-task threads — LRR's minion owns execution concurrency.
- Peewee is synchronous; API handlers are sync `def` (FastAPI threadpool). Do not introduce async DB access.
- Frontend: Svelte 5 runes only (no stores/`on:click` legacy syntax), no router, 2s polling. Design tokens live in `web/src/app.css` (`@theme`).
- Keep `lanraragi-checker.user.js` a single file with no build step, and keep `@namespace` / `@updateURL` / `@downloadURL` on `slqy123/lrr` (raw `main`).
- After any change to `lanraragi-checker.user.js`, bump its `@version`.
- Comments only where the *why* is non-obvious, in English.

## Verify

```bash
.venv/bin/ruff check lrr_queue tests
.venv/bin/python -m pytest -q
pnpm --dir web build
node --check lanraragi-checker.user.js
```
