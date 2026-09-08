# Steadybar 1.4 — Practice workbench

Research and implementation brief, 8 September 2026. Baseline: main 2b03444 (1.3).

## Research scope and limits

“AI-generated look” is the owner's aesthetic assessment, not a measurable standard or a diagnosis of how an interface was made. We translate it into observable problems: repeated presentation regardless of task, misplaced emphasis, excessive containment, redundant labels, avoidable interaction steps, and a weak relationship between music practice and the arrangement of controls. A sober gray interface alone does not fix these problems. Screenshots and code are evidence for this app; the sources below inform principles, not claims that one style guarantees usability.

Sources were inspected before the redesign. Product documentation is used to understand how established tools organize work. The implementation does not import their component libraries or reproduce their branding. No user study was performed; ergonomic improvements remain design hypotheses supported by browser checks rather than invented satisfaction scores.

## Primary-source findings → product decisions

1. **Ableton Live: task-grouped control bar.** Live groups transport, tempo and other related controls in its control bar. The lesson is functional proximity, not Ableton's colors or density. Steadybar should group tempo, beat feedback and transport as one instrument; the practice sequence belongs beside that instrument, not between its controls. Source: https://www.ableton.com/en/manual/live-concepts/ (section 3.1).

2. **MuseScore Studio: working document and supporting panels.** The documented interface distinguishes the score, toolbars, palettes and contextual/status information. Apply the hierarchy: today's sequence is the working document; reusable routines are supporting material. Do not give every data type an equally weighted dashboard tile. Source: https://handbook.musescore.org/navigation/the-user-interface

3. **Carbon: structured data and progressive disclosure.** Its table guidance associates dense resource collections with aligned rows, contextual actions, bounded pagination and expansion for supplementary material. Use scannable exercise/song lists and routine previews. Keep direct Practice actions. Secondary controls may be disclosed, but must remain reachable on touch and keyboard. No spreadsheet interaction is imposed on ordinary lists. Source: https://carbondesignsystem.com/components/data-table/usage/

4. **Things: capture without leaving the current task.** Its Quick Entry documentation describes adding and filing work from the current context. Steadybar's existing quick notes and inline plan editing already serve this purpose. Preserve them, and preserve focus/filter state across saves. Do not replace direct actions with a mandatory setup wizard. Source: https://culturedcode.com/things/support/articles/2803569/

5. **Apple: readable content and adaptable layout.** The public UI tips emphasize fitting content to the device, legibility and generous interactive targets. Apply these principles without importing glass effects: a compact labeled rail on tablet, fixed primary mobile navigation, and larger touch controls. Source: https://developer.apple.com/design/tips/

6. **W3C: explicit accessibility constraints.** WCAG 2.2 AA target-size guidance uses 24 CSS pixels with defined exceptions, not a universal 44-pixel AA requirement. This project chooses 44-pixel touch controls and larger primary practice controls as a product target. Normal text needs 4.5:1 contrast; meaningful control boundaries/focus indicators need 3:1. Reflow must work at 320 CSS pixels and text resizing must not hide functions. Sources: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html ; https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html ; https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html ; https://www.w3.org/WAI/WCAG22/Understanding/reflow

7. **WAI-ARIA APG: behavior is part of the component.** Dialogs need inert background content, contained focus, Escape handling and focus return. A menu's visual minimalism does not justify removing keyboard semantics. Preserve the native dialog foundation and use small action sheets for contextual commands; do not label a collection of arbitrary divs a menu. Sources: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ ; https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/

8. **web.dev: measure interaction work.** INP's good field threshold is 200 ms or less at the 75th percentile. This environment can measure synthetic route/search/theme latency and DOM work, not a real-user INP distribution. Reduce repeated scans, limit large-list DOM creation and avoid rebuilding static practice content on every beat. Do not claim universal “lag-free” behavior from a desktop test. Source: https://web.dev/articles/optimize-inp

## Baseline audit and implementation plan

