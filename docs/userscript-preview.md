# Userscript preview workflow

## Meaning of “preview”

A preview request means an interactive before/after comparison of the actual built userscript, opened in two browser-harness tabs. Do not author separate preview HTML, CSS, or substitute components. Reuse `userscript/test-live.mjs`: its native-page fixture (or supplied saved page), GM mocks, and Shadow DOM application are shared with integration tests.

## Capture and serve

Run from the repository root:

```bash
# Before editing: build the current working tree, including existing local changes.
node userscript/preview.mjs before

# Edit production source. Bump userscript/header.txt version before building changed source.
node userscript/preview.mjs after

# Serve both frozen builds with identical fixture data.
node userscript/preview.mjs serve

# Prefer the same saved real page for visual acceptance when available.
node userscript/preview.mjs serve /absolute/path/to/saved-gallery.html
```

Snapshots live in the ignored `userscript/dist/comparison/` directory. Each capture replaces only its named snapshot. Serving does not rebuild or overwrite either snapshot. Do not capture `before` again after editing; if no baseline was captured, disclose that rather than presenting a different revision as the original working tree.

The command prints labeled `before` and `after` URLs and stays running until Ctrl-C. Both use the same page input and mock implementation, but separate loopback ports isolate browser origins. GM settings are in-memory per page and reset on reload. No real library or queue requests are sent. The manual mode does not run automated tests or their state-changing interactions. Ordinary test execution is unchanged.

## Browser comparison

1. Open both printed URLs using browser-harness, one tab per version. Reuse these tabs on subsequent inspections; do not open duplicate comparison tabs.
2. Keep browser viewport, zoom, theme, fixture, and interaction state identical. Set settings and selections equally in each tab; reload both to reset the mocks.
3. Check both surrounding layout and close-ups, light/dark themes, and normal/compact viewport sizes. Compare checked/unchecked, hover, focus, expanded, and disabled states where relevant.
4. Capture browser screenshots without editing the depicted UI. Label intentional differences. Leave both tabs and servers available while the user compares them.
5. Run `make test` separately. Passing tests or geometry assertions alone do not establish visual fidelity.
6. After subsequent changes, recapture only `after`, restart the comparison servers, and reload the same tabs with their newly printed URLs. Recheck against the approved appearance before delivery.

State the preview source, simulated data and behavior, working interactions, and any remaining visual differences when presenting the comparison. Do not imply that automated tests were run unless they actually were.

## Fidelity and limits

The preview executes the frozen installable `lanraragi-checker.user.js`, including its actual components and styles inside Shadow DOM. The preview and delivered implementation must not use parallel UI implementations.

The generic fixture uses placeholder covers and synthetic content. It is useful for repeatable interactions and error states, not sufficient for final visual acceptance. Prefer a saved real page with local or embedded resources; saved-page preview strips source scripts and blocks external resources, so unavailable covers or fonts must be disclosed. Saved-page GM library and queue responses are simulated as well.

Identical builds under identical page, resource, browser, and interaction conditions should render identically. This does not guarantee matching a live site's changed DOM, network resources, real Tampermonkey behavior, or another browser's font/layout behavior. Chromium/browser-harness verification is not Firefox + Tampermonkey verification. Report those as unverified unless separately tested.

## Direct harness usage

`LRR_LIVE_PREVIEW=1 node userscript/test-live.mjs` retains the existing automated-interaction preview behavior. For a stable manual page, use `LRR_LIVE_PREVIEW=manual` instead. Optional `LRR_PREVIEW_SCRIPT` selects a frozen script file and `LRR_PREVIEW_LABEL` labels the printed URL. The comparison command sets these automatically.
