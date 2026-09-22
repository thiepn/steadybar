# Phase 11 — Weekly Review & Adaptive Practice Planning

## Purpose

Phase 11 turns the last seven days of Steadybar evidence into a transparent proposal for the next seven days.

It does not create an AI coach score, does not modify priorities automatically, and does not replace the existing Priority Engine. It reuses the Priority Cycle system already introduced earlier.

## Review window

The Weekly Review is a rolling seven-day window ending today.

Example:

- Current review: September 16–22
- Previous comparison: September 9–15

The Phase 10 diagnostics engine supplies the evidence recap and equal-window comparison.

## Evidence recap

The review shows:

- active practice time;
- active days;
- evaluated Solid / Usable / Not Yet blocks;
- generated Autopilot + Set Prep follow-through;
- Phase 10 diagnostic signals that cross their existing evidence thresholds.

These records are descriptive. More time or more Solid ratings are not presented as a universal improvement score.

## Next-week focus proposal

Steadybar proposes at most three skill areas:

1. Primary — Priority Cycle weight 3
2. Secondary — Priority Cycle weight 2
3. Support — Priority Cycle weight 1

The proposal is generated from the existing Priority Engine rather than a new ranking model.

Signals can include:

- active goals;
- upcoming performance pressure;
- due retention;
- recent weakness;
- musical transfer;
- domain balance;
- neglected material;
- profile focus;
- manual priority evidence;
- recurring Phase 10 limitation patterns when a limitation directly maps to an instrument skill domain.

## Anti-self-reinforcement rule

The currently active Priority Cycle is removed from the ranking input while the next-week proposal is built.

This is essential: an old priority must not keep ranking highly merely because it is already active.

The current cycle remains visible on the page and is unchanged until the user explicitly applies a replacement.

## Proposal ordering

Focus selection follows the existing explainable Priority Engine order.

Skill groups are then ordered using explicit signal tiers:

- Tier 1: upcoming performance, active goal, retention due, recent weakness, or a recurring directly mapped limitation;
- Tier 2: musical transfer, domain balance, neglect, profile focus, or manual priority;
- Tier 3: lower-pressure supporting evidence.

Within a tier, the existing target ranking order is retained. No user-visible composite weekly score is created.

## Editable application

Before applying, every proposed focus can be:

- included or excluded;
- changed between Primary, Secondary, and Support.

Nothing is persisted until Apply priorities is pressed.

At least one priority must remain selected.

## Priority Cycle replacement

Applying the review:

1. completes the current active Priority Cycle for the selected profile, if one exists;
2. preserves that cycle and its items in history;
3. creates one new active Priority Cycle containing the selected weekly focus items.

The operation is atomic through the existing full-workspace transaction and validation path.

## Restore and end

End active priorities completes the current cycle without deleting it.

Restore on a historical cycle creates a new active copy of that cycle's items. The original historical record is never changed back to active, so its original dates and history stay intact.

## Autopilot mapping

The review suggests one existing Autopilot emphasis from the proposed Primary focus:

- repertoire / upcoming performance → Songs;
- timing → Timing;
- technique or coordination → Technique;
- otherwise → Balanced.

This suggestion does not modify Today automatically. Session duration and emphasis remain explicit choices on Today.

## Current-cycle visibility

The Weekly Review page shows:

- current active cycle name;
- start date;
- priority items and strengths;
- persisted item notes;
- End active priorities.

Completed cycles are shown in recent history with Restore actions.

## Persistence

Phase 11 adds no new IndexedDB store and no backup-envelope version.

It reuses PriorityCycle records already stored in the priorityCycles store.

## Safety and integrity

- one active Priority Cycle per profile remains enforced by existing validation;
- only skills belonging to the selected instrument can be applied;
- duplicate skills are rejected;
- at most five Priority Cycle items remain supported, while the automatic review proposes at most three;
- historical cycles are preserved rather than overwritten;
- review generation is runtime-only and does not mutate workspace state.

## Certification

Release certification requires:

- strict TypeScript;
- full Node suite;
- Weekly Review domain tests;
- rendered UI workflows;
- real IndexedDB / service worker / backup / Web Audio checks;
- responsive Weekly Review at 320px through desktop;
- apply / replace / restore browser acceptance;
- profile/instrument migration regressions;
- guided-course regressions;
- Chromium, Firefox and WebKit native lanes.
