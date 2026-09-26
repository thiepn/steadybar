# Changelog

## 2.24.0 — Hands-Free Practice Control — 2026-09-25

- Centralize Focus Player keyboard / pedal input in a deterministic practice-remote command mapper rather than scattering shortcut behavior through the page.
- Add **Page Down** as a pedal-friendly Start / Pause alias and **Page Up** as a pedal-friendly metronome toggle.
- Fix metronome toggling during count-in: switching the click now preserves active practice and restarts the count-in instead of leaving the session paused.
- Keep **Space** for transport, **Arrow Up / Down** for ±1 BPM and **Shift + Arrow** for ±5 BPM.
- Add direct block-evaluation shortcuts: **1 = Not yet, 2 = Usable, 3 = Solid**. These call the normal block-completion path and retain selected limitation tags.
- Add **R** for attempt recording, **Shift + R** for normal block restart, **N** for quick note and **F** for fullscreen.
- Add **?** / Shift+/ to open a first-class Practice Controls reference inside Focus Player.
- Route Shift+R through the existing recording-safe restart flow; previous segment time and attempts remain in history exactly as with the visible Restart block action.
- Ignore shortcuts while dialogs, inputs, textareas, selects or editable content are active, and ignore Ctrl/Cmd/Alt-modified or repeated key events.
- Prevent result shortcuts during Ready / Count-in and prevent tempo/metronome shortcuts on self-paced tasks.
- Add `aria-keyshortcuts` to the corresponding visible Focus Player controls for assistive-technology discoverability.
- Add browser Media Session play/pause handlers and synchronize Media Session playback state with the actual practice phase; remove handlers when Focus Player unmounts.
- Add deterministic unit coverage for every shortcut family plus browser coverage for pedal transport, tempo changes, metronome aliases, controls help and keyboard block evaluation.
- No persistence schema or backup-format migration is required.
## 2.23.0 — Grid-Aware MIDI Performance Analysis — 2026-09-25

- Extend MIDI Lab with **Authored Drum Grid** scoring using the first-class Drum Grid protocol from 2.22.
- Let users score the current practice grid or any saved Drum Grid exercise without creating a separate score format.
- Require an explicit grid-lane → MIDI-sound assignment before testing; default suggestions map RH→closed hi-hat, LH→snare, kick→kick and hi-hat foot→pedal hi-hat.
- Do not infer physical hand identity from MIDI. Grid lanes are evaluated only through the sound assignment explicitly chosen for that test.
- Expand the authored grid across the test duration and preserve simultaneous expected hits instead of collapsing them into a generic pulse.
- Match expected hits only to the assigned mapped MIDI sound inside the existing tempo-aware timing window.
- Report exact expected/matched/missed totals, extras, near-time wrong-sound events, unmapped notes and the existing signed timing/velocity diagnostics.
- Add per-grid-lane expected / matched / missed summaries with the saved lane→sound assignment.
- Derive device-relative accent-versus-normal velocity contrast only when matched accent and normal hits are available on the same mapped MIDI sound.
- Reject duplicate MIDI-sound assignments across active grid lanes because MIDI could not identify per-lane accuracy in that configuration.
- Persist the exact grid name, lane pattern and lane→sound assignment with the MIDI result so historical evidence remains interpretable after exercise edits.
- Introduce **MIDI analysis version 2** for authored-grid results while retaining full validation/readability of existing version-1 MIDI history.
- Keep generic Every subdivision, Beat only and 2 & 4 MIDI timing modes unchanged.
- Add deterministic domain tests for simultaneous authored hits, perfect matches, wrong sounds, ambiguous assignments, accent contrast and persisted-result validation.
- Add cross-browser saved-result UI coverage so grid-scored MIDI history remains readable even where live Web MIDI is unavailable.
- No IndexedDB schema or backup-envelope migration is required.

## 2.22.0 — Drum Grid & Coordination Lab — 2026-09-25

- Add a first-class **Drum Grid** practice protocol for explicit right-hand, left-hand, kick and hi-hat-foot patterns.
- Add a dedicated **Drum Grid Lab** with five deterministic pattern families: Accent Grid, Kick Displacement, Linear Flow, Four-Limb Cycle and Independence Builder.
- Add 2× / 3× / 4× subdivision grids, five bounded complexity levels and deterministic variation stepping without hidden randomness.
- Add direct cell editing with rest → hit → accent cycling, whole-pattern rotation and right/left-hand mirroring.
- Add one-bar count-in and Web Audio click preview with an audio-clock-driven grid playhead.
- Add **Start practice**, **Add to Today** and **Save as exercise** actions without creating a second practice-history model.
- Saved grid exercises carry Coordination as the primary skill and Timing as a secondary skill, so existing PracticeState, Priority, progression and Practice Intelligence can use them.
- Persist exact grid lanes inside immutable practice protocol snapshots; later exercise edits do not rewrite historical grids.
- Render the complete limb grid in Focus Player with live subdivision highlighting and normal reflection/block evaluation.
- Validate grid lane uniqueness, meter/subdivision length, allowed cell symbols and percussion-profile compatibility during normal data validation and backup restore.
- Include drum-grid exercises in percussion accent-pattern and orchestration progression dimensions.
- Fix finite trainer session snapshots so Ladder, Pyramid, Burst and Endurance retain their exact configured target duration when launched from saved plans or routines.
- Add deterministic unit and browser coverage for generation, editing, rotation, mirroring, save-to-library, Add to Today, Focus Player snapshots and responsive layouts.
- No IndexedDB schema or backup-envelope migration is required.
## 2.21.0 — Drum Tempo Training V2: Pyramids, Bursts & Finite Trainer Targets — 2026-09-25

- Add a **Pyramid** tempo trainer for controlled speed development: climb from a starting BPM to an exact peak, then descend through the same stages instead of ending at maximum effort.
- Add a **Burst** trainer that alternates explicit recovery tempo with short faster bursts for a fixed number of cycles, then returns to recovery tempo.
- Keep both modes on Steadybar's existing Web Audio metronome and active-practice clock; pausing freezes trainer time and browser background-pause behavior remains unchanged.
- Make Ladder, Pyramid, Burst and Endurance trainers expose their exact remaining practice duration through the normal Focus Player block target and progress bar.
- Improve Ladder completion behavior so it reports completion and safely holds its final tempo instead of appearing to advance forever.
- Add phase-aware Focus Player status for Pyramid climb / peak / descent and Burst recovery / speed cycles with current BPM and remaining stage time.
- Keep Progressive and clean-round Repetition trainers open-ended because their useful completion point depends on the player rather than a predetermined timer.
- Preserve all ordinary practice evidence: attempts, notes, Not Yet / Usable / Solid evaluations, limitation tags, recordings, progression snapshots, PracticeState and Practice Intelligence continue through the same session pipeline.
- Add validation guards that require a Pyramid peak above its start tempo and a Burst tempo above its recovery tempo.
- Add deterministic unit coverage for exact non-divisible Pyramid peaks, Pyramid descent, Burst alternation/recovery, finite trainer duration and invalid degenerate configurations.
- No IndexedDB schema or backup-envelope migration is required. Existing trainer configurations remain valid.

