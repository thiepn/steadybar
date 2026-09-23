# Phase 13 — Weekly Schedule & Practice Calendar Orchestration

## Purpose

Phase 13 adds an explicit calendar layer between long-term/weekly planning and session execution.

The planning hierarchy is now:

1. Goals and Setlists define outcomes and performance dates.
2. Training Cycles provide multi-week phase direction.
3. Weekly Review chooses the one-week Priority Cycle.
4. Practice Calendar distributes time and emphasis across Monday–Sunday.
5. Today converts only the current applied day into executable practice blocks when the user explicitly asks.

Calendar never auto-starts practice and never silently creates future DailyPlans.

## Persistent model

A Weekly Schedule stores:

- profile ID;
- Monday week-start date;
- Draft or Applied status;
- exact planned weekly practice minutes;
- source snapshot;
- seven dated day records.

Each day stores:

- Practice, Optional, or Rest type;
- planned minutes;
- existing Balanced / Songs / Timing / Technique emphasis;
- editable note.

## Week identity

Each profile can have at most one Weekly Schedule for a given Monday week-start date.

A valid schedule contains exactly seven unique ordered dates from Monday through Sunday.

## Draft / Applied contract

Generation always produces a Draft.

Draft schedules do not influence Today.

Applying a schedule is explicit and only changes its status to Applied. Application does not:

- create DailyPlans;
- generate Autopilot blocks;
- start a session;
- modify goals;
- modify Training Cycles;
- modify Priority Cycles;
- rewrite history.

## Day types

### Practice

Counts toward `targetMinutes` and carries 5–180 planned minutes plus an emphasis.

### Optional

Carries a suggested 5–180 minute duration and emphasis, but is excluded from `targetMinutes`.

This allows one make-up/flexible opportunity without inflating the committed weekly target.

### Rest

Always stores zero planned minutes.

A Rest day is advisory scheduling context. Today remains fully usable if the user chooses to practice anyway.

## Generated target minutes

When the user does not override weekly minutes, generation resolves the target in this order:

1. If an Active Training Cycle overlaps the week, phase weekly-minute targets are weighted day-by-day across the seven dates.
2. Otherwise, use the most recently updated incomplete `weekly-minutes` goal for the profile or a global weekly-minutes goal.
3. Otherwise, use the profile default session duration multiplied by the active weekly-session target when one exists, or three sessions as fallback.

Targets are whole minutes.

Generated schedules support up to seven days × 180 minutes = 1,260 planned minutes.

## Practice-day count

When not explicitly supplied:

- the most recent incomplete weekly-session goal is preferred;
- otherwise Steadybar estimates the count from target minutes ÷ profile default session duration;
- count is constrained to 1–7;
- count is raised when needed so no generated Practice day exceeds 180 minutes;
- count is reduced when needed so every Practice day has at least 5 minutes.

Explicit incompatible combinations are rejected instead of silently changing the user's requested day count.

## Deterministic day distribution

Generated Practice days use deterministic Monday–Sunday patterns rather than randomness.

Default patterns spread one to seven sessions through the week. When fewer than seven Practice days are present, generation can also add one Optional day.

All Practice-day minutes are allocated exactly; their sum must equal `targetMinutes`.


## Phase 15 calibration extension

Phase 15 keeps this Calendar architecture intact but adds an optional adaptive-load layer before Draft generation.

When **Use recent practice calibration** is enabled, Steadybar inspects the preceding six weeks of recorded active practice for the selected profile. Medium/High evidence can influence:

- profile-default weekly minutes, bounded to ±30% of the baseline;
- practice-day count when no explicit weekly-session goal exists;
- weekday placement.

Explicit Training Cycle weekly load and explicit weekly-minute goals remain authoritative. A weekly-session goal remains authoritative for day count.

The exact calibration evidence is copied into the saved schedule source snapshot. Later practice history never silently rewrites an existing week.

See [Practice-load calibration](PRACTICE-LOAD-CALIBRATION.md) for the complete algorithm and non-goals.

## Emphasis generation

Day emphasis is resolved from explicit short-term direction before long-term direction:

1. Active Priority Cycle Primary/strongest item when its skill domain maps clearly to Repertoire, Timing, Technique, or Coordination.
2. Active Training Phase emphasis for that date.
3. Balanced fallback.

Priority mappings:

