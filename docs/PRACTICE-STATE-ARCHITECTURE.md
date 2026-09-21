# Practice state architecture — Phase 2

Steadybar keeps existing sessions, tempo attempts, protocol outcomes and lesson reviews as the historical evidence ledger. Phase 2 adds only two persistent stores: `practiceStates` and `priorityCycles`.

`PracticeState` is a rebuildable interpretation of evidence, not a second history log. Legacy history is migrated conservatively: clean/effortless tempo evidence may establish a historical peak, but it never fabricates working tempo, cold tempo, retention dates or a mastery stage. Such targets begin as `unassessed`.

Target identities are canonical and deterministic through `practiceTargetKey`. The model supports skills, exercises, songs, song sections, persistent song transitions and guided lessons. New practice blocks may carry a `PracticePrescription` snapshot and one summary `PracticeEvaluation` using **Not Yet / Usable / Solid**. Existing five-level tempo attempt history is retained unchanged and interpreted only through adapters.

Skill definitions are static application curriculum. Personal state belongs in IndexedDB. Drum domains are stable IDs: timing, groove, coordination, technique, fills, dynamics, reading, repertoire and musicality. Other instrument profiles retain compatible generic skill definitions.

The physical IndexedDB schema is version 5. Backup envelope version 4 contains `practiceModelVersion: 1`, practice states and priority cycles while v1–v3 backups remain importable through migration.

Phase 2 deliberately does not implement mastery transitions, review intervals, priority scoring or Autopilot. Those behavioral rules belong to later phases.