## 2.20.0 — Advanced Practice Intelligence: Unified Weakness Detection, Progression Decisions & Recommendation Engine — 2026-09-23

- Add a single runtime-only **Practice Intelligence** engine over the existing PracticeState, diagnostics, Priority, progression, guided-learning and repertoire signals.
- Add explicit practice actions: **Repair, Retest, Stabilize, Apply, Maintain, Explore**.
- Add separate evidence-gated progression decisions: **Progress, Hold, Consolidate, Regress**.
- Prevent low-evidence targets from receiving a Progress decision even if stale or partial state appears to request advancement.
- Map explicit progression-engine `reduce` decisions to Regress and due-retention/retest states to Hold.
- Let sufficiently evidenced `advance` states produce Progress while Usable/build-stage work remains Consolidate.
- Aggregate skill-level weakness from current target states, repeated Not Yet results, recurring limitation tags, due reviews, progression directions and neglect signals.
- Keep recommendation explanations inspectable: every target carries reasons, structured evidence text, evidence confidence, and the existing exercise progression snapshot when applicable.
- Default the recommendation set to a focused maximum of five targets; explicit callers can request up to twelve for inspection.
- Add an executable recommendation adapter that converts exercise/song/section/transition targets into the existing normal practice blocks. Exercise recommendations preserve the current progression snapshot.
- Add **Start** / **Add to Today** controls to Progress recommendations and a compact **What matters now** panel on Today.
- Add progression-decision badges to Progress and Weekly Review.
- Route Autopilot v2 target ordering through the unified Practice Intelligence ordering rather than raw priority score alone.
- Make Autopilot slot composition role-aware without undoing the unified ranking: slot fit is applied first, then Practice Intelligence order, with raw Priority score only a final tie-break.
- Gate executable exercise progression so a Hold/Consolidate/Retest recommendation cannot accidentally execute a raw `advance` snapshot.
- Carry explicit recommendation profile ownership into shared-song execution instead of depending on the globally active profile at click time.
- Route Weekly Review focus ordering through the same intelligence skill assessments while still neutralizing the currently active Priority Cycle to prevent self-reinforcement.
- Keep the existing Priority Engine factors as explainable context rather than replacing them with an opaque score.
- Keep Voice on the existing rest-aware manual/routine path; Practice Intelligence may summarize Voice evidence, but Autopilot v2 still does not automatically schedule Voice practice.
- Add deterministic unit coverage for low-evidence Hold, explicit Regress, due-retest Hold, Consolidate, Progress, intelligent ordering, executable blocks and recommendation limits.
- Add browser coverage proving a Today recommendation can add the same normal exercise block to the DailyPlan and that Weekly Review exposes the same progression decision.
- No new persistent store, schema migration or backup-envelope change is required. Database remains schema v11 and backup envelope v4.
## 2.19.0 — Curriculum Expansion, Exercise Library, Guided Courses & Repertoire Training Content — 2026-09-23

- Expand Learn from **16 courses / 94 lessons / 188 tasks** to **22 courses / 118 lessons / 236 runnable tasks**.
- Add a distinct static **Repertoire laboratory** course stage after Ensemble application for Drums, Guitar, Bass, Piano and Voice.
- Add four original repertoire/application lessons per principal instrument, covering section-role/texture mapping, transitions, dynamics or note length, contextual repairs and take → repair → retake workflows.
- Expand Custom from one four-lesson Foundation course to two courses / eight lessons with a general Development pathway for observable targets, contextual repair, complete takes and later-day transfer.
- Keep every new lesson inside the existing evidence model: two runnable tasks, explicit criteria, knowledge checks, lesson notes, off-app/session evidence and flexible review suggestions.
- Expand the built-in exercise library from **140 to 170 exercises across the five principal instruments**, adding repertoire-specific transition, section, dynamics, pocket, texture, full-take and repair drills.
- Add three additional general-purpose Custom exercises for contextual repair, complete takes and later-day repertoire checks.
- Add idempotent built-in content reconciliation during database initialization: newly shipped built-ins are added by stable ID, while existing rows with the same IDs—including user edits and archives—are never overwritten.
- Add instrument-specific **Repertoire training** guide cards directly to Song pages. Each profile receives four bounded guides that launch or plan normal existing song/song-section practice blocks with explicit instructions.
- Repertoire guides reuse the current Songs → Today → Focus Player → History pipeline; no second repertoire database or pseudo-score is introduced.
- Voice repertoire guides retain explicit comfort/stop rules and do not turn repeated takes into a stamina target.
- Add deterministic catalog/exercise reconciliation tests and browser coverage proving repertoire guides preserve song/section source IDs when launched.
- No database schema or backup-envelope bump is required beyond Phase 18's existing schema v11 / backup v4; course content is static and new built-ins reconcile into the existing stores.
## 2.18.0 — Local Audio Practice Engine, Track Import, Looping & Tempo-Controlled Repertoire Practice — 2026-09-23

- Add song/part-attached **local repertoire tracks** stored only in the current browser profile.
- Add browser-local binary storage for imported track audio in media database v2, separate from structured workspace state.
- Add structured `audioTracks` metadata/cue persistence and bump the workspace database from schema v10 to v11.
- Keep backup envelope v4. JSON backups include track metadata and section cues but deliberately exclude audio bytes; restored tracks can be relinked on another browser/device.
- Add transactional import, relink and delete flows with binary rollback if the metadata commit fails.
- Reject files larger than 512 MB to avoid unbounded `ArrayBuffer` memory pressure in the current browser-storage implementation.
- Add a dedicated `/audio/:trackId` repertoire player with seek, local volume, 50–150% playback speed and browser-native pitch preservation when supported.
- Add a one-bar metronome pre-roll whose tempo follows the current playback-rate-adjusted song tempo.
- Add A/B loop markers, loop enable/disable, full-track reset and saved per-section loop cues.
- Add direct **Practice section** and **Add to Today** actions that reuse Steadybar's existing song/section practice blocks instead of creating a second history model.
- Keep saved audio cues synchronized with song-section edits: removed sections remove their cues and renamed sections update canonical cue labels.
- Add missing-media recovery behavior and **Relink file** support; replacement files must be long enough for all saved cue endpoints.
- Add song-page local-audio management for shared arrangements and current instrument parts.
- Add reset semantics that explicitly clear both recording and repertoire media only after the existing safety JSON backup is created.
- Add cross-browser native coverage for track binary storage, real WAV metadata probing, playback-rate/loop controls, metadata-only restore behavior and responsive local-audio UI.
- Playback speed uses the browser media engine. Pitch preservation availability and loop-seek smoothness are browser/device dependent; this release does not claim sample-perfect time stretching or DAW-grade looping.
## 2.17.0 — MIDI Drum Integration, Velocity Dynamics & High-Precision Performance Analysis — 2026-09-23

