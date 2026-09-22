# Phase 7 — Metronome & Timing Training System

## Goal

Make the click a timing-training instrument rather than only a tempo reference. Difficulty can now increase by removing information from the click, not only by increasing BPM.

## Timing modes

| Mode | Audible reference |
|---|---|
| Standard | Existing beat/subdivision grid and authored accents |
| 2 & 4 | Beats 2 and 4 only; subdivisions are silent |
| Sparse | One click every 2, 3, or 4 beats across bar lines |
| One click per bar | First beat of each bar only |
| Gap click | A configurable number of audible bars followed by silent bars |

The default gap progressions are:

1. 3 bars click → 1 bar silent
2. 2 bars click → 2 bars silent
3. 1 bar click → 3 bars silent

The user can also choose other audible/silent bar counts in the standalone metronome.

## Count-in contract

Count-in is always rendered with the normal authored beat/subdivision pattern, regardless of the selected timing-training mode. Sparse or silent training begins only when practice begins.

This prevents the exercise setup itself from becoming ambiguous and keeps the existing practice timer rule intact: count-in never contributes active practice time.

## Visual contract

Visual beat indicators mirror **audible** clicks only.

A deliberately silent beat or silent gap bar does not flash on screen. This matters because a visual pulse during a silent measure would provide the exact timing reference the exercise is intended to remove.

## Tempo ramp

The standalone metronome supports an automatic ramp defined by:

- starting BPM;
- BPM increment;
- interval in seconds;
- maximum BPM.

The ramp clock begins at the first practice beat after count-in. It clamps at the maximum and never wraps.

The existing block-specific tempo trainers remain unchanged. Phase 7 does not reinterpret historical tempo attempts or modify mastery evidence.

## Focus Player integration

Timing training remains secondary to the Phase 6 playing surface.

**Tools & block options → Timing click** exposes Standard, 2 & 4, Sparse, One click per bar, Gap click, sparse density, and common gap progressions.

Changing this control changes the metronome configuration. It does not restart the block, create an attempt, alter a result, or change the PracticePrescription.

## Scheduler semantics

Timing modes are implemented in the Web Audio scheduling clock.

- BPM changes remain immediate.
- Volume changes remain immediate.
- Meter, subdivision, and click-structure changes take effect at a bar boundary.
- Count-in uses the standard click.
- The scheduler still catches up after throttling without bursting stale notes.
- Silence is represented as scheduled events with accent 0, so transport timing remains continuous.

## Persistence and compatibility

The MetronomeConfig timing field is optional.

Older settings, presets, and backups therefore validate without migration and resolve to the Standard click. Newly saved settings and presets include the timing configuration.

No IndexedDB version or backup-envelope version changes in Phase 7.

## Explicit non-goals

Phase 7 does not add microphone timing detection, MIDI timing analysis, automatic grading, backing tracks, AI coaching, new Mastery/Retention/Priority/Autopilot rules, or session-generation changes.

## Certification targets

Phase 7 must preserve strict TypeScript compilation, existing scheduler/count-in/timer behavior, legacy backup validation, Focus Player primary-control geometry, standalone metronome responsiveness, offline/PWA behavior, and Chromium/Firefox/WebKit browser suites.

Unit coverage specifically verifies legacy fallback, standard subdivisions/accents, 2 & 4, sparse clicks, one-click-per-bar, gap cycles, audible count-in, bar-boundary updates, and invalid timing configuration rejection.
