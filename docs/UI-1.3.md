# Steadybar 1.3 — interface and appearance

## Interface

Neutral surfaces, a single content hierarchy, compact navigation, list-first exercise browsing, and concise empty states replace the previous promotional headings and repeated cards. Today prioritizes the plan and its start control. Scheduled routines stay prioritized. Block editing, training, reordering, and removal are available through each row’s options menu; play and inline tempo/duration remain direct.

## Appearance

System, Light, or Dark mode combines with Graphite, Blue, Forest, Plum, Amber, or Rose. Open the header Appearance control or Settings → Appearance. Choices save to the existing IndexedDB settings record. A validated, optional localStorage hint avoids a mismatched first paint. System mode tracks device changes. Appearance changes do not discard an unsaved preferences form or stop the metronome. Legacy backups remain supported; no database identifiers or backup format versions changed.

## Responsive layout

Desktop has a full sidebar; 768–1179 px uses a compact navigation rail; narrower screens have a safe-area-aware bottom bar. Block rows adapt to their actual container width. Collections, filters, forms, dialogs, metronome controls, and practice screens reflow independently.

## Verification

`npm test` includes appearance/backup compatibility and defensive first-paint tests. `python tests/ci_render.py` covers the existing rendered workflows with an explicit memory-storage harness; native-only checks are not counted as passes there. `python tests/ci_native.py` tests native persistence, offline service worker, backup restore, audio, count-in, and reordering. `python tests/ui_polish.py` runs appearance persistence and 121 route/viewport layout combinations (11 routes × 11 widths from 320 to 1920), keyboard menus, mobile navigation, unsaved preferences, uninterrupted metronome playback, and 72 palette contrast pairs. `--render` explicitly skips reload persistence and is not equivalent to native verification.

Generated `dist/` is no longer committed. CI always builds and verifies the source before uploading the Pages artifact. The old archive checksum manifest is removed because it described an earlier, generated distribution.
