# Steadybar

**Practice with purpose.** A local-first music practice workspace with a drum-focused starter library.

Plan a session, practice with an integrated Web Audio metronome, record clean attempts, and review actual progress. No account, required backend, telemetry, remote fonts, or runtime npm dependencies.

## Run

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open `http://localhost:4173`. For a production build:

```sh
npm run build
npm run preview
```

The downloadable release ZIP includes `dist/`; that copy can run `npm run preview` without installing dependencies. Git checkouts intentionally exclude generated `dist/`. Do not open the application through `file://`.

## Included workflows

- **Plan and practice:** daily plans, reusable routines, multi-block sessions, pause/resume, skip/restart, attempt ratings, quick notes, session review, recovery and mobile Focus Mode.
- **Timing:** 20–300 BPM, tap tempo, meters, subdivisions, accents, count-in, presets and progressive/repetition/ladder/endurance trainers.
- **Material and preparation:** 30 original drum exercises, four routine templates, editable songs and sections, transitions, setlists and preparation-routine generation.
- **Review and data:** truthful practice-time and clean-BPM analytics, goals, history snapshots, local IndexedDB, validated backup/restore, cross-tab coordination and a service-worker offline shell.
- **Workspace:** light/dark/system appearance, responsive navigation, command palette, keyboard shortcuts and optional screen wake lock.

## Validation

```sh
npm run typecheck
npm test
python3 -m pip install -r tests/requirements.txt
python3 -m playwright install chromium
npm run test:e2e
```

Use `python` in place of `python3` on Windows when appropriate. `npm test` builds before running the Node tests. `npm run test:e2e` tests the production build with real IndexedDB and a service worker. `CHROMIUM_PATH` selects an installed browser; `PLAYWRIGHT_BUNDLED_BROWSER=1` selects Playwright's browser. CI installs the pinned browser automatically.

`npm run test:ui` and `npm run test:visual` use a clearly isolated in-document test harness with memory storage. They are useful when an execution environment blocks localhost navigation, but do **not** establish real persistence or offline support. See [QA](docs/QA.md).

## Architecture

Strict TypeScript, native DOM components, IndexedDB, Web Audio, local SVG charts and a generated service worker. This is not a React project. TypeScript 5.8.3 is the only npm development dependency.

`src/domain/` owns models, validation, analytics and trainer calculations; `src/db/` owns storage and backups; `src/audio/` owns scheduling; `src/practice/` owns session transitions. Views and UI components are separate. See [architecture](docs/ARCHITECTURE.md) and [changelog](CHANGELOG.md).

## Data and compatibility

Data belongs to the browser profile and origin. Another device, browser, port or domain does not share it. Export backups regularly and before moving domains. Restore supports validated transactional **replacement**, not merge. Reset and replacement require confirmation and initiate a safety-backup download; verify that your browser saved it.

Steadybar was originally delivered as Music Practice OS. Its public name and backup filenames changed in v1.2. Existing database, lock, channel and backup-format identifiers intentionally stay unchanged so the rename does not orphan data or invalidate older backups. A version-1 backup's `format` remains `music-practice-os`; downloads use `steadybar-backup-YYYY-MM-DD.json`.

Active sessions checkpoint every five seconds. Recovery excludes unknown crash downtime; up to the last checkpoint interval may be missing. Backgrounding pauses practice. Keep the app foregrounded for reliable audio; OS suspension and hardware/Bluetooth latency are outside its timing guarantees.

BPM counts the denominator-note beat: quarter notes in x/4 and eighth notes in x/8. Thus 72 BPM in 6/8 means 72 eighth-note beats, not 72 dotted-quarter pulses. Count-in and pauses are excluded from active time.

## GitHub Pages

Repository: `thiepn/steadybar`. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**. The included workflow verifies the app before publishing `dist/`; native browser-test failures block deployment. Pull requests are tested without deployment. After enabling Pages, rerun the workflow if its first deployment was blocked by configuration.

All assets and manifest paths are relative, with hash-based application routes, so the build supports `/steadybar/` as well as a domain root. Core use is designed to work without a network after caching. Service-worker updates require a deliberate reload and are deferred during practice or unsaved editing.
