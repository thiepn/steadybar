# Steadybar

A local-first practice workspace for **Drums, Guitar, Bass, Piano, Voice and custom instruments**. Each profile has its own exercises, practice protocols, plans, results, progress and guided learning record.

Plan a session, use task-specific counters, cues or reference tones, and review what you actually practiced. No account, required backend, telemetry, remote fonts, or runtime npm dependencies.

## Run

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open `http://localhost:4173`. For a production build:

```sh
npm run build
npm run preview
```

The downloadable release ZIP includes `dist/`; that copy can run `npm run preview` without installing dependencies. Git checkouts intentionally exclude generated `dist/`. Do not open the application through `file://`.

## Practice Intelligence — 2.20.0

Steadybar now has one **Practice Intelligence** layer that combines the evidence systems already present in the app instead of adding another hidden coach model. It reads current PracticeState, diagnostics, due reviews, explicit goals/priorities, repertoire urgency, guided-learning state, and the existing progression engine, then produces a small set of explainable next actions.

Each recommendation has two separate outputs. The **practice action** is one of `Repair / Retest / Stabilize / Apply / Maintain / Explore`. The **progression decision** is one of `Progress / Hold / Consolidate / Regress`. Low evidence cannot produce `Progress`; an explicit progression-engine reduction becomes `Regress`; due retests remain `Hold`; usable/build-stage work becomes `Consolidate` until stronger evidence exists.

Progress shows the recommended targets with evidence, reasons, and any generated next progression. Exercise/song recommendations can be started immediately or added to Today through the same ordinary practice-block path used everywhere else. Today surfaces up to three relevant **What matters now** actions, while Weekly Review uses the same intelligence ordering for proposed skill focus instead of maintaining a separate weakness-ranking model.

Autopilot is now **v2** and consumes the unified intelligence ordering. This changes which eligible targets are considered first, but it does not make Autopilot autonomous: users still choose duration/emphasis and explicitly build/start the plan. Voice remains on its existing rest-aware planning path rather than being automatically scheduled.

Practice Intelligence is rebuilt from authoritative data at runtime and is not persisted as an opaque score. No schema or backup change is required; workspace schema remains v11 and backup envelope remains v4.

See [Practice Intelligence architecture and decision rules](docs/PRACTICE-INTELLIGENCE.md).

## Curriculum, exercise library & repertoire training — 2.19.0

Steadybar's guided catalog now contains **22 original courses, 118 lessons and 236 runnable lesson tasks**. Drums, Guitar, Bass, Piano and Voice each progress through **Foundations → Skill development → Ensemble application → Repertoire laboratory**. Custom profiles now have a second general practice-method course rather than being left with Foundation only.

The new Repertoire laboratory lessons focus on applying existing skills to real material: section-role/texture maps, transition windows, dynamics or note-length control, complete takes, targeted repairs and comparable retakes. They use the same self-check/evidence/review model as every other guided lesson; elapsed time is still not treated as automatic proficiency.

The built-in exercise library now contains **170 exercises across the five principal instruments**, with additional repertoire drills for section mapping, contextual transitions, arrangement contrast and take → repair → retake work. Existing workspaces receive missing new built-ins automatically at startup, but Steadybar never overwrites an existing exercise/routine row with the same stable ID, preserving user edits and archives.

Song pages also include **Repertoire training** cards tailored to the active instrument. Starting one creates an ordinary song or song-section practice block; adding one to Today uses the same normal planning/history model. These guides provide structure, not automatic musical scoring.

See [Phase 19 curriculum architecture and content contract](docs/CURRICULUM-2.19.md).

## Local audio repertoire practice — 2.18.0

Songs can now carry **browser-local audio tracks** for repertoire work. Import an audio file on the Song page, open its local player, slow it down or speed it up from 50–150%, set A/B boundaries, and save loop boundaries directly to existing song sections.

The player uses the browser's media engine. Pitch preservation is enabled when the browser exposes it; otherwise Steadybar warns that speed changes may alter pitch. A one-bar metronome pre-roll is available and follows the effective playback tempo. A/B looping seeks back to the saved start boundary and is intended for practical repetition—not claimed as sample-perfect DAW looping.

