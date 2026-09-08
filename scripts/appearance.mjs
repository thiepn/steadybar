import { readFile } from 'node:fs/promises';

/** Build from the compiled, typed catalog. There are no runtime palette downloads. */
export async function generateAppearance() {
  const { PALETTES, ACCENT_PALETTES } = await import('../dist/app/domain/appearance.js');
  const vars = tokens => Object.entries(tokens).map(([k, v]) => `--${k}:${v}`).join(';');
  const neutral = PALETTES.find(p => p.id === 'neutral');
  const graphite = ACCENT_PALETTES.find(p => p.id === 'graphite');
  const light = { text: '#222222', muted: '#565656', faint: '#606060', danger: '#a1283c', 'danger-bg': '#fae9ed', warning: '#765011' };
  const dark = { text: '#f2f2f2', muted: '#bfbfbf', faint: '#b0b0b0', danger: '#ff9fae', 'danger-bg': '#3a2028', warning: '#ebc47d' };
  const css = ['/* Generated from src/domain/appearance.ts. Do not hand-edit. */',
    `:root{${vars({...neutral.light, ...graphite.light, ...light})}}`,
    `:root[data-theme=dark]{${vars({...neutral.dark, ...graphite.dark, ...dark})}}`];
  for (const p of PALETTES) {
    css.push(`:root[data-palette=${p.id}]{${vars(p.light)}}`,
      `:root[data-theme=dark][data-palette=${p.id}]{${vars(p.dark)}}`);
    for (const mode of ['light', 'dark']) {
      const selector = mode === 'dark' ? ':root[data-theme=dark] ' : '';
      const colors = p[mode];
      css.push(`${selector}.palette-choice[data-palette=${p.id}]{${vars({ 'preview-bg': colors.bg, 'preview-surface': colors.surface, 'preview-soft': colors['surface-soft'], 'preview-line': colors['border-strong'] })}}`);
    }
  }
  for (const a of ACCENT_PALETTES) {
    css.push(`:root[data-accent=${a.id}]{${vars(a.light)}}`,
      `:root[data-theme=dark][data-accent=${a.id}]{${vars(a.dark)}}`,
      `.accent-choice[data-accent=${a.id}]{--swatch:${a.light.accent};--swatch-ink:${a.light['on-accent']}}`,
      `:root[data-theme=dark] .accent-choice[data-accent=${a.id}]{--swatch:${a.dark.accent};--swatch-ink:${a.dark['on-accent']}}`);
  }
  css.push(await readFile('src/styles/appearance.css', 'utf8'));
  const prepaint = `/* Generated from the typed catalog. App data wins after boot. */
(() => {
  let mode = 'system', accent = 'graphite', palette = 'neutral';
  try {
    const saved = JSON.parse(localStorage.getItem('steadybar-appearance') || '{}');
    if (saved && typeof saved === 'object') {
      if (['system', 'light', 'dark'].includes(saved.mode)) mode = saved.mode;
      if (${JSON.stringify(ACCENT_PALETTES.map(a=>a.id))}.includes(saved.accent)) accent = saved.accent;
      if (${JSON.stringify(PALETTES.map(p=>p.id))}.includes(saved.palette)) palette = saved.palette;
    }
  } catch { /* Storage restrictions or malformed hints must not prevent startup. */ }
  const theme = mode === 'system' ? (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode;
  Object.assign(document.documentElement.dataset, { theme, mode, accent, palette });
  document.documentElement.style.colorScheme = theme;
})();\n`;
  return { stylesheet: css.join('\n') + '\n', prepaint };
}
