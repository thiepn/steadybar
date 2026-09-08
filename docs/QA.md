# Steadybar 1.4 — verification guide

## What is measured

The release keeps production storage, audio and session logic separate from views. `npm run check` runs strict TypeScript, builds the application and executes 133 Node tests. The six new tests cover the single-pass clean-tempo index, including 200,000 attempts and equivalence with the existing analytics.

`tests/ci_render.py` runs 29 Chromium workflows in an explicitly isolated memory harness: 26 run and three real-origin-only cases are skipped. The harness never enters the production build. `tests/ui_polish.py --render` runs six appearance/navigation tests and explicitly skips its native reload test. Its checks include 121 route/width combinations and 72 contrast pairs.

`tests/workbench.py` uses populated, validated test fixtures and checks all 14 requested viewport dimensions across 16 routes/detail views (224 combinations), active controls at all 14 sizes, large collections, extra contrast pairs, keyboard dialogs/search, chart resizing, long titles and reduced-motion/forced-color reflow. Fixtures are not added to users' workspaces. A 2,030-exercise fixture initially renders 60 rows; every exercise remains searchable and additional results are reachable with Show more.

The workbench performance sample measures synthetic search-handler time and time to the next animation frame. It is **not field INP**, a physical-device benchmark, or a universal lag-free guarantee. CI artifacts retain raw results.

## Native browser gates

The Pages workflow requires all of the following before deployment:

- Normal locked `npm ci`, strict checking and 133 Node tests.
- Complete rendered UI suite and appearance suite.
- Native IndexedDB recovery, transactional backup/restore, service-worker offline reopening, Web Audio scheduling, count-in and reordering checks.
- Populated workbench matrix and interaction checks in Chromium, Firefox and WebKit.

The additional engines use Playwright builds, not branded Safari or physical iOS/Android devices. A failure in either native engine blocks publication. Current run status is available in the repository Actions tab; this document describes the gates rather than asserting that a future run passed.

## Local environment and limits

The development container has TypeScript 5.8.3, exactly matching the lockfile. Its outbound npm DNS and native localhost browser navigation are blocked. Local execution therefore uses the exact preinstalled compiler and the explicit render harness. These restrictions are not counted as successful npm installation, persistence or offline tests; the real-origin gates run on GitHub-hosted runners.

Screenshot checks cover populated and empty desktop/tablet/mobile pages, details, active practice, metronome, appearance variants, search and an edit dialog. Geometry and token-contrast checks supplement visual inspection but are not a full accessibility conformance audit. Physical music-stand ergonomics, mobile virtual keyboards, assistive technologies and hardware/Bluetooth audio latency need device/user validation.

## Reproduce

```sh
npm ci
npm run check
python3 -m pip install -r tests/requirements.txt
python3 -m playwright install --with-deps chromium firefox webkit
PLAYWRIGHT_BUNDLED_BROWSER=1 python3 tests/ci_render.py
PLAYWRIGHT_BUNDLED_BROWSER=1 python3 tests/ci_native.py
PLAYWRIGHT_BUNDLED_BROWSER=1 python3 tests/ui_polish.py
PLAYWRIGHT_BUNDLED_BROWSER=1 python3 tests/workbench.py
PLAYWRIGHT_ENGINE=firefox python3 tests/ci_native.py
PLAYWRIGHT_ENGINE=firefox python3 tests/workbench.py
PLAYWRIGHT_ENGINE=webkit python3 tests/ci_native.py
PLAYWRIGHT_ENGINE=webkit python3 tests/workbench.py
```

The release ZIP includes `dist/`, so `npm run preview` requires Node but no dependency installation. GitHub checkouts build from source. Existing database/lock/backup identifiers are unchanged. Updates use the existing explicit PWA update flow; do not clear browser storage to update the application.
