# Phase 17 — MIDI Drum Integration, Velocity Dynamics & High-Precision Performance Analysis

## Purpose

MIDI Drum Lab captures note-on events from an electronic drum kit or MIDI pad and turns them into deterministic timing and device-relative velocity evidence.

It extends Phase 16's timing architecture; it does not introduce a second timing-scoring system.

## Browser boundary

Live capture requires the Web MIDI API (`navigator.requestMIDIAccess`).

Steadybar feature-detects the API. Browsers without Web MIDI keep the full app and saved MIDI history usable, but live connection controls are disabled.

Web MIDI is typically available in Chromium-based browsers. Browser/platform support can change independently of Steadybar.

## Timestamp normalization

Each note-on uses `MIDIMessageEvent.receivedTime` when available, falling back to the event timestamp.

When a device listener starts, Steadybar records:

- `performance.now()`;
- the current shared `AudioContext.currentTime`.

Each MIDI event is converted with:

`audioTime = audioAnchor + (receivedTime - performanceAnchor) / 1000`

This places MIDI events and the metronome grid on the same monotonic audio-time reference.

## MIDI message rules

Steadybar currently accepts normal channel note-on messages (`0x90–0x9F`) with velocity 1–127.

Note-off messages and note-on velocity 0 are ignored.

Stored live-event fields are:

- audio-clock timestamp;
- MIDI note 0–127;
- MIDI velocity 1–127;
- channel 1–16.

System Exclusive access is not requested.

## Device identity and mapping

Browser MIDI input IDs are not treated as permanently stable identity.

Saved device mappings use a normalized `manufacturer::device name` key as the primary reconnect identity while retaining the last browser input ID as convenience metadata.

Each practice profile can keep one mapping profile per device identity.

Mappings contain:

- MIDI note;
- mapped drum voice;
- user-visible label;
- enabled / disabled state.

General MIDI drum defaults cover common kick, snare, rim, hi-hat, tom, ride and crash notes.

**Learn next note** listens for one note-on and adds or replaces that note's mapping.

An optional channel filter can limit a mapping to one MIDI channel.

## No limb inference

A drum voice is not the same thing as a limb.

Snare, tom and cymbal notes can be played by either hand depending on sticking/orchestration.

Phase 17 therefore does not infer left hand, right hand, left foot or right foot from MIDI note identity.

## Expected-hit patterns

Phase 17 has no authored note-by-note drum-score format yet.

To avoid pretending otherwise, the user explicitly chooses an expected pattern:

### Every subdivision

All positions of the selected 1× / 2× / 3× / 4× timing grid are expected.

### Beat only

Only `part === 0` positions are expected.

### 2 & 4 backbeat

Only beat indexes 1 and 3 (human beats 2 and 4) with `part === 0` are expected.

This makes a selected Snare lane useful for a normal 4/4 backbeat without manufacturing missing notes on beats 1 and 3.

## Analysis lane

The user can analyze:

- all mapped note-ons;
- one mapped drum voice.

Selecting one voice means other mapped voices are ignored for expected-hit matching rather than classified as extra hits.

This is essential for grooves with simultaneous voices.

## Timing analysis

MIDI Lab reuses Phase 16's bounded, one-to-one timing matcher.

Expected grid events and MIDI note-ons are paired by closest absolute timing distance within the tempo-aware match window.

One expected hit consumes at most one MIDI event and one MIDI event consumes at most one expected hit.

Timing outputs are:

- signed mean bias;
- median offset;
- mean absolute timing error;
- timing spread;
- drift in milliseconds per minute;
- misses;
- extras;
- measurement confidence.

## Velocity analysis

Velocity analysis uses only matched events.

Global result fields:

- mean velocity;
- median velocity;
- velocity standard deviation (`velocitySpread`);
- minimum;
- maximum;
- range.

Per mapped voice:

- matched count;
- median velocity;
- velocity spread;
- mean absolute timing error;
- timing spread.

These values are most useful within the same kit/module/mapping. Different trigger modules, curves, pads and sensitivity settings can produce different velocity values for the same physical playing.

## Unmapped notes

Note-ons on the selected channel that are not enabled in the mapping are counted as `unmappedCount`.

Events outside the measured timing window are excluded, so count-in playing does not inflate the result.

## Event-volume protection

The live page keeps at most 20,000 note-on events for one test.

If the device exceeds that buffer, the test is not saved. This avoids producing apparently precise diagnostics from trigger chatter or duplicate-event storms.

## Disconnect behavior

If the selected MIDI input disconnects during an active test, Steadybar cancels the test and saves no result.

Device-state updates do not silently swap mappings during an active measurement.

## Practice context

If an unfinished practice session for the current profile exists when the MIDI result is saved, the result snapshots:

- session ID;
- current block ID;
- source exercise ID when available.

Deleting or remapping the MIDI device later does not rewrite historical MIDI results.

## Persistence

Phase 17 increments the structured IndexedDB schema from v9 to v10 and adds:

- `midiDeviceProfiles`;
- `midiResults`.

The backup envelope remains version 4.

Old v4 backups without MIDI collections restore with empty MIDI mapping/result arrays.

## Privacy

MIDI events are processed locally.

Phase 17 stores compact matched-result evidence and mapping metadata, not a permanent raw full-event recording of the test.

No MIDI data is uploaded automatically.

## Measurement confidence

Confidence describes matched evidence coverage and extra-event cleanliness only.

It is not a musicianship or technique grade.

High confidence requires at least 16 matched expected positions, at least 85% expected coverage and a low extra-event rate.

Medium requires at least 8 matched positions, at least 65% coverage and a looser extra-event allowance.

Everything else is Low confidence.

## Non-goals

Phase 17 does not:

- infer limb identity;
- grade technique;
- estimate acoustic loudness from velocity;
- diagnose trigger hardware;
- infer fatigue, tension, pain or injury;
- claim professional/population norms;
- transcribe a full drum performance into notation;
- know groove-note correctness without an authored score;
- automatically change mastery/progression state from MIDI diagnostics.

## Certification

Release certification includes:

- MIDI note-on parser tests;
- note-off / velocity-zero rejection;
- channel normalization;
- receivedTime → AudioContext timestamp conversion;
- General MIDI mapping uniqueness;
- channel-filter mapping tests;
- unmapped-note window tests;
- exact timing / signed drift tests;
- velocity median/spread/range tests;
- simultaneous-voice filtering tests;
- 2 & 4 expected-grid tests;
- schema-v10 persistence / backup round trip;
- old-v4 backup compatibility;
- saved-history rendering on Chromium / Firefox / WebKit;
- graceful no-Web-MIDI fallback on unsupported engines;
- full existing profile/course/offline regression suites.
