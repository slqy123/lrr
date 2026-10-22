# AGENTS.md — lrr

## Project map

- `lrr_queue/`: FastAPI + synchronous Peewee/SQLite queue service; one background reconciler talks to LANraragi.
- `web/`: Svelte 5 dashboard; React + TypeScript + Tailwind v4 + yurui userscript and shared UI. The dashboard remains Svelte until its rewrite stage.
- `web/src/userscript/`: production userscript source; `web/src/ui/`: shared UI.
- `userscript/`: build header, preview and test tooling.
- `lanraragi-checker.user.js`: generated installable userscript, intentionally tracked.
- `tests/`: backend tests. `web/dist`: generated dashboard served by FastAPI.

## Required reading

Read the relevant documents before editing or running the workflow:

| Task | Instructions |
| --- | --- |
| Backend, database or queue semantics | `docs/backend.md` |
| Userscript or shared UI | `docs/userscript.md` |
| Userscript UI changes, previews or browser tests | `docs/userscript-preview.md` (also read before editing) |
| Style fixes, CSS overrides or theme/responsive changes | `docs/style-fixes.md` (also read before editing) |
| Deployment or service installation | `docs/deployment.md` |

## Project boundaries

- Preserve the existing backend API and queue semantics.
- Deployment configuration belongs in `.env` or environment variables; never hardcode deployment hosts, keys or ports. `Settings` reads `.env`, then environment overrides; see `.env.example` and `lrr_queue/config.py` for keys.
- Never commit `.env`, `SPEC.md`, `refs/`, `tasks.db`, `web/dist` or `web/node_modules`.
- This checkout is the source of truth. The NAS is a deployment target; never edit source there. The assistant must never push commits.
- Edit userscript source, not its generated bundle. Bump `@version` in `userscript/header.txt` for changed userscript source, then rebuild with `pnpm --dir web build:userscript` and retain the tracked bundle.
- Keep userscript `@namespace`, `@updateURL` and `@downloadURL` on `slqy123/lrr` (raw `main`).

## Verification policy

Default assistant verification is limited to:

```bash
pnpm --dir web build:userscript
node --check lanraragi-checker.user.js
git diff --check
```

- Run applicable checks, including before commits; reuse a successful preview build when source is unchanged. Documentation-only edits need only `git diff --check`.
- Do not automatically run backend, dashboard, live, showcase, browser interaction or theme/viewport regression checks. The user handles full regression and visual verification unless explicitly requesting assistant-run tests.
- Userscript UI edits require a frozen baseline before editing; follow `docs/userscript-preview.md`. A requested preview serves actual frozen builds, without automatically driving the browser.
- Assistant browser testing targets Chromium + Tampermonkey only. Firefox verification belongs to the user.
