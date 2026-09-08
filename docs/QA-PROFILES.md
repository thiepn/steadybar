# Practice profiles v2 — verification and limitations

Base: Steadybar 1.4.1, `bc144e9f0a8834fe7dafc26d15cde07578e9424d`. Branch: `feat/practice-profiles-v2`. This report distinguishes local code/render checks from required native-browser release checks.

## Implemented acceptance scope

Six profile types, eight custom instrument families, 11 typed protocols, protocol-specific editors and active views, immutable configuration/profile snapshots, multi-profile planning, 140 original/starter tasks across the five principal instruments, exact-duration 15/30/45/60-minute routines, self-reported and objectively checked results, contextual goals/progress, shared songs with instrument parts and independent sections, whole-workspace v2 backup with v1 conversion, existing appearance/audio/PWA infrastructure.

Drums keep their existing four tempo trainers. Guitar has actual chord counters and scored fretboard prompts. Bass uses time/control/articulation reviews and harmonic cues. Piano uses explicit key/hand/scale contexts and first-read versus repeated-reading outcomes. Voice has bounded reference patterns, pitch/interval playback, self-assessed ease/fatigue, and a pause/rest response to high reported fatigue. Custom profiles use capability-compatible tasks, not a claimed specialist course.

## Local results

Strict TypeScript, production build, and **271 Node tests** passed. This includes the original 142 checks, profile/domain/content/backup/migration tests, repository transaction tests, and a cancellable reference-audio test suite. Audio mocks verify scheduling/cancellation logic; they are not microphone or physical-device verification.

Local Chromium rendered suites passed **64 applicable cases**, with **7 explicit native-only exclusions** across 71 collected cases. The workbench transport fix was rerun successfully. Exact source revision and native/CI results are recorded in the release verification artifact and CI. The in-document `--render` harness explicitly replaces storage with a validated memory adapter. Native-only tests are marked skipped, never counted as persistence verification. Local Chromium navigation to localhost is blocked by `ERR_BLOCKED_BY_ADMINISTRATOR`; GitHub-hosted native browser jobs remain mandatory for publishing.

## Browser suites

- `ci_render.py`: the 29 existing workflow cases, three explicitly native-only.
- `ci_native.py`: six real-origin persistence/recovery/offline/backup/audio/count-in cases.
- `ui_polish.py`: seven previous appearance and responsive regression cases.
- `workbench.py`: nine workbench cases including 224 populated route/viewport combinations, 2,030-exercise fixture, readable control geometry and low active DOM churn.
- `colors.py`: nine color-system cases, 256 resolved color combinations, 8,704 computed text/control contrast checks, 15 picker sizes and persistence.
- `profiles.py`: 17 cases; all principal instrument sessions, contextual results/goals, voice bounds/fatigue, fretboard answers, profile isolation, song parts, custom families, immutable segment edits, native v1 upgrade, v2 backup/offline, 1,000 additional exercises, and **630 profile/route/viewport combinations** across all 14 requested sizes.

Chromium runs all applicable suites; Firefox/WebKit run native capabilities, workbench, colors and profile suites. CI retains per-suite exit status and JSON/screenshot evidence. Assertions are synchronized to observable commits/audio states rather than made optional. Native failures block deployment.

## Post-implementation corrections

The audit corrected: global-meter leakage into song and groove snapshots; stale BPM/trainers in future plans after a protocol edit; tempo controls remaining mounted for untimed tasks; incomplete part context in historical cues; false tempo progress for non-tempo outcomes; scale context conflation; migration split-ID/source-routine collisions; ambiguous historical attribution; pitch-goal scope; routine part/section selection; delayed reference audio after stop/navigation; broad history rewrites during profile renaming; and undersized desktop transport controls. Unit or browser regressions cover these behaviors where practical.

## Known boundaries

No microphone pitch detection, recording storage, generated backing tracks, gap/displaced-click trainer, hardware MIDI, or automatic grading of timbre, technique, timing feel or vocal health is shipped. Related ideas were researched and deferred; no inactive toolbar buttons advertise them. Reference audio is synthesized, not a sampled acoustic piano. Count outcomes and voice/groove ratings are explicitly self-report; only note-answer tasks compare actual entered answers. Participation/key coverage never means mastery.

Starter content is a set of original editable practice prompts, not a conservatory course or medically validated vocal regimen. Advanced students can build their own tasks; experience influences suggestions but does not certify difficulty. Long voice sessions include quiet listening/rest/review, not continuous singing. Comfortable ranges are user-defined; the app cannot assess health.

Automated browser engines and viewport emulation do not establish physical iOS/Android behavior or a formal accessibility certification. Background audio and device/Bluetooth latency depend on the operating system. Native persistence and deployment must be reported separately as observed, not inferred from screenshots.