- repertoire → Songs;
- timing → Timing;
- technique / coordination → Technique.

Other domains do not fabricate a specialized intent.

## Source snapshots

Generation snapshots:

- active Training Plan ID/name when its phases overlap the week;
- every overlapping Training Phase ID/name;
- active Priority Cycle ID/name.

These snapshots are explanatory provenance, not live references used to rewrite the week.

If upstream planning changes later, the saved Calendar does not mutate. The user must explicitly Regenerate the week.

## Editing

Every scheduled day can be edited after generation.

Editable fields:

- day type;
- planned minutes;
- emphasis;
- note.

Changing a Practice day to Rest removes its minutes from the weekly target.

Changing Optional to Practice adds its minutes to the weekly target.

Editing Calendar does not alter an existing DailyPlan for that date.

## Today integration

Today reads only the Applied schedule containing the current local date.

For Practice / Optional days:

- show Calendar context;
- preselect the exact scheduled duration;
- preselect the scheduled emphasis;
- keep both controls editable;
- build current blocks only when the user explicitly chooses Build or Start.

For Rest days:

- show Rest-day context;
- do not preselect a special session;
- keep all normal practice controls available.

This intentionally prevents stale future Autopilot prescriptions.

## Voice integration

Voice still does not use Autopilot.

Applied Calendar duration can prefill the existing rest-aware starter-routine path. `fitRoutine` already supports whole-number durations from 5–180 minutes and preserves the routine's internal rest/listening proportions.

## Autopilot scheduled durations

Canonical layouts remain fixed and unchanged for:

- 5 minutes;
- 10 minutes;
- 15 minutes;
- 20 minutes;
- 30 minutes;
- 45 minutes.

Phase 13 adds 60 minutes as a canonical six-slot layout.

For other whole-number durations from 5–180 minutes, Autopilot scales the nearest lower canonical slot layout proportionally and assigns any rounding remainder to the final slot so total seconds remain exact.

This scheduled-duration path does not change target ranking, prescription intent, mastery, or evidence semantics.

## Calendar actuals

The Calendar derives recorded activity from finished Practice Sessions.

It reports:

- total recorded active time in the week;
- number of dates with recorded active time;
- number of scheduled Practice days;
- number of scheduled Practice days that currently contain recorded activity;
- per-day active time and session count.

It deliberately does not calculate:

- adherence percentage;
- consistency score;
- streak score;
- quality score.

Practicing on Rest/Optional days is displayed descriptively rather than labeled as failure.

## Performance and DailyPlan context

Calendar derives Setlist performance markers from Setlist dates.

It also indicates when a DailyPlan already exists for a date.

These are display-only references; schedule generation never moves a performance or replaces a future DailyPlan.

## Persistence and migration

Phase 13 introduces the `weeklySchedules` IndexedDB store and increments database schema from v6 to v7.

Existing profile workspaces receive an empty weekly schedule collection.

Legacy pre-profile migration safety snapshots retain their original shape and do not gain synthetic Calendar data.

## Backup compatibility

Backup envelope remains version 4.

New modern backups include `weeklySchedules`, including an empty array.

Older v4 backups that omit the field remain valid. On restore/read, the new store is empty.

## Validation rules

- one Weekly Schedule per profile + Monday week;
- weekStart must be Monday;
- exactly seven day records;
- dates must be unique and exactly Monday through Sunday;
- day IDs must be unique;
- Rest days must have zero minutes;
- Practice/Optional days require 5–180 minutes;
- targetMinutes must exactly equal the sum of Practice-day minutes;
- Training Phase source IDs/names must be aligned and unique;
- profile must exist.

## Non-goals

Phase 13 does not enforce rest, prescribe medically optimal frequency, punish deviations, infer recovery, auto-reschedule missed practice, create streak pressure, or silently move commitments.

## Certification

Release certification requires:

- strict TypeScript;
- full Node suite;
- Weekly Schedule domain tests;
- exact and custom Autopilot-duration tests;
- IndexedDB v7 migration/storage tests;
- v4 backup compatibility;
- responsive Calendar workbench;
- Draft → Edit → Apply browser workflow;
- Today schedule prefill verification;
- native IndexedDB / offline / audio checks;
- profile/instrument regressions;
- guided-course regressions;
- Chromium, Firefox, and WebKit.
