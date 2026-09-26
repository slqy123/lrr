# AGENTS.md — lrr

## Overview

One repo, two deliverables:

- **`queue_server.py`** — single-file HTTP service that queues gallery URLs into a LANraragi instance through `lanraragi_api`. SQLite (`tasks.db`) holds the queue; a worker thread polls running jobs and retries failures.
- **`lanraragi-checker.user.js`** — Tampermonkey userscript for ExHentai / E-Hentai. Marks galleries already in LRR (urlfinder + `/api/search` fallback), shows hover cards, a settings/selection panel, copy-to-clipboard / send-to-queue actions, and a search-filter suggestion dropdown.

## Layout

| Path | Role |
|---|---|
| `queue_server.py` | Queue server (only source of truth for server behavior). |
| `fix_status.py` | One-off maintenance: re-run urlfinder over `done`/`failed` tasks. |
| `install.sh` | Builds and installs the systemd **user** unit, enables + restarts it. |
| `lrr-queue.service.in` | Unit template; `@PYTHON@` / `@DIR@` are placeholders. |
| `lanraragi-checker.user.js` | The userscript (no build step). |
| `.env` | Runtime config. **Gitignored.** |
| `.env.example` | Config template. Tracked. |
| `SPEC.md` | Original requirements/notes. **Gitignored**, local only. |
| `refs/` | Captured pages used as reference. **Gitignored**, local only. |

## Configuration

- All deployment config lives in `.env`; never hardcode host, key, or port in source.
- `queue_server.py` / `fix_status.py` load it with a small inline parser (no `python-dotenv`); real environment variables win over `.env`.
- Keys: `LRR_URL`, `LRR_KEY`, `HTTP_PORT`.
- Never commit `.env`, `SPEC.md`, `refs/`, or `tasks.db`.

## Setup / run

```bash
cp .env.example .env      # fill in LRR_URL / LRR_KEY
uv pip install lanraragi-api
./install.sh              # installs ~/.config/systemd/user/lrr-queue.service
```

`install.sh` substitutes `@PYTHON@` (prefers `.venv/bin/python`) and `@DIR@`, then runs `daemon-reload` / `enable` / `restart` and `loginctl enable-linger`.

## HTTP API

- `POST /add` with `{"urls": [...]}` → `{"ok": true, "added": n}`
- `GET /status` → counts per status, plus `exhausted`
- Listens on `0.0.0.0:$HTTP_PORT`.

## Behavior knobs (`queue_server.py`)

`MAX_CONCURRENT`, `POLL_INTERVAL`, `CHECK_INTERVAL`, `MAX_RETRIES`, `DB_FILE`. The worker stops the process when exhausted tasks exceed 2.

## Conventions

- Keep `queue_server.py` a single file; minimal code, logging to stderr, config via `.env`.
- `fix_status.py` is a throwaway maintenance script — do not grow it.
- The userscript has no build step. Keep `@namespace` / `@updateURL` / `@downloadURL` on `slqy123/lrr` (raw `main`).
- After any change to `lanraragi-checker.user.js`, bump its `@version`.
- Comments only where the *why* is non-obvious, in English.

## Verify

```bash
.venv/bin/python -m py_compile queue_server.py fix_status.py
node --check lanraragi-checker.user.js
```
