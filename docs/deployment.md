# Deployment and service installation

This checkout is the source of truth. The NAS at `nas:dev/lrr` is a deployment target, not a source-editing environment. Never edit source on the NAS. The assistant must never push commits; transferring commits is a manual operator step.

## Local setup

```bash
cp .env.example .env
uv venv .venv
uv pip install -e '.[dev]'
.venv/bin/python -m lrr_queue
```

Fill in `LRR_URL` and `LRR_KEY` in `.env` before running. Environment variables override `.env`; configuration keys are defined by `lrr_queue/config.py` and illustrated in `.env.example`. `HTTP_PORT` is also accepted for `APP_PORT`.

For the dashboard:

```bash
pnpm --dir web install
pnpm --dir web dev
pnpm --dir web build
```

The dashboard dev server proxies `/api` to port 29481. Its production build writes `web/dist`, served by FastAPI. Userscript development and preview services have separate workflows in `docs/userscript-preview.md`.

## Installation

`./install.sh` builds the frontend and installs/restarts the systemd user service. It substitutes `@PYTHON@` (preferring `.venv/bin/python`) and `@DIR@` in `lrr-queue.service.in`, then runs daemon reload, enable, restart and `loginctl enable-linger`.

## NAS environment

- Arch Linux with a fish login shell.
- The checkout tracks `main` with `receive.denyCurrentBranch=updateInstead`; the local remote is named `nas`.
- Node is in `/usr/bin`, with root-owned npm prefix `/usr`. Install pnpm user-locally if needed: `npm install -g --prefix "$HOME/.local" pnpm`.
- NAS `.env` and `tasks.db` are ignored runtime state and must not be overwritten during deployment.

After the operator transfers the desired committed revision, rebuild and restart on the NAS only when deployment is requested:

```bash
ssh nas 'cd dev/lrr && ./install.sh'
```
