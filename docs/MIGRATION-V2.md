# Steadybar 2.0 data upgrade

## Versions and source of truth

The database stays `music-practice-os`. IndexedDB's physical schema is **3**, normalized workspace schema is **2**, and new JSON backup envelopes use **version 2** with the original `music-practice-os` format identifier. These are separate version counters. There is no new origin, account or mandatory server.

Before updating, finish your active practice session and export a backup. The application defers its normal PWA update while a session or unsaved form is open. Close other old Steadybar tabs when an upgrade is blocked. Old connections respond to `versionchange` by closing; do not clear browser storage to resolve an upgrade prompt.

## What the upgrade preserves

The upgrade creates `profiles` and `migrationBackups` stores, and changes daily-plan uniqueness from date alone to **profile + date**. Initialization reads the old stores, preserves an original pre-upgrade snapshot, normalizes the workspace, validates references, and commits all record changes in one transaction. A failed transaction must not leave a partially normalized workspace. The original snapshot can be downloaded from Settings. It is not a cloud backup; download it separately.

Existing exercise IDs, practice time, attempts, notes, settings, colors, songs and history are retained. Old drum exercises become typed tempo tasks. Other legacy exercises are translated using their recorded instrument and settings rather than rebranded drum drills. New profiles receive their own starter content without replacing custom exercises.

Historical instrument attribution is conservative. Reliable exercise identities determine a block's profile. Activity with no reliable instrument evidence is placed in **Earlier practice**, not automatically attributed to the currently chosen instrument. Historical profile names, instructions and protocol configurations are snapshots: later edits do not rewrite completed performances. A mixed historical session retains each block's attribution.

Legacy mixed-instrument future routines and daily plans split into profile-specific plans with deterministic collision-safe IDs. Plan-to-routine links follow the corresponding split. Their original unsplit forms remain in the pre-upgrade copy.

Legacy future references to deleted exercises become free tasks with their title, duration, available tempo, notes and an explanatory migration note. Missing song sections fall back to a surviving song when possible. Goals with deleted sources become manual goals rather than claiming completion. Missing setlist song identities are retained in migration notes. Version-2 imports, by contrast, reject invalid required relationships rather than silently repairing corrupted current-format data.

## Backup and restore

Version-1 backups remain importable through the same deterministic conversion. Version-2 exports include the **whole workspace**, not just the selected profile: all profiles, exercises, routines, plans, songs and parts, history, goals and settings. Optional reference tones have no stored media files. An old v1 application cannot import a v2 backup.

Restore is a validated **replacement**, not a merge. It offers a safety-backup download of the current workspace before replacement. Check that the browser actually saved the download. The new workspace is validated before storage is touched; all stores are replaced transactionally; an imported running session resumes in a paused recovered state, excluding unobserved downtime.

Reset remains explicit and confirmed, creates a safety-backup download, then deletes the practice workspace and its local migration snapshot. Reset is not needed to use profiles or colors. Archive a profile to hide it while preserving its history; the last usable profile or a profile owning an active session cannot be archived. Instrument/family identity is immutable after creation; create a different profile rather than reinterpreting history.

## Rollback limits

No automatic database downgrade is implemented. Reinstalling an old v1 service worker over an already upgraded physical schema is not a safe rollback procedure. Keep the original exported v1 backup for use in an isolated old-version installation if a historical copy is required. Do not run old and new builds against the same production origin as an experiment.

## Test coverage

Pure conversion fixtures cover non-drum preferences with drum material, mixed profiles, missing sources, ID collisions, historical edits, empty workspaces, active sessions, backup round trips and idempotence. Repository tests cover atomic failure, retained originals, invalid replacements, serialized settings writes and selective profile updates. Native browser release tests create a genuine v2 database, load the new app, verify physical schema v3 and the downloadable original copy, then exercise profile persistence and offline operation. See `QA-PROFILES.md` for which checks have actually run.
