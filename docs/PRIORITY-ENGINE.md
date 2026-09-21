# Priority engine — Phase 4

## Purpose

Phase 4 answers one question:

> Of the concrete things Steadybar could practice, what deserves attention most right now?

It does **not** compose a session. Time budgeting, block diversity, fatigue ordering and generated session structure belong to Phase 5.

The priority engine is deterministic, local and explainable. It reads existing Phase 3 mastery state, goals, priority cycles, repertoire deadlines and recent practice history. It does not use AI.

## Runtime-only score

Every candidate receives signed factors. Their sum is used only as a relative sorting key for the current request.

The number is:

- not persisted;
- not shown as a skill percentage;
- not a psychological or motor-learning measurement;
- not comparable between users;
- safe to change in a later calibration pass because all durable inputs remain separate.

## Positive signals

Current default heuristic weights:

| Signal | Typical weight |
| --- | ---: |
| Upcoming performance ≤2 days | +24 |
| Active target-specific goal | +20 |
| Priority-cycle weight 3 | +18 |
| Retention review due | +16 to +24 |
| Priority-cycle weight 2 | +12 |
| Recent Not Yet result | +12 |
| Long neglect ≥60 days | +12 |
| Ready for musical transfer | +10 |
| Never practiced | +8 |
| Long neglect ≥30 days | +10 |
| Long neglect ≥14 days | +7 |
| Priority-cycle weight 1 | +6 |
| High musical usefulness | +6 |
| Empty recent domain | +6 |
| Profile-focus fallback | +5 |
| Long neglect ≥7 days | +4 |

Setlist urgency scales down at 7, 14 and 30 days. An active PriorityCycle supersedes the older profile-focus fallback.

## Negative signals

| Signal | Typical weight |
| --- | ---: |
| Snoozed | ineligible |
| Practiced within 6 hours | −18 |
| Practiced within 24 hours | −10 |
| Three recent scheduled skips | −12 |
| Stable Maintain item not due | −6 |
| Missing prerequisite evidence | up to −6 |
| Practiced within 3 days | −4 |
| Exercise-level mismatch | −4 |
| Performance-ready repertoire | −4 |
| Recently scheduled by future Autopilot | −6 |

These are scheduling signals, not statements that a skill is bad or unimportant.

## Candidate types

Phase 4 ranks:

- exercises;
- whole songs;
- song sections;
- persistent song transitions.

Broad skill nodes are not directly scheduled. Lessons remain in the Learn system until the later Learn → Practice integration phase.

## Explainability

Each candidate contains:

- target identity;
- target label;
- relevant skill IDs;
- runtime score;
- eligibility;
- every signed factor and its explanation;
- prescription-compatible positive reason codes;
- current PracticeState when one exists.

This lets a future UI answer **Why this?** without reconstructing hidden logic.

Example:

- Upcoming performance +24
- Retention review due +18
- Recent Not Yet +12
- Practiced yesterday −4

The app can surface the strongest useful reason while developers can inspect the full factor list.

## Medium-term priorities

An active PriorityCycle can contain 1–5 skill priorities with weights 1–3.

The priority engine treats these as intentional user strategy, not permanent skill importance. When an active cycle exists, older profile focus areas stop adding ranking weight.

## Goals

Only concrete target-linked goals affect candidate ranking:

- exercise goals;
- protocol goals linked to an exercise;
- song mastery goals.

Weekly session/minute and custom goals remain behavioral/global goals and do not arbitrarily boost individual exercises.

## Retention

Phase 4 consumes Phase 3 state rather than re-deriving learning:

- a due review increases priority;
- Not Yet / Usable can increase repair priority;
- Apply increases musical-transfer priority;
- Maintain items not currently due receive a small penalty;
- inactivity never changes mastery by itself.

## Repertoire urgency

A dated setlist can temporarily outweigh general development.

The closest upcoming set containing a song contributes:

- today / ≤2 days: +24
- ≤7 days: +18
- ≤14 days: +12
- ≤30 days: +6

Past setlists do not affect priority.

Song goals and setlist urgency propagate to that song's sections and persistent transitions so later Autopilot can isolate weak material.

## Domain balance

The engine observes the last 14 days of actual active practice seconds by skill domain.

A candidate can receive a small bonus when its domain has been substantially underrepresented relative to the most-practiced domain. This is deliberately weaker than goals, deadlines and due retention.

## Prerequisites

Prerequisites are a **soft penalty**, not a hard gate.

If there is no concrete evidence in a prerequisite domain, a candidate loses a small amount of priority. This prevents advanced material from dominating by accident without blocking musical practice entirely.

## User control

Existing PracticeState scheduling fields already support:

- manual priority −2…+2;
- snooze until date;
- consecutive skips;
- last scheduled time.

Phase 4 reads these fields. Phase 5 will begin writing scheduler-specific fields when Autopilot actually selects items.

A skip never changes mastery.

## Current UI integration

The existing **Suggested exercises** area now uses the Phase 4 engine instead of the old rule:

goal → profile focus → least recently practiced.

It still shows only three exercises, but the reason text now comes from the same structured ranking system that Phase 5 will consume.

## Explicit non-goals

Phase 4 does not implement:

- generated sessions;
- 5/10/15/20/30/45-minute composition;
- per-session diversity constraints;
- fatigue-aware block ordering;
- Set Prep early/middle/final phases;
- automatic scheduling bookkeeping;
- difficulty generation;
- MIDI;
- microphone grading;
- AI coaching.

Those belong to later phases.
