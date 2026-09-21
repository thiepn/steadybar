# Changelog

## 2.4.0 — Priority engine — 2026-09-21

- Add a deterministic, runtime-only Priority Engine that ranks concrete practice targets without persisting or displaying a pseudo-scientific score.
- Combine active goals, medium-term PriorityCycles, due retention, recent weakness, neglect, musical usefulness, recent domain balance and upcoming dated setlists into inspectable signed factors.
- Add conservative penalties for very recent repetition, recent scheduling, repeated skips, missing prerequisite evidence, exercise-level mismatch and stable maintenance work that is not due.
- Make future snoozed targets ineligible while keeping them inspectable for debugging; manual priority overrides remain independent from musical mastery.
- Rank exercises, songs, song sections and persistent transitions while keeping broad skill nodes and Learn lessons out of the schedulable candidate pool for now.
- Propagate song goals and setlist urgency to the song's sections/transitions so the later Autopilot can isolate concrete repertoire work.
- Use active PriorityCycles instead of older profile-focus weighting when a cycle exists, while retaining profile focus as a fallback for workspaces without an active cycle.
- Keep prerequisites as a soft penalty rather than a gate, preserving music-first practice while reducing accidental advanced-material dominance.
- Route the existing Suggested exercises panel through the new engine and surface its strongest structured explanation.
- Add deterministic regression coverage for goals, priority cycles, retention due dates, weakness, repetition, repertoire urgency, snoozes, skips, prerequisites, domain balance, legacy workspaces and non-mutation.
- Session composition, time budgeting, diversity/fatigue constraints and automatic scheduler bookkeeping remain intentionally deferred to Phase 5.

## 2.3.0 — Mastery & retention engine — 2026-09-21

- Turn the Phase 2 practice-state foundation into a deterministic mastery engine with Discover → Learn → Build → Stabilize → Retest → Apply → Maintain progression for concrete practice targets.
- Keep legacy-only history honestly Unassessed; historical clean attempts can still establish Peak BPM without fabricating modern working/cold reliability.
- Separate Peak, Working and Cold tempo: working/cold levels require repeated modern solid evidence on separated occasions, while failed experiments above established working tempo do not demote mastery.
- Add conservative review scheduling and maintenance spacing while explicitly treating inactivity as a due-review signal rather than automatic skill loss.
- Tolerate one weak retained-skill result; repeated Not Yet evidence at or below the established level can move the target back toward Build and recommend reduced challenge.
- Keep broad skill-domain states as coverage/evidence containers rather than falsely assigning domain-wide mastery or BPM from a few exercises.
- Upgrade rebuildable practice state to mastery engine v2 while preserving manual priority and snooze overrides from engine-v1 backups.
- Commit ended session history and rebuilt mastery state atomically; ordinary live-session updates can no longer end practice through a weaker write path.
- Add optional block-level Not Yet / Usable / Solid summaries and limitation tags while retaining detailed five-level tempo attempts and unrated Finish block compatibility.
- Add unit, repository-transaction and browser acceptance coverage for mastery transitions, retention, tempo semantics, atomic rollback and active-practice summaries.
- Priority scoring, Autopilot generation, advanced timing modes, MIDI/microphone analysis and AI remain intentionally outside Phase 3.

## 2.2.0 — Unified practice-state foundation — 2026-09-21

- Add the Phase 2 practice-model foundation without changing Steadybar into an automatic coach yet: canonical practice targets, Not Yet / Usable / Solid evaluations, practice prescriptions, mastery-state vocabulary and deterministic target identities.
- Add static instrument skill graphs, including the nine canonical drum domains, while keeping legacy categories and existing multi-instrument practice protocols compatible.
- Add rebuildable normalized evidence over immutable sessions, tempo attempts, protocol outcomes and lesson reviews; historical evidence can establish known facts such as peak clean tempo without fabricating working tempo, cold tempo, retention or mastery.
- Add persistent `practiceStates` and `priorityCycles` in IndexedDB schema 5, plus deterministic state rebuilding that preserves manual scheduling overrides.
- Add backup envelope v4 while retaining v1–v3 imports and keeping the original `music-practice-os` storage identifier.
- Add persistent song-transition identities and cleanup of derived state when current source content is removed, while leaving historical session snapshots intact.
- Preserve the existing PracticeController, Web Audio engine, Learn system, routines, songs, setlists and session history; priority scoring, mastery transition rules and Autopilot remain intentionally deferred to later phases.
- Extend Node and native Chromium/Firefox/WebKit migration, backup and practice-state regression coverage.

## 2.1.1 — Post-release integrity audit — 2026-09-09

- Scope remembered lesson tempo to the lesson that supplied it, preventing a custom tempo from silently leaking into another lesson while retaining safe duration and vocal-range convenience.
- Derive current-revision session evidence from the immutable supporting session during whole-workspace validation; reject orphaned or altered evidence while retaining unknown historical course revisions.
- Apply the same 0.5–120 minute limits to imported off-app evidence that live review entry already enforces, and validate current-revision review shapes even when the outcome is “Practice again”.
- Make the generic session repository APIs uphold the one-active-session and learning-reference invariants instead of relying solely on the dedicated practice controller; generic inserts can no longer overwrite an existing session/history row.
- Show lesson-attributable evidence time in the review picker instead of total time from unrelated blocks in the same session.
- Avoid rewriting every inactive course record's timestamp when selecting another course.
- Prevent sight-reading task edits from restoring first-read status for an already-started or already-known passage; genuinely changed material may still be explicitly marked new.
- Rebuilding an existing Today starter plan now preserves its ID/creation time while monotonically advancing `updatedAt`.
- Keep entity metadata and future source references coherent during workspace-level edits: exercise edits now stamp themselves and affected parent plans/routines; canonical exercise/song-section labels follow source renames/removals without rewriting custom titles or history.
- Harden onboarding over migrated workspaces so protected historical custom attribution buckets cannot become the selected practice profile, and onboarding profile changes advance metadata.
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
