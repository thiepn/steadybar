# MUSIC PRACTICE OS

## Complete One-Shot Autonomous Product + Engineering Prompt

You are responsible for building a complete, polished, production-quality **Music Practice OS** from start to finish in this repository.

This is an **implementation task**, not a planning exercise.

Your job is to leave behind a genuinely usable application that:

* installs successfully;
* runs successfully;
* builds successfully;
* works offline;
* persists user data reliably;
* works on desktop and mobile;
* has a reliable musical metronome;
* supports complete practice workflows;
* contains no placeholder functionality;
* contains no fake data presented as real user history;
* contains no dead controls;
* passes meaningful automated tests;
* has been visually inspected and corrected in a browser;
* feels like a deliberately designed real application rather than an AI-generated prototype.

Do not stop after planning, architecture, scaffolding, or partial implementation.

Continue autonomously through:

> inspect → design → implement → integrate → test → run → visually inspect → debug → polish → rebuild → verify

Do not ask for routine implementation approval.

When details are unspecified, make the most reasonable product and engineering decision yourself.

If the repository already contains useful code, inspect it first and preserve good work. Refactor or replace weak architecture where justified.

If the repository is empty or nearly empty, initialize the application yourself.

---

# 1. PRODUCT DEFINITION

Build a local-first web application called:

# **Music Practice OS**

Its purpose is to help musicians practice deliberately and improve systematically.

The core loop is:

```text
Plan
↓
Practice
↓
Measure
↓
Review
↓
Adapt
↓
Improve
```

The first release should be especially excellent for **drummers**, but the underlying data model should remain general enough to support guitar, piano, bass, vocals, and other instruments later.

Do not attempt to make every instrument equally specialized in V1.

Drumming should receive the richest built-in starter content.

---

# 2. PRODUCT PROBLEM

Musicians often:

* practice without a clear plan;
* repeat comfortable material rather than weaknesses;
* lose track of what they practiced;
* do not know whether tempo is actually improving;
* keep exercises, songs, notes, metronomes, setlists, and goals in different places;
* track practice time without tracking actual capability;
* have difficulty preparing efficiently for performances or worship sets;
* cannot easily see long-term progression.

Music Practice OS should unify those workflows.

It should answer:

### Before practice

> What should I practice today?

### During practice

> What am I working on, at what tempo, and for how long?

### After practice

> What actually improved?

### Over months

> Am I measurably becoming a better musician?

---

# 3. NON-NEGOTIABLE PRODUCT PRINCIPLES

## 3.1 Practice first

The application exists to facilitate actual music practice.

Configuration should never become the main activity.

A user should be able to begin meaningful practice within seconds.

---

## 3.2 Local-first

The core application must work offline.

No login.

No account.

No required backend.

No cloud dependency.

Use IndexedDB for durable application data.

---

## 3.3 Durable personal data

Practice history matters.

Treat it like permanent personal data.

Never silently discard or corrupt it.

Implement:

* schema versioning;
* migrations;
* backup;
* restore;
* validation;
* safe deletion semantics.

---

## 3.4 Low-friction practice UX

A musician may be holding drumsticks or an instrument.

During active practice:

* controls must be large;
* essential information must be obvious;
* unnecessary navigation disappears;
* common actions require minimal interaction;
* the interface must work well on a phone beside an instrument.

---

## 3.5 Quantify meaningful things

Measure:

* actual practice time;
* clean BPM;
* attempted BPM;
* successful repetitions;
* session frequency;
* exercise progression;
* practice distribution;
* song preparation;
* goal progression.

Do not invent meaningless scores merely to populate charts.

---

## 3.6 No manipulative gamification

Do not build:

* XP;
* coins;
* loot;
* public streak pressure;
* leaderboards;
* social comparison;
* arbitrary levels.

A small practice streak can exist as secondary information, but it must not dominate the experience.

---

## 3.7 Progressive complexity

A beginner must be able to:

1. open an exercise;
2. set 80 BPM;
3. practice for 10 minutes;
4. record the result.

Advanced features should exist without making that workflow confusing.

---

# 4. STRICT V1 SCOPE

The application must ship the following systems completely.

## P0 — REQUIRED

1. Application shell
2. Responsive desktop/mobile navigation
3. Light/dark/system themes
4. IndexedDB persistence
5. Schema migrations
6. Backup/export
7. Restore/import
8. Offline-capable PWA
9. Today dashboard
10. Daily practice planning
11. Accurate Web Audio metronome
12. Tap tempo
13. Subdivisions
14. Time signatures
15. Accent patterns
16. Count-in
17. Metronome presets
18. Exercise library
19. Built-in drum rudiments
20. Exercise detail pages
21. Tempo progression history
22. Tempo trainer
23. Practice sessions
24. Multi-block sessions
25. Session timer
26. Pause/resume
27. Skip/restart block
28. Notes
29. Attempt ratings
30. Clean-BPM tracking
31. Focus Mode
32. Reusable practice routines
33. Song library
34. Song sections
35. Song practice
36. Setlists
37. Setlist-to-routine preparation
38. Goals
39. Practice history
40. Progress analytics
41. Global search / command palette
42. Settings
43. Keyboard shortcuts
44. Screen Wake Lock where supported
45. Good empty/error states
46. Accessibility
47. Automated testing
48. Production build
49. Browser-based visual QA
50. Final cleanup

Every visible P0 feature must work end-to-end.

---

# 5. EXPLICITLY OUT OF SCOPE FOR THIS RELEASE

Do **not** implement these during this one-shot run:

* AI chatbot;
* LLM recommendations;
* cloud synchronization;
* user authentication;
* accounts;
* social profiles;
* followers;
* social feed;
* multiplayer;
* teacher/student collaboration;
* MIDI input;
* microphone timing detection;
* onset detection;
* latency calibration;
* automated drum-hit analysis;
* full sheet-music editor;
* DAW functionality;
* backing-track editor;
* streaming integrations;
* Spotify integration;
* Apple Music integration;
* automatic copyrighted song content;
* public leaderboards.

Architect cleanly enough that some can be added later.

Do not build placeholder interfaces for them.

If a feature is not implemented, it should not appear in navigation.

---

# 6. TECHNOLOGY STACK

Unless the existing repository has an equivalently strong compatible stack, use:

```text
React
TypeScript
Vite
React Router
Dexie / IndexedDB
Zustand for limited ephemeral/session state where useful
Zod for validation
date-fns
Lucide icons
Recharts for analytics
vite-plugin-pwa
Vitest
React Testing Library
Playwright
Web Audio API
Screen Wake Lock API where supported
```

Use current mutually compatible stable versions.

Do not introduce a backend.

Do not introduce unnecessary heavy dependencies.

Use strict TypeScript.

Avoid `any` unless genuinely unavoidable.

---

# 7. APPLICATION ARCHITECTURE

Organize by domain rather than placing all logic inside page components.

A reasonable structure is:

