# Practice profiles: research and product audit

Research date: 8 September 2026. Baseline: `bc144e9f0a8834fe7dafc26d15cde07578e9424d` (Steadybar 1.4.1). User requirements: instrument-specific practice from onboarding to history, no storage loss, one restrained UI, existing neutral themes and sans-serif typography preserved.

## 1. Findings, with limits

### A shared planning loop, not one universal exercise

The 2024 survey by dos Santos Silva, Araújo and Marinho examined 300 advanced musicians. It found practice-organization, personal-resource and external-resource factors; it did not find instrument-group differences in self-regulation scores. This supports sharing planning/review infrastructure, **not** treating instrument technique as interchangeable. It is observational evidence, not proof that a particular timer or app causes improvement. Product decision: keep Today, routines, notes and history shared; make the exercise task and its evidence specific. [R1]

Carter and Grahn's experiment compared blocked and interleaved practice in ten advanced clarinetists. Its small, specific sample does not establish a universal optimal schedule. Product decision: allow editable mixed-skill routines and rest; do not force an algorithmic schedule or advertise a scientifically optimal minutes-per-skill formula. [R2]

### Instrument curricula imply different parameters

Berklee's drum curriculum distinguishes time, technique, reading, coordination, groove and repertoire. Product decision: retain existing rudiments, sticking, subdivisions and tempo trainers, and represent them as percussion protocols rather than universal fields. [R3]

The guitar curriculum includes chords, fretboard knowledge, picking/strumming, reading and improvisation. Product decision: chord transitions have clean/total counters; fretboard recall has actual note-answer checks; scale practice records key, position and technique. Chord counts are self-reported, not microphone-detected. [R4]

Berklee's bass curriculum emphasizes time, tonality, timbre and taste, including muting and supportive line construction. Product decision: bass starts with groove and muting tasks, harmonic/chord-tone work and articulation feedback rather than a renamed guitar chord library. Ratings describe the user's assessment; software does not claim to hear pocket or timbre. [R5]

Piano Technique 101 emphasizes movement, control, articulation, reduced tension and pedaling in addition to scales and hand independence. Product decision: scale/key/hand/position contexts must remain separate when summarizing results. Practicing one C-major right-hand scale must not count as mastering all keys or hands. [R6]

Voice Technique 101 emphasizes intonation, breath coordination, resonance, healthy routines, harmony and repertoire. Product decision: optional reference-note/pattern playback, comfortable-range bounds, manual ease/fatigue feedback and phrase work. Tempo is not mandatory. No automatic vocal range escalation or health score. [R7]

### Voice safety

NIDCD advises avoiding singing with a hoarse/tired voice, avoiding vocal extremes and resting during illness. Product decision: conservative user-editable reference ranges; a clear stop/rest cue; listening and reflection blocks in longer voice routines; no 'push through' language, maximum-range rewards or breath-holding contests. Persistent discomfort or voice changes should be discussed with an appropriate health professional. This is educational software, not voice therapy. [R8]

### Competing products: useful patterns, not proof

Practice Space describes assignments and recorded practice feedback. Modacity describes an improve/record/reflection workflow. Product decision: concise task cues and review attached to the exercise. Do not copy their marketing, content, paid assets, cloud requirements or incentive systems. These are vendor descriptions, not independent efficacy evidence. [R9–R10]

## 2. What the real source audit found

