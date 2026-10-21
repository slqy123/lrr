# Userscript tests and previews

Local test and preview HTTP services run under PM2. The production Python service remains managed by systemd. PM2 must be installed locally; do not configure startup persistence for these temporary services.

## Manual development on the real site

`make dev` builds and watches the production userscript and serves build files at `http://127.0.0.1:29682`. This is a static file server, not an API backend. Use the real site with a dedicated development Tampermonkey loader and production library/queue settings. A loader using the previous static-server port must be updated to port 29682; local `file:///...` requirements are unaffected. Keep its name/namespace distinct from the offline loaders so GM settings and cache remain separate. Disable the installed release script when the development loader is active on the same site.

Ports 29683–29685 are reserved for mock test/preview services. Development and mock sessions can run concurrently and do not stop one another. Do not configure a real-site development loader with the mock `/library` or `/queue` URLs. Offline loaders run only on their local snapshot URL and must use mock endpoints and dummy credentials, never production services.

If an old snapshot tab polls `/queue/api/tasks/lookup` after its mock server has stopped, close that tab or restart `make test-serve`; do not point it at the development static server. Switching workflows does not require changing the real-site loader's production settings.

## Read-only page input

Supply an HTML snapshot saved from the real site, with its accompanying resource directory. Keep these local inputs under the ignored `refs/` directory. Do not substitute generated fixture pages or concept prototypes.

The server returns the original HTML bytes, serves local styles and images, and uses HTTP CSP headers to block source scripts, external subresources, forms and page connections. It never injects application or test scripts into the HTML. A SHA-256 digest is logged at startup and checked again on graceful shutdown. Missing resources return 404 rather than falling back to the live site.

This is not a browser-wide network firewall. Following an external link can leave the snapshot, and other extensions or unrelated browser tabs are outside this server's control. Use an isolated offline browser/network environment when strict no-egress enforcement is required.

## Single-version session

```bash
make test-serve SAVED_PAGE=/absolute/path/to/saved-page.html
make test-status
make test-logs
```

`make test-serve` builds and syntax-checks the userscript, then starts or restarts `lrr-test-current` on port 29683 for an interactive session. It does not run assertions. Loopback snapshots use their native search form's supported-site action to resolve gallery/navigation URLs, while relative cover resources remain local.

Once per checkout, install `http://127.0.0.1:29683/install.user.js` in the browser containing Tampermonkey. This is a thin loader, not an installed copy of the build: its `@require file:///...` points to the absolute local build path. Enable Tampermonkey's **Allow access to file URLs** and userscript execution permissions. Installation confirmation can be driven through browser-harness; ordinary rebuilds need no installation interaction.

The loader has a stable offline name/namespace/version, uses a port-specific `@include` regular expression for its own `/snapshot.html`, limits `@connect` to `127.0.0.1`, and has no update/download URLs. Grants and execution metadata come from the build header. The tracked production build is unchanged. Build-file metadata inside `@require` is not interpreted as loader metadata.

After rebuilding `lanraragi-checker.user.js`, refresh the snapshot tab. Tampermonkey reads the changed local file on page load, without a version bump or reinstall for code/style-only development changes. Saving does not automatically refresh the browser. Reinstall the loader only when its metadata changes (for example grants or run timing), or when the checkout/build path moves. Production releases still follow the normal version-bump policy.

Open `http://127.0.0.1:29683/snapshot.html`. In the application's settings, set the library URL to `http://127.0.0.1:29683/library`, the queue URL to `http://127.0.0.1:29683/queue`, and use a dummy API key. Never enter production credentials. GM storage, requests and clipboard operations are provided by Tampermonkey, not page mocks.

The local backend returns missing library results and stores submitted queue tasks in memory. Restarting clears backend state; Tampermonkey settings and cache persist. Use explicit recheck after changing backend scenarios.

- `GET /__state`: request metadata, queued tasks, scenario, available native-page URLs and snapshot digest. Authorization values are never logged.
- `POST /__scenario?value=normal|library-error|queue-error|send-error|library-hit|library-hit-queue-error`: choose the backend scenario and clear recorded requests and tasks.

Detail/torrent requests on loopback always use the local `/__native` endpoint, never the live site. Missing snapshots produce an explicit unavailable-resource error; do not treat a list-only snapshot as coverage of these features.

To supply separately saved native pages, pass `NATIVE_PAGES=/absolute/path/to/native-pages.json` to `make test-serve` or `make test`. The JSON object maps complete original HTTPS URLs to local HTML paths relative to the list snapshot's directory:

```json
{
  "https://exhentai.org/g/123/token/": "details/123.html",
  "https://exhentai.org/gallerytorrents.php?gid=123&t=token": "details/123-torrents.html"
}
```

Only supported-site gallery and torrent URLs are accepted. HTML files must remain inside the list snapshot directory; files are read without modification. Direct invocation of the server accepts the manifest path as `LRR_NATIVE_PAGES`. Manifest changes require restarting the session. Native external images remain subject to CSP and may be unavailable; supplying HTML does not establish image or visual coverage.

