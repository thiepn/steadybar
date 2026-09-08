import type { Settings } from '../domain/models.js';
import { store } from './store.js';

export const ACCENTS = ['graphite', 'blue', 'forest', 'plum', 'amber', 'rose'] as const;
export type AccentColor = typeof ACCENTS[number];
export const APPEARANCE_EVENT = 'steadybar-appearance';
const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : undefined;
let pending: Promise<unknown> = Promise.resolve();

/** IndexedDB is authoritative. Local storage is only a first-paint color hint. */
export function applyAppearance(settings: Settings): void {
  const mode = settings.theme;
  const resolved = mode === 'system' ? (media?.matches ? 'dark' : 'light') : mode;
  const accent = settings.accent && ACCENTS.includes(settings.accent) ? settings.accent : 'graphite';
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.mode = mode;
  root.dataset.accent = accent;
  root.style.colorScheme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',
    getComputedStyle(root).getPropertyValue('--bg').trim());
  try { localStorage.setItem('steadybar-appearance', JSON.stringify({ mode, accent })); } catch { /* Storage may be restricted. */ }
  window.dispatchEvent(new Event(APPEARANCE_EVENT));
}

export function trackSystemAppearance(): void {
  media?.addEventListener('change', () => {
    const settings = store.snapshot().settings;
    if (settings.theme === 'system') applyAppearance(settings);
  });
}

/** Do not re-render the current page: changing colors must not discard a form or stop audio. */
export function saveAppearance(change: Pick<Partial<Settings>, 'theme' | 'accent'>): Promise<void> {
  const task = pending.then(async () => {
    await store.settings(change, false);
    applyAppearance(store.snapshot().settings);
  });
  pending = task.catch(() => {});
  return task;
}