| Area | Observed problem in 1.3 | Planned intervention | Regression concern |
|---|---|---|---|
| Application shell | Desktop toolbar repeats the page title; utility controls consume a full row | Move desktop utilities into sidebar; labeled tablet rail; retain mobile header | Search, appearance, deep routes, skip link |
| Today | Three large stats precede actual work, including zero-history values | Plan first, duration and start attached to sequence; compact weekly context below | Start plan, unfinished session, daily-plan dates |
| Plan editor | Tall generic rows repeat “exercise”; metadata/input alignment is weak | Numbered agenda, column labels, music-relevant cues; direct duration/tempo editing | Rapid edits, reorder, input focus |
| Practice launcher | Cards and four boxed links compete with session choice | Two clear choices; related navigation as a compact link row | All launch paths |
| Active practice | BPM, beats, timer, stepping and transport stacked separately | Paired elapsed/tempo readouts; close transport, ratings and block navigation | Timing, count-in, attempts, recovery |
| Active updates | Static identity/next block repeatedly written on audio notifications | Separate static state updates from beat feedback; update displayed time only when changed | Audio clock unchanged |
| Metronome | Precision tool looks like a long centered form | Compact instrument surface; tempo/transport first; sound details and help disclosed | Meter, accents, count-in, preset writes |
| Exercise collection | Blank clean-BPM area for new users; scans all sessions repeatedly while sorting | Show default tempo when unrecorded, memoized clean-tempo index, bounded list, retain list/grid | Accurate stats; filters and view persist |
| Exercise detail | Several generic panels and oversized empty chart compete with cues | Flat working sections; restrained numeric hierarchy; cues and record clearly separated | Targets, attempts and snapshots |
| Routines | Large identical cards repeat previews and primary buttons | Aligned routine rows, explicit optional sequence preview, direct play | Open, duplicate, archive, schedule |
| Songs | Generic cards repeat no-artist filler | Repertoire rows with readable title, arrangement and tempo | Sections, transition practice |
| Song sections | Five equally weighted icon actions | Keep useful order/edit controls but group and size deliberately | Reorder and remove remain explicit |
| Setlists | Reuses song-card visual language | Dated program/list layout with running-order preview | Generate editable preparation routine |
| Goals | Card grid and multiple labels compete with actual target | Target ledger: identity, measured progress, contextual actions | Completion derives from actual data |
| Progress | Several boxed summaries duplicate hierarchy | Flat, labeled chart sections; retain exact data tables and units | No synthetic history or misleading axes |
| History | Repeated badges, large gaps, redundant Review links | Session ledger with date, title and active duration | Notes, reflection and stored snapshots |
| Settings | Long equivalent-looking cards | Sectioned settings with compact appearance preview and clear data safety grouping | Dirty form, restore, reset, offline |
| Search | Generic headline, repeated scan strings, selected item only visual | Concise title, cached searchable labels, keyboard-accessible current result | Dialog escape/focus and commands |
| Onboarding | Duplicate logo/name inside an already branded dialog | Plain useful setup with explicit drum starter scope | Existing setup and starter selection |
| Themes | Accent, hover, chart and focus mostly share one token | Deliberate semantic roles per mode/accent, warm-neutral light and charcoal dark | Backups and settings identifiers unchanged |
| Dialogs | Full-height scrolling and form actions are weak on short screens | Bounded content scroll, accessible sticky actions, small-screen layout | Keyboard, validation, unsaved edits |
| Large data | Unbounded exercise rows and repeated O(history) scans | 60-row batches and cached search/progress metadata | All data remains searchable and reachable |

## Design language

**Working metaphor: a practice notebook next to a precise instrument.** This is a layout decision, not illustrated stationery. The agenda uses numbered rows and aligned values. The metronome and session use strong tabular readouts. Repertoire uses text-led rows. Timelines, waveforms, animated decoration, fake records, motivational copy and decorative musical symbols are excluded.

Use system interface fonts, tabular numerals and a local system monospace stack for readouts; no remote font request. Type levels are limited: page title, section title, body and metadata. Do not use a giant title to compensate for ambiguous actions. The spacing unit is 4 px, with 8/12/16/24/32/48 increments. Inputs and buttons share a small radius; overlays may be slightly softer. Flat sections replace nested cards. A visible boundary is reserved for the active working surface, an editable control or a temporary overlay.

Color roles: canvas, working surface, subtle surface, hover surface; primary text, secondary text; border and control boundary; accent action, action-hover, readable accent text, subtle selection, focus and chart ink. Semantic error/warning/success remain independent of accent choice. Six accents and System/Light/Dark remain backward-compatible.

## Execution sequence and acceptance evidence

1. Capture baseline routes and inspect the runtime and state ownership.
2. Establish shell, typography, spacing and semantic colors in one stylesheet, not another appended override layer.
3. Rebuild Today and the active/metronome work areas; then collections, detail pages and supporting states.
4. Bound collection rendering, avoid repeated theme work and static beat-time DOM churn.
5. Run strict TypeScript and all logic tests; render and inspect small/medium/large screens.
6. Add a workbench regression matrix: exact requested viewports, all themes, long content, populated/empty states, touch targets, keyboard focus, native persistence and offline checks.
7. Verify the PR and deploy only after the existing real-origin checks pass. Package complete source/build and disclose any unavailable testing.

The quality bar is evidence of clear workflows, responsive geometry, reliable data/audio behavior and visual inspection. No self-awarded 9.5/10 or 10/10 scores substitute for those checks. Physical music-stand use, screen readers, mobile keyboards and real-device audio latency require human/device validation beyond browser emulation.
