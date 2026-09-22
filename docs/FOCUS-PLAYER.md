# Focus Player — Phase 6

## Purpose

The Focus Player is Steadybar's active-practice surface.

Its job is not to expose every practice feature at once. Its job is to keep the drummer or musician inside the current task with the minimum interaction needed to:

1. understand the block;
2. start or pause;
3. hear/control the click when relevant;
4. complete task-specific actions;
5. record the overall result;
6. move to the next block.

All existing advanced controls remain available, but secondary controls no longer compete with the main playing surface.

## Primary information hierarchy

Always visible when relevant:

- block number / session status;
- Autopilot/practice intent when present;
- block title and sticking/pattern;
- active time and target time;
- BPM and ±1 / ±5 controls for tempo-capable blocks;
- beat indicator;
- Start / Pause;
- Metronome on / off;
- protocol-specific task actions;
- **Not Yet / Usable / Solid**;
- next-block preview.

The result controls are the canonical block-completion path.

## Primary result behavior

### Not Yet

Saves a `not-yet` block evaluation and advances.

### Usable

Saves a `usable` block evaluation and advances.

### Solid

Saves a `solid` block evaluation and advances.

For all three:

- selected limitation tags are included;
- the current immutable session remains the evidence ledger;
- Phase 3 mastery state is updated by normal session-finalization behavior;
- the next block becomes Ready rather than auto-starting audio.

Phase 6 deliberately does **not** automatically start the next block. Physical setup may need to change between blocks.

## Secondary drawers

Collapsed by default:

### Detailed attempt

Retains the legacy five-level tempo-attempt system:

- Failed
- Messy
- Acceptable
- Clean
- Effortless

These remain detailed within-block attempt records. They do not replace the overall Not Yet / Usable / Solid result.

### Practice cues

Shows authored exercise/lesson instructions when present.

### What limited it?

Optional tags:

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
- Tempo trainer where applicable
- Restart block
- Skip block
- Finish block without an overall rating

### Session queue

Contains the full block sequence and current/completed/skipped state.

## Session-level controls

The sticky top bar contains:

- Save & leave
- current block number
- session status
- Session menu

The Session menu contains:

- Appearance
- Fullscreen
- Finish session

This keeps infrequent global actions available without turning the header into a toolbar.

## Tempo vs non-tempo blocks

Tempo-capable blocks show:

- BPM
- ±1 / ±5
- click
- beat indicator
- detailed attempt drawer
- tempo trainer

Non-tempo protocols remove irrelevant tempo controls and expand Start/Pause to the available transport width.

The protocol-specific task panel remains first-class rather than being hidden in a generic drawer.

## Mobile / music-stand contract

At narrow widths:

- no permanent right-hand queue;
- one column;
- touch targets ≥44px for primary actions;
- time/BPM remain large and readable;
- Start/Pause and Metronome remain near the top of the work surface;
- Not Yet / Usable / Solid remain fixed near the bottom with safe-area padding;
- enough bottom content padding prevents the fixed result panel from covering drawers/content;
- secondary controls stay collapsed until requested.

The release matrix explicitly checks 320×568, 360×800, 375×812, 390×844, 412×915 and 430×932 in addition to tablets/desktops.

## Block transitions

When a rated block completes:

1. evaluation is saved;
2. the controller finishes the current block;
3. the next block becomes active in Ready state;
4. the Focus Player redraws the new title/task/readouts;
5. the page returns to the top of the new block;
6. audio remains stopped until the user presses Start.

This is deliberate hands-on control rather than continuous auto-play.

## Keyboard controls

Existing shortcuts remain:

- Space — Start/Pause
- Arrow Up/Down — ±1 BPM
- Shift + Arrow Up/Down — ±5 BPM
- N — Quick note
- Escape — leave fullscreen

Shortcuts are ignored while typing in form controls or while dialogs are open.

## Recovery

Recovered sessions keep the existing recovery actions:

- Resume saved session
- End and keep history
- Discard saved session

Phase 6 changes presentation only; recovery/storage semantics are unchanged.

## Explicit non-goals

Phase 6 does not change:

- PracticeController state semantics;
- session persistence/history;
- mastery/retention rules;
- priority ranking;
- Autopilot composition;
- Set Prep;
- difficulty progression;
- timing-training modes;
- MIDI or microphone analysis;
- AI.

Those systems can evolve independently of the Focus Player.