- Add a dedicated **MIDI Drum Lab** for electronic kits and MIDI pads using the browser Web MIDI API.
- Normalize high-resolution `MIDIMessageEvent.receivedTime` timestamps onto the same AudioContext clock used by Steadybar's metronome.
- Ignore note-off and note-on velocity-zero messages and preserve note, velocity and one-based MIDI channel for every measured note-on.
- Add per-device, per-practice-profile drum-note mapping with common General MIDI drum defaults, optional MIDI-channel filtering and **Learn next note** custom mapping.
- Match saved device mappings primarily by normalized manufacturer + device name rather than assuming browser MIDI input IDs are permanently stable.
- Add selectable analysis lanes (`All mapped notes` or one mapped drum voice) so simultaneous groove voices do not have to be treated as timing errors.
- Add explicit expected-hit patterns: **Every subdivision**, **Beat only**, and **2 & 4 backbeat**. Steadybar does not pretend to know a full drum arrangement when no authored MIDI score exists.
- Reuse Phase 16's deterministic one-to-one timing-grid matcher for MIDI events rather than introducing a second timing algorithm.
- Persist signed bias, mean absolute timing error, timing spread, drift, misses, extras, unmapped notes, MIDI velocity mean/median/spread/range and per-voice timing/velocity summaries.
- Add Low / Medium / High measurement confidence based on matched evidence coverage and extra-event rate.
- Capture active session/block/exercise context when a MIDI test is launched during an unfinished drum practice session.
- Bound live event buffers to 20,000 note-ons and refuse to save an overflowed result rather than reporting misleading statistics.
- Cancel active MIDI tests safely if the selected device disconnects.
- Add `/midi-lab` navigation, Timing Lab / Progress / drum-practice links and command-search access.
- Add `midiDeviceProfiles` and `midiResults` IndexedDB stores and bump the structured workspace schema from v9 to v10.
- Keep backup envelope v4; older backups restore with empty MIDI mappings/results and saved MIDI history remains readable on browsers without live Web MIDI support.
- Add deterministic MIDI parser/timestamp/mapping/timing/velocity tests plus schema-v10 and cross-browser responsive-history coverage.
- MIDI velocity is device-relative and is not acoustic loudness or force. Note mapping identifies drum voices only; Steadybar does not infer hand/foot identity, technique quality, health, or full groove-note accuracy without an explicit score.
## 2.16.0 — Timing Lab: Microphone-Based Timing Analysis & Precision Diagnostics — 2026-09-23

- Add a dedicated **Timing Lab** that compares microphone-detected attacks against the same Web Audio clock used by Steadybar's metronome.
- Add a local AudioWorklet onset detector with sample-clock timestamps instead of relying on animation frames or UI timers.
- Add one-bar count-in, 5–180 second tests, BPM/subdivision/click-mode controls, microphone threshold control and manual input-latency compensation.
- Add ambient-noise microphone calibration that suggests a conservative onset threshold without uploading or retaining raw microphone audio.
- Match detected attacks one-to-one against expected subdivision positions inside a bounded tempo-aware window.
- Persist compact diagnostics: expected/detected/matched counts, misses, extras, signed average bias, median offset, mean absolute error, spread, drift per minute, measurement confidence and per-hit matched offsets.
- Add a responsive offset-over-time visualization and timing-history list while keeping the underlying numeric evidence readable without the chart.
- Add Low / Medium / High **measurement confidence** based on amount and cleanliness of matched evidence; confidence is explicitly not a skill or musicianship score.
- Add `/timing-lab` navigation, Metronome/Progress links and command-search access.
- Add a dedicated `timingResults` IndexedDB store and bump the structured workspace database from schema v8 to v9.
- Keep backup envelope v4; modern backups include Timing Lab result data, while older v4 backups restore with an empty timing history.
- Cache the timing onset worklet in the normal offline application shell.
- Add deterministic analysis, repository, backup, native AudioWorklet, responsive UI and cross-browser regression coverage.
- Timing Lab does not infer technique, health, fatigue, limb identity or overall groove quality. Hardware/input latency and speaker-click bleed can affect microphone measurements; headphones are strongly recommended.
## 2.15.0 — Smart Scheduling Calibration & Adaptive Practice Load — 2026-09-23

- Add a deterministic six-week **practice-load calibration** derived only from recorded active practice time.
- Learn typical active-day duration, median active-week minutes, active-day count and recent weekday preference without using ratings, mastery, fatigue, health or hidden quality scores.
- Add Low / Medium / High evidence confidence thresholds so sparse history cannot change schedule load.
- Let profile-default weekly load adapt gradually only when evidence is sufficient, with each generated change bounded to ±30% of the existing baseline.
- Keep explicit Training Cycle weekly load and explicit `weekly-minutes` goals authoritative; calibration never silently lowers or raises those targets.
- Keep explicit `weekly-sessions` goals authoritative for day count while still allowing learned weekday placement.
- Use learned weekday patterns for generated Practice days when evidence is sufficient; retain the deterministic legacy patterns when calibration is disabled or underdetermined.
- Add a **Use recent practice calibration** switch to Calendar generation/regeneration and immediately preview the calibrated versus standard minutes/day count.
- Snapshot calibration provenance into each generated week: evidence window, confidence, observed sessions/days/weeks, typical day, median active week, baseline/source, suggested load, suggested days, weekday ranking, and whether load/pattern changed.
- Surface the calibration snapshot on saved Calendar weeks and add a read-only next-week scheduling-load preview to Weekly Review.
- Keep generation Draft-first and user-controlled: calibration never creates DailyPlans, starts practice, applies a week, changes goals, rewrites Training Cycles or mutates history.
- Add domain and browser regression coverage for bounded load adjustment, explicit-target authority, low-evidence fallback, learned Tue/Thu/Sat placement and the calibration toggle.
- No IndexedDB schema or backup-envelope change is required; calibration is derived at generation time and stored only as optional source metadata on an existing Weekly Schedule.
## 2.14.0 — Recordings & Practice Evidence Core — 2026-09-23

