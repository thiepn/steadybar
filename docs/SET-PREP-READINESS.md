# Phase 9 — Set Prep & Performance Readiness

## Purpose

Phase 9 turns dated setlists into an evidence-driven preparation workflow without replacing the existing repertoire library, Priority Engine, Mastery/Retention, Autopilot, or manual routines.

Priority already knows that repertoire on an upcoming setlist matters. Set Prep answers two different questions:

1. What evidence exists that each song is usable in performance context?
2. What should this set-specific practice session contain right now?

## No readiness percentage

Set Prep deliberately does not produce a 0–100 readiness score. Current evidence is classified into four inspectable states:

- **Unassessed** — no current evaluated Not Yet / Usable / Solid evidence.
- **Needs work** — recent Not Yet evidence or the target is still in Learn/Build.
- **Usable** — usable/solid evidence exists, but performance-context confirmation is incomplete or a retention review is due.
- **Ready evidence** — solid transfer/performance evidence exists, the target is in Maintain, and no current review is due.

These labels describe evidence, not guaranteed performance.

## Manual song status versus readiness evidence

The existing Learning / Practicing / Performance-ready song status remains a manual organizational field.

Set Prep never upgrades readiness merely because a song was manually marked Performance-ready. Conversely, a newer Not Yet section or transition can downgrade the set-prep evidence even when the whole song was previously strong.

## Profile and part scope

Assessment is performed for the selected practice profile.

If a song has a part for that profile, section/transition and whole-song targets use that part identity. Shared arrangements are used only when no matching part exists.

## Prep windows

| Days until performance | Window | Main purpose |
|---:|---|---|
| >14 | Build | Repair weak/unassessed sections and transitions |
| 8–14 | Integrate | Reconnect weak spots into complete songs |
| 3–7 | Simulate | Favor continuous song/performance-context work |
| 1–2 | Taper | Short, specific repairs; avoid large new changes |
| 0 | Performance day | Running order, cues, confidence |
| Past | Past performance | Update the date before generating new prep |

A setlist without a date uses Build mode without a countdown.

## Focused prep

Focused prep builds an exact-duration Today plan from current setlist risk.

Target selection is deterministic and stage-aware. It can choose:

- weak sections;
- weak or unassessed transitions;
- whole songs;
- set-order song work as the date approaches.

Focused prep uses at most ten blocks and does not require every song to appear in a short session. That is deliberate: it is a risk-focused session rather than a simulated performance.

## Run-through

Run-through preserves the exact setlist order, including repeated songs.

Every block uses the `perform` intent and `performance` evidence context. This means a later Solid evaluation can become legitimate performance-context evidence in the existing Mastery/Retention system.

A run-through requires at least one minute per setlist entry; otherwise the requested budget is rejected rather than pretending that a few seconds constitutes a meaningful song run.

## Exact session budgets

Supported Set Prep budgets are 10, 15, 20, 30, 45, and 60 minutes.

Selected targets share the requested total exactly. No hidden extra warm-up or overflow time is added.

## Immutable provenance

Generated repertoire blocks snapshot:

- Setlist ID and name;
- performance date when present;
- prep stage;
- Focused or Run-through mode;
- block role;
- original set position;
- Set Prep engine version.

The snapshot survives later setlist edits or deletion, allowing History to explain what the block was preparing for at the time.

## Prescription reasons

Phase 9 extends structured reasons with:

- `setlist-focus`;
- `transition-risk`;
- `performance-simulation`.

Existing `upcoming-performance`, `recent-weakness`, and `neglected` reasons are also used where appropriate.

## Scheduling bookkeeping

Applying a Set Prep plan atomically replaces the selected profile's Today plan and stamps the selected repertoire targets as scheduled.

Fresh target states remain Discover with zero mastery evidence. Scheduling a target is not evidence of playing it.

After a generated session ends, skipped Set Prep blocks increment scheduling skip bookkeeping; a completed generated block resets that skip streak. This remains separate from mastery.

## Manual routine workflow remains

The existing Generate preparation routine action is retained.

That feature creates a normal editable routine and intentionally does not claim Set Prep readiness/provenance. It is useful when the user wants a manually selected long-term routine rather than a staged performance-prep plan.

## User interface

The Setlist page now surfaces:

- current prep window and countdown;
- counts of Ready evidence / Needs work / Unassessed songs;
- per-song evidence label;
- current weak section/transition details;
- Start Set Prep;
- Build Today;
- Generate editable routine.

Today identifies Set Prep plans and individual Set Prep blocks. Focus Player shows the current set-prep stage/role. History retains the immutable set-prep snapshot.

## Compatibility

All Set Prep persistence fields are optional.

No IndexedDB schema migration and no backup-envelope version change are required. Older plans, sessions, and v1–v4 backups remain valid.

## Non-goals

Phase 9 does not predict whether a live performance will succeed, listen to the musician, infer crowd/venue conditions, replace rehearsal judgment, or create a numerical confidence probability.

## Certification

Release certification requires strict TypeScript, complete Node tests, native IndexedDB/service-worker/Web Audio checks, responsive workbench tests, profile/instrument migrations, guided-course regressions, and Chromium/Firefox/WebKit coverage.
