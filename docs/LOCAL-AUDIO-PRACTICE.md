# Phase 18 — Local Audio Practice Engine, Track Import, Looping & Tempo-Controlled Repertoire Practice

## Purpose

Phase 18 lets Steadybar use local audio files as practical repertoire references without becoming a streaming service or DAW.

Local audio is attached to an existing Song or instrument-specific SongPart. The existing song/section IDs remain authoritative for practice history, goals, readiness and set preparation.

## Data architecture

Structured metadata is stored in workspace schema v11 as `audioTracks`.

Each track stores:

- song ID;
- optional song-part ID;
- stable asset ID;
- title and original filename;
- MIME type and byte size;
- duration;
- saved section cues;
- last playback rate.

A cue stores a stable ID, optional existing song-section ID, label, start/end seconds and order.

Track metadata is validated against the exact shared/part arrangement. A part-specific track cannot save a cue for a section belonging to another part.

## Binary storage

Audio bytes are stored in the existing `music-practice-os-media` IndexedDB.

Media DB version 2 contains:

- `recordingAssets`;
- `repertoireTrackAssets`.

Like Phase 14 recordings, track bytes are stored as `ArrayBuffer` plus MIME metadata for cross-engine IndexedDB portability.

Structured app snapshots never contain the imported binary.

## Import

Import flow:

1. user selects an `audio/*` file;
2. browser decodes metadata through a temporary `HTMLAudioElement` object URL;
3. duration must be finite and between 0 and 24 hours;
4. file size must be at most 512 MB;
5. bytes are saved to the media database;
6. structured metadata is committed;
7. if metadata commit fails, the newly written binary is removed.

Import is attached to the currently viewed shared arrangement or current SongPart.

## Relink

JSON backups intentionally exclude track bytes.

When metadata exists but the binary does not, the player remains readable and shows **Relink file**.

Relinking reuses the same stable asset ID and saved cues.

A replacement file is rejected if it is shorter than any saved cue endpoint.

If the metadata update fails after binary replacement, Steadybar restores the previous binary when available, or deletes the replacement when the previous binary was already missing.

## Player

`RepertoireTrackPlayer` uses an `HTMLAudioElement` and the existing cross-tab `AUDIO_LOCK`.

Capabilities:

- play / pause / stop;
- seek;
- volume;
- playback rate 0.5–1.5;
- browser pitch preservation where exposed;
- A/B loop state;
- object-URL cleanup;
- cross-tab audio exclusivity.

Playback does not store a second copy of the decoded audio.

## Tempo control

Playback rate is browser-native.

Where `preservesPitch` / compatible browser behavior exists, Steadybar requests pitch preservation.

Where unavailable, the UI explicitly warns that changing speed may change pitch.

The displayed effective BPM is `song BPM × playback rate`.

This is a practice estimate. It does not analyze the imported file to discover its true tempo.

## One-bar pre-roll

The optional pre-roll reuses Steadybar's existing Web Audio metronome.

The count-in tempo is the current rate-adjusted song BPM, clamped to Steadybar's supported metronome range.

At the first post-count-in beat, the metronome releases the audio lock and local track playback begins.

## A/B looping

A and B are set from the current playhead.

The player uses a requestAnimationFrame monitor while playing and seeks back to A as playback reaches B.

The minimum loop length is 80 ms.

This is designed for musical practice. Browser media seek behavior varies, so Phase 18 does not claim zero-gap or sample-accurate loop transitions.

## Section cues

A saved cue can reference one existing section in the track's arrangement.

Only one cue per section is allowed per track.

`Loop section` loads its A/B boundaries.

`Practice section` launches the normal Steadybar song-section Focus Player.

`Add to Today` creates the same normal song-section block used elsewhere.

Therefore local-audio playback does not create a second or incompatible practice-history model.

## Repertoire edits

`changeSongSections` now also reconciles local-audio cues:

- deleted section → linked cue removed;
- canonical section rename → matching canonical cue label updated;
- track and audio asset remain intact.

Historical practice sessions remain immutable.

## Backup and migration

Workspace IndexedDB increments from v10 to v11 with the `audioTracks` store.

Backup envelope remains v4.

Backups contain metadata and cues only.

Old v4 backups without `audioTracks` restore as `audioTracks: []`.

Media bytes are never silently packed into JSON backups.

## Reset behavior

Reset downloads the existing safety JSON backup first, then clears both:

- local practice recording media;
- local repertoire track media.

The reset dialog explicitly warns that neither media category is represented by the JSON safety backup.

## Privacy

Imported tracks remain in browser-local IndexedDB.

Steadybar does not upload them automatically.

Users are responsible for having permission to use imported audio.

## Non-goals

Phase 18 does not:

- integrate Spotify/Apple Music/YouTube streaming;
- download copyrighted tracks;
- separate stems;
- perform beat detection or tempo detection;
- guarantee sample-perfect looping;
- provide multitrack editing;
- provide EQ/effects;
- replace a DAW;
- include audio bytes in structured backups.

## Certification

Release certification includes:

- schema-v11 metadata persistence;
- old-v4 backup compatibility;
- media DB v2 binary round trip;
- real WAV metadata decode;
- player rate / seek / loop state;
- metadata-only restore with missing binary;
- responsive player and cue UI;
- section deletion → cue cleanup;
- reset clears both local media stores;
- existing Chromium / Firefox / WebKit regression suites.