- Add local microphone **Record attempt** capture directly inside the Focus Player.
- Store large audio blobs in a separate local IndexedDB media database instead of serializing them into workspace state.
- Add durable profile-scoped recording metadata with session, block, exercise/song/section and BPM context plus attempt numbering.
- Add a `/recordings` evidence library with local playback, per-recording audio export, self-rating, notes, Favorite, Milestone and one Current best marker per target.
- Show recording counts in History and surface session-linked evidence on session detail pages.
- Add explicit microphone lifecycle guards so leaving, finishing, skipping or restarting while recording requires discarding the unsaved capture first.
- Release microphone tracks and object URLs when capture/playback ends.
- Increment the structured workspace database to schema version 8 with a dedicated `recordings` metadata store.
- Keep backup envelope version 4. Backups include recording metadata but deliberately exclude large local audio blobs; older v4 backups restore with an empty recording collection.
- Add unit/database/profile/course/workbench coverage for recording metadata, schema migration and backup compatibility.
- This release does not perform automatic audio-quality grading, trimming, waveform editing, synchronization or cloud upload.

## 2.13.0 — Weekly Schedule & Practice Calendar Orchestration — 2026-09-22

- Add persistent Monday–Sunday **Practice Calendar** scheduling between Weekly Review and Today.
- Add a durable `weeklySchedules` IndexedDB store and database schema version 7 migration. Existing profile workspaces receive an empty schedule collection.
- Keep backup envelope version 4: new modern backups include `weeklySchedules`, while older v4 backups without the field remain valid and restore with an empty collection.
- Enforce one Weekly Schedule per profile and week, with exactly seven ordered Monday–Sunday day records.
- Add Draft → Applied workflow so generated weeks influence nothing until explicitly applied.
- Add **Practice**, **Optional**, and **Rest** day types. Rest days store zero planned minutes; Optional minutes are visible context but are excluded from the weekly practice target.
- Generate exact weekly practice minutes from the active Training Cycle when its phases overlap the week, then fall back to active weekly-minute goals and profile defaults.
- Use an active weekly-session goal to inform scheduled practice-day count when present, while validating that planned minutes fit the chosen number of days.
- Snapshot the Training Cycle/phase names and active Priority Cycle used during generation so later upstream changes do not silently rewrite a saved week.
- Map the active one-week Priority Cycle to day emphasis ahead of the long-term Training Phase when it clearly represents Timing, Technique/Coordination, or Repertoire.
- Add editable day duration, emphasis, note, and day type without touching historical sessions or existing DailyPlans.
- Add Calendar source context, setlist performance-date markers, DailyPlan presence, and recorded active-time summaries without an adherence or consistency score.
- Applied Calendar entries prefill Today’s session duration and emphasis but never lock controls, auto-start practice, or prebuild future DailyPlans.
- Preserve the voice rest-aware routine path while allowing an applied Calendar entry to prefill any supported 5–180 minute voice routine fit.
- Preserve all canonical Autopilot layouts and add an exact scheduled-duration path for whole-number sessions from 5–180 minutes; 60 minutes is now a canonical preset.
- Add `/calendar` and `/calendar/:weekStart` navigation plus previous/current/next week browsing and responsive day cards.
- Link Weekly Review and Today to Calendar while keeping Weekly Review and Today as explicit decision/execution gates.
- Add domain, storage, backup, Autopilot, browser and responsive coverage for generation, editing, applying, source snapshots and Today prefill.

## 2.12.0 — Long-Term Goals, Training Cycles & Periodization — 2026-09-22

- Add persistent profile-scoped **Training Cycles** for explicit multi-week planning above Weekly Review and one-week Priority Cycles.
- Add a durable `trainingPlans` IndexedDB store and schema version 6 migration. Existing workspaces upgrade with an empty plan collection.
- Keep the backup envelope at version 4: modern backups include `trainingPlans`, while older v4 backups without the field remain valid and restore with an empty collection.
- Generate draft-first cycles from 2 weeks up to 1 year with contiguous dated phases that exactly cover the plan window.
- Add Foundation, Build, Reduced-load consolidation, Integrate, Simulate, Taper, Consolidate, and Custom phase types.
- Add explicit phase weekly-minute targets, Autopilot emphasis, Primary / Secondary / Support skill focuses, and notes.
- Use linked goals, setlists, instrument skill relationships, profile focus and repertoire context to seed phase focuses without changing the linked goals or their deadlines.
- Performance-linked cycles end with Simulate and Taper phases and shift late-cycle focus toward repertoire.
- Longer non-performance cycles can include a reduced-load consolidation phase; this is presented as a planning template, not a medical or physiological prescription.
- Let users edit phase load, emphasis, skill focuses and notes while preserving contiguous date boundaries. Regenerating the whole cycle is required to change phase boundaries.
- Add explicit Draft / Active / Paused / Completed / Archived lifecycle. Activating a plan pauses the previous active plan for that profile instead of deleting or overwriting it.
- Allow only one active Training Cycle per profile and validate that phase focuses belong to the plan profile's instrument.
- Add an explainable `training-phase` Priority factor at lower weight than the existing Weekly Review Priority Cycle, preserving short-term user choice and urgent goals/retention/performance signals.
- Surface active Training Cycle context inside Weekly Review and mark linked goals with an Active cycle badge.
- Add `/cycles` navigation, cycle index/detail views, milestone context, calendar progress, current-week active minutes, responsive phase timeline and per-phase editing.
- Add domain, storage, backup, Priority, Weekly Review and browser coverage for periodization, activation history, migration, restore and responsive UI.

## 2.11.0 — Weekly Review & Adaptive Practice Planning — 2026-09-22

- Add a dedicated **Weekly Review** workspace using a rolling seven-day window and the immediately preceding seven days for context.
- Reuse the Phase 10 diagnostics engine for the weekly evidence recap instead of creating a second analytics model.
- Generate at most three next-week skill-area suggestions from the existing explainable Priority Engine.
- Neutralize the current active Priority Cycle while computing the replacement proposal so last week's priorities cannot automatically reinforce themselves.
- Let current goals, due retention, recent weakness, upcoming performances, neglect/balance, musical transfer, profile focus and recurring limitation evidence shape the proposal.
- Expose every suggested focus with explicit reasons and example targets rather than a hidden coach score.
- Make the proposal editable before application: each suggestion can be excluded and its Priority Cycle strength changed between **Primary**, **Secondary**, and **Support**.
- Keep planning user-controlled: no Priority Cycle changes occur until **Apply priorities** is pressed.
- Applying a proposal atomically completes the previous active cycle and preserves it in history rather than overwriting it.
- Add **End active priorities** and **Restore** actions; restoration creates a new active copy while preserving the historical source cycle unchanged.
- Derive a suggested existing Autopilot emphasis (Balanced / Songs / Timing / Technique) from the proposed primary focus without changing Today settings automatically.
- Add `/review` navigation, responsive Weekly Review UI, Progress → Weekly Review linkage, and full mobile support.
- Add domain and browser coverage for rolling windows, runtime-only review generation, anti-self-reinforcement, validated cycle replacement, restore/end behavior, editable strengths and responsive UI.
- No new IndexedDB store or backup-envelope migration is required; Phase 11 reuses the existing Priority Cycle persistence model.

