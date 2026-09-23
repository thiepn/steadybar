# Phase 19 — Curriculum Expansion, Exercise Library, Guided Courses & Repertoire Training Content

## Release totals

Steadybar 2.19 ships:

- 22 guided courses;
- 118 lessons;
- 236 runnable guided lesson tasks;
- 170 built-in exercises across Drums, Guitar, Bass, Piano and Voice;
- additional configurable/general exercises for Custom profiles;
- four repertoire guide cards per instrument type on Song pages.

## Curriculum stages

The `Course.stage` static content type now supports:

1. `foundation` — Foundations;
2. `development` — Skill development;
3. `ensemble` — Ensemble application;
4. `repertoire` — Repertoire laboratory.

Principal instruments receive all four stages in that order.

Custom profiles receive Foundation + Development. The Custom material remains explicitly general practice-method content and does not fabricate specialist technique for arbitrary instruments.

Course stage is static catalog metadata, not persisted user data, so adding the repertoire stage does not require an IndexedDB migration.

## New repertoire courses

Each principal-instrument Repertoire laboratory contains four original lessons and eight runnable tasks.

### Drums

- section role map;
- dynamic arc without rushing;
- fill budget and downbeat return;
- complete take → targeted repair → retake.

### Guitar

- section texture map;
- continuous rhythm through changes;
- contextual chord/section repair;
- complete arrangement take → repair → retake.

### Bass

- harmonic/rhythmic anchor map;
- selective kick relationship;
- note-length arrangement contrast;
- pocket take → repair → retake.

### Piano

- accompaniment texture map;
- economical voice-leading;
- chart → minimum playable accompaniment;
- complete accompaniment take → repair → retake.

### Voice

- breath/diction/intensity phrase map;
- prepared pitch entrance;
- harmony-line independence;
- bounded take → repair → retake with explicit stop rules.

Every Voice lesson retains an explicit check for pain, hoarseness, or rising fatigue.

### Custom development

- observable repertoire targets;
- contextual repair windows;
- complete take before selecting repair;
- later-day retention and appropriate transfer.

## Existing evidence model

No second learning engine was added.

All new lessons use the existing contract:

- original teaching text;
- original worked example;
- two runnable tasks;
- easier/harder variants;
- common mistake + repair;
- transfer/application;
- at least three self-reported performance checks;
- at least one knowledge question;
- lesson notes;
- actual session or explicitly confirmed off-app practice evidence;
- flexible review suggestions.

Completing a timer still does not pass a lesson.

## Built-in exercise expansion

New exercise definitions are appended rather than inserted ahead of older rows so stable IDs remain unchanged.

Drums add six repertoire-oriented drills through the legacy drum seed:

- Section Role Map;
- Backbeat Consistency Window;
- Fill Return Window;
- Cymbal Texture Switch;
- Ghost-Note Pocket Window;
- Complete Take Recovery.

Guitar, Bass, Piano and Voice each add six new repertoire/application exercises. Custom adds three general repertoire-method exercises.

## Existing workspace reconciliation

Historically, `starterContent()` was primarily applied during the v1 → v2 profile migration. That would leave already-upgraded users without newly shipped built-ins.

Phase 19 adds `reconcileStarterContent()`.

On initialization of a v2 workspace:

1. generate current built-in content for every real practice profile;
2. compare by stable entity ID;
3. append only missing exercises/routines;
4. never replace an existing row with the same ID.

This means:

- user-renamed/edited built-ins stay edited;
- archived rows stay archived;
- old history stays untouched;
- newly shipped stable IDs become available;
- the operation is idempotent.

Historical attribution bucket profiles are excluded.

## Song-page repertoire guides

`repertoireGuides(instrumentType)` returns four bounded guides for each instrument type.

Each guide contains:

- stable guide ID;
- title;
- summary;
- full instructions;
- 5–15 minute suggested duration;
- scope (`song` or `section`).

Section-scoped guides ask which existing section should be used.

The generated practice block is created through the existing `songBlock()` path, then only its user-facing title, duration and instructions are specialized.

Therefore the block still carries:

- source song ID;
- source song-section ID when applicable;
- source song-part ID when applicable;
- owning practice profile;
- ordinary practice history behavior.

`Start guide` launches normal Focus Player practice.

`Add to Today` appends the same normal block to the current DailyPlan.

## Repertoire guide themes

Drums: role mapping, transition/downbeat return, dynamics, complete takes.

Guitar: texture mapping, contextual chord changes, continuous rhythm, complete takes.

Bass: anchor mapping, note length, kick relationship, complete takes.

Piano: accompaniment textures, voice-leading, chart reading, complete takes.

Voice: phrase/breath maps, entrances, harmony, bounded takes with symptom stop rules.

Custom: observable targets, contextual repair, complete takes, later-day checks.

## Persistence and backup

Phase 19 adds no new persistent store.

Database remains schema v11.

Backup envelope remains v4.

Static course teaching is shipped with the application and not duplicated into backups.

CourseProgress continues to store only personal learning records and course/lesson IDs/revisions.

## Content boundaries

Phase 19 does not:

- claim accreditation or examination equivalence;
- replace instrument-specific teaching;
- infer technique correctness from elapsed time;
- fabricate specialist Custom-instrument technique;
- auto-pass courses from placement checklists;
- auto-grade repertoire guides;
- change Practice Intelligence mastery from reading lesson text;
- copy commercial course lesson text, notation, recordings or song examples.

External sources remain coverage benchmarks only; teaching/examples are original.

## Certification

Release certification includes:

- exact 22-course / 118-lesson / 236-task catalog contract;
- complete lesson teaching/task/question/protocol validation;
- 4-stage principal-instrument ordering;
- 2-stage Custom ordering;
- browser course-card/lesson matrices for all six profile types;
- exact 170 principal-instrument exercise count;
- built-in reconciliation idempotence;
- preservation of edited existing built-ins;
- repertoire-guide content contract;
- browser guide launch preserving song/section provenance;
- full existing Chromium / Firefox / WebKit release regression matrix.
