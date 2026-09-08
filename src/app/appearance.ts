import type { Settings } from '../domain/models.js';
import { accentColor, surfaceTheme } from '../domain/appearance.js';
import { store } from './store.js';
export { ACCENTS } from '../domain/appearance.js';
export type { AccentColor } from '../domain/appearance.js';

export const APPEARANCE_EVENT = 'steadybar-appearance';
const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : undefined;
let pending: Promise<unknown> = Promise.resolve();
let applied = '';

/** IndexedDB is authoritative; local storage is only a validated first-paint hint. */
export function applyAppearance(settings: Settings): void {
  const mode = settings.theme;
  const resolved = mode === 'system' ? (media?.matches ? 'dark' : 'light') : mode;
  const accent = accentColor(settings.accent);
  const palette = surfaceTheme(settings.surfaceTheme);
  const key = `${mode}/${resolved}/${accent}/${palette}`;
  if (applied === key) return;
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.mode = mode;
  root.dataset.accent = accent;
  root.dataset.palette = palette;
  root.style.colorScheme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',
    getComputedStyle(root).getPropertyValue('--bg').trim());
  try { localStorage.setItem('steadybar-appearance', JSON.stringify({ mode, accent, palette })); } catch { /* Restricted storage must not block color changes. */ }
  applied = key;
  window.dispatchEvent(new Event(APPEARANCE_EVENT));
}

export function trackSystemAppearance(): void {
  media?.addEventListener('change', () => {
    const settings = store.snapshot().settings;
    if (settings.theme === 'system') applyAppearance(settings);
  });
}

/** Serialize rapid selections. Never rebuild the page, discard a form, or restart audio. */
export function saveAppearance(change: Pick<Partial<Settings>, 'theme' | 'accent' | 'surfaceTheme'>): Promise<void> {
  const task = pending.then(async () => {
    await store.settings(change, false);
    applyAppearance(store.snapshot().settings);
  });
  pending = task.catch(() => {});
  return task;
}