Local-audio practice stays connected to Steadybar's real repertoire model. Saved cues reference existing song-section IDs, `Practice section` launches the normal Focus Player, and `Add to Today` creates the same normal song-section block used elsewhere. Removing a section automatically removes only its linked audio cue.

Imported track bytes live in Steadybar's separate local media database and are **not included in JSON backups**. Backup envelope v4 stores track metadata and cues so another device/browser can show the missing track and let you relink the local file. Workspace database schema is now v11; the media database is v2.

See [local repertoire audio architecture and limitations](docs/LOCAL-AUDIO-PRACTICE.md).

## MIDI Drum Lab — 2.17.0

Steadybar now supports electronic drum kits and MIDI pads through a dedicated **MIDI Drum Lab**. Live note-on timestamps are normalized from the browser's high-resolution MIDI clock onto the same AudioContext clock as the metronome, then analyzed with the same deterministic grid-matching core used by Timing Lab.

Connect a Web MIDI input, keep the General MIDI drum defaults or teach Steadybar custom pad notes, optionally filter one MIDI channel, then run a timed test. Results include signed early/late bias, mean absolute timing error, spread, drift, misses/extras, unmapped-note counts, MIDI velocity median/spread/range and per-mapped-voice summaries.

For honest analysis, users explicitly choose both an **analysis lane** and an **expected-hit pattern**. `Snare + 2 & 4` is suitable for a backbeat lane; `Hi-hat + Every subdivision` works for repeated subdivision lanes; `All mapped notes` is intended for single-stroke/pad exercises. Without an authored note-by-note drum score, Steadybar does not claim complete groove-note correctness.

Device mappings are saved per practice profile. The app stores drum-voice identity only and does not infer left/right hand or foot. MIDI velocity is a device-specific 1–127 value—not acoustic dB, stick force or a universal dynamics score.

Live Web MIDI availability depends on browser/platform support and is strongest in Chromium-based browsers. Firefox/WebKit can still read saved MIDI history and use the rest of Steadybar normally. Structured MIDI data uses database schema v10 while the backup envelope remains v4.

See [MIDI Drum Lab architecture and limitations](docs/MIDI-LAB.md).

## Timing Lab — 2.16.0

Steadybar now includes a local **Timing Lab** for microphone-based onset analysis. The metronome and microphone detector share the same Web Audio clock, so expected grid positions and detected attacks are compared on one audio-time reference instead of through UI timers.

Run a 5–180 second test at a chosen BPM, subdivision and click mode. Timing Lab stores compact diagnostics including signed early/late bias, mean absolute error, spread, drift, misses/extras and matched-hit offsets. A simple offset-over-time plot is visual only; all important values are also rendered as text.

Use **Calibrate microphone** in a quiet room to derive a conservative onset threshold, and enter a known input-latency compensation when needed. Use headphones whenever possible: speaker clicks can enter the microphone and be detected as attacks. The app does not automatically claim hardware-independent precision.

Timing Lab keeps raw microphone audio out of the result database. Structured results use database schema v9 and remain inside backup envelope v4. Measurement confidence indicates how much clean matching evidence was available; it is not a musicianship, health, technique or readiness score.

See [Timing Lab architecture, metrics and limitations](docs/TIMING-LAB.md).

## Smart scheduling calibration & adaptive practice load — 2.15.0

Calendar can now learn from the previous six weeks of **recorded active practice**. With enough evidence, it estimates a typical active-day duration, median active-week volume and the weekdays you actually tend to practice. That context can prefill a more realistic draft week instead of always using the same generic Monday/Wednesday/Friday pattern.

The adaptation is deliberately conservative. Profile-default weekly load may move by at most ±30% per generated week, and only with Medium/High evidence confidence. Explicit **Training Cycle** weekly load and explicit **weekly-minute goals** remain authoritative; explicit weekly-session goals keep their requested day count. Calibration never uses ratings, mastery, fatigue, health, streaks or an opaque readiness score.

