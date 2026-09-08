# Steadybar 1.4.1 — colors

Dark mode now defaults to Neutral / Graphite: charcoal and black without a green tint. Black is available as a separate pure-black surface theme.

Appearance and Settings share independent controls for three modes, eight backgrounds and sixteen accents. Reset colors affects only the background and accent, not mode or practice data. Existing explicit accent selections are retained. The interface uses a clean system/Helvetica/Arial sans-serif stack, including tempo and timer displays.

The typed palette catalog generates the stylesheet and first-paint script at build time. No runtime font or color downloads are needed. Existing IndexedDB identifiers and version-1 backup format remain intact; legacy backups lacking surfaceTheme use Neutral.

The release tests cover all 256 resolved color combinations, 8,704 text/control contrast checks, 15 appearance-picker viewport sizes, actual reload persistence, form retention, keyboard selection and metronome continuity. Tests remain required on Chromium, Firefox and WebKit before deployment.

Cross-browser QA also corrected a negative-margin overlap in the mobile routine preview and deferred chart resize writes to animation frames to avoid ResizeObserver feedback. Native tests distinguish safety-backup downloads from reload events and wait for real audio startup before measuring exact scheduling. Their assertions remain enabled.

Automated browser engines and emulated viewports are not physical-device testing, an accessibility certification, or a guarantee of zero latency on every device.