## 2.10.0 — Practice Analytics & Diagnostic Intelligence — 2026-09-22

- Add a runtime-only diagnostics engine derived from authoritative sessions and PracticeState instead of persisting stale analytics caches or opaque scores.
- Compare bounded date ranges against the immediately preceding equal-length window for active practice time, active days and evaluated Solid / Usable / Not Yet result mix.
- Require minimum evaluation coverage before emitting directional result insights; insufficient evidence is surfaced explicitly instead of extrapolated.
- Add recurring-limitation diagnostics using exact tagged-block counts, including comparison with the previous equal window.
- Surface current retention reviews that are due without treating due dates as automatic skill decay.
- Detect meaningful Peak / Working / Cold tempo reliability gaps and show the underlying BPM values instead of collapsing them into one “speed” metric.
- Summarize Autopilot + Set Prep follow-through separately from mastery, including completed, skipped and ended-early generated blocks.
- Aggregate Phase 8 progression outcomes by challenge dimension and flag repeated Not Yet friction only when multiple evaluated challenge blocks support it.
- Add a current mastery-state distribution and an inspectable evidence-state table with latest result, evidence count, last practice, review status and Peak / Working / Cold tempo.
- Expand Progress with equal-window trends, deterministic diagnostic cards, retention/tempo reliability, recurring limitations, progression outcomes and generated-practice follow-through while preserving all existing time, distribution, tempo, task, frequency and goal views.
- Keep all analytics profile-scoped and responsive from 320px mobile layouts through desktop.
- Add unit and browser coverage for trend windows, minimum-evidence safeguards, recurring limitations, due reviews, tempo gaps, generated follow-through, progression friction and responsive diagnostics UI.
- No IndexedDB or backup-format migration is required.

## 2.9.0 — Set Prep & Performance Readiness — 2026-09-22

- Add an evidence-based Set Prep engine on top of dated setlists, existing repertoire PracticeState, Priority, Mastery/Retention and performance-context evidence.
- Classify each setlist song as **Unassessed**, **Needs work**, **Usable**, or **Ready evidence** instead of inventing an opaque numerical readiness score.
- Keep readiness profile/part-specific: a manual song status such as `performance-ready` never fabricates evaluated evidence, and a newer weak section or transition can override otherwise strong whole-song evidence.
- Add staged preparation windows from the performance date: **Build** (>14 days), **Integrate** (8–14), **Simulate** (3–7), **Taper** (1–2), and **Performance day**.
- Add **Focused prep** generation that prioritizes weak/unassessed sections and transitions according to the current prep window.
- Add ordered **Run-through** generation that preserves the exact setlist order, including repeated songs, and records `perform` context so successful simulations become performance evidence.
- Make Set Prep sessions exact-duration at 10/15/20/30/45/60 minutes while requiring at least one minute per song for full run-throughs.
- Persist immutable setlist/stage/mode/role/set-position snapshots with generated blocks and show them in Today, Focus Player and History.
- Stamp Set Prep targets as scheduled atomically and track generated skips independently from mastery, matching Autopilot’s bookkeeping discipline.
- Preserve the existing manual **Generate preparation routine** workflow as a separate editable, non-evidence-based option.
- Keep set-prep metadata optional, requiring no IndexedDB or backup-envelope migration and preserving older sessions/backups.
- Add deterministic domain and cross-browser acceptance coverage for prep windows, readiness evidence, transition risk, due retention, exact budgets, ordered run-throughs, skip bookkeeping and mobile Set Prep UX.

## 2.8.0 — Exercise Progression Engine — 2026-09-22

- Add a deterministic Exercise Progression Engine on top of the existing Mastery/Retention `reduce / hold / advance` signal instead of inventing a second mastery model.
- Progress exercises across one challenge dimension at a time while preserving the other effective conditions: tempo, duration, metronome subdivision support, click density, gap click, accent pattern, dynamics, percussion orchestration, memory demand, and musical context.
- Keep progression conservative: unseen/early-learning material establishes or holds a baseline; advancement requires the existing separated solid evidence; repeated established failure reduces difficulty.
- Base tempo changes on proven Working/Peak evidence before authored or historical fallback values, so failed high-speed experiments cannot become the next prescribed tempo.
- Inherit Phase 7 timing evidence, including sparse, one-click-per-bar and gap-click difficulty, when deciding what to progress next.
- Store an optional immutable progression snapshot on each generated exercise block so History can reconstruct exactly what challenge was attempted.
- Clear stale generated progression evidence whenever the user manually changes BPM, timing-click mode, protocol, duration, or tempo-trainer configuration.
- Add **Next challenge** actions to exercise pages while preserving the ordinary baseline **Start practice** path; surface challenge cues in Today, Focus Player and History.
- Apply progression to Autopilot exercise blocks without changing its exact 5/10/15/20/30/45-minute budget allocation; ramp-in slots cannot automatically escalate difficulty.
- Do not automatically escalate voice exercises; vocal work remains on its explicit range/rest-aware practice path.
- Keep all new persistence fields optional, so older sessions, settings and backup envelopes remain valid without an IndexedDB or backup-format migration.
- Add deterministic unit and browser coverage for one-axis progression, reduce/hold/advance behavior, timing inheritance, accent progression, exact Autopilot budgets, voice safety, immutable snapshots and responsive UI.

## 2.7.0 — Metronome & Timing Training — 2026-09-22

- Add first-class timing-click modes to the Web Audio scheduler: Standard, 2 & 4, Sparse, One click per bar, and Gap click.
- Keep count-ins fully audible, preserve the configured accent pattern and subdivision in standard/audible bars, and apply structural timing-mode changes at bar boundaries.
- Add practical gap-click progressions: 3 click / 1 silent, 2 / 2, 1 / 3, plus configurable audible and silent bar counts.
- Add sparse click density at every 2, 3, or 4 beats and one-click-per-bar practice so timing difficulty can rise without forcing BPM upward.
- Add a standalone automatic tempo ramp with start BPM, step, interval, and ceiling controls; ramp time begins after count-in rather than during it.
- Add a compact Timing click control to the Focus Player; the effective click difficulty is stored as optional immutable block evidence without changing mastery, retention, Priority, or Autopilot rules.
- Suppress visual beat highlighting when the selected timing mode is silent so gap practice cannot be bypassed by watching the screen.
- Persist timing-click configuration in metronome settings and presets while keeping the new field optional for older backups and saved data.
- Add unit coverage for legacy compatibility, subdivisions/accents, 2 & 4, sparse clicks, one-click-per-bar, gap cycles, audible count-ins, bar-boundary updates, and validation.

