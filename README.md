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

## Guided courses — 2.1.0

Open **Learn** to follow an actual teaching sequence: **16 original courses, 94 lessons and 188 runnable lesson tasks**. Drums, Guitar, Bass, Piano and Voice each have Foundations (8 lessons), Skill development (6) and Ensemble application (4). The Custom profile has a four-lesson practice-method course, not fictitious instrument-specific tuition.

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
| Drums | Sticking, subdivision, accents, clean-tempo attempts and the four existing tempo trainers. |
| Guitar | Chord sequences with clean/total counts, objectively checked fretboard recall, scales with key/position/technique, and repertoire passages. |
| Bass | Groove/harmonic cues, time/control/muting/articulation reviews, chord-tone work and fretboard recall. |
| Piano | Scale/key cycles, hands/ motion/fingering, reference patterns, and first-read versus repeated-reading results. |
| Voice | User-bounded pitch/pattern references, interval reproduction, syllables, ease/fatigue self-reviews, and no compulsory BPM. |
| Custom | Eight instrument families with compatible protocols; not a promise of a specialist curriculum. |

There are **140 starter exercises** across the five principal instruments and profile-specific **15/30/45/60-minute templates**, alongside the preserved older drum routines. Edit any template or create your own task. A routine is a suggestion, not a required schedule.

Shared infrastructure includes daily plans, reusable routines, metronome, sessions, pause/resume, recovery, notes, history, goals, command search and safe offline updates. Songs can have separate instrument parts, section lists, arrangement notes and readiness; setlists remain shared. Profile switching never rewrites an active or historical session. Archive profiles rather than deleting their history.

Use the profile selector or Settings → Manage profiles to open the dedicated Practice profiles workspace. Create, rename, switch, archive and restore profiles there. The selected profile controls Library, Today, routines, goals and progress; song compositions and backups remain workspace-wide. Switching profiles never changes the identity of an unfinished session, which stays pinned until it is finished or ended. The standalone metronome is available to every instrument.

Appearance retains System/Light/Dark, eight background themes and sixteen independent accents. Neutral dark mode is charcoal/black. No new fonts, remote color assets, dashboard redesign or account system is introduced.

**Honest results:** counters and voice/groove feedback are self-reported. Fretboard note answers are checked against the displayed prompt. Reference tones do not listen to or grade your performance. Practice time, coverage and self-assessment are not mastery scores. Microphone analysis, audio recording and generated backing tracks are not part of this release.

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

Steadybar was originally delivered as Music Practice OS. Its public name and backup filenames changed in v1.2. Existing database, lock, channel and backup-format identifiers intentionally stay unchanged so the rename does not orphan data or invalidate older backups. New backups use envelope **version 3** and the same `music-practice-os` format identifier. Version-1 and version-2 backups remain importable. The physical IndexedDB version is 4; course progress has its own store. The pre-profile-upgrade original copy, when present, remains downloadable in Settings. Read the [migration and rollback limits](docs/MIGRATION-V2.md) before upgrading; older apps cannot consume a v3 learning backup. Downloads use `steadybar-backup-YYYY-MM-DD.json`.

Active sessions checkpoint every five seconds. Recovery excludes unknown crash downtime; up to the last checkpoint interval may be missing. Backgrounding pauses practice. Keep the app foregrounded for reliable audio; OS suspension and hardware/Bluetooth latency are outside its timing guarantees.

BPM counts the denominator-note beat: quarter notes in x/4 and eighth notes in x/8. Thus 72 BPM in 6/8 means 72 eighth-note beats, not 72 dotted-quarter pulses. Count-in and pauses are excluded from active time.

## GitHub Pages

Repository: `thiepn/steadybar`. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**. The included workflow verifies the app before publishing `dist/`; native browser-test failures block deployment. Pull requests are tested without deployment. After enabling Pages, rerun the workflow if its first deployment was blocked by configuration.

All assets and manifest paths are relative, with hash-based application routes, so the build supports `/steadybar/` as well as a domain root. Core use is designed to work without a network after caching. Service-worker updates require a deliberate reload and are deferred during practice or unsaved editing.