## Automated browser checks

After installing the current loader and granting Chrome remote debugging access:

```bash
make test SAVED_PAGE=/absolute/path/to/saved-page.html
# Reuse an already-running session without another build/restart:
make test-browser
```

`make test` starts the session and then runs `userscript/test-browser.py` through browser-harness. `test-quick` is an alias, not separate mock coverage. Missing browser permission, loader, file access, or application injection is a failure, not a skipped pass. The runner reuses and activates the snapshot tab, configures dummy credentials through the actual settings UI, and drives controls through CDP. It does not inject or substitute GM APIs.

`make test-core` runs browser-independent checks against the production TypeScript modules using Node's native type stripping and module hooks (Node 22.15+ with type stripping enabled, or a current Node release). It covers title parsing, ambiguous urlfinder failures, concurrency, search deduplication/204 retry, authorization isolation, cache batching/context/bypass, disposal, local-only native requests, and page/client lifecycle. The hook lifecycle test uses a small hook scheduler, not React DOM; browser integration remains necessary.

Browser assertions check the first card's detail panel and its torrent tab when present: provided HTML must render, or absent snapshots must produce the explicit unavailable-resource message. They also cover native query/category/successful-field preservation, nonempty gallery rendering, authenticated library requests, queue authorization isolation, library/queue errors remaining unknown rather than missing, definitive library hits winning over queue errors, selection retention on send failure, successful queue submission/selection clearing, and settings/queue-state persistence across reload. The backend scenario and in-memory tasks are reset; the test changes Tampermonkey settings and ends with queued galleries. Do not run it on a tab being used for a stable visual comparison. Use only the dedicated offline loaders, never production credentials.

To run the same checks against an already-served frozen build, use `make test-browser TEST_ORIGIN=http://127.0.0.1:29684` or port `29685`, after installing that build's loader. These checks are not visual acceptance, clipboard verification, full navigation/detail coverage, Firefox verification, or a browser-wide no-egress audit. Detail/torrent success coverage requires separately saved native pages; list-only runs verify their missing-resource behavior instead. A newly added assertion runner is not verified until an actual run prints `PASS` and exits successfully.

## Frozen before/after comparison

```bash
node userscript/preview.mjs before
# Edit production source and bump userscript/header.txt version when applicable.
node userscript/preview.mjs after
node userscript/preview.mjs serve /absolute/path/to/saved-page.html
```

Capture `before` before editing, including existing local changes. Never replace the baseline after editing. If no baseline was captured, disclose that. Frozen builds are stored in ignored `userscript/dist/comparison/`.

PM2 starts two independent servers:

| Build | Snapshot | Install | Backend settings |
| --- | --- | --- | --- |
| before | `http://127.0.0.1:29684/snapshot.html` | `http://127.0.0.1:29684/install.user.js` | Same origin plus `/library` and `/queue` |
| after | `http://127.0.0.1:29685/snapshot.html` | `http://127.0.0.1:29685/install.user.js` | Same origin plus `/library` and `/queue` |

Install both thin loaders once in Tampermonkey. Their separate names isolate GM settings/cache, and their exact `@include` expressions isolate injection by origin, including the port. Do not replace these with port-bearing `@match` patterns: ports do not provide the required isolation there. Each loader uses a local `@require` pointing directly to its corresponding frozen build. Disable unrelated userscripts on the snapshot origins.

After subsequent edits, capture only `after`, then refresh the existing after tab. No service restart or loader reinstall is needed for code/style changes. The before loader continues to read the untouched baseline. Never recapture before after editing. Keep both files at their stable paths; reinstall the relevant loader if its metadata or absolute path changes. Restart services only when changing the server, page input or resetting backend state.

Reuse one browser tab per version. Keep page input, viewport, zoom, theme and interaction state identical. Use actual application screenshots for visual comparisons, not rewritten HTML or parallel preview CSS. The user handles interactive and visual verification by default; browser automation is only run when explicitly requested.

Disclose the saved-page source, missing resources, mocked backend behavior, untested interactions and unverified Firefox/Tampermonkey behavior. Serving a snapshot or passing a build does not establish browser compatibility or visual fidelity.

## Lifecycle

```bash
make test-status
make test-logs TEST_APP=lrr-test-before
make test-logs TEST_APP=lrr-test-after
make test-stop
```

`test-stop` targets only the three project services; PM2 may report an error for a service that has never been started. Do not use `pm2 stop all`, `pm2 kill`, `pm2 save` or `pm2 startup` for this workflow. Services have fixed ports, no watch mode and no automatic restart. Inspect PM2 logs if a port is occupied or a process stops.

Default assistant verification remains the userscript build, `node --check lanraragi-checker.user.js`, and `git diff --check`. Full browser verification must be requested explicitly. The local showcase remains concept exploration, not evidence of real Tampermonkey integration.