## 2.6.0 — Focus Player rebuild — 2026-09-22

- Rebuild active practice around a single-column Focus Player instead of a workspace plus permanent queue sidebar.
- Keep the primary playing surface limited to current block identity, active time, relevant tempo controls, protocol task controls, Start/Pause, Metronome, and Not Yet / Usable / Solid.
- Make Not Yet / Usable / Solid the primary finish-and-advance controls; completing a result saves evidence and moves immediately to the next block.
- Move legacy five-level tempo attempt ratings into a collapsed **Detailed attempt** drawer without removing them.
- Move practice cues, limitation tags, quick note, tempo trainer, restart, skip, unrated Finish block, and the full session queue into collapsed secondary drawers.
- Replace the old action-heavy practice header with a compact sticky header containing Save & leave, block/status context, and a **Session** menu for Appearance, Fullscreen, and Finish session.
- Keep protocol-specific task panels fully functional while hiding tempo controls for non-tempo protocols and using a full-width transport there.
- Make the result controls fixed/sticky and touch-sized on narrow phones so the three completion choices remain reachable from a music stand without scrolling through secondary tools.
- Preserve desktop keyboard controls, recovery semantics, fullscreen support, immutable history, PracticeController behavior, Autopilot prescriptions, mastery evidence, and scheduler bookkeeping.
- Add viewport certification from 320px phones through desktop: primary controls must remain readable/in-viewport, drawers start collapsed, secondary controls remain discoverable, and Solid must advance automatically to the next block.
- No Mastery, Priority, Autopilot, planner, persistence, or course semantics change in this phase.

## 2.6.0 — Focus Player rebuild — 2026-09-22

- Rebuild active practice as a single-column Focus Player centered on the current block instead of a permanent workspace plus queue sidebar.
- Keep the always-visible layer to the information needed while playing: block identity/intent, active time, tempo/beat feedback, protocol task controls, Start/Pause, Metronome, and Not Yet / Usable / Solid.
- Make Not Yet / Usable / Solid the primary block-completion controls; saving a result advances to the next block without automatically starting it.
- Move detailed five-level tempo attempts into a collapsible Detailed attempt drawer while preserving all historical attempt semantics and best-clean tracking.
- Move practice cues, limitation tags, Quick note, Tempo trainer, Restart, Skip, unrated Finish block, and the full session queue into explicit secondary drawers rather than removing them.
- Add a compact sticky session header with Save & leave plus a Session menu for Appearance, fullscreen and Finish session.
- Add a mobile/music-stand sticky result dock and responsive one-screen contract; core controls remain at least 44px and within the viewport down to 320×568.
- Keep protocol-specific practice controls, vocal safety/recovery, session recovery, keyboard shortcuts, audio timing, persistence, immutable history and Autopilot prescriptions unchanged.
- Make closed disclosure content explicitly hidden in author CSS so Firefox, Chromium and WebKit agree on drawer geometry.
- Retire the obsolete “Open sessions in Focus Mode” setting from the UI because all sessions now use Focus Player; retain its stored compatibility field without migration.
- Add cross-engine regression coverage for primary-surface geometry, closed drawers, legacy tool accessibility and result-driven block advancement.
- Phase 6 changes presentation and interaction hierarchy only; mastery, retention, priority ranking and Autopilot composition rules remain unchanged.

## 2.5.0 — Practice Autopilot v1 — 2026-09-21

- Add deterministic Practice Autopilot composition on top of the Phase 3 Mastery Engine and Phase 4 Priority Engine.
- Support exact 5, 10, 15, 20, 30 and 45 minute sessions with explicit slot roles rather than simply taking the top-ranked targets.
- Add Balanced, Songs, Timing and Technique session intents; user emphasis constrains primary work when matching material exists while application/retention slots can still preserve useful variety.
- Compose ramp-in, primary, application, secondary, retention and repertoire blocks with fixed exact-duration templates; the 5-minute rescue session deliberately skips a generic warm-up. Short sessions cap genuinely new material when familiar alternatives exist, with goal/performance exceptions.
- Generate exercise, whole-song, song-section and persistent-transition blocks with immutable Autopilot PracticePrescription snapshots and structured reason codes.
- Prevent false learning evidence by using retest/apply/perform contexts only when the chosen target and slot genuinely qualify; ordinary fallback work retains its current mastery intent.
- Atomically replace Today’s plan and stamp every selected PracticeState with lastScheduledAt, creating evidence-free Discover states only when needed for scheduler bookkeeping.
- Track Autopilot skips independently from mastery: skipped generated blocks increment consecutiveSkips/lastSkippedAt and completed generated blocks reset the skip streak.
- Make Today Autopilot-first with a low-friction Start Autopilot path plus a Build plan preview/edit path while retaining saved routines, manual blocks and free practice. Voice profiles retain the existing rest-aware routine builder until a dedicated rest-aware voice composer exists.
- Preserve Autopilot prescriptions across duration/cue edits but clear them when a user changes the block’s underlying exercise/song/section source, preventing evidence attribution to a stale target; transition labels remain intact for source-preserving edits.
- Add unit, repository-transaction and Chromium/Firefox/WebKit acceptance coverage for exact budgets, intent constraints, transitions, prescription metadata, scheduling state, skip bookkeeping and the two-click launch flow.
- Difficulty progression, Set Prep staging, advanced timing modes, MIDI/microphone analysis and AI remain intentionally outside Autopilot v1.

## 2.4.0 — Priority engine — 2026-09-21

- Add a deterministic, runtime-only Priority Engine that ranks concrete practice targets without persisting or displaying a pseudo-scientific score.
- Combine active goals, medium-term PriorityCycles, due retention, recent weakness, neglect, musical usefulness, recent domain balance and upcoming dated setlists into inspectable signed factors.
- Add conservative penalties for very recent repetition, recent scheduling, repeated skips, missing prerequisite evidence, exercise-level mismatch and stable maintenance work that is not due.
- Make future snoozed targets ineligible while keeping them inspectable for debugging; manual priority overrides remain independent from musical mastery.
- Rank exercises, songs, song sections and persistent transitions while keeping broad skill nodes and Learn lessons out of the schedulable candidate pool for now.
- Propagate song goals and setlist urgency to the song's sections/transitions so the later Autopilot can isolate concrete repertoire work.
- Use active PriorityCycles instead of older profile-focus weighting when a cycle exists, while retaining profile focus as a fallback for workspaces without an active cycle.
- Keep prerequisites as a soft penalty rather than a gate, preserving music-first practice while reducing accidental advanced-material dominance.
- Route the existing Suggested exercises panel through the new engine and surface its strongest structured explanation.
- Add deterministic regression coverage for goals, priority cycles, retention due dates, weakness, repetition, repertoire urgency, snoozes, skips, prerequisites, domain balance, legacy workspaces and non-mutation.
- Session composition, time budgeting, diversity/fatigue constraints and automatic scheduler bookkeeping remain intentionally deferred to Phase 5.