| Area | Baseline defect | Required correction |
|---|---|---|
| `domain/models.ts` | Instrument is a global string; exercises mandate sticking, BPM and drum categories. | Stable profiles, typed protocols, optional legacy fields only for import. |
| `db/database.ts` | Database v2; one unique daily date globally. | Profile store; per-profile/date index; atomic migration and pre-upgrade snapshot. |
| `db/backup.ts` | Only version 1; no instrument references. | Export v2; import v1 through explicit deterministic migration. |
| `app/onboarding.ts` | Only Drums gets real content; other instruments get generic blocks. | Specific library, focus and routines for every supported profile. |
| `practice/logic.ts` | Every block is summarized by tempo/sticking. | Snapshot profile, protocol, parameters and typed results. |
| `practice/controller.ts` | Good serialized updates, locks, cancellation and checkpoints. | Extend the controller rather than inventing a second session machine. |
| `pages/practice.ts` | Always presents tempo ratings. | Render protocol task/counters/reference controls with shared transport. |
| `pages/library.ts` | Drum categories and clean BPM on all entries. | Profile taxonomies, meaningful summaries and protocol editor. |
| `pages/today.ts`, `routines.ts` | Date-only plan and global collections. | Active-profile views; safe switch with active session pinned. |
| `pages/songs.ts`, `setlists.ts` | No part identity; section notes shared for every player. | Optional profile parts with independent sections/readiness and shared song. |
| `domain/analytics.ts`, `progress.ts` | Tempo-centric summaries. | Participation, self-assessment and measured recall kept distinct. |
| `pages/history.ts` | Attribution changes cannot be represented. | Immutable name/type/config snapshots. |
| `app/search.ts` | Global results without profile context. | Label profile and part; safe navigation to other profiles. |
| `settings.ts` | Global instrument preference can silently reinterpret context. | Create/rename/archive/switch profiles; preserve primary and historical identity. |
| Audio, PWA, appearance | Functioning infrastructure with extensive tests. | Preserve and regression-test; no restyling or network assets. |

## 3. Chosen implementation boundary

Implement typed free practice, tempo progression (existing four trainers), counted repetitions, chord changes, bass groove, scale/key/hand cycles, fretboard recall, vocal patterns, pitch/interval reproduction, first-read sight-reading and repertoire passage protocols. These alter configuration, runtime controls, outcomes and progress, not merely text.

Do not ship automated microphone pitch grading in this release: unreliable octave detection, noise, calibration, device latency and polyphony need a separate measured test set. Reference audio and honest self-assessment work without permission. Recording review is evaluated separately: a recording capability must disclose persistence/export behavior rather than silently retaining audio or presenting a recorder placeholder. No server, MIDI hardware requirement, subscriptions or microphone permission is required for core use.

The content is original short practice tasks. Curriculum headings inform scope; method-book passages, score excerpts and copyrighted arrangements are not reproduced. Tempo/routine presets are editable starting suggestions, not evidence-backed prescriptions. Longer voice routines include listening, rest and repertoire analysis, not continuous phonation.

## 4. Engineering evidence and decisions

IndexedDB exposes version-change events so existing tabs can close their old connection; migration must not assume only one tab is open. Use the existing database identifier, a version upgrade and one all-store read/write migration transaction. Save the original data before normalization. Export versioned backups; never coerce unknown future data into empty arrays. [R11]

Web Audio best practices distinguish generated sources from recorded media and emphasize user control/autoplay constraints. Reference tones are local oscillators with gain envelopes and cancellable scheduling. They must not restart the metronome or let a delayed audio-start promise play after leaving the task. No animation or rendering timestamp is used as the audio clock. [R12]

## Sources

R1. dos Santos Silva et al. (2024), *Attitudes in music practice*, original survey. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1324100/full

R2. Carter & Grahn (2016), *Optimizing Music Learning*, original experiment. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2016.01251/full

R3. Berklee Online, *Drum Set Performance 101*, curriculum. https://online.berklee.edu/courses/drum-set-performance-101

R4. Berklee Online, *Guitar Fundamentals*, curriculum. https://online.berklee.edu/courses/guitar-fundamentals

R5. Berklee Online, *Bass Performance 101*, curriculum. https://online.berklee.edu/courses/bass-performance-101

R6. Berklee Online, *Piano Technique 101*, curriculum. https://online.berklee.edu/courses/piano-technique-101

R7. Berklee Online, *Voice Technique 101*, curriculum. https://online.berklee.edu/courses/voice-technique-101

R8. NIDCD, *Taking Care of Your Voice*, health guidance. https://www.nidcd.nih.gov/health/taking-care-your-voice

R9. Practice Space, student workflow (vendor description). https://www.practicespaceapp.com/student-page

R10. Modacity, improve/record workflow (vendor description). https://www.modacity.co/blog/deliberate-practice-helps-musicians-learn-faster

R11. MDN, IndexedDB versionchange event. https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/versionchange_event

R12. MDN, Web Audio API best practices. https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