```text
src/
  app/
    router/
    layout/
    providers/

  components/
    ui/
    forms/
    feedback/

  db/
    schema/
    migrations/
    repositories/
    backup/

  audio/
    engine/
    metronome/
    scheduler/
    sounds/

  practice/
    components/
    logic/
    hooks/
    pages/

  exercises/
    components/
    logic/
    pages/
    data/

  routines/
    components/
    pages/
    logic/

  songs/
    components/
    pages/
    logic/

  setlists/
    components/
    pages/
    logic/

  goals/
    components/
    pages/
    logic/

  analytics/
    calculations/
    charts/
    pages/

  history/
    pages/

  planning/
    pages/
    logic/

  search/
    components/
    logic/

  settings/
    pages/

  shared/
    types/
    utils/
    constants/

  styles/
```

This is guidance, not an immutable folder requirement.

The important requirement is clear separation of:

* UI;
* domain logic;
* persistence;
* audio timing;
* analytics calculations.

---

# 8. ROUTES

Use approximately:

```text
/                       Today
/practice               Practice launcher
/practice/active        Active Practice / Focus Mode
/metronome              Standalone metronome
/library                Exercise library
/library/:exerciseId    Exercise detail
/routines               Routine library
/routines/:routineId    Routine editor/detail
/songs                   Song library
/songs/:songId           Song detail
/setlists                Setlists
/setlists/:setlistId     Setlist detail
/goals                   Goals
/progress                Progress analytics
/history                 Practice history
/settings                Settings
```

Do not create unnecessary route fragmentation.

---

# 9. MAIN NAVIGATION

Desktop navigation should expose:

```text
Today
Practice
Metronome
Library
Routines
Songs
Setlists
Goals
Progress
History
Settings
```

Mobile should use a compact navigation model.

Do not attempt to fit ten permanent bottom-navigation buttons.

Use approximately:

```text
Today
Practice
Library
Progress
More
```

with secondary sections accessible through More or contextual navigation.

Active Practice should largely hide global navigation.

---

# 10. DATA MODEL

Create explicit TypeScript domain models.

Use durable unique IDs, preferably UUIDs.

Use ISO timestamps for persisted dates.

---

## 10.1 Exercise

```ts
interface Exercise {
  id: string;
  name: string;
  instrument: string;

  category:
    | "rudiment"
    | "technique"
    | "groove"
    | "coordination"
    | "warmup"
    | "timing"
    | "other";

  description?: string;
  instructions?: string;

  sticking?: string;
  accents?: string;

  defaultBpm?: number;
  targetBpm?: number;
  minBpm?: number;
  maxBpm?: number;

  timeSignature?: {
    beats: number;
    beatUnit: number;
  };

  subdivision?: Subdivision;

  tags: string[];
  notes?: string;

  builtin: boolean;
  archived: boolean;

  createdAt: string;
  updatedAt: string;
}
```

---

## 10.2 Song

```ts
interface Song {
  id: string;
  title: string;
  artist?: string;

  bpm?: number;

  timeSignature?: {
    beats: number;
    beatUnit: number;
  };

  key?: string;

  difficulty?: 1 | 2 | 3 | 4 | 5;

  status:
    | "learning"
    | "practicing"
    | "performance-ready"
    | "archived";

  notes?: string;

  sections: SongSection[];

  createdAt: string;
  updatedAt: string;
}
```

---

## 10.3 SongSection

```ts
interface SongSection {
  id: string;
  name: string;

  bars?: number;

  bpmOverride?: number;

  notes?: string;

  order: number;
}
```

Song sections might be:

```text
Intro
Verse 1
Chorus
Verse 2
Bridge
Final Chorus
Outro
```

Do not include copyrighted lyrics.

---

## 10.4 Routine

```ts
interface Routine {
  id: string;
  name: string;
  description?: string;

  blocks: RoutineBlock[];

  scheduledDays?: number[];

  tags: string[];

  builtin: boolean;
  archived: boolean;

  createdAt: string;
  updatedAt: string;
}
```

---

## 10.5 RoutineBlock

```ts
interface RoutineBlock {
  id: string;

  type:
    | "exercise"
    | "song"
    | "song-section"
    | "free";

  exerciseId?: string;
  songId?: string;
  songSectionId?: string;

  title?: string;

  targetSeconds: number;

  bpm?: number;

  notes?: string;

  tempoTrainer?: TempoTrainerConfig;

  order: number;
}
```

---

# 11. DAILY PRACTICE PLAN

Create a persisted daily plan.

```ts
interface DailyPlan {
  id: string;
  date: string;

  sourceRoutineId?: string;

  blocks: PlannedPracticeBlock[];

  createdAt: string;
  updatedAt: string;
}
```

Users should be able to:

* generate today's plan from a routine;
* manually add blocks;
* remove blocks;
* reorder blocks;
* adjust duration;
* adjust BPM;
* start the entire plan;
* start one block directly.

Today should show the current plan prominently.

---

# 12. PRACTICE SESSION MODEL

```ts
interface PracticeSession {
  id: string;

  status:
    | "active"
    | "completed"
    | "abandoned";

  startedAt: string;
  endedAt?: string;

  activeBlockIndex: number;

  blocks: PracticeBlock[];

  sessionNotes?: string;
  sessionRating?: 1 | 2 | 3 | 4 | 5;

  sourceRoutineId?: string;
  sourceDailyPlanId?: string;

  createdAt: string;
  updatedAt: string;
}
```

---

## 12.1 PracticeBlock

Historical blocks must retain snapshots.

Do **not** depend solely on current Exercise or Song entities.

```ts
interface PracticeBlock {
  id: string;

  type:
    | "exercise"
    | "song"
    | "song-section"
    | "free";

  sourceExerciseId?: string;
  sourceSongId?: string;
  sourceSongSectionId?: string;

  titleSnapshot: string;
  categorySnapshot?: string;

  targetSeconds: number;
  actualActiveSeconds: number;

  initialBpm?: number;
  finalBpm?: number;

  tempoAttempts: TempoAttempt[];

  notes?: string;

  startedAt?: string;
  endedAt?: string;

  completed: boolean;
  skipped: boolean;
}
```

If an exercise or song is later renamed or deleted, historical sessions must still be understandable.

---

# 13. TEMPO ATTEMPTS

```ts
type AttemptRating =
  | "failed"
  | "messy"
  | "acceptable"
  | "clean"
  | "effortless";

interface TempoAttempt {
  id: string;

  bpm: number;

  rating: AttemptRating;

  timestamp: string;

  durationSeconds?: number;

  note?: string;
}
```

---

# 14. BPM BUSINESS RULES

Implement these definitions consistently everywhere.

## Highest attempted BPM

```text
max BPM of all recorded TempoAttempts
```

---

## Best clean BPM

```text
maximum BPM where rating is:
clean OR effortless
```

---

## Latest successful BPM

The BPM of the most recent attempt rated:

```text
acceptable
clean
effortless
```