## 2.3.0 — Mastery & retention engine — 2026-09-21

- Turn the Phase 2 practice-state foundation into a deterministic mastery engine with Discover → Learn → Build → Stabilize → Retest → Apply → Maintain progression for concrete practice targets.
- Keep legacy-only history honestly Unassessed; historical clean attempts can still establish Peak BPM without fabricating modern working/cold reliability.
- Separate Peak, Working and Cold tempo: working/cold levels require repeated modern solid evidence on separated occasions, while failed experiments above established working tempo do not demote mastery.
- Add conservative review scheduling and maintenance spacing while explicitly treating inactivity as a due-review signal rather than automatic skill loss.
- Tolerate one weak retained-skill result; repeated Not Yet evidence at or below the established level can move the target back toward Build and recommend reduced challenge.
- Keep broad skill-domain states as coverage/evidence containers rather than falsely assigning domain-wide mastery or BPM from a few exercises.
- Upgrade rebuildable practice state to mastery engine v2 while preserving manual priority and snooze overrides from engine-v1 backups.
- Commit ended session history and rebuilt mastery state atomically; ordinary live-session updates can no longer end practice through a weaker write path.
- Add optional block-level Not Yet / Usable / Solid summaries and limitation tags while retaining detailed five-level tempo attempts and unrated Finish block compatibility.
- Add unit, repository-transaction and browser acceptance coverage for mastery transitions, retention, tempo semantics, atomic rollback and active-practice summaries.
- Priority scoring, Autopilot generation, advanced timing modes, MIDI/microphone analysis and AI remain intentionally outside Phase 3.

## 2.2.0 — Unified practice-state foundation — 2026-09-21

- Add the Phase 2 practice-model foundation without changing Steadybar into an automatic coach yet: canonical practice targets, Not Yet / Usable / Solid evaluations, practice prescriptions, mastery-state vocabulary and deterministic target identities.
- Add static instrument skill graphs, including the nine canonical drum domains, while keeping legacy categories and existing multi-instrument practice protocols compatible.
- Add rebuildable normalized evidence over immutable sessions, tempo attempts, protocol outcomes and lesson reviews; historical evidence can establish known facts such as peak clean tempo without fabricating working tempo, cold tempo, retention or mastery.
- Add persistent `practiceStates` and `priorityCycles` in IndexedDB schema 5, plus deterministic state rebuilding that preserves manual scheduling overrides.
- Add backup envelope v4 while retaining v1–v3 imports and keeping the original `music-practice-os` storage identifier.
- Add persistent song-transition identities and cleanup of derived state when current source content is removed, while leaving historical session snapshots intact.
- Preserve the existing PracticeController, Web Audio engine, Learn system, routines, songs, setlists and session history; priority scoring, mastery transition rules and Autopilot remain intentionally deferred to later phases.
- Extend Node and native Chromium/Firefox/WebKit migration, backup and practice-state regression coverage.

## 2.1.1 — Post-release integrity audit — 2026-09-09

- Scope remembered lesson tempo to the lesson that supplied it, preventing a custom tempo from silently leaking into another lesson while retaining safe duration and vocal-range convenience.
- Derive current-revision session evidence from the immutable supporting session during whole-workspace validation; reject orphaned or altered evidence while retaining unknown historical course revisions.
- Apply the same 0.5–120 minute limits to imported off-app evidence that live review entry already enforces, and validate current-revision review shapes even when the outcome is “Practice again”.
- Make the generic session repository APIs uphold the one-active-session and learning-reference invariants instead of relying solely on the dedicated practice controller; generic inserts can no longer overwrite an existing session/history row.
- Show lesson-attributable evidence time in the review picker instead of total time from unrelated blocks in the same session.
- Avoid rewriting every inactive course record's timestamp when selecting another course.
- Prevent sight-reading task edits from restoring first-read status for an already-started or already-known passage; genuinely changed material may still be explicitly marked new.
- Rebuilding an existing Today starter plan now preserves its ID/creation time while monotonically advancing `updatedAt`.
- Keep entity metadata and future source references coherent during workspace-level edits: exercise edits now stamp themselves and affected parent plans/routines; canonical exercise/song-section labels follow source renames/removals without rewriting custom titles or history.
- Harden onboarding over migrated workspaces so protected historical custom attribution buckets cannot become the selected practice profile, and onboarding profile changes advance metadata.
- Add Node and browser regressions for all of the above; the complete existing Chromium, Firefox and WebKit release suite remains mandatory.

## 2.1.0 — Guided instrument courses — 2026-09-09

- Add Learn: 16 original courses, 94 lessons and 188 runnable tasks, with distinct Foundations, Skill development and Ensemble application pathways for the five principal instruments.
- Add actual teaching, worked patterns/diagrams, isolation/application, easier/harder variants, repair advice, performance criteria, knowledge questions, review history and lesson notes. Custom instruments receive an honestly scoped practice-method course.
- Integrate lesson launch, non-destructive Today planning, profile-aware search/progress and return-to-lesson session history. Keep lesson ownership as immutable session/block provenance.
- Add explicit self-check assessments and flexible review suggestions; do not award skill completion for reading, elapsed time, placement or confidence. Separate actual app evidence from explicitly reported off-app practice.
- Require personally chosen vocal ranges, bound complete intervals/patterns and include rest in short vocal lesson budgets. Do not mislabel displayed reading examples as unseen first reads.
- Add IndexedDB courseProgress store in physical schema 4 without renaming the database or rewriting old practice history. Export whole-workspace backup v3; retain v1/v2 import support.
- Add curriculum contract, state, transaction rollback/concurrency, guided UI, migration, backup/offline and responsive tests; retain every previous release gate.
- Document primary educational/research sources and the limits of self-directed, self-reported learning.

## 2.0.1 — Profile system hardening — 2026-09-08

