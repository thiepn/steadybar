# Practice profiles v2 — verification and limitations

Base: Steadybar 1.4.1, `bc144e9f0a8834fe7dafc26d15cde07578e9424d`. Branch: `feat/practice-profiles-v2`. This report distinguishes local code/render checks from required native-browser release checks.

## Implemented acceptance scope

Six profile types, eight custom instrument families, 11 typed protocols, protocol-specific editors and active views, immutable configuration/profile snapshots, multi-profile planning, 140 original/starter tasks across the five principal instruments, exact-duration 15/30/45/60-minute routines, self-reported and objectively checked results, contextual goals/progress, shared songs with instrument parts and independent sections, whole-workspace v2 backup with v1 conversion, existing appearance/audio/PWA infrastructure.

Drums keep their existing four tempo trainers. Guitar has actual chord counters and scored fretboard prompts. Bass uses time/control/articulation reviews and harmonic cues. Piano uses explicit key/hand/scale contexts and first-read versus repeated-reading outcomes. Voice has bounded reference patterns, pitch/interval playback, self-assessed ease/fatigue, and a pause/rest response to high reported fatigue. Custom profiles use capability-compatible tasks, not a claimed specialist course.

## Local results

Strict TypeScript, production build, and **277 Node tests** passed after release hardening. This includes the original checks, profile/domain/content/backup/migration tests, repository transaction tests, concurrency regressions, recommendation matching, and a cancellable reference-audio test suite. Audio mocks verify scheduling/cancellation logic; they are not microphone or physical-device verification.

Local Chromium rendered suites passed the applicable profile regressions including the previously failing fretboard result, plan persistence and custom-profile cases, plus the new cross-profile recovery and concurrent-edit regressions. The workbench transport fix was rerun successfully. The in-document `--render` harness explicitly replaces storage with a validated memory adapter. Native-only tests are marked skipped, never counted as persistence verification. Local Chromium navigation to localhost is blocked by `ERR_BLOCKED_BY_ADMINISTRATOR`; GitHub-hosted native browser jobs remain mandatory for publishing.

## Browser suites

- `ci_render.py`: the existing workflow cases, with native-only cases explicitly excluded from the memory harness.
- `ci_native.py`: real-origin persistence/recovery/offline/backup/audio/count-in cases.
- `ui_polish.py`: previous appearance and responsive regression cases.
- `workbench.py`: workbench cases including 238 populated route/viewport combinations, 2,030-exercise fixture, readable control geometry and low active DOM churn.
- `colors.py`: color-system cases, 256 resolved color combinations, 8,704 computed text/control contrast checks, 15 picker sizes and persistence.
- `profiles.py`: principal instrument sessions, contextual results/goals, voice bounds/fatigue, fretboard answers, profile isolation, song parts, custom families, immutable segment edits, native v1 upgrade, v2 backup/offline, 1,000 additional exercises, cross-profile active-session recovery, concurrent session/song edits, and **700 profile/route/viewport combinations** across all requested sizes.

Chromium runs all applicable suites; Firefox/WebKit run native capabilities, workbench, colors and profile suites. CI retains per-suite exit status and JSON/screenshot evidence. Assertions are synchronized to observable commits/audio states rather than made optional. Native failures block deployment.

## Release hardening after PR run #28

The first full native profile run exposed several test-order/synchronization assumptions and prompted an additional production-code audit instead of simply relaxing the tests.

Production fixes from that audit:

- **Session reflection concurrency:** saving a session reflection now re-reads and patches the latest persisted session instead of writing a stale captured session object that could erase newer block outcomes.
- **Cross-profile active-session recovery:** Today and Practice detect the globally active persisted session rather than only the selected profile's filtered view. This keeps ambiguous migrated unfinished sessions recoverable when they are intentionally attributed to `Earlier practice`.
- **Song edit concurrency:** base song edits and archive/restore operations patch the latest persisted song and preserve parts, sections and other concurrent changes.
- **Recommendation matching:** compound/hyphenated skill areas such as `Sight Reading` and `Ear Training` now match the actual selected focus accurately instead of falling through to an unrelated focus label.