---

## Failed attempts

`failed` and `messy` must never raise Best Clean BPM.

---

## Exercise current progression

The primary displayed progression should use:

```text
Best Clean BPM
```

not highest attempted BPM.

---

# 15. GOALS

Use:

```ts
type GoalType =
  | "bpm"
  | "weekly-sessions"
  | "song-mastery"
  | "custom";

interface Goal {
  id: string;

  type: GoalType;

  title: string;
  description?: string;

  exerciseId?: string;
  songId?: string;

  targetValue?: number;
  unit?: string;

  deadline?: string;

  completed: boolean;
  completedAt?: string;

  createdAt: string;
  updatedAt: string;
}
```

---

## BPM goal

Example:

```text
Double Stroke Roll
Target: clean 120 BPM
Current: 108 BPM
```

The current value must derive automatically from Best Clean BPM.

---

## Weekly-session goal

Example:

```text
Practice 4 times per week
```

Compute from completed sessions in the current ISO week.

---

## Song-mastery goal

Connect to song status:

```text
learning
→ practicing
→ performance-ready
```

---

## Custom goal

Allow manual completion.

---

# 16. SETLIST

```ts
interface Setlist {
  id: string;

  name: string;
  date?: string;

  songIds: string[];

  notes?: string;

  createdAt: string;
  updatedAt: string;
}
```

Allow drag-and-drop/reordering.

A setlist should show for each song:

* title;
* artist;
* BPM;
* time signature;
* status;
* last practiced date.

Do not create a fake 0–100 readiness score.

---

# 17. SETLIST PREPARATION

A user should be able to choose:

> Generate Practice Routine

from a setlist.

Generate practice blocks from all songs.

Allow the user to choose:

* entire songs;
* selected sections;
* approximate duration.

The generated routine becomes a normal editable routine.

---

# 18. DATABASE

Use Dexie backed by IndexedDB.

Create explicit database versioning.

Initial stores should include approximately:

```text
exercises
songs
routines
dailyPlans
sessions
goals
setlists
settings
metronomePresets
```

Use application-layer validation and safe transactional writes.

---

# 19. DATABASE MIGRATIONS

Do not create an unversioned schema.

Implement a migration architecture from the beginning.

Example:

```text
DB v1
```

Future upgrades should have a clear location and pattern for:

```text
v1 → v2
v2 → v3
```

Even if only v1 exists now.

---

# 20. DELETION SEMANTICS

Handle deletion deliberately.

## Exercises

Deleting an exercise:

* removes/archive the library object;
* must not corrupt historical PracticeBlocks;
* historical snapshot names remain.

Prefer archive where accidental destruction would be undesirable.

---

## Songs

Same principle.

Historical sessions retain snapshots.

---

## Routines

Can be deleted without affecting sessions previously generated from them.

---

## Setlists

Can be deleted without deleting Songs.

---

## Goals

Deleting a goal must not modify historical practice data.

---

# 21. BACKUP FORMAT

Create a complete backup export.

Use a versioned format similar to:

```json
{
  "format": "music-practice-os",
  "version": 1,
  "exportedAt": "2026-09-08T12:00:00.000Z",
  "data": {
    "exercises": [],
    "songs": [],
    "routines": [],
    "dailyPlans": [],
    "sessions": [],
    "goals": [],
    "setlists": [],
    "metronomePresets": [],
    "settings": {}
  }
}
```

File naming:

```text
music-practice-os-backup-YYYY-MM-DD.json
```

---

# 22. RESTORE

Restore must:

1. parse JSON;
2. validate format;
3. validate version;
4. validate major entities;
5. reject clearly malformed files;
6. present a meaningful error;
7. avoid corrupting existing data;
8. restore transactionally where possible.

Provide two modes if straightforward:

```text
Replace existing data
Merge imported data
```

If merge introduces excessive complexity, implement **Replace** reliably and omit Merge.

Reliable replacement is better than fragile merging.

---

# 23. TODAY SCREEN

The default route should answer:

> What should I practice today?

The hierarchy should approximately be:

### Today's Plan

Example:

```text
TODAY
58 MIN

Warm-up
Single Stroke Roll
10 min · 90 BPM

Technique
Double Stroke Roll
12 min · 105 BPM

Groove
Ghost-note groove
12 min · 80 BPM

Song
Sunday Song A
20 min · 72 BPM

Free Practice
4 min
```

Each block should allow:

* start;
* edit duration;
* adjust BPM;
* remove.

Provide:

```text
Start Full Session
```

---

## Quick Start

Provide shortcuts:

```text
Metronome
Free Practice
Rudiments
Routine
Song
```

---

## Goals

Show at most a few active relevant goals.

---

## Recent Activity

Show several recent sessions.

Do not create an enormous activity feed.

---

# 24. PRACTICE LAUNCHER

The `/practice` route should make it easy to start:

* today's plan;
* a saved routine;
* an exercise;
* a song;
* free practice.

The user should not have to configure a session from scratch every time.

---

# 25. ACTIVE PRACTICE MODE

This is the single most important application screen.

It must feel excellent.

During an exercise block show approximately:

```text
DOUBLE STROKE ROLL

RRLL RRLL RRLL RRLL

105 BPM

07:42 / 12:00

[ −5 ] [ −1 ]   [ 105 ]   [ +1 ] [ +5 ]

Metronome: ● Running

[ Pause ]

Attempt
[Failed] [Messy] [Acceptable] [Clean] [Effortless]

+ Quick Note

Next
Paradiddle · 10 min
```

Essential controls:

* Start/Pause/Resume
* Finish Block
* Skip Block
* Restart Block
* BPM −5
* BPM −1
* BPM +1
* BPM +5
* metronome on/off
* attempt rating
* quick note

Do not require scrolling for the most critical controls at common mobile viewport sizes.

---

# 26. SESSION TIMER IMPLEMENTATION

Do not implement timers by simply incrementing a number each second.

Persist timestamps and calculate elapsed duration from actual time.

Pause logic must exclude paused duration.

This prevents major drift if:

* the browser throttles;
* the user switches tabs;
* frames are dropped.

Persist meaningful active-session transitions.

If the application reloads while a session is active, detect it and offer:

```text
Resume Session
End Session
Discard Session
```

Never silently lose an active session.

---

# 27. FOCUS MODE

Provide a full-screen Focus Mode optimized for practicing beside an instrument.

Hide nearly all application chrome.

Desktop/tablet/mobile example:

```text
DOUBLE STROKE ROLL

RRLL RRLL RRLL RRLL

          108
           BPM

         08:31

 [ −5 ] [ −1 ] [ +1 ] [ +5 ]

       [ PAUSE ]

Clean   + Note

Next:
Paradiddle
```

Important:

* current exercise obvious;
* BPM visually dominant;
* timer clear;
* pause immediately reachable;
* controls large;
* next block visible but secondary.

Provide a clear way to exit Focus Mode.

---

