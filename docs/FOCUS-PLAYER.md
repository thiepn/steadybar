# Focus Player — Phase 6

## Purpose

Focus Player is the active-practice surface for Steadybar 2.6.

Its job is not to expose every practice feature at once. Its job is to make the current few minutes obvious from a phone, tablet or music stand:

> **See the task → play → rate it → move on.**

Planning remains in Today/Autopilot. History remains in History. Focus Player is deliberately optimized for low-interruption execution.

## Primary surface

The always-visible layer contains only:

- current block number and state;
- Autopilot/practice intent when one exists;
- block title and sticking/pattern where relevant;
- active time and target duration;
- BPM and small tempo steps for pulse-based tasks;
- beat feedback;
- protocol-specific task controls;
- Start / Pause;
- Metronome when relevant;
- Not Yet / Usable / Solid;
- concise next-block preview.

On small screens the result panel stays reachable at the bottom of the viewport.

## Primary completion model

### Not Yet

The requested target was not reliably achieved.

### Usable

It basically worked but still has meaningful weakness.

### Solid

It was reliably performed at the requested challenge.

Choosing one:

1. writes the block evaluation;
2. preserves the Phase 3 evidence context from its prescription;
3. completes the current block;
4. advances to the next block;
5. leaves the next block stopped so practice never starts unexpectedly.

The old unrated completion path still exists under Tools & block options.

## Secondary drawers

Capabilities remain available without permanently occupying visual space.

### Detailed attempt

Contains the existing five tempo-attempt ratings:

- Failed
- Messy
- Acceptable
- Clean
- Effortless

These remain attempt-level information and are still used for legacy clean-tempo analytics.

### Practice cues

Shows the immutable instructions snapshot for the current block.

### What limited it?

Optional limitation tags used with the block-level result:

- Timing
- Coordination
- Memory
- Dynamics
- Tension
- Sound
- Accuracy
- Endurance
- Too fast
- Form

### Tools & block options

Contains:

- Quick note
- Tempo trainer where relevant
- Restart block
- Skip block
- Finish block without rating

### Session queue

Contains the complete ordered session and current/completed/skipped states.

## Session header

The compact sticky topbar contains:

- Save & leave
- Block X / N
- Ready / Count-in / Practicing / Paused
- Session menu

The Session menu contains:

- Appearance
- Fullscreen
- Finish session

Fullscreen is optional. Focus Player itself is always the normal practice layout, so the old “Open sessions in Focus Mode” preference is no longer exposed.

## Responsive contract

### Phone / music stand

- primary controls remain at least 44px tall;
- Not Yet / Usable / Solid stay inside the immediate viewport;
- result panel is sticky;
- no permanent side queue;
- secondary controls do not consume space until their drawer is opened;
- bottom clearance prevents drawers from sitting underneath the result dock.

### Tablet / desktop

- single readable practice column;
- maximum stage width keeps timer/task/result relationships visually close;
- result panel is part of normal document flow rather than permanently following the user;
- queue remains available on demand.

## Protocol-specific tasks

Focus Player does not replace Steadybar’s instrument protocols.

Repetition counters, chord-change rounds, groove review, scale cycles, fretboard prompts, vocal patterns/rest, pitch matching, sight reading and repertoire reflection continue to render their existing task-specific controls between the readout and transport.

Tempo-only controls are not mounted for self-paced protocols.

## Cross-engine disclosure rule

Steadybar explicitly applies:

`details:not([open]) > .focus-drawer-body { display: none }`

and the corresponding Session-menu rule.

This is intentional. Browser UA styles differ, and author layout rules such as `display:grid` must not accidentally make closed-drawer controls measurable or focusable.

## Keyboard

Existing practice shortcuts remain:

- Space — start / pause
- Up / Down — BPM ±1
- Shift + Up / Down — BPM ±5
- N — quick note
- Escape — exit fullscreen

Typing in fields and focused buttons keeps normal browser behavior.

## Data integrity

Phase 6 does not introduce a schema or evidence migration.

It continues to use:

- PracticeController
- atomic session finalization
- PracticeEvaluation
- PracticePrescription snapshots
- Phase 3 mastery derivation
- Phase 4 priority state
- Phase 5 Autopilot scheduling state

Moving a control into a drawer does not change the persisted meaning of that action.

## Explicit non-goals

Focus Player does not change:

- mastery transition rules;
- retention intervals;
- priority weights;
- Autopilot candidate ranking;
- Autopilot time allocation;
- automatic BPM/difficulty progression;
- Set Prep logic;
- MIDI/microphone analysis;
- AI coaching.

Those remain separate phases.