Release-test corrections keep the original functional requirements intact:

- asynchronous outcome and plan writes are polled until their durable state is observable;
- newly created exercises are identified by identity rather than IndexedDB key ordering;
- legacy recovery-backup comparison treats top-level entity arrays as unordered records while preserving nested routine/section ordering exactly;
- native practice launch waits for the runtime to reach the real `running` phase before opening protocol review controls;
- dedicated regressions verify cross-profile recovery and that session/song concurrent edits are preserved.

These are synchronization and data-integrity corrections, not disabled gates. A clean GitHub `npm ci && npm run check` passed before the hardened candidate was pushed. Final Chromium, Firefox and WebKit profile/migration checks remain mandatory before merge and deployment.

## WebKit saved-leave synchronization audit

The next full PR run passed every pre-profile WebKit gate and 19 of 20 profile tests. The sole failure occurred because the test clicked `Save & leave` and immediately forced `/settings` before the production async pause/save handler completed. WebKit then correctly completed the handler and navigated to Today, leaving the locator on the wrong page. The release test now waits for the observable Today transition before routing to Settings. At the 2.0.0 release point production behavior was unchanged. Steadybar 2.0.1 later replaces the blanket profile-switching block with pinned-session workspace switching while retaining the global one-active-session guard. The exact corrected case passed a clean-install targeted browser run before the feature branch was updated.

## Profile-system hardening in 2.0.1

The follow-up audit treats profile selection as workspace scope, not session ownership. Local strict TypeScript and **277 Node tests** pass. Rendered Chromium regressions pass for switching and creating profiles while an unfinished session remains pinned, multi-focus edit round-trips, duplicate/default naming, Custom-family defaults, read-only historical buckets, cross-profile History filtering, and recovery ownership labels. Existing rendered UI/profile cases remain enabled; native IndexedDB/offline and full cross-engine matrices remain release gates in GitHub CI.

The profile matrices now include the dedicated `/profiles` route, increasing coverage from 630 to **700 profile/route/viewport combinations**. The workbench matrix similarly includes `/profiles`, increasing from 224 to **238 populated route/viewport combinations**.

## Post-implementation corrections

The broader audit corrected: global-meter leakage into song and groove snapshots; stale BPM/trainers in future plans after a protocol edit; tempo controls remaining mounted for untimed tasks; incomplete part context in historical cues; false tempo progress for non-tempo outcomes; scale context conflation; migration split-ID/source-routine collisions; ambiguous historical attribution; pitch-goal scope; routine part/section selection; delayed reference audio after stop/navigation; broad history rewrites during profile renaming; undersized desktop transport controls; stale reflection/song writes; cross-profile active-session visibility; and compound-focus recommendation matching. Unit or browser regressions cover these behaviors where practical.

## Known boundaries

No microphone pitch detection, recording storage, generated backing tracks, gap/displaced-click trainer, hardware MIDI, or automatic grading of timbre, technique, timing feel or vocal health is shipped. Related ideas were researched and deferred; no inactive toolbar buttons advertise them. Reference audio is synthesized, not a sampled acoustic piano. Count outcomes and voice/groove ratings are explicitly self-report; only note-answer tasks compare actual entered answers. Participation/key coverage never means mastery.

Starter content is a set of original editable practice prompts, not a conservatory course or medically validated vocal regimen. Advanced students can build their own tasks; experience influences suggestions but does not certify difficulty. Long voice sessions include quiet listening/rest/review, not continuous singing. Comfortable ranges are user-defined; the app cannot assess health.

Automated browser engines and viewport emulation do not establish physical iOS/Android behavior or a formal accessibility certification. Background audio and device/Bluetooth latency depend on the operating system. Native persistence and deployment must be reported separately as observed, not inferred from screenshots.