# 28. SCREEN WAKE LOCK

When Practice Mode is active, attempt to use the Screen Wake Lock API when supported.

Handle unsupported browsers gracefully.

Do not cause errors if permission/support is absent.

Release wake lock when appropriate.

Restore if possible after returning to foreground.

---

# 29. METRONOME — CORE QUALITY REQUIREMENT

The metronome must be technically correct.

Do **not** use `setInterval()` or React rendering as the authoritative audio clock.

Use the Web Audio API.

Use:

```text
AudioContext.currentTime
```

as the authoritative clock.

Implement ahead-of-time scheduling.

A reasonable pattern:

```text
scheduler wakes roughly every 25 ms
schedules audio roughly 100 ms ahead
```

Exact values may be tuned.

Audio events themselves must be scheduled on the Web Audio timeline.

UI animation may use normal rendering timing, but visual timing must not control audio.

---

# 30. METRONOME SOUND

Do not depend on external network audio assets.

Create a clean, pleasant percussive metronome click using Web Audio.

Use a distinct accent sound.

The click should:

* have a fast attack;
* short decay;
* be audible but not harsh;
* work through laptop/phone speakers.

Allow:

```text
Metronome Volume
```

Persist volume settings.

---

# 31. BPM RANGE

Support approximately:

```text
20–300 BPM
```

Validate input.

Controls:

```text
−10
−5
−1
BPM
+1
+5
+10
```

The standalone metronome may expose all.

Active Practice can use fewer controls.

---

# 32. TAP TEMPO

Implement reliable tap tempo.

Use multiple recent tap intervals.

Reject/reset old taps after a reasonable inactivity period.

Prefer a robust average/median rather than deriving BPM from a single interval.

Displayed BPM should stabilize naturally after several taps.

---

# 33. TIME SIGNATURES

Support at minimum:

```text
2/4
3/4
4/4
5/4
6/8
7/8
9/8
12/8
```

Also allow a simple custom meter if this can be implemented cleanly.

Do not compromise core functionality for custom meter complexity.

---

# 34. SUBDIVISIONS

Support:

```text
Quarter notes
Eighth notes
Triplets
Sixteenth notes
```

Subdivisions must remain phase-aligned with the beat.

---

# 35. ACCENT PATTERN

Allow beats in a bar to be:

```text
Accent
Normal
Muted
```

Example in 4/4:

```text
ACCENT normal normal normal
```

Changing meter should produce a sensible default accent pattern.

---

# 36. COUNT-IN

Support:

```text
None
1 bar
2 bars
4 bars
```

Count-in should precede the practice timer if launched as part of a session.

---

# 37. METRONOME PRESETS

Allow saving presets containing:

```text
Name
BPM
Meter
Subdivision
Accent Pattern
Count-in
```

Example:

```text
Worship 6/8
72 BPM
6/8
Eighth notes
```

---

# 38. TEMPO TRAINER

Tempo Trainer is a major feature.

Implement the following modes.

---

## 38.1 Progressive

Example:

```text
Start       80 BPM
Step         5 BPM
Every      120 sec
Maximum     120 BPM
```

Behavior:

```text
80 → 85 → 90 → ... → 120
```

At maximum, remain at maximum.

Do not wrap.

Pause freezes the stage timer.

---

## 38.2 Repetition

Example:

```text
Start          80 BPM
Increase        5 BPM
After     3 clean rounds
Maximum        120 BPM
```

The user manually records attempts.

Once the configured number of qualifying attempts occurs, increase BPM.

Qualifying ratings:

```text
clean
effortless
```

---

## 38.3 Ladder

Example:

```text
80
90
100
110
100
90
80
```

Allow a stage duration.

---

## 38.4 Endurance

One BPM for a target duration.

Example:

```text
110 BPM
10 minutes
```

---

# 39. TEMPO TRAINER CONFIG

Use a discriminated union or similarly safe model.

For example:

```ts
type TempoTrainerConfig =
  | ProgressiveTempoConfig
  | RepetitionTempoConfig
  | LadderTempoConfig
  | EnduranceTempoConfig;
```

Do not build one enormous loosely typed configuration object.

---

# 40. EXERCISE LIBRARY

Library views should support:

* list/grid toggle if useful;
* search;
* category filter;
* tags;
* sort;
* built-in vs user-created;
* archived filtering.

Do not overcomplicate.

---

# 41. EXERCISE DETAIL PAGE

Show:

```text
DOUBLE STROKE ROLL

RRLL RRLL RRLL RRLL

Best Clean
108 BPM

Target
120 BPM

Highest Attempted
115 BPM

Last Practiced
2 days ago

Practice Time
2h 14m
```

Then:

* Start Practice
* Start Tempo Trainer
* Edit
* history
* progression chart
* recent notes

---

# 42. BUILT-IN DRUM RUDIMENTS

Seed at least these:

1. Single Stroke Roll
2. Double Stroke Roll
3. Single Paradiddle
4. Double Paradiddle
5. Triple Paradiddle
6. Paradiddle-Diddle
7. Flam
8. Flam Accent
9. Flam Tap
10. Flam Paradiddle
11. Drag
12. Single Drag Tap
13. Double Drag Tap
14. Five Stroke Roll
15. Six Stroke Roll
16. Seven Stroke Roll
17. Nine Stroke Roll
18. Ten Stroke Roll
19. Eleven Stroke Roll
20. Thirteen Stroke Roll
21. Seventeen Stroke Roll

Use reasonable sticking representations.

Examples:

```text
Single Stroke Roll
RLRL RLRL

Double Stroke Roll
RRLL RRLL

Single Paradiddle
RLRR LRLL

Double Paradiddle
RLRLRR LRLRLL

Paradiddle-Diddle
RLRRLL LRLLRR
```

Do not include copyrighted educational text.

Write concise original descriptions.

---

# 43. STARTER EXERCISES

Include several additional generic drum exercises, for example:

```text
8th-Note Groove Builder
16th-Note Groove Builder
Ghost Note Control
Hi-Hat Dynamics
Kick Independence
Linear Coordination
Accent Grid
Left-Hand Lead
```

These should demonstrate categories and features.

The user can delete/archive sample content.

---

# 44. ROUTINES

Users must be able to:

* create;
* rename;
* describe;
* add blocks;
* remove blocks;
* reorder blocks;
* duplicate routine;
* archive;
* assign optional weekdays;
* calculate total planned duration;
* start routine immediately;
* copy routine into today's plan.

Use intuitive drag/reorder interactions.

Provide keyboard-accessible alternatives where needed.

---

# 45. BUILT-IN ROUTINE TEMPLATES

Seed:

### 20-Minute Technique

```text
Warm-up               5 min
Single Strokes        5 min
Double Strokes        5 min
Paradiddle            5 min
```

### 30-Minute Drum Practice

```text
Warm-up               5 min
Technique            10 min
Groove               10 min
Free Practice         5 min
```

