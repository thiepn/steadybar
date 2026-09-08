import { store } from '../app/store.js';
import { APPEARANCE_EVENT, saveAppearance } from '../app/appearance.js';
import { PALETTES, ACCENT_PALETTES, accentColor, surfaceTheme } from '../domain/appearance.js';
import { el } from './dom.js';
import { button, dialog } from './components.js';
import { icon } from './icons.js';
export function appearanceControls() {
    const modeButtons = new Map();
    const paletteButtons = new Map();
    const accentButtons = new Map();
    const modes = el('fieldset', { class: 'appearance-fieldset' }, el('legend', {}, 'Color mode'));
    const modeRow = el('div', { class: 'theme-options' });
    for (const theme of ['system', 'light', 'dark']) {
        const b = button(theme[0].toUpperCase() + theme.slice(1), () => saveAppearance({ theme }), 'theme-choice', theme === 'dark' ? 'moon' : theme === 'light' ? 'sun' : 'settings');
        b.dataset.mode = theme;
        modeButtons.set(theme, b);
        modeRow.append(b);
    }
    modes.append(modeRow);
    const palettes = el('fieldset', { class: 'appearance-fieldset' }, el('legend', {}, 'Background theme'));
    const paletteRow = el('div', { class: 'palette-options' });
    for (const p of PALETTES) {
        const b = button('', () => saveAppearance({ surfaceTheme: p.id }), 'palette-choice');
        b.dataset.palette = p.id;
        b.setAttribute('aria-label', `${p.label} background`);
        b.title = p.description;
        b.replaceChildren(el('span', { class: 'palette-preview', 'aria-hidden': 'true' }, el('span', { class: 'palette-preview-rail' }), el('span', { class: 'palette-preview-paper' }, el('span'), el('span'))), el('span', { class: 'palette-caption' }, el('span', {}, p.label), el('span', { class: 'palette-check', 'aria-hidden': 'true' }, icon('check', 14))));
        paletteButtons.set(p.id, b);
        paletteRow.append(b);
    }
    palettes.append(el('p', { class: 'palette-description' }, 'Surfaces only. Neutral and Black have no color tint.'), paletteRow);
    const accents = el('fieldset', { class: 'appearance-fieldset' }, el('legend', {}, 'Accent color'));
    const accentRow = el('div', { class: 'accent-options' });
    for (const accent of ACCENT_PALETTES) {
        const b = button(accent.label, () => saveAppearance({ accent: accent.id }), 'accent-choice');
        b.dataset.accent = accent.id;
        b.setAttribute('aria-label', `${accent.label} accent`);
        b.prepend(el('span', { class: 'accent-swatch', 'aria-hidden': 'true' }, icon('check', 16)));
        accentButtons.set(accent.id, b);
        accentRow.append(b);
    }
    accents.append(el('p', { class: 'palette-description' }, 'Buttons, selections, focus rings, and charts.'), accentRow);
    const selection = el('p', { class: 'appearance-selection', role: 'status', 'aria-live': 'polite' });
    const reset = button('Reset colors', () => saveAppearance({ surfaceTheme: 'neutral', accent: 'graphite' }), 'secondary compact');
    reset.title = 'Use Neutral surfaces and Graphite accents. Keep your color mode and practice data.';
    const hint = el('p', { class: 'field-hint appearance-hint' });
    const node = el('div', { class: 'appearance-controls' }, modes, palettes, accents, el('div', { class: 'appearance-summary' }, selection, reset), hint);
    const draw = () => {
        const settings = store.snapshot().settings;
        const palette = surfaceTheme(settings.surfaceTheme), accent = accentColor(settings.accent);
        for (const [theme, b] of modeButtons)
            b.setAttribute('aria-pressed', String(settings.theme === theme));
        for (const [id, b] of paletteButtons)
            b.setAttribute('aria-pressed', String(palette === id));
        for (const [id, b] of accentButtons)
            b.setAttribute('aria-pressed', String(accent === id));
        selection.textContent = `${PALETTES.find(p => p.id === palette).label} / ${ACCENT_PALETTES.find(p => p.id === accent).label}`;
        hint.textContent = settings.theme === 'system' ? 'Mode follows your device. Colors save automatically.' : 'Colors save automatically. Reset colors does not change your practice data.';
    };
    draw();
    window.addEventListener(APPEARANCE_EVENT, draw);
    return { node, cleanup: () => window.removeEventListener(APPEARANCE_EVENT, draw) };
}
export function openAppearance() {
    const controls = appearanceControls();
    const handle = dialog('Appearance', [controls.node], [], controls.cleanup);
    handle.dialog.classList.add('appearance-dialog');
}
