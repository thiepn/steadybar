# Practice recordings — 2.14

## Purpose

Phase 14 begins Steadybar's practice-evidence layer with short local microphone recordings tied to real practice context. Recording is evidence attached to a session/block rather than a generic audio-file library.

## Capture flow

Inside the active Focus Player, **Tools & block options → Record attempt** starts a microphone capture. Stopping saves:

- the audio asset in the local media database;
- profile, session and block IDs;
- exercise/song/section references when available;
- BPM when the block uses tempo;
- an automatically increasing attempt number.

The user can continue practice immediately after save.

An active unsaved capture is protected. Leaving practice, completing/skipping/restarting the block or finishing the session requires explicit discard confirmation first.

## Storage architecture

Structured workspace data remains in `music-practice-os`.

Recording binary assets live in a separate IndexedDB database:

```text
music-practice-os-media
└── recordingAssets
```

The structured `recordings` store contains metadata only. Large Blobs never enter normal `Data`, application snapshots or JSON backup serialization.

This separation keeps normal workspace operations and cross-tab refreshes lightweight.

## Metadata

Each `PracticeRecording` stores:

- stable recording and asset IDs;
- profile ID;
- title snapshot;
- duration, MIME type and byte size;
- session/block links;
- source type and exercise/song/section references;
- BPM when relevant;
- attempt number;
- optional 1–5 self-rating;
- note and tags;
- Best / Milestone / Favorite labels.

Marking one recording as **Current best** clears that label from previous recordings for the same target.

## Evidence library

`/recordings` is profile-scoped and provides:

- recording count, recorded duration and approximate local audio size;
- on-demand playback;
- per-recording local audio export with a format-matching extension;
- note/self-rating editing;
- Favorite, Milestone and Current best labels;
- explicit destructive deletion.

Audio is loaded only when Play is requested. Object URLs are revoked when replaced or when the page closes.

## History integration

History cards show attached recording counts.

Session details display linked evidence with attempt number, BPM, duration and Best/Milestone/rating labels.

Deleting a recording does not delete or rewrite the practice session.

## Backup contract

The structured database moves from schema v7 to v8 and adds the `recordings` store.

The backup envelope remains version 4. Modern backups include recording metadata, including an empty array when no recordings exist. Older v4 backups without `recordings` remain valid and restore with an empty collection.

Binary recording assets are deliberately excluded from JSON backups. This avoids unexpectedly huge backup files and prevents private audio from being silently copied. Users should preserve important audio separately before clearing browser/site data.

## Browser and privacy behavior

Steadybar feature-detects `MediaRecorder` and `getUserMedia`. Unsupported browsers keep the rest of the practice app usable and disable the capture control.

Microphone tracks are released when a recording is saved, canceled, or the practice view is cleaned up.

No recording is uploaded automatically.

## Phase 14 scope boundary

2.14 implements the reliable recording/evidence foundation.

It does **not** yet implement waveform editing, trimming, synchronized A/B playback, automatic audio-quality analysis, timing-onset analysis from recorded audio, cloud media backup/sync, multitrack recording or DSP effects.

Those capabilities should only be added after the storage/capture/history foundation has passed production use.
