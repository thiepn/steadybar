# Changelog

## 1.4.0 — Practice workbench

- Researched task-grouped music tools, structured collections, accessibility and interaction performance; documented route-by-route decisions in `docs/DESIGN-RESEARCH.md`.
- Replaced the layered stylesheet with a coherent warm-neutral/charcoal visual system and six mode-specific accent palettes.
- Rebuilt Today as an editable agenda with secondary routine/progress context.
- Grouped the active timer, BPM, beat feedback, transport, attempt ratings and block controls; kept static identity/queue out of beat-time DOM updates.
- Reworked metronome, repertoire rows, routine previews, setlist programs and review/settings sections without removing capabilities.
- Added bounded exercise rendering and retained search/filter/view context; indexed best clean tempo in one pass.
- Made chart coordinates respond to their containers without shrinking text.
- Improved search selection announcements, dialog styling and mobile/rail navigation.
- Added cross-engine native/browser gates, exact responsive geometry tests, large-library and contrast regressions.
- Preserved database, backup, lock identifiers, audio scheduler, history and safe offline updates.


## 1.3.0 — interface and appearance — 2026-09-08

- Replace promotional headings and redundant dashboard cards with a plan-first Today view and list-first exercise library.
- Add System / Light / Dark modes and six accent palettes, persisted without discarding edits or interrupting audio.
- Refine desktop, tablet, and phone navigation; reflow controls, dialogs, forms, collections, and active sessions.
- Consolidate block actions into an accessible options dialog; preserve drag-and-drop and serialized inline edits.
- Preserve keyboard focus when opening and closing dialogs.
- Add palette, theme persistence, legacy backup, prepaint, and viewport regression tests.
- Keep generated builds out of source control; deployment still requires both rendered and native browser checks.

## 1.2.0 — Steadybar — 2026-09-08

- Adopted **Steadybar** across application chrome, onboarding, page titles, installable-app metadata, error dialogs and exported backup filenames.
- Kept the original IndexedDB name, Web Locks, cross-tab channel, service-worker cache namespace and version-1 backup format for continuity with Music Practice OS 1.1.
- Prepared application metadata and relative-path deployment files for `thiepn/steadybar`; the source upload remains pending because the connection rejected part of it.
- Added explicit regression coverage for the public name, relative PWA scope, legacy storage and backup compatibility.


## 1.1.0 — 8 September 2026

Continues the recovered Music Practice OS implementation without replacing its working feature set.

### Data integrity

- Added reusable commit-aware transaction handling, strict-durability requests with a narrow compatibility fallback, and explicit abort/rollback on failures.
- Validated the complete payload at the database replacement boundary, including nested IDs, source requirements, names, ranges and duplicates.
- Protected completed history and the active block against stale queued commands and refreshed committed state after failed writes.
- Made restored active sessions pause at their saved checkpoint before the replacement becomes visible.
- Guarded restore/reset with session and audio leases, including cancellation-safe concurrent acquisition.
- Preserved custom metronome accents and imported custom meters when editing unrelated preferences or metadata.

### Audio and practice

- Retained the count-in-to-practice clock boundary even when the main thread misses the first practice event.
- Added arithmetic catch-up for long scheduler gaps without bursts of stale audio or unbounded loops.
- Prevented late, cancelled AudioContext starts from reviving playback or stopping a newer start.
- Preserved normal browser-modified shortcuts and ignored practice controls once a session is complete.
- Kept another tab’s persisted state visible without treating stale local state as authoritative.

### Interface and analytics

- Spaced chart points by actual calendar dates, keeping gaps honest and avoiding duplicate single-date labels.
- Separated the chart’s minimum vertical scale from actual recorded peak duration, including sub-minute and sub-second sessions.
- Bounded Today’s weekly time to the current Monday–Sunday week.
- Removed deferred dialog autofocus that could steal focus after another field had already been selected.
- Kept the existing restrained light/dark desktop and mobile interface, with fresh responsive and populated-state QA.

### Verification and delivery

- Added repository transaction-failure/rollback tests, lock/scheduler/history/chart regressions, and new rendered-browser workflows.
- Added a real-origin browser-test gate to the GitHub Pages workflow. The workflow is included but was not run against a remote repository.
- Included refreshed evidence, architecture notes, the full source and precompiled static build.
- Real IndexedDB reload, real service-worker offline reopen and real backup/restore/reload remain unverified here because managed browser policy blocks localhost navigation. Rendered-memory tests and transaction-adapter tests are explicitly distinguished from those checks in `docs/QA.md`.