Calendar generation includes a **Use recent practice calibration** switch, and every generated week keeps the exact evidence snapshot that influenced it. Weekly Review also shows a read-only next-week load preview before anything is generated or applied. The feature remains Draft-first: nothing changes Today until the user explicitly generates and applies a schedule.

Phase 15 adds no new database store and does not change backup format. See [practice-load calibration architecture](docs/PRACTICE-LOAD-CALIBRATION.md).

## Recordings & practice evidence — 2.14.0

Active practice now includes a lightweight **Record attempt** control. It captures microphone audio for the current block and saves contextual metadata such as the profile, session, block, exercise/song section, BPM and attempt number. The flow is intentionally short: start capture, play, stop and save, then continue practicing.

Open **Recordings** to replay evidence, add a self-rating or note, and mark an attempt as Favorite, Milestone or the current Best for that target. Session History shows which sessions have attached recording evidence. Steadybar does not grade the audio automatically; labels and ratings remain explicit user evidence.

Recording audio is stored locally in a separate media IndexedDB so large blobs do not enter normal workspace state. Structured recording metadata uses database schema v8 and is included in the existing backup envelope v4. **Audio blobs are not included in JSON backups**, so important recordings should be preserved separately before browser data is cleared. Nothing is uploaded automatically.

See [practice recordings architecture and limitations](docs/PRACTICE-RECORDINGS.md).

## Weekly Practice Calendar & schedule orchestration — 2.13.0

Steadybar now has a persistent Monday–Sunday **Practice Calendar** between Weekly Review and Today. A week can be generated from the active Training Cycle, weekly time/session goals, current Priority Cycle and profile defaults, then edited as seven explicit Practice / Optional / Rest days.

Generated weeks begin as **Drafts** and affect nothing until applied. Applying a week does not create seven DailyPlans. Instead, when Today matches an applied Practice or Optional entry, the existing Today builder is prefilled with that day’s duration and emphasis. The controls remain editable and blocks are generated only when the user explicitly builds or starts practice, so current mastery and retention evidence stay fresh.

Calendar shows planned minutes, recorded active practice, scheduled-day activity, performance dates and existing DailyPlans without computing an adherence score. Rest days remain advisory rather than restrictive; all ordinary practice controls stay available.

Weekly Schedules use their own IndexedDB store (schema v7). Backup envelope v4 is unchanged: new backups include schedules, while older v4 backups restore with an empty schedule collection. Canonical Autopilot layouts remain unchanged, with 60 minutes added as a canonical preset and exact calendar-supplied durations supported from 5–180 whole minutes.

## Long-term Training Cycles & periodization — 2.12.0

Steadybar now has persistent **Training Cycles** for planning a development block over multiple weeks. A cycle can link existing goals and setlists, then divide its exact date range into contiguous phases such as Foundation, Build, Integrate, Simulate, Taper, Consolidate, and—on longer cycles—a reduced-load consolidation phase.

Cycles are **draft-first**. Creating or regenerating one does not affect practice scheduling until it is explicitly activated. Only one cycle can be active per profile; activating another pauses the previous one and preserves it. Phase workload, Autopilot emphasis, skill focuses and notes remain editable, while phase dates stay fixed to preserve a gap-free timeline unless the user explicitly regenerates the schedule.

An active phase contributes a modest, fully explained `training-phase` signal to the existing Priority Engine. It is intentionally weaker than an applied Weekly Review Priority Cycle, so long-term direction informs practice without overriding next-week choices, active goals, due retention, or upcoming performance work.

Weekly-minute targets and calendar progress are planning context rather than musicianship scores. Reduced-load and taper phases are scheduling templates, not medical or physiological prescriptions. Linked goals and performance dates are never silently rewritten.

Training Cycles use their own IndexedDB store (database schema v6). The existing backup envelope remains v4: new backups include cycles, and old v4 backups remain restorable.

## Weekly Review & adaptive planning — 2.11.0

The new **Weekly Review** page turns the last seven days of practice evidence into an explicit proposal for the next seven days. It reuses the existing diagnostics and Priority Engine rather than introducing another opaque coaching model.

