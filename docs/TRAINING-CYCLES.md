# Phase 12 — Long-Term Goals, Training Cycles & Periodization

## Purpose

Phase 12 adds an explicit multi-week planning layer above Weekly Review, Priority Cycles and Autopilot.

The hierarchy is:

1. Goals and setlists define desired outcomes and performance dates.
2. A Training Cycle provides multi-week direction and dated phase structure.
3. Weekly Review converts current evidence plus the active long-term phase into an editable one-week Priority Cycle.
4. Today / Autopilot turns those priorities into individual sessions.

No layer silently changes a goal, deadline, performance date, or weekly priority.

## Persistent model

A Training Plan is profile-scoped and stores:

- name and lifecycle status;
- start and end dates;
- baseline weekly-minute target;
- linked Goal IDs;
- linked Setlist IDs;
- plan notes;
- contiguous Training Phases.

Statuses are Draft, Active, Paused, Completed, and Archived.

Only one Training Plan may be Active per profile.

## Training phases

Each phase stores:

- fixed start and end date;
- phase type;
- planned weekly minutes;
- existing Autopilot emphasis: Balanced, Songs, Timing, or Technique;
- up to three weighted skill focuses;
- notes.

Phase types:

- Foundation
- Build
- Reduced-load consolidation (`deload` internally)
- Integrate
- Simulate
- Taper
- Consolidate
- Custom

## Date integrity

Generated phases exactly cover the complete plan window.

Phases are contiguous: the next phase must start on the calendar day immediately after the previous phase ends. Gaps and overlaps are rejected.

Phase editing intentionally cannot alter dates. Changing phase boundaries requires an explicit plan regeneration so all boundaries can be rebuilt together.

## Cycle length

Generated Training Cycles support at least 14 days and at most 366 inclusive calendar days.

Longer development should be split into separate reviewable cycles rather than creating an indefinitely running plan.

## Periodization templates

The generator chooses a simple deterministic template based on total duration and whether a linked setlist has a performance date inside the plan window.

Short and medium development cycles emphasize Foundation / Build / Integrate / Consolidate.

Longer development cycles can insert Reduced-load consolidation.

Performance-linked cycles transition into Simulate and Taper and finish with Taper.

These are planning templates. They are not claims of physiological optimization, injury prevention, or guaranteed performance outcomes.

## Planned weekly volume

Each phase has a weekly-minute target derived from the plan baseline and phase type, rounded to 15 minutes.

Current multipliers:

- Foundation: 0.85 × baseline
- Build: 1.00 × baseline
- Reduced-load consolidation: 0.65 × baseline
- Integrate: 0.90 × baseline
- Simulate: 0.80 × baseline
- Taper: 0.60 × baseline
- Consolidate: 0.75 × baseline
- Custom: 1.00 × baseline

These numbers define the generated scheduling template only. Users can edit the target for any phase.

## Focus derivation

Initial phase skill focuses are derived from inspectable existing data:

- linked exercise goals;
- linked song goals;
- linked setlists / repertoire;
- prerequisite relationships in the Skill Graph;
- application relationships in the Skill Graph;
- profile focus areas and high-importance instrument skills as fallback.

Foundation can prefer prerequisites. Integrate can prefer application skills. Simulate and Taper favor repertoire when a performance is linked.

Generated focus is editable and never marks a skill as mastered.

## Draft-first behavior

New Training Cycles are Draft by default.

A Draft has no effect on Priority, Weekly Review, Autopilot, or Today.

Activation is explicit.

## Activation and history

Activating a Training Cycle:

- activates the selected plan;
- pauses any previously active plan for the same profile;
- preserves the previous plan and every phase;
- does not rewrite Goals or Setlists.

Plans can later be Paused, Completed, or Archived.

## Priority integration

An active dated phase contributes an explainable `training-phase` factor only when a candidate maps to one of its focus skills.

Current weights:

- Primary phase focus: +10
- Secondary: +7
- Support: +4

These are deliberately lower than the existing one-week Priority Cycle values of +18 / +12 / +6.

This preserves the intended hierarchy: long-term direction informs Weekly Review, while the user's explicitly applied one-week focus has stronger scheduling authority.

Active goals, due retention, recent weakness and performance urgency can still outrank the long-term phase.

## Weekly Review integration

Weekly Review shows the active long-term plan and current phase with:

- phase name;
- weekly target;
- Autopilot emphasis;
- current skill focuses.

The `training-phase` factor is a medium signal in Weekly Review's proposal engine.

The user still explicitly chooses whether to apply the resulting Weekly Priority Cycle.

## Goals and milestones

Training Cycle detail shows linked Goal progress using the existing goal-progress engine and linked Setlists with their performance dates.

Goals linked to the currently active plan are visibly marked on Goals.

Deleting a Goal or Setlist that is still referenced by a Training Plan is rejected by whole-workspace validation. The user must first regenerate or otherwise remove that link.

## Current-week view

Cycle detail compares recorded active practice minutes since the local Monday with the current phase's planned weekly-minute target.

The progress bar represents recorded time versus the planning target only. It is not a mastery or quality score.

## Persistence and database migration

Phase 12 introduces the `trainingPlans` IndexedDB store and increments the database schema from version 5 to version 6.

Existing v5 workspaces receive an empty `trainingPlans` store during upgrade.

Legacy pre-profile safety snapshots preserve their exact historical shape and do not gain a fake trainingPlans field.

## Backup compatibility

The external backup envelope remains version 4.

New modern backups include `trainingPlans`, including an empty array when there are no plans.

Older v4 backups that do not contain the field remain accepted. On restore, the new store simply becomes empty.

No existing historical PracticeSession or PracticeState record is rewritten to support periodization.

## Validation rules

- one active Training Plan per profile;
- plan profile must exist;
- linked goals and setlists must exist;
- profile-scoped linked goals must match the plan profile;
- every phase focus must belong to the profile's instrument;
- linked IDs must be unique;
- phase focus skills must be unique;
- phases must cover the exact plan range;
- phases must have no gaps or overlaps.

## Non-goals

Phase 12 does not prescribe medically safe training loads, calculate fatigue from physiology, predict injury, guarantee performance readiness, infer sleep/recovery, or automatically decide that a user should deload.

## Certification

Release certification requires:

- strict TypeScript;
- full Node test suite;
- Training Cycle domain tests;
- database v6 migration tests;
- backup compatibility tests;
- Priority and Weekly Review integration tests;
- real IndexedDB / service worker / backup / Web Audio checks;
- responsive `/cycles` and detail-page workbench coverage;
- create / activate / phase-edit browser acceptance;
- profile/instrument regressions;
- guided-course regressions;
- Chromium, Firefox and WebKit.
