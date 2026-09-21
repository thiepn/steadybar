# Mastery & retention engine — Phase 3

## Purpose

Phase 3 turns the Phase 2 evidence ledger into conservative, deterministic practice state. It does not choose today's session; priority scoring and Autopilot remain later phases.

## Canonical progression

`Discover → Learn → Build → Stabilize → Retest → Apply → Maintain`

- **Discover** — no practice evidence.
- **Learn** — modern evidence exists but the target is not yet usable.
- **Build** — usable work exists, or repeated weakness requires rebuilding.
- **Stabilize** — at least one modern solid result exists, but repeatability/retention is not yet established.
- **Retest** — solid normal-context evidence has been reproduced on separated occasions.
- **Apply** — a later cold retest succeeds after earlier solid evidence.
- **Maintain** — retained ability is successfully transferred into another context or performance.

Legacy-only history remains **Unassessed**. It may establish objective historical facts such as a peak clean BPM, but it cannot retroactively invent working level, cold reliability or mastery.

## Evidence rules

Modern mastery transitions use structured/self-reported Phase 3 results or stronger future evidence. Legacy five-level tempo attempts remain immutable historical evidence and do not by themselves establish modern mastery.

A cold result counts as retention only when an earlier solid result exists at least 12 hours before it. A working tempo requires two modern solid confirmations separated by at least 12 hours. A cold-reliable tempo requires two modern solid cold confirmations separated by at least 24 hours.

These windows are conservative product heuristics, not claimed universal motor-learning constants.

## Tempo semantics

- **Peak** — highest solid BPM ever recorded, including compatible legacy history.
- **Working** — highest BPM supported by repeated modern solid evidence on separated occasions.
- **Cold** — highest BPM supported by repeated modern cold-solid evidence on separated occasions.

A failed experiment above established working tempo does not demote mastery or trigger a regression recommendation.

## Regression

One bad result does not erase established retention/application state.

Two consecutive `Not Yet` results at or below the established working level can move a previously stronger state back to **Build** and produce `challenge = reduce`.

Two separated solid modern results can produce `challenge = advance`. Everything else defaults to `hold`.

## Review scheduling

Inactivity alone never lowers mastery. The engine records a `nextReviewAt` signal instead.

Default organizational intervals:

- Not Yet: 1 day
- Usable: 2 days
- Stabilize: 2 days
- Retest: 3 days
- Apply: 3 days
- Initial Maintain: 7 days
- Successful later maintenance: 14 → 30 → 60 days

These intervals are adjustable heuristics. Future calibration can change them without rewriting immutable session evidence.

## Session integrity

An ordinary live-session update cannot end practice. Session completion/abandonment uses an all-store transaction that:

1. validates the ended immutable session;
2. inserts that session state into the workspace snapshot;
3. rebuilds practice state from the full evidence ledger;
4. validates the complete workspace;
5. commits the session and affected practice-state rows together.

If that transaction fails, neither side is reported saved.

## Active-practice feedback

Phase 3 adds a block-level summary:

- **Not Yet**
- **Usable**
- **Solid**

Optional limitation tags record timing, coordination, memory, dynamics, tension, sound, accuracy, endurance, excessive tempo or form problems.

Detailed legacy tempo attempt ratings remain available as per-attempt information. The block summary is the mastery signal; individual attempts are not silently promoted into mastery.

## Explicit non-goals

Phase 3 does not implement:

- priority scoring;
- automatic daily session generation;
- exercise difficulty generation;
- set-prep scheduling;
- gap-click progression;
- MIDI or microphone measurement;
- AI coaching.

Those systems consume the Phase 3 state later.