### 45-Minute General Drum Practice

```text
Warm-up               5 min
Rudiments            10 min
Technique            10 min
Groove               10 min
Song                  10 min
```

### 60-Minute Worship Preparation

```text
Warm-up              10 min
Technique            10 min
Song 1               15 min
Song 2               15 min
Transitions          10 min
```

Song placeholders inside templates should be replaceable selections rather than referencing nonexistent hard-coded song records.

---

# 46. SONG LIBRARY

Users can:

* create song;
* edit metadata;
* archive song;
* define BPM;
* meter;
* key;
* difficulty;
* status;
* notes;
* sections.

Do not fetch copyrighted lyrics.

---

# 47. SONG DETAIL

Example:

```text
SONG TITLE
Artist

72 BPM · 4/4 · Key G

Status
Practicing

Sections

Intro        8 bars
Verse       16 bars
Chorus       8 bars
Bridge      16 bars
Outro        8 bars
```

Allow notes on sections.

Example:

```text
Bridge
Open hi-hat slightly in second half.

Final Chorus
Move to ride.
```

---

# 48. SONG PRACTICE

Support:

```text
Practice entire song
Practice section
Practice transition
```

A section practice block should retain:

```text
Song title snapshot
Section name snapshot
BPM
Duration
Notes
```

---

# 49. SETLISTS

Allow:

* create;
* date;
* title;
* notes;
* add songs;
* remove;
* reorder;
* open song;
* generate practice routine.

Example:

```text
Sunday Worship — Sep 13

1. Song A    72 BPM · 4/4
2. Song B    68 BPM · 6/8
3. Song C   118 BPM · 4/4
```

Do not include actual copyrighted song data by default.

---

# 50. PRACTICE HISTORY

Provide a chronological history.

Each entry:

```text
SEP 8
58 min

Warm-up             10m
Double Stroke Roll  12m
Paradiddle           8m
Song A               22m
Free Practice         6m
```

Click opens full session details:

* start/end;
* total active time;
* blocks;
* BPM;
* attempts;
* ratings;
* notes.

Allow reasonable editing of session notes and metadata.

Avoid editing historical timing records in ways that compromise integrity unless explicitly chosen by user.

---

# 51. SESSION REVIEW

At session completion show a lightweight review.

Example:

```text
SESSION COMPLETE

58 min
5 blocks

Double Stroke Roll
New best clean tempo: 110 BPM

Paradiddle
105 BPM clean

Session rating
1 2 3 4 5

Notes
____________________
```

Keep review fast.

A user should be able to finish it in under 30 seconds.

---

# 52. PROGRESS ANALYTICS

Analytics must be based on actual session data.

Do not generate decorative charts without a real use.

Support date ranges:

```text
7 days
30 days
3 months
1 year
All time
Custom
```

---

# 53. PRACTICE TIME

Show:

* total active practice time;
* average session length;
* sessions count;
* active days.

Break down by:

```text
Technique
Rudiments
Groove
Songs
Warm-up
Timing
Other
```

Use actual block duration.

Do not include paused time.

---

# 54. PRACTICE DISTRIBUTION

Example:

```text
Technique       31%
Songs           29%
Groove          18%
Rudiments       14%
Other            8%
```

Percentages must sum correctly apart from rounding.

---

# 55. TEMPO PROGRESSION

For tempo-based exercises display:

```text
Best Clean BPM over time
```

Optionally also show:

```text
Highest Attempted BPM
```

Do not mix them into one ambiguous metric.

---

# 56. GOAL PROGRESS

Show meaningful calculations.

Examples:

```text
Double Stroke Roll

108 / 120 BPM
90%
```

For a BPM goal, simple progress percentage can be shown if it is clearly labeled.

Do not imply that 90% BPM means 90% mastery.

---

# 57. CONSISTENCY

Show:

```text
Sessions this week
Active days
Average sessions/week
```

A streak may be shown quietly.

Do not make streak preservation the central product behavior.

---

# 58. SEARCH + COMMAND PALETTE

Use:

```text
Ctrl/Cmd + K
```

Search:

* exercises;
* songs;
* routines;
* setlists;
* goals.

Commands:

```text
Start Practice
Open Metronome
New Exercise
New Routine
New Song
New Setlist
Open Progress
Open Settings
Export Backup
```

Keyboard interactions must be accessible.

---

# 59. KEYBOARD SHORTCUTS

Where focus is not inside an input:

```text
Space        start/pause metronome or active practice
↑            BPM +1
↓            BPM -1
Shift+↑      BPM +5
Shift+↓      BPM -5
N            quick note during practice
Esc          exit Focus Mode / close modal
```

Do not interfere with normal browser shortcuts.

Display available shortcuts in Settings or help.

---

# 60. SETTINGS

Include:

### Appearance

```text
System
Light
Dark
```

### Metronome

```text
Volume
Default BPM
Default Meter
Default Subdivision
Count-in
```

### Practice

```text
Auto-enable Wake Lock
Default Focus Mode behavior
```

### Data

```text
Export Backup
Restore Backup
Reset Application
```

Reset must require explicit confirmation.

---

# 61. VISUAL DESIGN DIRECTION

The application should look like a serious dedicated music tool, not a generic admin dashboard.

Desired characteristics:

```text
precise
focused
quiet
modern
musical
technical
high quality
dense where useful
spacious where interaction requires it
```

Avoid:

* large hero banners inside app;
* glassmorphism everywhere;
* gradients everywhere;
* dozens of disconnected cards;
* excessive border radii;
* random colored icons;
* cartoon gamification;
* fake waveform decoration;
* giant music-note graphics.

Use musical character subtly through:

* rhythm;
* spacing;
* timing indicators;
* repeated visual structures;
* controlled motion.

---

# 62. DESIGN SYSTEM

Create reusable tokens for:

```text
backgrounds
surfaces
text
muted text
borders
accent
danger
success
warning
focus
```

Use one restrained primary accent.

Do not use many competing accent colors.

Use semantic colors only when meaning requires them.

---

# 63. TYPOGRAPHY

Use a highly readable UI typeface.

Numbers such as:

```text
BPM
timer
statistics
```

should use tabular numerals where appropriate to prevent layout shifting.

BPM displays should be extremely legible.

---

# 64. SPACING + SURFACES

Avoid wrapping every small piece of information in a card.

Use:

* sections;
* dividers;
* lists;
* tables;
* panels;
* whitespace.

Cards should represent meaningful grouped objects.

---

# 65. DARK MODE

Dark mode matters because musicians often practice in dim rooms.

Ensure:

* excellent contrast;
* no pure-black overload;
* no muddy text;
* metronome indicators remain clear;
* charts remain readable.

Use CSS variables/theme tokens.

---

# 66. MOTION

Use restrained motion for:

* metronome pulse;
* block transitions;
* modal/dialog transitions;
* progress updates.

Do not use animation as decoration.

Respect:

```css
prefers-reduced-motion
```

