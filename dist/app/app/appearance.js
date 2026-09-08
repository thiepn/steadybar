import { accentColor, surfaceTheme } from '../domain/appearance.js';
import { store } from './store.js';
export { ACCENTS } from '../domain/appearance.js';
export const APPEARANCE_EVENT = 'steadybar-appearance';
const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : undefined;
let pending = Promise.resolve();
let applied = '';
export function applyAppearance(settings) {
    const mode = settings.theme;
    const resolved = mode === 'system' ? (media?.matches ? 'dark' : 'light') : mode;
    const accent = accentColor(settings.accent);
    const palette = surfaceTheme(settings.surfaceTheme);
    const key = `${mode}/${resolved}/${accent}/${palette}`;
    if (applied === key)
        return;
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.dataset.mode = mode;
    root.dataset.accent = accent;
    root.dataset.palette = palette;
    root.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
    try {
        localStorage.setItem('steadybar-appearance', JSON.stringify({ mode, accent, palette }));
    }
    catch { }
    applied = key;
    window.dispatchEvent(new Event(APPEARANCE_EVENT));
}
export function trackSystemAppearance() {
    media?.addEventListener('change', () => {
        const settings = store.snapshot().settings;
        if (settings.theme === 'system')
            applyAppearance(settings);
    });
}
export function saveAppearance(change) {
    const task = pending.then(async () => {
        await store.settings(change, false);
        applyAppearance(store.snapshot().settings);
    });
    pending = task.catch(() => { });
    return task;
}
