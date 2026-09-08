import { store } from '../app/store.js';
import { ACCENTS, APPEARANCE_EVENT, saveAppearance } from '../app/appearance.js';
import { el } from './dom.js';
import { button, dialog } from './components.js';
import { icon } from './icons.js';

export function appearanceControls(): { node: HTMLElement; cleanup: () => void } {
  const modeButtons = new Map<string, HTMLButtonElement>();
  const accentButtons = new Map<string, HTMLButtonElement>();
  const modes = el('fieldset', { class: 'appearance-fieldset' }, el('legend', {}, 'Color mode'));
  const modeRow = el('div', { class: 'theme-options' });
  for (const theme of ['system', 'light', 'dark'] as const) {
    const b = button(theme[0]!.toUpperCase() + theme.slice(1), () => saveAppearance({ theme }), 'theme-choice',
      theme === 'dark' ? 'moon' : theme === 'light' ? 'sun' : 'settings');
    b.dataset.mode = theme;
    modeButtons.set(theme, b);
    modeRow.append(b);
  }
  modes.append(modeRow);
  const accents = el('fieldset', { class: 'appearance-fieldset' }, el('legend', {}, 'Accent color'));
  const accentRow = el('div', { class: 'accent-options' });
  for (const accent of ACCENTS) {
    const label = accent[0]!.toUpperCase() + accent.slice(1);
    const b = button(label, () => saveAppearance({ accent }), 'accent-choice');
    b.dataset.accent = accent;
    b.setAttribute('aria-label', `${label} accent`);
    b.prepend(el('span', { class: 'accent-swatch', 'aria-hidden': 'true' }, icon('check', 16)));
    accentButtons.set(accent, b);
    accentRow.append(b);
  }
  accents.append(accentRow);
  const hint = el('p', { class: 'field-hint appearance-hint' });
  const node = el('div', { class: 'appearance-controls' }, modes, accents, hint);
  const draw = () => {
    const settings = store.snapshot().settings;
    for (const [theme, b] of modeButtons) b.setAttribute('aria-pressed', String(settings.theme === theme));
    for (const [accent, b] of accentButtons) b.setAttribute('aria-pressed', String((settings.accent || 'graphite') === accent));
    hint.textContent = settings.theme === 'system' ? 'Follows your device. Changes are saved automatically.' : 'Changes are saved automatically.';
  };
  draw();
  window.addEventListener(APPEARANCE_EVENT, draw);
  return { node, cleanup: () => window.removeEventListener(APPEARANCE_EVENT, draw) };
}

export function openAppearance(): void {
  const controls = appearanceControls();
  const handle = dialog('Appearance', [controls.node], [], controls.cleanup);
  handle.dialog.classList.add('appearance-dialog');
}
