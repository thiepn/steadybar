# Phase 20 — Advanced Practice Intelligence

## Purpose

Phase 20 unifies Steadybar's existing evidence systems into one deterministic next-action layer.

It does not replace the authoritative engines beneath it:

- PracticeState / mastery;
- Practice diagnostics;
- Priority Engine;
- Exercise progression;
- Guided learning;
- Weekly Review;
- Autopilot;
- repertoire / performance urgency.

Practice Intelligence reads those systems and explains what to do next. It does not persist a new score or independently rewrite their state.

## Runtime-only contract

`buildPracticeIntelligence(data, options)` returns a snapshot containing:

- profile ID;
- generated timestamp;
- current diagnostics;
- skill assessments;
- practice-target / lesson recommendations.

The snapshot is rebuilt from workspace data every time.

When a caller does not supply a diagnostic date range (for example Today and Autopilot), recurring-limitation/trend diagnostics are bounded to the most recent **28 calendar days**. This prevents old historical limitation tags from permanently dominating current recommendations. Progress and Weekly Review continue to pass their own explicit ranges.

No Practice Intelligence cache is stored in IndexedDB.

## Practice actions

Every skill/target receives one practice action:

### Repair

Used when current evidence shows an explicit reduction request, repeated Not Yet evidence, or a recurring limitation pattern.

### Retest

Used when an established target is due for cold/retention evidence.

### Stabilize

Used when work is usable or still in Learn / Build / Stabilize state but does not yet justify increasing difficulty.

### Apply

Used when the existing state/priority evidence points toward musical transfer or application.

### Maintain

Used for established targets that currently need bounded maintenance rather than more difficulty.

### Explore

Used when structured evidence is sparse and the safest next step is establishing a baseline.

## Progression decisions

Practice action and progression are intentionally separate.

Every recommendation also receives one of:

### Progress

Allowed only with at least Medium evidence confidence and an explicit advance/application signal.

### Hold

Used when evidence is Low, a retest is due, the target is already in maintenance, or there is no justified change in challenge.

### Consolidate

Used when the next practice should strengthen the same level: Repair without an explicit reduction, Stabilize, or Usable evidence.

### Regress

Used only when the authoritative current state/progression engine explicitly requests `reduce`.

This prevents a general weakness label from automatically reducing difficulty.

## Evidence confidence

Confidence describes evidence quantity/coverage, not ability.

Current thresholds:

- High: at least 6 structured evidence events across at least 2 evaluated targets;
- Medium: at least 2 evidence events or at least 1 evaluated target;
- Low: otherwise.

Low evidence always blocks the `Progress` decision.

## Skill assessments

Skill assessments aggregate current eligible targets mapped to one skill ID.

Signals include:

- latest Not Yet / Usable / Solid state;
- evidence count;
- explicit reduce / advance challenge direction;
- due review / Retest state;
- recurring self-reported limitation tags mapped to relevant skill domains;
- neglect / balance / explicit-goal / priority / repertoire context inherited from Priority candidates.

Skill assessments remain explanatory summaries. They do not create new PracticeState records.

## Target recommendations

Practice-target recommendations preserve the exact underlying `PracticeTargetRef`.

For exercise targets, the existing `buildExerciseProgression()` output is attached as the recommendation's progression snapshot.

Target evidence can include:

- latest evaluated result;
- mastery state;
- current progression direction;
- evidence count;
- limitation tags;
- review schedule;
- next progression summary;
- explainable Priority factor details.

By default only five recommendations are returned. Explicit diagnostic callers may request up to twelve.

## Executable actions

`recommendationBlock()` converts supported practice targets into the same ordinary `RoutineBlock` shapes used by manual practice:

- exercise;
- song;
- song section;
- song transition.

Exercise blocks preserve the recommended progression snapshot.

Every executable recommendation also carries a user-confirmed manual prescription snapshot containing the exact recommended target and a practice intent derived from the recommendation action. This preserves Retest / Apply / Maintain evidence context without making the Intelligence engine an automatic execution source.

Song-transition recommendations become a bounded section-transition block with the existing transition notes **and retain the original transition target in that prescription**, so completed practice contributes transition evidence rather than being silently reduced to section-only evidence.

Lesson recommendations do not fabricate a practice block; they link back to the actual guided lesson.

Start/Add-to-Today therefore reuses normal Today → Focus Player → History behavior.

## Weekly Review

Weekly Review still neutralizes the current active Priority Cycle before proposing a replacement, preventing last week's focus from recommending itself merely because it is active.

However, the replacement focus order is now taken from the same Practice Intelligence skill assessments.

Priority factors are retained only as additional explainable context and signal codes.

## Autopilot v2

Autopilot v2 uses `rankIntelligentPracticeTargets()` instead of raw Priority ranking.

Ordering therefore considers:

1. recommendation band (`Now`, `Soon`, `Later`);
2. practice action urgency;
3. existing explainable Priority score;
4. deterministic target key tie-break.

Autopilot still:

- preserves exact requested duration;
- respects user-selected emphasis;
- avoids duplicate targets when alternatives exist;
- records generated blocks as normal blocks;
- requires explicit user build/start action.

Voice remains excluded from automatic Autopilot generation.

## Today

Today shows at most three recommendations that are either:

- `Now`, or
- backed by Medium/High evidence.

Nothing is automatically added or started.

Users can Start, Add to Today, or open the source target/lesson.

## Progress

Progress shows:

- top skill assessments;
- action;
- progression decision;
- evidence confidence;
- reasons;
- recommended targets;
- executable actions;
- next progression summary when applicable.

The older detailed diagnostics remain directly below this panel for inspection.

## Non-goals

Phase 20 does not:

- create a musicianship score;
- infer motivation, health, fatigue, pain, or talent;
- make medical/psychological claims;
- auto-change goals;
- auto-change Training Cycles;
- auto-apply Weekly Review priorities;
- auto-start practice;
- bypass Exercise Progression evidence thresholds;
- use LLM output as an authoritative recommendation;
- persist a stale recommendation cache.

## Persistence

No new store.

Database remains schema v11.

Backup envelope remains v4.

Autopilot/Weekly Review version numbers are metadata on generated/review outputs, not schema migrations.

## Certification

Release certification includes:

- deterministic runtime-only output;
- five-target default limit and twelve-target hard inspection cap;
- Low evidence cannot Progress;
- explicit reduce → Regress;
- due Retest → Hold;
- Usable/Build → Consolidate;
- evidenced advance → Progress;
- repair/retest ordering ahead of generic unexplored targets;
- executable exercise progression preservation;
- executable transition block provenance;
- Weekly Review unified snapshot;
- active Priority Cycle anti-self-reinforcement;
- Today Add-to-Today action uses ordinary DailyPlan blocks;
- Autopilot exact-duration regression suite;
- Chromium / Firefox / WebKit full release matrix.