Steadybar first reviews the rolling seven-day window, then generates up to three suggested skill priorities. The currently active Priority Cycle is deliberately removed from the ranking input while the proposal is calculated, so an old focus cannot keep recommending itself merely because it was already active. Goals, retention, recent weakness, repertoire urgency, neglect/balance, musical transfer, profile focus and recurring limitation evidence remain visible reasons.

Suggestions are not applied automatically. Each one can be excluded or changed between **Primary**, **Secondary**, and **Support** before applying. Applying the review completes the previous active Priority Cycle and keeps it in history. Previous cycles can later be restored as a new active copy, and the current cycle can be ended without deleting its record.

The review also suggests which existing Autopilot emphasis best matches the primary focus, but Today remains the place where session duration and emphasis are explicitly chosen.

## Practice analytics & diagnostics — 2.10.0

Progress now combines the existing practice-time, distribution, tempo, task, frequency and goal views with a runtime-only diagnostics layer. The analytics engine is rebuilt directly from current sessions and PracticeState every time; there is no cached “AI score” that can drift away from the underlying evidence.

For bounded date ranges, Steadybar compares the selected window with the immediately preceding equal-length window. It can surface changes in active practice, active days and evaluated **Solid / Usable / Not Yet** result mix. Directional result insights require minimum evidence in both periods; otherwise the app explicitly says the trend is underdetermined.

Additional diagnostic views expose recurring self-reported limitation tags, due retention reviews, Peak / Working / Cold tempo gaps, Autopilot + Set Prep follow-through, Phase 8 progression outcomes, current mastery-state distribution and an inspectable per-target evidence table. Every diagnostic includes the concrete counts or BPM values behind it.

These signals are deliberately descriptive. Higher practice time is not automatically better, a due review is not proof of decay, repeated limitation tags are not a medical or technical diagnosis, and no single score is presented as “musicianship.”

## Set Prep & performance readiness — 2.9.0

Dated setlists now have an evidence-based **Set Prep** workspace. Steadybar does not assign a pseudo-precise readiness percentage; each song is classified as **Unassessed**, **Needs work**, **Usable**, or **Ready evidence** from the selected profile/part’s current practice evidence.

The prep window changes as the performance approaches: **Build** focuses on weak sections and transitions, **Integrate** reconnects those details into complete songs, **Simulate** favors continuous performance-context work, **Taper** keeps changes smaller, and **Performance day** prioritizes running order and confidence. A manual `performance-ready` song label remains useful organization, but it cannot manufacture a Ready evidence state.

**Focused prep** uses current weak/unassessed repertoire to build an exact-duration Today plan. **Run-through** keeps the exact set order and records `perform` context; successful run-through evaluations can therefore support later performance-readiness evidence. Every generated block keeps an immutable snapshot of the setlist, prep stage, mode, role, and set position.

Set Prep remains optional. The older **Generate preparation routine** action is still available for users who want a normal editable routine without Set Prep semantics.

## Exercise progression — 2.8.0

Exercise practice can now use a **Next challenge** recommendation driven by Steadybar’s existing mastery/retention evidence. The progression engine changes **one variable at a time** rather than treating BPM as the only form of difficulty or stacking several changes together. Proven/current tempo, duration, subdivision support and click conditions are carried forward so changing one axis does not silently reset another.

Depending on the exercise and evidence, the next challenge may adjust tempo, controlled duration, metronome subdivision support, click density, gap/silent measures, accent pattern, dynamics, percussion orchestration, memory demand, or musical context. Phase 7 sparse/gap-click evidence is carried forward instead of being treated as ordinary standard-click practice. A generated challenge is saved with the practice block so History can show the conditions that were actually attempted.

The recommendation remains optional. **Start practice** still launches the ordinary exercise, while **Start next challenge** or **Add next challenge to today** uses the generated progression. Manual edits override the recommendation and remove its generated-evidence label. Autopilot can attach progression to exercise blocks while preserving its exact session duration. Voice exercises are not automatically escalated.

This remains a deterministic practice-planning aid, not automatic performance analysis: Not Yet / Usable / Solid and most quality feedback are still user-reported unless a protocol explicitly performs a structured check.

## Drum Grid & Coordination Lab — 2.22.0

