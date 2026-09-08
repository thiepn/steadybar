# Feature acceptance map

This distinguishes implementation from verification. “Rendered” means the real interface/controller with a test-only validated memory store. It does **not** mean durable IndexedDB was verified. “Blocked” means the real-origin test could not reach the app because the browser policy refused localhost navigation.

| Area | Implemented behavior | Verification evidence |
| --- | --- | --- |
| Application shell | Desktop sidebar, five-item mobile navigation, More menu, all product routes, themes | Rendered route matrix, screenshot inspection |
| Onboarding | Instrument/aim selection, starter routine or explore, stored preferences | Rendered initial-use workflows |
| Exercise library | 21 rudiments + 9 other exercises, search/filter/sort, create/edit/archive, details | 30 seed validators, rendered CRUD, rudiment flow |
| Today | Persisted daily plan, inline BPM/duration, add/edit/remove, drag/up/down ordering, one/full-session start | Rendered inline and drag journeys |
| Routines | Four templates, create/edit/duplicate/archive, weekday metadata, reusable blocks, copy to today | Rendered four-block creation and duplication; pure duration/reorder tests |
| Metronome | 20–300 BPM, tap tempo, 4/8 denominator meters, custom meter, 1/2/3/4 subdivisions, accents/mutes, volume | Pure scheduler/tap tests; real AudioContext start times observed in rendered browser |
| Count-in | 0/1/2/4 bars before active timer | Pure clock and real AudioContext rendered start/pause/cancellation/stalled-thread tests |
| Presets | Save/load/delete meter, BPM, subdivision, count-in and accents | Rendered save/load workflow |
| Practice | Timestamp timer, pause/resume, attempts, notes, finish/skip/restart, review | Pure state transitions, rendered multi-block/rudiment journeys, transactional stale-command guards |
| Focus/mobile | Large BPM/timer/control layout, clear exit, optional fullscreen | Rendered at all six required sizes; screenshots inspected |
| Tempo trainer | Progressive, repetition, ladder and endurance, final-stage hold, active-time semantics | All four modes unit-tested; progressive and repetition additionally exercised in UI |
| Recovery | Resume/end/discard, checkpoint semantics, preserved attempts | Pure recovery and rendered controller recovery; actual reload **blocked** |
| Songs | Metadata, meter/status/key/difficulty, ordered sections/notes, whole/section/transition practice | Rendered three-section song and transition workflows |
| Setlists | Song references, ordering, dates/status/last practice, editable preparation routines | Rendered three-song ordering and routine generation |
| Goals | Clean-BPM, local ISO-week sessions, song status, custom completion | Pure calculations; rendered BPM/custom goal creation |
| History/review | Chronological session detail, preserved snapshots and attempts, editable review notes/rating | Rendered saved session/result review; pure snapshot tests |
| Progress | Actual duration/distribution, date ranges, clean BPM progression, consistency | Required deterministic 60 min / 50:50 / 105 clean / 110 attempted fixture; rendered populated views; calendar spacing and sub-minute peak regression tests |
| Search/shortcuts | Command palette, entity search, keyboard selection, Space/arrows/N/Esc | Rendered search/keyboard/dirty-form workflows; ended-history and browser-modifier regression tests |
| Accessibility | Semantic controls/headings, labels, focus-visible, native dialogs, reduced motion, keyboard reorder | Automated heading/button-label/overflow checks and keyboard journeys; not a WCAG certification |
| Persistence | Native IndexedDB v2, transactions, stable IDs, consistent snapshots, error states | Validators, pure migration, repository commit/rollback/concurrent-insert adapter tests pass; native storage/reload **blocked** |
| Backup | Complete versioned export, strict validation, replace transaction, safety-download prompt | Pure JSON round-trip/rejection tests; full-store replacement/rollback via repository adapter; rendered preview/cancel; actual download/replace/reload **blocked** |
| Reset/archive | Explicit reset confirmation, safety download, non-destructive archives, snapshots | Rendered archive; reset/replace real storage **blocked** |
| PWA | Local manifest/icons, precached shell, deliberate safe updates, scope-isolated caches | Generated-worker logic tests pass; real offline reload/install **blocked** |
| Wake lock/tab ownership | Feature-detected wake lock and Web Locks, sensible cleanup | Lease cancellation/contention unit-tested with controlled locks; optional API errors handled; real-device/cross-tab behavior **not verified** |
| Production build | Complete compiled static project, Node preview, Pages workflow | Strict typecheck, production build, HTTP/package smoke checks; real-origin-gated Pages CI configured, not remotely run |

## Deliberate release decisions

The delivered stack is native TypeScript rather than the requested React ecosystem, because network package installation was unavailable. Backup restore is replace-only, as the specification permits. BPM is the denominator-note beat; dotted-quarter pulse selection is not implemented. Song templates use editable free-practice slots until real songs are selected. Charts are local SVG rather than Recharts. No cloud, AI, MIDI, microphone analysis, copyrighted song catalog, fake progress, or out-of-scope placeholder pages are included.

## Before treating this as a verified public release

Run `npm run test:e2e` on an unrestricted localhost origin. Resolve any actual-origin failures it exposes. Then test microphone-free audio through the intended phone/headphones, installation and offline reopen, wake behavior, storage recovery after abrupt termination, a real v1-to-v2 upgrade, and two simultaneously active tabs. Safari/Firefox and large-history performance have not been certified by this execution.
