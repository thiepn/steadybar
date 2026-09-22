# Phase 8 — Exercise Progression Engine

## Purpose

Phase 8 answers a different question from the Priority Engine and Mastery Engine:

- Priority chooses **what** deserves practice.
- Autopilot chooses **where it fits** in a session.
- Mastery/Retention determines whether evidence says to **reduce, hold, or advance**.
- Exercise Progression chooses **how the selected exercise should become easier, stay stable, or become harder**.

The progression engine does not create a second mastery score. It consumes the existing PracticeState challenge signal.

## Central rule: one variable at a time

A generated challenge changes at most one difficulty dimension. This keeps the resulting evidence interpretable.

For example, a recommendation may raise tempo OR remove click support OR add a memory demand. It does not simultaneously raise tempo, remove the click, increase duration and change orchestration.

A generated progression also carries forward the effective tempo, target duration, subdivision support and timing-click pattern from the current evidence. These preserved conditions are part of the prescription but are not counted as changed axes. This prevents a sparse-click recommendation from accidentally resetting a proven tempo to the exercise’s authored default, or a tempo step from silently discarding an established gap-click condition.

## Challenge dimensions

| Dimension | Progression idea |
|---|---|
| Tempo | Small controlled BPM step based on proven tempo evidence |
| Duration | Extend or shorten the controlled set |
| Subdivision support | Reduce metronome subdivision information while the played pattern remains unchanged |
| Click density | Standard → 2 & 4 / sparse → sparser → one click per bar |
| Gap click | 3 on / 1 silent → 2 / 2 → 1 / 3 |
| Accent pattern | Original accents → moving accent → alternating placements → phrase contour |
| Dynamics | Normal → quiet control → contrast → dynamic shape |
| Orchestration | Original surface → one change → two surfaces → musical/full-kit application |
| Memory | Full cues → partial memory → from memory → memory under variation |
| Musical context | Isolated → short phrase → exercise/phrase alternation → repertoire transfer |

Not every dimension applies to every exercise. Eligibility is derived from the exercise protocol, instrument family and current mastery stage.

## Reduce / Hold / Advance

### Hold

Hold repeats the latest explicit generated challenge when it is still applicable. Otherwise it uses a conservative baseline.

### Advance

Advance is only honored when the existing Mastery Engine already emitted the advance signal. Early/unassessed material stays at baseline even if a caller asks for progression.

### Reduce

Reduce first steps back the most recent generated challenge on the same axis. If no applicable challenge exists, limitation tags choose a conservative repair axis. Examples include Too fast → tempo, Endurance → duration/tempo, Memory → memory, and Timing → click-density/gap/tempo.

## Tempo safety

Tempo progression anchors to established Working BPM when available, then Peak BPM, then authored tempo. A failed experimental high BPM is not promoted into the next recommendation.

Tempo steps are deliberately small and bounded by exercise minimum/maximum or target limits.

## Phase 7 timing evidence

Timing-click evidence from Phase 7 is usable even when a historical block predates Phase 8 progression snapshots.

One-click-per-bar, sparse-click and gap-click settings are translated into progression levels so the engine does not accidentally prescribe an easier click as though the user had only practiced Standard mode.

## Accent progression

Accent-pattern progression is cue-based in Phase 8. Steadybar does not silently rewrite the standalone metronome's per-beat accent array because that array is not currently an immutable per-practice-block snapshot.

The generated cue itself is saved in the progression snapshot, making the intended accent challenge reconstructable without claiming an audio condition that was not persisted.

## Persistence

RoutineBlock may optionally contain a generated ExerciseProgression. When the session begins, PracticeBlock stores an immutable progressionSnapshot.

All new fields are optional. No IndexedDB schema migration or backup-envelope version increase is required.

Manual edits are authoritative. Editing BPM, duration, timing-click mode, exercise protocol or tempo trainer removes stale generated progression metadata when the generated condition is no longer guaranteed.

## Autopilot

Autopilot retains its exact fixed session budgets.

- Exercise slots can receive a progression prescription.
- strictDuration prevents the progression engine from expanding a slot.
- ramp-in slots pass allowAdvance=false, so a warm-up cannot silently become a harder challenge.
- repertoire selection/composition behavior is unchanged.

## Voice

Voice exercises do not receive automatic Phase 8 difficulty escalation.

Voice remains on the existing explicit comfortable-range, rest/listening and protocol-specific path. Phase 8 therefore avoids automatically increasing pitch range, duration, density or vocal workload.

## User control

Exercise pages show a separate Next challenge card.

- Start practice = ordinary exercise conditions.
- Start next challenge = generated progression.
- Add next challenge to today = generated progression inserted into Today.

The recommendation is therefore inspectable and optional rather than silently changing normal exercise launch.

## Evidence visibility

Generated progression appears in:

- Today / planned block rows;
- Focus Player;
- exercise history;
- full session History.

This lets the user distinguish, for example, Solid at normal click from Solid with a sparse click or a memory challenge.

## Explicit non-goals

Phase 8 does not add microphone timing detection, MIDI grading, automatic performance scoring, AI coaching, automatic vocal progression, or an opaque numeric difficulty score.

## Certification

Release certification requires strict TypeScript, the full Node test suite, real IndexedDB/service-worker/Web Audio checks, responsive workbench coverage, profile migrations/instrument workflows, guided-course regressions, and native Chromium/Firefox/WebKit lanes.
