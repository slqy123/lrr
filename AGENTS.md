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
| `web/src/userscript/` | React userscript, native page adapter, GM API client, settings/cache and isolated AniBT UI; local showcase remains separate. |
| `web/src/ui/anibt/` | Vendored AniBT UI components, theme, AGPL license and provenance. |
| `userscript/src/` | Legacy userscript implementation, no longer the build entry. |
| `userscript/test.mjs` | Headless Chromium integration tests against the generated userscript. |
| `userscript/test-offline.mjs` | Layout regression tests using a supplied saved gallery HTML file. |
| `lanraragi-checker.user.js` | Generated installable userscript; keep tracked for update URLs. |
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
- Frontend rewrite: React + TypeScript + Vite + Tailwind v4 + AniBT UI. The dashboard remains Svelte until its rewrite stage. Keep the existing backend API and queue semantics.
- New userscript UI owns its DOM inside Shadow DOM; portal containers must remain inside that boundary. Firefox desktop + Tampermonkey is the support target. Offline Chromium checks are not Firefox compatibility verification.
- Edit the new userscript in `web/src/userscript/` and shared components in `web/src/ui/`, then run `pnpm --dir web build:userscript`. Keep the generated `lanraragi-checker.user.js` tracked and keep `@namespace` / `@updateURL` / `@downloadURL` on `slqy123/lrr` (raw `main`).
- Bump `@version` in `userscript/header.txt` before rebuilding changed userscript source.
- Production list pages use `LiveApp.tsx`, `page.ts` and `client.ts`; never render mock galleries on supported site domains. The showcase uses local mock data only on the local preview page without a native search form; its operations remain simulated.
- `page.ts` reads native DOM without moving nodes or executing inline handlers. Preserve successful search fields, excluded-category masks, original navigation/cursor URLs, and native file-search form semantics. Parse page counts from standalone metadata nodes, not concatenated card text.
- GM requests are scoped to a disposable client. Settings changes/rechecks cancel old requests and reject stale updates. Library hits win over queue state; queue lookup errors are unknown, never missing. Only definitive library results are cached, for three days and at most 2000 entries, under a SHA-256 service/key/search-policy context. Explicit rechecks bypass cache. Never send the library authorization header to the queue.
- Use the original AniBT sticker/scrapbook visual language with light and dark themes. Keep covers uncropped in 2:3 regions, reserve two title lines, and reuse status icons across cards and selection controls.
- Unknown/error results must never count as missing. Sending failures retain selection; success clears only the submitted batch.
- Comments only where the *why* is non-obvious, in English.

## Offline UI prototype

`userscript/prototype.html` is a standalone design preview, separate from the installed userscript. Generate a self-contained page with `python userscript/build_prototype.py <saved-gallery.html> [output.html]`; images are embedded, source-page scripts are discarded, and requests are blocked by CSP. Run `node userscript/test-prototype.mjs <generated-prototype.html>` for interaction/layout tests and screenshots. States and actions are simulated; this does not rebuild the installed userscript.

## Verify

Run `make test` for isolation, showcase and live UI checks; Chromium is required, overridable with `CHROMIUM`. Live tests use a loopback fixture server, mocked GM APIs and CSP-blocked external requests. Optionally run `node userscript/test-live.mjs <saved-gallery.html>` to check a saved ExHentai page without its scripts or external resources. `LRR_LIVE_PREVIEW=1 node userscript/test-live.mjs` serves fixtures for manual CDP inspection; `/history` exercises real cursor navigation and browser back/forward.

`make dev` serves the interactive showcase at `/preview.html`; `/preview.html?view=isolation` retains the small boundary test page. Showcase screenshots are written to `userscript/dist/showcase-*.png`. The legacy integration suites below are not applicable to the new UI.

Legacy userscript integration tests require Chromium; set `CHROMIUM` to override its executable. Run `node userscript/test-offline.mjs <saved-gallery.html>` to verify native search controls and links, uncropped portrait covers, natural-height titles, live queue actions, responsive layout and native-mode fallback against a locally saved page. The saved page is not a test dependency or a tracked fixture.

```bash
.venv/bin/ruff check lrr_queue tests
.venv/bin/python -m pytest -q
pnpm --dir web build
pnpm --dir web build:userscript
node --check lanraragi-checker.user.js
node userscript/test-isolation.mjs
node userscript/test-showcase.mjs
node userscript/test-live.mjs
```
