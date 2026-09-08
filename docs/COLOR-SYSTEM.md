# Steadybar color customization

Dark mode defaults to achromatic Neutral surfaces with a Graphite accent. The page is #101010, working surfaces #191919, secondary surfaces #232323 and hover surfaces #2c2c2c. The Black background uses #000000. Neither background has a green or blue tint.

Settings and the in-session Appearance dialog offer three independent choices:

- Mode: System, Light, Dark.
- Background: Neutral, Black, Slate, Midnight, Dusk, Aubergine, Coffee, Sand.
- Accent: Graphite, Blue, Sky, Cyan, Teal, Forest, Mint, Lime, Yellow, Amber, Orange, Red, Rose, Pink, Plum, Violet.

There are 128 background/accent pairs per resolved mode. Reset colors restores Neutral / Graphite while preserving mode, practice preferences and all practice data. Earlier explicit accent choices remain intact; backups without surfaceTheme resolve to Neutral.

The typed catalog in src/domain/appearance.ts drives IDs, labels, validation and build-time generation of dist/appearance.css and dist/theme.js. Each accent provides action, hover, selected-surface, text, focus and on-accent colors. There are no runtime palette or font downloads. The interface uses a platform/Helvetica/Arial sans-serif stack, including proportional numeric displays with tabular digits.

Preferences remain in IndexedDB. surfaceTheme is optional, so old backups remain valid without database renaming, reset or a table migration. The version-1 backup envelope stays unchanged. Appearance writes are serialized and update root attributes without rebuilding the page, discarding forms or restarting audio. Local storage is only a validated first-paint hint.

The source public/theme.js is replaced by its generated distribution equivalent. Run npm run build before deployment. The included dist can be previewed with npm run preview.

Tests cover 768 settings combinations through backup serialization, 256 rendered mode/background/accent combinations and 34 text/control contrast relationships per combination. Browser tests also cover independent controls, resetting only colors, unsaved forms, audio continuity, keyboard access, reduced motion, forced colors, and 15 viewport sizes. Native reload persistence is explicitly excluded from the memory harness and required separately in CI.

Contrast thresholds: 4.5:1 for regular text and 3:1 for meaningful non-text controls. These checks are not an accessibility certification or physical-device testing.

References: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum ; https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html ; https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme
