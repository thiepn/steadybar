# Phase 10 — Practice Analytics & Diagnostic Intelligence

## Purpose

Phase 10 turns Steadybar's existing evidence into inspectable longitudinal context without introducing a hidden score, ranking, or persisted analytics cache.

The engine is runtime-only. It derives every result from current sessions, PracticeState, progression snapshots, Autopilot prescriptions and Set Prep prescriptions each time Progress is opened.

## What Phase 10 does not do

- It does not diagnose injuries, technique faults, motivation or musicianship.
- It does not convert practice into a 0–100 score.
- It does not treat more minutes as automatically better.
- It does not treat a scheduled retention review as proof of decay.
- It does not infer causation from correlations in self-reported results.

## Equal-window comparison

For bounded ranges, the selected date window is compared with the immediately preceding equal-length window.

Example: September 16–22 compares against September 9–15.

The comparison records:

- active practice seconds;
- finished sessions;
- completed sessions;
- active practice days;
- Solid / Usable / Not Yet evaluated-block counts;
- generated Autopilot + Set Prep block follow-through;
- progression-engine block outcomes.

All-time ranges have no previous-window comparison.

## Direction labels

Trend labels are descriptive only.

- Practice time is considered meaningfully changed only after a 15-minute difference between equal windows.
- Active days require a difference of at least one day.
- Solid and Not Yet result-share direction requires a difference of at least 12 percentage points.

These thresholds prevent tiny changes from being presented as a trend. They are heuristics, not statistical significance tests.

## Minimum evaluation coverage

Directional result diagnostics require at least three evaluated blocks in the selected window and at least three in the comparison window.

When this requirement is not met, Steadybar emits an explicit limited-evaluation message instead of extrapolating.

## Recurring limitations

Limitations come from the existing optional block-evaluation tags:

- timing;
- coordination;
- memory;
- dynamics;
- tension;
- sound;
- accuracy;
- endurance;
- too fast;
- form.

A recurring-limitation diagnostic requires the same tag on at least three evaluated blocks and at least 30% of evaluated blocks in the selected range.

This is a pattern in user-recorded tags, not an automatic diagnosis.

## Retention diagnostics

Current PracticeState is checked with the existing Mastery/Retention review scheduler.

Targets whose review date is due are listed with:

- target label;
- mastery state;
- due date;
- latest evaluated result.

A due review remains a scheduling signal only.

## Tempo reliability gaps

Phase 10 keeps the Phase 3 distinction between:

- Peak BPM — highest historical demonstrated point;
- Working BPM — repeatedly solid working level;
- Cold BPM — repeatedly solid cold/retest level.

A target appears in the tempo reliability-gap view when either:

- Peak exceeds Working by at least 5 BPM; or
- Working exceeds Cold by at least 5 BPM.

The actual BPM values are shown directly. No composite speed score is calculated.

## Generated-practice follow-through

Autopilot and Set Prep blocks are counted separately from mastery evidence.

Within the selected range Phase 10 reports:

- generated blocks;
- completed blocks;
- explicitly skipped blocks;
- generated blocks left unfinished when a session ended.

A repeated-skip insight appears when at least two generated blocks were skipped within a window containing at least three generated blocks.

A positive follow-through signal can appear when at least three generated blocks were completed and all but at most one generated block were completed.

Scheduling behavior is not treated as proof of skill.

## Progression friction

Phase 8 progression snapshots are grouped by challenge dimension.

For each dimension Progress shows:

- evaluated challenge blocks;
- Solid outcomes;
- Usable outcomes;
- Not Yet outcomes.

A progression-friction diagnostic requires at least two evaluated blocks on the same dimension, at least two Not Yet outcomes, and more Not Yet than Solid outcomes.

The progression engine itself remains responsible for reducing/holding/advancing challenge. Phase 10 only exposes the pattern.

## Current mastery distribution

The mastery panel is a current-state snapshot independent of the selected chart range.

It counts targets in:

- Unassessed;
- Discover;
- Learn;
- Build;
- Stabilize;
- Retest;
- Apply;
- Maintain.

The displayed distribution is descriptive coverage, not a single mastery percentage.

## Evidence explorer

The expandable current-evidence table exposes up to the first 100 priority-sorted current target rows with:

- target label;
- mastery state;
- latest result;
- evidence count;
- last practiced date;
- review status;
- Peak / Working / Cold tempo when present.

Attention sorting prefers due reviews, then Not Yet / Usable results, then Learn/Build states.

## Performance and complexity

Diagnostics are profile-scoped because Progress already uses the active profile view.

Practice-state sorting is linearithmic after one linear mapping pass; it does not repeatedly rescan the state collection in a comparator.

Charts keep the existing ResizeObserver cleanup and route-lifecycle behavior.

## Persistence

Phase 10 adds no persisted fields.

No IndexedDB schema migration and no backup-envelope version change are required. Restoring or editing historical evidence immediately changes the derived analytics.

## Certification

Release certification requires:

- strict TypeScript;
- full Node test suite;
- diagnostics unit tests;
- rendered UI workflows;
- real IndexedDB / service worker / backup / Web Audio capability checks;
- responsive workbench including 320px mobile;
- profile/instrument migration regressions;
- guided-course regressions;
- Chromium, Firefox and WebKit native lanes.
