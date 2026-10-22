# Userscript development constraints

Read before changing `web/src/userscript/`, shared UI or userscript tooling. For UI changes, also read `docs/userscript-preview.md` before editing and capture the required baseline.

## Source and runtime boundaries

- Production list pages use `LiveApp.tsx`, `page.ts` and `client.ts`. Never render mock galleries on supported site domains.
- The local showcase uses mock data only on the local preview page without a native search form; its operations remain simulated. It is not Tampermonkey integration evidence.
- The userscript owns its DOM inside Shadow DOM. Keep portal containers inside that boundary.
- `page.ts` reads native DOM without moving nodes or executing inline handlers. Preserve successful search fields, excluded-category masks, original navigation/cursor URLs and native file-search form semantics.
- Parse page counts from standalone metadata nodes, not concatenated card text.

## Requests, cache and result semantics

- Scope GM requests to a disposable client. Settings changes and rechecks cancel old requests and reject stale updates.
- Library hits win over queue state. Queue lookup errors remain unknown, never missing; unknown/error results must never count as missing.
- Cache only definitive library results, for three days and at most 2000 entries, under a SHA-256 service/key/search-policy context. Explicit rechecks bypass cache.
- Never send the library authorization header to the queue.
- Sending failures retain selection. Success clears only the submitted batch.

## UI contracts

- Reuse the existing yurui sticker/scrapbook visual language and light/dark themes. Inspect existing components and theme before proposing designs; use shared tokens and variants rather than parallel preview styles.
- Keep covers uncropped in 2:3 regions, reserve two title lines and reuse status icons across cards and selection controls.
- Preview alternatives must use the application components and styles that will ship. See `docs/userscript-preview.md` for preview and visual acceptance requirements.

## Build and release

Version, update URL and generated-bundle requirements are defined in the root `AGENTS.md`.

```bash
pnpm --dir web build:userscript
node --check lanraragi-checker.user.js
```

Do not hand-edit `lanraragi-checker.user.js`. Browser checks are opt-in under the root verification policy and the preview workflow.
