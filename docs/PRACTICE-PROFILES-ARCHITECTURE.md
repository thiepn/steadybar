# Practice profiles architecture and implementation sequence

## Design before implementation

Retain TypeScript, native DOM, IndexedDB, the existing route system, timing controller and Web Audio scheduler. Do not duplicate the application. Normalized workspace data is schema version 2, exported with backup envelope version 2. The IndexedDB physical schema becomes version 3; these are deliberately independent version numbers.

### Entities

PracticeProfile owns a stable identity, instrument/family, ordered focus areas, level, session preference and archived flag. Settings holds `activeProfileId`; `primaryProfileId` is retained only as an internal compatibility/fallback pointer and is not a second user-facing selection. Capabilities are derived from validated definitions, not trusted arbitrary imported booleans. Instrument type is immutable after creation; rename is safe.

Exercise owns a profile and discriminated ProtocolConfig. Legacy flat drum fields are optional import compatibility fields; new pitched/count-based exercises do not require or write artificial BPM/sticking. Skill areas are defined by the profile. Routine and DailyPlan belong to profiles; the latter is unique by profile/date. Practice blocks snapshot profile identity, protocol parameters, instructions and results. Profile switching changes the workspace view only: an unfinished session remains pinned to the profile/configuration it started with, and the global one-active-session guard prevents parallel practice.

Song stays a shared composition. Optional SongParts belong to profiles and hold independent arrangement notes, readiness and sections. Existing shared sections remain valid. Global setlists resolve the active part when generating practice. Source records may be archived without deleting history. Historical missing sources remain understandable from snapshots.

### Protocols and outcomes

Use closed TypeScript unions, a registry for allowed capabilities and display labels, pure validators, shared editor controls and task-specific active views. Outcomes are append-only typed events with timestamps and configuration context. Counters are manual; fretboard answers are objectively checked; vocal ease/intonation are explicitly self-assessed. Blank feedback is not converted to a perfect score. Tempo summaries only use actual tempo-based evidence. Coverage means practiced, not mastered.

The transport retains an internal BPM when needed by the universal optional metronome. That transport default is not an exercise result or a progress measurement when the task has no tempo.

### Profile workspace semantics

Profile management lives on `/profiles`, outside the Settings preferences form. A profile can be created or selected while another profile owns an unfinished session because selection does not mutate session ownership; attempting to start new practice still resumes the unfinished session instead of creating a second one.

`focusAreas` is genuinely multi-valued in the editor. Existing order is preserved so the first focus remains the legacy/default aim while every selected focus can influence recommendations. New blank names are made unique deterministically; explicit duplicate names are rejected to keep the picker and historical attribution unambiguous.

Migration-only `unresolved-history` profiles such as **Earlier practice** are historical buckets, not practice workspaces. They are excluded from the picker, new-session ownership and actionable search results, remain visible in the profile manager as read-only, and can be reviewed through History's profile filter. Startup normalization repairs older v2 settings that accidentally selected a historical bucket, without rewriting practice records.

### Persistence and migration

Upgrade in the existing `music-practice-os` database. Create a profile store and a migration-backup store; replace the global date index with a compound profile/date index. Normalize all existing records inside one transaction, preserving a pre-upgrade snapshot. Deterministic IDs, no Date.now/randomness in migration. Infer historical profiles only from reliable source identities; ambiguous old sessions use a clearly labeled legacy/unassigned profile, not the currently selected instrument.

Read and validate before any destructive restore. Version-1 imports normalize explicitly. Version-2 imports require valid profiles, protocols and references. Blocked upgrades report a useful action; older connections close on versionchange. Export full workspaces, not the active-profile filtered view.

### Rendering and performance

`store.view()` returns a scoped view for navigation pages; `store.snapshot()` remains the full source of truth for backups, transactions and historical references. Profile changes cannot replace active-session ownership. Active task views rebuild only on block/configuration changes; counters and timer text update selectively. Use bounded initial library rendering and the existing theme system unchanged.

## Ordered delivery plan

| Phase | Modules | Acceptance / tests |
|---|---|---|
| 1. Domain | profiles, protocols, models, validation | Strict unions; valid defaults; incompatible parameters rejected. |
| 2. Migration | migration, database, backup | v1 fixtures preserved; idempotence; compound plans; old/new restore. |
| 3. Content | catalog, seed | Every official profile has original tasks and exact-duration routines; no duplicates. |
| 4. Workspace UX | store, profiles UI, onboarding | Create/switch/rename/archive; own content and plans; active-session pinning. |
| 5. Editors/planning | protocol editor, library, routines, Today | No irrelevant fields; typed protocol configuration; preserved inputs. |
| 6. Practice | controller, logic, protocol panel, reference audio | End-to-end outcome recording for all profiles; no false tempo; stop/cancel audio. |
| 7. Repertoire | songs, parts, setlists | Distinct parts/sections, correct snapshots and readiness. |
| 8. Goals/review | goals, analytics, progress, history, search | Scoped outcomes, no invented mastery, immutable historical attribution. |
| 9. Hardening | tests, styles, docs | Existing regression suite, migrations, native browsers, 14 viewports, visual review. |
| 10. Release | CI, ZIP, PR | Required checks remain enabled; never claim an unobserved deployment. |

After each phase: strict typecheck and targeted tests. Baseline before changes: 142 Node tests passed with installed TypeScript 5.8.3. Network dependency installation is unavailable in the local container, so use the matching preinstalled compiler locally and retain npm ci in CI.
