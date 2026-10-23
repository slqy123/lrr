# Userscript development constraints

Read before changing `web/src/userscript/`, shared UI or userscript tooling. For UI changes, also read `docs/userscript-preview.md` before editing and capture the required baseline.

## Source and runtime boundaries

- Production list pages use `LiveApp.tsx`, `page.ts` and `client.ts`. Never render mock galleries on supported site domains.
- The local showcase uses mock data only on the local preview page without a native search form; its operations remain simulated. It is not Tampermonkey integration evidence.
- The userscript owns its DOM inside Shadow DOM. Keep portal containers inside that boundary.
- `page.ts` reads native DOM without moving nodes or executing inline handlers. Preserve successful search fields, excluded-category masks, original navigation/cursor URLs and native file-search form semantics.
- Parse page counts from standalone metadata nodes, not concatenated card text.
- Pagination and positioning use same-origin HTML requests and `readPage` to update the mounted interface without reloading. Never execute scripts from fetched pages. Preserve cursor/search URLs, cancel superseded requests, and update history only after successful parsing; failures retain the current results. History navigation uses a bounded in-memory page cache. After asynchronous navigation, the hidden native document is stale and must not overwrite current results.

## Requests, cache and result semantics

- Scope GM requests to a disposable client. Settings changes and rechecks cancel old requests and reject stale updates.
- After a URL finder miss, search library tags by the EH gallery ID and confirm parsed `source` URLs across EH hosts before marking downloaded. This lookup is independent of optional title search; paginate search results and also confirm source tags on title candidates.
- Library hits win over queue state. Queue lookup errors remain unknown, never missing; unknown/error results must never count as missing.
- Persist only URL-matched library hits (`downloaded`), for three days and at most 2000 entries, under a SHA-256 service/key/search-policy context. Ignore legacy cached missing/duplicate results. Explicit rechecks bypass cache and remove an old hit if the new result is not downloaded, including query errors. Missing, title-search duplicates, queue states and errors are not persisted.
- Never send the library authorization header to the queue.
- Parse archive tag strings with semicolon or comma delimiters; split namespace/value only at the first colon so source URLs remain intact. EH source values may omit the URL scheme and trailing slash; normalize these before matching or linking.
- Sending failures retain selection. Success clears only the submitted batch.

## UI contracts

- Reuse the existing yurui sticker/scrapbook visual language and light/dark themes. Inspect existing components and theme before proposing designs; use shared tokens and variants rather than parallel preview styles.
- Duplicate cards show the candidate count and open a side-by-side comparison (stacked on narrow layouts). Load selected archive metadata on demand; compare covers, full titles, language, creators and page counts. Resolve EH `source` tags by gallery ID across supported EH hosts; prefer a matching current gallery, and use parent links to identify direct version relationships. Source metadata supplements missing library tags, never replaces actual local page counts/sizes or promotes queue/library status. Highlight language differences and show paired page/size bars; label source size versus archive size separately. Parse `date_added` tags as library addition dates, separately from source publication dates; missing metadata stays unknown and partial loading failures offer retry.
- Keep covers uncropped in 2:3 regions, reserve two title lines and reuse status icons across cards and selection controls.
- Preview alternatives must use the application components and styles that will ship. See `docs/userscript-preview.md` for preview and visual acceptance requirements.

## Build and release

Version, update URL and generated-bundle requirements are defined in the root `AGENTS.md`.

```bash
pnpm --dir web build:userscript
node --check lanraragi-checker.user.js
```

Do not hand-edit `lanraragi-checker.user.js`. Browser checks are opt-in under the root verification policy and the preview workflow.
