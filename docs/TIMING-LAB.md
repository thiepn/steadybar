# Phase 16 — Timing Lab: Microphone-Based Timing Analysis & Precision Diagnostics

## Purpose

Timing Lab measures when short microphone attacks arrive relative to an expected metronomic subdivision grid.

It is deliberately narrower than an automatic performance grader. It measures detected onset timing only.

## Clock architecture

The metronome uses Steadybar's existing Web Audio `AudioContext` and `ScheduleClock`.

Timing Lab prepares that same `AudioContext` and attaches the microphone analysis graph to it. The first practice beat's audio timestamp becomes the timing-grid origin.

This avoids comparing microphone events against `Date.now()`, animation frames or DOM timers.

## Onset detector

`public/timing-onset-worklet.js` runs in an AudioWorklet.

For every input render quantum it:

- inspects the mono microphone stream;
- tracks peak absolute sample level;
- emits an onset when level crosses the configured threshold;
- uses hysteresis plus a 45 ms cooldown to avoid repeated triggers from one transient;
- timestamps the triggering sample as `(currentFrame + sampleIndex) / sampleRate`;
- reports low-rate peak levels used by ambient calibration.

The worklet output is connected through a zero-gain node so microphone audio is never intentionally played back.

## Microphone calibration

**Calibrate microphone** listens to roughly 1.2 seconds of ambient input.

The 95th-percentile block peak is multiplied by 3.5 and given a small margin, then clamped to a conservative range.

Calibration estimates a useful trigger threshold only. It does not estimate acoustic technique, input latency or room quality.

## Input-latency compensation

Timing Lab provides a manual input-compensation field from -250 to +250 ms.

A positive value moves detected attacks earlier before matching, representing a known microphone/input delay.

No universal automatic latency value is assumed because browser, audio interface, Bluetooth route and hardware buffering vary.

## Expected grid

Expected strokes follow:

`interval = 60 / BPM / subdivision`

Subdivision values are the existing 1×, 2×, 3× and 4× timing grid.

The selected click mode changes what the user hears, not which subdivision positions are expected. This allows sparse and gap-click practice to test internal pulse across silent clicks.

## Matching

Detected attacks are latency-corrected, then matched one-to-one with expected grid events.

The matching window is tempo-aware:

`min(180 ms, max(35 ms, 45% of one subdivision interval))`

All candidate expected/detected pairs inside the window are sorted by absolute distance. The closest non-conflicting pairs are accepted first.

One microphone onset cannot satisfy two expected grid positions, and one expected position cannot consume two onsets.

## Metrics

### Average bias

Mean signed offset in milliseconds.

- negative = early;
- positive = late;
- within ±5 ms is displayed as centered.

### Median offset

Robust center of the matched signed offsets.

### Typical error

Mean absolute offset from the expected grid.

### Spread

Standard deviation of matched offsets around their mean.

### Drift

Linear-regression slope of offset versus elapsed test time, reported in milliseconds per minute.

### Misses

Expected grid positions with no matched onset.

### Extras

Detected onsets that were not assigned to an expected position.

## Measurement confidence

Confidence is about **measurement sufficiency**, not playing quality.

High requires at least 16 matched hits, at least 80% expected-hit coverage and limited extras.

Medium requires at least 8 matched hits, at least 60% coverage and a looser extra-hit bound.

Anything below those thresholds is Low confidence.

## Persistence

Phase 16 adds the `timingResults` structured store and increments the main IndexedDB schema from v8 to v9.

Each saved result stores:

- profile ID and optional practice-context references;
- BPM, meter, subdivision and click-mode snapshot;
- duration, threshold and input compensation;
- matching window;
- expected/detected/matched counts;
- misses/extras;
- timing metrics;
- measurement confidence;
- compact matched-hit rows containing elapsed position, offset, strength and grid coordinate.

Raw microphone audio is not stored by Timing Lab.

## Backup

Backup envelope remains version 4.

Modern backups include `timingResults`. Older v4 backups without that field restore with an empty timing history.

## Browser behavior

Precision capture requires:

- `getUserMedia`;
- Web Audio;
- `AudioWorklet` / `AudioWorkletNode`.

If these are unavailable, Timing Lab is disabled without affecting normal practice or the metronome.

The worklet itself is part of Steadybar's local offline shell.

## Accuracy limitations

Microphone timing is affected by:

- input-device buffering;
- browser/OS audio routing;
- Bluetooth latency;
- microphone distance;
- room reflections;
- speaker-click bleed;
- threshold choice;
- instruments with slow or ambiguous attacks.

Use headphones for the most reliable results.

Do not compare measurements from materially different hardware routes as if they were laboratory-equivalent unless the input path has been calibrated appropriately.

## Privacy

Timing Lab processes the microphone locally.

It does not upload raw microphone audio.

Only the compact timing result is stored in Steadybar's structured workspace.

## Non-goals

Phase 16 does not:

- identify which drum/limb was played;
- grade sticking or technique;
- infer dynamics reliably from microphone amplitude;
- diagnose health, pain, tension or fatigue;
- provide population/professional normative scores;
- perform video analysis;
- replace MIDI note-level analysis;
- automatically modify mastery/progression state from a Timing Lab result.

## Certification

Release certification includes:

- deterministic grid/matching unit tests;
- constant early/late offset tests;
- latency-compensation tests;
- drift tests;
- miss/extra one-to-one matching tests;
- Low/Medium/High evidence behavior;
- schema-v9 repository and backup round-trip tests;
- old v4 backup compatibility;
- AudioWorklet module loading on Chromium, Firefox and WebKit;
- responsive Timing Lab route/history rendering;
- full existing persistence/offline/profile/course browser suites.
