# Practice Autopilot v1 — Phase 5

## Purpose

Autopilot turns the existing Steadybar state model into a usable daily practice plan:

`Mastery / retention → Priority ranking → Session composition → Today → Practice Player`

It remains deterministic, local-first and explainable. It does not use AI.

## Supported session budgets

Autopilot v1 accepts only:

- 5 minutes
- 10 minutes
- 15 minutes
- 20 minutes
- 30 minutes
- 45 minutes

Every generated plan allocates exactly the requested number of seconds.

### Slot templates

| Time | Composition |
| --- | --- |
| 5 min | Primary 3m → Application 2m |
| 10 min | Ramp-in 2m → Primary 4m → Application 4m |
| 15 min | Ramp-in 2m → Primary 5m → Application 4m → Secondary 4m |
| 20 min | Ramp-in 3m → Primary 7m → Application 5m → Secondary 5m |
| 30 min | Ramp-in 3m → Primary 8m → Secondary 6m → Application 7m → Retention 6m |
| 45 min | Ramp-in 5m → Primary 10m → Secondary 8m → Application 8m → Retention 8m → Repertoire 6m |

The five-minute Rescue Session deliberately has no compulsory warm-up.

These are v1 product heuristics, not universal practice-science constants.

## Session intents

### Balanced

Uses the full ranked candidate pool while preferring skill/repertoire diversity.

### Songs

Constrains primary/secondary work toward songs, sections, transitions or repertoire-class exercises when available.

### Timing

Constrains primary/secondary work toward canonical timing-domain material when available.

### Technique

Constrains primary/secondary work toward canonical technique-domain material when available.

Application and retention slots may deliberately use complementary material rather than repeating the requested domain.

## Candidate sources

Autopilot consumes the Phase 4 Priority Engine and can schedule:

- exercises;
- whole songs;
- song sections;
- persistent song transitions.

It does not directly schedule broad skill nodes or Learn lessons in v1.

## Diversity rules

Autopilot does not simply take the first N ranked candidates.

Selection considers:

- slot purpose;
- session intent;
- exact-target duplication;
- repeated use of the same song;
- repeated use of the same skill domain;
- ramp-in suitability;
- repertoire/application suitability;
- due retention work.

Exact duplicate targets are avoided whenever unused alternatives exist. For 5–20 minute sessions, Autopilot normally introduces at most one genuinely new non-ramp target when familiar alternatives exist; 30–45 minute sessions normally allow at most two. Active goals and imminent performance material may override this cap.

## Practice intents and evidence safety

Generated blocks carry a `PracticePrescription` with:

- canonical target;
- practice intent;
- structured reason codes;
- `generatedBy: autopilot`;
- Autopilot engine version.

Intent mapping is conservative:

- ramp-in → `ramp-in`;
- new/learning targets → `learn`;
- build targets → `build`;
- stabilizing targets → `stabilize`;
- due retained checks → `retest` only when state/reason supports it;
- genuine musical application/repertoire → `apply`;
- due maintained work → `maintain`;
- imminent repertoire performance → `perform`.

An arbitrary exercise used as an application-slot fallback does **not** automatically become transfer evidence.

## Generated block types

### Exercise

Uses the existing exercise protocol and configured starting BPM. Autopilot v1 does not alter difficulty/tempo progression.

### Song

Creates a whole-song practice block.

### Song section

Creates a section block with section BPM override where defined.

### Persistent transition

Uses the transition’s canonical PracticeTarget while representing the playable block through the source section, transition title and combined transition/from/to cues.

## Today integration

Today now exposes:

- Session time
- Practice emphasis
- **Start Autopilot**
- **Build plan**

### Start Autopilot

Generates Today’s plan transactionally and immediately launches it.

### Build plan

Generates the same plan but leaves it visible for inspection/editing before starting.

Existing saved routines, manual plan editing and free practice remain available. Generated rows display an **Autopilot · intent** badge so the plan is visibly distinguishable from manual material.

## Voice safety\n\nAutopilot v1 deliberately does not generate voice sessions. Voice profiles keep the existing rest-aware starter-routine path so listening/recovery blocks and bounded vocal practice are not accidentally replaced by a generic multi-block scheduler. A future voice-aware composer must model planned rest before Autopilot is enabled for voice.\n\n## Plan metadata

Generated DailyPlans contain:

- `generation.kind = autopilot`;
- generated timestamp;
- requested minutes;
- session intent;
- Autopilot engine version.

When replacing Today’s existing plan, its stable plan ID/creation timestamp are preserved while source-routine attribution is removed.

## Scheduler bookkeeping

Plan generation and scheduling-state changes happen in one workspace transaction.

Every selected target receives:

`PracticeState.scheduling.lastScheduledAt = generatedAt`

If an unseen target has no PracticeState yet, Autopilot creates an evidence-free `Discover` state solely so scheduler fields have a durable home. It does not fabricate mastery, results or review dates.

## Skip behavior

Only Autopilot-generated prescription blocks affect Autopilot skip bookkeeping.

- skipped block → increment `consecutiveSkips`, set `lastSkippedAt`;
- completed block → reset `consecutiveSkips`;
- manual/non-Autopilot block → no scheduler skip change.

Skipping never changes mastery.

## Editing generated plans

Autopilot plans remain ordinary editable DailyPlans.

If the user edits only duration/cue details and leaves the source target unchanged, the prescription remains valid. Persistent transition blocks also keep their transition-specific title during these edits.

If the underlying exercise/song/part/section changes, Steadybar clears the old prescription so future session evidence cannot be attributed to the wrong Autopilot target.

## Explicit non-goals

Autopilot v1 does not implement:

- automatic BPM/difficulty progression;
- Set Prep early/middle/final preparation phases;
- fatigue-aware physiological modeling;
- advanced gap/sparse-click training;
- Learn → Practice prescription scheduling;
- MIDI scoring;
- microphone analysis;
- AI coaching.

Those remain later phases.