- Move profile management out of the dirty Settings form into a dedicated `/profiles` workspace, with Settings and command-search links back to it.
- Allow profile switching and profile creation while an unfinished session exists; the session remains pinned to its original profile and the global one-session guard still prevents parallel practice.
- Preserve multiple ordered focus areas when editing profiles instead of silently collapsing them to one, and keep all selected focuses available to recommendations.
- Give blank new profiles deterministic unique names such as `Guitar 2`, reject ambiguous explicit duplicates, and default Custom profiles to the neutral `general` family.
- Treat `Earlier practice` as a read-only historical attribution bucket: it cannot be selected, edited, archived, searched as an actionable practice source, or own a new session.
- Repair older v2 workspaces whose active/primary selection points at `Earlier practice`; if an older UI archived every real profile, restore one real profile without touching history.
- Add History profile filtering so archived and historical sessions can be reviewed without switching the active practice workspace.
- Label recovery banners with the unfinished session's owning profile and keep cross-profile recovery explicit.
- Retain `primaryProfileId` only as an internal compatibility/fallback pointer rather than a user-facing second selection concept.
- Expand regression coverage for selection repair, historical-session guards, active-session switching/creation, multi-focus editing, unique names, custom defaults, cross-profile History, and the new profile route.

## 2.0.0 — Instrument-specific practice profiles — 2026-09-08

- Add stable multiple practice profiles, instrument-specific skills/focus/capabilities, profile management and guarded switching.
- Replace compulsory drum/BPM exercise fields with 11 typed protocols and protocol-specific outcome records.
- Add 140 starter exercises across Drums, Guitar, Bass, Piano and Voice, exact-duration templates and capability-based Custom profiles.
- Add chord counts, fretboard note checks, bass groove reviews, piano key/hand cycles, first-reading evidence, bounded vocal reference patterns and explicit self-assessment.
- Preserve existing session timing, four drum tempo trainers, locks, metronome, recovery, theme choices and sans-serif interface.
- Scope Today, library, routines, goals, progress, history and search; preserve full-workspace backup and shared repertoire.
- Add instrument song parts and independent sections/readiness/arrangement notes, with correct practice and setlist snapshots.
- Upgrade the existing database transactionally to physical schema 3, normalized workspace 2 and backup envelope 2. Preserve a downloadable original; continue importing v1 backups.
- Add typed validation, deterministic migrations, relationship safety, selective profile writes, audio cancellation and domain/native/browser regression coverage.
- Document educational and measurement limits; microphone grading, recording and generated backing tracks remain deliberately unadvertised.


## 1.4.0 — Practice workbench

- Researched task-grouped music tools, structured collections, accessibility and interaction performance; documented route-by-route decisions in `docs/DESIGN-RESEARCH.md`.
- Replaced the layered stylesheet with a coherent warm-neutral/charcoal visual system and six mode-specific accent palettes.
- Rebuilt Today as an editable agenda with secondary routine/progress context.
- Grouped the active timer, BPM, beat feedback, transport, attempt ratings and block controls; kept static identity/queue out of beat-time DOM updates.
- Reworked metronome, repertoire rows, routine previews, setlist programs and review/settings sections without removing capabilities.
- Added bounded exercise rendering and retained search/filter/view context; indexed best clean tempo in one pass.
- Made chart coordinates respond to their containers without shrinking text.
- Improved search selection announcements, dialog styling and mobile/rail navigation.
- Added cross-engine native/browser gates, exact responsive geometry tests, large-library and contrast regressions.
- Preserved database, backup, lock identifiers, audio scheduler, history and safe offline updates.


## 1.3.0 — interface and appearance — 2026-09-08

- Replace promotional headings and redundant dashboard cards with a plan-first Today view and list-first exercise library.
- Add System / Light / Dark modes and six accent palettes, persisted without discarding edits or interrupting audio.
- Refine desktop, tablet, and phone navigation; reflow controls, dialogs, forms, collections, and active sessions.
- Consolidate block actions into an accessible options dialog; preserve drag-and-drop and serialized inline edits.
- Preserve keyboard focus when opening and closing dialogs.
- Add palette, theme persistence, legacy backup, prepaint, and viewport regression tests.
- Keep generated builds out of source control; deployment still requires both rendered and native browser checks.

## 1.2.0 — Steadybar — 2026-09-08

- Adopted **Steadybar** across application chrome, onboarding, page titles, installable-app metadata, error dialogs and exported backup filenames.
- Kept the original IndexedDB name, Web Locks, cross-tab channel, service-worker cache namespace and version-1 backup format for continuity with Music Practice OS 1.1.
- Prepared application metadata and relative-path deployment files for `thiepn/steadybar`; the source upload remains pending because the connection rejected part of it.
- Added explicit regression coverage for the public name, relative PWA scope, legacy storage and backup compatibility.


## 1.1.0 — 8 September 2026

Continues the recovered Music Practice OS implementation without replacing its working feature set.

### Data integrity

- Added reusable commit-aware transaction handling, strict-durability requests with a narrow compatibility fallback, and explicit abort/rollback on failures.
- Validated the complete payload at the database replacement boundary, including nested IDs, source requirements, names, ranges and duplicates.
- Protected completed history and the active block against stale queued commands and refreshed committed state after failed writes.
- Made restored active sessions pause at their saved checkpoint before the replacement becomes visible.
- Guarded restore/reset with session and audio leases, including cancellation-safe concurrent acquisition.
- Preserved custom metronome accents and imported custom meters when editing unrelated preferences or metadata.

### Audio and practice

- Retained the count-in-to-practice clock boundary even when the main thread misses the first practice event.
- Added arithmetic catch-up for long scheduler gaps without bursts of stale audio or unbounded loops.
- Prevented late, cancelled AudioContext starts from reviving playback or stopping a newer start.
- Preserved normal browser-modified shortcuts and ignored practice controls once a session is complete.
- Kept another tab’s persisted state visible without treating stale local state as authoritative.

### Interface and analytics

- Spaced chart points by actual calendar dates, keeping gaps honest and avoiding duplicate single-date labels.
- Separated the chart’s minimum vertical scale from actual recorded peak duration, including sub-minute and sub-second sessions.
- Bounded Today’s weekly time to the current Monday–Sunday week.
- Removed deferred dialog autofocus that could steal focus after another field had already been selected.
- Kept the existing restrained light/dark desktop and mobile interface, with fresh responsive and populated-state QA.

### Verification and delivery

- Added repository transaction-failure/rollback tests, lock/scheduler/history/chart regressions, and new rendered-browser workflows.
- Added a real-origin browser-test gate to the GitHub Pages workflow. The workflow is included but was not run against a remote repository.
- Included refreshed evidence, architecture notes, the full source and precompiled static build.
- Real IndexedDB reload, real service-worker offline reopen and real backup/restore/reload remain unverified here because managed browser policy blocks localhost navigation. Rendered-memory tests and transaction-adapter tests are explicitly distinguished from those checks in `docs/QA.md`.