Audio timing must never depend on UI animation.

---

# 67. DESKTOP UX

Target common desktop dimensions including:

```text
1440 × 900
1920 × 1080
```

Use screen space efficiently.

A sidebar is appropriate.

Avoid excessive maximum-width constraints that make the application look like a narrow website on a large monitor.

---

# 68. MOBILE UX

Explicitly QA at approximately:

```text
360 × 800
390 × 844
430 × 932
```

Also test tablet.

On mobile active practice, prioritize:

```text
Exercise
Sticking
BPM
Timer
Tempo controls
Pause/Resume
Attempt rating
```

Do not require precision taps.

Minimum touch targets should be appropriately sized.

Avoid horizontal overflow.

---

# 69. ACTIVE PRACTICE MOBILE REQUIREMENT

At approximately 390 × 844, the user should ideally see without major scrolling:

```text
exercise name
sticking
BPM
timer
−5
−1
+1
+5
pause/resume
```

Attempt rating may sit immediately beneath.

Focus Mode may simplify further.

---

# 70. ACCESSIBILITY

Target strong WCAG-compatible behavior.

Requirements:

* semantic HTML;
* keyboard navigation;
* visible focus styles;
* accessible labels;
* correct button semantics;
* dialog focus management;
* sufficient contrast;
* reduced motion support;
* non-color-only status communication;
* appropriately sized touch targets.

Do not create div-based pseudo-buttons.

---

# 71. ERROR UX

Handle errors intentionally.

Examples:

### IndexedDB unavailable

Explain that data cannot be saved.

### Backup invalid

Explain why import failed.

### Audio unavailable

Provide recovery action.

### AudioContext blocked

Ask user to tap/click to activate audio.

### Wake Lock unsupported

Fail silently or show subtle informational state.

Never crash the application because an optional browser API is unsupported.

---

# 72. EMPTY STATES

Useful examples:

```text
No practice history yet.

Start your first session and your progress will appear here.

[Start Practice]
```

```text
No songs yet.

Add songs you are currently preparing.

[Add Song]
```

Every empty state should tell the user what the next action is.

---

# 73. PWA

Make the app installable where supported.

Implement:

* web manifest;
* application icons;
* theme colors;
* standalone display;
* service worker;
* offline application shell;
* offline seed data;
* safe update behavior.

Core features must function without internet after application installation/cache.

Do not cache external resources that the application does not need.

---

# 74. APP ICON

Create a simple original application icon if none exists.

Avoid literal complex artwork.

Use a clean abstract combination suggestive of:

```text
rhythm
pulse
practice
timing
```

Ensure it works at small sizes.

Provide appropriate PWA icon sizes/formats if tooling permits.

Do not spend disproportionate implementation time on branding.

---

# 75. PERFORMANCE

The app should feel immediate.

Targets:

* fast initial load;
* immediate local navigation;
* efficient IndexedDB queries;
* no unnecessary rerendering of the audio system;
* analytics not blocking practice UI;
* thousands of historical sessions remain usable.

Lazy-load chart-heavy pages if beneficial.

---

# 76. AUDIO ARCHITECTURE

Keep audio scheduling independent from React rendering.

Use an `AudioEngine` / metronome service or equivalent.

React components should issue commands to the audio engine.

They should not individually create unmanaged AudioContexts.

Have one controlled audio subsystem.

Handle cleanup correctly.

---

# 77. METRONOME LONG-RUN STABILITY

Test or reason carefully about:

* tempo changes while playing;
* meter changes;
* subdivision changes;
* accents;
* pausing;
* resuming;
* navigating away;
* starting again;
* long-running timing.

Prevent duplicate schedulers.

Ensure navigating between Metronome and Practice does not leave multiple clicks playing.

---

# 78. ACTIVE SESSION STATE

Persist enough active-session state that a browser reload does not destroy work.

Avoid writing to IndexedDB every animation frame.

Persist on meaningful changes such as:

* block start;
* pause;
* resume;
* BPM change;
* rating;
* note;
* block complete;
* session complete.

Use sensible debouncing for text notes.

---

# 79. ANALYTICS IMPLEMENTATION

Place calculations in pure testable functions.

Do not compute complex analytics directly inside chart components.

Examples:

```text
calculateTotalPracticeTime()
calculatePracticeDistribution()
calculateBestCleanBpm()
calculateHighestAttemptedBpm()
calculateWeeklySessionCount()
calculateAverageSessionLength()
buildTempoProgressionSeries()
```

These functions must have unit tests.

---

# 80. DATE/TIME RULES

Use local user dates for grouping sessions by day/week.

Store timestamps in ISO format.

Avoid timezone bugs caused by treating date-only values as UTC midnight unintentionally.

Daily plans should use a clear local-date format such as:

```text
YYYY-MM-DD
```

---

# 81. DEMO / STARTER DATA

The application should not feel completely empty on first launch.

Seed built-in:

* rudiments;
* generic exercises;
* routine templates.

Do **not** seed fake practice history.

Do **not** show fabricated analytics.

Until the user practices, analytics should show an honest empty state.

---

# 82. ONBOARDING

Keep onboarding short.

First launch:

### Step 1

```text
What do you play?

Drums
Guitar
Piano
Bass
Vocals
Other
```

Default experience is optimized for drums.

### Step 2

```text
What do you mainly want to improve?

Technique
Timing
Speed
Songs
Consistency
General Practice
```

### Step 3

Offer:

```text
Use Starter Routine
Explore First
```

Do not build a ten-screen questionnaire.

Store onboarding completion.

---

# 83. QUICK NOTES

During practice, `+ Note` should allow extremely fast capture.

Examples:

```text
Left hand gets tense above 105.
```

```text
Practice bridge-to-chorus transition tomorrow.
```

Notes should be stored with the relevant block/session.

Do not require navigating to another page.

---

# 84. PRACTICE SESSION TRANSITIONS

When a block finishes:

1. save block;
2. show a very short completion state;
3. indicate next block;
4. allow Start Next;
5. optionally automatically transition only if user setting permits.

Do not surprise the user by immediately starting audio for the next block.

---

# 85. PRACTICE PLAN UX

Today plan editing should support drag/reorder.

Each block should have concise editable controls.

Do not require a full modal for changing a 10-minute block to 12 minutes unless necessary.

---

# 86. FORMS

All create/edit forms need:

* validation;
* useful defaults;
* cancel;
* save;
* unsaved-change handling where appropriate.

Do not silently discard edits.

Use Zod or equivalent for important data validation.

---

# 87. CONFIRMATION UX

Confirmation required for destructive actions such as:

* reset entire application;
* replace database from backup;
* permanently delete important custom content.

Do not require confirmation for:

* starting practice;
* marking an attempt;
* changing BPM;
* normal navigation.

---

# 88. TESTING — UNIT

Write meaningful unit tests for at least:

