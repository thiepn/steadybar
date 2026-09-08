# Architecture

## Modules, not a framework dependency graph

The browser runs ES modules compiled from 39 strict TypeScript source modules. The development environment could not fetch the requested framework packages; all required runtime capabilities are implemented with browser APIs rather than nonfunctional package imports. This is an intentional stack deviation from the attached specification, not a claim that it uses React, Vite, Dexie, Zod, or Recharts.

| Layer | Location | Responsibility |
| --- | --- | --- |
| Domain | `src/domain/` | Explicit models, runtime validators, dates, clean-BPM rules, trainer calculations |
| Persistence | `src/db/` | IndexedDB transactions, migration, seeds, validated JSON backup |
| Audio | `src/audio/` | Pure audio-time scheduler and a single AudioContext-owning engine |
| Platform | `src/platform/` | Cancellable exclusive Web Lock leases and guarded workspace replacement |
| Practice | `src/practice/` | Session snapshots, timestamp timers, serialized transitions, recovery, launch helpers |
| State and navigation | `src/app/`, `src/main.ts` | IndexedDB snapshot, subscriptions, hash router, themes, search and onboarding |
| Interface | `src/pages/`, `src/ui/`, `src/styles/` | View components, semantic controls, dialogs, forms and local SVG charts |
| Build/test | `scripts/`, `tests/` | TypeScript compilation, static server, generated SW, Node and Playwright tests |

No secrets, accounts, network audio, remote assets, or backend are required. Application user text goes through DOM text nodes rather than HTML interpolation.

## Persistence and source of truth

IndexedDB is authoritative. `AppStore` caches a read snapshot for views; a successful write awaits transaction completion before refreshing that snapshot and reporting success. BroadcastChannel signals other tabs to re-read. Active session changes use a serialized controller and transactionally read/modify/write the latest persisted session. Session and block identity guards run inside this transaction, so a stale command cannot change ended history or accidentally advance a different block. Commit failures refresh the last committed snapshot rather than claiming success. Writes request strict durability where supported; only an unsupported-options TypeError triggers compatibility fallback, never a permission/storage error.

Database name: `music-practice-os`. Current IndexedDB version: **2**. Stores: exercises, songs, routines, dailyPlans, sessions, goals, setlists, metronomePresets, settings.

Version 1 creates the stores, session status/start-date indexes, and unique daily-date index. The version-1-to-2 migration introduces the safe background-pause preference without rewriting practice history. Later migrations belong beside this migration in `db/database.ts`; increment the IndexedDB version, make transformations explicit, and test both the pure transform and the actual upgrade on a real browser origin.

Initial content is inserted in a transaction only when preferences are absent. Starter data is 30 exercises and four routine templates; no fake sessions, songs, progress, goals, or performance results are seeded.

Validators reject malformed entities, duplicate identities, invalid dates and timezones, blank names, route-unsafe IDs, duplicate nested block/section IDs or weekdays, missing required goal/block source IDs, out-of-range tempos, invalid trainer variants, contradictory block states, and backups with multiple active sessions. Dates are normalized to UTC ISO timestamps; daily plan keys remain local `YYYY-MM-DD`. Local ISO-week grouping is independent of UTC day boundaries.

## Backups and destructive operations

Backup schema version **1** is separate from IndexedDB version 2. The document contains format, version, export timestamp, and all nine stores. Export reads one consistent snapshot transaction. Import validates the whole document before clear-and-put replacement in one multi-store transaction. The database replacement entry point itself validates every record before opening the destructive transaction, not just the import dialog. Restored active sessions are paused immediately at the saved checkpoint. The UI supports replacement only; there is deliberately no partial merge policy.

The UI starts a safety-backup download before replacement/reset, but cannot guarantee a user's browser retained that download. Reset requires typing RESET. Restore/reset take both the session and audio exclusive leases, and refuse to proceed while another tab owns either. This prevents a running tab from writing stale practice state into a newly restored workspace. The optional Web Locks API is feature-detected; without it only per-tab guarding is possible. Exercise/routine and song archival preserve historic records; removing setlists or goals does not delete source songs or practice history.

Historical blocks keep name, category, sticking, meter, subdivision, BPM, notes, and tempo attempts. Renaming or archiving an exercise does not rewrite what a past session says. Launch rejects unavailable source references instead of silently replacing them with unrelated work.

## Session state machine

A session has active/completed/abandoned status and ready/countin/running/paused runtime phase. Only `running` accumulates elapsed active time. The displayed value is persisted active seconds plus the difference between now and the persisted run-start timestamp, not the number of rendered timer ticks.

The controller persists meaningful changes and checkpoints approximately every five seconds. Pause checkpoints and clears the running timestamp. Recovery pauses at the last saved checkpoint, intentionally excluding uncertain time while the browser was absent; a crash can lose up to five seconds since the last successful checkpoint.

