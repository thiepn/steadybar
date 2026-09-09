# Changelog

## 2.1.1 — Post-release integrity audit — 2026-09-09

- Scope remembered lesson tempo to the lesson that supplied it, preventing a custom tempo from silently leaking into another lesson while retaining safe duration and vocal-range convenience.
- Derive current-revision session evidence from the immutable supporting session during whole-workspace validation; reject orphaned or altered evidence while retaining unknown historical course revisions.
- Apply the same 0.5–120 minute limits to imported off-app evidence that live review entry already enforces, and validate current-revision review shapes even when the outcome is “Practice again”.
- Make the generic session repository APIs uphold the one-active-session and learning-reference invariants instead of relying solely on the dedicated practice controller.
- Show lesson-attributable evidence time in the review picker instead of total time from unrelated blocks in the same session.
- Avoid rewriting every inactive course record's timestamp when selecting another course.
- Prevent sight-reading task edits from restoring first-read status for an already-started or already-known passage; genuinely changed material may still be explicitly marked new.
- Rebuilding an existing Today starter plan now preserves its ID/creation time while monotonically advancing `updatedAt`.
- Add Node and browser regressions for all of the above; the complete existing Chromium, Firefox and WebKit release suite remains mandatory.

## 2.1.0 — Guided instrument courses — 2026-09-09

- Add Learn: 16 original courses, 94 lessons and 188 runnable tasks, with distinct Foundations, Skill development and Ensemble application pathways for the five principal instruments.
- Add actual teaching, worked patterns/diagrams, isolation/application, easier/harder variants, repair advice, performance criteria, knowledge questions, review history and lesson notes. Custom instruments receive an honestly scoped practice-method course.
- Integrate lesson launch, non-destructive Today planning, profile-aware search/progress and return-to-lesson session history. Keep lesson ownership as immutable session/block provenance.
- Add explicit self-check assessments and flexible review suggestions; do not award skill completion for reading, elapsed time, placement or confidence. Separate actual app evidence from explicitly reported off-app practice.
- Require personally chosen vocal ranges, bound complete intervals/patterns and include rest in short vocal lesson budgets. Do not mislabel displayed reading examples as unseen first reads.
- Add IndexedDB courseProgress store in physical schema 4 without renaming the database or rewriting old practice history. Export whole-workspace backup v3; retain v1/v2 import support.
- Add curriculum contract, state, transaction rollback/concurrency, guided UI, migration, backup/offline and responsive tests; retain every previous release gate.
- Document primary educational/research sources and the limits of self-directed, self-reported learning.

## 2.0.1 — Profile system hardening — 2026-09-08

- Move profile management out of the dirty Settings form into a dedicated `/profiles` workspace, with Settings and command-search links back to it.
- Allow profile switching and profile creation while an unfinished session exists; the session remains pinned to its original profile and the global one-session guard still prevents parallel practice.
- Preserve multiple ordered focus areas when editing profiles instead of silently collapsing them to one, and keep all selected focuses available to recommendations.
- Give blank new profiles deterministic unique names such as `Guitar 2`, reject ambiguous explicit duplicates, and default Custom profiles to the neutral `general` family.
- Treat `Earlier practice` as a read-only historical attribution bucket: it cannot be selected, edited, archived, searched as an actionable practice source, or own a new session.
- Repair older v2 workspaces whose active/primary selection points at `Earlier practice`; if an older UI archived every real profile, restore one real profile without touching history.
- Add History profile filtering so archived and historical sessions can be reviewed without switching the active practice workspace.
- Label recovery banners with the unfinished session's owning profile and keep cross-profile recovery explicit.
- Retain `primaryProfileId` only as an internal compatibility/fallback pointer rather than a user-facing second selection concept.
- Expand regression coverage for selection repair, historical-session guards, active-session switching/creation, multi-focus editing, unique names, custom defaults, cross-profile History, and the new profile route.

## 2.0.0 — Instrument-specific practice profiles — 2026-09-08

- Add stable multiple practice profiles, instrument-specific skills/focus/capabilities, profile management and guarded switching.
- Replace compulsory drum/BPM exercise fields with 11 typed protocols and protocol-specific outcome records.
- Add 140 starter exercises across Drums, Guitar, Bass, Piano and Voice, exact-duration templates and capability-based Custom profiles.
- Add chord counts, fretboard note checks, bass groove reviews, piano key/hand cycles, first-reading evidence, bounded vocal reference patterns and explicit self-assessment.
- Preserve existing session timing, four drum tempo trainers, locks, metronome, recovery, theme choices and sans-serif interface.
- Scope Today, library, routines, goals, progress, history and search; preserve full-workspace backup and shared repertoire.
- Add instrument song parts and independent sections/readiness/arrangement notes, with correct practice and setlist snapshots.
- Upgrade the existing database transactionally to physical schema 3, normalized workspace 2 and backup envelope 2. Preserve a downloadable original; continue importing v1 backups.
- Add typed validation, deterministic migrations, relationship safety, selective profile writes, audio cancellation and domain/native/browser regression coverage.
- Document educational and measurement limits; microphone grading, recording and generated backing tracks remain deliberately unadvertised.


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