Drum profiles now include a dedicated **Drum Grid Lab** for explicit four-limb coordination work without turning Steadybar into a sequencer. It generates deterministic Accent Grid, Kick Displacement, Linear Flow, Four-Limb Cycle and Independence patterns across eighth-note, triplet and sixteenth-note subdivisions.

Every grid is editable. Cells cycle through rest, hit and accent; patterns can be rotated or mirrored; complexity and numbered variations change one coordination demand without hidden randomness. A one-bar count-in and Web Audio preview use Steadybar's existing audio-time clock, and Focus Player highlights the current subdivision while the exact saved grid remains visible.

A grid can be practiced immediately, added to Today, or saved as a normal custom exercise. Saved grids are attributed to Drum Coordination with Timing as a secondary skill, so they participate in the existing PracticeState, progression and Practice Intelligence systems. Historical sessions retain the exact grid snapshot that was actually practiced.

The grid is a practice target, not an automatic technique score. Steadybar records the pattern and normal practice evidence, but does not infer limb technique, physical strain or coordination quality from the grid itself.
## Drum tempo training — 2.21.0

The Focus Player now has six integrated tempo trainers: **Progressive**, **Repetition**, **Ladder**, **Pyramid**, **Burst**, and **Endurance**. They run inside ordinary exercise sessions, so changing the tempo-training method does not create a separate history or scoring system.

**Pyramid** builds a deterministic climb to an exact peak BPM and then mirrors the stages back down. **Burst** alternates a recovery BPM with a faster BPM for short fixed cycles and returns to recovery after the final burst. Ladder, Pyramid, Burst and Endurance set an explicit block target from their configured stages; Progressive and clean-round Repetition remain open-ended. Pausing freezes trainer time.

These tools prescribe metronome conditions, not technique quality. Speed should only rise while timing, sound and relaxed movement remain controlled; Steadybar does not infer physical strain or safe personal limits.

## Metronome & timing training — 2.7.0

The metronome now supports **Standard**, **2 & 4**, **Sparse**, **One click per bar**, and **Gap click** modes alongside the existing 1×/2×/3×/4× subdivision and per-beat accent controls. Gap training includes 3 bars click → 1 silent, 2 → 2, and 1 → 3 progressions; sparse mode can click every 2, 3, or 4 beats. Count-ins stay audible, while intentionally silent beats do not flash visually.

The standalone metronome also has a configurable **Tempo ramp** (start BPM, increment, interval, ceiling). The Focus Player exposes timing-click selection under Tools & block options without changing the current practice block, evidence, mastery, retention, Priority, or Autopilot result model. Timing modes are scheduled on the Web Audio clock rather than JavaScript UI timers.

## Guided courses — 2.1.0

The original 2.1 release introduced **16 courses, 94 lessons and 188 runnable tasks**. The current 2.19 catalog has **22 courses, 118 lessons and 236 tasks**: the five principal instruments add a four-lesson Repertoire laboratory after Ensemble application, and Custom adds a four-lesson Development course without pretending to provide specialist technique tuition for every instrument.

| Instrument | Course progression |
|---|---|
| Drums | Rebound and subdivision → backbeats, coordination, fills → dynamics, form and ensemble cues. |
| Guitar | Tuning, string contact, readable chord-fret diagrams → rhythmic changes, triads, fingerpicking and note patterns → capo, texture and arrangement. |
| Bass | Touch and two-hand muting → note length, roots/fifths/thirds, chord tones and anticipations → coordination with drums and supportive lines. |
| Piano | Keyboard geography and hand coordination → scales, triads, inversions, articulation and prepared reading → comping, transposition and ensemble form. |
| Voice | Comfort and stopping rules → pitch patterns, short phrases, breath coordination and harmony → unison, entrances, microphone awareness and vocal pacing. |

Every lesson contains teaching, an original worked example, isolation and application tasks, easier/harder variants, a common mistake and repair, observable performance criteria, a knowledge question and a lesson note. Chord tables, rhythm grids and selected local pitch references are provided where relevant. Teaching and examples remain available offline.

**Practice this lesson** creates a normal two-block session. **Add lesson to Today** appends those tasks without replacing your existing plan. Session history links back to the exact owning profile and lesson. An unfinished session cannot be silently reassigned to another lesson.

