# Steadybar 2.1 — Learning storage and backup compatibility

The existing database name stays **`music-practice-os`**. Physical IndexedDB schema becomes **4**, normalized workspace schema remains **2**, and new whole-workspace backup envelopes use **3**. These version counters serve different purposes.

## Before and after updating

Export a backup before installing an update, finish active practice and close older tabs. Do not clear browser storage to resolve an upgrade prompt. Normal PWA updates remain deliberate and deferred during active practice or unsaved editing.

Upgrading a 2.0/2.0.1 physical database adds an empty `courseProgress` store. It does not rename or rewrite exercises, sessions, time, outcomes, songs, profiles or settings. Existing unfinished sessions remain recoverable and are not retroactively assigned to lessons. Startup's previously established invalid-profile selection repair is retained.

The existing pre-profile-upgrade snapshot, when present, remains unchanged. It is **not** a new snapshot of everything practiced since 2.0; export a current backup yourself before updating. A local safety copy is not a cloud backup.

## Backups

Version 3 includes all existing data plus every profile's learning progress, lesson notes, review history, placement and remembered course setup. It still uses the original `music-practice-os` format identifier. The selected UI profile does not narrow the exported workspace.

Version-1 backups import through the established conversion. Version-2 backups import with empty learning progress unless compatible learning records are actually present. Old backups have no fabricated course completion. Unknown course revisions remain in the learning archive but cannot pass installed lessons. Invalid ownership, duplicate course records and inconsistent current-revision passing checks are rejected before replacement.

Restore is an explicit, validated whole-workspace **replacement**, not merge. The UI first offers a safety-backup download. Verify the browser saved it. The replacement commits across all stores atomically; a failure rolls back instead of producing partial learning/practice data. Imported active sessions are paused at their saved checkpoint. Explicit reset also clears learning; normal upgrading does not.

## Rollback

Steadybar 2.0.1 and earlier do not understand backup envelope 3 or physical schema 4. This intentional rejection prevents silently discarding learning data. There is no automatic database downgrade. Do not put an older build over the same upgraded origin as a rollback experiment. Keep a pre-upgrade version-2 export for a separately isolated older installation, and retain the current version-3 export for returning to the new app.

Data is still local to the browser and origin. Courses add no cross-device cloud synchronization. Export/restore is the existing transfer mechanism.