Count-in starts audio first; the audio-clock boundary after the count-in supplies the start timestamp. This boundary is retained even if a stalled main thread misses the first practice click; audio time is mapped back to wall time so a late callback neither hangs the timer nor counts the count-in. A generation token prevents a late audio/count-in callback from reviving an already paused or finished session. Skipping keeps any actual time already practiced. Restarting retains the prior segment and its attempts, then adds a fresh segment. Moving to the next block returns to ready and never surprises the user with automatic audio.

Where available, Web Locks protect active session ownership and audio ownership across tabs. The write completes before ownership is released. Optional wake locks are acquired during active practice, released at pauses/end, and retried after foregrounding. Cross-tab locks and physical wake behavior are implemented but were not verified here on a real origin/device.

## Audio timing and trainer rules

`ScheduleClock` produces events on an AudioContext time axis. A 25 ms wake-up timer schedules approximately 120 ms ahead. Oscillators and fast gain envelopes receive exact audio start times; neither rendering nor the wake-up timer is the sound clock. One engine owns the context, scheduled nodes, callbacks and cleanup.

Beat BPM refers to the denominator note: x/4 quarters and x/8 eighths. Subdivisions split that beat into 1/2/3/4 equal pieces. Compound defaults accent groups of three. Muting a beat mutes its subdivisions. Tempo changes affect future events, and structural changes apply at a bar boundary. Already scheduled clicks can reflect the previous configuration for the short look-ahead window. Stale events after scheduling delays are skipped rather than played in a burst. Long gaps are advanced arithmetically rather than by unbounded catch-up loops. Count-in changes affect the next start, not the in-flight count-in. A per-start lease plus generation checks around asynchronous AudioContext.resume prevents cancelled old starts from creating ghost audio or stopping a newer start.

Tap tempo uses the median of recent intervals, ignores accidental rapid double taps, and resets after four seconds. Progressive and ladder trainers use active elapsed time. Repetition advances on clean/effortless ratings. Endurance uses a fixed BPM and target duration. All modes hold their maximum/final stage. Manual BPM edits deliberately disable the current trainer.

The browser can still suspend audio in the background. Default visibility handling pauses; the app does not promise uninterrupted lock-screen playback or latency compensation.

## Truthful analytics

Best clean BPM is the maximum clean or effortless attempt. Highest attempted BPM includes every rating. Latest successful BPM is chronological and includes acceptable, clean, or effortless. Failed/messy attempts never raise best clean BPM.

Totals and distributions use actual active block seconds, never planned duration. Active sessions are excluded from finished analytics; abandoned sessions retain genuine time and attempts. Weekly-session goals count completed sessions in the current local ISO week. BPM goals use all-time best clean tempo, and song mastery uses user-maintained song status. Custom goals are manual.

Progress page filters are explicit. Range-specific best-clean figures are labeled accordingly. Percent-of-BPM-target is not described as percent musical mastery. SVG charts include data-table alternatives. Time axes are spaced by real calendar-day distances instead of treating irregular observations as equally spaced. A y-axis readability minimum is kept separate from the recorded daily peak; sub-minute/sub-second sessions are not relabeled as one minute or zero. History pagination limits displayed records, although the store still reads the local data snapshot; multi-thousand-session performance was not benchmarked.

## Static hosting and PWA update policy

The build copies all assets locally and writes a filename-and-content-versioned service worker. Hash routing avoids server rewrite requirements and survives repository subpaths. A relative manifest and icon paths work with the same deployment model.

Install precaches the complete application shell. There is no automatic skipWaiting on update. The UI asks before applying a waiting version and defers it during active practice, dialogs, or dirty settings. Activation only removes older caches owned by exactly the same scope and preserves child-scope applications. Fetch handling ignores cross-origin and non-GET requests and serves the cached shell for navigation.

## Verification boundary

Node tests cover pure domain and migration logic. Repository tests exercise the production database module against an explicitly test-only transaction adapter with controllable commit failures, staged writes, and rollback. This tests application logic, not the browser’s IndexedDB implementation. Other tests evaluate the generated worker with controlled Cache API substitutes. Rendered-browser tests execute production UI/domain/controller/audio modules but replace storage with a validated memory adapter and disable service-worker registration. The test bundle is never copied to production.

These methods detect many defects, but neither proves actual IndexedDB transaction/reload behavior or service-worker offline navigation. The real-origin suite is retained without suppressing failures; the build environment refused localhost browser navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. See QA.md for exact results and remaining checks.

## Deployment gate

The GitHub Actions workflow verifies strict TypeScript, the Node suite, and the real-origin Playwright suite before publishing to Pages. Pull requests run verification without deployment. The workflow installs a pinned Playwright browser and retains browser QA artifacts. It has not been executed remotely during this delivery. A failing real-origin suite deliberately blocks deployment rather than substituting the rendered-memory test mode.

## Steadybar naming compatibility

The public product name is **Steadybar** from version 1.2.0. The IndexedDB name `music-practice-os`, Web Lock names, broadcast channel, service-worker prefix and JSON backup format marker intentionally retain their version-1 identifiers. Changing a display name must not strand local data, disable cross-tab coordination, or invalidate backups. Downloads use `steadybar-backup-YYYY-MM-DD.json`. Data still belongs to the browser origin; moving domains requires export and restore.