Finishing a timer does **not** pass a lesson. A self-check needs both practice tasks, every performance criterion and the correct knowledge answer. Actual completed guided sessions can support the check; explicitly reported off-app practice is kept separate from app session time. Reading a lesson, placement checklists and confidence ratings do not award proficiency. Failed checks remain useful observations without penalties. Later reviews use a flexible organizational heuristic, not a scientifically validated mastery prediction. No lessons are locked.

Voice setup requires a personally chosen comfortable root/range and a new comfort confirmation; complete patterns **and interval endpoints** must fit. Its 5–10-minute lesson budget includes rest, listening and reflection, not continuous singing. Stop for discomfort or hoarseness; the app cannot assess vocal health. Displayed reading examples are prepared reading, not unseen first reads. Pitch references use equal-duration sine tones and do not reproduce written rhythm or listen to your playing.

See the [course audit and research](docs/COURSES-2.1-AUDIT.md), [course architecture and QA](docs/COURSES-2.1-ARCHITECTURE.md), and [2.1 upgrade/backup guide](docs/MIGRATION-COURSES-2.1.md). This is a bounded self-directed course library, not teacher certification, accredited grades, full staff-notation tuition, a professional instrumental program or automatic performance analysis.

## Included workflows

| Profile | Distinct practice experience |
|---|---|
| Drums | Drum Grid coordination work, sticking, subdivisions, accents, clean-tempo attempts and six integrated tempo trainers, including pyramid and burst work. |
| Guitar | Chord sequences with clean/total counts, objectively checked fretboard recall, scales with key/position/technique, and repertoire passages. |
| Bass | Groove/harmonic cues, time/control/muting/articulation reviews, chord-tone work and fretboard recall. |
| Piano | Scale/key cycles, hands/ motion/fingering, reference patterns, and first-read versus repeated-reading results. |
| Voice | User-bounded pitch/pattern references, interval reproduction, syllables, ease/fatigue self-reviews, and no compulsory BPM. |
| Custom | Eight instrument families with compatible protocols; not a promise of a specialist curriculum. |

There are **170 starter exercises** across the five principal instruments and profile-specific **15/30/45/60-minute templates**, alongside the preserved older drum routines. Edit any template or create your own task. A routine is a suggestion, not a required schedule.

Shared infrastructure includes daily plans, reusable routines, metronome, sessions, pause/resume, recovery, notes, history, goals, command search and safe offline updates. Songs can have separate instrument parts, section lists, arrangement notes and readiness; setlists remain shared. Profile switching never rewrites an active or historical session. Archive profiles rather than deleting their history.

Use the profile selector or Settings → Manage profiles to open the dedicated Practice profiles workspace. Create, rename, switch, archive and restore profiles there. The selected profile controls Library, Today, routines, goals and progress; song compositions and backups remain workspace-wide. Switching profiles never changes the identity of an unfinished session, which stays pinned until it is finished or ended. The standalone metronome is available to every instrument.

Appearance retains System/Light/Dark, eight background themes and sixteen independent accents. Neutral dark mode is charcoal/black. No new fonts, remote color assets, dashboard redesign or account system is introduced.

**Honest results:** counters and most voice/groove feedback remain self-reported. Fretboard note answers are checked against the displayed prompt. Reference tones do not grade your performance. Timing Lab can detect microphone attacks and measure their position against an audio-time grid, but it does not infer technique, limb identity, health, musicality or overall performance quality. Practice time, coverage and self-assessment are not mastery scores.

## Validation

```sh
npm run typecheck
npm test
python3 -m pip install -r tests/requirements.txt
python3 -m playwright install chromium
npm run test:e2e
```

Use `python` in place of `python3` on Windows when appropriate. `npm test` builds before running the Node tests. `npm run test:e2e` tests the production build with real IndexedDB and a service worker. `CHROMIUM_PATH` selects an installed browser; `PLAYWRIGHT_BUNDLED_BROWSER=1` selects Playwright's browser. CI installs the pinned browser automatically.