* Best Clean BPM;
* Highest Attempted BPM;
* latest successful BPM;
* weekly session counting;
* total active practice duration;
* distribution percentages;
* tempo progression;
* routine duration;
* backup validation;
* data migrations;
* tempo trainer progression logic.

---

# 89. TESTING — INTEGRATION

Test important domain workflows:

### Exercise

```text
Create exercise
→ save
→ retrieve
→ update
→ archive
```

### Routine

```text
Create routine
→ add blocks
→ reorder
→ persist
```

### Practice

```text
Start session
→ change BPM
→ add attempt
→ complete block
→ finish session
→ verify history
```

### Backup

```text
Export
→ validate
→ import
→ verify equivalent important data
```

---

# 90. TESTING — E2E

Use Playwright for the most important user journey.

At minimum automate:

```text
Open application
→ finish onboarding
→ open Double Stroke Roll
→ set target BPM to 120
→ add/practice exercise
→ start session
→ record 105 BPM as Clean
→ finish session
→ open Progress
→ verify Best Clean BPM = 105
→ reload
→ verify data remains
```

If audio itself cannot be meaningfully asserted through browser automation, test controls/state and separately unit-test scheduler logic.

---

# 91. DETERMINISTIC ANALYTICS TEST DATA

Create automated tests using this controlled dataset.

### Session A

```text
Technique
20 active minutes
Exercise X
100 BPM
Clean
```

### Session B

```text
Song
30 active minutes
```

### Session C

```text
Technique
10 active minutes

Exercise X
105 BPM
Clean

Exercise X
110 BPM
Messy
```

Expected:

```text
Total practice time = 60 min

Technique time = 30 min
Song time = 30 min

Technique distribution = 50%
Song distribution = 50%

Best Clean BPM Exercise X = 105

Highest Attempted BPM Exercise X = 110
```

Tests must verify these.

---

# 92. REQUIRED END-TO-END FLOW A — RUDIMENT

Manually or automatically verify:

```text
Open Library
→ open Double Stroke Roll
→ target BPM 120
→ Start Practice
→ start metronome
→ use 105 BPM
→ mark Clean
→ add note
→ complete practice
→ complete session
→ open exercise
→ Best Clean BPM is 105
→ open Progress
→ progression includes result
→ reload
→ result remains
```

---

# 93. REQUIRED FLOW B — ROUTINE

Verify:

```text
Create routine
→ add 4 blocks
→ reorder
→ save
→ start routine
→ complete first block
→ skip second
→ complete remaining
→ finish session
→ History contains correct state
```

---

# 94. REQUIRED FLOW C — SONG

Verify:

```text
Create song
→ add BPM
→ add three sections
→ add section note
→ practice one section
→ finish session
→ Song detail reflects recent practice
```

---

# 95. REQUIRED FLOW D — SETLIST

Verify:

```text
Create 3 songs
→ create setlist
→ add songs
→ reorder
→ generate preparation routine
→ generated routine contains all intended songs
→ edit routine
→ save
```

---

# 96. REQUIRED FLOW E — BACKUP

Verify:

```text
Create:
exercise
song
routine
goal
practice session

Export backup

Validate file

Restore into clean application state

Verify:
exercise exists
song exists
routine exists
goal exists
history exists
tempo attempts preserved
```

---

# 97. REQUIRED FLOW F — OFFLINE

After the PWA/application shell has been loaded:

* disconnect network in browser tooling if possible;
* reload;
* verify application opens;
* verify Library works;
* verify Practice works;
* verify Metronome works;
* verify local data works.

Do not claim offline capability without verifying reasonable offline behavior.

---

# 98. RESPONSIVE QA

Inspect all major views at:

```text
360 × 800
390 × 844
430 × 932
768 × 1024
1440 × 900
1920 × 1080
```

Specifically look for:

* horizontal scrolling;
* clipped controls;
* tiny tap targets;
* overflowing text;
* broken dialogs;
* charts wider than viewport;
* inaccessible navigation;
* practice controls pushed off-screen.

Fix all obvious defects.

---

# 99. VISUAL QA

Do not judge visual quality solely from code.

After implementation:

1. start the dev server;
2. open the app in a browser;
3. inspect every major route;
4. interact with forms;
5. enter Focus Mode;
6. use dark mode;
7. inspect empty states;
8. inspect populated states;
9. inspect mobile sizes;
10. identify anything looking generic, broken, cramped, inconsistent, or unfinished;
11. fix it;
12. inspect again.

Repeat until major visual defects are gone.

---

# 100. INTERACTION QA

Actually interact with:

* metronome;
* BPM controls;
* tap tempo;
* meter selector;
* subdivision;
* count-in;
* exercise forms;
* routine builder;
* drag/reorder;
* session progression;
* attempt rating;
* notes;
* song editor;
* setlist editor;
* goals;
* backup;
* settings;
* command palette.

Do not assume a button works because its handler exists.

---

# 101. ACCESSIBILITY QA

Perform at minimum:

* keyboard-only navigation;
* tab through main UI;
* visible focus;
* activate controls with keyboard;
* close dialogs with Esc;
* labels for icon-only buttons;
* verify semantic headings;
* reduced-motion handling.

Fix obvious accessibility failures.

---

# 102. CODE QUALITY RULES

Do not leave:

* giant monolithic components;
* duplicated analytics logic;
* duplicated metronome engines;
* untyped persistence payloads;
* unexplained magic numbers;
* unused dependencies;
* dead files;
* excessive console logs;
* TODO comments representing unfinished required functionality.

Refactor where necessary before finishing.

---

# 103. NO PLACEHOLDERS

Never ship:

```text
Coming Soon
TODO
Placeholder
Fake chart values
Fake practice history
Nonfunctional button
Empty route for future feature
Mock persistence
```

If you cannot complete a lower-priority feature properly, remove its visible UI.

A smaller complete application is preferable to a bigger fake one.

---

# 104. NO PRETEND IMPLEMENTATION

Do not implement a feature merely by changing local React state if persistence is expected.

Do not claim:

```text
Saved
```

unless it was actually persisted.

Do not claim:

```text
Offline
```

without a real offline-capable build.

Do not claim:

```text
Best Clean BPM
```

using dummy values.

---

# 105. ERROR HANDLING

Avoid generic:

```text
Something went wrong.
```

when a meaningful explanation is available.

Examples:

```text
This backup was created by an unsupported version of Music Practice OS.
```

```text
Audio could not start. Tap Start again to allow browser audio.
```

```text
Practice data could not be saved. Check browser storage permissions.
```

---

# 106. STATE CONSISTENCY

Avoid having one feature read from stale copies of state while another reads from IndexedDB.

Define clear source-of-truth rules.

Persisted domain state should primarily live in IndexedDB.

Temporary UI state may live in React/Zustand.

Active session state should have controlled synchronization with persistence.

---

# 107. BUILD SCRIPTS

Ensure `package.json` exposes straightforward commands such as:

```text
npm run dev
npm run build
npm run preview
npm run typecheck
npm run test
npm run test:e2e
```

