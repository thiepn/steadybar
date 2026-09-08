# Steadybar 1.2.0 — delivery and verification

## Delivered application

The complete Music Practice OS 1.1 project has been rebranded as **Steadybar**, with its source code, compiled build, automated tests, local icons, documentation and GitHub Pages workflow intact. The package is prepared for `thiepn/steadybar`.

Changed public names include the app sidebar, onboarding, browser titles, initial loading view, PWA name and short name, Apple installation title, relevant error/reset dialogs, package metadata and backup filenames.

Existing IndexedDB, Web Lock, BroadcastChannel, service-worker cache and version-1 backup-format identifiers were deliberately preserved. This protects existing data and backup compatibility on the same browser origin. It does not transfer data between domains, browsers or devices.

## Verification performed in this run

| Check | Result |
| --- | --- |
| Strict TypeScript type checking | Passed |
| Logic/repository-adapter/service-worker/branding tests | 121 passed; zero failures or skips |
| Rendered Chromium workflows | 26 passed; three native-origin-only tests explicitly skipped |
| Responsive route matrix | 13 routes at six sizes: 78 combinations passed |
| Visual inspection | Rebranded desktop Today, mobile Focus Mode and dark Metronome screenshots inspected |
| Production build | Passed |
| Native localhost browser probe | Blocked by browser policy: ERR_BLOCKED_BY_ADMINISTRATOR |
| Network npm ci | Blocked by container DNS resolution |
| GitHub Actions run | Not run: complete source was not committed |
| GitHub Pages deployment | Not deployed |

The local checks used the preinstalled **TypeScript 5.8.3**, exactly matching the locked development dependency. `npm ci` could not fetch its package in this environment; this is not recorded as a successful network installation. The repository workflow performs a normal install before verification.

The rendered-browser tests use an explicitly test-only validated-memory storage adapter. They do not verify native IndexedDB reload, actual backup/restore/reload or service-worker offline reopening. These real-origin tests remain mandatory before the included workflow deploys. The test harness is absent from `dist/`.

## Repository status

The connected GitHub account confirmed `thiepn/steadybar` was empty and writable. Initialization succeeded at commit `a468fca2107cb97c4b9e5799c0e904ed38f4e3de`. Subsequent source-upload requests were partly rejected by the connection's safety-status check. No incomplete application tree was committed or made the default branch.

A final repository read confirmed that `main` contains only `.gitignore`. The complete application is in the accompanying ZIP, not yet on GitHub. No Pages setting was changed.

## Upload and run

Extract `steadybar-v1.2.0.zip`. Upload the **contents** of the extracted `steadybar` folder to the repository root, including `.github/`, rather than uploading the ZIP itself or nesting the project under another directory. GitHub Desktop can preserve the directory structure and hidden workflow folder.

For the included compiled build, run `npm run preview` from that folder and open `http://localhost:4173`. Development uses `npm ci` followed by `npm run dev`.

For GitHub Pages, select **Settings → Pages → Build and deployment → Source: GitHub Actions** after uploading. The workflow runs type checking, all Node tests and real-browser tests before deploying `dist/`. A configuration failure is not a test pass or a successful deployment.
