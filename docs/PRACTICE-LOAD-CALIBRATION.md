# Phase 15 — Smart Scheduling Calibration & Adaptive Practice Load

## Purpose

Phase 15 makes Calendar generation more realistic by learning only from the user's recorded practice capacity and weekday pattern.

It does not create a recovery score, readiness score or health model. It does not infer fatigue, motivation, injury risk or musical quality.

## Evidence window

Calibration looks at the 42 calendar days immediately before the Monday being generated.

Only finished sessions with positive recorded active time for the selected profile are considered.

The engine derives:

- number of recorded sessions;
- number of active practice dates;
- number of active weeks;
- median active minutes per active day;
- median active minutes per active week;
- median number of active days per active week;
- weekday preference ranked by observed active-day frequency, then recorded time.

Session ratings, block results, mastery, BPM success, limitation tags and recording labels are deliberately excluded from load calibration.

## Confidence

### Low

Anything below Medium evidence.

Low confidence never changes weekly load or the legacy weekday pattern.

### Medium

At least:

- 2 active weeks;
- 4 active days;
- 4 recorded sessions.

### High

At least:

- 4 active weeks;
- 8 active days;
- 8 recorded sessions.

These thresholds measure evidence quantity only. They are not claims about practice quality.

## Weekly-load rules

Calendar still resolves its baseline weekly target from the existing planning hierarchy:

1. active Training Cycle phase;
2. active weekly-minute goal;
3. profile default session duration × weekly-session goal, or three sessions when no session goal exists.

Calibration may alter only source 3: the profile-default load.

With Medium/High confidence, the suggested profile-default weekly load is the median active-week volume bounded to 70–130% of the existing baseline and rounded to five minutes.

Training Cycle and weekly-minute targets are never automatically changed.

## Practice-day count

An explicit weekly-session goal remains authoritative.

Without one, Medium/High calibration combines:

- the median historical active-day count per active week;
- the number of typical active days required to fit the suggested weekly minutes.

The final count is constrained to 1–7 days and to the existing 5–180 minutes-per-day Calendar limits.

## Weekday placement

With Medium/High confidence, Practice days use the highest-ranked observed weekdays.

If calibration is Low or disabled, Calendar uses the existing deterministic day patterns.

Minute allocation remains exact: the sum of Practice-day minutes always equals `targetMinutes`.

## User control

Generate / Regenerate Week includes:

- **Use recent practice calibration**;
- planned weekly minutes;
- planned practice days;
- optional/make-up day.

Toggling calibration updates the suggested minutes/day count in the dialog, but all fields remain editable.

Generation still creates a Draft only.

## Saved provenance

When calibration is enabled, the Weekly Schedule source snapshot stores:

- engine version;
- confidence;
- evidence-window dates;
- observed sessions, active days and active weeks;
- typical active-day minutes;
- median active-week minutes;
- baseline weekly minutes;
- target source (`training-plan`, `weekly-goal`, or `profile-default`);
- suggested weekly minutes;
- suggested practice days;
- ranked weekdays;
- whether weekly load changed;
- whether weekday placement changed.

Historical schedules never re-evaluate automatically when later practice is recorded.

## Weekly Review

Weekly Review shows a read-only next-week load preview using the same Calendar generator.

It is not a second scheduler.

Users still open Calendar to generate/edit/apply the actual week.

## Persistence

No new IndexedDB store is introduced.

Database schema remains v8.

Backup envelope remains v4.

The optional calibration snapshot is stored inside the existing Weekly Schedule source metadata and therefore travels with normal structured backups.

## Non-goals

Phase 15 does not:

- prescribe recovery days;
- diagnose overtraining;
- infer fatigue or pain;
- punish missed days;
- create adherence/streak scores;
- modify goals automatically;
- rewrite Training Cycle phase loads;
- auto-apply Calendar weeks;
- auto-create DailyPlans;
- change Practice Intelligence mastery or progression logic.

## Certification

Release certification includes:

- strict TypeScript;
- deterministic unit fixtures;
- Medium/High/Low evidence thresholds;
- bounded ±30% profile-default adjustment;
- explicit weekly-minute authority;
- Training Cycle authority;
- weekly-session goal authority;
- learned weekday placement;
- disabled-calibration legacy behavior;
- Weekly Schedule validation of calibration provenance;
- Calendar browser workflow and responsive matrix;
- Weekly Review load-preview rendering;
- existing Chromium / Firefox / WebKit regression suites.
