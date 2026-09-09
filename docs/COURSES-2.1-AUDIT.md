# Steadybar 2.1 — Course audit, research and implementation

Baseline: `c09519389f9a295ec7c5140e445ada4ef6e27176` (2.0.1). Research and implementation: 9 September 2026.

## Finding

The user-facing complaint was correct. The 2.0.1 release repaired workspace ownership and profile controls, but an exercise collection is not a course. Inspection of `src/domain/profiles.ts`, the starter catalogue, practice protocols, Today, Progress, History and the session controller found instrument-specific controls and exercises without a sequential teaching layer, entry guidance, lesson instruction, assessments or persistent learning records. Previous release certification covered that version's software behavior, not the completeness of its pedagogy.

The upgrade therefore adds a learning system rather than renaming profiles, increasing counters or appending another generic timer. Existing independent exercises and practice routines remain available.

## Research method and boundaries

Primary educator curricula were used as coverage benchmarks. Public course descriptions establish topics and instructional sequencing, not permission to copy paid lessons and not evidence that Steadybar has reproduced those courses. All teaching text, questions, diagrams and musical examples in this release are original. The implementation does not copy commercial song excerpts, teacher videos, sheet-music images or recordings. Source links are available inside every course; offline use does not depend on them.

| Source | Finding used | Implementation decision |
|---|---|---|
| [Berklee Drum Set Performance 101](https://online.berklee.edu/courses/drum-set-performance-101) | Time, coordination, reading, technique and repertoire belong together. | Move beyond rudiments/BPM into backbeat coordination, fills, phrase structure, dynamics and ensemble cues. |
| [Percussive Arts Society rudiments](https://pas.org/rudiments/) | Established rudiment vocabulary. | Use conventional singles/doubles/paradiddle terminology; no PAS images/audio reproduced. |
| [Drumeo beginner fills](https://www.drumeo.com/beat/beginner-drum-fills/) | Fills should connect back into a groove. | Assess the following downbeat, not only the fill itself. |
| [JustinGuitar Beginner](https://www.justinguitar.com/beginner) | Beginner study combines setup, chords, rhythm, songs and consolidation. | Give guitar an ordered chord/contact/rhythm course with readable fret tables and application, not only chord counters. |
| [Berklee Rhythm and Groove Guitar](https://online.berklee.edu/courses/rhythm-and-groove-guitar) | Voicings, rhythm and musical context are development topics. | Add triads, rhythmic changes, texture, capo and arrangement tasks. |
| [StudyBass study guide](https://www.studybass.com/study-guide/) and [open-string muting](https://www.studybass.com/lessons/bass-technique/open-string-muting/) | Bass study integrates technique, rhythm, notes, harmony and both-hand muting. | Prioritize quiet unwanted strings, controlled note endings, chord tones and supportive ensemble lines. |
| [Berklee Piano Technique 101](https://online.berklee.edu/courses/piano-technique-101) | Coordination, articulation, dynamics and pedal require musical application. The course has intermediate prerequisites. | Use it as a coverage benchmark, not as evidence that its prerequisites are beginner requirements. Supply original five-finger, triad and prepared-reading foundations first. |
| [Berklee Smart Reading](https://college.berklee.edu/courses/ilpn-101) | Keyboard literacy also involves chord symbols and accompaniment. | Add text-score preview, chord mapping and comping; explicitly do not claim full staff-notation instruction. |
| [Berklee Voice Technique 101](https://online.berklee.edu/courses/voice-technique-101) | Healthy habits, pitch, breath, expression and harmony are distinct concerns. | Use short, personally bounded patterns, phrase work and harmony instead of generic mandatory BPM. |
| [NIDCD: Taking Care of Your Voice](https://www.nidcd.nih.gov/health/taking-care-your-voice) | Avoid singing when hoarse or tired; voice problems need qualified evaluation. | No automatic range expansion, pain-as-progress or diagnostic claims; clear stopping rules, rests and listening-only alternatives. |
| [Berklee Rhythm Section Ensemble](https://college.berklee.edu/courses/enmx-100) | Listening, rehearsal and supporting other musicians matter. | Give each principal instrument an ensemble-application course, including form, entrances, space and coordinated endings. |
| [Carter & Grahn (2016)](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2016.01251/full) | Exploratory evidence on interleaved music practice is task-dependent. | Pair isolated work with musical application and later revisiting, without presenting one schedule as universally superior. |
| [Wiseheart et al. (2017)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5553926/) | Their piano-learning task did not show the assumed spacing benefit. | Explicitly label 1/3/7/14-day review suggestions an organizational heuristic, not a validated learning or mastery model. |

The sources do **not** establish that these 94 lessons constitute a complete professional curriculum, that a quiz detects physical technique, or that elapsed minutes demonstrate proficiency. No such claims are made.

## Implemented scope

Five principal instruments each receive 18 lessons in three courses: 8 Foundations, 6 Skill development and 4 Ensemble application. Custom instruments receive 4 practice-method lessons. Total: **16 courses, 94 lessons, 188 runnable tasks, 94 knowledge checks**. Every lesson has original teaching, a worked example, isolation/application, observable criteria, simpler and harder variations, a specific repair and a transfer task.

Drums progress from touch and subdivision into coordinated grooves, fills, compound meter, ghost notes and form. Guitar progresses through sound production, specific chord shapes, rhythmic changes, fretboard landmarks, triads/fingerpicking and accompaniment. Bass has its own muting, note-length, harmonic-function, anticipation, blues and drummer-coordination pathway. Piano integrates keyboard geography, hands, specific scale fingerings, inversions, voicing and comping. Voice uses comfort, pitch direction, modest patterns, phrasing, articulation, harmony and rehearsal pacing. The Custom course teaches how to structure teacher-approved material without pretending to know every instrument's mechanics.

## Product acceptance decisions

- Courses are accessible through Learn, Today, Practice, profile management, Progress and command search. A course is not hidden in a settings panel.
- Reading and placement do not award completion. All lessons remain available; prerequisites guide entry without rigid locks.
- A lesson launches two real practice blocks. Today appends, preserves existing material and rejects accidental duplicate insertion.
- Finishing a timer leaves the lesson unchecked. A passing self-check requires practice evidence, all specific performance criteria and the correct knowledge answer. Confidence remains separate.
- App evidence must come from an ended, correctly owned, current-revision guided session with both tasks completed, not skipped, and a minimum recorded duration. Those thresholds reject empty evidence, not certify musicianship.
- Off-app evidence requires explicit confirmation and actual reported minutes. It does not invent sessions or inflate app practice totals.
- Old passing app evidence cannot establish a new retention check. Failed checks remain useful review records, not punitive scores.
- Review suggestions are flexible; no streak penalties, forced speed increases or automatic singing-range expansion.
- Lesson history is tied to stable profile/course/lesson/task/revision identities. Changing an exercise's actual protocol removes the changed block's original lesson attribution, while preserving the earlier segment.
- Personally chosen voice settings are remembered per course, but comfort confirmation is never prechecked. Both whole patterns and interval endpoints must fit the range.
- Worked reading examples are already displayed, so they are prepared reading, never mislabeled unseen first reads.
- Local reference tones illustrate pitch order only. Equal-duration sine tones do not claim to reproduce rhythm, instrumental timbre or the user's performance.

## Remaining deliberate limits

This release does not add microphone analysis, audio recording, stored backing tracks, automatic posture/fingering assessment, full staff-notation rendering, copyrighted song libraries or bespoke tuition for every custom instrument. It does not claim an accredited level or replace teacher feedback. It is a concrete self-directed teaching and practice layer, not a promise that every aspect of musical development can be automated.

## Verification policy

See `COURSES-2.1-ARCHITECTURE.md`. Type checking, Node contracts and explicit memory-render workflows were executed locally. Native IndexedDB migration, service workers, restore and three-engine behavior must pass GitHub Actions on the exact candidate before release. Do not infer native coverage from the memory harness or merge using an earlier commit's successful run. Final run/commit/deployment evidence belongs in the PR release record after those jobs finish.