`npm run test:ui` and `npm run test:visual` use a clearly isolated in-document test harness with memory storage. They are useful when an execution environment blocks localhost navigation, but do **not** establish real persistence or offline support. See [profile QA](docs/QA-PROFILES.md), [practice research](docs/PRACTICE-PROFILES-RESEARCH.md), and the [migration guide](docs/MIGRATION-V2.md).

`npm run test:workbench` exercises the 14 requested viewport sizes, populated routes, 2,030-exercise search fixture, keyboard states and theme contrast. CI runs native capability and workbench suites in Chromium, Firefox and WebKit. These are browser engines, not a claim of physical iOS/Android testing. Native failures block deployment. `PLAYWRIGHT_ENGINE=firefox` or `webkit` selects an installed engine.

`npm run test:profiles` runs all instrument-specific workflows, native upgrade/restore/offline cases and the populated profile/route/viewport matrix. `python3 tests/profiles.py --render` excludes the two native-only tests explicitly. Run browser suites only after a completed build, not while `dist/` is being rebuilt.

`npm run test:courses` runs guided lesson, evidence, quiz, profile isolation, native database 3→4 migration, v3 backup/offline and six-instrument responsive checks. CI runs it in all three browser engines; `python3 tests/courses.py --render` explicitly skips the two native-only cases.

## Architecture

Strict TypeScript, native DOM components, IndexedDB, Web Audio, local SVG charts and a generated service worker. This is not a React project. TypeScript 5.8.3 is the only npm development dependency.

`src/domain/` owns models, validation, analytics and trainer calculations; `src/db/` owns storage and backups; `src/audio/` owns scheduling; `src/practice/` owns session transitions. Views and UI components are separate. The v2 system adds typed profile definitions, discriminated protocol/outcome unions, shared task editors/renderers and deterministic migration rather than five copies of the app. See [profile architecture](docs/PRACTICE-PROFILES-ARCHITECTURE.md) and [changelog](CHANGELOG.md).

## Data and compatibility

Data belongs to the browser profile and origin. Another device, browser, port or domain does not share it. Export backups regularly and before moving domains. Restore supports validated transactional **replacement**, not merge. Reset and replacement require confirmation and initiate a safety-backup download; verify that your browser saved it.

Steadybar was originally delivered as Music Practice OS. Its public name and backup filenames changed in v1.2. Existing database, lock, channel and backup-format identifiers intentionally stay unchanged so the rename does not orphan data or invalidate older backups. New backups use envelope **version 4** and the same `music-practice-os` format identifier. Version-1, version-2 and version-3 backups remain importable. The physical structured-workspace IndexedDB version is 11; practice state, priority cycles, weekly schedules, recording metadata, Timing Lab results, MIDI device mappings/results and local repertoire-audio metadata are stored separately from immutable session history. Recording/repertoire audio bytes live in the separate local media database. Recording audio blobs live in the separate local media database described above. The pre-profile-upgrade original copy, when present, remains downloadable in Settings. Read the [migration and rollback limits](docs/MIGRATION-V2.md) before upgrading; older apps cannot consume a v3 learning backup. Downloads use `steadybar-backup-YYYY-MM-DD.json`.

Active sessions checkpoint every five seconds. Recovery excludes unknown crash downtime; up to the last checkpoint interval may be missing. Backgrounding pauses practice. Keep the app foregrounded for reliable audio; OS suspension and hardware/Bluetooth latency are outside its timing guarantees.

BPM counts the denominator-note beat: quarter notes in x/4 and eighth notes in x/8. Thus 72 BPM in 6/8 means 72 eighth-note beats, not 72 dotted-quarter pulses. Count-in and pauses are excluded from active time.

## GitHub Pages

Repository: `thiepn/steadybar`. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**. The included workflow verifies the app before publishing `dist/`; native browser-test failures block deployment. Pull requests are tested without deployment. After enabling Pages, rerun the workflow if its first deployment was blocked by configuration.

All assets and manifest paths are relative, with hash-based application routes, so the build supports `/steadybar/` as well as a domain root. Core use is designed to work without a network after caching. Service-worker updates require a deliberate reload and are deferred during practice or unsaved editing.