If linting is configured:

```text
npm run lint
```

All appropriate validation commands should pass before completion.

---

# 108. README

Create/update README with:

* product description;
* key features;
* stack;
* local development instructions;
* build instructions;
* testing instructions;
* offline/local-first explanation;
* high-level architecture;
* data backup explanation.

Do not produce an enormous marketing document.

Keep it useful to developers.

---

# 109. IMPLEMENTATION ORDER

Use the following approximate sequence to reduce integration risk.

## Stage 1 — Foundation

* project setup;
* TypeScript;
* router;
* theme system;
* layout;
* UI primitives;
* database;
* schema;
* seed data;
* settings.

## Stage 2 — Audio

* audio engine;
* metronome scheduling;
* tempo;
* accent;
* meter;
* subdivision;
* count-in;
* tap tempo;
* presets.

## Stage 3 — Exercise system

* exercise model;
* rudiments;
* Library;
* detail;
* create/edit/archive.

## Stage 4 — Practice

* session model;
* block runtime;
* timers;
* attempts;
* notes;
* Focus Mode;
* persistence;
* recovery after reload.

## Stage 5 — Tempo trainer

* progressive;
* repetition;
* ladder;
* endurance.

## Stage 6 — Routines + Today

* routine editor;
* templates;
* daily plans;
* Today;
* start plan/routine.

## Stage 7 — Songs

* song library;
* sections;
* song practice;
* song history.

## Stage 8 — Setlists

* create/edit;
* song ordering;
* routine generation.

## Stage 9 — Goals

* BPM;
* weekly sessions;
* song mastery;
* custom.

## Stage 10 — History + analytics

* session history;
* aggregation;
* charts;
* goal progress.

## Stage 11 — Utility

* search;
* command palette;
* backup;
* restore;
* onboarding;
* PWA.

## Stage 12 — Hardening

* tests;
* responsiveness;
* accessibility;
* performance;
* visual polish;
* final cleanup.

This sequence does not mean stopping after each stage.

Continue until the complete P0 release is finished.

---

# 110. AUTONOMOUS EXECUTION BEHAVIOR

Do not ask me questions about:

* minor visual choices;
* naming;
* folder structure;
* implementation libraries;
* exact spacing;
* component breakdown;
* routine engineering decisions.

Use your judgment.

Only a truly blocking lack of access should prevent progress.

If one approach fails:

1. diagnose;
2. choose a better approach;
3. implement;
4. continue.

---

# 111. DO NOT STOP WHEN SOMETHING FIRST WORKS

After getting a basic working implementation, continue.

A successful first render is not completion.

A successful build is not completion.

The app must also be:

* integrated;
* tested;
* visually polished;
* responsive;
* accessible;
* persistent;
* logically correct.

---

# 112. MANDATORY VERIFICATION LOOP

Before finishing, execute this loop:

```text
Install dependencies
↓
Typecheck
↓
Lint if configured
↓
Unit/integration tests
↓
Production build
↓
Fix failures
↓
Run again
↓
Start application
↓
Browser functional QA
↓
Responsive QA
↓
Visual QA
↓
Fix defects
↓
Run test suite again
↓
Production build again
```

Continue until there are no actionable failures within scope.

Do not suppress legitimate TypeScript errors merely to make the build green.

Do not delete failing tests that reveal real bugs.

Fix the underlying issue.

---

# 113. FINAL CLEANUP

Before completion:

* remove debug logs;
* remove unused code;
* remove unused imports;
* remove abandoned implementations;
* remove unused dependencies;
* remove dead routes;
* remove placeholder files;
* resolve obvious warnings;
* verify README commands;
* ensure no secrets exist;
* ensure no network dependency is required for core use.

---

# 114. FINAL ACCEPTANCE CHECKLIST

The product is not done until a user can:

### Initial use

* open app;
* complete short onboarding;
* use built-in drum content.

### Exercise

* open a rudiment;
* set target BPM;
* practice it;
* record a clean attempt.

### Metronome

* run accurately;
* change BPM;
* use tap tempo;
* change meter;
* change subdivision;
* use accent;
* use count-in.

### Practice

* start session;
* pause;
* resume;
* change BPM;
* rate attempt;
* add note;
* complete block;
* move to next;
* finish session.

### Focus

* use Focus Mode on mobile.

### Routine

* create;
* reorder;
* save;
* start.

### Today

* create/generate daily plan;
* start full plan.

### Songs

* create;
* add sections;
* add notes;
* practice section.

### Setlists

* create;
* reorder songs;
* generate preparation routine.

### Goals

* create BPM goal;
* watch it update from actual practice.

### Progress

* view correct practice time;
* view distribution;
* view BPM progression;
* view consistency.

### History

* open previous session;
* see preserved historical snapshots.

### Persistence

* reload;
* data remains.

### Backup

* export;
* restore successfully.

### Offline

* reopen core app without network after caching/install.

### Responsive

* phone;
* tablet;
* desktop all work.

---

# 115. PRIORITY WHEN TRADEOFFS OCCUR

When forced to choose, prioritize:

```text
1. Data integrity
2. Metronome correctness
3. Practice session reliability
4. Core user workflows
5. Mobile practice usability
6. Correct business logic
7. Persistence
8. Accessibility
9. Visual polish
10. Analytics
11. Secondary convenience features
12. Feature count
```

Never sacrifice a higher-priority item merely to add another feature.

---

# 116. DEFINITION OF DONE

This application is complete when it feels like a coherent **Music Practice OS**, not a collection of demos.

The intended experience:

```text
Open application
↓
Know what to practice
↓
Start in seconds
↓
Practice with an accurate integrated metronome
↓
Record meaningful results with minimal interaction
↓
Finish session
↓
Progress automatically updates
↓
Tomorrow's practice has better context
```

Over time the user should accumulate a truthful practice record such as:

```text
2026

Practice Time
126h 42m

Sessions
187

Double Stroke Roll
Best Clean BPM
72 → 126

Single Paradiddle
Best Clean BPM
85 → 138

Songs Practiced
46

Most Practiced Category
Technique

Average Session
41 min
```

Those statistics must derive from real persisted user activity.

---

# 117. FINAL RESPONSE AFTER IMPLEMENTATION

Do not give me another large plan.

After completing the work, provide a concise implementation report containing:

1. what was built;
2. major architectural decisions;
3. validation commands run and their final status;
4. any genuine limitations that remain;
5. how to launch the app.

Do not claim something was tested if it was not actually tested.

---

# 118. BEGIN NOW

Read this specification fully before making architectural decisions.

Then inspect the repository.

Build the complete application autonomously.

Do not stop at a prototype.

Do not leave placeholders.

Do not broaden the scope beyond this release.

Use the available development, browser, testing, and computer-use capabilities aggressively to verify your own work.

Your task ends only after the application has been implemented, integrated, tested, visually inspected, corrected, production-built, and cleaned up.
